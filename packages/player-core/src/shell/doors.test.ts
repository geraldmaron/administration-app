import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadSave, type Campaign, type DeclaredEmergency } from "@admin/engine";
import { attentionItems } from "../desk/attention";
import { briefMatters } from "../desk/brief-matters";
import { officeFile } from "../government/office-file";
import { ECONOMY_MEASURE_VIEW, isEconomyMeasure } from "../economy/market-releases";
import { emergencyBoard } from "../emergency/emergency-board";
import { caseFile } from "../judiciary/case-file";
import { PLACES, type PlaceKey } from "../navigation/places";
import { placeCounsel } from "../summons/counsel";
import { allReadings } from "../summons/registry";
import { treatyScreenReading } from "../world/treaty-screen";
import { warScreenReading } from "../world/war-screen";
import { officeOfRole, roleActionsHref } from "./office-of";

// Every door the Brief, the Desk, a place's counsel and a summons clock offer,
// read off the player's own fixture saves: each must reach a screen the route
// tree has, and a door raised by one subject must open on that subject rather
// than on the mode it lives in. The owner pressed "Open it" on a Secretary's
// proposal and landed on Washington's front page, which never shows it.

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = mkdtempSync(path.join(tmpdir(), "presidential-door-fixtures-"));
const ROUTES = path.resolve(here, "../../../../apps/web/src/routes");
// Building the full fixture set includes both terms of a presidency. Bound the
// child below the setup deadline so cleanup cannot leave it running afterward.
const FIXTURE_SETUP_MS = 40 * 60_000;
let saves: readonly { readonly name: string; readonly campaign: Campaign }[] = [];

beforeAll(async () => {
  await promisify(execFile)(process.execPath, [path.resolve(here, "../../../../scripts/make-fixture-saves.mjs"), "--out", FIXTURES], { maxBuffer: 4 * 1024 * 1024, timeout: FIXTURE_SETUP_MS - 30_000 });
  saves = fixtures();
}, FIXTURE_SETUP_MS);
afterAll(() => rmSync(FIXTURES, { recursive: true, force: true }));

/** The route tree read off the file-route names, so a door to a screen nobody built fails here. */
function routePatterns(): readonly RegExp[] {
  return readdirSync(ROUTES)
    .filter((file) => file.endsWith(".tsx") && !file.startsWith("__"))
    .map((file) => {
      const segments = file.replace(/\.tsx$/, "").split(".").filter((segment) => segment !== "index");
      const body = segments.map((segment) => (segment.startsWith("$") ? "[^/]+" : segment)).join("/");
      return new RegExp(`^/${body}/?$`);
    });
}

const PATTERNS = routePatterns();
const ROOTS = new Set(Object.values(PLACES).map((entry) => entry.href));

