import type { PersonId } from "@admin/world";
import type { Campaign, IssuedMemberLobbyAct, LobbyRecord } from "./state.js";
import type { EffectPacket } from "./effects.js";
export declare const MEMBER_OUTREACH_DAILY_LIMIT = 2;
export declare function outstandingMemberOutreach(campaign: Campaign): readonly IssuedMemberLobbyAct[];
/** Every member request costs the existing call's standing and a slot of presidential attention. */
export declare function issueMemberOutreach(campaign: Campaign, member: PersonId, billId: string, broker?: PersonId): {
    ok: false;
    reason: string;
    packet?: undefined;
    act?: undefined;
} | {
    ok: true;
    packet: EffectPacket;
    act: IssuedMemberLobbyAct;
    reason?: undefined;
};
/** Resolution rechecks identity/office/issue eligibility and persists observable dialogue, not private motives. */
export declare function resolveMemberOutreach(campaign: Campaign, id: string): {
    ok: false;
    reason: string;
    packet?: undefined;
    record?: undefined;
} | {
    ok: true;
    packet: EffectPacket;
    record: LobbyRecord;
    reason?: undefined;
};
