import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { resolveDueLobbying } from "./lobbying-due.js";
import { issueLobbying, projectLobbying } from "./lobbying.js";
import {
  ACROSS_THE_AISLE_TRADE_RESENTMENT,
  CAMPAIGN_LEAN,
  CAMPAIGN_RESENTMENT,
  CAMPAIGN_TRUST,
  PUBLIC_MISS_GRUDGE,
  REPEAT_CALL_CAUSE,
  REPEAT_CALL_RAPPORT,
  REPEAT_CALL_WINDOW_DAYS,
  SHARED_CREDIT_RESENTMENT,
  homeStateOf,
} from "./lobbying-person.js";
import { SHARED_CREDIT_FRACTION } from "./credit-share.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { rapportOf, tieOf, withRapportRead, type TieEffect } from "./ties.js";
import { selectHill, selectHillMember } from "./hill.js";
import { legislativeAct } from "./legislative-acts.js";
import { projectPassage } from "./bill-stages.js";
import { signBill } from "./legislation.js";
import { partyForCaucus, towardAdministrationSign } from "./party.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import type { Bill, Campaign, HillCaucus, HillPostId, LobbyApproach, LobbyRecord } from "./state.js";

const seed = makeCampaignSeed("person-acts-seed");
const SPEAKER: HillPostId = "post-house-speaker";
const INFRA = "act-infrastructure-investment";

function foundedCampaign(): Campaign {
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test President" },
  };
  return sealFounding(seed, worldDataset, choices);
}

function bill(campaign: Campaign, status: Bill["status"]): Bill {
  const act = legislativeAct(INFRA)!;
  return {
    id: `bill:${act.id}:${campaign.turn}`,
    act: act.id,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: campaign.turn,
    status,
    passage: projectPassage(campaign, act),
    ...(status === "in-progress" ? { stage: "referral" as const, setbacks: 0, momentum: 0, beats: [] } : {}),
  };
}

function withBill(campaign: Campaign, status: Bill["status"] = "in-progress"): Campaign {
  const entry = bill(campaign, status);
  return { ...campaign, bills: { ...campaign.bills, [entry.id]: entry } };
}

/** A member's home state leaning toward (sign 1) or against (sign −1) the administration. */
function homeLean(campaign: Campaign, post: HillPostId, sign: 1 | -1): Campaign {
  const state = homeStateOf(selectHillMember(campaign, post)!)!;
  const lean = 0.3 * sign * towardAdministrationSign(campaign.congress.caucusAnchor);
  return { ...campaign, states: { ...campaign.states, [state]: { ...campaign.states[state]!, lean } } };
}

function postIn(campaign: Campaign, caucus: HillCaucus): HillPostId {
  const member = selectHill(campaign).find((entry) => entry.figure.caucus === caucus && homeStateOf(entry) !== undefined);
  if (!member) throw new Error(`no ${caucus} member with a home state`);
  return member.figure.post;
}

function leadersOf(campaign: Campaign, caucus: HillCaucus, except: HillPostId): readonly HillPostId[] {
  return selectHill(campaign)
    .filter((member) => member.post.role === "role-congressional-leader" && member.figure.caucus === caucus && member.figure.post !== except)
    .map((member) => member.figure.post);
}

function complete(campaign: Campaign, post: HillPostId, approach: LobbyApproach) {
  const issued = issueLobbying(campaign, post, approach);
  if (!issued.ok) throw new Error(issued.reason);
  const pending = apply(campaign, issued.packet);
  const resolved = resolveDueLobbying({ ...pending, calendar: issued.act.dueDate });
  const record = resolved.campaign.congress.lobbying.at(-1)!;
  return { issued, pending, campaign: resolved.campaign, packet: resolved.packets.at(-1)!, landed: record.landed };
}

const tieEffects = (packet: EffectPacket): readonly TieEffect[] => packet.effects.filter((effect): effect is TieEffect => effect.kind === "tie");

const rapportOfPost = (campaign: Campaign, post: HillPostId): number =>
  rapportOf(campaign.people, selectHillMember(campaign, post)!.figure.person);

