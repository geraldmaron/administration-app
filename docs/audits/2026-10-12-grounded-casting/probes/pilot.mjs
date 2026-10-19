// Measures the 20-scenario placement pilot: where each scenario lands on three
// seeded boards with and without the placement declarations in
// ../pilot-placements.json, whether a declaration changes how often a scenario
// reaches a desk, and how often one state recurs inside a long simulated
// campaign. Reads the corpus as the player is dealt it (the committed bake) and
// the committed dist/, so it runs on a checkout with no authoring corpus.
// Read-only; no build.
//
//   node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs places
//   node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs fit [seeds]
//   node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs thread
//   node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs long [weeks] [seed ...]
//   node docs/audits/2026-10-12-grounded-casting/probes/pilot.mjs governor [weeks] [seed ...]
//   POLICY=never leaves every decision unanswered, which is what fills the thread ledger with raised openers.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.ROOT ?? join(here, "../../../..");
const load = (path) => import(pathToFileURL(join(root, path)).href);
const content = await load("packages/content/dist/index.js");
const engine = await load("packages/engine/dist/index.js");
const world = await load("packages/world/dist/index.js");
const { sealedCampaign } = await load("packages/content/dist/preview-board.js");
const { BUNDLED_SHARDS } = await load("packages/player-core/dist/content/bundled-corpus.generated.js");

const patch = JSON.parse(readFileSync(join(here, "../pilot-placements.json"), "utf8"));
const PILOT = [
  "the-yard-that-builds-the-boats", "the-fleet-that-limped-on-half", "the-return-on-the-yard-we-stood-behind",
  "the-fuel-price-spike", "the-reserve-with-no-rules-written-for-it", "the-frost-that-took-the-belt",
  "the-quota-that-emptied-the-docks", "the-span-that-was-built-for-two-weeks", "the-bridge-the-flood-took-with-it",
  "four-counties-quoting-the-flood-bridge", "the-port-development-or-the-farming-subsidy",
  "the-auditor-who-found-the-gap-in-the-harbor-fund", "the-second-charter-no-underwriter-will-cover",
  "the-dockworkers-who-wont-cross-each-other", "the-corridor-workers-want-widened",
  "the-rearmament-line-draws-on-the-clinics-again", "the-clinics-that-never-got-the-difference-back",
  "the-campus-occupation", "the-grocery-card-that-resets-once-a-year", "the-two-reviews-that-disagree",
];
const baked = BUNDLED_SHARDS.flatMap((s) => s.jsonl.split("\n").filter(Boolean).map((l) => content.ScenarioDef.parse(JSON.parse(l))));
const patched = baked.map((d) => (patch[d.id] ? content.ScenarioDef.parse({ ...d, locus: { ...d.locus, ...patch[d.id].locus } }) : d));
const byId = (defs) => new Map(defs.map((d) => [d.id, d]));
const before = byId(baked), after = byId(patched);
const states = new Map(world.worldStates.map((s) => [s.id, s]));
const usPop = world.worldStates.filter((s) => s.id !== "DC").reduce((n, s) => n + s.population, 0);

const authored = new Set(content.CORE_SCENARIOS.map((d) => d.id));
const poolOf = (defs) => content.combinedPool([content.memoryPool(content.CORE_SCENARIOS), content.memoryPool(defs.filter((d) => !authored.has(d.id)))]);

function axisRank(state, axis) {
  const rows = world.worldStates.filter((s) => s.id !== "DC").sort((a, b) => b.character.economy[axis] - a.character.economy[axis]);
  return rows.findIndex((s) => s.id === state) + 1;
}
function declaredAxis(def) {
  const fit = content.stateFit(def);
  return fit.axes[0];
}

