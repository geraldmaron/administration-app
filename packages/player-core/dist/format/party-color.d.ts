import type { UsParty } from "@admin/engine";
export type PartyWord = "Democrat" | "Republican" | "Independent";
export declare function partyColor(word: PartyWord): string;
/** Fixed US party chroma — never stance or accent. */
export declare function partyColorForTicket(party: UsParty | undefined): string | undefined;
/** Maps player-facing party words to the same tokens the design system spends. */
export declare function partyColorForLabel(label: string | undefined): string | undefined;
