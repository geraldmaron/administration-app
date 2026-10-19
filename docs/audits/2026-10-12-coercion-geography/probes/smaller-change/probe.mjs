// Read-only probe for the smaller change: the blockade as an act of war with a
// standing record, the generalized chokepoint shock, and the hit-back branch.
//
// usage:
//   node probe.mjs blockade [engineDist] [weeks] [seeds]   US blockade of Iran, against a control run
//   node probe.mjs npc [engineDist] [weeks] [seeds]        NPC blockades over a passive term
// Seeds are coercion-0 upward, twelve unless a count is given.
//
// engineDist defaults to this checkout's packages/engine/dist. Pass the dist of
// an earlier commit to measure the same seeds before the change (SMALLER-CHANGE.md
// says how the baseline used there was extracted). The baseline engine has no
// blockades module, so the readings that need one are left out for it.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const [mode = "blockade", distArg, weeksArg, seedCountArg = "12"] = process.argv.slice(2);
const dist = path.resolve(distArg || path.join(here, "../../../../../packages/engine/dist"));
const E = (name) => import(pathToFileURL(path.join(dist, `${name}.js`)).href);
const optional = async (name) => {
  try {
    return await E(name);
  } catch {
    return undefined;
  }
};

const { playCampaign, foundedForBalance } = await E("balance-harness");
const { issueAction } = await E("instrument-issued");
const { projectAction } = await E("resolution");
const { createRngStreams } = await E("rng");
const { selectCommodities, CRUDE_ANCHOR } = await E("commodities");
const { selectPumpPrice } = await E("household-prices");
const { terminationClockRuns, terminationDaysRemaining } = await E("war-powers-report");
const blockades = await optional("blockades");

