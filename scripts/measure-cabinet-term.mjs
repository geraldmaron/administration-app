// How often the cabinet breaks over a term, per party, for idle and careful play.
//
// The cabinet's band is stated per term (6-15 leaks and 2-8 departures, a
// departure being a challenge or a resignation; the departures are the
// first-term record's range in Brookings' Cabinet turnover series, the 2001
// cabinet's 2 to the 1989 cabinet's 8, datawrapper.dwcdn.net/PXOek/2), and the term gate holds it for
// the Democrat only, because the other two parties' term runs would double that
// file's cost. This runs the same two proxies over the same four electoral
// seeds and the same two-term horizon for every party, so the band can be read
// for all three from one command after a build.
//
//   node scripts/measure-cabinet-term.mjs [--party democrat|republican|independent] [--engine <dist dir>]
//
// Empty chairs are reported beside the counts, because turning a break into a
// departure empties a chair, and a chair nobody refills costs the government
// services for the rest of the term.
//
// `dist/` is tracked and stale until the workspace is rebuilt; a figure taken
// from a stale build is a figure about a build nobody is running.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const PARTIES = ["democrat", "republican", "independent"];
const parties = option("--party") ? [option("--party")] : PARTIES;
const engineDir = resolve(option("--engine") ?? new URL("../packages/engine/dist", import.meta.url).pathname);
const load = (file) => import(pathToFileURL(resolve(engineDir, file)).href);

const { electoralSeeds, foundedForBalance, playCampaign, TERM_HORIZON_TURNS } = await load("balance-harness.js");
const { cabinetPerTerm } = await load("cast-breaks.js");

const PROXIES = ["passive", "prudent"];
const SEEDS = electoralSeeds(4);
const TERM_WEEKS = 208;
const round3 = (value) => Math.round(value * 1000) / 1000;
const mean = (values) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

function emptyChairWeeks(seed, party) {
  const founded = foundedForBalance(seed, party).campaign;
  const roles = Object.keys(founded.player.cabinet).filter((role) => role !== founded.founding.leadRole);
  return (state) =>
    roles.filter((role) => {
      const holder = state.player.cabinet[role];
      return holder === undefined || state.people[holder]?.alive !== true;
    }).length;
}

function measure(party, proxy) {
  const runs = SEEDS.map((seed) => {
    const empty = emptyChairWeeks(seed, party);
    let emptyWeeks = 0;
    const outcome = playCampaign(seed, proxy, TERM_HORIZON_TURNS, party, {}, {
      observeWeek: (state) => {
        emptyWeeks += empty(state);
      },
    });
    return { outcome, emptyChairs: emptyWeeks / Math.max(1, outcome.turnsPlayed) };
  });
  const perTerm = cabinetPerTerm(runs.map((run) => run.outcome));
  return {
    party,
    proxy,
    seeds: SEEDS.length,
    leaks: perTerm.leak,
    challenges: perTerm.challenge,
    resignations: perTerm.resignation,
    departures: round3(perTerm.challenge + perTerm.resignation),
    meanEmptyChairs: round3(mean(runs.map((run) => run.emptyChairs))),
    weeksPlayed: round3(mean(runs.map((run) => run.outcome.turnsPlayed))),
  };
}

const inBand = (row) => row.leaks >= 6 && row.leaks <= 15 && row.departures >= 2 && row.departures <= 8;

for (const party of parties) {
  for (const proxy of PROXIES) {
    const row = measure(party, proxy);
    console.log(
      `[cabinet term] ${party.padEnd(11)} ${proxy.padEnd(8)} leaks ${row.leaks} departures ${row.departures} ` +
        `(challenges ${row.challenges}, resignations ${row.resignations}) empty chairs ${row.meanEmptyChairs} ` +
        `over ${row.weeksPlayed} weeks, ${row.seeds} seeds per ${TERM_WEEKS}-week term: ${inBand(row) ? "inside" : "OUTSIDE"} 6-15 leaks, 2-8 departures`,
    );
  }
}
