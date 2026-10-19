import { type Campaign, type DocumentMarking } from "@admin/engine";
export type PdbUrgency = "hard" | "soft" | "ambient";
export type PdbItem = {
    readonly id: string;
    readonly headline: string;
    readonly urgency: PdbUrgency;
};
export type PdbReading = {
    readonly marking: DocumentMarking;
    readonly items: readonly PdbItem[];
};
/**
 * Today's brief: the wars this government is fighting, its munitions running
 * short, its War Powers clocks closing, and what the community has found
 * open. Never undefined once a campaign exists — a quiet night is still a
 * brief, it is simply a short one.
 */
export declare function pdbReading(campaign: Campaign): PdbReading;
