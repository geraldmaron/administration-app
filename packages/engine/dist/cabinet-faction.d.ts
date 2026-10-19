import type { PersonId, RoleId } from "@admin/world";
import { FactionId } from "@admin/world";
import { type Campaign, type FlagId } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
/**
 * The faction a chair breaks away into.
 *
 * One builder, exported, because there were two copies of this template — one
 * here and one in appointments.ts — and two copies of the string that names a
 * thing is how the same faction ends up with two identities the moment either
 * side is edited.
 */
export declare function rivalFaction(role: RoleId): FactionId;
/** The flag authored content gates on, and the clock a faction's age is read off: `faction:<id>`. */
export declare function factionFlag(id: FactionId): FlagId;
/**
 * A bloc inside the administration that is not the President's.
 *
 * Composed on demand out of the people carrying the badge and the flag that
 * stamped when it formed, so nothing here is a second store to keep honest. It
 * exists because the badge on its own was the whole event: a headline said a
 * Secretary had "stopped waiting to be given the job and started assembling the
 * votes for it", and what followed was a −0.4 on one pairwise tie score and a
 * word on a dossier. No pressure, no votes, nothing a scenario could gate on,
 * and no challenge ever mounted.
 */
export type CabinetFaction = {
    readonly id: FactionId;
    /** The seat it formed out of, which is the thing it is a faction about. */
    readonly role: RoleId;
    /**
     * What to call it on a screen.
     *
     * Composed here rather than on each surface, because a bloc the government
     * screen, the removal arc and a press line all name differently is three
     * factions as far as a player is concerned. Off the charter's own title for
     * the seat, so it is "the Secretary of Defense's bloc" under a charter that
     * seats one and never a role id.
     */
    readonly name: string;
    /** Everyone carrying the badge, seated or not. */
    readonly members: readonly PersonId[];
    /** How many of them still hold a chair in this government. */
    readonly seated: number;
    /** The turn the flag was stamped, or the campaign's own start where a save predates the stamp. */
    readonly formedTurn: number;
    /** How long it has stood, in turns. */
    readonly standingTurns: number;
};
/** Every bloc standing inside the administration right now, largest first. */
export declare function selectFactions(campaign: Campaign, charterTitles?: Readonly<Record<string, string>>): readonly CabinetFaction[];
/**
 * What the standing blocs are costing the President's hold on their own
 * government, 0..1.
 *
 * Read by the removal arc as its sixth term. It compounds twice over — a
 * faction that survives ripens, and a President who answers one by dismissing
 * its leader gets a resentful ex-Secretary who keeps the badge — which is the
 * property the arc's other terms do not have and the reason this belongs there
 * rather than as another one-week metric hit.
 */
export declare function factionPressure(campaign: Campaign): number;
/** What a chair breaking away writes: the badge on the person, and the dated flag the arc and the corpus both read. */
export declare function factionEffects(turn: number, role: RoleId, person: PersonId): readonly Effect[];
/** The flag a bloc's end leaves on the record, so a later story can gate on it: `faction-reconciled:<id>`. */
export declare function reconciledFlag(id: FactionId): FlagId;
export type FactionReconciliation = {
    readonly ok: true;
    readonly faction: CabinetFaction;
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
    /** The seated members whose loyalty the reconciliation lifts. */
    readonly brought: readonly PersonId[];
} | {
    readonly ok: false;
    readonly reason: string;
};
/** The price of ending a bloc, which `reconcileFaction` spends as it stands. */
export declare function projectFactionReconciliation(campaign: Campaign, id: FactionId): FactionReconciliation;
/**
 * End a bloc: the badge comes off everyone carrying it, the flag it formed
 * under is cleared, and the President pays for it in public. The one writer
 * that ends a faction.
 */
export declare function reconcileFaction(campaign: Campaign, id: FactionId): {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