function fixtures(): readonly { readonly name: string; readonly campaign: Campaign }[] {
  return readdirSync(FIXTURES)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({ name: file, campaign: loadSave(JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8"))) }));
}

/** Why a door is dead or lands on something other than its subject, or undefined when it is sound. */
function fault(campaign: Campaign, href: string): string | undefined {
  const pathname = href.split(/[?#]/)[0] ?? href;
  if (!PATTERNS.some((pattern) => pattern.test(pathname))) return "no such route";
  const id = (prefix: string): string | undefined => (pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) : undefined);
  const office = id("/washington/office/");
  if (office !== undefined && office !== "press" && !officeFile(campaign, office)) return "no such office";
  const lawsuit = id("/washington/courts/case/");
  if (lawsuit !== undefined && !caseFile(campaign, lawsuit)) return "no such case";
  const treaty = id("/world/treaty/");
  if (treaty !== undefined && !treatyScreenReading(campaign, treaty)) return "no such treaty";
  const war = id("/world/war/");
  if (war !== undefined && !warScreenReading(campaign, war)) return "no such war";
  const search = new URLSearchParams(href.split("#")[0]?.split("?")[1] ?? "");
  if (pathname === "/nation/emergency") {
    const board = emergencyBoard(campaign);
    const declaration = search.get("declaration");
    if (declaration !== null && !board.declarations.some((row) => row.id === declaration)) return "no such declaration";
    const incident = search.get("incident");
    if (incident !== null && ![...board.conditions, ...board.incidents].some((row) => row.id === incident)) return "no such incident";
  }
  if (pathname === "/nation/economy") {
    const measure = search.get("measure");
    if (measure !== null && !isEconomyMeasure(measure)) return "no such measure";
    if (measure !== null && isEconomyMeasure(measure) && (search.get("view") ?? "overview") !== ECONOMY_MEASURE_VIEW[measure]) return "measure not on that view";
  }
  return undefined;
}

/** The selection a subject's door must carry, so it opens on the record rather than the board around it. */
const SUBJECT_PARAM: readonly (readonly [RegExp, string])[] = [
  [/^emergency:/, "declaration"],
  [/^release:/, "measure"],
];

function missingParam(from: string, href: string): string | undefined {
  const subject = from.replace(/^row /, "");
  const needed = SUBJECT_PARAM.find(([pattern]) => from.startsWith("row ") && pattern.test(subject))?.[1];
  if (!needed) return undefined;
  return new URLSearchParams(href.split("#")[0]?.split("?")[1] ?? "").has(needed) ? undefined : `opens the board without its ${needed}`;
}

/** Rows raised by one record, which must open on that record rather than on a mode's front page. */
const SUBJECT_ROWS = /^(cabinet-initiative|cabinet-proposal|resignation-offer|order-review|compact|removal|emergency:|release:|cabinet$|delivery$)/;
/** Clocks counted on one record. */
const SUBJECT_CLOCKS = new Set(["nomination-stage", "acting-authority", "departure", "ruling-due", "treaty-ratification", "aumf-expiry", "removal-beat", "election-milestone"]);

type Door = { readonly from: string; readonly href: string; readonly subject: boolean };

function doors(campaign: Campaign): readonly Door[] {
  const matters = briefMatters(campaign).map((matter) => ({ from: `matter ${matter.id}`, href: matter.href ?? "", subject: true }));
  const rows = attentionItems(campaign).map((item) => ({ from: `row ${item.subject}`, href: item.href, subject: SUBJECT_ROWS.test(item.subject) }));
  const counsel = (Object.keys(PLACES) as PlaceKey[]).flatMap((key) => {
    const next = placeCounsel(campaign, key).next;
    return next ? [{ from: `counsel ${key}`, href: next.href, subject: false }] : [];
  });
  const clocks = allReadings(campaign)
    .filter((reading) => reading.due !== undefined)
    .map((reading) => ({ from: `clock ${reading.spec.id}`, href: reading.brief.door.href, subject: SUBJECT_CLOCKS.has(reading.spec.id) }));
  return [...matters, ...rows, ...counsel, ...clocks];
}

describe("every door on the player's fixture saves", () => {

  it("has fixtures to read", () => {
    expect(saves.length).toBeGreaterThan(0);
  });

  it("reaches a screen that exists and opens on the record it names", () => {
    const failures = saves.flatMap(({ name, campaign }) =>
      doors(campaign).flatMap((door) => {
        const why =
          door.href === "" ? "no door" : (fault(campaign, door.href) ?? (door.subject && ROOTS.has(door.href) ? "opens a mode, not its subject" : missingParam(door.from, door.href)));
        return why ? [`${name}: ${door.from} -> ${door.href || "(none)"}: ${why}`] : [];
      }),
    );
    expect(failures).toEqual([]);
  }, 120_000);
});

describe("a declaration coming to its end", () => {
  // No fixture save carries a declaration a year old, so one is laid on a real save: its row, its
  // case and its clock must each open the board on that declaration, where "Continue it" is pressed.
  it("opens the emergency board on the declaration whose continuation is due", () => {
    const base = saves[0]!.campaign;
    const emergency = {
      id: "emergency:nation:flood:doors",
      scope: { kind: "nation" },
      cause: "flood",
      declaredTurn: base.turn - 45,
      renewedTurn: base.turn - 45,
      reason: "Flooding across the Midwest.",
    } as DeclaredEmergency;
    const campaign: Campaign = { ...base, emergencies: { ...base.emergencies, [emergency.id]: emergency } };
    const raised = doors(campaign).filter((door) => door.href.includes(encodeURIComponent(emergency.id)));
    expect(raised.map((door) => door.from)).toContain(`row emergency:${emergency.id}`);
    for (const door of raised) {
      expect(fault(campaign, door.href), door.from).toBeUndefined();
      expect(new URLSearchParams(door.href.split("#")[0]?.split("?")[1]).get("declaration"), door.from).toBe(emergency.id);
    }
  });
});

describe("a chair's own matter opens its office", () => {
  it("resolves every cabinet role to the office its proposals and offers are answered in", () => {
    expect(roleActionsHref("role-foreign-minister")).toBe("/washington/office/OFF-STATE-SEC?view=actions#office-actions");
    expect(officeOfRole("role-chief-of-staff")).toBe("OFF-CHIEF-OF-STAFF");
    expect(roleActionsHref("role-not-a-role")).toBe("/washington");
  });

  it("lands each cabinet row on an office whose file carries that row's proposal or offer", () => {
    for (const { campaign } of saves) {
      for (const item of attentionItems(campaign).filter((row) => /^(cabinet-initiative|resignation-offer):/.test(row.subject))) {
        const office = decodeURIComponent((item.href.split("#")[0]?.split("?")[0] ?? "").slice("/washington/office/".length));
        const file = officeFile(campaign, office);
        const role = item.subject.split(":")[1];
        expect(file?.role, item.subject).toBe(role);
        const raised = item.subject.startsWith("resignation-offer:") ? file?.offers : file?.proposals;
        expect(raised?.length ?? 0, `${item.subject} on ${office}`).toBeGreaterThan(0);
      }
    }
  }, 120_000);
});
