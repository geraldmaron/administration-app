import { describe, expect, it } from "vitest";
import {
  CHARTER_USA_CONSTITUTION,
  CRADLE_POTOMAC,
  US_ID,
  defaultFlagDesign,
  worldDataset,
  WHITE_HOUSE_STAFF_ROLE_IDS,
  type PlankId,
} from "@admin/world";
import { staffCandidates } from "./white-house.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import {
  draftCabinetCandidates,
  generateFoundingPool,
  resolveFoundingFields,
  sealFounding,
  validateFounding,
  type FoundingChoices,
} from "./founding.js";

const SEED = makeCampaignSeed("legacy-fields-seed");

function cabinet(): FoundingChoices["cabinet"] {
  const pool = generateFoundingPool(SEED, worldDataset);
  const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
  return Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0]!.id]));
}

const leader = { ...defaultLeaderDraft(), name: "Test Leader" };

const legacy: FoundingChoices = {
  nationId: US_ID,
  nationName: "United States",
  name: "Test Leader",
  title: "President",
  charterId: CHARTER_USA_CONSTITUTION.id,
  cradleId: CRADLE_POTOMAC,
  compactIds: [],
  flag: defaultFlagDesign,
  cabinet: cabinet(),
  leader,
};

describe("a founding that leaves the legacy fields out", () => {
  it("resolves each one to the answer the United States founding always gave", () => {
    expect(resolveFoundingFields(worldDataset, { cabinet: legacy.cabinet, leader })).toEqual({
      nationId: US_ID,
      charterId: CHARTER_USA_CONSTITUTION.id,
      cradleId: CRADLE_POTOMAC,
      compactIds: [],
      flag: defaultFlagDesign,
      title: "President",
    });
  });

  it("honors a legacy field that is given", () => {
    expect(resolveFoundingFields(worldDataset, { ...legacy, title: "Chief Executive" }).title).toBe("Chief Executive");
  });

  it("validates and seals the same campaign as one that names them", () => {
    const bare: FoundingChoices = { cabinet: legacy.cabinet, leader };
    const pool = generateFoundingPool(SEED, worldDataset);
    expect(validateFounding(worldDataset, bare, pool).ok).toBe(true);
    expect(sealFounding(SEED, worldDataset, bare)).toEqual(sealFounding(SEED, worldDataset, legacy));
  });
});

describe("the new founding choices", () => {
  it("are recorded on the founding and survive a save", () => {
    const platform = ["plank-secure-border"] as unknown as readonly PlankId[];
    const pool = generateFoundingPool(SEED, worldDataset);
    const president = { party: leader.party, ideology: leader.ideology };
    const chief = staffCandidates(pool, US_ID, president, "role-chief-of-staff")[0]!.person.id;
    const sealed = sealFounding(SEED, worldDataset, {
      ...legacy,
      platform,
      staff: { "role-chief-of-staff": chief },
      mandate: "narrow",
    });
    expect(sealed.founding.platform).toEqual(platform);
    expect(sealed.founding.staff?.["role-chief-of-staff"]).toBe(chief);
    expect(sealed.founding.mandate).toBe("narrow");
    expect(loadSave(JSON.parse(JSON.stringify(createSave(sealed))))).toEqual(sealed);
  });

  it("default to an empty platform and no pledges, and fill the ticket and the staff with the best fit", () => {
    const sealed = sealFounding(SEED, worldDataset, legacy);
    expect(sealed.founding.platform).toEqual([]);
    expect(sealed.founding.mandate).toBeUndefined();
    expect(sealed.pledges).toEqual([]);
    // A quick oath seats a whole West Wing: the running mate and all three
    // staff posts are the first names their shortlists offered.
    expect(sealed.vicePresident).toBeDefined();
    expect(Object.keys(sealed.founding.staff ?? {}).sort()).toEqual([...WHITE_HOUSE_STAFF_ROLE_IDS].sort());
  });
});
