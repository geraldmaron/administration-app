import { type Campaign, type Chamber, type HillCaucus, type UsMajorParty, type UsParty } from "@admin/engine";
export declare function partyAdjective(party: UsMajorParty): string;
export declare function partyPlural(party: UsParty): string;
export declare function caucusName(party: UsMajorParty): string;
/** The major party a caucus column stands for in this campaign. */
export declare function caucusParty(campaign: Campaign, caucus: HillCaucus): UsMajorParty;
/**
 * How the President stands to a party: a member of it, sitting nearest it as an
 * independent, or neither. Undefined is the honest answer for the other party
 * and for the independents in Congress, who caucus on their own account.
 */
export declare function presidentialRelation(campaign: Campaign, party: UsParty): "the President's party" | "the caucus nearest the President" | undefined;
/** Which party controls a chamber, counted the way the engine seats its leaders. */
export declare function chamberMajorityParty(campaign: Campaign, chamber: Chamber): UsMajorParty;
/**
 * "Democrats hold the Senate, with 2 independents." The independents are named
 * when they make up part of the count, because they caucus rather than belong.
 */
export declare function chamberMajorityLine(campaign: Campaign, chamber: Chamber): string;
