import { describe, it, expect } from "vitest";
import {
  AGE_BAND_BOUNDS,
  PortraitAgeBand,
  PortraitGenderPresentation,
  PortraitHeritage,
  ageBandFor,
  parsePortraitRef,
  portraitRef,
} from "../schemas/portrait.js";
import {
  AGE_BAND_EYEWEAR,
  AGE_BAND_GRAYING,
  FACIAL_HAIR_WEIGHTS,
  GENDER_WEIGHTS,
  HAIR_STYLE_WEIGHTS,
  HERITAGE_HAIR_COLORS,
  HERITAGE_SKIN_TONES,
  NATION_HEAD_COVERING,
  NATION_HERITAGE_MIX,
  ROLE_ATTIRE,
  attireOptionsFor,
  genderWeightsFor,
  hairStyleWeightsFor,
  headCoveringRateFor,
  heritageMixFor,
} from "./portraits.js";
import { ALL_ROLES } from "./people.js";
import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
import { worldDataset } from "./index.js";

describe("portrait facets", () => {
  it("round-trips a ref through build and parse without losing a facet", () => {
    const facets = {
      heritage: "south-asia",
      gender: "androgynous",
      ageBand: "senior",
      skinTone: "tone-4",
      attire: "ceremonial",
      hairStyle: "tied-back",
      hairColor: "graying",
      facialHair: "stubble",
      eyewear: "glasses",
      variant: 3,
    } as const;
    expect(parsePortraitRef(portraitRef(facets))).toEqual(facets);
  });

  it("rejects a malformed ref rather than guessing", () => {
    expect(() => parsePortraitRef("portrait-usa-whitfield")).toThrow();
    expect(() => parsePortraitRef("npc/south-asia/androgynous/senior")).toThrow();
    expect(() =>
      parsePortraitRef("npc/atlantis/androgynous/senior/tone-4/ceremonial/short/graying/none/none/v1"),
    ).toThrow();
    // The pre-split nine-part form. It is not a shorter dialect of the current
    // ref, it is a ref from a build whose saves this one refuses, and reading
    // it would put a face on a person assembled by rules nothing here holds.
    expect(() =>
      parsePortraitRef("npc/south-asia/feminine/senior/tone-4/ceremonial/graying/slight/v3"),
    ).toThrow();
  });

  it("covers every age from 18 to 100 with exactly one band", () => {
    for (let age = 18; age <= 100; age++) {
      const band = ageBandFor(age);
      const bounds = AGE_BAND_BOUNDS[band];
      expect(age, `age ${age} in ${band}`).toBeGreaterThanOrEqual(bounds.min);
      expect(age, `age ${age} in ${band}`).toBeLessThanOrEqual(bounds.max);
    }
    expect(Object.keys(AGE_BAND_BOUNDS).sort()).toEqual([...PortraitAgeBand.options].sort());
  });
});

