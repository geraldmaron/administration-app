// Where content that failed to load says so.
//
// The delivery path drops a shard line it cannot parse and keeps the rest of
// the shard, which is the right call at runtime — one bad document must not
// cost a player the other thirty in the file. It was also, for days, a
// completely silent one: a schema rename (`readiness` -> `militaryReadiness`)
// outran the corpus, 157 of 303 shipped scenarios stopped parsing, and the
// game went on dealing from the remainder with nothing anywhere saying that
// half the writing had become undealable.
//
// So a drop is now reported. Not to the player, who can do nothing about it,
// and not as a throw, which would trade a smaller pool for a broken app — but
// loudly enough in a development or test build that the next rename cannot
// reach a store without somebody having been told.
/** A build a developer or QA is looking at, as opposed to one a player bought. */
function isDiagnosticBuild() {
    return process.env.NODE_ENV !== "production";
}
/**
 * Report content that did not load, if this build is one anybody is watching.
 *
 * `context` names the source — the bake inside the binary, or delivery over
 * the network — because the two mean different things. A bad line in the bake
 * shipped that way and is a build defect; a bad line over the wire means the
 * deployed content set and this binary disagree about the schema.
 */
export function reportContentProblems(context, problems) {
    if (problems.length === 0 || !isDiagnosticBuild())
        return;
    const detail = problems.map((problem) => `  - ${problem}`).join("\n");
    console.error(`[content] ${context}: ${problems.length} scenario(s) could not be loaded and will never be dealt.\n${detail}`);
}
