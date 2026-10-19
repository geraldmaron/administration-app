---
name: scenario-ingest
description: Ingest a scenarios file written outside the repository against the authoring kit in content/kit/ (a JSON file whose top level has "kind" "administration-scenario-batch") — gate it, fix mechanical defects only, return craft defects to the author, review the passing scenarios independently, publish them into the local corpus, bake, commit locally and clean up. Also holds the publish tail every scenario batch finishes through. Use when asked to "ingest" a dropped scenarios file, or to give an outside author the kit.
---

# scenario-ingest (pointer)

The canonical procedure for this skill is tool-neutral and lives at `skills/scenario-ingest/SKILL.md` in the repository root. Read that file in full now and follow it; this file only lets Claude Code discover the skill. Any supporting files the procedure names are beside the canonical file.
