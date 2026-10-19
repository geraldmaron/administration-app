// The shared reading behind verify-position-uncertainty and its proof.
//
// One implementation of "what would the decision surface actually draw under
// this reply", so the gate and the fixture that proves the gate cannot measure
// two different things. The term list mirrors `tradeoffLines` in
// apps/player/src/conversation/tradeoff.ts minus the price and the odds, which
// is exactly what `optionTerms` hands a decision card.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const repo = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export async function loadRuntime(root = repo) {
  const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
  const [founding, rng, leader, conversations, world, content] = await Promise.all([
    load("packages/engine/dist/founding.js"),
    load("packages/engine/dist/rng.js"),
    load("packages/engine/dist/leader.js"),
    load("packages/engine/dist/conversations.js"),
    load("packages/world/dist/index.js"),
    load("packages/content/dist/index.js"),
  ]);
  return { founding, rng, leader, conversations, world, content };
}

/** The campaign a player actually opens on: the shipped dataset, the playable seat, the first candidate for every chair. */
export function foundOpeningCampaign(runtime, label = "position-uncertainty-gate") {
  const { founding, rng, leader, world } = runtime;
  const seed = rng.makeCampaignSeed(label);
  const pool = founding.generateFoundingPool(seed, world.worldDataset);
  const nation = world.worldDataset.nations.find((entry) => entry.playable);
  const charter = world.worldDataset.charters[0];
  const cradle = world.worldDataset.cradles.find((entry) => entry.startingNeighbors.length > 0);
  const cabinet = Object.fromEntries(
    Object.entries(founding.draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]),
  );
  return founding.sealFounding(seed, world.worldDataset, {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: world.defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...leader.defaultLeaderDraft(), name: "Test President" },
  });
}

/**
 * The pool the app itself builds: the authored core pack plus every shard baked
 * into the binary. Read out of the generated module textually, the same way
 * verify-shipped-content-parses reads it and for the same reason — the bake is
 * TypeScript, its bodies are written by one emitter as `JSON.stringify(...)`,
 * and a shape change stops matching here and fails on a checked-nothing source
 * rather than passing.
 */
export function livePool(runtime, root = repo) {
  const { content } = runtime;
  const source = readFileSync(path.join(root, "packages/player-core/src/content/bundled-corpus.generated.ts"), "utf8");
  const bodies = [...source.matchAll(/^ {4}jsonl: (".*"),$/gm)].map((match) => JSON.parse(match[1]));
  const authored = new Set(content.CORE_SCENARIOS.map((def) => def.id));
  const baked = [];
  for (const body of bodies) {
    for (const line of body.split("\n")) {
      const text = line.trim();
      if (!text) continue;
      const parsed = content.ScenarioDef.safeParse(JSON.parse(text));
      if (parsed.success && !authored.has(parsed.data.id)) baked.push(parsed.data);
    }
  }
  return [...content.CORE_SCENARIOS, ...baked];
}

/** Everything the decision card would list under a reply, which is `tradeoffLines` without the price and the odds. */
export function termsFor(projection) {
  if (!projection.available) return ["blocked"];
  const terms = [];
  if (projection.risks.length > 0) terms.push("risk");
  if ((projection.exposure ?? []).length > 0) terms.push("exposure");
  if (projection.conflict) terms.push("conflict");
  if (projection.deterrence?.defenderNuclear) terms.push("deterrence");
  if ((projection.exhausted ?? []).length > 0) terms.push("exhausted");
  if ((projection.consultation ?? []).length > 0) terms.push("consultation");
  if (projection.capacity) terms.push("clock");
  if (projection.ripples.length > 0) terms.push("ripples");
  return terms;
}

/**
 * Project every reply in a pool against one board and count what the card would
 * have to say. `rolledPositions` is the doctrine check riding along: a position
 * is not rolled for, so one carrying a success chance would be a probability on
 * a card that nothing in the simulation ever draws against.
 */
export function measure(runtime, campaign, pool, castWith) {
  const { conversations, rng, content } = runtime;
  const bind = castWith ?? ((board, def) => content.castScenario(board, def));
  let replies = 0;
  let empty = 0;
  let cast = 0;
  const rolledPositions = [];
  const byKind = {};
  const emptyByKind = {};
  for (const def of pool) {
    const bound = bind(campaign, def);
    if (!bound) continue;
    cast += 1;
    const streams = rng.createRngStreams(campaign.seed);
    for (const option of bound.script.options) {
      const projection = conversations.projectReply(campaign, bound.script, option, streams);
      const kind = option.commitment.kind;
      replies += 1;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      if (kind === "position" && projection.successChance !== undefined) {
        rolledPositions.push(`${def.id} / ${option.id}`);
      }
      if (termsFor(projection).length === 0) {
        empty += 1;
        emptyByKind[kind] = (emptyByKind[kind] ?? 0) + 1;
      }
    }
  }
  return { cast, replies, empty, byKind, emptyByKind, rolledPositions, share: replies === 0 ? 0 : (replies - empty) / replies };
}
