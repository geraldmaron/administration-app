# E5 places: content backfill review record

Branch `w8b-places`, base `05dd4dcfc`. Written by the drafting session; a different session reviews.

## Result

**No scenario was changed.** The audit read every home-ground scenario that has no authored `locus.state` or `locus.city` (286 of the 346 shipped: the 18 baked shards, the core pack and the pilot pack). None of them names or strongly implies a US state or city, so authoring one would invent a fact. The seeded draw stays, and the ratchet baseline is unchanged.

| Count | Before | After |
|---|---|---|
| `seeded-state:` entries | 107 | 107 |
| `dc-by-fallback:` entries | 0 | 0 |
| `capital` sites with no state or city (counted "genuinely Washington") | 174 | 174 |
| Scenarios changed | 0 | 0 |

`node scripts/verify-scenario-dc-fallback.mjs` reports `346 scenario(s), 314 on home ground, 174 genuinely in Washington; 0 in DC by fallback, 107 in a seeded state` before and after. The baked corpus matched its authored source before the audit (`verify-bundled-corpus-current`: 18 shards, 322 scenarios), and nothing was rebaked.

## Why nothing qualified

1. **The corpus is place-neutral by rule.** `docs/CONTENT_DOCTRINE.md` §4 says content never names a country and "never free-text a city name". Places reach a story through `locus.city` plus a `{{city}}` or `{{state}}` token, which means prose edits. This task forbids prose edits.
2. **A mechanical scan found no place names.** Across the 286 scenarios' subject, context, opening, replies, particulars and descriptor, no US city from the dataset's 200 appears, no state name appears except "Washington" (twice, both meaning the capital: `the-engineer-who-copied-the-drives` "chief executive is in Washington this week", `the-provinces-the-writ-does-not-reach` "Marches in Washington"), and a scan of every mid-sentence capitalized phrase turned up only offices and institutions (Treasury, Congress, Pentagon, White House, West Wing, Capitol, Justice Department, Joint Chiefs).
3. **Scenarios that do say where already say it by binding.** Five are `bind: "condition"` or `chokepoint` and are not counted as seeded (`the-schools-the-governor-wants-rebuilt-as-they-were` and `the-grid-that-cannot-promise-the-morning-peak` use `{{state}}`).

## Closest calls, left on the seeded draw

Each fits several states, so the rule "two equally plausible: leave the draw" applies.

| Scenario | Site | Phrase | Why not authored |
|---|---|---|---|
| `the-frost-that-took-the-belt` | interior | "co-op cold-storage bay", "fruit belt" | fruit belts exist in WA, MI, CA, GA, NY and others |
| `the-orchard-belt-that-came-up-dry` | interior, bound | "inland orchard belt" | already bound to a running condition |
| `the-shaft-the-state-crew-cannot-reach` | interior | "collapsed access shaft at the coal face" | coal: WV, KY, PA, AL, others |
| `the-medical-school-question` | interior | "eastern mining districts' training hospital" | mining is not state-specific |
| `the-reserve-with-no-rules-written-for-it` | interior | "upland grazing where the wells came up short" | the arid West spans many states |
| `the-line-that-answered-back` | interior | "river valley's power exchange" | no river named |
| `the-provinces-the-writ-does-not-reach` (pilot) | interior | "mountain counties where federal agents stopped going" | Appalachia or the Mountain West |
| `the-yard-that-builds-the-boats`, `the-fleet-that-limped-on-half`, `the-half-hull-in-the-shed` | coast | dry dock, naval yard, slipway | several shipbuilding states |
| `the-quota-that-emptied-the-docks` | coast | "fish market at first light" | any coast |
| `the-engineer-who-copied-the-drives` (core) | city | "near the contractor's campus"; "Washington" is the capital | no state implied |

## Capital sites that are not about the seat of government

These carry `site: "capital"` and so resolve to Washington, though the descriptor describes somewhere else. They were **not** corrected, and the reason is structural, so a reviewer should decide it rather than assume an oversight.

Changing `site` from `capital` to `city`, `coast` or `interior` without an authored state sends the scenario into the seeded-state draw. That adds a new `seeded-state:<id>` key, and the ratchet refuses new keys (`holdRatchet` NEW rule). Authoring a state to avoid that needs text evidence, and there is none. Net: fixing the site kind and keeping the baseline from growing are only compatible once the prose names a place.

| Scenario | Descriptor phrase that is not the seat of government |
|---|---|
| `the-orchestra-choice` | "concert hall on the harbor" |
| `the-concert-under-threat` | "concert hall downtown where the national orchestra opens" (a DC reading is plausible) |
| `the-run-that-started-at-one-counter` | "country's largest bank, queue past the doors" |
| `the-branch-with-the-line-outside-it` | "savings branch where the line has not moved" |
| `the-bank-advertising-our-guarantee` | "bank lobby whose rate board" |
| `the-currency-that-lost-a-tenth-of-itself-overnight` | "the trading floor" |
| `the-generators-that-failed` | "central hospital basement" |
| `the-fire-and-the-words` | "teaching hospital with the burn mark" |
| `the-night-the-exits-were-chained` | "the theater in the central quarter" |
| `the-broadcaster-who-was-there-first` | "second studio at the state broadcaster" |
| `the-device-before-the-name` | "basement beneath the government complex" (DC reading plausible) |
| `the-authority-they-said-they-would-never-use` | "transit hub where the second team was stopped" |
| `the-thing-the-cleaner-found` | "pillar in the concourse" |
| `the-inspector-who-changed-her-mind` | "studio green room" |

Genuinely Washington (left as is, evidence in the descriptor): White House, West Wing, Capitol steps, House chamber, Treasury, Pentagon corridor, Justice Department, State Department, Commerce Department, Interior Department, situation room, "the federally owned theater on the mall".

## Recommendation

1. The remaining E5 content work is a writing task, not a place-tagging task. For the 107 seeded-state scenarios and the 14 capital-site scenarios above, a `scenario-writer` pass would add a bound `locus.city` with a `{{city}}` token in the subject or descriptor (§4 of the doctrine), after which the state follows from the dataset city and the baseline shrinks honestly.
2. Rank that pass by the seeded-state entries with the most place-bearing text first: the industry and geography scenarios in the closest-calls table.
3. If a code-side relief is preferred instead, allow a non-`capital` site with a seeded state to be exempt from the `seeded-state` count when the descriptor is the only place evidence. That changes the gate's meaning and needs the owner's decision.

## Sampling guide for the reviewer

1. Pick any ten ids from `scripts/baselines/scenario-dc-fallback.json` and read their full text in `packages/player-core/src/content/bundled-corpus.generated.ts` (or the core and pilot packs). Confirm no city or state is named or implied beyond what is in the closest-calls table.
2. Search the baked text for any US state or dataset city name. The only hits are the two "Washington" uses above.
3. Confirm `git diff 05dd4dcfc --stat` touches only this file.
