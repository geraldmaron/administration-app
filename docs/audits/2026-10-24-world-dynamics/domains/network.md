# Domain audit: people, influence and relationship propagation

Date: 2026-10-24. Engine on `main` at `4edb2c520` plus the shared working tree. Probe file: `packages/engine/src/__probes__/network.probe.test.ts`. Command run: `cd packages/engine && npx vitest run src/__probes__/network.probe.test.ts`. Result: 10 failed, 3 passed out of 13. Every failure is a reproduced break; the three passes are controls. Seed `network-probe`, shipped dataset, founded through `foundedForBalance`. Nothing else was run: no build, typecheck, lint, full suite or balance harness.

## Summary

The engine prices a move well at the moment it lands, then forgets the wrong things. Five problems decide whether this domain survives a realism review:

1. **Favors are permanent and grudges last three weeks.** That is the reverse of the negativity bias the owner asked for. A +0.10 trust favor was still worth 0.102 after 13 weeks. A grudge of the same size was gone. The median government clears a 0.25 grudge in 3 weeks; the slowest takes 6.
2. **Being well connected changes nothing.** Influence reach comes from office alone (leader 8, chair 6, member 2). It travels only over contacts the player's own past lobbying recorded, and at founding there are none, so the Senate Majority Leader's brokerage reaches 0 colleagues. The biography network has no simulation consumer, and 75.9% of the 8,054-person cast sits at its cap of 6 ties, every congressional leader included.
3. **Third parties never take sides with the actor.** Every ripple from a coercive act cools the third party toward whoever acted. A US sanction on Iran cools 54 governments toward Washington, Israel, Saudi Arabia, the UAE, the UK, France, Germany and Japan among them. That includes governments that legally run their own Iran oil embargo.
4. **How strongly an ally reacts does not depend on how close it is.** All 30 allies of Poland react to a Russian strike with the same magnitude (0.048), whether their trust in Poland is 0.41 or 0.75.
5. **Cheap favors chain without diminishing returns.** Twelve weekly relief shipments to Pakistan, with no emergency there, added a near-constant +0.04 trust each time: -0.01 to +0.43 over a quarter. The cost was flat, and no gate asked for a need.

Per-hop attenuation, caps on issue pressure, the loyalty negativity ratio and NPC-on-NPC ripples all hold.

## Controls

Status key: **held**, **partial**, **missing**, **contradicted**.

