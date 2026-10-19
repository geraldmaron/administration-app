import {
  apply,
  createRngStreams,
  dayOneOrders,
  executiveOrder,
  makeCampaignSeed,
  sealFounding,
  signOrder,
  validateFounding,
  type Campaign,
  type ExecutiveOrder,
  type FoundingRejection,
} from "@admin/engine";
import { charterOf, foundingOptions, type FoundingOptions } from "@admin/player-core";
import { worldDataset } from "@admin/world";
import { draftSeed, needsLeadershipReview, readableLeader, resolveFounding, type FoundingDraft, type ResolvedFounding } from "./draft";
import { drawTeam, type Random } from "./quick-start";

// The oath's work: what the draft would seal, and the seal itself. Sealing a
// campaign is a whole founding (seconds on a phone), so it runs on the oath
// stage only, and the oath keeps the campaign the preview sealed rather than
// sealing the same draft a second time.

let lastOptions: { readonly seed: string; readonly options: FoundingOptions } | undefined;

/** One founding pool per seed, kept while the player works on it. */
export function optionsFor(seed: string): FoundingOptions {
  if (lastOptions?.seed !== seed) lastOptions = { seed, options: foundingOptions(makeCampaignSeed(seed)) };
  return lastOptions.options;
}

export function resolveDraft(draft: FoundingDraft): ResolvedFounding {
  return resolveFounding(optionsFor(draftSeed(draft)), draft);
}

/** Everything the seal would refuse about this draft, without sealing it. */
export function refusalsOf(draft: FoundingDraft, resolved: ResolvedFounding = resolveDraft(draft)): readonly FoundingRejection[] {
  return validateFounding(worldDataset, resolved.choices, optionsFor(draftSeed(draft)).pool).rejections;
}

const DRAW_ATTEMPTS = 6;

/**
 * A random team the seal accepts. A draw the seal would refuse for the team's
 * sake is thrown back and drawn again; the President's own missing details are
 * not the draw's to fix. If every draw is refused, the team falls back to the
 * shortlists' first names, which is what the other paths open on.
 */
export function drawPlayableTeam(draft: FoundingDraft, random: Random = Math.random): FoundingDraft {
  const options = optionsFor(draftSeed(draft));
  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const drawn = drawTeam(options, draft, random);
    if (refusalsOf(drawn).every((rejection) => rejection.subject === "leader")) return drawn;
  }
  const { runningMate: _mate, ...rest } = draft;
  return { ...rest, cabinet: {}, staff: {} };
}

export type OathPreview =
  | { readonly ok: true; readonly campaign: Campaign; readonly orders: readonly ExecutiveOrder[]; readonly provisional: boolean }
  | { readonly ok: false; readonly rejections: readonly FoundingRejection[] };

/**
 * The campaign the oath would seal right now. A draft whose only fault is a
 * blank name is still sealed, under a stand-in name and marked provisional,
 * so the first morning can be read before the player has signed it.
 */
export function previewOath(draft: FoundingDraft): OathPreview {
  const resolved = resolveDraft(draft);
  const unnamed = draft.leader.name.trim().length === 0;
  const rejections = refusalsOf(draft, resolved).filter((rejection) => !(unnamed && rejection.subject === "leader"));
  if (rejections.length > 0) return { ok: false, rejections };
  const choices = { ...resolved.choices, leader: readableLeader(resolved.choices.leader) };
  const campaign = sealFounding(makeCampaignSeed(draftSeed(draft)), worldDataset, choices);
  return { ok: true, campaign, orders: dayOneOrders(campaign), provisional: unnamed };
}

/**
 * Sign the picks in the order they were made, each against the campaign the
 * one before it left. A pick the sealed campaign will not sign refuses the
 * oath with the reason, rather than founding an administration short of an
 * order the President chose.
 */
export function signDayOneOrders(campaign: Campaign, picks: readonly string[]): Campaign {
  if (picks.length === 0) return campaign;
  const offered = new Set(dayOneOrders(campaign).map((order) => order.id));
  const charter = charterOf(campaign);
  const streams = createRngStreams(campaign.seed);
  return picks.reduce((current, id) => {
    const name = executiveOrder(id)?.name ?? id;
    if (!offered.has(id)) throw new Error(`${name} can't be signed on the first morning. Take it off the list to take the oath.`);
    const result = signOrder(current, charter, id, streams);
    if (!result.ok) throw new Error(`${result.reason}. Take it off the list to take the oath.`);
    return apply(current, result.packet);
  }, campaign);
}

/** The oath: the previewed seal when the draft has not moved since, a fresh one otherwise, then the first morning's orders. */
export function takeOath(draft: FoundingDraft, preview: OathPreview | undefined, picks: readonly string[]): Campaign {
  if (draft.leader.name.trim().length === 0) throw new Error("The oath needs your name.");
  if (needsLeadershipReview(draft)) throw new Error("Answer all 20 questions and apply your latest answers before you take the oath.");
  const sealed = preview?.ok && !preview.provisional ? preview.campaign : sealedNow(draft);
  return signDayOneOrders(sealed, picks);
}

function sealedNow(draft: FoundingDraft): Campaign {
  const resolved = resolveDraft(draft);
  const rejections = refusalsOf(draft, resolved);
  if (rejections.length > 0) throw new Error(rejections.map((rejection) => rejection.explanation).join(" "));
  return sealFounding(makeCampaignSeed(draftSeed(draft)), worldDataset, resolved.choices);
}
