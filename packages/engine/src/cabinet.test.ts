import { describe, expect, it } from "vitest";
import { Person, type PersonId, type RoleId } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import {
  breakChanceOver,
  breakRateOf,
  cabinetConsequencesPhase,
  cabinetOutcomeFor,
  cabinetOutcomeOf,
  cabinetRiskRate,
  departureFlag,
  factionFlag,
  factionPressure,
  ORDINARY_EXIT_RATE,
  rivalFaction,
  selectCabinetExposure,
  selectCabinetExposureFor,
  selectFactions,
  selectFormerService,
} from "./cabinet.js";
import { dismissMinister } from "./appointments.js";
import { departingFlag } from "./cabinet-departing.js";
import { hasFlag, type Campaign } from "./state.js";
import { apply } from "./effects.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { createRngStreams, replay, makeCampaignSeed } from "./rng.js";
import { addDays, selectCampaignClock } from "./clock.js";

// Deliberately not the fixture's leadRole ("role-chancellor") — that seat is
// the player's own persona, not an appointee, and is covered separately below.
const ROLE = "role-foreign-minister" as RoleId;

// How many weeks to wait on a chair that is going to break. Ten breaks' worth
// at its own weekly rate, so a test that waits for a break is asking whether
// the break comes rather than how often the calibration makes it come.
function patience(overrides: Partial<Person>): number {
  return Math.ceil(10 / cabinetRiskRate({ ...person, ...overrides }));
}

function seatMinister(campaign: Campaign, overrides: Partial<Person>): Campaign {
  const minister = Person.parse({ ...person, ...overrides });
  return {
    ...campaign,
    people: { ...campaign.people, [minister.id]: { base: minister, alive: true, currentRole: ROLE } },
    player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [ROLE]: minister.id } },
  };
}

describe("risk rate", () => {
  it("rises with disloyalty", () => {
    const loyal = { ...person, loyalty: 0.9 };
    const disloyal = { ...person, loyalty: 0.1 };
    expect(cabinetRiskRate(disloyal)).toBeGreaterThan(cabinetRiskRate(loyal));
  });

  it("is zero for a fully loyal minister", () => {
    expect(cabinetRiskRate({ ...person, loyalty: 1 })).toBe(0);
  });

  it("a corrupt minister carries more risk than a principled one at the same loyalty", () => {
    const corrupt = { ...person, loyalty: 0.4, traits: ["corrupt"] as Person["traits"] };
    const principled = { ...person, loyalty: 0.4, traits: ["principled"] as Person["traits"] };
    expect(cabinetRiskRate(corrupt)).toBeGreaterThan(cabinetRiskRate(principled));
  });

  it("a reclusive minister carries less risk than one with no trait at all, at the same loyalty", () => {
    const reclusive = { ...person, loyalty: 0.4, traits: ["reclusive"] as Person["traits"] };
    const plain = { ...person, loyalty: 0.4, traits: [] as Person["traits"] };
    expect(cabinetRiskRate(reclusive)).toBeLessThan(cabinetRiskRate(plain));
  });

  it("reclusive stacks with corrupt rather than overriding it — still riskier than a merely reclusive minister", () => {
    const reclusiveCorrupt = { ...person, loyalty: 0.4, traits: ["corrupt", "reclusive"] as Person["traits"] };
    const reclusive = { ...person, loyalty: 0.4, traits: ["reclusive"] as Person["traits"] };
    expect(cabinetRiskRate(reclusiveCorrupt)).toBeGreaterThan(cabinetRiskRate(reclusive));
  });
});

describe("outcome classification", () => {
  it("a loyal, unambitious minister only ever leaks", () => {
    expect(cabinetOutcomeFor({ ...person, loyalty: 0.8, ambition: 0.3 })).toBe("leak");
  });

  it("high ambition paired with low loyalty is a challenge, not a resignation", () => {
    expect(cabinetOutcomeFor({ ...person, loyalty: 0.1, ambition: 0.9 })).toBe("challenge");
  });

  it("low loyalty alone, without ambition, is a resignation", () => {
    expect(cabinetOutcomeFor({ ...person, loyalty: 0.05, ambition: 0.2 })).toBe("resignation");
  });

  it("high ambition with high loyalty is neither — just a leak-band read", () => {
    expect(cabinetOutcomeFor({ ...person, loyalty: 0.9, ambition: 0.95 })).toBe("leak");
  });

  it("charisma turns ambition that falls short of the floor into a real challenge", () => {
    const belowFloor = { ...person, loyalty: 0.3, ambition: 0.6, traits: [] as Person["traits"] };
    expect(cabinetOutcomeFor(belowFloor)).not.toBe("challenge");
    const charismatic = { ...belowFloor, traits: ["charismatic"] as Person["traits"] };
    expect(cabinetOutcomeFor(charismatic)).toBe("challenge");
  });
});

