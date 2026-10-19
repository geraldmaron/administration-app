import type { NationId } from "@admin/world";
import type { ReplyOption, ScriptedBeat } from "./conversations.js";

// A thread as the room reads it: who it is with, what is on the table, the
// opening beats and the answers on offer. The content layer compiles authored
// scenarios down to this; the engine opens, projects and commits it.

export type ConversationScript = {
  readonly id: string;
  readonly counterpart: NationId;
  readonly subject: string;
  readonly subjects?: readonly import("./story-subject.js").StorySubject[];
  readonly subjectCauseIds?: readonly string[];
  readonly opening: readonly ScriptedBeat[];
  readonly options: readonly ReplyOption[];
  readonly scenarioClass?: string;
  /** Access to the decision's causal record; an intelligence briefing is not public merely because it was answered. */
  readonly visibility?: "public" | "intelligence" | "internal";
  /**
   * Whether the claim this decision rests on is one the services have not
   * confirmed.
   *
   * A boolean rather than the confidence band itself: which bands can be
   * overturned is the content layer's doctrine and its own constant, and the
   * engine's part is only to say that the answer is being given on a claim that
   * may not hold. Absent means the briefing had nothing in it to be wrong
   * about, which is not the same as a briefing that was checked.
   */
  readonly briefingDoubted?: boolean;
  /**
   * The markers that had to already be standing for this to reach the desk —
   * most of them set by something this administration decided weeks earlier.
   * Carried so the answer's packet can name those decisions as its causes,
   * which is the only way a presidential act ever enters the causal graph: a
   * decision creates no durable record to hang a cause on, only flags. Opaque
   * strings for the same reason `briefingDoubted` is a boolean — which gates a
   * situation was selected on is the content layer's doctrine.
   */
  readonly gatedOn?: readonly string[];
  /**
   * Where the matter is happening, as the causal stamp's locale ids: the US
   * state, then the dataset city, at home; the dataset city alone abroad,
   * where the government is already on the stamp as an entity. Resolved once,
   * when the scenario was cast, so the answer's Record entry names the same
   * place the briefing was datelined.
   */
  readonly locales?: readonly string[];
};
