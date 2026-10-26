import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { outstandingIssuedLobbyActs, dueIssuedLobbyActs, resolveDueLobbying } from "./lobbying-due.js";
import {
  LOBBY_APPROACH_ORDER,
  LOBBY_PLAYS,
  PUBLIC_APPEAL_MEMORY_TURNS,
  PUBLIC_ROOM_GAIN,
  PUBLIC_ROOM_LOSS,
  issueLobbying,
  projectLobbying,
  projectLobbyingOptions,
} from "./lobbying.js";
import { lobbyFigure } from "./__fixtures__/issued-acts.js";
import { figureRapport, openFavorsOwedByPresident, withRapportRead } from "./ties.js";
import { homeStateOf } from "./lobbying-person.js";
import { towardAdministrationSign } from "./party.js";
import { chamberDisposition, selectHillMember } from "./hill.js";
import { majorityOf } from "./congress.js";
import { countVote } from "./congress-votes.js";
import { actCost, legislativeAct } from "./legislative-acts.js";
import { projectPassage } from "./bill-stages.js";
import { apply } from "./effects.js";
import { likelihoodFromUnitInterval } from "./assessments.js";
import { grievanceHalfLifeDays } from "./relationships.js";
import { elapsedDays } from "./pace.js";
import type { Bill, Campaign, HillPostId, LobbyApproach } from "./state.js";

const seed = makeCampaignSeed("lobby-seed");
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

/** Put live fiscal business on the floor so a budget negotiation has a real project. */
function withFiscalBill(campaign: Campaign, actId = INFRA): Campaign {
  const act = legislativeAct(actId)!;
  const id = `bill:${act.id}:${campaign.turn}`;
  const bill: Bill = {
    id,
    act: act.id,
    title: act.title,
    sponsor: act.sponsor,
    introducedTurn: campaign.turn,
    status: "in-progress",
    passage: projectPassage(campaign, act),
    stage: "referral",
    setbacks: 0,
    momentum: 0,
    beats: [],
  };
  return { ...campaign, bills: { ...campaign.bills, [id]: bill } };
}

/** A campaign where the Speaker has room to be moved in either direction. */
function workable(campaign: Campaign): Campaign {
  const speaker = campaign.congress.leadership.find((figure) => figure.post === SPEAKER)!;
  return { ...campaign, people: withRapportRead(campaign.people, speaker.person, 0.5) as Campaign["people"] };
}

/**
 * The Speaker's home state leaning the administration's way, so a public
 * appeal to the Speaker's voters is open.
 */
function friendlyAtHome(campaign: Campaign): Campaign {
  const state = homeStateOf(selectHillMember(campaign, SPEAKER)!)!;
  const runtime = campaign.states[state]!;
  const lean = 0.3 * towardAdministrationSign(campaign.congress.caucusAnchor);
  return { ...campaign, states: { ...campaign.states, [state]: { ...runtime, lean } } };
}

/**
 * A president the country will not follow: three appeals already made, no
 * approval and no press, which prices the next one at nothing.
 */
function exhausted(campaign: Campaign): Campaign {
  const spent = friendlyAtHome(workable(campaign));
  return {
    ...spent,
    turn: 4,
    congress: {
      ...spent.congress,
      lobbying: [1, 2, 3].map((turn) => ({
        id: `lobby:post-senate-majority-leader:${turn}`,
        post: "post-senate-majority-leader" as HillPostId,
        approach: "public" as LobbyApproach,
        turn,
        landed: false,
        account: "went to the country",
      })),
    },
    player: { ...spent.player, metrics: { ...spent.player.metrics, approval: 0 } },
    press: { ...spent.press, standing: 0 },
  };
}

function completeLobby(campaign: Campaign, post: HillPostId, approach: LobbyApproach) {
  const issued = issueLobbying(campaign, post, approach);
  if (!issued.ok) throw new Error(issued.reason);
  const pending = apply(campaign, issued.packet);
  const resolved = resolveDueLobbying({ ...pending, calendar: issued.act.dueDate });
  const record = resolved.campaign.congress.lobbying.at(-1);
  if (!record) throw new Error("expected a lobby record");
  return { campaign: resolved.campaign, issued, record, landed: record.landed, post };
}

function aLandedTrade(campaign: Campaign) {
  const withBill = withFiscalBill(campaign);
  for (const figure of withBill.congress.leadership) {
    const result = completeLobby(withBill, figure.post, "trade");
    if (result.landed) return result;
  }
  throw new Error("no trade landed anywhere on the Hill");
}

