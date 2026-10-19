import type { InstrumentId, RungLevel } from "./instruments.js";
/**
 * Who has to be told, per instrument and rung.
 *
 * A seat is named by its role id and resolved through the charter's own titles
 * at the point of rendering, never quoted: the ids are the engine's
 * cross-charter contract and the words are presentation. Bodies are named
 * outright because a legislature is an institution rather than a chair, and the
 * charter authors those in its own institution list.
 *
 * Authored, because the consultation is a fact about the office rather than a
 * figure the simulation carries. The rule is escalation — the further up a
 * ladder an order sits, the more of the government has to have heard about it
 * first.
 */
export type Consultee = {
    readonly roleId: string;
} | {
    readonly body: string;
};
export declare function consultationFor(instrument: InstrumentId, rung: RungLevel): readonly Consultee[];
