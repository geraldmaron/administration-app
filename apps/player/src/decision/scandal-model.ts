import { SCANDAL_RESPONSE_LABELS, SCANDAL_RESPONSE_VERBS, projectScandalResponses, type Campaign, type Scandal, type ScandalFileRead, type ScandalPriceWord, type ScandalResponseVerb, type ScandalStage } from "@admin/engine";
import type { ModelingActAlternative } from "@admin/player-core";
import type { IconName } from "@admin/ui";
import type { CompareOption, OptionAccent } from "@admin/ui/review";

// A running story's answers as result rows and as a choice to project: the
// three answers the engine prices, each row the engine's own ask and risk, a
// locked answer locked for the engine's reason. Saying nothing is no answer the
// engine takes; what it costs while the story runs is the waiting line.

/** What the story costs while it runs unanswered, said beside the answers. */
export const SILENCE_LINE = "While the story runs unanswered, people think a little less of your honesty every week.";
export const STAGES: readonly ScandalStage[] = ["breaking", "developing", "fading", "resolved"];
export const STAGE_WORDS: Readonly<Record<ScandalStage, string>> = { breaking: "Breaking", developing: "Developing", fading: "Fading", resolved: "Over" };
export const READS: readonly ScandalFileRead[] = ["thin", "named", "thick"];
export const READ_STEP: Readonly<Record<ScandalFileRead, string>> = { thin: "Less than they say", named: "Names a person", thick: "Can prove most of it" };
export const READ_WORDS: Readonly<Record<ScandalFileRead, string>> = {
  thin: "Your lawyer thinks reporters have less proof than their stories suggest.",
  named: "Your lawyer thinks the story points to one person, and reporters will go after that name.",
  thick: "Your lawyer thinks reporters can prove most of it.",
};
export const LANDED: Readonly<Record<ScandalPriceWord, string>> = {
  fading: "Your answer matched what reporters knew. The story is fading.",
  steady: "Your answer didn't change much. Reporters are still asking.",
  heavy: "Your answer didn't match what reporters knew. The story is growing again.",
};

/** Coming clean is the principled answer, fighting it is force, handing over a name is a sacrifice made in the open. */
const VERB_LOOK: Readonly<Record<ScandalResponseVerb, { readonly icon: IconName; readonly accent: OptionAccent }>> = {
  "come-clean": { icon: "law", accent: "gold" },
  "fight-it": { icon: "escalate", accent: "red" },
  "give-them-someone": { icon: "subjectPerson", accent: "blue" },
};

export function verbOf(id: string): ScandalResponseVerb | undefined {
  return SCANDAL_RESPONSE_VERBS.find((entry) => entry === id);
}

/** The three answers, each with what it does and its risk as the engine says them. */
export function scandalOptions(campaign: Campaign, scandal: Scandal): readonly CompareOption[] {
  const projections = new Map(projectScandalResponses(campaign, scandal).map((row) => [row.verb, row]));
  return SCANDAL_RESPONSE_VERBS.map((verb): CompareOption => {
    const row = projections.get(verb);
    return {
      id: verb,
      label: SCANDAL_RESPONSE_LABELS[verb],
      ...VERB_LOOK[verb],
      ...(row?.ask ? { lead: row.ask } : {}),
      lines: [{ label: "The risk", icon: "caution", value: row?.risk ?? "" }],
      ...(row?.unavailable ? { unavailable: row.unavailable } : {}),
    };
  });
}

/** The same options as a choice the staff can project forward. */
export function scandalAlternatives(campaign: Campaign, scandal: Scandal): readonly ModelingActAlternative[] {
  const unavailable = new Map(projectScandalResponses(campaign, scandal).map((row) => [row.verb, row.unavailable]));
  return SCANDAL_RESPONSE_VERBS.map((verb): ModelingActAlternative => {
    const locked = unavailable.get(verb);
    return { id: verb, label: SCANDAL_RESPONSE_LABELS[verb], ...(locked ? { refused: locked } : { act: { act: "scandal" as const, scandal: scandal.id, verb } }) };
  });
}
