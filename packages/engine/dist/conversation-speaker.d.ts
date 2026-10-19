import { type Campaign } from "./state.js";
import type { ConversationScript, ResolvedSpeaker, SpeakerRef } from "./conversations.js";
/** Resolve a speaking role against the live board, including a vacant chair. */
export declare function resolveSpeaker(campaign: Campaign, script: ConversationScript, ref: SpeakerRef): ResolvedSpeaker;
