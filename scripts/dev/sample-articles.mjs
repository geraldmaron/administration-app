// Composes a large sample of the articles the player reads, straight from the
// engine's working-tree source, and counts the register defects in them.
//
//   node scripts/dev/sample-articles.mjs --out <dir> [--seeds 4] [--weeks 40] [--tag before] [--engine <src dir>]
//
// --engine composes from another copy of packages/engine/src (a saved
// pre-change tree, say), so a before and an after are counted on the same items
// by the same checks.
//
// Sources, deduplicated by item:
//   every feed item in every checked-in fixture save (apps/web/tests/.fixtures),
//   the feeds of fresh campaigns run --weeks under --seeds seeds,
//   a synthetic matrix of every feed kind against every shape of facts an item
//     can carry, so a bank line no campaign happened to reach is still read,
//   and the foreign-press and leadership pieces those campaigns file.
//
// Reads TypeScript source rather than dist, through the resolve hook below, so a
// bank edit is sampled without a build. The defect checks are the ones the
// engine's own coherence test runs (packages/engine/src/__fixtures__/article-defects.ts).
//
// Writes <out>/<tag>.articles.txt (every piece, readable), <tag>.articles.jsonl,
// and <tag>.report.json (counts per defect class, examples, repeated lines).
import { registerHooks } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const engineFlag = process.argv.indexOf("--engine");
const ENGINE_SRC = engineFlag === -1 ? join(ROOT, "packages/engine/src") : resolve(process.argv[engineFlag + 1]);
const isSourceParent = (url) => /\/packages\/(engine|player-core)\/src\//.test(url) || url.startsWith(pathToFileURL(ENGINE_SRC).href);