| id | Control (realistic rule) | Real-world basis | Engine status | Evidence |
|---|---|---|---|---|
| N1 | Influence scales with network position. A better-connected actor moves more people. | Fowler (2006): cosponsorship "connectedness" predicts floor amendments passed and roll-call choice after controlling for ideology and party. | **contradicted** | `person-network-influence.ts:24-35`: reach is set by office and a recorded-contact fallback. The biography network is never read by the engine, only by `player-core/src/dossier/*`. ARCHITECTURE.md records that `connectionBonus` was removed because the "downstream lobbying and loyalty rules … never arrived". Probe [1c]: degree 3 and degree 6 members both have reach 2. |
| N2 | Leaders whip through standing networks that exist before the President calls. | CRS RS20881 (2018): whips count votes, persuade wavering members and run a whip network of chief deputy and deputy whips. | **missing** | `person-network-influence.ts:80` reads only `knownPersonContacts`, which is built from `congress.lobbying` cooperation records (`:14-21`), and those are empty at founding. Probe [1a]: contacts=0, leader issueReach=8, responses=0. Only the target was moved. |
| N3 | Degree is heavy-tailed: hubs exist. | Fowler (2006) and its successors find a small-world, centralized Congress. Dunbar (1993) predicts about 148 relationships per person and 10-12 intense ties, so 6 is an inner circle, not a whole network. | **contradicted** | `person-network.ts:39` `MAX_PER_PERSON = 6`, set as a reader display limit (`ARCHITECTURE.md`, "what a reader can hold"). Probe [1b]: median 6, max 6, 75.9% at the cap, leaders 6,6,6,6,6,6,6. |
| N4 | Influence attenuates with each hop. | Standard diffusion assumption; the depth-2 cap is a design choice. | **held** | `person-network-influence.ts:92` `0.06 / depth`, primary 0.08 (`member-outreach.ts`). Probe [1d]: 1:0.06, 2:0.03. Existing test `person-network-influence.test.ts` covers cycles and the 2-hop stop. |
| N5 | Issue pressure on a member is capped and expires. | Design control; no outside benchmark. | **held** | `member-votes.ts:45` clamps to ±0.12; entries expire after 21 days (`member-outreach.ts`). Existing test covers expiry. The step-function expiry, with no decay curve, is a minor realism gap. |
| N6 | Negativity bias: grievances outweigh and outlast favors of the same size. | Baumeister et al. (2001), *Bad Is Stronger Than Good*: negative events have more power, including in close relationships and social networks, with almost no exceptions. | **contradicted** | Grudges decay linearly at `0.12*(1-vengefulness)`, floor 0.02 (`relationships.ts:20-37`). Trust deltas are linear and clamped with no decay phase anywhere (`effects.ts:248`; no turn phase pulls relationship trust back toward a baseline). Probes [2a] and [2b]. |
| N7 | Interstate grievances persist for years. | Klein, Goertz & Diehl (2006), JPR 43(3): enduring rivalries are "longstanding competitions between the same pair of states". The exact duration threshold was not verified from the paper. | **contradicted** | Probe [2a]: weeks to clear a 0.25 grudge: min 3, median 3, max 6. |
| N8 | Remembered acts fade with elapsed time. | Inference: memory decays with time, not only with how many acts follow. | **contradicted** | `relationships.ts:109` `historyPressure` takes no current turn, so its decay is by rank. Probe [2c]: a relief act from last week and one from ten years ago both weigh 0.06. |
| N9 | Repeated small slights accumulate. | Baumeister et al. (2001). | **held** (control) | `grudgeWeight` sums (`relationships.ts`). Probe [2d]: 5 × 0.05 = 0.25. The fast decay in N6 still erases them within weeks. |
| N10 | Repeating one approach meets habituation. | Inference. | **partial** | `repeatDrag` covers only the diplomatic démarche (`relationships.ts:277`). Hill calls have a repeat penalty (`lobbying-person.ts:136`). Assistance, economic, covert and military have none. |
| N11 | Third parties react by their own ties: the target's allies cool, its rivals warm (structural balance). | Maoz et al. (2007), JOP 69(1): shared allies and enemies shape direct ties. Imbalance is common and raises conflict, so balance is a tendency, not a law. EU Council Regulation 267/2012, Art. 11(1)(a), adopted 23 March 2012, banned imports of Iranian crude and petroleum products, so US partners joined the pressure rather than cooling. | **contradicted** | `resolution-ripples.ts:158`: one direction for every coercive ripple. `RippleRelation` (`resolution.ts:78`) has no rival relation. `thirdPartyRelation` (`:39-74`) never checks the third party's stance toward the target beyond a trust ≥ 0.4 ally test. Probe [3a]. |
| N12 | Reaction strength scales with how close the third party is to the target. | Inference from N11; a continuous tie, not a cliff. | **contradicted** | `RELATION_SENSITIVITY` is a constant per class (`resolution-ripples.ts:16`), and "ally" is a cliff at trust 0.4 (`:63`). Probe [3b]. |
| N13 | NPC-on-NPC coercion moves third parties' readings of the NPC actor. | Same basis as N11. | **held** (control) | Probe [3c]: a Russian strike on Ukraine produces 40 ripples and 39 relationship effects toward Russia. |
| N14 | Favors show diminishing returns, scale in cost, and need a reason (need, crisis). | Dreher, Nunnenkamp & Thiele (2008), Public Choice 136: US aid, grants and budget support especially, is associated with recipients voting with the US. So aid buys alignment, which is why it needs a ceiling. The diminishing-returns shape is an inference, not a finding of that paper. | **contradicted** | `instruments-economic.ts:384-386`: relief gate is credit and reserves only; +0.04 trust each time with no repeat term. Probe [4a]. |
| N15 | A member wronged in public is harder to persuade later. | Baumeister et al. (2001); inference for the Hill. | **contradicted** | `ties.ts:107` writes `tie.grudges`. No engine code reads them (repo grep). `successChance` (`lobbying.ts:352`) and `memberWillingness` ignore them. Probe [4b]: 0.607 with and without five 0.2 grudges. |
| N16 | Cabinet loyalty: being overruled costs more than being heeded pays. | Baumeister et al. (2001). | **held** | `loyalty.ts:42-43`: -0.02 against +0.008, a 2.5:1 ratio. |
| N17 | Hill leaders' rapport reverts toward where they stand. | Design control. | **held** | `hill.ts:272` `FIGURE_DRIFT = 0.03`. This applies to leadership only. Rank-and-file members and foreign capitals have no reversion. |