describe("the cabinet consequences phase", () => {
  it("never breaks a fully loyal cabinet, and has its members announce ordinary departures at the ordinary rate, quietly", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 1 });
    const holder = campaign.player.cabinet[ROLE]!;
    const weeks = 30_000;
    let exits = 0;
    for (let turn = 1; turn <= weeks; turn += 1) {
      for (const packet of cabinetConsequencesPhase({ ...campaign, turn })) {
        expect(packet.provenance?.systems).toContain("ordinary");
        // Announced, not vacated: the chair is held while the Secretary serves on.
        expect(packet.effects.some((effect) => effect.kind === "cabinet")).toBe(false);
        expect(packet.effects.some((effect) => effect.kind === "flag" && effect.set?.includes(departingFlag(ROLE, holder)))).toBe(true);
        expect(packet.effects.some((effect) => effect.kind === "metric")).toBe(false);
        exits += 1;
      }
    }
    expect(exits).toBeGreaterThanOrEqual(ORDINARY_EXIT_RATE * weeks * 0.5);
    expect(exits).toBeLessThanOrEqual(ORDINARY_EXIT_RATE * weeks * 1.5);
  });

  // Read off the bottom of the week's one roll: for a chair that would leak,
  // the ordinary exit takes the leak's place rather than adding a second draw,
  // and a chair already on its way out goes the way it was going.
  it.each([
    ["a chair that leaks", { loyalty: 0.66, ambition: 0.1, integrity: 0.05, traits: ["corrupt"] as Person["traits"] }, "leak"],
    ["a chair that resigns", { loyalty: 0.3, ambition: 0.1 }, "resignation"],
  ] as const)("draws %s from one roll a week", (_, minister, outcome) => {
    const campaign = seatMinister(buildCampaign(), minister);
    const holder = campaign.people[campaign.player.cabinet[ROLE]!]!;
    const rate = breakRateOf(campaign, holder.base);
    expect(rate).toBeGreaterThan(ORDINARY_EXIT_RATE);
    for (let turn = 1; turn <= 5_000; turn += 1) {
      const roll = createRngStreams(campaign.seed).stream("cabinet", holder.base.id, turn).next();
      const systems = cabinetConsequencesPhase({ ...campaign, turn }).map((packet) => packet.provenance?.systems ?? []);
      const ordinary = outcome === "leak" && roll < ORDINARY_EXIT_RATE;
      expect(systems.length, `week ${turn}`).toBe(roll < rate ? 1 : 0);
      if (systems.length > 0) expect(systems[0]!.includes("ordinary"), `week ${turn}`).toBe(ordinary);
    }
  });

  it("skips a vacant seat and a dead minister without throwing", () => {
    const vacant = buildCampaign();
    expect(cabinetConsequencesPhase(vacant).length).toBeGreaterThanOrEqual(0);

    const dead = seatMinister(vacant, { loyalty: 0.05 });
    const holderId = dead.player.cabinet[ROLE]!;
    const withDeadHolder: Campaign = { ...dead, people: { ...dead.people, [holderId]: { ...dead.people[holderId]!, alive: false } } };
    expect(cabinetConsequencesPhase(withDeadHolder)).toEqual([]);
  });

  it("never fires against the head of state's own seat, however low its loyalty rolls", () => {
    const base = buildCampaign();
    const leadRole = base.founding.leadRole;
    const holderId = base.player.cabinet[leadRole]!;
    const compromised: Campaign = {
      ...base,
      people: { ...base.people, [holderId]: { ...base.people[holderId]!, base: { ...base.people[holderId]!.base, loyalty: 0.01, ambition: 0.99 } } },
    };
    for (let turn = 1; turn <= 30; turn++) {
      expect(cabinetConsequencesPhase({ ...compromised, turn })).toEqual([]);
    }
  });

  it("a very disloyal, ambitious minister eventually produces a challenge that marks a rival faction and costs stability", () => {
    const minister = { loyalty: 0.05, ambition: 0.95 };
    let campaign = seatMinister(buildCampaign(), minister);
    const before = campaign.player.metrics.stability;

    let firedChallenge = false;
    for (let i = 0; i < patience(minister) && !firedChallenge; i++) {
      const packets = cabinetConsequencesPhase(campaign);
      for (const packet of packets) {
        campaign = apply(campaign, packet);
        if (packet.effects.some((e) => e.kind === "person" && e.changes.affiliation !== undefined)) {
          firedChallenge = true;
        }
      }
      campaign = { ...campaign, turn: campaign.turn + 1 };
    }

    expect(firedChallenge).toBe(true);
    expect(campaign.player.metrics.stability).toBeLessThan(before);
    const holderId = campaign.player.cabinet[ROLE]!;
    expect(campaign.people[holderId]!.affiliation).toBeDefined();
  });

  // The finding this closes: resignation used to set `alive: false`, on the
  // reasoning that every reader of that field treats a dead minister and an
  // empty chair alike. True of the seat, false of the person — the dossier
  // closed their file, the tie graph deleted every relationship they had, and
  // the bench dropped them. Walking out over a decision removed them from the
  // world.
  it("a resigning minister empties the chair and stays alive", () => {
    const minister = { loyalty: 0.02, ambition: 0.1 };
    let campaign = seatMinister(buildCampaign(), minister);
    const holderId = campaign.player.cabinet[ROLE]!;

    let resigned = false;
    for (let i = 0; i < patience(minister) && !resigned; i++) {
      const packets = cabinetConsequencesPhase(campaign);
      for (const packet of packets) {
        campaign = apply(campaign, packet);
        if (packet.narration.summary.includes("leaves the government") || packet.effects.some((e) => e.kind === "cabinet")) {
          resigned = true;
        }
      }
      campaign = { ...campaign, turn: campaign.turn + 1 };
    }

    expect(resigned).toBe(true);
    expect(campaign.player.cabinet[ROLE]).toBeUndefined();
    const holder = campaign.people[holderId]!;
    expect(holder.alive).toBe(true);
    expect(holder.currentRole).toBeUndefined();
    expect(holder.loyaltyAtAppointment).toBeUndefined();
  });

  it("records what became of them, so a former Secretary is a former Secretary rather than a stranger", () => {
    const minister = { loyalty: 0.02, ambition: 0.1 };
    let campaign = seatMinister(buildCampaign(), minister);
    const holderId = campaign.player.cabinet[ROLE]!;

    for (let i = 0; i < patience(minister) && campaign.player.cabinet[ROLE] !== undefined; i++) {
      for (const packet of cabinetConsequencesPhase(campaign)) campaign = apply(campaign, packet);
      campaign = { ...campaign, turn: campaign.turn + 1 };
    }

    expect(campaign.player.cabinet[ROLE]).toBeUndefined();
    const former = selectFormerService(campaign, holderId);
    expect(former).toEqual({ person: holderId, role: ROLE, departure: "resigned" });
    // The flag the corpus gates on names the seat, not the generated person id.
    expect(hasFlag(campaign, departureFlag("resigned", ROLE) as never)).toBe(true);
  });

  it("leaves nobody a former officer until somebody actually leaves", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 0.9, ambition: 0.1 });
    const holderId = campaign.player.cabinet[ROLE]!;
    expect(selectFormerService(campaign, holderId)).toBeUndefined();
  });

  it("every packet it produces carries feed narration a player can read", () => {
    const minister = { loyalty: 0.05, ambition: 0.9 };
    const campaign = seatMinister(buildCampaign(), minister);
    let produced = 0;
    for (let turn = 1; turn <= patience(minister); turn++) {
      const withTurn = { ...campaign, turn };
      for (const packet of cabinetConsequencesPhase(withTurn)) {
        expect(packet.narration.summary.trim().length).toBeGreaterThan(0);
        const feedEffect = packet.effects.find((e) => e.kind === "feed");
        expect(feedEffect && feedEffect.kind === "feed" ? feedEffect.items[0]!.headline.trim().length : 1).toBeGreaterThan(0);
        produced += 1;
      }
    }
    expect(produced).toBeGreaterThan(0);
  });

  it("wires into advanceTurn like every other simulate phase", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 0.02, ambition: 0.9 });
    const after = advanceTurn(campaign, { simulate: cabinetConsequencesPhase, select: noopPhase });
    expect(after.turn).toBe(campaign.turn + 1);
  });

  it("produces the same outcome twice from the same seed and turn", () => {
    const seed = makeCampaignSeed("cabinet-determinism-seed");
    const campaign = { ...seatMinister(buildCampaign(), { loyalty: 0.1, ambition: 0.8 }), seed };
    const [first, second] = replay(seed, () => cabinetConsequencesPhase(campaign));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

// `Person.integrity` was authored, rolled, printed on the dossier, and read by
// no rule at all until it landed here. The audit's "inert authored field"
// class is only closed if the number changes an outcome.
describe("integrity holds a disloyal minister in check", () => {
  const disloyal = (integrity: number) => ({ ...person, loyalty: 0.1, integrity });

  it("prices the same disaffection lower in someone who will not act on it", () => {
    expect(cabinetRiskRate(disloyal(0.9))).toBeLessThan(cabinetRiskRate(disloyal(0.1)));
  });

  it("never makes anyone proof against their own disaffection", () => {
    expect(cabinetRiskRate(disloyal(1))).toBeGreaterThan(0);
  });

  it("leaves a loyal minister at no risk whatever their integrity", () => {
    const loyal = (integrity: number) => ({ ...person, loyalty: 1, integrity });
    expect(cabinetRiskRate(loyal(0))).toBe(0);
  });
});

// The record read as a loop before this: three ministers leaking in the same
// week printed one sentence three times with the same number beside it. The
// beat is allowed to repeat — a government can come apart in the same way
// twice — but the telling is not.
describe("consequence voice", () => {
  // Tuned to the leak outcome specifically: above the resignation bar so the
  // chair is never vacated, and short of the ambition a challenge needs so it
  // never converts to a faction. A resigning minister produces exactly one
  // packet ever, which is no sample at all. Watched for a dozen leaks' worth of
  // weeks, so the sample does not depend on how often a chair breaks. A loyal
  // chair can still announce an ordinary departure, and a Secretary serving one
  // out is not drawn against, so the announcement is taken back and the watch
  // goes on.
  const LEAKS_OFTEN = { loyalty: 0.6, ambition: 0.1, integrity: 0.05, traits: ["corrupt"] as Person["traits"] };
  const WATCHED = Math.ceil(12 / cabinetRiskRate({ ...person, ...LEAKS_OFTEN }));

  function narrationsOver(turns: number): string[] {
    let state = seatMinister(buildCampaign(), LEAKS_OFTEN);
    const said: string[] = [];
    for (let i = 0; i < turns; i += 1) {
      for (const packet of cabinetConsequencesPhase(state)) {
        if (packet.narration?.summary) said.push(packet.narration.summary);
        state = apply(state, packet);
      }
      const going = departingFlag(ROLE, state.player.cabinet[ROLE]!);
      if (state.player.flags[going]) state = { ...state, player: { ...state.player, flags: { ...state.player.flags, [going]: false } } };
      state = advanceTurn(state, { simulate: noopPhase, select: noopPhase });
    }
    return said;
  }

  it("does not tell the same consequence with one sentence every time", () => {
    const said = narrationsOver(WATCHED);
    expect(said.length).toBeGreaterThan(3);
    expect(new Set(said).size).toBeGreaterThan(1);
  });

  it("still names the minister in every telling", () => {
    for (const line of narrationsOver(WATCHED)) {
      expect(line).toContain(person.name);
    }
  });

  // The wording is drawn from its own stream precisely so it cannot move the
  // roll that decides whether a minister breaks at all — otherwise every
  // existing campaign would resolve differently for the sake of a synonym.
  it("is deterministic: the same campaign tells the same story twice", () => {
    expect(narrationsOver(WATCHED)).toEqual(narrationsOver(WATCHED));
  });
});

describe("selectCabinetExposure", () => {
  // The reading and the phase share one gate on purpose. A dossier that prints
  // a weekly risk the engine never rolls for is stating a fact the simulation
  // does not hold, which is the defect this pairing exists to prevent.
  it("reports the rate the phase actually draws against", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 0.2, integrity: 0.3 });
    const exposure = selectCabinetExposure(campaign, ROLE)!;
    expect(exposure.rate).toBe(cabinetRiskRate(campaign.people[exposure.person]!.base));
    expect(exposure.outcome).toBe(cabinetOutcomeFor(campaign.people[exposure.person]!.base));
  });

  it("has no reading for the player's own chair, which the phase never rolls for", () => {
    const campaign = buildCampaign();
    expect(selectCabinetExposure(campaign, campaign.founding.leadRole)).toBeUndefined();
  });

  it("has no reading for an empty chair or a minister out of public life", () => {
    const base = buildCampaign();
    expect(selectCabinetExposure(base, "role-interior-minister" as RoleId)).toBeUndefined();

    const seated = seatMinister(base, { loyalty: 0.2 });
    const person = seated.player.cabinet[ROLE]!;
    const gone: Campaign = {
      ...seated,
      people: { ...seated.people, [person]: { ...seated.people[person]!, alive: false } },
    };
    expect(selectCabinetExposure(gone, ROLE)).toBeUndefined();
  });

  it("finds the same exposure by person", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 0.2 });
    const person = campaign.player.cabinet[ROLE]!;
    expect(selectCabinetExposureFor(campaign, person)).toEqual(selectCabinetExposure(campaign, ROLE));
  });

  // A roster and a dossier that each compounded the weekly rate their own way
  // could print two chances for one chair; the engine states the one both read.
  it("states the chance of a break over the rest of the term, one draw a week", () => {
    const campaign = seatMinister(buildCampaign(), { loyalty: 0.3, integrity: 0.2 });
    const exposure = selectCabinetExposure(campaign, ROLE)!;
    const weeks = Math.ceil(selectCampaignClock(campaign).daysLeftInTerm / 7);
    expect(exposure.weeksLeft).toBe(weeks);
    expect(exposure.restOfTerm).toBeCloseTo(1 - (1 - exposure.rate) ** weeks, 12);
    expect(exposure.restOfTerm).toBeGreaterThan(exposure.rate);

    const lateInTerm: Campaign = { ...campaign, calendar: addDays(selectCampaignClock(campaign).termEndDate, -14) };
    const late = selectCabinetExposure(lateInTerm, ROLE)!;
    expect(late.weeksLeft).toBe(2);
    expect(late.restOfTerm).toBeCloseTo(1 - (1 - late.rate) ** 2, 12);
  });

  it("reads no chance of a break over no weeks, and certainty only at a certain rate", () => {
    expect(breakChanceOver(0.1, 0)).toBe(0);
    expect(breakChanceOver(0, 208)).toBe(0);
    expect(breakChanceOver(1, 1)).toBe(1);
    expect(breakChanceOver(0.5, 2)).toBeCloseTo(0.75, 12);
  });
});

