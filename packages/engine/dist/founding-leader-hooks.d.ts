import type { CityId, Person, RoleId, StateId } from "@admin/world";
import type { LeaderDraft } from "./leader.js";
import type { OpeningContribution, OpeningMetric } from "./opening-position.js";
import type { Chamber, CityRuntime, Congress, HillCaucus, PersonRuntime, PublicMood, StateRuntime } from "./state.js";
export type LeaderHook = 
/** The leadership of one chamber, or of one caucus, opens warmer or cooler. */
{
    readonly kind: "hill";
    readonly chamber?: Chamber;
    readonly caucus?: HillCaucus;
    readonly shift: number;
}
/** The whole room opens warmer. */
 | {
    readonly kind: "room";
    readonly shift: number;
}
/** The governor of the President's home state opens warmer. */
 | {
    readonly kind: "home-governor";
    readonly shift: number;
}
/** The President's home city leans further toward the administration. */
 | {
    readonly kind: "home-city";
    readonly shift: number;
}
/** One of the public's opening judgments of the government moves. */
 | {
    readonly kind: "mood";
    readonly judgment: Exclude<keyof PublicMood, "polarization">;
    readonly shift: number;
}
/** One opening reading moves, with the reason the Day One rail prints. Treasury moves by a share of the baseline. */
 | {
    readonly kind: "opening";
    readonly metric: OpeningMetric;
    readonly shift: number;
    readonly reason: string;
};
export declare const BACKGROUND_HOOKS: Readonly<Record<string, LeaderHook>>;
export declare const ROUTE_HOOKS: Readonly<Record<string, LeaderHook>>;
/** The two hooks this draft buys, background first. */
export declare function leaderHooks(draft: Pick<LeaderDraft, "backgroundId" | "routeId">): readonly LeaderHook[];
/** The opening-position lines the hooks add, in the same terms a minister's contribution is written in. */
export declare function leaderHookContributions(draft: Pick<LeaderDraft, "backgroundId" | "routeId">, leader: Pick<Person, "id" | "name">, leadRole: RoleId, baselineTreasury: number): readonly OpeningContribution[];
/** The public the administration inherits, with the judgment a career buys moved. */
export declare function withMoodHook(mood: PublicMood, draft: Pick<LeaderDraft, "backgroundId" | "routeId">): PublicMood;
/** The room's opening disposition, moved by a route that buys it. Applied before the leadership is seated, so they read it. */
export declare function withRoomHook(congress: Congress, draft: Pick<LeaderDraft, "backgroundId" | "routeId">): Congress;
/**
 * The seated leadership's opening rapport, moved by the hooks that name a
 * chamber or a caucus. Written through the same tie fold `apply` uses, so a
 * career that bought the Hill leaves its cause on each member it reached.
 */
export declare function withHillHooks(congress: Congress, people: Readonly<Record<string, PersonRuntime>>, draft: Pick<LeaderDraft, "backgroundId" | "routeId">): Readonly<Record<string, PersonRuntime>>;
/** The home statehouse and the home city, moved by the hooks that name them. */
export declare function withHomeHooks(states: Readonly<Record<StateId, StateRuntime>>, cities: Readonly<Record<CityId, CityRuntime>>, draft: Pick<LeaderDraft, "backgroundId" | "routeId">, homeState: StateId | undefined, birthplace: string | undefined): {
    readonly states: Readonly<Record<StateId, StateRuntime>>;
    readonly cities: Readonly<Record<CityId, CityRuntime>>;
};