## Breaks

Observed numbers are copied from the probe output.

### B1. Leader brokerage reaches nobody on a fresh campaign (critical, reproduced)
- **Expected:** a coalition request through the Senate Majority Leader moves several colleagues, fewer at each hop.
- **Observed:** `recorded contacts at founding=0; leader issueReach=8; propagateIssue responses=0; people with issue pressure after a brokered request=1`. The coalition option costs two attention slots (`member-outreach.ts`) and buys the same single member a direct call does.
- **Mechanism:** `person-network-influence.ts:80` reads only `knownPersonContacts` (`:14-21`), which is built from the player's own past lobbying records. The world has no standing caucus, committee or state-delegation ties to travel over. It also follows that the player creates the network the influence later travels on.
- **Fix:** seed standing Hill edges at founding from facts the engine already holds: party caucus, committee membership (`congress.committees`), state delegation and leadership-to-caucus whip edges. Weight each by tie strength. Let `propagateIssue` use them beside recorded contacts. **opus** (it changes what every vote reads), M.

### B2. Network position has no effect; degree is capped at a display quota (high, reproduced)
- **Expected:** a heavy-tailed degree distribution, leaders as hubs, and reach that grows with connectedness.
- **Observed:** `people=8054 median degree=6 max=6 share at max=75.9% leader degrees=6,6,6,6,6,6,6`, and `low-degree member degree=3 reach=2; high-degree member degree=6 reach=2`.
- **Mechanism:** `person-network.ts:39` `MAX_PER_PERSON = 6`. `issueReach` (`person-network-influence.ts:24-35`) reads office alone. The biography network is consumed only by `player-core` dossier views.
- **Fix:** split the world graph from the display graph. Keep 6 as a dossier display limit and let the world graph run to a heavy tail. Feed a normalized centrality (eigenvector or Fowler-style connectedness) into `issueReach` and into the `bond` term of `issueCooperationDecision`. **opus**, M. Depends on B1.

### B3. Grudges clear in weeks while favors never fade (critical, reproduced)
- **Expected:** a slight outlasts a favor of the same size, and both fade with half-lives measured in months to years.
- **Observed:** `weeks for a 0.25 grudge to reach zero: min=3 median=3 max=6`, and `SAU vengefulness=0.44; both shocks were 0.10 of disposition at week 0; after 13 weeks favor residual=0.102 grudge residual=0.000`.
- **Mechanism:** linear grudge decay at `relationships.ts:20-37`. Trust deltas are added and clamped (`effects.ts:248`) with no reversion phase, so every favor is a permanent deposit.
- **Fix:** move both to exponential decay toward a structural baseline. Re-derive the baseline from `deriveRelationship` plus `FOUNDING_DYADS` (`relationship-graph.ts`) on a slow cadence. Give favors a half-life of roughly 26-52 weeks and grudges one of roughly 2-4 times that, scaled by vengefulness. Let a large grudge leave a floor in the remembered layer. Calibrate the half-lives against the rivalry and alignment literature before freezing them; these numbers are proposals. This is a scoring constant a writer reasons about, so update CONTENT_DOCTRINE §2 and DECISIONS §4.8 with it. **opus**, M.