describe("portrait coverage", () => {
  it("gives every nation in the dataset a heritage mix that sums to one", () => {
    for (const nation of worldDataset.nations) {
      const mix = heritageMixFor(nation.id as string);
      const total = mix.reduce((sum, m) => sum + m.weight, 0);
      expect(total, `${nation.identity.name} heritage weights`).toBeCloseTo(1, 5);
      expect(mix.length).toBeGreaterThan(0);
    }
  });

  it("uses every authored heritage somewhere, so no group is defined but never cast", () => {
    const used = new Set(Object.values(NATION_HERITAGE_MIX).flatMap((mix) => mix.map((m) => m.heritage)));
    for (const heritage of PortraitHeritage.options) {
      expect(used.has(heritage), `${heritage} is cast somewhere`).toBe(true);
    }
  });

  it("never collapses a heritage to a single skin tone", () => {
    for (const heritage of PortraitHeritage.options) {
      expect(HERITAGE_SKIN_TONES[heritage].length, `${heritage} tone range`).toBeGreaterThanOrEqual(3);
    }
  });

  // The global table is the fallback for a nation the leader table has no row
  // for, and no shipped nation is one: the American bench reads its own record
  // (women-in-cabinet.test.ts), every other government its row
  // (portrait-priors.test.ts), and the engine's leader-fidelity test holds the
  // drawn cast to both within tolerance.
  it("reaches the global fallback for no shipped nation", () => {
    const fallback = PortraitGenderPresentation.options.map((value) => ({ value, weight: GENDER_WEIGHTS[value] }));
    for (const nation of worldDataset.nations) {
      for (const role of ["role-foreign-minister", "role-journalist"]) {
        expect(genderWeightsFor(nation.id as string, role, undefined), `${nation.id} ${role}`).not.toEqual(fallback);
      }
    }
  });

  it("weights the world's foreign cabinet chairs at the mean share the table records, within a point", () => {
    const shares = Object.values(NATION_LEADER_CONSTRAINTS).map((row) => {
      const minister = genderWeightsFor(row.nation as string, "role-foreign-minister", undefined);
      return minister.find((entry) => entry.value === "feminine")!.weight;
    });
    const drawn = shares.reduce((sum, share) => sum + share, 0) / shares.length;
    const recorded =
      Object.values(NATION_LEADER_CONSTRAINTS).reduce((sum, row) => sum + row.womenCabinetShare, 0) / shares.length;
    // The flagged rows' regional floor lifts the drawn mean a little above the
    // recorded one, and never by more than a point.
    expect(drawn).toBeGreaterThanOrEqual(recorded);
    expect(drawn - recorded).toBeLessThan(0.01);
  });

  it("draws an American seat off the record instead of the fallback", () => {
    const republicanGovernor = genderWeightsFor("USA", "role-governor", "republican");
    const feminine = republicanGovernor.find((entry) => entry.value === "feminine")!.weight;
    expect(feminine).toBeLessThan(GENDER_WEIGHTS.feminine);
    expect(feminine).toBe(0.154);
  });

  it("gives every role at least two attire options, weighted to sum to one", () => {
    for (const role of ALL_ROLES) {
      const options = attireOptionsFor(role as string);
      expect(options.length, `${role} attire`).toBeGreaterThanOrEqual(2);
      const total = options.reduce((sum, o) => sum + o.weight, 0);
      expect(total, `${role} attire weights`).toBeCloseTo(1, 5);
    }
    expect(Object.keys(ROLE_ATTIRE).sort()).toEqual([...ALL_ROLES].map((r) => r as string).sort());
  });

  // Ceremonial dress is what a head of government wears on the few days a year
  // that call for it. Drawing role attire uniformly put it on half of them.
  it("keeps ceremonial dress exceptional for the seats that only sometimes wear it", () => {
    for (const role of ["role-prime-minister", "role-president", "role-foreign-minister"]) {
      const ceremonial = attireOptionsFor(role).find((o) => o.value === "ceremonial");
      expect(ceremonial?.weight, `${role} ceremonial rate`).toBeLessThanOrEqual(0.15);
    }
  });

  it("gives every presentation and age band a hair style table that sums to one", () => {
    for (const gender of PortraitGenderPresentation.options) {
      for (const band of PortraitAgeBand.options) {
        const weights = hairStyleWeightsFor(gender, band);
        expect(weights.length, `${gender}/${band} hair`).toBeGreaterThanOrEqual(2);
        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        expect(total, `${gender}/${band} hair weights`).toBeCloseTo(1, 5);
      }
    }
    expect(Object.keys(HAIR_STYLE_WEIGHTS).sort()).toEqual([...PortraitGenderPresentation.options].sort());
  });

  // A draw that is flat across presentation gives feminine-presenting
  // officials a masculine rate of pattern hair loss — about one in six.
  it("never gives feminine presentation a balding head", () => {
    for (const band of PortraitAgeBand.options) {
      const bald = hairStyleWeightsFor("feminine", band).find((w) => w.value === "bald");
      expect(bald, `feminine/${band} baldness`).toBeUndefined();
    }
  });

  // A flat global rate put head coverings on a fifth of every nation's cabinet,
  // Iceland and Iran alike.
  it("varies head covering by nation instead of applying one global rate", () => {
    expect(headCoveringRateFor("IRN")).toBeGreaterThan(0.5);
    expect(headCoveringRateFor("ISL")).toBeLessThan(0.1);
    expect(headCoveringRateFor("ISL")).toBe(headCoveringRateFor("NOWHERE"));
    for (const [nation, rate] of Object.entries(NATION_HEAD_COVERING)) {
      expect(rate, `${nation} covering rate`).toBeGreaterThanOrEqual(0);
      expect(rate, `${nation} covering rate`).toBeLessThanOrEqual(1);
    }
  });

  it("never gives feminine presentation facial hair, and gives masculine some", () => {
    expect(FACIAL_HAIR_WEIGHTS.feminine).toEqual([{ value: "none", weight: 1 }]);
    const masculineBeards = FACIAL_HAIR_WEIGHTS.masculine.filter((w) => w.value !== "none");
    expect(masculineBeards.length).toBeGreaterThanOrEqual(3);
  });

  it("grays hair with age regardless of where it started", () => {
    const bands = PortraitAgeBand.options;
    for (let i = 1; i < bands.length; i++) {
      const prev = AGE_BAND_GRAYING[bands[i - 1]!];
      const here = AGE_BAND_GRAYING[bands[i]!];
      expect(here.graying + here.white, `${bands[i]} gray share`).toBeGreaterThanOrEqual(prev.graying + prev.white);
    }
    for (const heritage of PortraitHeritage.options) {
      const total = HERITAGE_HAIR_COLORS[heritage].reduce((sum, w) => sum + w.weight, 0);
      expect(total, `${heritage} hair color weights`).toBeCloseTo(1, 5);
    }
  });

  it("makes glasses more likely with age", () => {
    const rate = (band: (typeof PortraitAgeBand.options)[number]) =>
      AGE_BAND_EYEWEAR[band].find((w) => w.value === "glasses")!.weight;
    expect(rate("elder")).toBeGreaterThan(rate("early"));
    expect(rate("senior")).toBeGreaterThan(rate("emerging"));
  });

  it("gives Indonesia a mix led by its own region", () => {
    const mix = heritageMixFor("IDN");
    expect(mix[0]).toMatchObject({ heritage: "southeast-asia" });
    expect(mix[0]!.weight).toBeGreaterThan(0.5);
  });
});
