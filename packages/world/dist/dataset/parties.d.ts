import type { PartyId } from "../schemas/ids.js";
import type { Charter, Party } from "../schemas/org-cradle-charter.js";
export declare function partiesOf(charter: Charter | undefined): readonly Party[];
export declare function partyById(parties: readonly Party[], id: string | PartyId | undefined): Party | undefined;
/**
 * President never Independent. Tie at center keeps the first authored major
 * (US: Democrat). Empty or one-sided catalogues → none.
 */
export declare function presidentPartyFromIdeology(parties: readonly Party[], economicLeftRight: number): Party | undefined;
export declare function opposingMajor(parties: readonly Party[], ticket: Party | undefined): Party | undefined;
