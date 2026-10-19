// The platform each balance proxy is founded on.
//
// A real President is founded on a platform and runs on what they mean to do.
// A harness founded on none measured a presidency with no promises: no pledge
// could be broken, and no bill that enacts a plank could be sent up, because the
// administration had stood on nothing. Each proxy now stands on the planks its
// own program enacts, filled from its party's usual ground.
import { IDEOLOGY_AXES, platformPlanks, type PlankId } from "@admin/world";
import { plankAlignment, plankDeliverable, plankFitsFirstHundredDays, type PlankDeliverable } from "./platform-deliverables.js";
import { usTicket } from "./party.js";
import { PLATFORM_MAX_PLANKS } from "./pledges.js";
import type { AdministrationParty } from "./state-legislature.js";
import type { FoundingChoices } from "./founding.js";

/** A platform to found on. */
export type HarnessPlatform = Pick<FoundingChoices, "platform" | "firstHundredDays">;

type Planked = { readonly id: PlankId; readonly deliverable: PlankDeliverable };

const PLANKS: readonly Planked[] = platformPlanks.flatMap((plank) => {
  const deliverable = plankDeliverable(plank.id);
  return deliverable ? [{ id: plank.id, deliverable }] : [];
});

// Two planks that set the same program cannot share a platform; an order is its own slot.
function slotOf(deliverable: PlankDeliverable): string {
  return deliverable.kind === "sign-order" ? `order:${deliverable.order}` : deliverable.domain;
}

function stanceOf(deliverable: PlankDeliverable): string | undefined {
  return deliverable.kind === "sign-order" ? undefined : deliverable.stance;
}

/**
 * How far a party would have run on a plank: its program read against the
 * party's own beliefs, the same reading that decides whether the party's
 * President may send up the bill that enacts it.
 */
function agreement(plank: Planked, party: "democrat" | "republican"): number {
  const alignment = plankAlignment(plank.deliverable);
  const beliefs = usTicket(party).beliefs;
  return IDEOLOGY_AXES.reduce((sum, axis) => sum + beliefs[axis] * (alignment[axis] ?? 0), 0);
}

/**
 * A party's usual ground, strongest first.
 *
 * Only planks that promise something still to do: a plank that holds a program
 * opens the term on that program at the oath, which would change the program
 * under test rather than found it. What is left is a promise the proxy keeps
 * only if its own play happens to keep it — which is the thing a pledge exists
 * to measure.
 */
function partyGround(party: "democrat" | "republican"): readonly Planked[] {
  return PLANKS.filter((plank) => plank.deliverable.kind !== "hold-program" && agreement(plank, party) > 0).sort(
    (a, b) => agreement(b, party) - agreement(a, party),
  );
}

function groundFor(party: AdministrationParty): readonly Planked[] {
  if (party !== "independent") return partyGround(party);
  // An Independent runs on some of each side's ground, alternately.
  const left = partyGround("democrat");
  const right = partyGround("republican");
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) => [left[index], right[index]])
    .flat()
    .filter((plank): plank is Planked => plank !== undefined);
}

function addPlanks(chosen: readonly Planked[], candidates: readonly Planked[]): readonly Planked[] {
  return candidates.reduce<readonly Planked[]>((platform, plank) => {
    if (platform.length >= PLATFORM_MAX_PLANKS) return platform;
    const taken = platform.some((held) => held.id === plank.id || slotOf(held.deliverable) === slotOf(plank.deliverable));
    return taken ? platform : [...platform, plank];
  }, chosen);
}

/**
 * The platform a proxy is founded on: the planks its program enacts, in the
 * order the program names them, then its party's ground up to the ceiling.
 *
 * The first-hundred-days priority is the first of those a hundred days can
 * settle. The seal refuses a plank that holds a program there, because a
 * program in force from the first day is kept by doing nothing.
 */
export function platformForProgram(program: readonly string[], party: AdministrationParty): HarnessPlatform {
  const own = program.flatMap((stance) => PLANKS.filter((plank) => stanceOf(plank.deliverable) === stance));
  const platform = addPlanks(addPlanks([], own), groundFor(party));
  const first = platform.find((plank) => plankFitsFirstHundredDays(plank.id));
  return { platform: platform.map((plank) => plank.id), firstHundredDays: first ? [first.id] : [] };
}

/** The platform in the words a summary line prints. */
export function formatPlatform(platform: HarnessPlatform): string {
  const planks = (platform.platform ?? []).map((id) => (id as string).replace(/^plank-/, ""));
  const early = (platform.firstHundredDays ?? []).map((id) => (id as string).replace(/^plank-/, ""));
  return `platform ${planks.length > 0 ? planks.join(", ") : "none"} | first hundred days ${early.length > 0 ? early.join(", ") : "none"}`;
}
