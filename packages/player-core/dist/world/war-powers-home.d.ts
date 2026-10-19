import { type Campaign, type Conflict } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type WarPaper } from "./war-screen";
/** The element id of the War Powers section on the war screen and the country file. */
export declare const WAR_POWERS_ANCHOR = "war-powers";
/** The live war in which the United States and the target fight on opposite sides. */
export declare function warAgainst(campaign: Campaign, target: NationId): Conflict | undefined;
/** Where the President files, extends, asks Congress about, or ends the force committed against one government. */
export declare function warPowersHome(campaign: Campaign, target: NationId): string;
export type CountryWarPowers = {
    /** The papers still asking something of the President: a report owed or a sixty-day clock running. */
    readonly papers: readonly WarPaper[];
    /** The war these papers belong to, where they are decided; absent where no war is running. */
    readonly war?: string;
};
/** The War Powers paper on force against one government, for that government's own file. */
export declare function countryWarPowers(campaign: Campaign, target: NationId): CountryWarPowers;