// One prudent two-term run counted thirteen repeat challenges from chairs that
// already led a bloc, each billed to the country's order as a new revolt.
describe("a chair that already leads a bloc", () => {
  const RIVAL = { loyalty: 0.1, ambition: 0.9, integrity: 0 };

  it("resigns on its next break instead of challenging again", () => {
    const campaign = seatMinister(buildCampaign(), RIVAL);
    const id = campaign.player.cabinet[ROLE]!;
    const holder = campaign.people[id]!;
    expect(cabinetOutcomeOf(holder)).toBe("challenge");
    const leading = { ...holder, affiliation: rivalFaction(ROLE) };
    expect(cabinetOutcomeOf(leading)).toBe("resignation");
    expect(selectCabinetExposure({ ...campaign, people: { ...campaign.people, [id]: leading } }, ROLE)!.outcome).toBe("resignation");
  });

  it("leaves the chair empty and the bloc standing when its leader walks out", () => {
    let campaign = seatMinister(buildCampaign(), RIVAL);
    const id = campaign.player.cabinet[ROLE]!;
    const phases = { simulate: cabinetConsequencesPhase, select: noopPhase };
    for (let week = 0; week < patience(RIVAL) && campaign.player.cabinet[ROLE] !== undefined; week += 1) {
      campaign = advanceTurn(campaign, phases);
    }
    expect(campaign.player.cabinet[ROLE]).toBeUndefined();
    expect(campaign.people[id]!.affiliation).toBe(rivalFaction(ROLE));
    expect(selectFormerService(campaign, id)?.departure).toBe("resigned");
  });

  it("forms its faction once however often it breaks", () => {
    let campaign = seatMinister(buildCampaign(), RIVAL);
    const id = campaign.player.cabinet[ROLE]!;
    const phases = { simulate: cabinetConsequencesPhase, select: noopPhase };
    let challenges = 0;
    let breaks = 0;
    for (let week = 0; week < patience(RIVAL) && breaks < 3; week += 1) {
      const packets = cabinetConsequencesPhase(campaign);
      breaks += packets.length;
      challenges += packets.filter((packet) => packet.effects.some((e) => e.kind === "person" && "affiliation" in (e.changes ?? {}))).length;
      campaign = advanceTurn(campaign, phases);
    }
    expect(breaks).toBeGreaterThanOrEqual(2);
    expect(challenges).toBe(1);
    expect(campaign.people[id]!.affiliation).toBe(rivalFaction(ROLE));
  });
});

