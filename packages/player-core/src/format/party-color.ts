import type { UsParty } from "@admin/engine";
import { color } from "@admin/design";

export type PartyWord = "Democrat" | "Republican" | "Independent";

export function partyColor(word: PartyWord): string {
  if (word === "Democrat") return color.party.democrat;
  if (word === "Republican") return color.party.republican;
  return color.party.independent;
}

// Both helpers resolve through `partyColor` in the design system rather than
// reading `color.party` themselves, so the app has exactly one answer to
// "what color is a Democrat" — the same one the chamber and the Union map use.

/** Fixed US party chroma — never stance or accent. */
export function partyColorForTicket(party: UsParty | undefined): string | undefined {
  if (!party) return undefined;
  if (party === "democrat") return partyColor("Democrat");
  if (party === "republican") return partyColor("Republican");
  return partyColor("Independent");
}

/** Maps player-facing party words to the same tokens the design system spends. */
export function partyColorForLabel(label: string | undefined): string | undefined {
  if (label === "Democrat" || label === "Republican" || label === "Independent") {
    return partyColor(label as PartyWord);
  }
  return undefined;
}
