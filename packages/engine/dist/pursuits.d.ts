import { type AgendaTheme, type NationId } from "@admin/world";
import { type InstrumentId, type RungLevel } from "./instruments.js";
import { type Campaign, type NationRuntime, type Pursuit } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/** The aim a nation is actually after, from the heaviest of its rolled agendas. */
export declare function leadingAim(runtime: NationRuntime): AgendaTheme | undefined;
export declare function pursuitId(actor: NationId, target: NationId, openedTurn: number): string;
/**
 * Whether a move is the kind of thing a campaign is built out of. A démarche
 * is how states talk; an embargo, an operation or a strike is a state deciding
 * to change another one's behavior and being willing to spend to do it.
 */
export declare function opensPursuit(instrument: InstrumentId): boolean;
export declare function openPursuit(actor: NationId, target: NationId, aim: AgendaTheme, turn: number, instrument: InstrumentId, rung: RungLevel, cause: string): Pursuit;
/**
 * The rung a pursuit wants next.
 *
 * It holds where it is while it is gaining, and steps up once it has spent
 * enough to have something to lose and is not getting it. That is the whole
 * escalation ladder: nothing decides in advance that this pair goes to war, and
 * a pursuit that starts working never climbs.
 */
export declare function wantedRung(pursuit: Pursuit): RungLevel;
/** One week of pressing, folded into what the pursuit already was. */
export declare function advancePursuit(pursuit: Pursuit, outcome: {
    readonly success: boolean;
    readonly rung: RungLevel;
    readonly instrument: InstrumentId;
    readonly summary: string;
}, turn: number): Pursuit;
/**
 * How much this nation wants *this* move because of a campaign it is already
 * running. Zero when there is no pursuit against the target, so a nation with
 * no history anywhere behaves exactly as it did before pursuits existed.
 */
export declare function focusFor(campaign: Campaign, actor: NationId, target: NationId, rung: RungLevel): number;
export declare function closingHeadline(pursuit: Pursuit): string;
/**
 * Pursuits age whether or not anyone acted on them.
 *
 * Without this a nation that pressed a target once and never came back would
 * carry that pursuit — and the preference to escalate it — for the rest of the
 * campaign. What a state has stopped doing has to stop counting, or the board
 * accumulates commitments nobody is honoring.
 */
export declare const pursuitPhase: TurnPhase;