// The finding this closes: a challenge produced the game's most dramatic
// person-outcome — "X has stopped waiting to be given the job and started
// assembling the votes for it" — and what followed was a branded string on one
// person. Two things read it: a −0.4 on a pairwise tie score and a badge on the
// dossier. The removal arc could not see it, Congress could not see it, and the
// corpus could not gate on it. The rival never mounted the challenge.
describe("a faction is a bloc with members, a clock and a price", () => {
  function challenged(): { campaign: Campaign; person: PersonId } {
    const minister = { loyalty: 0.02, ambition: 0.95 };
    let campaign = seatMinister(buildCampaign(), minister);
    const person = campaign.player.cabinet[ROLE]!;
    for (let i = 0; i < patience(minister) && campaign.people[person]!.affiliation === undefined; i++) {
      for (const packet of cabinetConsequencesPhase(campaign)) campaign = apply(campaign, packet);
      campaign = { ...campaign, turn: campaign.turn + 1 };
    }
    return { campaign, person };
  }

  it("composes a record with a name, its members and the turn it formed", () => {
    const { campaign, person } = challenged();
    const factions = selectFactions(campaign);
    expect(factions).toHaveLength(1);
    const faction = factions[0]!;
    expect(faction.members).toContain(person);
    expect(faction.seated).toBe(1);
    expect(faction.role).toBe(ROLE);
    expect(faction.name).toContain("bloc");
    expect(faction.name).not.toContain("role-");
    expect(faction.formedTurn).toBeLessThanOrEqual(campaign.turn);
  });

  it("costs the President removal pressure that compounds the longer it stands", () => {
    const { campaign } = challenged();
    const week = factionPressure(campaign);
    expect(week).toBeGreaterThan(0);
    const season = factionPressure({ ...campaign, turn: campaign.turn + 26 });
    expect(season).toBeGreaterThan(week);
  });

  it("charges nothing at all to a president whose government is their own", () => {
    expect(factionPressure(seatMinister(buildCampaign(), { loyalty: 0.9, ambition: 0.2 }))).toBe(0);
  });

  it("leaves a flag a scenario can gate on, dated so an aged gate can read it", () => {
    const { campaign } = challenged();
    const faction = selectFactions(campaign)[0]!;
    expect(hasFlag(campaign, factionFlag(faction.id) as never)).toBe(true);
    expect(
      Object.keys(campaign.player.flags).some((flag) => flag.startsWith(`flagset:${factionFlag(faction.id) as string}:`)),
    ).toBe(true);
  });

  it("keeps the bloc when the President answers it by dismissing its leader", () => {
    const { campaign, person } = challenged();
    const dismissal = dismissMinister(campaign, ROLE);
    expect(dismissal.ok).toBe(true);
    if (!dismissal.ok) return;
    const after = apply(campaign, dismissal.packet);
    const faction = selectFactions(after)[0]!;
    expect(after.player.cabinet[ROLE]).toBeUndefined();
    expect(faction.members).toContain(person);
    expect(factionPressure(after)).toBeGreaterThan(0);
  });
});
