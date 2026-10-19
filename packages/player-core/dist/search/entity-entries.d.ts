import { type Campaign } from "@admin/engine";
import type { EntityRef } from "../calendar/types";
import type { SearchEntry } from "./search-index";
/** Everything in the campaign a President might look up by name, people first. */
export declare function entityEntries(campaign: Campaign): readonly SearchEntry[];
/** A thing a calendar row or a notification is about, as a name and the door to it. */
export type NamedRef = {
    readonly kind: EntityRef["kind"];
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly href: string;
};
/** The name and door for an entity a feed names; nothing when the campaign holds no such thing, so a stale reference draws no dead link. */
export declare function resolveRef(campaign: Campaign, ref: EntityRef): NamedRef | undefined;
