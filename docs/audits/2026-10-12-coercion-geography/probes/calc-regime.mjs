// Arithmetic for REGIME-CHANGE.md: the proposed equations evaluated on the committed dataset rows.
// Expected values only (no draws). Reads the founded campaign for the stats; changes nothing.
// usage: node calc-regime.mjs
const root = "";
const { foundedForBalance } = await import(`${root}packages/engine/dist/balance-harness.js`);
const { NATION_LEADER_CONSTRAINTS } = await import(`${root}packages/world/dist/index.js`);
const { campaign: c } = foundedForBalance("regime-0");
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sig = (x) => 1 / (1 + Math.exp(-x));
const PRONE = { full_democracy: 0.1, flawed_democracy: 0.4, hybrid_regime: 0.8, authoritarian: 1, one_party_state: 0.5, military_junta: 1.5, absolute_monarchy: 0.4, constitutional_monarchy_executive: 0.4, theocracy: 0.5 };
const DEMOCRACY = new Set(["full_democracy", "flawed_democracy"]);
// --- planning constants (the design's dials) ---
const P_MAX = 0.06, K_SLOPE = 8, THETA = 0.15;
const E0 = 0.006;
let MU = 0.1;
const BRIGADE_YEAR_2008 = 7200, CPI_2008 = 215.303, CPI_2026 = 331.655; // repo anchors (CRS R40682 via force-cost-anchors.ts)
const BRIGADE_YEAR_2026 = BRIGADE_YEAR_2008 * CPI_2026 / CPI_2008;

function patron(t, actor = "USA") {
  let best = { id: null, v: 0 };
  for (const rel of Object.values(c.relationships)) {
    if (rel.from === actor || rel.from === t || rel.to !== t) continue;
    const p = c.nations[rel.from]; if (!p) continue;
    const v = Math.max(0, rel.alignment) * p.base.bands.powerTier / 5 * (p.stats.security.intelCapability >= 0.5 ? 1 : 0.5);
    if (v > best.v) best = { id: rel.from, v };
  }
  return best;
}
function rivalAmbition(t) {
  const armed = ["role-defense-minister", "role-intelligence-director", "role-junta-chairman"];
  return Math.max(0, ...Object.values(c.people).filter((p) => p.alive && p.base.nationality === t && p.currentRole === undefined && p.base.eligibleRoles.some((x) => armed.includes(x))).map((p) => p.base.ambition));
}
export function state(t) {
  const n = c.nations[t], pol = n.stats.politics, sec = n.stats.security, regime = NATION_LEADER_CONSTRAINTS[t]?.regime;
  const prone = PRONE[regime] ?? 1;
  const K = clamp01(0.9 - 0.4 * prone / 1.5 - 0.3 * sec.corruptionIndex + 0.2 * (n.stats.military.doctrineQuality - 0.5));
  const P = patron(t);
  const H = clamp01(0.30 * pol.regimeStability + 0.20 * pol.legitimacy + 0.25 * K + 0.15 * (1 - pol.factionalism) + 0.10 * P.v);
  const open = ["one-party", "none"].includes(n.base.partySystem.contest) ? 0.6 : 1;
  const civ = clamp01(0.5 * pol.protestPressure + 0.5 * (1 - pol.legitimacy)) * open;
  const arm = sec.insurgencyPressure;
  const mil = rivalAmbition(t) * prone / 1.5 * (1 - pol.regimeStability);
  const Q = 0.4 * (n.base.bands.wealthTier - 1) / 4 + 0.3 * (1 - pol.factionalism) + 0.3 * (DEMOCRACY.has(regime) ? 1 : 0);
  return { t, regime, S: pol.regimeStability, G: pol.legitimacy, F: pol.factionalism, K: r(K), patron: P.id, Pv: r(P.v), H: r(H), civ: r(civ), arm: r(arm), mil: r(mil), cI: sec.counterIntel, Q: r(Q), pop: n.stats.demography.population, wealth: n.base.bands.wealthTier };
}
const phi = (s) => 1 - (1 - 0.5 * s.civ) * (1 - 0.5 * s.arm) * (1 - 0.5 * s.mil);
const pc = (Phi, H) => P_MAX * sig(K_SLOPE * (Phi - H - THETA));

