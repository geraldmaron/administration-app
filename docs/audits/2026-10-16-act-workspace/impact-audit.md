# Build-ties impact audit

Date: 2026-10-16. Scope: the owner's report that the "Build ties" options at `/world/nation/:id/act` "seem very low for the impact." Every act's relationship effect was read from source and set against US precedent. The research note this summarizes, with a claim-by-claim fact, inference and recommendation label, is kept outside the repository with the session notes. The research pass opened each source below on 2026-10-16.

## What the engine does now

Trust runs from -1 to 1. Tension runs from 0 to 1. Neither drifts back on its own, so every gain lasts until something else moves it. At founding, the United States' own trust in other capitals runs from about -0.50 (Russia) to 0.65 (Canada). Most capitals' trust in the United States sits within ±0.13. One turn is a week, and a term is 208 weeks.

| Act | Trust | Tension | Common aims | Repeat | Gate | Source |
|---|---|---|---|---|---|---|
| Phone call | +0.02 both ways | -0.01 | 0 | every 4 weeks | none | `engine/src/engagement.ts` `ENGAGEMENT_TERMS` |
| Envoy | +0.02 | -0.02 | 0 | 6 weeks | none | same |
| State visit | +0.05 | -0.02 | +0.02 | 26 weeks | their trust ≥ 0 | same, `VISIT_HOST_TRUST` |
| Summit | +0.03 | -0.06 | 0 | 26 weeks | tension ≥ 0.3 | same, `SUMMIT_TENSION` |
| Joint declaration | +0.04 | -0.02 | +0.04 → **+0.06** | 52 weeks | trust ≥ 0.3 both ways | same, `DECLARATION_TRUST` |
| Mutual defense treaty | +0.18 | -0.12 | +0.22 | once | our trust ≥ 0.25, two thirds of the Senate | `engine/src/treaties.ts` `TREATY_TERMS` |
| Trade and investment agreement | +0.10 | -0.06 | +0.10 | once | ≥ -0.1, Senate | same |
| Strategic arms treaty | +0.12 | -0.20 | +0.06 | once | ≥ -0.3, Senate | same |
| Executive agreement | +0.06 | -0.04 | +0.05 | once | ≥ -0.4, signature | same |
| Relief shipment | their +0.04 | -0.02 | +0.02 | — | reserves | `engine/src/instruments-economic.ts` |
| Development grant | their +0.07 | — | +0.03 | — | reserves, GDP | same |
| Stabilization package | their +0.09, reliance +0.06 | — | — | — | recipient in difficulty | same |
| Arms transfer | their +0.10, threat -0.05 | — | — | — | our trust ≥ 0.15 | same |
| Security guarantee | ours +0.08, theirs +0.15 | — | +0.12 | once | our trust ≥ 0.35 | same |

## Findings

1. **One act at a time, the sizes match the record.** A treaty or a large aid program outweighs a visit, and a visit outweighs a call. The opening to China took two envoy trips in 1971, a week-long visit in February 1972 and seven more years to normalize (Office of the Historian). Four Reagan-Gorbachev summits between 1985 and 1988 moved a hostile relationship to a working one, and the trust came with the INF Treaty in December 1987 (Office of the Historian). Vietnam took 28 years from normalization in 1995 to the 2023 Comprehensive Strategic Partnership, with an upgrade in 2013 (2023 joint statement, CRS IF10209).
2. **Why the steps looked small.** Each card said "a small step" with no scale, and nothing set one option beside another. On the opening board, a call moves trust about a tenth as far as a mutual defense treaty. The workspace now draws every option on that one scale, and a locked option shows how far the relationship has to come.
3. **What is actually out of line runs the other way: routine contact adds up too fast.** A call every 4 weeks and an envoy every 6, each +0.02 with no decay, add about +0.43 trust a year to one capital, and about +1.7 over a term. That alone takes Russia from Hostile to the top of the scale, and five months of calls is worth more than a mutual defense treaty. Nothing in the record supports that. After the 2021 submarine dispute, a call had France's ambassador back in Washington within about a week, but the repair took an in-person meeting about five weeks later (joint statements of September 22 and October 29, 2021). Calls manage tension. They don't store up trust.
4. **The joint declaration was ordered wrong on common aims.** It needs trust of 0.3 on both sides, the highest gate in the family, yet it moved common aims no more than its trust. In the record, the declaration is what a visit produces, and its effect is a change of direction. The 2005 US-India statement set the course to a civil nuclear agreement that entered into force 41 months later and nearly brought down the Indian government on the way (CRS RL33016). The 2023 Vietnam statement recorded trust its public already held (76% favorable in 2014, Pew). Its trust step stays at +0.04, a little under a visit's, because it ratifies trust already built.
5. **Breaks are small next to builds.** Americans' favorable view of China fell from 72% to 34% within 1989 (Gallup). Indonesians' view of the United States fell from 61% to 15% between 2002 and 2003 (Pew). This is out of scope here and is recorded for the opinion and relationship owners.