function calledBefore(campaign: Campaign, post: HillPostId, turnsAgo: number): Campaign {
  const record: LobbyRecord = { id: `lobby:${post}:${campaign.turn - turnsAgo}`, post, approach: "call", turn: campaign.turn - turnsAgo, landed: true, account: "An earlier call." };
  const workable = withRapportRead(campaign.people, selectHillMember(campaign, post)!.figure.person, 0.5) as Campaign["people"];
  return { ...campaign, people: workable, congress: { ...campaign.congress, lobbying: [record] } };
}

describe("a call repeated for nothing", () => {
  const windowTurns = Math.ceil(REPEAT_CALL_WINDOW_DAYS / DAYS_PER_TURN);
  const later = (campaign: Campaign): Campaign => ({ ...campaign, turn: campaign.turn + 10 });

  it("costs rapport inside the window, and the answer charges exactly what the card showed", () => {
    const campaign = calledBefore(later(foundedCampaign()), SPEAKER, windowTurns);
    const projection = projectLobbying(campaign, SPEAKER, "call")!;
    expect(projection.matter).toBeUndefined();
    expect(projection.repeatCall).toBe(REPEAT_CALL_RAPPORT);
    expect(projection.rapportIfGood).toBe(Math.round((0.5 + 0.07 + REPEAT_CALL_RAPPORT) * 1000) / 1000);
    const result = complete(campaign, SPEAKER, "call");
    expect(result.issued.act.repeatCall).toBe(REPEAT_CALL_RAPPORT);
    expect(rapportOfPost(result.campaign, SPEAKER)).toBe(result.landed ? projection.rapportIfGood : projection.rapportIfBad);
    const moved = tieEffects(result.packet).find((effect) => effect.person === selectHillMember(campaign, SPEAKER)!.figure.person)!;
    expect(moved.cause).toContain(REPEAT_CALL_CAUSE);
  });

  it("costs nothing outside the window", () => {
    const campaign = calledBefore(later(foundedCampaign()), SPEAKER, windowTurns + 1);
    const projection = projectLobbying(campaign, SPEAKER, "call")!;
    expect(projection.repeatCall).toBeUndefined();
    expect(projection.rapportIfGood).toBe(0.57);
  });

  it("costs nothing when the call asks about live business", () => {
    const campaign = withBill(calledBefore(later(foundedCampaign()), SPEAKER, 1));
    expect(projectLobbying(campaign, SPEAKER, "call")!.repeatCall).toBeUndefined();
  });
});

describe("a budget negotiation across the aisle", () => {
  function landedTrade(cold: Campaign, caucus: HillCaucus) {
    // Warm toward the administration, so a deal is one they would take.
    const campaign = selectHill(cold).reduce<Campaign>(
      (current, member) => ({ ...current, people: withRapportRead(current.people, member.figure.person, 0.95) as Campaign["people"] }),
      cold,
    );
    for (const member of selectHill(campaign).filter((entry) => entry.figure.caucus === caucus)) {
      const result = complete(campaign, member.figure.post, "trade");
      if (result.landed) return { ...result, post: member.figure.post, before: campaign };
    }
    throw new Error(`no trade landed with the ${caucus}`);
  }

  it("costs the President's own caucus leaders rapport, each with its cause, as the card showed", () => {
    const result = landedTrade(withBill(foundedCampaign()), "opposition");
    const campaign = result.before;
    const projection = result.issued.projection;
    const leaders = leadersOf(campaign, "administration", result.post);
    expect(leaders.length).toBeGreaterThan(0);
    expect(projection.resentments.map((entry) => entry.post)).toEqual(leaders);
    const charged = tieEffects(result.packet).filter((effect) => effect.rapport && "delta" in effect.rapport);
    expect(charged.map((effect) => effect.person)).toEqual(projection.resentments.map((entry) => entry.person));
    for (const effect of charged) {
      expect(effect.rapport).toEqual({ delta: ACROSS_THE_AISLE_TRADE_RESENTMENT });
      expect(effect.cause).toMatch(/across the aisle/);
    }
    for (const post of leaders) {
      expect(rapportOfPost(result.campaign, post)).toBeCloseTo(rapportOfPost(campaign, post) + ACROSS_THE_AISLE_TRADE_RESENTMENT, 3);
    }
  });

  it("costs nobody else when the member is of the President's own caucus", () => {
    const result = landedTrade(withBill(foundedCampaign()), "administration");
    expect(result.issued.projection.resentments).toEqual([]);
    expect(tieEffects(result.packet)).toHaveLength(1);
  });
});