### B4. The remembered record ignores elapsed time (medium, reproduced)
- **Observed:** `historyPressure of one relief act last week=0.06 and ten years ago=0.06`.
- **Mechanism:** `relationships.ts:109`. The function's weight depends on rank, not age.
- **Fix:** pass the current turn and multiply each act by `0.5^(age/halfLife)` alongside the rank decay. **sonnet**, S.

### B5. No third party ever warms toward a coercer; partners who sanction the same target cool instead (critical, reproduced)
- **Expected:** rivals of the target, and governments already pressuring it, warm toward the actor or hold steady. Partners of the target cool.
- **Observed:** the US sanction on Iran produced 54 ripples, all cooling, including `SAU:bloc-peer`, `ARE:bloc-peer`, `ISR:trade-partner`, `GBR`/`FRA`/`DEU`/`JPN:trade-partner`. `effects that raise trust toward the actor=0`. The EU's own Iran oil embargo (Reg. 267/2012 Art. 11) is the counterexample.
- **Mechanism:** `resolution-ripples.ts:158` sets one direction for every coercive ripple. `thirdPartyRelation` (`:39-74`) has no rival or co-pressure branch. "bloc-peer" counts OPEC+ and BRICS co-membership as sympathy for the target.
- **Fix:** score each third party's reaction as a signed function of its own reading of the target: `−sign(disposition(third→target)) × |disposition|`. Rivals warm, partners cool, the indifferent ignore it. Bonus for third parties already running their own measures against the target. Keep the bloc-partner (shared defense with both) case as is. **opus**, M.

### B6. Ally reaction strength is flat (high, reproduced)
- **Observed:** `ally rows=30; distinct ally magnitudes=1; ally trust toward Poland spans 0.41..0.75`, all at 0.048.
- **Mechanism:** `RELATION_SENSITIVITY` constants (`resolution-ripples.ts:16`) and the trust ≥ 0.4 cliff at `:63`.
- **Fix:** scale by tie strength (trust, trade dependence, a shared defense promise). Lands with B5. **sonnet**, S. Depends on B5.

### B7. Cheap favors chain linearly (high, reproduced)
- **Expected:** relief needs a need, and repeated aid to the same capital habituates.
- **Observed:** `12 relief shipments to PAK: trust gains=0.037,0.000,0.043,0.043,0.041,0.041,0.038,0.041,0.044,0.042,0.042,0.000 total=0.412 trust -0.01->0.4266`. Cost was flat: first `treasury -2585.66, stability -0.0008`, last `treasury -2603.04`. The late mean is not under half the first.
- **Mechanism:** `instruments-economic.ts:384-386`. No repeat term (`REPEAT_ACT_KINDS` names diplomatic only, `relationships.ts:277`). Trust is an unbounded linear accumulator up to the clamp.
- **Fix:** add per-instrument habituation for assistance (an `aid` history kind, plus a diminishing multiplier on a rolling window). Gate relief on a live condition or disaster at the target. **sonnet**, S. Pairs with B3, which supplies decay.

### B8. Personal grudges are write-only (medium, reproduced)
- **Observed:** `minority leader call success chance with no grudges=0.607, with five personal grudges of 0.2=0.607`.
- **Mechanism:** `ties.ts:107` writes them. No engine reader exists. The public-appeal miss grudge (`lobbying.ts:737-738`) is therefore cosmetic.
- **Fix:** read decayed `tie.grudges` weight as a negative term in `memberTerms` and `memberWillingness`, with its own decay. **codex** (self-contained and well specified), S.

