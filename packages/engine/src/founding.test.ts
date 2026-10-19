import { describe, expect, it } from "vitest";
import {
  US_ID,
  CHARTER_USA_CONSTITUTION,
  CRADLE_POTOMAC,
  ORG_NATO,
  ORG_BRICS,
  ORG_GCC,
  ORG_CPTPP,
  defaultFlagDesign,
  worldDataset,
  type FlagDesign,
  type RoleId,
  type WorldDataset,
} from "@admin/world";
import { defaultLeaderDraft } from "./leader.js";
import { scoreLeadershipAnswers } from "./leadership-profile.js";
import { createSave, loadSave } from "./save.js";
import { oppositionParties, resolveAdministrationParty } from "./party.js";
import { makeCampaignSeed } from "./rng.js";
import { rankByFit } from "./cast-fit.js";
import {
  draftCabinetCandidates,
  generateFoundingPool,
  sealFounding,
  validateFounding,
  type FoundingChoices,
} from "./founding.js";

const SEED = makeCampaignSeed("founding-test-seed");

function fullCabinet(): FoundingChoices["cabinet"] {
  const pool = generateFoundingPool(SEED, worldDataset);
  const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
  return Object.fromEntries(
    Object.entries(candidates).map(([role, list]) => [role, list[0]!.id]),
  ) as FoundingChoices["cabinet"];
}

// The founding as it is now asked: who the President is and who they seat.
// The country, its constitution, its cradle and its banner are the United
// States' own answers, so the choices name none of them.
function baseChoices(overrides: Partial<FoundingChoices> = {}): FoundingChoices {
  return {
    cabinet: fullCabinet(),
    leader: { ...defaultLeaderDraft(), name: "Test Leader" },
    ...overrides,
  };
}

describe("the founding no longer judges the fictional nation's choices", () => {
  // The compacts, the cradle and the flag were choices when a player founded a
  // nation of their own. The United States answers each of them, so a refusal
  // about one of them was a refusal nobody could act on.
  it("does not refuse a compact pairing, an unknown cradle or an unusual banner", () => {
    const pool = generateFoundingPool(SEED, worldDataset);
    const banner: FlagDesign = { ...defaultFlagDesign };
    for (const legacy of [
      { compactIds: [ORG_NATO, ORG_BRICS] },
      { compactIds: [ORG_GCC] },
      { cradleId: "CRADLE-NOWHERE" as never },
      { flag: banner },
    ]) {
      const result = validateFounding(worldDataset, baseChoices(legacy), pool);
      expect(result.rejections, JSON.stringify(legacy)).toEqual([]);
    }
  });
});

describe("draftCabinetCandidates", () => {
  it("ranks each shortlist by fit to the President when there is one", () => {
    const pool = generateFoundingPool(SEED, worldDataset);
    const president = { party: "republican" as const, ideology: { economicLeftRight: 0.4, authLibertarian: 0.2, nationalistGlobalist: 0.3 } };
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, president);
    for (const role of CHARTER_USA_CONSTITUTION.cabinetRoles.slice(1)) {
      const shortlist = candidates[role]!;
      const ranked = rankByFit(shortlist, president).map((candidate) => candidate.person.id);
      expect(shortlist.map((person) => person.id), role).toEqual(ranked);
      // The President's own side leads every chair.
      expect(shortlist[0]!.party, role).toBe("party-usa-republican");
    }
  });

  it("offers a shortlist per cabinet seat, best competence first, when there is no President to fit", () => {
    const pool = generateFoundingPool(SEED, worldDataset);
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);

    // The lead chair is never on a shortlist — it is the player themselves.
    expect(candidates[CHARTER_USA_CONSTITUTION.cabinetRoles[0]!]).toBeUndefined();

    for (const role of CHARTER_USA_CONSTITUTION.cabinetRoles.slice(1)) {
      const shortlist = candidates[role]!;
      expect(shortlist.length).toBeGreaterThan(0);
      for (const person of shortlist) {
        expect(person.nationality).toBe(US_ID);
        expect(person.eligibleRoles).toContain(role);
      }
      for (let i = 1; i < shortlist.length; i++) {
        expect(shortlist[i - 1]!.competence).toBeGreaterThanOrEqual(shortlist[i]!.competence);
      }
    }
  });
});

