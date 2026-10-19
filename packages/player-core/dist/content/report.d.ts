/**
 * Report content that did not load, if this build is one anybody is watching.
 *
 * `context` names the source — the bake inside the binary, or delivery over
 * the network — because the two mean different things. A bad line in the bake
 * shipped that way and is a build defect; a bad line over the wire means the
 * deployed content set and this binary disagree about the schema.
 */
export declare function reportContentProblems(context: string, problems: readonly string[]): void;