// --- W1: covert coup support, 52 weeks ---
function coupSupport(t, weeks = 52, cov = 0.6) {
  const s0 = state(t); let s = { ...s0 }; let notFallen = 1, notExposed = 1; const rows = [];
  const base = pc(phi(s0), s0.H);
  for (let w = 1; w <= weeks; w++) {
    s = { ...s, mil: s.mil + 0.05 * cov * (1 - s.mil) - 0.01 * s.mil * s.K };
    const add = Math.max(0, pc(phi(s), s.H) - base);
    notFallen *= 1 - add;
    notExposed *= 1 - E0 * 1 * (0.5 + s.cI) * (1.5 - 0.85);
    if ([4, 13, 26, 52].includes(w)) rows.push({ w, mil: r(s.mil), Phi: r(phi(s)), weeklyAdded: r(add, 4), fallenBy: r(1 - notFallen), exposedBy: r(1 - notExposed) });
  }
  return { start: s0, Phi0: r(phi(s0)), base: r(base, 4), rows };
}
// successor draw weights at the fall: s_i^2
function successor(s) {
  const w = { civ: s.civ ** 2, arm: s.arm ** 2, mil: s.mil ** 2 }; const tot = w.civ + w.arm + w.mil;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, r(v / tot)]));
}
// --- W2: Venezuela, recognition + sanctions + standing naval pressure; raid option ---
function venezuela(weeks = 52, R = 0.3) {
  const s0 = state("VEN"); let s = { ...s0, civ: clamp01(s0.civ + 0.10 * R), G: s0.G - 0.05 * R };
  s.H = clamp01(s0.H - 0.20 * 0.05 * R);
  const base = pc(phi(s0), s0.H); let notFallen = 1; const rows = [];
  for (let w = 1; w <= weeks; w++) {
    // sanctions bite on the security forces' pay (defection), patron support holds the floor
    s = { ...s, civ: s.civ + 0.003 * R * (1 - s.civ), K: Math.max(0, s.K - 0.001 * (1 - 2 * s0.Pv)), S: Math.max(0, s.S - 0.001) };
    s.H = clamp01(0.30 * s.S + 0.20 * s.G + 0.25 * s.K + 0.15 * (1 - s.F) + 0.10 * s0.Pv);
    const add = Math.max(0, pc(phi(s), s.H) - base); notFallen *= 1 - add;
    if ([13, 26, 52].includes(w)) rows.push({ w, H: r(s.H), civ: r(s.civ), Phi: r(phi(s)), weeklyAdded: r(add, 4), fallenBy: r(1 - notFallen) });
  }
  const cov = 0.7, pRaid = clamp01(0.9 * cov - 0.3 * s0.cI - 0.2 * 2 / 5);
  const L = 0.6; // standing leverage after a raid: naval presence + sanctions held, 0..1
  const Hraid = clamp01(s.H - 0.15);
  return { start: s0, rows, raid: { pSuccess: r(pRaid), holdAfter: r(Hraid), successorAlignmentShift: r(0.5 * L * (1 - Hraid)) } };
}
// --- W3: invasion and occupation, weekly for 8 years ---
function occupation(t, plan, disband = true, mu = MU) {
  const s0 = state(t);
  const Gs = 0.15 + 0.35 * s0.Q; // imposed successor legitimacy
  const Tstar = s0.pop * 0.004;
  let I = 0.15, deaths = 0, cost = 0, G = Gs, at388 = 0; const rows = [];
  for (let w = 1; w <= plan.length; w++) {
    const B = plan[w - 1], T = B * 9000;
    const Gr = 0.4 * (1 - G) + 0.3 * (disband ? 1 : 0.2) + 0.3 * s0.F;
    I = clamp01(I + 0.03 * Gr * (1 - I) - 0.02 * (T / Tstar) * I);
    G = clamp01(G + 0.0015 * (1 - I) - 0.001 * I);
    const d = mu * I * T / 1000; deaths += d; if (w === 388) at388 = deaths;
    cost += B * BRIGADE_YEAR_2026 / 52;
    if (w % 52 === 0) rows.push({ year: w / 52, brigades: B, troops: T, insurgency: r(I), successorLegit: r(G), usDeathsCum: Math.round(deaths), costCumUSDbn_2026: r(cost / 1000, 1) });
  }
  return { Gs: r(Gs), Tstar: Math.round(Tstar), deathsAtWeek388: Math.round(at388), rows };
}
const yr = (n, b) => Array(52 * n).fill(b);
const iraqPlan = [...yr(4, 17), ...yr(1, 20), ...yr(1, 15), ...yr(1, 10), ...yr(1, 5)];
console.log("states", JSON.stringify(["HTI", "MLI", "VEN", "IRQ", "IRN", "CUB", "NIC", "PRK", "CHL", "GTM", "PAN"].map((t) => { const s = state(t); return { ...s, Phi0: r(phi(s)), basePc: r(pc(phi(s), s.H), 4) }; }).map((x) => [x.t, x.regime, "H", x.H, "K", x.K, "patron", x.patron, x.Pv, "civ", x.civ, "arm", x.arm, "mil", x.mil, "Phi0", x.Phi0, "basePc", x.basePc, "Q", x.Q])));
console.log("W1 HTI", JSON.stringify(coupSupport("HTI"), null, 0));
console.log("W1 HTI successor weights at fall (week 52 state)", successor({ ...state("HTI"), mil: coupSupport("HTI").rows.at(-1).mil }));
console.log("W1 CUB", JSON.stringify(coupSupport("CUB").rows));
console.log("W1 GTM", JSON.stringify(coupSupport("GTM").rows));
console.log("W2 VEN", JSON.stringify(venezuela(), null, 0));
{ const tmp = (m) => { MU = m; return occupation("IRQ", iraqPlan, true).deathsAtWeek388; }; let lo = 0.01, hi = 1; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (tmp(mid) < 4418) lo = mid; else hi = mid; } MU = r((lo + hi) / 2, 4); console.log("fitted mu (US deaths per week per 1,000 troops per unit insurgency)", MU); }
console.log("W3 IRQ disband", JSON.stringify(occupation("IRQ", iraqPlan, true)));
console.log("W3 IRQ retain army", JSON.stringify(occupation("IRQ", iraqPlan, false).rows.at(-1)));
console.log("brigade-year 2026 $M", r(BRIGADE_YEAR_2026, 1), "per troop-year $M", r(BRIGADE_YEAR_2026 / 9000, 3));
