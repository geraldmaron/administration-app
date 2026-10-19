import { LeaderBackground, LeaderRoute, type LeaderBackgroundId, type LeaderRouteId } from "../schemas/leader.js";
export declare const leaderBackgrounds: readonly LeaderBackground[];
export declare const leaderRoutes: readonly LeaderRoute[];
export declare const leaderBackgroundById: ReadonlyMap<string, LeaderBackground>;
export declare const leaderRouteById: ReadonlyMap<string, LeaderRoute>;
/** The background and route a founding opens on, before the player has chosen. */
export declare const DEFAULT_LEADER_BACKGROUND: LeaderBackgroundId;
export declare const DEFAULT_LEADER_ROUTE: LeaderRouteId;
