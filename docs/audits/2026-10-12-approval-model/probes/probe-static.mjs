// Read-only static probe on a fresh founding: party symmetry, policy-stance coalition effects,
// polarization compression/inertia arithmetic, salience at founding.
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { foundedForBalance } = await E("balance-harness");
const op = await E("opinion");
const { coalitionApproval, selectCoalitions } = await E("coalitions");
const { projectVote } = await E("elections");
const { computeRemovalPressure, selectPressureComposition } = await E("removal");
const r3 = (v) => Math.round(v * 1000) / 1000;
for (const party of ["democrat", "republican"]) {
  const { campaign: c, charter } = foundedForBalance("balance-0", party);
  const n = c.nations[c.founding.nation];
  console.log(party, "approval", r3(c.player.metrics.approval), "coal", coalitionApproval(c), "vote", projectVote(c).share,
    "salience", op.selectSalience(c).join(","), "protest", n.stats.politics.protestPressure, "insurgency", n.stats.security.insurgencyPressure,
    "factionalism", n.stats.politics.factionalism, "pol", r3(c.player.opinion.polarization),
    "pressure", r3(computeRemovalPressure(c, charter)),
    "components", JSON.stringify(selectPressureComposition(c, charter).components.map((x) => [x.term, r3(x.reading), r3(x.contribution)])));
}
const { campaign: base } = foundedForBalance("balance-0", "democrat");
const withPolicy = (c, domain, id) => ({ ...c, player: { ...c.player, policies: { ...c.player.policies, [domain]: id } } });
console.log("--- coalitionApproval / projected vote by stance (all else equal, week 1)");
for (const [domain, ids] of Object.entries({ fiscal: ["fiscal-continuity", "fiscal-investment", "fiscal-redistribution", "fiscal-austerity"], industry: ["industry-continuity", "industry-extraction", "industry-transition", "industry-nationalization"], trade: ["trade-continuity", "trade-open", "trade-protective"] })) {
  for (const id of ids) { const c = withPolicy(base, domain, id); console.log(domain, id, "coal", coalitionApproval(c), "vote", projectVote(c).share, "coalitions", selectCoalitions(c).map((x) => x.support).join("/"), "headline", r3(op.approvalFor(c))); }
}
console.log("--- approvalOf over raw x polarization (base 0.45)");
const mood = (v, p) => ({ security: v, prosperity: v, services: v, integrity: v, unity: v, competence: v, polarization: p });
for (const p of [0, 0.3, 0.6, 1]) console.log("pol", p, [0.1, 0.3, 0.5, 0.7, 0.9].map((v) => `${v}->${r3(op.approvalOf(mood(v, p), op.OPINION_WEIGHTS))}`).join(" "));
console.log("--- shock persistence: a -0.10 integrity delta, weekly drift back at OPINION_DRIFT with damping (1-0.5p)");
for (const p of [0, 0.6]) { let gap = 0.1 * (1 - 0.5 * p); const out = [r3(gap)]; for (let w = 1; w <= 26; w++) { gap -= gap * op.OPINION_DRIFT * (1 - 0.5 * p); if ([4, 11, 26].includes(w)) out.push(`w${w}:${r3(gap)}`); } console.log("pol", p, "applied", out.join(" ")); }
console.log("--- polarization path with no new division: weeks to reach 0 from 0.597 at decay", op.POLARIZATION_DECAY, "=", Math.ceil(0.597 / op.POLARIZATION_DECAY));
console.log("HALF_LIFE", op.OPINION_HALF_LIFE_TURNS, "weights", JSON.stringify(op.OPINION_WEIGHTS));
