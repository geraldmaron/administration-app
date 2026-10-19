import type { Campaign, LobbyApproach, LobbyForecast } from "./state.js";
import type { HillMember } from "./hill.js";
import type { FiscalMatter } from "./lobbying-favors.js";
type Matter = {
    readonly billId: string;
    readonly title: string;
} | undefined;
export type PlayCopy = {
    readonly summary: string;
    readonly offer?: {
        readonly summary: string;
    };
    readonly footer: string;
};
export declare function playCopy(approach: LobbyApproach, member: HillMember, matter: Matter, fiscal: FiscalMatter | undefined, blocked: string | undefined): PlayCopy;
export declare function delayDaysFor(approach: LobbyApproach): number;
export declare function lobbyForecast(campaign: Campaign, member: HillMember, approach: LobbyApproach, chance: number): LobbyForecast;
export declare function reasonFor(approach: LobbyApproach, chance: number, member: HillMember): string;
/** What the record says happened, said once the member has answered. */
export declare function accountOf(approach: LobbyApproach, target: string, landed: boolean, title: string): string;
export {};
