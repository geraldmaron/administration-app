import type { Campaign, HillPostId, IssuedLobbyAct, LobbyApproach, LobbyForecast, LobbyRecord } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { ProjectionCounterpart } from "./projection.js";
import { type CampaignCharge, type Resentment } from "./lobbying-person.js";
import type { MetricDeltas } from "./effect-types.js";
export type LobbyPlay = {
    readonly approach: LobbyApproach;
    readonly name: string;
    readonly summary: string;
    /** What it costs whether or not it works. */
    readonly cost: MetricDeltas;
    /** What it costs on top when it does not. */
    readonly backfire: MetricDeltas;
    /** What the member moves by when it lands. */
    readonly gain: number;
    /** What they move by when it does not. */
    readonly loss: number;
};
export declare const LOBBY_PLAYS: Readonly<Record<LobbyApproach, LobbyPlay>>;
/** The order a screen lists them in: cheapest first, the ones that spend the President's own credit last. */
export declare const LOBBY_APPROACH_ORDER: readonly LobbyApproach[];
/** Going public moves the room as well as the member. It is the only one that does. */
export declare const PUBLIC_ROOM_GAIN = 0.02;
export declare const PUBLIC_ROOM_LOSS = -0.04;
/**
 * How long the country remembers the last time this administration went to it
 * about a member of Congress.
 *
 * A president who does it every third week is not campaigning, they are
 * complaining, and the audience prices it accordingly.
 */
export declare const PUBLIC_APPEAL_MEMORY_TURNS = 10;
export type LobbyProjection = {
    readonly approach: LobbyApproach;
    readonly play: LobbyPlay;
    readonly post: HillPostId;
    /** The member, named the way a sentence would name them. */
    readonly target: string;
    /**
     * The number the resolution roll uses. Not for ordinary player copy — the
     * forecast is what a screen prints.
     */
    readonly successChance: number;
    /** The member's rapport if the play lands, and if it does not. */
    readonly rapportIfGood: number;
    readonly rapportIfBad: number;
    readonly chamberBefore: number;
    readonly chamberIfGood: number;
    readonly chamberIfBad: number;
    readonly reasoning: string;
    readonly forecast: LobbyForecast;
    /**
     * Who is being asked, and how the ask reads from their side: the weighted
     * terms, which of them is leading, and whether the terms settle it at all.
     * The one field on this projection that is about the member rather than about
     * the play, and the reason a card can name the trait before the call.
     */
    readonly counterpart: ProjectionCounterpart;
    readonly matter?: {
        readonly billId: string;
        readonly title: string;
    };
    readonly offer?: {
        readonly summary: string;
    };
    /** Why Authorize is refused, when a budget negotiation has no honest project. */
    readonly blocked?: string;
    readonly delayDays: number;
    readonly footer: string;
    /** Everyone else who holds this play against the President, and by how much. On a budget negotiation, only if it lands. */
    readonly resentments: readonly Resentment[];
    /** What a call repeated for nothing takes off the member, already inside both rapport figures. */
    readonly repeatCall?: number;
    /** The grudge the member keeps if a public appeal against them misses. */
    readonly grudgeIfMissed?: number;
    /** The member's trust, if the play lands and if it does not, where the play moves it. */
    readonly trustIfGood?: number;
    readonly trustIfBad?: number;
    /** The bill whose credit is shared, and the share of it that goes to the member. */
    readonly credit?: {
        readonly billId: string;
        readonly title: string;
        readonly fraction: number;
    };
    /** What campaigning beside them charges in their state and with the President's own side. */
    readonly campaign?: CampaignCharge;
};
/** What an authorized play froze, so the answer charges what the card showed. */
export type LobbyFrozen = {
    readonly repeatCall: number;
    readonly matter?: {
        readonly billId: string;
        readonly title: string;
    };
};
/**
 * What the player reads before spending. Pure and seed-independent, the same
 * contract every projection in the engine holds: `issueLobbying` calls this and
 * nothing else for the odds and the prices, so the number shown is the number
 * rolled against and charged. `frozen` is what an authorized play fixed at
 * issuance, passed back when it is answered.
 */
export declare function projectLobbying(campaign: Campaign, target: HillPostId, approach: LobbyApproach, frozen?: LobbyFrozen): LobbyProjection | undefined;
/** Every play, for a screen that has to put the prices beside each other. */
export declare function projectLobbyingOptions(campaign: Campaign, target: HillPostId): readonly LobbyProjection[];
export type LobbyIssueResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: LobbyProjection;
    readonly act: IssuedLobbyAct;
    readonly packet: EffectPacket;
};
export type LobbyResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: LobbyProjection;
    readonly landed: boolean;
    readonly record: LobbyRecord;
    readonly packet: EffectPacket;
};
/**
 * Authorize a play. The counterpart has not answered yet. Standing (and only
 * standing) can be spent at issuance; a budget negotiation does not move the
 * treasury until Congress appropriates it.
 */
export declare function issueLobbying(campaign: Campaign, target: HillPostId, approach: LobbyApproach): LobbyIssueResult;
/** Resolve one issued Hill play whose due date has arrived. */
export declare function resolveIssuedLobbying(campaign: Campaign, id: string): LobbyResult;
