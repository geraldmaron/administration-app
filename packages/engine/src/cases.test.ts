// The case kernel: identity survives a later packet and a JSON round trip,
// and a disposition the case does not allow never lands.
import { describe, expect, it } from "vitest";
import { apply, type EffectPacket } from "./effects.js";
import { addDays } from "./clock.js";
import { blockingCases, deferredCases, dueCases, openCases } from "./cases.js";
import type { CaseRaise } from "./case-types.js";
import { buildCampaign } from "./__fixtures__/campaign.js";

const raise: CaseRaise = {
  id: "bill-1",
  kind: "bill",
  title: "A bill is on the desk",
  subject: { kind: "bill", id: "bill-1" },
  clock: { kind: "statutory", dueAt: { year: 2029, month: 2, day: 1 } },
  defaultOutcome: { kind: "legal-default", outcomeId: "unsigned" },
  urgency: "hard",
  responseRequirement: "president",
  allowedDispositions: ["act", "defer"],
};

function packet(effects: EffectPacket["effects"]): EffectPacket {
  return { source: "conversation", actor: "player", turn: 1, narration: { summary: "The case moved." }, effects };
}

describe("presidential cases", () => {
  it("keeps the same id across a later packet and a JSON round trip", () => {
    const raised = apply(buildCampaign(), packet([{ kind: "case", actor: "player", raise }]));
    const later = apply(raised, packet([{ kind: "metric", deltas: { treasury: -1 } }]));
    expect(later.cases?.["bill-1"]?.id).toBe("bill-1");
    expect(later.cases?.["bill-1"]?.history).toHaveLength(1);
    const restored = JSON.parse(JSON.stringify(later)) as typeof later;
    expect(restored.cases?.["bill-1"]?.id).toBe("bill-1");
    expect(restored.cases?.["bill-1"]?.status).toBe("raised");
  });

  it("defers without changing the id, and lists it as deferred rather than blocking", () => {
    const campaign = buildCampaign();
    const raised = apply(campaign, packet([{ kind: "case", actor: "player", raise }]));
    const deferred = apply(
      raised,
      packet([
        {
          kind: "case",
          actor: "player",
          transition: {
            id: "bill-1",
            disposition: { kind: "defer", until: addDays(campaign.calendar, 3) },
            narration: "Put off for three days.",
          },
        },
      ]),
    );
    const item = deferred.cases?.["bill-1"];
    expect(item?.id).toBe("bill-1");
    expect(item?.status).toBe("deferred");
    expect(item?.history).toHaveLength(2);
    expect(item?.history[0]?.narration).toBe("Raised.");
    expect(deferredCases(deferred).map((row) => row.id)).toEqual(["bill-1"]);
    expect(blockingCases(deferred, campaign.calendar)).toEqual([]);
    expect(openCases(deferred)).toHaveLength(1);
  });

  it("refuses a disposition the case does not allow, and a second raise of the same id", () => {
    const raised = apply(buildCampaign(), packet([{ kind: "case", actor: "player", raise }]));
    expect(() =>
      apply(
        raised,
        packet([
          {
            kind: "case",
            actor: "player",
            transition: { id: "bill-1", disposition: { kind: "decline" }, narration: "No." },
          },
        ]),
      ),
    ).toThrow(/cannot be decline/);
    expect(raised.cases?.["bill-1"]?.status).toBe("raised");
    expect(() => apply(raised, packet([{ kind: "case", actor: "player", raise }]))).toThrow(/already exists/);
  });

  it("refuses a deferral on or past the deadline", () => {
    const campaign = buildCampaign();
    const raised = apply(campaign, packet([{ kind: "case", actor: "player", raise }]));
    expect(() =>
      apply(
        raised,
        packet([
          {
            kind: "case",
            actor: "player",
            transition: {
              id: "bill-1",
              disposition: { kind: "defer", until: { year: 2029, month: 2, day: 1 } },
              narration: "Too late.",
            },
          },
        ]),
      ),
    ).toThrow(/deadline/);
  });

  it("lists a hard case as blocking until it is acted, and a due clock as due", () => {
    const campaign = buildCampaign();
    const raised = apply(campaign, packet([{ kind: "case", actor: "player", raise }]));
    expect(blockingCases(raised, campaign.calendar).map((row) => row.id)).toEqual(["bill-1"]);
    expect(dueCases(raised, campaign.calendar)).toEqual([]);
    expect(dueCases(raised, { year: 2029, month: 2, day: 1 }).map((row) => row.id)).toEqual(["bill-1"]);
    const acted = apply(
      raised,
      packet([
        {
          kind: "case",
          actor: "player",
          transition: { id: "bill-1", disposition: { kind: "act", actionId: "sign" }, narration: "Signed." },
        },
      ]),
    );
    expect(openCases(acted)).toEqual([]);
    expect(blockingCases(acted, campaign.calendar)).toEqual([]);
    expect(acted.cases?.["bill-1"]?.causeIds.length).toBeGreaterThan(0);
  });
});
