// Occasions catalog: run each real case through design-sim.mjs with inputs drawn from the design's
// tables, and compare to the Gallup series (American Presidency Project compilation, opened 2026-10-12).
// node docs/audits/2026-10-12-approval-model/probes/design-occasions.mjs
import { simulate, weeksBetween } from "./design-sim.mjs";
import { r1, r3 } from "./design-blocs.mjs";

function compare(id, run, start, data, note = "") {
  let se = 0;
  const cells = data.map(([d, v]) => {
    const w = weeksBetween(start, d);
    const p = run[Math.min(run.length - 1, Math.max(0, w))];
    se += (100 * p.headline - v) ** 2;
    return `${d}:${r1(p.headline)}/${v}`;
  });
  console.log(`\n${id}  rmse ${r3(Math.sqrt(se / data.length))} pts ${note}`);
  console.log("  model/Gallup", cells.join(" "));
}
const blocs = (row) => row.a.map(r1).join("/");

// ---- Watergate. P 0.5 assumed (no party series opened for 1973). Five revelation beats placed at the
// series' visible drops; an inquiry open from the second beat; the 1973 ceasefire rally at the start.
{
  const start = "01/26/1973";
  const beats = ["04/20/1973", "07/13/1973", "10/19/1973", "01/18/1974", "05/03/1974", "07/26/1974"].map((d) => weeksBetween(start, d));
  const schedule = [
    { week: 0, rally: 0.9, halfLife: 6 },
    ...beats.map((week) => ({ week, story: 1 })),
    { week: beats[1], inquiry: true },
  ];
  const run = simulate({ weeks: 80, P: 0.5, party: "R", baseline: 0.56, schedule });
  compare("Watergate 1973-74", run, start, [["01/26/1973",67],["03/30/1973",57],["05/04/1973",45],["06/22/1973",44],["08/03/1973",31],["09/21/1973",33],["10/19/1973",27],["12/07/1973",29],["02/22/1974",25],["04/19/1974",26],["06/21/1974",26],["08/02/1974",24]], "(baseline 56 before the ceasefire lift)");
  const end = run[run.length - 1];
  console.log("  end: integrity", r3(end.integrity), "debt", r3(end.debt), "erosion", r3(end.E), "blocs ownId/ownLean/pure/oppLean/oppId", blocs(end), "(Roper: Republican disapproval 38%)");
}

// ---- Iran-Contra. P 0.55 assumed. One gravity-1 revelation, then an inquiry open for a year.
{
  const start = "10/24/1986";
  const schedule = [{ week: 2, story: 1 }, { week: 3, inquiry: true }, { week: 3, salient: "debacle" }, { week: 3, target: { competence: -0.15 }, hold: 52 }, { week: 55, inquiry: false }];
  const run = simulate({ weeks: 60, P: 0.55, party: "R", baseline: 0.63, schedule });
  compare("Iran-Contra 1986-87", run, start, [["10/24/1986",63],["12/04/1986",47],["01/16/1987",48],["03/06/1987",43],["04/10/1987",48],["06/05/1987",47],["07/10/1987",49],["08/24/1987",49],["10/23/1987",51],["12/04/1987",49]]);
  const w6 = run[6];
  console.log("  week 6 erosion", r3(w6.E), "integrity", r3(w6.integrity), "debt", r3(w6.debt));
}

// ---- Lewinsky. P 0.63 (fitted for 1996). A gravity-1 story with legs; integrity never crosses the 0.4
// line under a strong economy, so erosion stays 0; the State of the Union and the economy lift
// prosperity; a party-line impeachment on a charge the public does not read as grave gives the own side
// a siege term for four weeks.
{
  const start = "01/16/1998";
  const schedule = [
    // Charge gravity 0.4: private conduct, not abuse of office (the design's charge table).
    { week: 1, story: 0.4 },
    { week: 1, siege: 0.6, weeks: 10 },
    { week: 2, target: { prosperity: 0.12 }, ramp: 2 },
    { week: 32, story: 0.4 },
    { week: 32, inquiry: true },
    { week: 48, siege: 0.8, weeks: 4 },
    { week: 48, rally: 0.5, halfLife: 3 },
    { week: 56, inquiry: false },
  ];
  const run = simulate({ weeks: 70, P: 0.63, party: "D", baseline: 0.6, schedule });
  compare("Lewinsky 1998-99", run, start, [["01/16/1998",60],["01/30/1998",69],["02/20/1998",66],["04/17/1998",63],["06/22/1998",60],["08/21/1998",62],["09/14/1998",63],["10/29/1998",66],["12/15/1998",63],["12/19/1998",73],["01/15/1999",69],["02/12/1999",68],["03/19/1999",64],["04/30/1999",60]]);
  console.log("  max erosion over the run", r3(Math.max(...run.map((x) => x.E))), "min integrity", r3(Math.min(...run.map((x) => x.integrity))));
}

