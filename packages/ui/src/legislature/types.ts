import type { InkRole } from "../icons/Icon";

export type Party = "democrat" | "republican" | "independent";

/** The theme role each party is drawn in; party colors are their own validated palette, never the accent. */
export const PARTY_INK: Readonly<Record<Party, InkRole>> = { democrat: "partyDem", republican: "partyRep", independent: "partyInd" };

export type PartySeats = { readonly party: Party; readonly seats: number; readonly label: string };