if (process.argv[2] === "readiness") {
  const def = before.get("the-yard-that-builds-the-boats");
  const rows = [];
  for (const seed of ["account-a", "account-b", "account-c", "account-d"]) {
    const board = sealedCampaign(seed);
    const cast = content.castBound(board, def, board.founding.nation);
    const option = cast.script.options.find((reply) => reply.commitment.kind === "position" && reply.commitment.resolved?.some((effect) => effect.kind === "choiceBorrowing"));
    if (!option) throw new Error("Existing shipyard scenario has no financial position");
    const estimate = option.commitment.resolved.find((effect) => effect.kind === "choiceBorrowing").amount;
    const result = engine.commitReply(board, cast.script, option, engine.createRngStreams(board.seed));
    if (!result.ok) throw new Error(result.missingCapability);
    const baseline = { ...result.packet, accounting: undefined, effects: result.packet.effects.map((effect) => effect.kind === "choiceBorrowing" ? { kind: "choiceBorrowing", amount: estimate } : effect) };
    let oldPath = engine.apply(board, baseline), newPath = engine.apply(board, result.packet);
    const phases = engine.campaignTurnPhases(world.worldDataset.charters.find((charter) => charter.id === board.founding.charter));
    const debt = (campaign) => campaign.nations[campaign.founding.nation].stats.economy.debt;
    const path = [{ week: 0, quotedBooking: debt(oldPath), outturnBooking: debt(newPath) }];
    for (let week = 1; week <= 26; week += 1) {
      oldPath = engine.advanceTurn(oldPath, phases); newPath = engine.advanceTurn(newPath, phases);
      if (week % 13 === 0) path.push({ week, quotedBooking: debt(oldPath), outturnBooking: debt(newPath) });
    }
    rows.push({ seed, estimate, receipt: result.packet.accounting, subjects: cast.script.subjects, path });
  }
  console.log(JSON.stringify({ method: "Same shipped shipyard reply, original quoted booking versus separate commit outturn; controlled debt-path regression, not calibration", corpus: { scenarios: baked.length, bases: baked.flatMap((def) => def.replies).filter((reply) => reply.commitment.impact?.financial?.basis).length }, rows }, null, 2));
  process.exit(0);
}

if (process.argv[2] === "places") {
  const seeds = ["pilot-a", "pilot-b", "pilot-c"];
  const boards = seeds.map((s) => sealedCampaign(s));
  const home = boards[0].founding.nation;
  for (const id of PILOT) {
    const row = (defs) => boards.map((c) => {
      const l = content.resolveLocus(c, defs.get(id), home);
      const axis = declaredAxis(after.get(id));
      const rank = l?.state && axis ? ` ${axis}#${axisRank(l.state, axis)}` : "";
      return `${l?.placeName ?? "-"}${rank}`;
    }).join(" | ");
    console.log(`${id}\n  site ${before.get(id).locus.site}->${after.get(id).locus.site}  sector ${before.get(id).locus.sector ?? "-"}->${after.get(id).locus.sector ?? "-"}\n  before: ${row(before)}\n  after:  ${row(after)}`);
  }
  process.exit(0);
}

if (process.argv[2] === "fit") {
  // Where the declared axis ranks the landed state, averaged over many boards:
  // a declaration that does its job lowers the mean rank (1 is the top state).
  const n = Number(process.argv[3] ?? 40);
  const boards = Array.from({ length: n }, (_, i) => sealedCampaign(`fit-${i}`));
  const home = boards[0].founding.nation;
  for (const id of Object.keys(patch).filter((k) => after.get(k).locus.sector)) {
    const mean = (defs) => {
      const axis = declaredAxis(defs.get(id));
      const ranks = boards.map((c) => content.resolveLocus(c, defs.get(id), home)?.state).filter(Boolean).map((s) => axisRank(s, declaredAxis(after.get(id))));
      const top = ranks.filter((r) => r <= 10).length;
      return `mean rank ${(ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1)}, top-10 in ${top} of ${ranks.length} (${axis ?? "no axis"} axis)`;
    };
    console.log(`${id}\n  before: ${mean(before)}\n  after:  ${mean(after)}`);
  }
  process.exit(0);
}

