import type { StateId } from "@admin/world";
import type { Campaign, ConditionKind } from "./state.js";
import type { EffectPacket, MetricDeltas } from "./effects.js";
import { type CoercionRisk } from "./domestic-coercion.js";
import { type OrderProjection, type OrderSubject } from "./orders.js";
import { type LocaleAct, type LocaleActId, type LocaleAvailability } from "./locale-acts.js";
import { type InsurrectionGround } from "./locale-missions.js";
import { type MissionInterimRelief } from "./mission-interim-relief.js";
export type LocaleActResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** What the act does to national protest: easing only where unrest reaches the state, and never from the home path. */
export declare function localeProtestDelta(campaign: Campaign, id: StateId, act: LocaleAct, home?: boolean): number;
/** The governor's step: what the act costs with an assenting governor, and with an opposed one. */
export declare function localeGovernorShift(campaign: Campaign, id: StateId, act: LocaleAct): number;
/** What the act itself charges, unrequested standing and its tier included: not what a suit or an incident adds. */
export declare function localeActPrice(campaign: Campaign, id: StateId, base: LocaleAct, home?: boolean): MetricDeltas;
/** Collection at the edge of a narrowed order is where it reaches the people the court left out of it. */
export declare const NARROWED_ORDER_ODDS = 1.5;
/** The act's coercion risk this week: surveillance under a narrowed order runs hotter. */
export declare function surveillanceRisk(campaign: Campaign, id: StateId, act: LocaleAct): CoercionRisk | undefined;
/** Take one act against one state, over one condition kind. */
export declare function takeLocaleAct(campaign: Campaign, id: StateId, actId: LocaleActId, cause: ConditionKind): LocaleActResult;
/** Force or collection sent into a state on the President's own initiative, with no unrest to answer. */
export declare function takeHomeAct(campaign: Campaign, id: StateId, actId: LocaleActId): LocaleActResult;
export type LocaleGateCheck = {
    readonly label: string;
    readonly met: boolean;
    readonly cite?: string;
};
export type LocaleActProjection = {
    readonly act: LocaleAct;
    readonly availability: LocaleAvailability;
    readonly gates: readonly LocaleGateCheck[];
    readonly order?: {
        readonly orderId: string;
        readonly subject: OrderSubject;
        readonly projection: OrderProjection;
    };
    readonly commitment?: LocaleAct["commitment"];
    readonly mission?: LocaleAct["mission"];
    readonly protestDelta: number;
    readonly governorShift: number;
    readonly ground?: InsurrectionGround;
    /** What a suit against the mission order would win at interim relief, once filed. */
    readonly interimRelief?: MissionInterimRelief;
};
/** Everything a desk shows about one act in one state before it is taken, out of the same reads the act takes. */
export declare function localeActProjection(campaign: Campaign, id: StateId, actId: LocaleActId, cause?: ConditionKind): LocaleActProjection;