## What changed

- Joint declaration common aims: +0.04 → **+0.06**, the family's per-act bound (`ENGAGEMENT_BOUND`). Trust is unchanged. This is the one retune, and it is in the direction the owner asked about. The balance harness result is recorded in the close-out of BL-229 in `docs/BACKLOG.md`.

## What did not change, and why

- **The phone call and the routine-contact cap** (the research recommends cutting the call's trust to +0.01 and capping trust from calls and envoys at +0.06 per relationship per 52 weeks). This would make the option the owner already finds too small smaller, and it changes how every government's diplomacy plays, since other governments use the same engagement path. It is the owner's call, opened as BL-230 under "Owner tasks and decisions."
- Visits, summits, treaties and aid: in proportion to each other and to the precedents above.

## Force acts: what forward deployment costs

Owner report, 2026-10-16: "Forward Deploy against Belarus: $29M spent… This dollar amount feels low."

**How the $29M is computed.** `engine/src/force-costs.ts` prices a force act from `FORCE_COST_ANCHORS`. Rung 2 sends one carrier strike group. Its day is CBO's direct operating and support cost per year for a carrier ($470M), its air wing ($330M) and five destroyer escorts ($60M each), FY2017 dollars, times 1.353 to carry them to 2026 by CPI, over 365: about $4.08M a day. The act charges `transit-days` (7, a planning value) of that up front, $28.5M, times a distance factor (1.01 for Belarus): **$28.83M**. Then it bills **$28.54M every week** the group stays out. Read off the projection for Belarus on the opening board.

**What the President is shown.** The card and the review headline read "$29M spent." The weekly bill appears only in the plan's caption ("then $29M a week while it stays out"). So the headline is the first week only, not the full commitment. A three-month deployment costs about $400M. The same gap makes an invasion ($129M up front for shipping four brigades, then about $853M a week) look cheaper than a limited strike ($235M, priced whole).

**Against the record.**
- CBO's same primer gives the full annual cost of owning the force: carrier $1,180M, air wing $910M, destroyer $140M each (FY2017). That's about $10.3M a day at 2026 prices, so the direct-only figure is about 40% of the cost of owning the group. (Research pass, CBO Force Structure Primer, read from the copy cited in `FORCE_COST_ANCHORS`.)
- Both are costs of owning the ships, deployed or not. No Navy, CBO, CRS or GAO per-day figure for what a deployment adds was found. The 2024 Israel supplemental's $508M of Navy operating money implies about $1–2M a day per strike group (inference).
- What deployments did cost on top: munitions in the Red Sea approached $1B by April 2024 (Navy Secretary, via Breaking Defense), and September 2024 budget documents sought about $1.2B for ship repairs, including $300M of unplanned depot maintenance for the Eisenhower group and the Bataan, and missile restocking (Stars and Stripes).
- An armored brigade rotation to Europe: FY2019 Army rotational forces $921.3M for a brigade and enablers (CRS IF10946); a nine-month rotation about $1.14B (Atlantic Council brief, via Stars and Stripes).

**Verdict.** The $4.1M a day is the wrong measure for a deployment decision. It's more than what deploying adds, and less than what the group costs to own. The larger errors are the headline, which leaves out the weekly bill, and the unit: a carrier is the wrong force to send against a landlocked country. A rotational armored brigade or fighter squadron at a neighbor's bases is the real precedent. This needs pricing and unit-choice changes plus a balance run, so it's recorded as **BL-232** and is not in this change set.

## Sources (opened by the research pass, 2026-10-16)

- Office of the Historian, Rapprochement with China, 1972: https://history.state.gov/milestones/1969-1976/rapprochement-china
- Office of the Historian, short history, the Gorbachev years: https://history.state.gov/departmenthistory/short-history/gorbachev
- Joint Leaders' Statement elevating US-Vietnam relations, September 11, 2023: https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2023/09/11/joint-leaders-statement-elevating-united-states-vietnam-relations-to-a-comprehensive-strategic-partnership/
- CRS IF10209, US-Vietnam relations: https://www.everycrsreport.com/files/2024-01-17_IF10209_65b6b22b180f34a668778afe44b14ee0b14d1f89.html
- Pew Research Center, Vietnamese see US as key ally, 2015: https://www.pewresearch.org/short-reads/2015/04/30/vietnamese-see-u-s-as-key-ally/
- Joint statement, President Bush and Prime Minister Singh, July 18, 2005: https://www.armscontrol.org/documents-reports/2005-07/joint-statement-between-president-george-w-bush-prime-minister-manmohan
- CRS RL33016, US nuclear cooperation with India: https://www.everycrsreport.com/files/20120626_RL33016_e9063113151bd19e2711385d780169909f66d648.html
- President's news conference in Hanoi, May 23, 2016: https://www.govinfo.gov/content/pkg/PPP-2016-book1/xml/PPP-2016-book1-doc-pg613.xml
- National Security Archive, the 1960 US-Japan security treaty crisis: https://nsarchive.gwu.edu/node/2136
- White House fact sheet on Mexico's debt repayment, January 15, 1997: https://clintonwhitehouse6.archives.gov/1997/01/1997-01-15-fact-sheet-on-mexico-debt-repayment.html
- GAO-09-71, Plan Colombia: https://www.gao.gov/products/GAO-09-71
- Joint statement, Presidents Biden and Macron, September 22, 2021: https://www.presidency.ucsb.edu/node/352660
- Joint statement, Presidents Biden and Macron, October 29, 2021: https://www.presidency.ucsb.edu/documents/joint-statement-president-biden-and-president-emmanuel-macron-france-0
- Singapore summit joint statement, June 12, 2018: https://www.pbs.org/newshour/amp/world/read-the-document-signed-by-trump-and-kim-after-the-summit
- Gallup, Americans' views of China: https://news.gallup.com/poll/471551/record-low-americans-view-china-favorably.aspx
- Pew Research Center, Views of a Changing World 2003: https://www.pewresearch.org/global/2003/06/03/views-of-a-changing-world-2003/
- CBO, The U.S. Military's Force Structure: A Primer (July 2016): https://www.cbo.gov/publication/51535
- CRS IF10946, European Deterrence Initiative (2018-08-08): https://www.everycrsreport.com/files/2018-08-08_IF10946_734833c14d577c4db921a3b9c4c64322889586c1.html
- CRS IN12274 (2024-04-25): https://www.everycrsreport.com/files/2024-04-25_IN12274_a5fca17c7dba3d580ca54b306579ccd4640f2795.html
- H.R. 7271, Israel Security Supplemental (2024): https://www.congress.gov/118/bills/hr7271/BILLS-118hr7271ih.pdf
- Breaking Defense, Navy is down $1B in munitions from Red Sea operations (2024-04): https://breakingdefense.com/2024/04/navy-is-down-1b-in-munitions-from-ops-in-red-sea-says-secnav/
- Stars and Stripes, US restock of arms after Houthi attacks (2024-10-04): https://www.stripes.com/theaters/us/2024-10-04/us-restock-arms-iran-houthi-attacks-cost-15401784.html
- Stars and Stripes, Army tank brigade rotations in Europe (2024-12-19): https://www.stripes.com/branches/army/2024-12-19/army-tank-brigade-rotations-europe-16215055.html