describe("validateFounding", () => {
  it("passes a fully-formed founding", () => {
    const pool = generateFoundingPool(SEED, worldDataset);
    const result = validateFounding(worldDataset, baseChoices(), pool);
    expect(result.ok).toBe(true);
  });

  it("rejects a cabinet seat left unfilled, in-fiction", () => {
    const pool = generateFoundingPool(SEED, worldDataset);
    const cabinet = fullCabinet();
    const incomplete = { ...cabinet } as Record<string, string>;
    delete incomplete["role-treasury-minister"];
    const result = validateFounding(worldDataset, baseChoices({ cabinet: incomplete as FoundingChoices["cabinet"] }), pool);

    expect(result.ok).toBe(false);
    expect(result.rejections.some((r) => r.subject === "role-treasury-minister")).toBe(true);
  });

  it("makes chosen compacts real memberships on top of the standing ones", () => {
    const joined = sealFounding(SEED, worldDataset, baseChoices({ compactIds: [ORG_CPTPP] }));
    const alone = sealFounding(SEED, worldDataset, baseChoices());

    const player = joined.nations[US_ID]!.base;
    expect(player.memberships).toContain(ORG_CPTPP);
    expect(alone.nations[US_ID]!.base.memberships).not.toContain(ORG_CPTPP);

    // The standing real-world memberships survive a founding either way.
    expect(player.memberships).toContain(ORG_NATO);
    expect(alone.nations[US_ID]!.base.memberships).toContain(ORG_NATO);
  });
});

