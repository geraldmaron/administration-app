import { cityOfBirthplace } from "./cast-home.js";
import { figureRapport, withTie } from "./ties.js";
export const BACKGROUND_HOOKS = {
    "path-senator": { kind: "hill", chamber: "senate", shift: 0.05 },
    "path-house": { kind: "hill", chamber: "house", shift: 0.05 },
    "path-governor": { kind: "home-governor", shift: 0.08 },
    "path-vice-president": {
        kind: "opening",
        metric: "standing",
        shift: 0.03,
        reason: "served as Vice President, and every capital already has their number.",
    },
    "path-general": {
        kind: "opening",
        metric: "militaryReadiness",
        shift: 0.03,
        reason: "wore four stars, and the services take direction from one of their own.",
    },
    "path-business": { kind: "mood", judgment: "prosperity", shift: 0.02 },
    "path-cabinet": {
        kind: "opening",
        metric: "stability",
        shift: 0.02,
        reason: "ran a federal department, and the institutions already know how they work.",
    },
    "path-mayor": { kind: "home-city", shift: 0.05 },
};
export const ROUTE_HOOKS = {
    "route-primaries": { kind: "hill", caucus: "administration", shift: 0.03 },
    "route-convention": { kind: "room", shift: 0.02 },
    "route-insurgent": { kind: "hill", caucus: "administration", shift: -0.05 },
};
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
/** The two hooks this draft buys, background first. */
export function leaderHooks(draft) {
    const background = BACKGROUND_HOOKS[draft.backgroundId];
    const route = ROUTE_HOOKS[draft.routeId];
    return [...(background ? [background] : []), ...(route ? [route] : [])];
}
/** The opening-position lines the hooks add, in the same terms a minister's contribution is written in. */
export function leaderHookContributions(draft, leader, leadRole, baselineTreasury) {
    return leaderHooks(draft).flatMap((hook) => hook.kind === "opening"
        ? [
            {
                metric: hook.metric,
                delta: hook.metric === "treasury" ? round3(baselineTreasury * hook.shift) : hook.shift,
                role: leadRole,
                person: leader.id,
                reason: `${leader.name} ${hook.reason}`,
            },
        ]
        : []);
}
/** The public the administration inherits, with the judgment a career buys moved. */
export function withMoodHook(mood, draft) {
    return leaderHooks(draft).reduce((current, hook) => hook.kind === "mood" ? { ...current, [hook.judgment]: round3(clamp(current[hook.judgment] + hook.shift, 0, 1)) } : current, mood);
}
/** The room's opening disposition, moved by a route that buys it. Applied before the leadership is seated, so they read it. */
export function withRoomHook(congress, draft) {
    const shift = leaderHooks(draft).reduce((sum, hook) => sum + (hook.kind === "room" ? hook.shift : 0), 0);
    return shift === 0 ? congress : { ...congress, disposition: round3(clamp(congress.disposition + shift, 0, 1)) };
}
/**
 * The seated leadership's opening rapport, moved by the hooks that name a
 * chamber or a caucus. Written through the same tie fold `apply` uses, so a
 * career that bought the Hill leaves its cause on each member it reached.
 */
export function withHillHooks(congress, people, draft) {
    const hooks = leaderHooks(draft).filter((hook) => hook.kind === "hill");
    if (hooks.length === 0)
        return people;
    return congress.leadership.reduce((current, figure) => {
        const shift = hooks.reduce((sum, hook) => sum +
            ((hook.chamber === undefined || hook.chamber === figure.chamber) &&
                (hook.caucus === undefined || hook.caucus === figure.caucus)
                ? hook.shift
                : 0), 0);
        if (shift === 0)
            return current;
        const rapport = round3(clamp(figureRapport(current, figure) + shift, 0, 1));
        return withTie(current, { kind: "tie", person: figure.person, cause: "What the President did before taking office goes before them on the Hill.", rapport: { set: rapport } });
    }, people);
}
/** The home statehouse and the home city, moved by the hooks that name them. */
export function withHomeHooks(states, cities, draft, homeState, birthplace) {
    const hooks = leaderHooks(draft);
    const governorShift = hooks.reduce((sum, hook) => sum + (hook.kind === "home-governor" ? hook.shift : 0), 0);
    const cityShift = hooks.reduce((sum, hook) => sum + (hook.kind === "home-city" ? hook.shift : 0), 0);
    const home = homeState === undefined ? undefined : states[homeState];
    const governor = home?.governor;
    const nextStates = governorShift !== 0 && home && governor && homeState
        ? { ...states, [homeState]: { ...home, governor: { ...governor, disposition: round3(clamp(governor.disposition + governorShift, 0, 1)) } } }
        : states;
    const cityId = cityOfBirthplace(birthplace)?.id;
    const city = cityId === undefined ? undefined : cities[cityId];
    const nextCities = cityShift !== 0 && city && cityId !== undefined && city.adminLean !== undefined
        ? {
            ...cities,
            [cityId]: {
                ...city,
                adminLean: round3(clamp(city.adminLean + cityShift, -1, 1)),
                lastMovedTurn: 1,
                lastMovedReason: "The President ran its city hall, and it opens the term leaning their way.",
            },
        }
        : cities;
    return { states: nextStates, cities: nextCities };
}
