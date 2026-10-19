// A weekly simulator of the DESIGN.md model, pure arithmetic, no engine import.
// Six judgments revise toward targets (fast when salient), valence from the weighted judgments,
// rally stock, scandal stories (the engine's stage constants), credibility debt, erosion, five blocs.
import { blocApprovals, headline, gallup2025Shares, sigma, logit, FIT, clamp, erosionPassThrough } from "./design-blocs.mjs";

export const DRIVERS = ["prosperity", "security", "services", "integrity", "competence", "unity"];
// Today's OPINION_WEIGHTS (packages/engine/src/opinion.ts:79-86).
export const WEIGHTS = { prosperity: 0.28, security: 0.22, services: 0.16, integrity: 0.14, competence: 0.12, unity: 0.08 };
// Salience multipliers: today's set plus one for a debacle (proposed).
export const SALIENCE = {
  atWar: { security: 1.7 },
  conditionActive: { services: 1.7, competence: 1.25 },
  economicPain: { prosperity: 1.45 },
  scandalLive: { integrity: 1.6 },
  debacle: { competence: 1.6, security: 1.2 },
};
export const PARAMS = {
  S: Number(process.env.DESIGN_S ?? 12), // valence logit per unit of weighted judgment: maps the record's V range (Bush yr8 -3.0 to Obama yr1 +1.7, design-fit) onto raw 0.30-0.69
  revise: 0.06, // weekly revision toward target (today's OPINION_DRIFT)
  reviseSalient: 0.2, // proposed: a judgment on the front page is revised faster
  salienceHold: 8, // proposed: a salience key holds this many weeks after the news that fired it
  // Scandal stage constants as in packages/engine/src/press-scandal.ts
  breakIntensity: 0.5, legsStep: 0.09, developTurns: 6, fadeStep: 0.18,
  scandalIntegrityWeight: 0.4, // proposed (today 0.25)
  debtRate: 0.03, debtCap: 0.45, debtHalfLife: 52, // proposed credibility debt
  integrityFloor: 0.4, // today's PARTISAN_BASE_INTEGRITY_FLOOR
  inquiryExposure: 0.6, // proposed: an open inquiry keeps this much exposure
};

function weightsFor(keys) {
  const raw = { ...WEIGHTS };
  for (const k of keys) for (const [d, m] of Object.entries(SALIENCE[k] ?? {})) raw[d] *= m;
  const t = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(raw).map(([d, v]) => [d, v / t]));
}

function storyHeat(age, legs, crest = PARAMS.developTurns) {
  if (age < 0) return 0;
  if (age === 0) return PARAMS.breakIntensity;
  if (!legs) return 0;
  const peak = clamp(PARAMS.breakIntensity + Math.min(age, crest) * PARAMS.legsStep, 0, 1);
  return clamp(peak - Math.max(0, age - crest) * PARAMS.fadeStep, 0, 1);
}

/**
 * Solve the even judgment level x so that the headline at week 0 equals `baseline` (0..1), then run.
 * schedule: array of { week, ... } events:
 *   { target: {driver: delta}, hold?: weeks (default forever), ramp?: weeks }  shift a target (optionally ramped in, optionally expiring)
 *   { salient: key }                       fire a salience key (holds PARAMS.salienceHold weeks)
 *   { rally: rho0, halfLife }              add a rally impulse in valence units
 *   { story: gravity, legs = true, crest } a scandal story breaks
 *   { inquiry: true|false }                an inquiry opens or closes
 *   { siege: logit, weeks }                own side's defensive term for a span
 */
