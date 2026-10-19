// Read-only attribution of the Democrat investment-versus-careful approval gap:
// plays one seed under both fiscal proxies and prints where the weekly gap comes from.
// Reads built dist, so run after `pnpm run build`. One seed per process: node scripts/dev/balance-attribution.mjs balance-N
const root = new URL("../../", import.meta.url).href;
const { playCampaign } = await import(`${root}packages/engine/dist/balance-harness.js`);
const { FISCAL_PROXY_PROFILES } = await import(`${root}packages/engine/dist/balance-proxies.js`);
const { selectFiscalStatement } = await import(`${root}packages/engine/dist/fiscal.js`);
const { opinionTargets, opinionCausesFor } = await import(`${root}packages/engine/dist/opinion-causes.js`);
const { OPINION_DRIVERS, OPINION_WEIGHTS, salientWeights, selectSalience } = await import(`${root}packages/engine/dist/opinion.js`);
const { debtToGdp } = await import(`${root}packages/world/dist/index.js`);

const [seed] = process.argv.slice(2);
if (!/^balance-(?:[0-9]|10|11)$/.test(seed ?? ""))
  throw new Error("usage: node scripts/dev/balance-attribution.mjs balance-N (N=0..11)");
const round = (value) => Math.round(value * 1e6) / 1e6;
const signs = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)]));

function capture(name) {
  const profile = FISCAL_PROXY_PROFILES[name];
  const weeks = [];
  const events = new Map();
  let ledgerLength = 0;
  let last;
  const outcome = playCampaign(seed, profile, 208, "democrat", undefined, {
    observeWeek(state) {
      const nation = state.nations[state.founding.nation];
      const statement = selectFiscalStatement(state);
      const newEntries = state.ledger.slice(ledgerLength);
      ledgerLength = state.ledger.length;
      for (const entry of newEntries) {
        if (entry.cost?.approval === undefined) continue;
        const key = `${entry.actor}:${entry.description}`;
        const row = events.get(key) ?? { count: 0, approvalCost: 0 };
        row.count += 1;
        row.approvalCost += entry.cost.approval;
        events.set(key, row);
      }
      const week = weeks.length + 1;
      const mood = state.player.opinion;
      const weights = salientWeights(state);
      const targets = opinionTargets(state);
      const snapshot = {
        week, approval: state.player.metrics.approval,
        mood: Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, mood[driver]])),
        target: targets, weights, salience: selectSalience(state),
        growth: nation.stats.economy.growth,
        unemployment: nation.stats.economy.unemployment,
        inflation: nation.stats.economy.inflation,
        debtRatio: debtToGdp(nation.stats),
        interestShare: statement.outlay.debtService / statement.revenueTotal,
        fiscalPolicy: state.player.policies.fiscal ?? "fiscal-continuity",
      };
      weeks.push(snapshot);
      last = state;
    },
  });
  const causes = Object.fromEntries(OPINION_DRIVERS.map((driver) =>
    [driver, opinionCausesFor(last, driver).map(({ key, contribution }) => ({ key, contribution }))]));
  const topEvents = [...events].map(([description, row]) => ({ description, count: row.count, approvalCost: round(row.approvalCost) }))
    .sort((a, b) => Math.abs(b.approvalCost) - Math.abs(a.approvalCost)).slice(0, 12);
  return { name, weeks, causes, topEvents,
    outcome: { turnsPlayed: outcome.turnsPlayed, ending: outcome.ending,
      closingApproval: outcome.metricSeries.at(-1)?.approval,
      approvalMovement: outcome.approvalMovement,
      elections: outcome.elections,
    },
  };
}

const careful = capture("careful-without-fiscal");
const investment = capture("investment-only");
const pairs = investment.weeks.map((week, index) => {
  const base = careful.weeks[index];
  return base ? { week: week.week,
    approvalGap: round(week.approval - base.approval),
    componentGap: signs(Object.fromEntries(OPINION_DRIVERS.map((driver) =>
      [driver, week.mood[driver] * week.weights[driver] - base.mood[driver] * base.weights[driver]]))),
    targetGap: signs(Object.fromEntries(OPINION_DRIVERS.map((driver) =>
      [driver, week.target[driver] - base.target[driver]]))),
    growthGap: round(week.growth - base.growth),
    unemploymentGap: round(week.unemployment - base.unemployment),
    inflationGap: round(week.inflation - base.inflation),
    debtGap: round(week.debtRatio - base.debtRatio),
    interestGap: round(week.interestShare - base.interestShare),
    investmentSalience: week.salience,
    carefulSalience: base.salience,
  } : undefined;
}).filter(Boolean);
const checkpoints = pairs.filter((row) => row.week === 1 || row.week % 13 === 0 || row.week === pairs.length);
const peak = pairs.reduce((best, row) => !best || row.approvalGap > best.approvalGap ? row : best, undefined);
const trough = pairs.reduce((best, row) => !best || row.approvalGap < best.approvalGap ? row : best, undefined);
const finalGap = round(investment.outcome.closingApproval - careful.outcome.closingApproval);
const compact = ({ name, weeks, ...rest }) => ({ ...rest,
  checkpoints: weeks.filter((row) => row.week === 1 || row.week % 52 === 0 || row.week === weeks.length)
    .map((row) => ({ ...row, approval: round(row.approval), mood: signs(row.mood),
      target: signs(row.target), weights: signs(row.weights) })),
});
console.log(JSON.stringify({ seed, finalGap, peak, trough, checkpoints,
  careful: compact(careful), investment: compact(investment),
  restingWeights: OPINION_WEIGHTS,
}));
