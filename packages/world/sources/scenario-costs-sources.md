# Scenario money: sources and caveats

Written 2026-10-14 for `src/dataset/seed/scenario-cost-anchors.tsv` and its table `src/dataset/scenario-cost-anchors.ts`, which a scenario reply's declared money is priced from (`packages/content/src/scenario-cost.ts`; the rule is `docs/DECISIONS.md` §6.15). Every source below was opened on 2026-10-14 unless the row says otherwise. Requests carried no personal identifiers.

## What the table prices, and how

A reply's `impact.financial.scale` says how the money is authorized: the executive alone (`discretionary`), a vote of Congress (`supplemental`), a vote under an emergency designation (`emergency`), or a standing program (`structural`). The week's `severity` says how big it is. Each pairing reads one anchor, carried to 2026 dollars by CPI-U, then the horizon multiplier (one-off ×1, multi-year ×1.8, permanent ×3; planning values carried from the previous model):

| Band | Routine | Serious | Critical |
|---|---|---|---|
| discretionary | planning, $50M | planning, $1.0B | planning, the 2018 trade aid package, $15.8B |
| supplemental | Flint lead response, $235M | Zika, $1.53B | Harvey's first supplemental, $20.6B |
| emergency | Zika, $1.53B | Ebola, $7.57B | Hurricane Sandy, $71.9B |
| structural (a year) | planning, $1.0B | CHIPS manufacturing incentives over their five years, $8.84B | planning, $25B |

(2026 dollars, rounded here; the code carries the unrounded values.) A week confined to one city is priced one severity down, and a routine city week at half the routine anchor (planning values). Another government pays the American figure times its output over the United States'. A reply that states its own arithmetic (`impact.financial.basis`: quantity × unit cost × weeks) is priced from that instead, and the audit warns when it lands more than ten times away from its band's anchor.

Every price is then drawn around its center from the campaign's seed: a log-normal multiplier with a small upward bias, spread 0.35 for a band and 0.15 for a stated basis, bounded to between half and two and a half times the center. A reply's authored `cost.treasury` is drawn the same way around the writer's figure, spread 0.10, so an obligation typed as 20 lands at something like 20.73. These parameters are planning values set against the overrun record below; they are not fitted.

## Sources opened