// ---- A story that fizzles (no legs): one week at break intensity, gravity 0.7, at P = 1 from 45%.
{
  const run = simulate({ weeks: 26, P: 1, party: "D", baseline: 0.45, schedule: [{ week: 2, story: 0.7, legs: false }] });
  const low = Math.min(...run.map((x) => x.headline));
  console.log("\nFizzle: low", r1(low), "from 45.0; week 26", r1(run[26].headline), "debt", r3(run[26].debt));
  const ran = simulate({ weeks: 26, P: 1, party: "D", baseline: 0.45, schedule: [{ week: 2, story: 0.7 }] });
  console.log("Same story with legs: low", r1(Math.min(...ran.map((x) => x.headline))), "week 26", r1(ran[26].headline), "debt", r3(ran[26].debt));
  const grave = simulate({ weeks: 52, P: 1, party: "D", baseline: 0.45, schedule: [{ week: 2, story: 1 }, { week: 10, story: 1 }, { week: 18, story: 1 }, { week: 10, inquiry: true }] });
  const g = grave.reduce((lo, x) => (x.headline < lo.headline ? x : lo));
  console.log("Grave three-beat scandal at P=1: low", r1(g.headline), "week", g.w, "erosion", r3(g.E), "blocs", blocs(g));
}

// ---- Iraq 2003-2006. P 0.82. Rally from the rally table (war launched, contested case), then an
// insurgency rising over two years (security target -0.4 x insurgency to 0.5), casualties on the
// engine's log term to the 'thousands' band, and a competence charge as the war goes badly.
{
  const start = "03/19/2003";
  const schedule = [
    { week: 0, rally: 2.0, halfLife: 8 },
    { week: 0, salient: "atWar" },
    { week: 20, target: { security: -0.2 }, ramp: 100 },
    { week: 20, target: { security: -0.13 }, ramp: 140 },
    { week: 30, target: { competence: -0.15 }, ramp: 100 },
    // The case for the war unravels: a story of gravity 0.6 (the design's charge table: misled the country).
    { week: 24, story: 0.6 },
    { week: 125, salient: "conditionActive" },
    { week: 125, target: { services: -0.2, competence: -0.08 }, hold: 26 },
  ];
  for (let w = 26; w <= 170; w += 26) schedule.push({ week: w, salient: "atWar" });
  const run = simulate({ weeks: 170, P: 0.82, party: "R", baseline: 0.58, schedule });
  compare("Iraq 2003-06 (with Katrina at week 125)", run, start, [["03/22/2003",71],["05/19/2003",66],["07/18/2003",59],["09/19/2003",50],["11/14/2003",50],["01/29/2004",49],["06/03/2004",49],["10/22/2004",51],["03/21/2005",45],["06/24/2005",45],["08/28/2005",45],["09/16/2005",40],["11/11/2005",37],["03/10/2006",36],["05/05/2006",31]]);
}

// ---- Katrina alone, P 0.82, from 45: a relief condition at severity 0.7 (services carrying term
// 0.7 - 0.6 x 0.7 = 0.28, a 0.42 drop at full money) and a competence charge, salience on onset.
{
  const run = simulate({ weeks: 16, P: 0.82, party: "R", baseline: 0.45, schedule: [{ week: 0, salient: "conditionActive" }, { week: 0, target: { services: -0.3, competence: -0.08 }, hold: 26 }] });
  compare("Katrina 2005 alone", run, "08/28/2005", [["08/28/2005",45],["09/08/2005",46],["09/16/2005",40],["09/26/2005",44],["10/13/2005",39],["10/28/2005",41],["11/11/2005",37],["12/09/2005",42]]);
}