### B9. Iran's trade-partner list includes the US and Israel (medium, reproduced by probe output, cross-domain)
- **Observed:** `Iran topPartners=CHN,TUR,IND,IRQ,SAU,RUS,DEU,ARE,AZE,GBR,FRA,ITA,ISR,…,USA`, 41 entries. These drive the "trade-partner" ripple class in B5.
- **Mechanism:** world dataset `stats.trade.topPartners`. It reads as "anyone with a nonzero flow", not top partners. The real-world zero or near-zero flows were not verified against a source in this pass.
- **Fix:** cap topPartners at a sourced top N and cite the source per DECISIONS §4.11. The ripple code should read `tradeDependence` magnitude, not list membership. **sonnet** for the data, S. Belongs to the trade or dataset domain owner.

## Recommended path

Critical path: B3 (decay toward a baseline), then B5 and B6 (signed third-party reaction), then B1 and B2 (standing Hill network and centrality). B4, B7 and B8 are small and can land beside them. B9 goes to the dataset owner. Every critical-path change moves numbers the balance harness reads, so the owner's integration checkpoint has to run `test:balance` after them.

Challenge on B3 (load-bearing). The strongest failure mode is that reversion toward a structural baseline erases real authored history, for example a war that should leave a permanent scar. The alternative is two layers: a fast-decaying "recent" component and a slow structural component that large events can shift permanently. Verdict: accepted with controls. Use the two-layer form, and assert in tests that a war or severance leaves a non-zero floor after five years.

## Sources (opened this session, 2026-10-24)

- Fowler, "Connecting the Congress", Political Analysis 14(4), 2006: https://ideas.repec.org/a/cup/polals/v14y2006i04p456-487_00.html
- CRS RS20881, Party Leaders in the House (Nov 2018): https://www.everycrsreport.com/files/20181105_RS20881_dade34178561a006c4d8f97e07b41297bf3bedc8.html
- Baumeister et al., "Bad Is Stronger Than Good", Review of General Psychology 5(4), 2001: https://experts.umn.edu/en/publications/bad-is-stronger-than-good/
- Maoz et al., "What is the Enemy of My Enemy?", Journal of Politics 69(1), 2007: https://cris.haifa.ac.il/en/publications/what-is-the-enemy-of-my-enemy-causes-and-consequences-of-imbalanc/
- Klein, Goertz & Diehl, "The New Rivalry Dataset", JPR 43(3), 2006: https://ideas.repec.org/a/sae/joupea/v43y2006i3p331-348.html
- Dunbar, BBS 1993 preprint (predicted group size 147.8; sympathy group 10-12): https://mnytud.arts.unideb.hu/tananyag/dunbar.htm
- Council Regulation (EU) No 267/2012, Art. 11(1)(a): https://www.legislation.gov.uk/eur/2012/267/adopted. Whether it is still in force as of 2026 was not verified.
- Dreher, Nunnenkamp & Thiele, Kiel WP 1275, published in Public Choice 2008: https://ideas.repec.org/p/zbw/ifwkwp/1275.html

Unverified: the rivalry dataset's exact duration threshold; actual Iran-Israel and Iran-US trade flows; every half-life figure proposed under B3.

## Not checked

- `cabinet-*.ts` beyond `loyalty.ts`: the cabinet-alignment pair effects, leak and resignation propagation.
- `foreign-leader.ts` in play: whether a leader change carries or resets personal rapport with the President, and whether G7 leaders' personal ties exist at all. Only static reading was done; no probe.
- `relations-record.ts` and `founding-dyads.ts` correctness against sources. The dyad table was not re-audited.
- Bloc fracture and alignment phases (`blocs.ts`, `compacts.ts`) and how they compound with ripples.
- Full-term (208-week) drift of the relationship graph, multi-seed variance, and any balance-harness effect. B2-B3 were measured on one seed over 13 weeks.
- Covert ripples on exposure, and the military ripple path in combat (`war-tick.ts`).
- Lobbying `trade` favors and their repayment and default consequences beyond the availability gate.
