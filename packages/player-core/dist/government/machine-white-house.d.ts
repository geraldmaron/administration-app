import { type Campaign, type InstitutionId } from "@admin/engine";
import { type Person, type WhiteHouseRoleId } from "@admin/world";
/** How a White House post is filled, which is also what the President can and cannot do about it. */
export type WhiteHouseTenure = "elected" | "appointed";
export type WhiteHouseSeat = {
    readonly role: WhiteHouseRoleId;
    readonly title: string;
    /** Absent when the post was never filled, or its holder has died. */
    readonly holder: Person | undefined;
    readonly tenure: WhiteHouseTenure;
    /** The body the post runs or sits in, for its seal and its mandate. */
    readonly institution: InstitutionId;
    /** What the post is, in one line a card or a file can carry. */
    readonly duty: string;
};
/** Every White House post, filled or not, in order. */
export declare function whiteHouseSeats(campaign: Campaign): readonly WhiteHouseSeat[];
/** The White House post a person holds, if they hold one. */
export declare function whiteHouseSeatOf(campaign: Campaign, personId: string): WhiteHouseSeat | undefined;