describe("lobbying the Hill", () => {
  it("prices every approach before anything is spent", () => {
    const options = projectLobbyingOptions(foundedCampaign(), SPEAKER);
    expect(options.map((option) => option.approach)).toEqual(LOBBY_APPROACH_ORDER);
    for (const option of options) {
      expect(option.successChance).toBeGreaterThan(0);
      expect(option.successChance).toBeLessThanOrEqual(1);
      expect(option.rapportIfGood).toBeGreaterThan(option.rapportIfBad);
      expect(option.forecast.likelihood).toBe(likelihoodFromUnitInterval(option.successChance));
      expect(["low", "moderate", "high"]).toContain(option.forecast.confidence);
    }
  });

  it("does not hardcode confidence from success chance", () => {
    const campaign = foundedCampaign();
    const projection = projectLobbying(campaign, SPEAKER, "call")!;
    expect(projection.forecast.likelihood).toBe(likelihoodFromUnitInterval(projection.successChance));
    expect(projection.forecast.confidence).toBe("low");
    expect(projection.forecast.confidenceBasis.length).toBeGreaterThan(0);
  });

  it("includes the public-appeal room shift in the chamber preview", () => {
    const campaign = foundedCampaign();
    const projection = projectLobbying(campaign, SPEAKER, "public")!;
    const member = selectHillMember(campaign, SPEAKER)!;
    const moved = withRapportRead(campaign.people, member.figure.person, projection.rapportIfGood);
    const withRoom = {
      ...campaign.congress,
      disposition: Math.max(0, Math.min(1, campaign.congress.disposition + PUBLIC_ROOM_GAIN)),
    };
    expect(projection.chamberIfGood).toBe(chamberDisposition(withRoom, "house", campaign.states, moved));
    expect(projection.chamberIfGood).not.toBe(chamberDisposition(campaign.congress, member.figure.chamber, campaign.states, moved));
    expect(PUBLIC_ROOM_LOSS).toBeLessThan(0);
  });

  it("shows what the chamber would count at before the president commits", () => {
    const campaign = foundedCampaign();
    const projection = projectLobbying(campaign, SPEAKER, "call")!;
    expect(projection.chamberBefore).toBe(chamberDisposition(campaign.congress, "house", campaign.states, campaign.people));
    expect(projection.chamberIfGood).toBeGreaterThan(projection.chamberBefore);
  });

  it("does not debit the treasury for a budget negotiation", () => {
    expect(LOBBY_PLAYS.trade.cost.treasury).toBeUndefined();
    expect(Object.keys(LOBBY_PLAYS.call.cost).length).toBeGreaterThan(0);
    expect(Object.keys(LOBBY_PLAYS.public.cost).length).toBeGreaterThan(0);
    expect(LOBBY_PLAYS.trade.summary.toLowerCase()).not.toContain("nine year");
  });

  it("refuses a budget negotiation when no eligible fiscal project is on the floor", () => {
    const campaign = foundedCampaign();
    const projection = projectLobbying(campaign, SPEAKER, "trade")!;
    expect(projection.blocked).toMatch(/no eligible/i);
    expect(projection.footer).toBe("No eligible project.");
    expect(issueLobbying(campaign, SPEAKER, "trade").ok).toBe(false);
  });

  it("records a favor the President owes on a landed trade without debiting treasury", () => {
    const campaign = withFiscalBill(workable(foundedCampaign()));
    const beforeTreasury = campaign.player.metrics.treasury;
    const landed = aLandedTrade(campaign);
    expect(landed.campaign.player.metrics.treasury).toBe(beforeTreasury);
    const open = openFavorsOwedByPresident(landed.campaign);
    expect(open).toHaveLength(1);
    expect(open[0]!.holder).toBe(selectHillMember(landed.campaign, landed.post)!.figure.person);
    expect(open[0]!.post).toBe(landed.post);
    expect(open[0]!.billId).toContain(INFRA);
    expect(open[0]!.reservedTreasury).toBe(Math.abs(actCost(campaign, legislativeAct(INFRA)!)!.treasury!));
  });

  for (const [status, settled] of [
    ["law", "repaid"],
    ["dead", "defaulted"],
  ] as const) {
    it(`settles the favor ${settled} when the bill ends ${status}, without a treasury charge from the favor`, () => {
      const campaign = withFiscalBill(workable(foundedCampaign()));
      const landed = aLandedTrade(campaign);
      const favor = openFavorsOwedByPresident(landed.campaign)[0]!;
      const bill = landed.campaign.bills[favor.billId!]!;
      const after = apply(landed.campaign, {
        source: "action",
        actor: "world",
        turn: landed.campaign.turn,
        narration: { summary: "test settlement" },
        effects: [{ kind: "bill", set: { ...bill, status, resolvedTurn: landed.campaign.turn } }],
      });
      expect(openFavorsOwedByPresident(after)).toHaveLength(0);
      const kept = after.people[favor.holder]!.tie!.favors.find((entry) => entry.id === favor.id)!;
      expect(kept.status).toBe(settled);
      expect(kept.settledTurn).toBe(landed.campaign.turn);
      expect(after.player.metrics.treasury).toBe(landed.campaign.player.metrics.treasury);
    });
  }

  it("issues a pending play instead of resolving on the click", () => {
    const campaign = foundedCampaign();
    const issued = issueLobbying(campaign, SPEAKER, "call");
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const after = apply(campaign, issued.packet);
    expect(after.congress.lobbying).toHaveLength(0);
    expect(Object.values(after.issuedActs ?? {}).some((act) => act.status === "awaiting-response")).toBe(true);
    expect(after.calendar).toEqual(campaign.calendar);
  });

  it("moves the member, and therefore the whip count, when it lands", () => {
    const campaign = workable(foundedCampaign());
    const landed = aLandedTrade(campaign);
    const member = selectHillMember(campaign, landed.post)!;
    expect(figureRapport(landed.campaign.people, member.figure)).toBeGreaterThan(figureRapport(campaign.people, member.figure));
    const chamber = member.post.chamber;
    expect(chamberDisposition(landed.campaign.congress, chamber, landed.campaign.states, landed.campaign.people)).toBeGreaterThan(
      chamberDisposition(campaign.congress, chamber, campaign.states, campaign.people),
    );
    expect(countVote(landed.campaign.congress, "house", 0, majorityOf(435)).yeas).toBeGreaterThanOrEqual(0);
  });

  it("can move a bill that was short before the president spent anything", () => {
    const act = legislativeAct("act-infrastructure-investment")!;
    const campaign = workable(foundedCampaign());
    const before = projectPassage(campaign, act);
    const landed = aLandedTrade(campaign);
    const after = projectPassage(landed.campaign, act);
    expect(after[0]!.yeas + after[1]!.yeas).toBeGreaterThanOrEqual(before[0]!.yeas + before[1]!.yeas);
  });

  it("can leave the administration worse off when it goes to the country and loses", () => {
    const campaign = exhausted(foundedCampaign());
    expect(projectLobbying(campaign, SPEAKER, "public")!.successChance).toBe(0);
    const result = completeLobby(campaign, SPEAKER, "public");
    expect(result.landed).toBe(false);
    expect(result.campaign.congress.disposition).toBeLessThan(campaign.congress.disposition);
    expect(result.campaign.player.metrics.standing).toBeLessThan(campaign.player.metrics.standing);
    const speaker = selectHillMember(campaign, SPEAKER)!.figure;
    expect(figureRapport(result.campaign.people, speaker)).toBeLessThan(figureRapport(campaign.people, speaker));
  });

  it("rolls against exactly the odds it showed, without the UI consuming the stream", () => {
    const campaign = friendlyAtHome(withFiscalBill(foundedCampaign()));
    for (const approach of ["call", "trade", "public", "credit", "campaign"] as LobbyApproach[]) {
      const projection = projectLobbying(campaign, SPEAKER, approach)!;
      const issued = issueLobbying(campaign, SPEAKER, approach);
      if (!issued.ok) throw new Error(issued.reason);
      expect(issued.projection.successChance).toBe(projection.successChance);
      expect(issued.act.chance).toBe(projection.successChance);
      expect(issued.act.forecast).toEqual(projection.forecast);
    }
  });

  it("will not authorize a second trade on a bill that already carries an open promise", () => {
    const campaign = withFiscalBill(workable(foundedCampaign()));
    const landed = aLandedTrade(campaign);
    expect(openFavorsOwedByPresident(landed.campaign).length).toBe(1);
    const other = landed.campaign.congress.leadership.find((figure) => figure.post !== landed.post);
    if (!other) throw new Error("need a second Hill figure");
    const again = issueLobbying(landed.campaign, other.post, "trade");
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toMatch(/already carries an open appropriation commitment/i);
  });

  it("replays identically from the same seed and due date", () => {
    const campaign = foundedCampaign();
    const first = completeLobby(campaign, SPEAKER, "call");
    const second = completeLobby(campaign, SPEAKER, "call");
    expect(first.landed).toBe(second.landed);
    expect(first.record).toEqual(second.record);
  });

  it("will not let the same member be worked twice while a play is outstanding", () => {
    const campaign = foundedCampaign();
    const first = lobbyFigure(campaign, SPEAKER, "call");
    if (!first.ok) throw new Error(first.reason);
    const again = lobbyFigure(apply(campaign, first.packet), SPEAKER, "trade");
    expect(again.ok).toBe(false);
  });

  it("refuses a seat nobody holds rather than inventing a member", () => {
    const campaign = foundedCampaign();
    const empty = { ...campaign, congress: { ...campaign.congress, leadership: [] } };
    expect(lobbyFigure(empty, SPEAKER, "call").ok).toBe(false);
    expect(projectLobbying(empty, SPEAKER, "call")).toBeUndefined();
  });

  it("prices a president who keeps going to the country lower each time", () => {
    const campaign = foundedCampaign();
    const first = projectLobbying(campaign, SPEAKER, "public")!;
    const worn = {
      ...campaign,
      turn: campaign.turn + 1,
      congress: {
        ...campaign.congress,
        lobbying: [
          {
            id: "lobby:post-senate-majority-leader:1",
            post: "post-senate-majority-leader" as HillPostId,
            approach: "public" as LobbyApproach,
            turn: campaign.turn,
            landed: true,
            account: "went to the country",
          },
        ],
      },
    };
    const second = projectLobbying(worn, SPEAKER, "public")!;
    expect(second.successChance).toBeLessThan(first.successChance);
    expect(campaign.turn + PUBLIC_APPEAL_MEMORY_TURNS).toBeGreaterThan(worn.turn);
  });

  it("keeps the record of what was spent and what it bought", () => {
    const campaign = foundedCampaign();
    const result = completeLobby(campaign, SPEAKER, "call");
    expect(result.campaign.congress.lobbying).toHaveLength(1);
    expect(result.campaign.congress.lobbying[0]!.post).toBe(SPEAKER);
    expect(result.campaign.congress.lobbying[0]!.account).toBe(result.record.account);
  });

  it("preserves the ex-ante forecast after the outcome is known", () => {
    const campaign = foundedCampaign();
    const issued = issueLobbying(campaign, SPEAKER, "call");
    if (!issued.ok) throw new Error(issued.reason);
    const after = completeLobby(campaign, SPEAKER, "call");
    const closed = Object.values(after.campaign.issuedActs ?? {}).find((act) => act.id === issued.act.id);
    expect(closed?.forecast).toEqual(issued.act.forecast);
    expect(closed?.status).toBe("resolved");
  });

  it("lists outstanding Hill plays before they are due", () => {
    const campaign = foundedCampaign();
    const issued = issueLobbying(campaign, SPEAKER, "call");
    if (!issued.ok) throw new Error(issued.reason);
    const pending = apply(campaign, issued.packet);
    expect(outstandingIssuedLobbyActs(pending)).toHaveLength(1);
    expect(dueIssuedLobbyActs(pending)).toHaveLength(0);
    expect(dueIssuedLobbyActs({ ...pending, calendar: issued.act.dueDate })).toHaveLength(1);
  });
});

