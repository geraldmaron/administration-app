---
name: scenario-ingest
description: Ingest a scenarios file written outside the repository against the authoring kit in content/kit/ (a JSON file whose top level has "kind" "administration-scenario-batch") — gate it, fix mechanical defects only, return craft defects to the author, review the passing scenarios independently, publish them into the local corpus, bake, commit locally and clean up. Also holds the publish tail every scenario batch finishes through. Use when asked to "ingest" a dropped scenarios file, or to give an outside author the kit.
---

# scenario-ingest — a batch drafted elsewhere, through the same gate

Any assistant or person can write scenarios without the repository, from the authoring kit. This
skill is the other end: a file they wrote arrives here and goes through the validator every scenario
faces, an independent review, and the ordinary publish path. It runs in any agent that can read and
write files and run `node`; nothing in it is specific to one tool.

Read `docs/CONTENT_DOCTRINE.md` before step 5. Every command runs from the repo root. If
`studio-cli/dist` is stale or missing, run `pnpm --filter @admin/studio-cli run build` first.

## Recognize the file

A kit file is one JSON document whose top level is
`{ "kind": "administration-scenario-batch", "kitVersion": "<12 hex>", "author": "...", "scenarios": [...] }`.
The owner usually drops it in `content/inbox/` (git-ignored), but it may be anywhere. A file without
that `kind` was not written against the kit: say so and stop.

## The kit

The kit is committed at `content/kit/`: hand an author that folder (or point a session with repository
access at it). `INSTRUCTIONS.md` is the paste-able entry point; `NEEDS.md` tells an author what to write
when nobody has said. The bake rewrites the kit (step 5), and `scripts/verify-kit-current.mjs` fails
when the committed kit is not what the generator writes. After a change to the brief, the gate's closed
sets, the schema, the doctrine or the exemplars, run `node studio-cli/dist/cli.js scenarios kit` and
commit `content/kit/` with the change. The kit version is a hash of the rules, so that change makes
older kits stale.

## Procedure

1. **Gate it.**

   ```bash
   node studio-cli/dist/cli.js scenarios ingest <file>
   ```

   Exit 2 means refused unread: a stale kit, or not a kit file. Relay the message (it says to
   regenerate the kit) and stop. Otherwise the command writes a session-driver job
   `ingest-<name>-<hash>` under `content/jobs/`, one item per cell (class, cast, severity), runs the
   ordinary `scenarios run` gate, and prints the report: passed, returned with findings, refused before
   the gate. When anything is returned or refused it also writes the author's findings file under
   `content/inbox/returned/`. Ignore the gate's own "write <item>.out.json" hint; this skill replaces it.

2. **Fix mechanical defects only, then re-gate.** You may edit
   `content/jobs/work/<job>/<item>.out.json` for these and nothing else:
   - shape: a value outside a closed set (tone, instrument, roleHint, relay), a field of the wrong type,
     a misspelled key, a missing required field whose value is not authored prose;
   - British spelling, replaced by the American word and nothing more;
   - speaker or department: a line given to a chair the finding says has no brief that week, moved to
     the chair the finding names, with the words unchanged;
   - cost or impact band: a band that does not fit the week's severity or the prose's own figures,
     moved to the band the prose already states;
   - `topics`: tags that classify the week and change nothing the player reads.

   Then run the same `scenarios ingest <file>` again: it re-gates the job's outputs, and done cells stay
   done. Keep a list of every edit for the report.

   Everything else is craft and goes back to the author: conditions and binding, mechanisms, prose,
   replies, rejoinders, flags, transmissions, reachability, duplicates, the register. Do not rewrite
   it. If you do rewrite craft anyway, you are now an author of the batch: answer
   `reviewerIsAuthor: true` in step 3, which marks the batch provisional, and stop before publish.

Steps 3 to 7 are **the publish tail**. `skills/scenario-generate` finishes an in-repo batch through the
same steps; the only difference is who may review (step 3).

3. **Review the passing scenarios.** The reviewer must not be the drafter. Here you did not draft them,
   so you may review them, provided step 2 stayed mechanical. For a batch this session drafted, the
   review runs in a fresh, independent context the drafter did not write in: a subagent, or a separate
   session, at a model tier at least as strong as the drafter's. If the harness cannot start one, stop
   here and hand off in one line: `ready for review: node studio-cli/dist/cli.js scenarios review <job>`.

   ```bash
   node studio-cli/dist/cli.js scenarios review <job>
   ```

   Follow `skills/content-review/SKILL.md` for the read and the judgment, with one change: do not
   correct a reject in flight. A scenario you reject goes back to the author with your note. Kit batches
   are small, so read every scenario, not only the flagged and sampled ones. Fill
   `content/reviews/<job>/review.json` (a decision and a note on each, `reviewer` set to the reviewing
   context's identity, `reviewerIsAuthor` answered honestly), then run the review command again to write
   `shipped.json`.

4. **Return what did not pass.** Add each rejected scenario to the findings file under a heading
   `## Returned by review`, with your note. Tell the owner the path; it is what they paste back into
   the chat that wrote the batch. The author returns only the revised scenarios, in a new file.

5. **Publish and bake.** Only if `shipped.json` holds at least one approved scenario and the batch is
   not provisional:

   ```bash
   node studio-cli/dist/cli.js corpus publish <job>
   grep BUNDLED_CONTENT_SET_ID packages/player-core/src/content/bundled-corpus.generated.ts
   node studio-cli/dist/cli.js corpus build --content-set <that id>
   rm -f packages/player-core/tsconfig.tsbuildinfo
   pnpm --filter @admin/player-core run build
   node scripts/verify-bundled-corpus-current.mjs
   node scripts/verify-kit-current.mjs
   ```

   `corpus publish` refuses a provisional batch and any error the batch introduces into the whole
   corpus; never pass `--allow-provisional` or `--owner-review` yourself. The bake writes the one
   tracked artifact, `packages/player-core/src/content/bundled-corpus.generated.ts`, and its compiled
   copy in `packages/player-core/dist/content/`, and `corpus build` rewrites the authoring kit in
   `content/kit/` from the new bake. Before building, check `git status packages/player-core content/kit`:
   if anything else there is already modified, stop and ask, because the build would carry it.

6. **Commit locally, by path.**

   ```bash
   git -c commit.gpgsign=false commit -o packages/player-core/src/content/bundled-corpus.generated.ts \
     packages/player-core/dist/content/bundled-corpus.generated.js \
     packages/player-core/dist/content/bundled-corpus.generated.d.ts content/kit \
     -m "Publish <n> scenarios from <file or job>"
   ```

   Add any other file the bake changed that `git status` shows, by path. Never `git add -A`, never
   `git stash`, no tool-attribution trailer. Do not push and do not deploy: those stay the owner's.

7. **Clean up.**

   ```bash
   node studio-cli/dist/cli.js scenarios finish <job>
   ```

   It removes the job workspace and, for an ingest job, moves the dropped file to
   `content/inbox/processed/`. The review record (`content/reviews/<job>/`) and any returned findings stay.

## Report

One report, in this order: published (ids and the commit hash), returned with findings (ids and the
findings file path), refused (the reason), every mechanical edit made in step 2, and the review record
path. Say what was not done and why.

## Boundaries

Never weakens or bypasses the validator, never reviews a batch it drafted or rewrote for craft and then publishes it, never publishes a provisional batch, never pushes or deploys, never edits a shipped pack
(`packages/content/src/packs/core.ts`), a shard by hand, or the progress journal. The owner's
authorization for this publish path is recorded in `AGENTS.md` §5 and `docs/DECISIONS.md` §7.2.