describe("a public appeal in the member's state", () => {
  it("is closed where the member's state leans against the administration", () => {
    const campaign = homeLean(foundedCampaign(), SPEAKER, -1);
    const issued = issueLobbying(campaign, SPEAKER, "public");
    expect(issued.ok).toBe(false);
    if (!issued.ok) expect(issued.reason).toMatch(/leans against this administration/);
  });

  it("leaves a grudge on the member when it misses", () => {
    const friendly = homeLean(foundedCampaign(), SPEAKER, 1);
    const campaign: Campaign = { ...friendly, player: { ...friendly.player, metrics: { ...friendly.player.metrics, approval: 0 } }, press: { ...friendly.press, standing: 0 } };
    const result = complete(campaign, SPEAKER, "public");
    expect(result.landed).toBe(false);
    expect(result.issued.projection.grudgeIfMissed).toBe(PUBLIC_MISS_GRUDGE);
    const grudges = tieOf(result.campaign.people, selectHillMember(campaign, SPEAKER)!.figure.person)!.grudges;
    expect(grudges).toHaveLength(1);
    expect(grudges[0]!.weight).toBe(PUBLIC_MISS_GRUDGE);
    expect(grudges[0]!.cause).toMatch(/publicly failed to move/);
  });
});

describe("sharing the credit for a bill", () => {
  it("files the credit on the bill, costs the President's caucus leaders, and warms the member", () => {
    const campaign = withBill(foundedCampaign());
    const id = Object.keys(campaign.bills).find((key) => key.includes(INFRA))!;
    const projection = projectLobbying(campaign, SPEAKER, "credit")!;
    expect(projection.blocked).toBeUndefined();
    expect(projection.credit).toEqual({ billId: id, title: campaign.bills[id]!.title, fraction: SHARED_CREDIT_FRACTION });
    const result = complete(campaign, SPEAKER, "credit");
    expect(result.pending.bills[id]!.sharedCredit).toMatchObject({ post: SPEAKER, fraction: SHARED_CREDIT_FRACTION });
    const leaders = leadersOf(campaign, "administration", SPEAKER);
    expect(projection.resentments.map((entry) => entry.post)).toEqual(leaders);
    for (const entry of projection.resentments) {
      expect(entry.delta).toBe(SHARED_CREDIT_RESENTMENT);
      expect(entry.cause).toContain(campaign.bills[id]!.title);
      expect(rapportOfPost(result.pending, entry.post)).toBeCloseTo(rapportOfPost(campaign, entry.post) + SHARED_CREDIT_RESENTMENT, 3);
    }
    expect(rapportOfPost(result.campaign, SPEAKER)).toBe(result.landed ? projection.rapportIfGood : projection.rapportIfBad);
    expect(rapportOfPost(result.campaign, SPEAKER)).toBeGreaterThan(rapportOfPost(campaign, SPEAKER));
  });

  it("is closed when no live bill has credit to share, and once a bill's credit is shared", () => {
    expect(projectLobbying(foundedCampaign(), SPEAKER, "credit")!.blocked).toMatch(/no credit to share/);
    const shared = complete(withBill(foundedCampaign()), SPEAKER, "credit").campaign;
    expect(projectLobbying(shared, SPEAKER, "credit")!.blocked).toMatch(/no credit to share/);
  });

  it("scales the favorable opinion the law moves when it is enacted, and leaves the blame whole", () => {
    const desk = withBill(foundedCampaign(), "on-the-desk");
    const id = Object.keys(desk.bills).find((key) => key.includes(INFRA))!;
    const shared: Campaign = { ...desk, bills: { ...desk.bills, [id]: { ...desk.bills[id]!, sharedCredit: { person: selectHillMember(desk, SPEAKER)!.figure.person, post: SPEAKER, fraction: SHARED_CREDIT_FRACTION, turn: desk.turn } } } };
    const plain = signBill(desk, id);
    const credited = signBill(shared, id);
    if (!plain.ok || !credited.ok) throw new Error("expected both to sign");
    const toward = towardAdministrationSign(desk.congress.caucusAnchor);
    const leans = (packet: EffectPacket) => packet.effects.filter((effect): effect is Extract<Effect, { kind: "state" }> => effect.kind === "state");
    const before = leans(plain.packet);
    const after = leans(credited.packet);
    expect(after).toHaveLength(before.length);
    let favorable = 0;
    before.forEach((effect, index) => {
      const lean = effect.deltas!.lean!;
      const scaled = after[index]!.deltas!.lean!;
      if (lean * toward > 0) {
        favorable += 1;
        expect(scaled).toBeCloseTo(lean * (1 - SHARED_CREDIT_FRACTION), 3);
      } else expect(scaled).toBe(lean);
    });
    expect(favorable).toBeGreaterThan(0);
    const strains = (packet: EffectPacket) => packet.effects.flatMap((effect) => (effect.kind === "cohort" && effect.addStrain ? [effect.addStrain] : []));
    strains(plain.packet).forEach((strain, index) => {
      const scaled = strains(credited.packet)[index]!;
      expect(scaled.weight).toBeCloseTo(strain.valence === 1 ? strain.weight * (1 - SHARED_CREDIT_FRACTION) : strain.weight, 3);
    });
  });
});

