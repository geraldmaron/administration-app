import { selectCabinetHolder, selectNation, type Campaign } from "./state.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import type { ConversationScript, ResolvedSpeaker, SpeakerRef } from "./conversations.js";

/** Resolve a speaking role against the live board, including a vacant chair. */
export function resolveSpeaker(campaign: Campaign, script: ConversationScript, ref: SpeakerRef): ResolvedSpeaker {
  if (ref.kind === "narrator") return { kind: "narrator" };
  if (ref.kind === "player") return { kind: "player", name: campaign.founding.name, title: campaign.founding.title };
  if (ref.kind === "counterpart") {
    const nation = selectNation(campaign, script.counterpart);
    const leader = foreignLeaderFor(campaign, script.counterpart);
    return {
      kind: "counterpart",
      nation: script.counterpart,
      name: leader?.name ?? nation?.base.identity.name ?? script.counterpart,
      ...(leader ? { person: leader.person } : {}),
    };
  }
  const holder = selectCabinetHolder(campaign, ref.role);
  if (!holder || !holder.alive) return { kind: "vacant", role: ref.role };
  return { kind: "official", role: ref.role, person: holder.base.id, name: holder.base.name };
}