if (process.argv[2] === "governor") {
  // What the capped governor shift does over a whole campaign, against the same
  // campaign with the shifts stripped from every reply: how many answers carried
  // one, how far a governor ever stood from its delegation, and the mean gap.
  const span = Number(process.argv[3] ?? 416);
  const gSeeds = process.argv.slice(4).length > 0 ? process.argv.slice(4) : ["long-a"];
  const strip = (cast) => ({ ...cast, script: { ...cast.script, options: cast.script.options.map((o) => o.commitment.kind === "position" && o.commitment.resolved
    ? { ...o, commitment: { ...o.commitment, resolved: o.commitment.resolved.filter((e) => !(e.kind === "state" && e.governorShift !== undefined)) } } : o) } });
  const gpool = poolOf(patched);
  for (const seed of gSeeds) for (const off of [false, true]) {
    let c = sealedCampaign(seed);
    const charter = world.worldDataset.charters.find((x) => x.id === c.founding.charter);
    const phases = engine.campaignTurnPhases(charter);
    let carried = 0, answered = 0, worst = 0, sumGap = 0, samples = 0;
    for (let w = 0; w < span; w += 1) {
      const raw = content.stageFromResidentPool(c, gpool)[0];
      if (raw) {
        const cast = off ? strip(raw) : raw;
        const next = (() => { for (const o of cast.script.options) { const r = engine.commitReply(c, cast.script, o, engine.createRngStreams(c.seed)); if (r.ok) return { o, next: engine.apply(c, content.rememberReply(c, r.packet, cast, o.id)) }; } return undefined; })();
        if (next) {
          c = next.next; answered += 1;
          if (next.o.commitment.resolved?.some((e) => e.kind === "state" && e.governorShift !== undefined)) carried += 1;
        }
      }
      c = engine.advanceTurn(c, phases);
      for (const st of Object.values(c.states)) {
        if (!st.governor || !st.delegation) continue;
        const gap = Math.abs(st.governor.disposition - st.delegation.disposition);
        worst = Math.max(worst, gap); sumGap += gap; samples += 1;
      }
    }
    console.log(JSON.stringify({ seed, weeks: span, shifts: off ? "stripped" : "on", answered, answersCarryingAShift: carried, worstGap: Number(worst.toFixed(3)), meanGap: Number((sumGap / samples).toFixed(4)) }));
  }
  process.exit(0);
}

if (process.argv[2] === "thread") {
  // The yard's answer sets a flag; the follow-up gated on it should land where the yard did.
  const home = sealedCampaign("pilot-a").founding.nation;
  const yard = after.get("the-yard-that-builds-the-boats"), ret = after.get("the-return-on-the-yard-we-stood-behind");
  const flag = ret.conditions.find((c) => c.kind === "flag").flag;
  for (const seed of ["pilot-a", "pilot-b", "pilot-c", "pilot-d", "pilot-e"]) {
    const c = sealedCampaign(seed);
    const first = content.resolveLocus(c, yard, home);
    const place = content.storyPlace(first, home);
    const answered = engine.applyScenarioFamily(c, { kind: "scenarioFamily", callback: { flags: [flag], ...(place ? { place } : {}) } });
    console.log(`${seed}: yard ${first.placeName} -> return ${content.resolveLocus(answered, ret, home).placeName} (cold draw ${content.resolveLocus(c, ret, home).placeName})`);
  }
  process.exit(0);
}

// --- a long run over the whole pool, answering the first option each week ---
const weeks = Number(process.argv[3] ?? 208);
const policy = process.env.POLICY ?? "first";
const longSeeds = process.argv.slice(4).length > 0 ? process.argv.slice(4) : ["long-a", "long-b", "long-c"];

function answer(campaign, cast) {
  for (const option of cast.script.options) {
    const result = engine.commitReply(campaign, cast.script, option, engine.createRngStreams(campaign.seed));
    if (!result.ok) continue;
    return engine.apply(campaign, content.rememberReply(campaign, result.packet, cast, option.id));
  }
  return undefined;
}

