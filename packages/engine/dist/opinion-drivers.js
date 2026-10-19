// The six judgments a public forms about an administration, and nothing else.
//
// A leaf, imported by nothing, for the reason `turn-clock.ts` and
// `instrument-ids.ts` are: `opinion.ts` sits in a value-import cycle, and a
// module that iterates this list while it is initializing — building a weight
// table keyed by driver, say — can otherwise see `undefined` instead of the
// array and fail as "OPINION_DRIVERS is not iterable" somewhere unrelated.
//
// `opinion.ts` re-exports both, so every existing caller is unchanged.
export const OPINION_DRIVERS = [
    "security",
    "prosperity",
    "services",
    "integrity",
    "unity",
    "competence",
];