export function simulate({ weeks, P = 1, party = "R", baseline, schedule = [], shares = gallup2025Shares(party), fit = FIT, start }) {
  const startX = start ?? solveStart(baseline, P, shares, fit);
  const m = Object.fromEntries(DRIVERS.map((d) => [d, startX]));
  const base = { ...m };
  let debt = 0, inquiry = false;
  const rallies = [], stories = [], shifts = [], firing = {}, sieges = [];
  const out = [];
  for (let w = 0; w <= weeks; w++) {
    for (const e of schedule.filter((x) => x.week === w)) {
      if (e.target) shifts.push({ from: w, ramp: e.ramp ?? 0, hold: e.hold ?? Infinity, delta: e.target });
      if (e.salient) firing[e.salient] = w + PARAMS.salienceHold;
      if (e.rally !== undefined) rallies.push({ from: w, rho: e.rally, h: e.halfLife });
      if (e.story !== undefined) { stories.push({ from: w, g: e.story, legs: e.legs ?? true, crest: e.crest }); firing.scandalLive = Math.max(firing.scandalLive ?? 0, w + PARAMS.salienceHold); }
      if (e.inquiry !== undefined) inquiry = e.inquiry;
      if (e.siege !== undefined) sieges.push({ from: w, until: w + e.weeks, v: e.siege });
    }
    const keys = Object.entries(firing).filter(([, until]) => w <= until).map(([k]) => k);
    const live = stories.map((s) => storyHeat(w - s.from, s.legs, s.crest) * s.g);
    const liveSum = live.reduce((a, b) => a + b, 0);
    if (liveSum > 0) firing.scandalLive = Math.max(firing.scandalLive ?? 0, w);
    // An open inquiry keeps the file in the news: it accrues debt as a story at the inquiry's exposure would.
    debt = Math.min(PARAMS.debtCap, debt * 0.5 ** (1 / PARAMS.debtHalfLife) + PARAMS.debtRate * (liveSum + (inquiry ? PARAMS.inquiryExposure : 0)));
    const target = { ...base };
    for (const s of shifts) {
      if (w < s.from || w > s.from + s.ramp + s.hold) continue;
      const k = s.ramp > 0 ? Math.min(1, (w - s.from) / s.ramp) : 1;
      for (const [d, v] of Object.entries(s.delta)) target[d] += v * k;
    }
    // A polarized public discounts the story: the same pass-through that filters erosion filters the charge.
    target.integrity -= erosionPassThrough(P) * (PARAMS.scandalIntegrityWeight * liveSum + debt);
    const salientDrivers = new Set(keys.flatMap((k) => Object.keys(SALIENCE[k] ?? {})));
    for (const d of DRIVERS) {
      const t = clamp(target[d], 0, 1);
      const r = salientDrivers.has(d) ? PARAMS.reviseSalient : PARAMS.revise;
      if (w > 0) m[d] = clamp(m[d] + r * (t - m[d]), 0, 1);
    }
    const wts = weightsFor(keys);
    const raw = DRIVERS.reduce((s, d) => s + wts[d] * m[d], 0);
    const rally = rallies.reduce((s, r) => s + (w >= r.from ? r.rho * 0.5 ** ((w - r.from) / r.h) : 0), 0);
    const gravity = clamp((PARAMS.integrityFloor - m.integrity) / PARAMS.integrityFloor, 0, 1);
    const exposure = clamp(liveSum + (inquiry ? PARAMS.inquiryExposure : 0), 0, 1);
    const E = gravity * exposure;
    const siege = sieges.filter((s) => w >= s.from && w < s.until).reduce((a, s) => a + s.v, 0);
    const V = PARAMS.S * (raw - 0.55) + rally;
    const a = blocApprovals({ V, P, E, siege, fit });
    out.push({ w, raw, V, E, debt, integrity: m.integrity, a, headline: headline(shares, a), keys });
  }
  return out;
}

export function solveStart(baseline, P, shares, fit) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const x = (lo + hi) / 2;
    const raw = x; // even judgments, resting weights: raw equals x
    const h = headline(shares, blocApprovals({ V: PARAMS.S * (raw - 0.55), P, fit }));
    if (h < baseline) lo = x; else hi = x;
  }
  return (lo + hi) / 2;
}

export function weeksBetween(a, b) {
  const p = (s) => { const [m, d, y] = s.split("/").map(Number); return Date.UTC(y < 100 ? 2000 + y : y, m - 1, d); };
  return Math.round((p(b) - p(a)) / (7 * 864e5));
}
