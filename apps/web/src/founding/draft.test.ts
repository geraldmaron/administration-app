import { describe, expect, it } from "vitest";
import { makeCampaignSeed } from "@admin/engine";
import { foundingOptions, openingChoices } from "@admin/player-core";
import { isFaceRef, parseFaceRef, type PersonId, type PlankId } from "@admin/world";
import {
  draftSeed,
  needsLeadershipReview,
  openingDraft,
  resolveFounding,
  togglePlank,
  togglePriority,
  withLeader,
  withRunningMate,
  withSeat,
  withSeedText,
} from "./draft";

const SEED = "founding-draft";
const options = foundingOptions(makeCampaignSeed(SEED));

describe("the founding draft", () => {
  it("requires applying new long-setup answers while preserving intentional position overrides", () => {
    const draft = { ...openingDraft(SEED), setupMode: "long" as const };
    expect(needsLeadershipReview(draft)).toBe(true);
    const values = Array<number>(20).fill(0);
    const applied = { ...withLeader(draft, { leadershipAnswers: { version: 1, values } }), questionnaire: values };
    expect(needsLeadershipReview(withLeader(applied, { governingStyle: "dovish" }))).toBe(false);
    expect(needsLeadershipReview({ ...applied, questionnaire: [-1, ...values.slice(1)] })).toBe(true);
    expect(needsLeadershipReview({ ...draft, setupMode: "short" })).toBe(false);
  });
  it("opens with a blank name and nothing picked", () => {
    const draft = openingDraft(SEED);
    expect(draft.leader.name).toBe("");
    expect(draft.cabinet).toEqual({});
    expect(draft.runningMate).toBeUndefined();
  });

  it("keeps the last seed that said anything when the field is cleared", () => {
    const cleared = withSeedText(openingDraft(SEED), "   ");
    expect(draftSeed(cleared)).toBe(SEED);
    expect(draftSeed(withSeedText(cleared, "another-world"))).toBe("another-world");
  });

  it("lets go of every pick when the seed draws a new cast", () => {
    const picked = withRunningMate(withSeat(openingDraft(SEED), "role-treasury-minister", "PER-x" as PersonId), "PER-y" as PersonId);
    const moved = withSeedText(picked, "a-new-cast");
    expect(moved.cabinet).toEqual({});
    expect(moved.runningMate).toBeUndefined();
    expect(withSeedText(picked, SEED).cabinet).toEqual(picked.cabinet);
  });

  it("pulls the age into a new career's window", () => {
    const young = withLeader(withLeader(openingDraft(SEED), { backgroundId: "path-house" as never }), { age: 39 });
    expect(withLeader(young, { backgroundId: "path-general" as never }).leader.age).toBe(55);
  });

  it("draws a face the moment a presentation is stated, and keeps it through an age change", () => {
    const drafted = withLeader(openingDraft(SEED), { presentation: "feminine" });
    const ref = drafted.leader.portraitRef;
    expect(ref !== undefined && isFaceRef(ref)).toBe(true);
    expect(parseFaceRef(ref!).presentation).toBe("feminine");
    expect(withLeader(drafted, { age: drafted.leader.age + 4 }).leader.portraitRef).toBe(ref);
  });

  it("turns a face to a new presentation rather than throwing away the player's work", () => {
    const face = "npc/europe-north/feminine/established/tone-1/business/long/brown/none/none/1";
    const drafted = withLeader(openingDraft(SEED), { presentation: "feminine", portraitRef: face });
    const turned = withLeader(drafted, { presentation: "masculine" }).leader.portraitRef;
    expect(turned !== undefined && isFaceRef(turned)).toBe(true);
    const genome = parseFaceRef(turned!);
    expect(genome.presentation).toBe("masculine");
    expect(genome.makeup.lips).toBe("none");
  });

  it("promotes only a plank on the platform, and drops the promotion with the plank", () => {
    const plank = "plank-secure-border" as PlankId;
    expect(togglePriority(openingDraft(SEED), plank).priorities).toEqual([]);
    const promoted = togglePriority(togglePlank(openingDraft(SEED), plank), plank);
    expect(promoted.priorities).toEqual([plank]);
    expect(togglePlank(promoted, plank).priorities).toEqual([]);
  });
});

describe("resolveFounding", () => {
  it("seats the first name on every shortlist, the same cabinet the quick oath has always sealed", () => {
    const resolved = resolveFounding(options, openingDraft(SEED));
    expect(resolved.choices.cabinet).toEqual(openingChoices(options).cabinet);
  });

  it("keeps a pick that is still on the shortlist and sends only what the player chose", () => {
    const opening = resolveFounding(options, openingDraft(SEED));
    const role = opening.seats.departments[1] as string;
    const second = opening.cabinetSlates[role]![1]!.person.id;
    const resolved = resolveFounding(options, withSeat(openingDraft(SEED), role, second));
    expect(resolved.choices.cabinet[role as never]).toBe(second);
    expect(resolved.choices.runningMate).toBeUndefined();
    expect(resolved.choices.staff).toEqual({});
    expect(resolved.seated.runningMate).toBe(resolved.runningMates[0]?.person.id);
  });

  it("re-ranks every shortlist for the President's party", () => {
    const republican = resolveFounding(options, withLeader(openingDraft(SEED), { party: "republican" }));
    for (const slate of Object.values(republican.cabinetSlates)) {
      expect(slate[0]?.person.party as string | undefined).toBe("party-usa-republican");
    }
  });
});
