// Opposite readings on a tariff signature, and belief-split polarization as a
// supplement under the joint MAX_TURN_POLARIZE ceiling.
import { describe, expect, it } from "vitest";
import { partiesOf, usaCharter, type PartyBeliefs } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import type { DomesticSignature } from "./domestic-signature.js";
import { figureTarget } from "./hill.js";
import { MAX_TURN_POLARIZE } from "./opinion.js";
import {
  BELIEF_SPLIT_POLARIZATION,
  BELIEF_WEIGHT,
  beliefSplit,
  beliefSplitEffects,
  beliefSplitPolarizeAmount,
  partyReading,
  selectPartyReading,
  signatureStance,
  ticketReading,
  widestTicketSplit,
} from "./party-beliefs.js";
import { usTicket } from "./party.js";
import type { HillFigure } from "./state.js";

const steelTariff = (): DomesticSignature => ({
  sectors: ["steel-heavy"],
  magnitude: "heavy",
  signature: "tariff:steel",
  reason: "A steel tariff lands where the mills are.",
});

/** A signature with no ideological content — both majors read it alike (zero). */
const emptyAlike = (): DomesticSignature => ({
  magnitude: "light",
  signature: "routine:none",
  reason: "Nothing the platforms disagree about.",
});

function majors(): { readonly democrat: PartyBeliefs; readonly republican: PartyBeliefs } {
  const tickets = partiesOf(usaCharter);
  const democrat = tickets.find((party) => (party.id as string) === "party-usa-democrat")!.beliefs;
  const republican = tickets.find((party) => (party.id as string) === "party-usa-republican")!.beliefs;
  return { democrat, republican };
}

const figure = (caucus: HillFigure["caucus"]): HillFigure => ({
  post: "post-house-speaker",
  person: "PER-1" as never,
  chamber: "house",
  caucus,
  influence: 0.14,
  seatedTurn: 1,
});

describe("partyReading", () => {
  it("returns opposite readings for the two majors on a steel tariff", () => {
    const { democrat, republican } = majors();
    const tariff = steelTariff();
    const dem = partyReading(democrat, tariff);
    const rep = partyReading(republican, tariff);
    expect(dem).toBeLessThan(0);
    expect(rep).toBeGreaterThan(0);
    expect(Math.sign(dem)).toBe(-Math.sign(rep));
  });

  it("reads a tariff as nationalist protection in ideology space", () => {
    const stance = signatureStance(steelTariff());
    expect(stance.nationalistGlobalist).toBeGreaterThan(0.5);
  });

  it("returns zero for both majors when the signature has no ideological content", () => {
    const { democrat, republican } = majors();
    const alike = emptyAlike();
    expect(partyReading(democrat, alike)).toBe(0);
    expect(partyReading(republican, alike)).toBe(0);
  });
});

describe("beliefSplit", () => {
  it("is higher for a tariff than for a signature the majors read alike", () => {
    const { democrat, republican } = majors();
    const tariffSplit = beliefSplit(democrat, republican, steelTariff());
    const alikeSplit = beliefSplit(democrat, republican, emptyAlike());
    expect(tariffSplit).toBeGreaterThan(alikeSplit);
    expect(alikeSplit).toBe(0);
    expect(tariffSplit).toBeGreaterThan(0);
    expect(tariffSplit).toBeLessThanOrEqual(1);
  });
});

describe("selectPartyReading", () => {
  it("frames one opposition for a president with a party", () => {
    const campaign = buildCampaign();
    const selection = selectPartyReading(campaign, steelTariff());
    expect(selection.administration.party).toBe(campaign.congress.administrationParty);
    expect(selection.opposition).toHaveLength(1);
    expect(selection.opposition[0]!.party).not.toBe(selection.administration.party);
    expect(Math.sign(selection.administration.reading)).toBe(-Math.sign(selection.opposition[0]!.reading));
  });

  it("frames two oppositions for an independent, and reads them against the independent ticket", () => {
    const base = buildCampaign();
    const campaign = {
      ...base,
      congress: { ...base.congress, administrationParty: "independent" as const },
    };
    const selection = selectPartyReading(campaign, steelTariff());
    expect(selection.administration.ticket.id as string).toBe("party-usa-independent");
    expect(selection.opposition.map((entry) => entry.party)).toEqual(["democrat", "republican"]);
  });

  it("reads a low-cohesion bloc as moving little, not as sitting in the middle", () => {
    const tariff = steelTariff();
    const independent = usTicket("independent");
    const republican = usTicket("republican");
    expect(Math.abs(ticketReading(independent, tariff))).toBeLessThan(
      Math.abs(ticketReading(republican, tariff)),
    );
    // Not zero: the bloc has politics, it just does not move together.
    expect(partyReading(independent.beliefs, tariff)).not.toBe(0);
  });
});

describe("belief-split polarization", () => {
  it("supplements OpinionEffect.polarize without a separate ceiling allowance", () => {
    const { democrat, republican } = majors();
    const tariff = steelTariff();
    const amount = beliefSplitPolarizeAmount(beliefSplit(democrat, republican, tariff));
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeCloseTo(BELIEF_SPLIT_POLARIZATION * beliefSplit(democrat, republican, tariff), 4);
    expect(amount).toBeLessThanOrEqual(MAX_TURN_POLARIZE);
    expect(BELIEF_SPLIT_POLARIZATION).toBeLessThanOrEqual(MAX_TURN_POLARIZE);

    const campaign = buildCampaign();
    const effects = beliefSplitEffects(campaign, tariff);
    expect(effects).toHaveLength(1);
    // The emitted amount counts cohesion: two caucuses that whip at 0.8 read
    // the act 0.8 as far apart as their platforms do.
    expect(effects[0]).toEqual({
      kind: "opinion",
      deltas: {},
      polarize: beliefSplitPolarizeAmount(widestTicketSplit(campaign, tariff)),
    });
    expect(effects[0]!.polarize!).toBeLessThan(amount);

    expect(beliefSplitEffects(campaign, emptyAlike())).toEqual([]);
  });

  it("keeps polarizing under an independent, who does not make the caucuses agree", () => {
    const base = buildCampaign();
    const campaign = {
      ...base,
      congress: { ...base.congress, administrationParty: "independent" as const },
    };
    const tariff = steelTariff();
    expect(widestTicketSplit(campaign, tariff)).toBeCloseTo(widestTicketSplit(base, tariff), 10);
  });
});

describe("figureTarget belief term", () => {
  it("moves a co-partisan target up when their platform favors the act", () => {
    const { republican } = majors();
    const room = 0.5;
    const member = figure("administration");
    const without = figureTarget(room, member);
    const withBelief = figureTarget(room, member, undefined, republican, steelTariff());
    expect(withBelief).toBeGreaterThan(without);
    expect(withBelief - without).toBeCloseTo(BELIEF_WEIGHT * partyReading(republican, steelTariff()), 3);
  });

  it("moves an opposition target down when their platform opposes the act", () => {
    const { democrat } = majors();
    const room = 0.5;
    const member = figure("opposition");
    const without = figureTarget(room, member);
    const withBelief = figureTarget(room, member, undefined, democrat, steelTariff());
    expect(withBelief).toBeLessThan(without);
  });

  it("is unchanged when no signature is supplied", () => {
    const room = 0.5;
    const member = figure("administration");
    expect(figureTarget(room, member)).toBe(figureTarget(room, member, undefined, majors().republican));
  });
});