describe("sealFounding", () => {
  it("replays and saves the chosen leadership profile without rerolling the appointed cabinet", () => {
    const leadershipAnswers = { version: 1 as const, values: Array<number>(20).fill(-1) };
    const profile = scoreLeadershipAnswers(leadershipAnswers);
    const choices = baseChoices();
    const customized = { ...choices, leader: { ...choices.leader, ideology: profile.ideology, governingStyle: profile.style, leadershipAnswers } };
    const first = sealFounding(SEED, worldDataset, customized);
    expect(sealFounding(SEED, worldDataset, customized)).toEqual(first);
    expect(loadSave(JSON.parse(JSON.stringify(createSave(first))))).toEqual(first);
    expect(first.founding.leader.leadershipAnswers).toEqual(leadershipAnswers);
    for (const [role, person] of Object.entries(choices.cabinet)) expect(first.founding.cabinet[role as RoleId]).toBe(person);
    const president = first.people[first.player.cabinet[first.founding.leadRole]!]!.base;
    expect(president.traits).toContain("dovish");
    expect(president.ideology).toEqual(profile.ideology);
  });
  it("produces a valid, playable campaign", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());

    // The recorded name is the leader the player authored, not the draft's
    // stale top-level `name` field.
    expect(campaign.founding.name).toBe("Test Leader");
    expect(campaign.founding.title).toBe("President");
    expect(campaign.turn).toBe(1);
    expect(campaign.removal.mechanism).toBe("impeachment");
    expect(campaign.player.flags["founding-complete"]).toBe(true);
    expect(Object.keys(campaign.people).length).toBeGreaterThan(0);
    for (const [role, personId] of Object.entries(campaign.player.cabinet)) {
      const runtime = campaign.people[personId];
      expect(runtime).toBeDefined();
      expect(runtime!.currentRole).toBe(role);
      expect(runtime!.alive).toBe(true);
    }
  });

  it("opens the ledger with a sentence a reader can say aloud", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const opening = campaign.ledger[0]!.description;

    // The country keeps its article inside the sentence.
    expect(opening).toContain("takes office as President of the United States");
    expect(opening).not.toMatch(/ The /);
    // And names who stands beside them.
    const vp = campaign.people[campaign.vicePresident!]!.base.name;
    expect(opening).toContain(`with ${vp} as Vice President`);
  });

  it("seats one governor per state, not DC, with the state stamped on the person", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const governors = Object.values(campaign.people).filter((person) => person.currentRole === "role-governor");
    expect(governors).toHaveLength(50);
    const seated = new Set(governors.map((person) => person.state));
    expect(seated.has("DC" as never)).toBe(false);
    expect(seated.size).toBe(50);
    expect(campaign.states.OH).toBeDefined();
    expect(Object.keys(campaign.sectors[US_ID] ?? {}).length).toBeGreaterThan(0);
    expect(campaign.player.cabinet["role-attorney-general" as RoleId]).toBeDefined();
  });

  it("seals a centrist founding as Democrat, not as Your party", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    expect(campaign.founding.leader.ideology.economicLeftRight).toBe(0);
    expect(campaign.congress.caucusAnchor).toBe("democrat");
    const leadId = campaign.player.cabinet[campaign.founding.leadRole]!;
    expect(campaign.people[leadId]?.base.party).toBe("party-usa-democrat");
  });

  it("seals the party the player chose, whatever their economics say", () => {
    // A conservative Democrat is a person who has held this office. The party
    // is a choice; the ideology sliders only suggested one.
    const campaign = sealFounding(
      SEED,
      worldDataset,
      baseChoices({
        leader: {
          ...defaultLeaderDraft(),
          name: "Conservative Democrat",
          party: "democrat",
          ideology: { economicLeftRight: 0.6, authLibertarian: 0, nationalistGlobalist: 0 },
        },
      }),
    );
    expect(campaign.congress.administrationParty).toBe("democrat");
    expect(campaign.congress.caucusAnchor).toBe("democrat");
    expect(campaign.founding.leader.party).toBe("democrat");
    expect(campaign.people[campaign.player.cabinet[campaign.founding.leadRole]!]!.base.party).toBe(
      "party-usa-democrat",
    );
  });

  it("seals an Independent, and anchors them on the caucus their economics is nearest", () => {
    const leftish = sealFounding(
      SEED,
      worldDataset,
      baseChoices({
        leader: {
          ...defaultLeaderDraft(),
          name: "Independent Leader",
          party: "independent",
          ideology: { economicLeftRight: -0.5, authLibertarian: 0, nationalistGlobalist: 0 },
        },
      }),
    );
    const rightish = sealFounding(
      SEED,
      worldDataset,
      baseChoices({
        leader: {
          ...defaultLeaderDraft(),
          name: "Independent Leader",
          party: "independent",
          ideology: { economicLeftRight: 0.5, authLibertarian: 0, nationalistGlobalist: 0 },
        },
      }),
    );
    expect(leftish.congress.administrationParty).toBe("independent");
    expect(leftish.congress.caucusAnchor).toBe("democrat");
    expect(rightish.congress.caucusAnchor).toBe("republican");
    // Neither caucus is theirs: both majors are across the aisle.
    expect(oppositionParties(leftish.congress.administrationParty)).toEqual(["democrat", "republican"]);
  });

  it("preselects the suggested party from the sliders without deriving the seal", () => {
    const left = sealFounding(
      SEED,
      worldDataset,
      baseChoices({
        leader: {
          ...defaultLeaderDraft(),
          name: "Left Leader",
          party: "democrat",
          ideology: { economicLeftRight: -0.5, authLibertarian: 0, nationalistGlobalist: 0 },
        },
      }),
    );
    const right = sealFounding(
      SEED,
      worldDataset,
      baseChoices({
        leader: {
          ...defaultLeaderDraft(),
          name: "Right Leader",
          party: "republican",
          ideology: { economicLeftRight: 0.5, authLibertarian: 0, nationalistGlobalist: 0 },
        },
      }),
    );
    expect(left.congress.administrationParty).toBe(
      resolveAdministrationParty(left.founding.leader.ideology),
    );
    expect(right.congress.administrationParty).toBe(
      resolveAdministrationParty(right.founding.leader.ideology),
    );
  });

  it("seats the player's authored leader in the lead chair, as a member of their own cast", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const leadRole = CHARTER_USA_CONSTITUTION.cabinetRoles[0]!;
    const leaderId = campaign.player.cabinet[leadRole]!;
    const leader = campaign.people[leaderId]!;

    expect(leadRole).toBe("role-president");
    expect(leader).toBeDefined();
    expect(leader.base.name).toBe("Test Leader");
    expect(leader.currentRole).toBe(leadRole);
    // Composed, not drawn: the seeded pool never contained this person.
    expect(generateFoundingPool(SEED, worldDataset).some((p) => p.id === leaderId)).toBe(false);
    // And the life that produced the readings survives the seal.
    expect(campaign.founding.leader.backgroundId).toBe(baseChoices().leader.backgroundId);
  });

  it("refuses to seal a founding whose leader was never named", () => {
    expect(() =>
      sealFounding(SEED, worldDataset, baseChoices({ leader: { ...defaultLeaderDraft(), name: "" } })),
    ).toThrow();
  });

  it("keeps the canonical nation name even when a stale draft carries a custom value", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices({ nationId: US_ID, nationName: "New Columbia" }));

    expect(campaign.founding.nationName).toBe("United States");
  });

  it("throws rather than sealing an invalid founding (a chair left empty)", () => {
    const cabinet = { ...fullCabinet() } as Record<string, string>;
    delete cabinet["role-treasury-minister"];
    expect(() =>
      sealFounding(SEED, worldDataset, baseChoices({ cabinet: cabinet as FoundingChoices["cabinet"] })),
    ).toThrow();
  });

  it("leaves the nation's real geography untouched — the homeland cradle is an identity", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const record = worldDataset.nations.find((n) => n.id === US_ID)!;
    const sealed = campaign.nations[US_ID]!.base.geo;

    expect(sealed.lat).toBe(record.geo.lat);
    expect(sealed.lon).toBe(record.geo.lon);
    expect(sealed.region).toBe(record.geo.region);
    expect(sealed.neighbors).toEqual(record.geo.neighbors);
    expect(campaign.founding.cradle).toBe(CRADLE_POTOMAC);
    expect(campaign.founding.charter).toBe(CHARTER_USA_CONSTITUTION.id);
  });

  it("same seed reproduces a byte-identical campaign on replay", () => {
    const choices = baseChoices({ compactIds: [ORG_CPTPP] });
    const first = sealFounding(SEED, worldDataset, choices);
    const second = sealFounding(SEED, worldDataset, choices);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("a different seed produces a different starting cast", () => {
    const otherSeed = makeCampaignSeed("a-different-seed");
    const choices = baseChoices();
    const otherCabinet = (() => {
      const pool = generateFoundingPool(otherSeed, worldDataset);
      const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
      return Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0]!.id])) as FoundingChoices["cabinet"];
    })();

    const a = sealFounding(SEED, worldDataset, choices);
    const b = sealFounding(otherSeed, worldDataset, { ...choices, cabinet: otherCabinet });

    expect(JSON.stringify(a.people)).not.toBe(JSON.stringify(b.people));
  });

  it("seeds the city table including Pittsburgh", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const pittsburgh = campaign.cities["CITY-USA-pittsburgh" as never];
    expect(pittsburgh).toBeDefined();
    expect(pittsburgh!.base.name).toBe("Pittsburgh");
    expect(pittsburgh!.employment).toBe(pittsburgh!.base.employment);
    expect(pittsburgh!.taxHolidayTurns).toBe(0);
    expect(pittsburgh!.adminLean).toBeDefined();
    expect(Object.keys(campaign.cities).length).toBe(worldDataset.cities.length);
  });

  // vitalsPhase (vitals.ts) derives the player nation's live
  // population as the sum of its live states every turn from here on — the
  // invariant this asserts is what makes that derivation start honest rather
  // than snapping the nation's figure to a states total it never agreed with.
  it("opens the player nation's population exactly equal to the sum of its own states", () => {
    const campaign = sealFounding(SEED, worldDataset, baseChoices());
    const statesSum = Object.values(campaign.states).reduce((sum, state) => sum + state.population, 0);
    expect(campaign.nations[campaign.founding.nation]!.stats.demography.population).toBe(statesSum);
  });
});

// A structural sanity check on the fixture dataset itself: the assertions
// above lean on the United States actually having a full cabinet pool under
// its charter, and on the world dataset being the real, validated dataset.
describe("worldDataset fixture sanity", () => {
  it("is the real dataset shape", () => {
    const dataset: WorldDataset = worldDataset;
    expect(dataset.nations.some((n) => n.id === US_ID)).toBe(true);
  });
});
