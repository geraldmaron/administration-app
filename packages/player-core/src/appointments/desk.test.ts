import { describe, expect, it } from "vitest";
import { apply, dismissMinister, fillVacantOffices, seatKindOf, type Campaign, type EffectPacket } from "@admin/engine";
import type { PersonId, RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening.js";
import { vacancyBoard } from "../oversight/appointments-pipeline";
import { appointmentDesk, deskDefaults, deskPicks, deskPlan } from "./desk";

const CHIEF = "INST-SCOTUS-SEAT-1";

function dismissed(campaign: Campaign, role: string): Campaign {
  const result = dismissMinister(campaign, role as RoleId);
  if (!result.ok) throw new Error(result.reason);
  return apply(campaign, result.packet);
}

/** The Chief Justice's seat emptied the way the yearly draw empties one. */
function withoutChief(campaign: Campaign): Campaign {
  const holder = campaign.institutions[CHIEF]?.leader;
  const packet: EffectPacket = {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: "The Chief Justice retires." },
    effects: [
      ...(holder ? [{ kind: "person" as const, person: holder, changes: { currentRole: undefined, judicialRetired: true as const } }] : []),
      { kind: "institution", institution: CHIEF, vacate: true },
    ],
  };
  return apply(campaign, packet);
}

const open = withoutChief(dismissed(dismissed(openingCampaign({ seedText: "appointments-desk" }), "role-treasury-minister"), "role-labor-secretary"));
const desk = appointmentDesk(open);
const nominated = (packets: readonly EffectPacket[]) =>
  packets.flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "nomination" && effect.nomination ? [[effect.nomination.office, effect.nomination.nominee] as const] : [])));

describe("the appointments desk", () => {
  it("lists every open seat the Senate confirms, the Supreme Court's included, cabinet first", () => {
    const board = vacancyBoard(open).open.filter((row) => seatKindOf(row.office)).map((row) => row.office as string);
    const offices = desk.seats.map((seat) => seat.office as string);
    for (const office of board) expect(offices).toContain(office);
    expect(offices).toContain("OFF-SCOTUS-SEAT-1");
    expect(desk.seats[0]!.group).toBe("cabinet");
    expect(desk.seats.at(-1)!.group).toBe("courts");
  });

  it("recommends a name for every seat but the Supreme Court's, and never one person twice", () => {
    const chief = desk.seats.find((seat) => seat.office === "OFF-SCOTUS-SEAT-1")!;
    expect(chief.recommended).toBeUndefined();
    expect(chief.candidates.length).toBeGreaterThan(0);
    const picks = deskDefaults(desk);
    expect(picks.some((pick) => pick.office === "OFF-SCOTUS-SEAT-1")).toBe(false);
    expect(new Set(picks.map((pick) => pick.person)).size).toBe(picks.length);
  });

  it("says why each name is there in words, with readings as bands and no hidden figure", () => {
    for (const seat of desk.seats) {
      for (const candidate of seat.candidates) {
        expect(candidate.why.length).toBeGreaterThan(0);
        for (const line of [candidate.why, ...candidate.reasons]) {
          expect(line).not.toMatch(/\d\.\d|competence|integrity|loyalty|score/i);
        }
        for (const reading of candidate.readings) expect(reading.word).not.toMatch(/\d/);
      }
    }
  });

  it("sends exactly the engine's own batch for the recommended names", () => {
    const picks = deskDefaults(desk);
    const plan = deskPlan(open, picks);
    expect(plan.packets).toEqual(fillVacantOffices(open, picks.map((pick) => pick.office), Object.fromEntries(picks.map((pick) => [pick.office, pick.person as PersonId]))));
    expect(plan.lines).toHaveLength(picks.length);
    expect(plan.refused).toEqual([]);
  });

  it("changes only the seat the President overrides", () => {
    const picks = deskDefaults(desk);
    const treasury = desk.seats.find((seat) => seat.office === "OFF-TREASURY-SEC")!;
    const other = treasury.candidates.find((candidate) => candidate.personId !== treasury.recommended && !picks.some((pick) => pick.person === candidate.personId))!;
    const overridden = picks.map((pick) => (pick.office === treasury.office ? { ...pick, person: other.personId } : pick));
    const before = new Map(nominated(deskPlan(open, picks).packets));
    const after = new Map(nominated(deskPlan(open, overridden).packets));
    expect(after.get(treasury.office)).toBe(other.personId);
    for (const [office, nominee] of before) if (office !== treasury.office) expect(after.get(office)).toBe(nominee);
  });

  it("sends one nomination when one person is picked for two seats, and says why the second was not sent", () => {
    const labor = desk.seats.find((seat) => seat.office === "OFF-LABOR-SEC")!;
    const treasury = desk.seats.find((seat) => seat.office === "OFF-TREASURY-SEC")!;
    const person = treasury.candidates.find((candidate) => !candidate.unavailable)!.personId;
    const plan = deskPlan(open, [
      { office: treasury.office, person },
      { office: labor.office, person },
    ]);
    expect(nominated(plan.packets)).toEqual([[treasury.office, person]]);
    expect(plan.refused).toHaveLength(1);
    expect(plan.refused[0]!.reason).toMatch(/already before the Senate/);
  });

  it("moves a seat's default aside when the President picks its name for another seat", () => {
    const labor = desk.seats.find((seat) => seat.office === "OFF-LABOR-SEC")!;
    const treasury = desk.seats.find((seat) => seat.office === "OFF-TREASURY-SEC")!;
    const laborDefault = deskPicks(desk).find((pick) => pick.office === labor.office)!.person;
    const picks = deskPicks(desk, { [treasury.office]: laborDefault });
    expect(picks.find((pick) => pick.office === treasury.office)?.person).toBe(laborDefault);
    const moved = picks.find((pick) => pick.office === labor.office)?.person;
    expect(moved).toBeDefined();
    expect(moved).not.toBe(laborDefault);
    expect(new Set(picks.map((pick) => pick.person)).size).toBe(picks.length);
  });

  it("leaves a seat open when the President chooses that", () => {
    expect(deskPicks(desk, { "OFF-LABOR-SEC": null }).some((pick) => pick.office === "OFF-LABOR-SEC")).toBe(false);
  });

  it("narrows to the seats asked for", () => {
    const courts = appointmentDesk(open, (seat) => seat.group === "courts");
    expect(courts.seats.every((seat) => seat.group === "courts")).toBe(true);
    expect(appointmentDesk(open, (seat) => seat.office === "OFF-LABOR-SEC").seats).toHaveLength(1);
  });
});
