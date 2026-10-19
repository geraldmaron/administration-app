import { tryCastBound, drawSelector } from "../scenario-cast.js";
import { selectorOf } from "./selector.js";
import { directorPicks } from "../scenario-director.js";
/**
 * A pool over scenarios already in memory — the bundled offline floor, and every test.
 *
 * `bodies` holds every def, retired ones included: a scenario a player already
 * answered stays resolvable, because its flags and the aftermath a reply's
 * `remembered`/`rejoinder` promised are still canon for that campaign, and
 * `peek`/`load` are how the desk re-reads a scenario it already fired. Only
 * `selectors` drops a retired def — that is the one list a draw actually
 * consults, so this is the single place retirement removes a scenario from
 * the pool without deleting anything it could still be asked to resolve.
 */
export function memoryPool(defs) {
    const bodies = new Map(defs.map((def) => [def.id, def]));
    const selectors = defs.filter((def) => !def.retired).map((def) => selectorOf(def));
    return {
        selectors,
        peek: (id) => bodies.get(id),
        load: async (id) => bodies.get(id),
    };
}
/** Every pool as one pool: the bundled floor plus whatever packs have been mounted. */
export function combinedPool(pools) {
    const selectors = pools.flatMap((pool) => pool.selectors);
    return {
        selectors,
        peek: (id) => pools.reduce((found, pool) => found ?? pool.peek(id), undefined),
        load: async (id) => {
            for (const pool of pools) {
                const body = await pool.load(id);
                if (body)
                    return body;
            }
            return undefined;
        },
    };
}
/**
 * The draw for a pool whose bodies are resident. Returns undefined when the
 * drawn body is not — a caller on the synchronous path (the app's desk, which
 * renders inside a React tree) must skip rather than block. Every shipped pool
 * is resident: the corpus travels inside the binary, so there is no remote
 * body to wait on.
 */
export function drawFromResidentPool(campaign, pool) {
    const drawn = drawSelector(campaign, pool.selectors);
    if (!drawn)
        return undefined;
    const body = pool.peek(drawn.selector.id);
    return body ? tryCastBound(campaign, body, drawn.counterpart) : undefined;
}
/**
 * The director's week over a resident pool — what the desk actually calls.
 *
 * Ranking happens over selectors, so the pacing decision costs no rendering;
 * only the picks that survive it have their bodies fetched. A pick whose body
 * is not resident is skipped rather than blocking, the same contract
 * `drawFromResidentPool` holds.
 */
export function stageFromResidentPool(campaign, pool) {
    return directorPicks(campaign, pool.selectors)
        .map((pick) => {
        const body = pool.peek(pick.selector.id);
        return body ? tryCastBound(campaign, body, pick.counterpart) : undefined;
    })
        .filter((cast) => cast !== undefined);
}
