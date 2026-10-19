// Single-cause magnitudes at a 2020s founding (P = 1, 45 percent): a withdrawal debacle, a casualty
// tenfold, a cross-cutting program, a partisan act, honeymoon. Pure arithmetic over design-sim / design-blocs.
// node docs/audits/2026-10-12-approval-model/probes/design-decisions.mjs
import { simulate } from "./design-sim.mjs";
import { blocApprovals, headline, gallup2025Shares, r1, r3 } from "./design-blocs.mjs";

const show = (id, run, weeks) => console.log(id, weeks.map((w) => `w${w}:${r1(run[w].headline)}`).join(" "), "| blocs at", weeks[weeks.length - 1], run[weeks[weeks.length - 1]].a.map(r1).join("/"));
const base = simulate({ weeks: 30, P: 1, party: "D", baseline: 0.49, schedule: [] });
console.log("baseline blocs", base[0].a.map(r1).join("/"));

// A withdrawal that goes badly: competence charge -0.25 held 26 weeks, debacle salience; 49 -> ? (Gallup: Aug 49, Sep 43, independents 37)
show("withdrawal debacle", simulate({ weeks: 30, P: 1, party: "D", baseline: 0.49, schedule: [{ week: 1, salient: "debacle" }, { week: 1, target: { competence: -0.25 }, hold: 26 }] }), [0, 2, 4, 8, 16, 30]);
show("withdrawal debacle, -0.4", simulate({ weeks: 30, P: 1, party: "D", baseline: 0.49, schedule: [{ week: 1, salient: "debacle" }, { week: 1, target: { competence: -0.4, security: -0.1 }, hold: 26 }] }), [0, 2, 4, 8, 16, 30]);

// Casualties: the engine's war term costs security 0.08 per tenfold of the dead (opinion-war.ts CASUALTY_WEIGHT), at war salience.
for (const tenfolds of [1, 2, 3]) {
  const run = simulate({ weeks: 40, P: 1, party: "D", baseline: 0.45, schedule: [{ week: 0, salient: "atWar" }, { week: 8, salient: "atWar" }, { week: 16, salient: "atWar" }, { week: 24, salient: "atWar" }, { week: 32, salient: "atWar" }, { week: 0, target: { security: -0.08 * tenfolds }, ramp: 20 }] });
  console.log(`casualties ${tenfolds} tenfold(s): headline after 40 weeks`, r1(run[40].headline), "from 45.0", "(Mueller: war support -15 points per tenfold; this is approval, not war support)");
}

// A cross-cutting program: prosperity target +0.05 sustained.
show("program, prosperity +0.05", simulate({ weeks: 30, P: 1, party: "D", baseline: 0.45, schedule: [{ week: 0, target: { prosperity: 0.05 }, ramp: 8 }] }), [0, 8, 16, 30]);

// A partisan act through issue agreement only: I = +0.15 own, -0.15 opposition, independents -0.05.
{
  const s = gallup2025Shares("D"); const V = base[0].V;
  const before = blocApprovals({ V, P: 1 }), after = blocApprovals({ V, P: 1, I: [0.15, 0.08, -0.05, -0.15, -0.15] });
  console.log("partisan act (I own +0.15/+0.08, pure -0.05, opp -0.15): headline", r1(headline(s, before)), "->", r1(headline(s, after)), "blocs", before.map(r1).join("/"), "->", after.map(r1).join("/"));
}

// Honeymoon as a valence term 0.3 falling to 0 at week 26.
{
  const s = gallup2025Shares("D");
  for (const w of [0, 13, 26]) { const V = base[0].V + 0.3 * Math.max(0, 1 - w / 26); console.log("honeymoon week", w, "headline", r1(headline(s, blocApprovals({ V, P: 1 })))); }
}
