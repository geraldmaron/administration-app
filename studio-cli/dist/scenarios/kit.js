import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ScenarioDef } from "@admin/content";
import { readPlayerBundleBodies } from "../corpus/player-bundle.js";
import { bodyDeeds } from "../corpus/shard-store.js";
import { exemplars } from "./brief.js";
import { kitBrief, kitCatalog, kitDirectors } from "./kit-brief.js";
import { kitNeeds } from "./kit-needs.js";
import { repoRoot } from "./reference.js";
// The scenario authoring kit: everything an author with no repository access
// needs to write a batch the gate will accept, as plain files any assistant or
// person can read. The rules are generated from the code the job brief and the
// gate use, and the kit version is a hash of those rules, so a file written
// against an older kit is recognizably stale rather than quietly judged by
// rules its author never saw.
export const KIT_KIND = "administration-scenario-batch";
const VERSION_TOKEN = "{{KIT_VERSION}}";
const DOCTRINE_PATH = path.join("docs", "CONTENT_DOCTRINE.md");
/**
 * The doctrine sections a writer does not need: player-facing help copy, the
 * room's roles and the harness notes. Everything else ships, so a section added
 * to the doctrine reaches outside authors without an edit here.
 */
const DOCTRINE_EXCLUDED = new Set(["10.2", "11.", "12."]);
const KitBatchFile = z.object({
    kind: z.literal(KIT_KIND),
    kitVersion: z.string().min(1),
    author: z.string().optional(),
    scenarios: z.array(ScenarioDef).min(1),
});
export function writerDoctrine(doctrine) {
    const sections = doctrine.split(/^(?=## )/m);
    const kept = sections.filter((section) => {
        const heading = /^## (\S+)/.exec(section)?.[1];
        return heading === undefined || !DOCTRINE_EXCLUDED.has(heading);
    });
    return kept.join("").trimEnd() + "\n";
}
function batchSchema() {
    const schema = z.toJSONSchema(KitBatchFile, { io: "input", unrepresentable: "any" });
    return `${JSON.stringify({ title: "The Administration scenario batch", ...schema }, null, 2)}\n`;
}
function template() {
    return `${JSON.stringify({ kind: KIT_KIND, kitVersion: VERSION_TOKEN, author: "", scenarios: [] }, null, 2)}\n`;
}
/** The rule files, version token unfilled, keyed by file name. Pure: the same inputs give the same bytes. */
function ruleFiles(inputs) {
    return {
        "INSTRUCTIONS.md": INSTRUCTIONS,
        "BRIEF.md": kitBrief(),
        "CATALOG.md": kitCatalog(),
        "DIRECTORS.md": kitDirectors(),
        "DOCTRINE.md": writerDoctrine(inputs.doctrine),
        "EXEMPLARS.json": `${JSON.stringify(inputs.exemplars, null, 2)}\n`,
        "scenario.schema.json": batchSchema(),
        "TEMPLATE.json": template(),
    };
}
export function assembleKit(inputs) {
    const unfilled = ruleFiles(inputs);
    const hash = createHash("sha256");
    for (const name of Object.keys(unfilled).sort())
        hash.update(`${name}\u0000${unfilled[name]}\u0000`);
    const version = hash.digest("hex").slice(0, 12);
    const files = Object.fromEntries(Object.entries(unfilled).map(([name, text]) => [name, text.split(VERSION_TOKEN).join(version)]));
    return { version, files };
}
export function repoKitInputs(root = repoRoot()) {
    const doctrinePath = path.join(root, DOCTRINE_PATH);
    if (!existsSync(doctrinePath))
        throw new Error(`${doctrinePath} not found — run from the repository`);
    return { doctrine: readFileSync(doctrinePath, "utf8"), exemplars: exemplars() };
}
export function currentKitVersion(root) {
    return assembleKit(repoKitInputs(root)).version;
}
function openingLine(def) {
    const text = def.opening[0]?.text ?? "";
    const first = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
    return first.length > 180 ? `${first.slice(0, 177)}...` : first;
}
/**
 * What the shipped corpus already holds, for de-duplication. Not part of the
 * version: the corpus grows with every publish, and a batch written a week ago
 * is not stale because someone else's landed since.
 */
export function corpusListing(bodies) {
    if (bodies.length === 0)
        return "# The corpus\n\nThis kit was generated without a corpus; there is nothing to de-duplicate against.\n";
    const classes = [...new Set(bodies.map((def) => def.class))].sort();
    return [
        "# The corpus",
        "",
        `${bodies.length} shipped scenarios. A new scenario must not repeat a subject, an opening line or a distinctive`,
        "phrase below, and must not reuse an id. Read your class before you write.",
        "",
        ...classes.flatMap((klass) => [
            `## ${klass}`,
            "",
            ...bodies
                .filter((def) => def.class === klass)
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((def) => `- ${def.id} (${def.severity}) — ${def.subject} — opens: "${openingLine(def)}"`),
            "",
        ]),
    ].join("\n");
}
/** The deeds the corpus remembers, grouped by the setter's class so an author searches one section. */
export function deedListing(deeds) {
    const classes = [...new Set(deeds.map((deed) => deed.class))].sort();
    return [
        "# Deeds a new scenario can answer",
        "",
        'Each flag is set by a reply in the named scenario. A condition { "kind": "flag", "flag": "<flag>", "is": true,',
        '"agedAtLeast": 6 } makes your scenario its answer, months later. "answered" is what the player has already',
        "read; your scenario may extend or overturn it and must never contradict it. Search this file; do not read it whole.",
        "",
        ...classes.flatMap((klass) => [
            `## ${klass}`,
            "",
            ...deeds
                .filter((deed) => deed.class === klass)
                .flatMap((deed) => [
                `- ${deed.flag} — set by "${deed.scenario}"`,
                ...(deed.remembered ? [`  remembers: ${deed.remembered}`] : []),
                ...(deed.rejoinder ? [`  answered: ${deed.rejoinder}`] : []),
            ]),
            "",
        ]),
    ].join("\n");
}
/**
 * The whole kit as it should be committed: the rules, plus what the corpus
 * baked into the app holds and needs. Built from tracked files only, so a
 * fresh checkout renders the same bytes and the kit-current gate can hold it.
 */
export function renderKit(root = repoRoot()) {
    const kit = assembleKit(repoKitInputs(root));
    const bodies = readPlayerBundleBodies(root);
    return {
        version: kit.version,
        files: {
            ...kit.files,
            "CORPUS.md": corpusListing(bodies),
            "DEEDS.md": deedListing(bodyDeeds(bodies)),
            "NEEDS.md": kitNeeds(bodies),
        },
    };
}
export async function writeKit(outDir, root = repoRoot()) {
    const kit = renderKit(root);
    await mkdir(outDir, { recursive: true });
    for (const [name, text] of Object.entries(kit.files))
        await writeFile(path.join(outDir, name), text, "utf8");
    return kit;
}
// The entry file: the one an author pastes as instructions. Hand-written, because it is
// the procedure rather than a rule; the rules it points at are generated.
const INSTRUCTIONS = `# The Administration — scenario authoring kit ${VERSION_TOKEN}

You are writing crisis scenarios for The Administration, a political simulation game in which the player
is the President of the United States. You do not need the game's code: this kit carries every rule the
game's validator will hold your work to. Your output is one JSON file. It is checked by the same gate every
scenario faces; whatever fails comes back to you as a findings file naming each defect.

These instructions work in any assistant or by hand. Paste this file as the system or project instructions
and attach the rest of the kit, or read the files in order yourself. In the game's repository the kit is the
folder content/kit/, kept current with every change to the rules or the shipped corpus, so a session that can
read the repository needs nothing else.

## The files

- INSTRUCTIONS.md: this file.
- BRIEF.md: the full writing brief. Register, the numbered gates (the validator enforces every one), craft,
  impact, context and binding. Read it in full before writing anything.
- CATALOG.md: the classes, severities and casts, with the extra rules some casts carry.
- DIRECTORS.md: which director's register each cell is written in, and each director's notes.
- DOCTRINE.md: the content doctrine a writer needs: the score, what content can move, craft, realism,
  ripples, register, time and tense.
- EXEMPLARS.json: shipped scenarios that set the bar. Match their register and length.
- CORPUS.md: what the game already has, by class: every id, subject and opening line.
- NEEDS.md: what the corpus is short of: suggested cells, arcs waiting for a reader, the mix by class, and
  the contested issues not to write about yet.
- DEEDS.md: choices players have already made that a new scenario can answer months later. Search it for
  your class; it is long.
- scenario.schema.json: the JSON Schema of the output file, generated from the game's own schema. It
  checks shape only; the gate checks much more.
- TEMPLATE.json: the empty output file, with this kit's version filled in.

## How to work

1. Read BRIEF.md, DOCTRINE.md and CATALOG.md in full, then EXEMPLARS.json.
2. Choose cells. A cell is a class, a severity and a cast pick from CATALOG.md; see "Choosing what to
   write" below.
3. Find your cell's director in DIRECTORS.md and read that director's notes.
4. Read your class's section of CORPUS.md. A subject, opening line or phrase that is already there is a
   defect. Do not open a scenario on the word "The".
5. Write each scenario in the order BRIEF.md's WRITE IN THIS ORDER section gives.
6. Before you hand over, check every scenario against each numbered gate in BRIEF.md, one at a time.

## Choosing what to write

- Given cells: use them.
- Given a topic ("a port strike", "the census"): find the class whose scope in CATALOG.md the week would be
  filed under if someone read it cold, then take the cast and severity NEEDS.md says that class is shortest
  of, unless the topic itself decides them (a week with no foreign government in it is cast "none"). Read
  that class in CORPUS.md first; if the topic is already covered, find the angle it does not have.
- Given nothing: take cells from NEEDS.md in its order. A reader for a dead arc branch comes first; its
  scenario gates on that branch's flag, and DEEDS.md says what the setter left behind.
- Never write about an issue NEEDS.md lists as not yet open.

## The output file

One JSON document and nothing else, shaped like TEMPLATE.json:

    { "kind": "${KIT_KIND}", "kitVersion": "${VERSION_TOKEN}", "author": "<who or what wrote it>", "scenarios": [ ... ] }

- Copy "kind" and "kitVersion" exactly. A file carrying another version is refused unread.
- "scenarios" is an array of ScenarioDef objects. One file may hold several cells; each scenario's own
  "class", "severity" and "cast" decide its cell.
- Every "id" is new: not in CORPUS.md and not repeated in the file. Ids read as deeds ("the-dawn-crossing").
- Save it with any name ending in .json. If you cannot attach a file, print the JSON in a single code block
  so it can be saved as one.

## When findings come back

The findings file names each returned scenario and every defect against it. Fix those scenarios and return
a new file holding only them, with the same ids and the same kit version. Scenarios not named have been
accepted; do not send them again.

If the file is refused because the kit version is stale, ask for a fresh kit and check your scenarios
against its BRIEF.md before sending them again.

## What the kit does not cover

Arc cells (a setter and its readers written as one chain) and set-pieces about one named country are written
inside the repository, where the job brief and an owner can bind them.
`;