// ---- Biden mid-2021 to early 2022, P 1. COVID resurgence (services), the Afghanistan exit (a debacle:
// competence charge with a 26-week memory, salience), and inflation running past the term start
// (prosperity target falling with economic-pain salience).
{
  const start = "06/01/2021";
  const schedule = [
    { week: 5, target: { services: -0.1 }, hold: 20 },
    { week: 11, salient: "debacle" },
    { week: 11, target: { competence: -0.25 }, hold: 26 },
    { week: 8, target: { prosperity: -0.18 }, ramp: 40 },
    { week: 20, salient: "economicPain" }, { week: 28, salient: "economicPain" }, { week: 36, salient: "economicPain" }, { week: 44, salient: "economicPain" }, { week: 52, salient: "economicPain" },
  ];
  const run = simulate({ weeks: 60, P: 1, party: "D", baseline: 0.56, schedule });
  compare("Biden 2021-22", run, start, [["6/1/21",56],["7/6/21",50],["8/2/21",49],["9/1/21",43],["10/1/21",42],["11/1/21",42],["12/1/21",43],["1/3/22",40]]);
  const sep = run[weeksBetween(start, "9/10/21")];
  console.log("  Sept 2021 blocs", blocs(sep), "(Gallup Sep 1-17: Democrats 90, independents 37, Republicans 6)");
}

// ---- G.H.W. Bush 1991-92: the fitted Gulf rally (design-rallies) fading into a recession.
{
  const start = "01/16/1991";
  const schedule = [{ week: 0, rally: 2.36, halfLife: 20 }, { week: 30, target: { prosperity: -0.2 }, ramp: 40 }, { week: 40, salient: "economicPain" }, { week: 48, salient: "economicPain" }, { week: 56, salient: "economicPain" }, { week: 64, salient: "economicPain" }, { week: 72, salient: "economicPain" }, { week: 80, salient: "economicPain" }];
  const run = simulate({ weeks: 85, P: 0.6, party: "R", baseline: 0.61, schedule });
  compare("Gulf War into the 1992 recession", run, start, [["02/28/1991",89],["05/02/1991",74],["07/25/1991",71],["09/26/1991",66],["11/21/1991",52],["01/03/1992",46],["02/19/1992",39],["04/09/1992",39],["06/12/1992",37],["07/31/1992",29]]);
}

// ---- Pandemic 2020, P 1: the fitted small rally, then services and prosperity charges and unrest.
{
  const start = "03/11/2020";
  const schedule = [{ week: 0, rally: 0.6, halfLife: 6 }, { week: 0, salient: "conditionActive" }, { week: 3, target: { services: -0.15, prosperity: -0.08 }, ramp: 8 }, { week: 10, salient: "debacle" }, { week: 10, target: { competence: -0.1, security: -0.05 }, hold: 12 }];
  const run = simulate({ weeks: 16, P: 1, party: "R", baseline: 0.44, schedule });
  compare("Pandemic and unrest 2020", run, start, [["03/13/2020",49],["04/01/2020",43],["04/14/2020",49],["05/01/2020",49],["05/28/2020",39],["06/08/2020",38]]);
}

// ---- Inverse: how far must the weighted judgments fall to reproduce each valence-driven decline,
// given the fitted blocs (S = 12)? Pure arithmetic over design-blocs.
import { blocApprovals, headline, gallup2025Shares } from "./design-blocs.mjs";
import { PARAMS } from "./design-sim.mjs";
function Vfor(party, P, target) { let lo = -8, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (headline(gallup2025Shares(party), blocApprovals({ V: m, P })) < target) lo = m; else hi = m; } return (lo + hi) / 2; }
console.log("\nInverse (valence needed, S =", PARAMS.S, ")");
for (const [id, party, P, from, to] of [["Biden Jun 2021 -> Jan 2022", "D", 1, 0.56, 0.40], ["GHW Bush Sep 1991 -> Jul 1992", "R", 0.6, 0.66, 0.29], ["Bush Mar 2005 -> May 2006", "R", 0.82, 0.45, 0.31], ["Carter Jan 1980 -> Mar 1980", "D", 0.55, 0.58, 0.39]]) {
  const dV = Vfor(party, P, to) - Vfor(party, P, from);
  const dRaw = dV / PARAMS.S;
  // Prosperity alone at full economic-pain salience carries weight 0.28*1.45/(1+0.28*0.45) of raw.
  const wP = (0.28 * 1.45) / (1 + 0.28 * 0.45);
  console.log(id, "dV", dV.toFixed(2), "d(raw)", dRaw.toFixed(3), "if prosperity alone: d(prosperity)", (dRaw / wP).toFixed(2));
}