1. **CRS R44937, *Congressional Action on the FY2013 Disaster Supplemental* (updated 2017-08-31).** `https://www.everycrsreport.com/files/20170831_R44937_4720735fad4da333698b76316f1312687ecdeb82.html` (a FAS mirror of the same report returned empty). "A $50.5 billion package of disaster assistance": $50,507.684M of budget authority before sequestration under P.L. 113-2. The $9.7B National Flood Insurance Program borrowing increase was a separate law (P.L. 113-1) and is excluded.
2. **Public Law 115-56 (approved 2017-09-08), Division B.** `https://www.govinfo.gov/content/pkg/PLAW-115publ56/html/PLAW-115publ56.htm`. FEMA Disaster Relief Fund $7,400M, SBA disaster loans $450M, HUD Community Development Block Grant $7,400M. The statute states no total; the $15,250M is the sum of the three lines. OMB's description, seen only in a search summary because its PDF would not parse, calls the figure net of a Sandy-balance rescission.
3. **CRS R44507, *Status of the Ebola Outbreak in West Africa* (2016-05-25).** `https://www.everycrsreport.com/reports/R44507.html`. "Congress appropriated $5.4 billion in FY2015 emergency supplemental appropriations," enacted December 2014 (the dollar year used). About half went to the international response.
4. **CRS R44460, *Zika Response Funding: Request and Congressional Action* (2016-09-30), Table 1.** `https://www.everycrsreport.com/reports/R44460.html`. $1,108.1M: HHS $933.0M and State and USAID $175.1M, in Division B of H.R. 5325, signed 2016-09-29. The public law number was seen only in a search summary.
5. **CRS IF10536, *Water Infrastructure Improvements for the Nation Act (WIIN)* (updated 2017-01-06).** `https://www.everycrsreport.com/reports/IF10536.html`. "Provided $170 million in appropriations for WIIN, Title II, Subtitle B activities." The money was appropriated by P.L. 114-254 and authorized by WIIN (P.L. 114-322). The page does not name Flint; the link to Flint comes from contemporary press summaries, and two published breakdowns of the $170M disagree. Used as the size of a city-scale drinking-water response, not as a statement of what Flint received.
6. **CRS R47523, *Frequently Asked Questions: CHIPS Act of 2022 Provisions and Implementation* (2023-04-25).** `https://www.everycrsreport.com/reports/R47523.html`. "Establishes and appropriates $39.0 billion to a CHIPS for America Fund" for manufacturing incentives, FY2023 to FY2027, within $52.7B of CHIPS appropriations. A 2% administrative carve-out leaves about $38.2B for direct incentives; the table keeps the $39.0B. The public law number was not confirmed on the opened page.
7. **CRS R45310, *Farm Policy: USDA's 2018 Trade Aid Package* (updated 2019-02-08).** `https://www.everycrsreport.com/files/20190208_R45310_2f8736c9b3a30ebe757ffce1d8e23bfee0598955.html`. USDA "would authorize up to $12 billion in financial assistance" through the Commodity Credit Corporation, without a new appropriation: Market Facilitation Program payments up to $10B (about $9.6B estimated across two rounds), food purchases $1.2B and trade promotion $200M.
8. **State Department PRM, *FY 2023 Notice of Funding Opportunity for Reception and Placement Program* (2022-04-14).** Grants.gov attachment, read as text. "Will be provided a $1,225 per capita grant for direct assistance," with an expected $1,050 per capita for the resettlement affiliate's administrative costs; the table's $2,275 is their sum. A search summary attributes the same $2,275 to CRS, but the CRS text could not be opened. No FY2024 or FY2025 notice was found. Seeded for a writer's `basis`, not read by the band model.
9. **Roads and Bridges, "Lifting the Veil" (2006-01-01),** `https://www.roadsbridges.com/lifting-veil`, quoting Flyvbjerg, Holm and Buhl, "Underestimating Costs in Public Works Projects: Error or Lie?", *Journal of the American Planning Association* 68(3), 2002. "Actual costs are on average 28% higher than estimated costs," across 258 transport projects, and costs "are underestimated in almost nine out of 10." The widely repeated 86% figure was not found in an opened source. The paper itself could not be opened (the World Bank copy returned 403). Seeded as the overrun record the jitter's bias is set against, not read as a parameter.
10. **BLS CPI-U, series CUUR0000SA0, annual averages,** from the BLS public data API v2 (no key; two calls, because one call returns at most ten years): 2013 232.957, 2014 236.736, 2016 240.007, 2022 292.655. 2017 (245.120), 2018 (251.107) and the 2026 January to August average (331.655) are the values `force-cost-anchors.tsv` seeded from the same series on 2026-10-10, repeated here so this table carries its own dollars.

## Planning values

Five anchors and the jitter are the game's own figures and say so:

- **`discretionary-routine`, $50M; `discretionary-serious`, $1.0B.** What an administration spends without a vote: a reprogramming, a grant from an existing account, a draw on a standing fund. No single public series measures this.
- **`discretionary-critical`.** Set at the 2018 trade aid package ($12B in 2018 dollars), the largest recent program an administration funded alone. A critical week the executive answers alone can be that large; most will land well under it.
- **`structural-routine`, $1.0B a year; `structural-critical`, $25B a year.** A small and a large standing program. The serious anchor is sourced (CHIPS incentives, a year's share); these bracket it.
- **The jitter** (bias 0.08, band spread 0.35, basis spread 0.15, treasury bias 0.03 and spread 0.10, bounds ×0.5 to ×2.5). The median lands about 8% over the center, and the mean of a band draw about 15% over. That is below the 28% average overrun for transport projects (source 9), because a scenario's money is mostly transfers and grants, which overrun less than construction. That judgment is not sourced.

## Cross-checks, not seeded

- The previous model priced every `supplemental` at 0.2% of output, $58.6B for the United States, the size of Sandy's package for any week the writer said needed a vote. Against these anchors, a routine supplemental was charged about 250 times the Flint response.
- The 2018 trade aid package (source 7) shows the executive alone can move $12B, so `discretionary` is not a small-money band; the audit checks a stated basis against the band rather than assuming one.
