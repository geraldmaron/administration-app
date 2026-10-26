import { describe, expect, it } from "vitest";
import { buildCampaign, nationB, person } from "./__fixtures__/campaign.js";
import { directiveAction, tariffAction, tariffLiftAction } from "./conversation-report-actions.js";
import { seatOfficer } from "./institutions.js";
import type { Campaign } from "./state.js";
import type { OversightMatter } from "./oversight.js";
import type { TradeMeasure } from "./trade.js";

const campaign = buildCampaign();
const measure: TradeMeasure = {
  id: "retaliation-measure:probe", kind: "tariff", sector: "textiles-apparel", target: nationB.id,
  rate: 0.1, imposedTurn: campaign.turn, imposedDate: campaign.calendar, authority: "INST-USTR",
  origin: "retaliation", actor: nationB.id,
};
const withMeasure: Campaign = { ...campaign, trade: { ...campaign.trade, measures: { ...campaign.trade.measures, [measure.id]: measure } } };
const matter: OversightMatter = {
  id: "matter:ig:INST-DOJ:probe", origin: { kind: "inspector-general", institution: "INST-DOJ" },
  direction: "received", subject: "the sealed case file", openedTurn: campaign.turn,
  stage: "reported", public: false, obstructed: false, beats: [],
};
const oversightOnly: Campaign = { ...campaign, oversight: { ...campaign.oversight, matters: [...campaign.oversight.matters, matter] } };
// Casework at Justice is the Attorney General's to take or decline, so a directive needs a sitting one.
const withMatter: Campaign = seatOfficer(oversightOnly, "INST-DOJ" as never, person.id);

describe("typed conversation commands", () => {
  it("executes the actual tariff and refuses a missing, lifted, or retargeted source", () => {
    const request = { target: nationB.id, sector: "textiles-apparel", rate: 0.15, answering: measure.id,
      sourceSector: measure.sector, sourceRate: measure.rate, sourceTurn: measure.imposedTurn };
    const live = tariffAction(withMeasure, request);
    expect(live.ok).toBe(true);
    if (!live.ok) return;
    expect(live.effects.some((effect) => effect.kind === "trade" && effect.measure?.origin === "us")).toBe(true);
    expect(tariffAction(campaign, request).ok).toBe(false);
    const lifted: Campaign = { ...withMeasure, trade: { ...withMeasure.trade, measures: { ...withMeasure.trade.measures,
      [measure.id]: { ...measure, liftedTurn: campaign.turn } } } };
    expect(tariffAction(lifted, request).ok).toBe(false);
    expect(tariffAction(withMeasure, { ...request, target: campaign.founding.nation }).ok).toBe(false);
    expect(tariffAction(withMeasure, { ...request, sourceRate: 0.2 }).ok).toBe(false);
  });

  it("lifts our pinned tariff, with theirs on the same day, and refuses a tariff already off", () => {
    const ours: TradeMeasure = { ...measure, id: "probe-ours", origin: "us", actor: undefined, sector: "steel", rate: 0.25 };
    const both: Campaign = { ...withMeasure, trade: { ...withMeasure.trade, measures: { ...withMeasure.trade.measures, [ours.id]: ours } } };
    const pin = (entry: TradeMeasure) => ({ measure: entry.id, sector: entry.sector, rate: entry.rate, imposedTurn: entry.imposedTurn });
    const mutual = tariffLiftAction(both, { ours: pin(ours), theirs: pin(measure) });
    expect(mutual.ok).toBe(true);
    if (!mutual.ok) return;
    const lifts = mutual.effects.flatMap((effect) => effect.kind === "trade" && effect.lift ? [effect.lift] : []);
    expect(lifts).toEqual([ours.id, measure.id]);
    const theirsLift = mutual.effects.find((effect) => effect.kind === "trade" && effect.lift === measure.id);
    expect(theirsLift && "priceMove" in theirsLift ? theirsLift.priceMove : undefined).toBeUndefined();
    expect(tariffLiftAction(both, { ours: pin(measure) }).ok).toBe(false);
    expect(tariffLiftAction(both, { ours: { ...pin(ours), rate: 0.1 } }).ok).toBe(false);
    const lifted: Campaign = { ...both, trade: { ...both.trade, measures: { ...both.trade.measures, [ours.id]: { ...ours, liftedTurn: campaign.turn } } } };
    expect(tariffLiftAction(lifted, { ours: pin(ours) })).toEqual({ ok: false, reason: "The tariff this answer lifts is no longer in force." });
  });

  it("lays a tariff with no retaliation behind it only where a trade law covers it", () => {
    const covered = tariffAction(withMeasure, { target: nationB.id, sector: "textiles-apparel", rate: 0.15 });
    expect(covered.ok).toBe(true);
    expect(tariffAction(campaign, { target: nationB.id, sector: "textiles-apparel", rate: 0.15 }).ok).toBe(false);
    expect(tariffAction(withMeasure, { target: campaign.founding.nation, sector: "steel", rate: 0.1 }).ok).toBe(false);
  });

  it("preserves the directive's real response and refuses a stale oversight matter", () => {
    const request = { matterId: matter.id, institution: "INST-DOJ", kind: "investigation" as const,
      subject: matter.subject, matterSubject: matter.subject, openedTurn: matter.openedTurn };
    const live = directiveAction(withMatter, request);
    expect(live.ok).toBe(true);
    if (!live.ok) return;
    expect(live.effects.some((effect) => effect.kind === "institution")).toBe(true);
    expect(live.summary).toBeTruthy();
    expect(directiveAction(campaign, request).ok).toBe(false);
    const unstaffed = directiveAction(oversightOnly, request);
    expect(unstaffed.ok).toBe(false);
    if (!unstaffed.ok) expect(unstaffed.reason).toContain("Nobody holds the Attorney General's authority");
    const closed: Campaign = { ...withMatter, oversight: { ...withMatter.oversight,
      matters: [{ ...matter, stage: "closed", closedTurn: campaign.turn }] } };
    expect(directiveAction(closed, request).ok).toBe(false);
    expect(directiveAction(withMatter, { ...request, matterSubject: "another file" }).ok).toBe(false);
  });

  it("pins the audit while allowing a separate department-wide enforcement subject", () => {
    const request = { matterId: matter.id, institution: "INST-DOJ", kind: "enforcement-posture" as const,
      matterSubject: matter.subject, subject: "department-wide case intake standards", openedTurn: matter.openedTurn };
    const live = directiveAction(withMatter, request);
    expect(live.ok).toBe(true);
    if (live.ok) expect(live.effects.some((effect) => effect.kind === "institution")).toBe(true);
    expect(directiveAction(withMatter, { ...request, matterSubject: "a different audit" }).ok).toBe(false);
  });

  it("routes a pinned removal notice through the inspector-general notice action", () => {
    const request = { matterId: matter.id, institution: "INST-DOJ", kind: "inspector-removal-notice" as const,
      matterSubject: matter.subject, reason: "loss of confidence", openedTurn: matter.openedTurn };
    const live = directiveAction(withMatter, request);
    expect(live.ok).toBe(true);
    if (live.ok) expect(live.effects.some((effect) => effect.kind === "oversight" && effect.inspectors !== undefined)).toBe(true);
    expect(directiveAction(withMatter, { ...request, matterSubject: "another file" }).ok).toBe(false);
  });
});