describe("campaigning beside a member at home", () => {
  it("across the aisle: moves their state toward their party, costs standing, and the President's own leaders resent it, as the card showed", () => {
    const campaign = foundedCampaign();
    const post = postIn(campaign, "opposition");
    const member = selectHillMember(campaign, post)!;
    const state = homeStateOf(member)!;
    const projection = projectLobbying(campaign, post, "campaign")!;
    expect(projection.blocked).toBeUndefined();
    const party = partyForCaucus(member.figure.caucus, campaign.congress.caucusAnchor);
    const result = complete(campaign, post, "campaign");
    const leanEffect = result.issued.packet.effects.find((effect) => effect.kind === "state");
    expect(leanEffect).toMatchObject({ state, deltas: { lean: towardAdministrationSign(party) * CAMPAIGN_LEAN } });
    expect(result.pending.states[state]!.lean).toBe(projection.campaign!.leanAfter);
    expect(result.issued.packet.effects.some((effect) => effect.kind === "opinion")).toBe(false);
    expect(result.pending.player.opinion.integrity).toBe(campaign.player.opinion.integrity);
    expect(result.pending.player.metrics.standing).toBeCloseTo(campaign.player.metrics.standing - 0.02, 6);
    expect(projection.resentments.map((entry) => entry.post)).toEqual(leadersOf(campaign, "administration", post));
    const tie = tieOf(result.campaign.people, member.figure.person)!;
    expect(tie.rapport).toBe(result.landed ? projection.rapportIfGood : projection.rapportIfBad);
    expect(tie.trust).toBe(result.landed ? projection.trustIfGood : projection.trustIfBad);
    expect(tie.trust).toBeGreaterThan(tieOf(campaign.people, member.figure.person)?.trust ?? 0.5);
    expect(CAMPAIGN_TRUST.landed).toBeGreaterThan(CAMPAIGN_TRUST.missed);
  });

  it("for the President's own: the other side's leaders resent it", () => {
    const campaign = foundedCampaign();
    const post = postIn(campaign, "administration");
    const projection = projectLobbying(campaign, post, "campaign")!;
    expect(projection.resentments.map((entry) => entry.post)).toEqual(leadersOf(campaign, "opposition", post));
    const result = complete(campaign, post, "campaign");
    expect(result.issued.packet.effects.some((effect) => effect.kind === "opinion")).toBe(false);
    for (const entry of projection.resentments) {
      expect(entry.delta).toBe(CAMPAIGN_RESENTMENT);
      expect(rapportOfPost(result.pending, entry.post)).toBeCloseTo(rapportOfPost(campaign, entry.post) + CAMPAIGN_RESENTMENT, 3);
    }
  });
});
