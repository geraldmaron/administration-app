// The NPC-to-NPC share block of scripts/measure-npc-world.mjs: how much of what
// the world does, it does to itself rather than to the United States, and how
// many acts a year land on the United States. Read off the ledger's decision
// stamps, so an act is counted by the government that decided it and the one
// it was about, whichever family it came from: a coercive rung, an engagement,
// or a world event.

const WEEKS_PER_YEAR = 52;

const round = (value) => Math.round(value * 1000) / 1000;

/** Which family an act of record belongs to, from the subsystem its packet named. */
function familyOf(entry) {
  const systems = entry.causal?.systems ?? [];
  if (systems.includes("engagement")) return "engagement";
  if (systems.includes("world-events")) return "world-event";
  return entry.commitment ? "coercion" : "other";
}

/** What one seed's run contributes to the block: every world act of record, split by who it was about. */
export function npcShareOfSeed(working) {
  const player = working.founding.nation;
  const counts = { total: 0, towardPlayer: 0, betweenOthers: 0, byFamily: {}, towardPlayerByFamily: {} };
  for (const entry of working.ledger) {
    const stamp = entry.causal?.decision;
    if (entry.actor !== "world" || !stamp || entry.background) continue;
    const family = familyOf(entry);
    const aboutPlayer = stamp.subject === player;
    counts.total += 1;
    counts.byFamily[family] = (counts.byFamily[family] ?? 0) + 1;
    if (aboutPlayer) {
      counts.towardPlayer += 1;
      counts.towardPlayerByFamily[family] = (counts.towardPlayerByFamily[family] ?? 0) + 1;
    } else {
      counts.betweenOthers += 1;
    }
  }
  return { ...counts, weeks: working.turn };
}

function sumBy(runs, pick) {
  const merged = {};
  for (const run of runs) {
    for (const [key, count] of Object.entries(pick(run))) merged[key] = (merged[key] ?? 0) + count;
  }
  return merged;
}

/**
 * The block across every seed: the share of the world's acts it does to
 * itself, and acts on the United States per year, overall and by family. No
 * band is set here; the soak that sets one reads these figures.
 */
export function npcShareReport(runs) {
  const seeds = runs.map((run) => run.npcShare).filter((share) => share !== undefined);
  if (seeds.length === 0) return undefined;
  const total = seeds.reduce((sum, seed) => sum + seed.total, 0);
  const between = seeds.reduce((sum, seed) => sum + seed.betweenOthers, 0);
  const toward = seeds.reduce((sum, seed) => sum + seed.towardPlayer, 0);
  const years = seeds.reduce((sum, seed) => sum + seed.weeks, 0) / WEEKS_PER_YEAR;
  return {
    acts: total,
    npcToNpcShare: total === 0 ? 0 : round(between / total),
    usTargetedPerYear: years === 0 ? 0 : round(toward / years),
    byFamily: sumBy(seeds, (seed) => seed.byFamily),
    usTargetedByFamily: sumBy(seeds, (seed) => seed.towardPlayerByFamily),
    perSeed: seeds.map((seed) => ({ acts: seed.total, npcToNpcShare: seed.total === 0 ? 0 : round(seed.betweenOthers / seed.total), towardPlayer: seed.towardPlayer })),
  };
}