const SEEDS = Array.from({ length: Number(seedCountArg) }, (_, i) => `coercion-${i}`);
const US = "USA";
const IRN = "IRN";
const r = (value, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

function prices(state) {
  const index = (id) => selectCommodities(state).find((reading) => reading.id === id)?.index ?? NaN;
  let pump;
  try {
    pump = selectPumpPrice(state);
  } catch {
    pump = NaN;
  }
  return { brent: r(index("crude") * CRUDE_ANCHOR.usd, 2), lng: r(index("lng"), 3), pump: r(pump, 3) };
}

function warPowersState(state) {
  const obligations = state.security.warPowers.obligations.filter((obligation) => obligation.target === IRN);
  const running = obligations.filter((obligation) => terminationClockRuns(state, obligation));
  return {
    reports: obligations.map((obligation) => obligation.kind).join("+") || "none",
    clockDaysLeft: running.length > 0 ? Math.min(...running.map((obligation) => terminationDaysRemaining(state, obligation))) : null,
    unauthorized: state.congress.unauthorized.filter((action) => action.target === IRN).length,
  };
}

function iranTrade(state) {
  const stats = state.nations[IRN].stats.trade;
  const cut = blockades ? blockades.blockadeCutOn(state, IRN) : 0;
  return { exports: Math.round(stats.exports * (1 - cut)), imports: Math.round(stats.imports * (1 - cut)), cut: r(cut, 3) };
}

function weekRow(state) {
  const war = Object.values(state.conflicts).find((conflict) => conflict.status === "active" && [conflict.aggressor, conflict.defender].includes(IRN) && [conflict.aggressor, conflict.defender].includes(US));
  return {
    t: state.turn,
    ...prices(state),
    usInflation: r(state.nations[US].stats.economy.inflation),
    approval: r(state.player.metrics.approval),
    iran: iranTrade(state),
    war: war ? { opening: war.opening ?? "-", intensity: r(war.intensity, 2) } : null,
    warPowers: warPowersState(state),
  };
}

/** The order's outcome as the Record states it; the branch of a failure is read off its account. */
function outcomeOf(state) {
  const act = Object.values(state.issuedActs ?? {}).find((entry) => entry.kind === "instrument" && entry.request?.target === IRN && entry.request?.rung === 3);
  if (!act?.outcome) return undefined;
  if (act.outcome.landed) return "landed";
  return /hit back/.test(act.outcome.account) ? "failed: hit back" : "failed: held";
}

function blockadeRun(seed, weeks, order) {
  const rows = [];
  let issued;
  let odds;
  let outcome = "pending";
  playCampaign(seed, "passive", weeks, "democrat", undefined, {
    decide(state, step) {
      if (!order || step !== 0) return [];
      const request = { actor: US, target: IRN, instrument: "military", rung: 3 };
      const projected = projectAction(state, request, createRngStreams(state.seed));
      odds = projected.ok ? r(projected.projection.successChance, 3) : null;
      const result = issueAction(state, request, createRngStreams(state.seed));
      issued = result.ok ? "issued" : `refused: ${result.missingCapability}`;
      return result.ok ? [result.packet] : [];
    },
    observeWeek(state) {
      rows.push(weekRow(state));
      if (outcome === "pending") outcome = outcomeOf(state) ?? "pending";
    },
  });
  return { issued, odds, outcome, rows };
}

function blockadeMode(weeks) {
  const out = SEEDS.map((seed) => {
    const control = blockadeRun(seed, weeks, false);
    const act = blockadeRun(seed, weeks, true);
    const at = (week) => {
      const a = act.rows[week];
      const c = control.rows[week];
      return a && c ? { ...a, controlBrent: c.brent, controlPump: c.pump, controlInflation: c.usInflation, approvalVsControl: r(a.approval - c.approval) } : null;
    };
    return { seed, issued: act.issued, odds: act.odds, outcome: act.outcome, weeks: [0, 3, 8, 12, weeks - 1].map(at).filter(Boolean) };
  });
  console.log(JSON.stringify({ mode: "blockade", dist, weeks, seeds: out }, null, 1));
}

function npcMode(weeks) {
  const out = SEEDS.map((seed) => {
    const { campaign: founded } = foundedForBalance(seed);
    let last;
    const brent = [];
    playCampaign(seed, "passive", weeks, "democrat", undefined, {
      observeWeek(state) {
        last = state;
        brent.push(prices(state).brent);
      },
    });
    const events = [];
    for (const edge of Object.values(last.relationships)) for (const event of edge.history ?? []) if (event.kind === "blockade") events.push(`${edge.from}>${edge.to}`);
    const pairs = {};
    for (const pair of events) pairs[pair] = (pairs[pair] ?? 0) + 1;
    const top = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pair, n]) => `${pair}:${n}`);
    const records = Object.values(last.blockades ?? {});
    const ratchet = Object.entries(last.nations)
      .map(([id, nation]) => [id, nation.stats.trade.imports / founded.nations[id].stats.trade.imports])
      .filter(([, ratio]) => ratio < 0.999)
      .sort((a, b) => a[1] - b[1]);
    const wars = Object.values(last.conflicts).filter((conflict) => !conflict.inherited);
    return {
      seed,
      blockadeEventsInHistory: events.length,
      blockadeRecords: blockades ? records.length : null,
      inForceAtEnd: blockades ? blockades.blockadesInForce(last).length : null,
      topPairs: top.join(" "),
      importsBelowFounding: ratchet.length,
      lowestImportsRatio: ratchet.length > 0 ? `${ratchet[0][0]}:${r(ratchet[0][1], 3)}` : "-",
      warsOpened: wars.length,
      warsOpenedByBlockade: wars.filter((conflict) => conflict.opening === "blockade").length,
      warsOpenedByRetaliation: wars.filter((conflict) => conflict.opening === "retaliation").length,
      brentAtEnd: prices(last).brent,
      brentMean: r(brent.reduce((sum, value) => sum + value, 0) / brent.length, 2),
      brentMax: Math.max(...brent),
      weeksBrentOver90: brent.filter((value) => value > 90).length,
      approvalAtEnd: r(last.player.metrics.approval),
    };
  });
  console.log(JSON.stringify({ mode: "npc", dist, weeks, seeds: out }, null, 1));
}

if (mode === "npc") npcMode(Number(weeksArg ?? 208));
else blockadeMode(Number(weeksArg ?? 26));