describe("POL-29: the member's own answer", () => {
  it("charges an aged personal grudge once in private willingness, in both preview and answer", () => {
    const campaign = friendlyAtHome(workable(foundedCampaign()));
    const person = selectHillMember(campaign, SPEAKER)!.figure.person;
    const hurt = apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A remembered injury." },
      effects: [{ kind: "tie", person, cause: "Publicly pressured at home.", grudge: { cause: "Publicly pressured at home.", weight: 0.5, turn: campaign.turn } }] });
    const preview = projectLobbying(campaign, SPEAKER, "call")!;
    const injured = projectLobbying(hurt, SPEAKER, "call")!;
    expect(preview.successChance - injured.successChance).toBeCloseTo(0.1, 3);
    expect(preview.counterpart.willingness.score - injured.counterpart.willingness.score).toBeCloseTo(0.1, 3);
    const aged = { ...hurt, turn: hurt.turn + grievanceHalfLifeDays(0.5) / elapsedDays(1) };
    expect(preview.successChance - projectLobbying(aged, SPEAKER, "call")!.successChance).toBeCloseTo(0.05, 3);
    expect(projectLobbying(hurt, SPEAKER, "public")!.successChance).toBe(projectLobbying(campaign, SPEAKER, "public")!.successChance);
    const issued = issueLobbying(hurt, SPEAKER, "call");
    if (!issued.ok) throw new Error(issued.reason);
    const due = { ...apply(hurt, issued.packet), calendar: issued.act.dueDate };
    const answer = resolveDueLobbying(due).packets.at(-1)!.provenance!.decision!;
    expect(answer.terms.filter((term) => term.key === "disposition")).toHaveLength(1);
    expect(answer.terms.find((term) => term.key === "disposition")!.value).toBeCloseTo(-0.1, 3);
    expect(issued.act.chance).toBe(injured.successChance);
  });

  it("names the terms and the leading one before the call", () => {
    const campaign = workable(foundedCampaign());
    for (const approach of ["call", "trade", "public"] as const) {
      const projection = projectLobbying(campaign, SPEAKER, approach)!;
      const { willingness } = projection.counterpart;
      expect(projection.counterpart.id).toBe(SPEAKER);
      expect(willingness.question).toBe("lobbied-member");
      expect(willingness.leading.length, approach).toBeGreaterThan(0);
      // The number the roll reads and the margin the card reads are one figure.
      expect(projection.successChance).toBeCloseTo(Math.max(0, Math.min(1, 0.5 + willingness.margin)), 3);
      expect(["likely", "unlikely", "close"]).toContain(willingness.forecast);
    }
  });

  it("weighs the member's character on a private ask and their state on a public one", () => {
    const campaign = workable(foundedCampaign());
    const keysFor = (approach: LobbyApproach): readonly string[] =>
      projectLobbying(campaign, SPEAKER, approach)!.counterpart.willingness.leading;
    const priv = projectLobbying(campaign, SPEAKER, "call")!.counterpart.willingness;
    expect(priv.score).not.toBe(0);
    for (const key of keysFor("call")) expect(["disposition", "ambition", "integrity"]).toContain(key);
    // A public appeal is answered at home, so the only term is the one term
    // about home.
    const openAir = projectLobbying(campaign, SPEAKER, "public")!.counterpart.willingness;
    expect(openAir.leading.every((key) => key === "standing-at-home")).toBe(true);
  });

  it("reads a member whose state leans toward the administration as the easier public ask", () => {
    const campaign = workable(foundedCampaign());
    const member = selectHillMember(campaign, SPEAKER)!;
    const home = member.person?.birthplace;
    expect(home, "the Speaker has no birthplace to read a state off").toBeDefined();
    // Flip every state's lean toward the administration and the appeal reads
    // better; flip it away and it reads worse.
    const leaned = (lean: number): Campaign => ({
      ...campaign,
      // Object.fromEntries widens the key back to string, which drops the
      // state-id record's exhaustiveness; the entries are the same fifty.
      states: Object.fromEntries(
        Object.entries(campaign.states ?? {}).map(([id, runtime]) => [id, { ...runtime, lean }]),
      ) as Campaign["states"],
    });
    const toward = campaign.congress.caucusAnchor === "democrat" ? -1 : 1;
    const with_ = projectLobbying(leaned(toward), SPEAKER, "public")!;
    const against = projectLobbying(leaned(-toward), SPEAKER, "public")!;
    expect(with_.successChance).toBeGreaterThan(against.successChance);
  });

  it("stamps the answer onto the packet that carries it", () => {
    const campaign = workable(foundedCampaign());
    const issued = issueLobbying(campaign, SPEAKER, "call");
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const pending = apply(campaign, issued.packet);
    const resolved = resolveDueLobbying({ ...pending, calendar: issued.act.dueDate });
    const packet = resolved.packets.at(-1)!;
    const stamp = packet.provenance?.decision;
    expect(stamp, "the answer carries no reason of record").toBeDefined();
    expect(stamp!.question).toBe("lobbied-member");
    expect(stamp!.visibility).toBe("public");
    expect(stamp!.acts).toBe(resolved.campaign.congress.lobbying.at(-1)!.landed);
    expect(stamp!.terms.map((term) => term.key)).toEqual(["disposition", "ambition", "integrity"]);
    expect(stamp!.actor).toBe(selectHillMember(campaign, SPEAKER)!.person!.id);
  });

  it("weighs the Secretary who carries the bill on the floor in a private ask, and nobody's in a public one", () => {
    const campaign = withFiscalBill(workable(foundedCampaign()));
    const issued = issueLobbying(campaign, SPEAKER, "trade");
    if (!issued.ok) throw new Error(issued.reason);
    const resolved = resolveDueLobbying({ ...apply(campaign, issued.packet), calendar: issued.act.dueDate });
    const stamp = resolved.packets.at(-1)!.provenance!.decision!;
    expect(stamp.terms.map((term) => term.key)).toEqual(["disposition", "ambition", "integrity", "advocate"]);
    const openAir = projectLobbying(campaign, SPEAKER, "public")!.counterpart.willingness;
    expect(openAir.leading).not.toContain("advocate");
  });
});
