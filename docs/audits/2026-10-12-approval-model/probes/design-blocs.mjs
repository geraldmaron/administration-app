// Shared arithmetic for DESIGN.md: the five-bloc electorate, pure functions, no engine import.
// Every probe in this folder whose name starts with "design-" imports this file.
// Parameters marked FIT are produced by design-fit.mjs and pasted here so the other
// probes read one set; rerun design-fit.mjs to reproduce them.

export const sigma = (x) => 1 / (1 + Math.exp(-x));
export const logit = (p) => Math.log(p / (1 - p));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Bloc order is always: own identifiers, own leaners, pure independents, opposition leaners, opposition identifiers.
export const BLOCS = ["ownId", "ownLean", "pure", "oppLean", "oppId"];

// Gallup, 2025 annual aggregate of U.S. adults (news.gallup.com/poll/700499): Republican 27,
// Democrat 27, independent 45 = lean Republican 15 + lean Democratic 20 + no lean 10. Sums to 99;
// normalized here. Returned relative to the President's party.
export function gallup2025Shares(presidentParty) {
  const r = { id: 27, lean: 15 };
  const d = { id: 27, lean: 20 };
  const own = presidentParty === "R" ? r : d;
  const opp = presidentParty === "R" ? d : r;
  const raw = [own.id, own.lean, 10, opp.lean, opp.id];
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

// Pew, registered voters, 2023 (pewresearch.org/politics/2024/04/09/the-partisanship-and-ideology-of-american-voters):
// identify Democratic 33, lean Democratic 16, identify Republican 32, lean Republican 15; no lean about 4 (derived: 35 - 31).
export function pew2023VoterShares(presidentParty) {
  const r = { id: 32, lean: 15 };
  const d = { id: 33, lean: 16 };
  const own = presidentParty === "R" ? r : d;
  const opp = presidentParty === "R" ? d : r;
  const raw = [own.id, own.lean, 4, opp.lean, opp.id];
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

// FIT (design-fit.mjs, "2020s-scaled constants"): partisan intercept per unit polarization, how much partisanship damps
// the valence slope, and how partisan a leaner is relative to an identifier.
export const FIT = { G0: 2.26, kappa: 0.678, lambda: 0.65 };

export const PI = [1, FIT.lambda, 0, -FIT.lambda, -1];

/**
 * Logit of approval in each bloc.
 *   V      valence in logit units (pure independents' logit of approval)
 *   P      structural polarization, 1 = the 2020s founding
 *   E      erosion of the own side's partisan intercept, 0..1 (gravity x exposure)
 *   I      issue-agreement terms per bloc, logit, already capped
 *   siege  own-side defensive term when the opposition prosecutes a charge the own side does not believe
 */
// How much of the erosion a public at polarization P lets through: a polarized party believes the charge
// less. 1 at P <= 0.5 (1974), 0.5 at P = 1, 0.25 from P = 1.25. Anchored on Nixon (own side broke at P ~0.5,
// assumed) and January 2021 (own-party approval 82 at P = 1 after the gravest charge of that term).
export const erosionPassThrough = (P) => clamp(1.5 - P, 0.25, 1);

export function blocLogits({ V, P = 1, E: erosion = 0, I = [0, 0, 0, 0, 0], siege = 0, fit = FIT }) {
  const pi = [1, fit.lambda, 0, -fit.lambda, -1];
  const E = erosion * erosionPassThrough(P);
  return pi.map((p, i) => {
    const ownSide = p > 0;
    const intercept = fit.G0 * P * p * (ownSide ? 1 - E : 1) + (ownSide ? siege * p : 0);
    const slope = 1 - fit.kappa * P * Math.abs(p);
    return intercept + slope * V + I[i];
  });
}

export function blocApprovals(args) {
  return blocLogits(args).map(sigma);
}

export function headline(shares, approvals) {
  return shares.reduce((sum, s, i) => sum + s * approvals[i], 0);
}

// Gallup reports identifiers and "independents" (leaners plus pure).
export function gallupView(shares, a) {
  const ind = (shares[1] * a[1] + shares[2] * a[2] + shares[3] * a[3]) / (shares[1] + shares[2] + shares[3]);
  return { own: a[0], ind, opp: a[4], overall: headline(shares, a) };
}

// Valence from the six judgments: V = S * (raw - M0) + rally - shock.
export const VALENCE = { S: 7, M0: 0.55 };
export const valence = (raw, extra = 0) => VALENCE.S * (raw - VALENCE.M0) + extra;

// Ballot. Vote intention per bloc: approval's logit plus the party loyalty that holds a
// disapproving partisan to the ticket. Turnout weights each bloc at full size.
export const BALLOT = { tau: 0.9 }; // fitted in design-electorate.mjs section 2
export function voteIntentions(a, fit = FIT, ballot = BALLOT) {
  const pi = [1, fit.lambda, 0, -fit.lambda, -1];
  return a.map((p, i) => sigma(logit(clamp(p, 1e-6, 1 - 1e-6)) + ballot.tau * pi[i]));
}
export function ballotShare(shares, turnout, a, fit = FIT, ballot = BALLOT) {
  const v = voteIntentions(a, fit, ballot);
  const mass = shares.reduce((sum, s, i) => sum + s * turnout[i], 0);
  return shares.reduce((sum, s, i) => sum + s * turnout[i] * v[i], 0) / mass;
}

// Habitual turnout per bloc, derived from Pew's validated 2020 file
// (pewresearch.org/politics/2021/06/30/behind-bidens-2020-victory): turnout 66% of eligible
// adults; voters 50% D+lean, 48% R+lean; nonvoters 46% D+lean, 41% R+lean. Partisans
// therefore turn out about 0.68-0.70 and no-lean independents about 0.23 (design-fit.mjs prints the arithmetic).
// Pew gives no identifier/leaner split; leaners are set lower by assumption (0.58), flagged in DESIGN.md.
export const HABIT = [0.72, 0.58, 0.23, 0.58, 0.72];

// Caucus break: the share of the President's caucus that votes to convict once the charge is grave,
// as a function of the President's own-party approval (identifiers). Fit in design-fit.mjs to
// Senate roll calls 1999, 2020, 2021 and the Gallup own-party approval of those weeks.
export const BREAK = { ceiling: 0.65, k: 18.4, mid: 0.75 };
export const caucusBreak = (ownApproval) => BREAK.ceiling * sigma(BREAK.k * (BREAK.mid - ownApproval));

export const r1 = (v) => Math.round(v * 1000) / 10;
export const r3 = (v) => Math.round(v * 1000) / 1000;