// The source imports its siblings as `./x.js`, which is what tsc emits; under
// Node's type stripping the file on disk is `./x.ts`. @admin/engine is sent to
// source too, so player-core's opening fixture and the engine are one module graph.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@admin/engine") {
      return { url: pathToFileURL(join(ENGINE_SRC, "index.ts")).href, shortCircuit: true };
    }
    const parent = context.parentURL ?? "";
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    // A copy outside the repository has no node_modules beside it; its package
    // imports resolve as the repository's engine would resolve them.
    if (!relative && !specifier.startsWith("node:") && parent.startsWith(pathToFileURL(ENGINE_SRC).href) && !parent.startsWith(pathToFileURL(ROOT).href)) {
      return nextResolve(specifier, { ...context, parentURL: pathToFileURL(join(ROOT, "packages/engine/src/index.ts")).href });
    }
    if (relative && isSourceParent(parent)) {
      const path = fileURLToPath(new URL(specifier, parent));
      for (const candidate of [path.replace(/\.js$/, ".ts"), `${path}.ts`, join(path, "index.ts")]) {
        if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

function argValue(flag, fallback) {
  const at = process.argv.indexOf(flag);
  if (at === -1) return fallback;
  const value = process.argv[at + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}

const out = argValue("--out");
if (!out) throw new Error("--out <dir> is required");
const seeds = Number(argValue("--seeds", "4"));
const weeks = Number(argValue("--weeks", "40"));
const tag = argValue("--tag", "sample");

const source = (path) => import(pathToFileURL(join(ROOT, path)).href);
const engine = await import(pathToFileURL(join(ENGINE_SRC, "index.ts")).href);
const { articleDefects, repeatedSentences } = await source("packages/engine/src/__fixtures__/article-defects.ts");
const { openingCampaign } = await source("packages/player-core/src/__fixtures__/opening.ts");
const { charterOf } = await source("packages/player-core/src/campaign/founding-options.ts");
const { worldDataset } = await source("packages/world/dist/index.js");

const population = new Map(worldDataset.nations.map((nation) => [nation.id, nation.stats.demography.population]));
const nationNames = worldDataset.nations.map((nation) => nation.identity.name);

function genreOf(item) {
  if (item.visibility === "intelligence") return "intelligence";
  if (!item.desk && (item.kind === "player-action" || item.kind === "governance")) return "official";
  return "journalism";
}

const nameOf = (campaign, id) => (id ? campaign?.nations?.[id]?.base.identity.name : undefined);

function composeFor(campaign, item, playerNation) {
  const standing = campaign ? engine.selectOutlets(campaign).find((row) => row.outlet.id === engine.pickOutletForFeedItem(item)?.id) : undefined;
  const lookup = (id) => nameOf(campaign, id) ?? worldDataset.nations.find((nation) => nation.id === id)?.identity.name;
  return engine.composeArticle(
    item,
    {
      ...(lookup(item.actor) ? { actor: lookup(item.actor) } : {}),
      ...(lookup(item.target) ? { target: lookup(item.target) } : {}),
      playerNation,
      playerNationName: lookup(playerNation) ?? "the United States",
      ...(campaign && engine.articleTies ? { ties: engine.articleTies(campaign, item) } : {}),
    },
    standing ? { outletDisposition: standing.disposition } : {},
  );
}

const pieces = [];
const seen = new Set();

function addFeedItem(origin, campaign, item, playerNation) {
  const key = JSON.stringify([item.kind, item.visibility, item.headline, item.turn, item.actor, item.target, item.facts, item.desk?.stance]);
  if (seen.has(key)) return;
  seen.add(key);
  const article = composeFor(campaign, item, playerNation);
  const defects = articleDefects(article, { item, playerNation, targetPopulation: item.target ? population.get(item.target) : undefined });
  pieces.push({ origin, genre: genreOf(item), kind: item.kind, phase: item.facts?.phase, item, article, defects });
}

function addCampaign(origin, campaign) {
  for (const item of campaign.feed ?? []) addFeedItem(origin, campaign, item, campaign.founding.nation);
  for (const outlet of engine.FOREIGN_OUTLETS) {
    const piece = engine.foreignPiece(campaign, outlet);
    if (!piece) continue;
    const text = [piece.lede, piece.voice, piece.closing, piece.echo].filter(Boolean).join(" | ");
    const key = `foreign:${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pieces.push({ origin, genre: "foreign-press", kind: piece.kind, text });
  }
  for (const change of engine.selectLeadershipChanges(campaign)) {
    const article = engine.leadershipArticleOf(campaign, change);
    const key = `leadership:${article.headline}:${article.standfirst}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pieces.push({ origin, genre: "leadership", kind: article.story, text: [article.headline, article.standfirst, ...article.paragraphs].join(" | ") });
  }
}

// --- Fixture saves -----------------------------------------------------------
const fixtureDir = join(ROOT, "apps/web/tests/.fixtures");
let fixtureCampaign;
for (const file of readdirSync(fixtureDir).filter((name) => name.endsWith(".json")).sort()) {
  const campaign = engine.loadSave(JSON.parse(readFileSync(join(fixtureDir, file), "utf8")));
  fixtureCampaign ??= campaign;
  addCampaign(`fixture:${file}`, campaign);
}

// --- Fresh seeded campaigns --------------------------------------------------
for (let seed = 1; seed <= seeds; seed += 1) {
  let campaign = openingCampaign({ seedText: `prose-sample-${seed}`, leaderName: "Sample President" });
  const phases = engine.campaignTurnPhases(charterOf(campaign));
  for (let week = 0; week < weeks; week += 1) campaign = engine.advanceTurn(campaign, phases);
  addCampaign(`seed:${seed}`, campaign);
}

// --- The synthetic matrix ----------------------------------------------------
// Every kind against every shape of facts, aimed at us, by us and between two
// others, so each bank's branches are composed whether or not a campaign filed one.
const KINDS = ["player-action", "npc-action", "operator", "drift", "press", "conflict", "condition", "governance", "pursuit", "bloc"];
const HEADLINES = {
  condition: ["Barbados is struck by civil unrest across a region.", "Flooding in Bangladesh is declared over.", "Brazil is struck by a recession nationwide."],
  operator: ["Traders are betting heavily against Egypt's currency, and there is nobody to call about it.", "Hackers working out of Russia have broken into computer systems they should not be able to reach."],
  drift: ["Copper jumps 12% in a week.", "Relations between Chile and Peru cool."],
};
const FACT_SHAPES = [
  {},
  { subject: "Logan Hall" },
  { subject: "the Emergency Committee" },
  { subject: "Saudi Arabia" },
  { instrument: "Tariff Increase", stake: "the measure is in force" },
  { figure: "12%", subject: "Copper", topicTags: ["markets", "economy"] },
];
// The regional fold rewrites its line's headline when a second country folds
// in, so its facts only ever ride on that headline.
const FOLD = { headline: "3 countries across Caribbean are living through a disaster this week.", facts: { figure: "3", topicTags: ["fold:region-caribbean"] } };
const PARTIES = [[undefined, undefined], ["CHN", "VNM"], ["CHN", "USA"], ["USA", "VNM"], [undefined, "BRB"], [undefined, "USA"]];
for (const kind of KINDS) {
  for (const headline of HEADLINES[kind] ?? ["The ministry confirms the shipment was turned back at the border."]) {
    for (const facts of FACT_SHAPES) {
      for (const [actor, target] of PARTIES) {
        for (const visibility of ["public", "intelligence"]) {
          const item = { turn: 7, kind, visibility, headline, facts, ...(actor ? { actor } : {}), ...(target ? { target } : {}) };
          addFeedItem("synthetic", fixtureCampaign, item, "USA");
        }
      }
    }
  }
}
for (const [actor, target] of PARTIES) {
  addFeedItem("synthetic", fixtureCampaign, { turn: 7, kind: "condition", visibility: "public", ...FOLD, ...(actor ? { actor } : {}), ...(target ? { target } : {}) }, "USA");
}

// --- Report ------------------------------------------------------------------
mkdirSync(out, { recursive: true });
const articles = pieces.filter((piece) => piece.article);
const counts = {};
const examples = {};
for (const piece of articles) {
  for (const defect of piece.defects) {
    counts[defect.kind] = (counts[defect.kind] ?? 0) + 1;
    const kept = (examples[defect.kind] ??= []);
    if (kept.length < 12) kept.push({ headline: piece.item.headline, rule: defect.rule, text: defect.text });
  }
}
const affected = Object.fromEntries(
  Object.keys(counts).map((kind) => [kind, articles.filter((piece) => piece.defects.some((defect) => defect.kind === kind)).length]),
);
const repeats = repeatedSentences(articles.filter((piece) => piece.origin !== "synthetic").map((piece) => piece.article), nationNames, 0.02);
const report = {
  tag,
  composed: { articles: articles.length, foreignPress: pieces.filter((p) => p.genre === "foreign-press").length, leadership: pieces.filter((p) => p.genre === "leadership").length },
  byKind: Object.fromEntries(KINDS.map((kind) => [kind, articles.filter((piece) => piece.kind === kind).length])),
  byGenre: Object.fromEntries(["journalism", "official", "intelligence"].map((genre) => [genre, articles.filter((piece) => piece.genre === genre).length])),
  defectLines: counts,
  articlesAffected: affected,
  repeatedSentences: { count: repeats.length, top: repeats.slice(0, 25) },
  examples,
};
writeFileSync(join(out, `${tag}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  join(out, `${tag}.articles.jsonl`),
  `${pieces.map((piece) => JSON.stringify({ origin: piece.origin, genre: piece.genre, kind: piece.kind, item: piece.item, article: piece.article, text: piece.text, defects: piece.defects?.map((d) => d.kind) })).join("\n")}\n`,
);
writeFileSync(
  join(out, `${tag}.articles.txt`),
  pieces
    .map((piece) =>
      piece.article
        ? [
            `## [${piece.genre}/${piece.kind}${piece.phase ? `/${piece.phase}` : ""}] ${piece.origin}`,
            `HEADLINE: ${piece.article.headline}`,
            `DECK: ${piece.article.standfirst}`,
            ...piece.article.paragraphs.map((p) => `  ${p}`),
            `WHY: ${piece.article.relevance ?? "(none)"}`,
            piece.defects.length ? `DEFECTS: ${[...new Set(piece.defects.map((d) => d.kind))].join(", ")}` : "",
          ].join("\n")
        : `## [${piece.genre}/${piece.kind}] ${piece.origin}\n  ${piece.text}`,
    )
    .join("\n\n"),
);
console.log(JSON.stringify({ composed: report.composed, defectLines: counts, articlesAffected: affected, repeated: repeats.length }, null, 2));