function run(seedLabel, defs) {
  const pool = poolOf(defs);
  let campaign = sealedCampaign(seedLabel);
  const charter = world.worldDataset.charters.find((c) => c.id === campaign.founding.charter);
  const phases = engine.campaignTurnPhases(charter);
  const home = campaign.founding.nation;
  const staged = {}, answered = {}, landed = [];
  let maxPins = 0;
  for (let week = 0; week < weeks; week += 1) {
    const picks = content.stageFromResidentPool(campaign, pool);
    for (const cast of picks) staged[cast.def.id] = (staged[cast.def.id] ?? 0) + 1;
    const first = picks[0];
    if (first) {
      campaign = engine.apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "raised" }, effects: content.familyRaiseEffects(campaign, first) });
      const next = policy === "never" ? undefined : answer(campaign, first);
      if (next) {
        campaign = next;
        answered[first.def.id] = (answered[first.def.id] ?? 0) + 1;
        const where = first.locus;
        const authored = Boolean(first.def.locus.city || first.def.locus.state);
        const bound = first.def.locus.bind === "condition";
        if (where?.nation === home && where.state && where.state !== "DC") landed.push({ id: first.def.id, state: where.state, city: where.city, family: Boolean(first.def.family), kind: authored ? "authored" : bound ? "bound" : "seeded" });
      }
    }
    campaign = engine.advanceTurn(campaign, phases);
    maxPins = Math.max(maxPins, Object.keys(campaign.scenarioFamilies).length);
  }
  return {
    maxPins, staged, answered, landed, pins: Object.values(campaign.scenarioFamilies).length, unanswered: Object.values(campaign.scenarioFamilies).filter((r) => r.unanswered).length };
}

function concentration(landed) {
  const counts = {}, ids = {};
  for (const l of landed) {
    counts[l.state] = (counts[l.state] ?? 0) + 1;
    (ids[l.state] ??= new Set()).add(l.id);
  }
  const total = landed.length;
  const distinctScenarios = new Set(landed.map((l) => l.id)).size;
  const label = (s, n, of) => `${s} ${n} (${((n / of) * 100).toFixed(0)}%, pop ${((states.get(s).population / usPop) * 100).toFixed(0)}%)`;
  const top3 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => label(s, n, total));
  // The same scenario returns to the same state all campaign long, so the
  // count of different scenarios per state is the part a draw could change.
  const top3ByScenario = Object.entries(ids).sort((a, b) => b[1].size - a[1].size).slice(0, 3).map(([s, set]) => label(s, set.size, distinctScenarios));
  return { total, distinct: Object.keys(counts).length, distinctScenarios, top3, top3ByScenario };
}

for (const seed of longSeeds) {
  const t = Date.now();
  const a = run(seed, baked);
  const b = run(seed, patched);
  const pilot = (r) => Object.fromEntries(PILOT.map((id) => [id, `${r.staged[id] ?? 0}/${r.answered[id] ?? 0}`]));
  const homeOnly = (r) => ({ all: concentration(r.landed), seeded: concentration(r.landed.filter((l) => l.kind === "seeded")), authoredOrBound: concentration(r.landed.filter((l) => l.kind !== "seeded")) });
  console.log(JSON.stringify({ seed, weeks, policy, seconds: Math.round((Date.now() - t) / 1000),
    before: { concentration: homeOnly(a), pins: a.pins, maxPins: a.maxPins, unansweredPins: a.unanswered },
    after: { concentration: homeOnly(b), pins: b.pins, maxPins: b.maxPins, unansweredPins: b.unanswered },
    pilotStagedAnswered: Object.fromEntries(PILOT.map((id) => [id, { before: pilot(a)[id], after: pilot(b)[id] }])),
    pilotStates: Object.fromEntries(PILOT.map((id) => [id, { before: [...new Set(a.landed.filter((l) => l.id === id).map((l) => l.state))].join(","), after: [...new Set(b.landed.filter((l) => l.id === id).map((l) => l.state))].join(",") }])),
  }, null, 1));
}
