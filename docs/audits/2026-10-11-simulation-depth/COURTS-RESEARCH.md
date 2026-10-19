# Phase K research: the federal courts as a process

Researched and accessed 2026-10-11. Feeds `PEOPLE-CONGRESS-COURTS.md` §4 (courts as a process) and §6 (research comes first).

Every URL below was opened on 2026-10-11 unless it is marked "not opened". Where a source states an as-of date, it is given. Findings are split into **Facts** (read in the source), **Inferences** (my own reading or calculation, labeled as such) and **Recommendations**. Sitting judges are never named; counts and rules only. Case names appear only as citations.

Data files next to this note:

| File | What it is |
|---|---|
| `COURTS-judgeships-circuits.csv` | 13 circuits: authorized (28 U.S.C. §44), FJC-active, by appointing party, by appointing President |
| `COURTS-judgeships-districts.csv` | 94 rows of 28 U.S.C. §133(a): authorized, FJC-active, by appointing party, uscourts vacancies |
| `COURTS-vacancies-2026-10-11.csv` | The 28 current vacancies, no names: circuit number, state, district, reason, date, nominee pending |
| `COURTS-life-table-us-2024-qx-ages45-95.csv` | CDC/NCHS 2024 US life table, ages 45 to 95, qx and ex by sex |
| `COURTS-senior-status-hazard.csv` | My tabulation of exits from active service among Rule-of-80-eligible judges (method in §3.3) |
| `COURTS-appeals-median-months-2025-09-30.csv` | uscourts Table B-4: median months by circuit |

---

## 1. Judgeships, vacancies and the benches

### 1.1 Facts: authorized seats

**Circuits.** 28 U.S.C. §44(a) sets the number of circuit judges: D.C. 11, First 6, Second 13, Third 14, Fourth 15, Fifth 17, Sixth 16, Seventh 11, Eighth 11, Ninth 29, Tenth 12, Eleventh 12, Federal 12. Total 179. Source: GPO, United States Code 2024 edition, https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partI-chap3-sec44.htm (accessed 2026-10-11). uscourts.gov's circuit-by-circuit history shows the same totals and records no change after 2008 (https://www.uscourts.gov/about-federal-courts/about-federal-judges/authorized-judgeships/chronological-history-authorized-judgeships-courts-appeals, accessed 2026-10-11). Each circuit with states must have at least one circuit judge resident in each state (§44(c)).

**Circuit composition.** 28 U.S.C. §41 assigns districts to circuits (https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partI-chap3-sec41.htm, accessed 2026-10-11). The district CSV uses it.

**Districts.** 28 U.S.C. §133(a) lists permanent district judgeships (same edition and date: https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partI-chap5-sec133.htm). The table has 94 rows and sums to 673 judgeships. The rows are 91 districts (50 states' districts, D.C. and Puerto Rico) plus three multi-district judgeship groups: Kentucky Eastern and Western (1), Missouri Eastern and Western (2), Oklahoma Northern, Eastern and Western (1). The three territorial districts (Guam, Northern Mariana Islands, Virgin Islands) are not in §133 and I did not fetch their statute. The 2024 edition already includes Pub. L. 118-203 (Dec. 23, 2024), which made ten existing temporary judgeships permanent (N.D. Ala., Ariz., C.D. Cal., S.D. Fla., Haw., Kan., E.D. Mo., N.M., W.D.N.C., E.D. Tex.).

**Pending expansion.** On March 11, 2025 the Judicial Conference asked Congress for 2 appeals and 69 district judgeships, and the release says President Biden vetoed the earlier comprehensive bill on Dec. 23, 2024 (https://www.uscourts.gov/data-news/judiciary-news/2025/03/11/judiciary-seeks-71-judgeships-meet-growing-caseloads, accessed 2026-10-11). I found no later statute changing the counts above: the §133/§44 tables and the uscourts circuit history show none. That is an absence-of-evidence check, not a search of the Statutes at Large.

### 1.2 Facts: vacancies

uscourts.gov "Current Judicial Vacancies", stated "Update as of 10/11/2026" (https://www.uscourts.gov/data-news/judicial-vacancies/current-judicial-vacancies, accessed 2026-10-11):

- 28 vacancies, 11 nominees pending, 119th Congress.
- All 28 are district seats. No Supreme Court or circuit vacancy.
- Reasons: 22 senior status, 2 retired, 2 resigned, 1 deceased, 1 elevated.
- Circuits with the most vacancies: Fifth 5, Second 4, First 3, Ninth 3, Tenth 3, Eleventh 3.
- Age of the open seats (my arithmetic from the listed vacancy dates, as of 2026-10-11): median 370 days; the newest is 6 days old; the oldest is 1,897 days. The 17 seats with no nominee have a median of 365 days; the 11 with a nominee, 389.

"Future Judicial Vacancies", also "Update as of 10/11/2026" (https://www.uscourts.gov/data-news/judicial-vacancies/future-judicial-vacancies, accessed 2026-10-11):

- 15 announced future vacancies, 5 nominees pending.
- Four are circuit seats: two Fifth Circuit, one Eighth, one Tenth. Three of the 15 are "Elevated", two "Retired", ten "Senior".
- 11 of 15 show a vacancy date of "TBD"; four show a calendar date between Dec. 2026 and Jul. 2027.

### 1.3 Facts: who sits now, by appointing party

Method. Source: Federal Judicial Center, Biographical Directory of Article III Federal Judges, export `judges.csv` (https://www.fjc.gov/sites/default/files/history/judges.csv). The server states "Last-Modified: Sun, 11 Oct 2026 05:05:18 GMT"; accessed 2026-10-11. An appointment counts as active if it has no Termination Date and no Senior Status Date. Courts: Supreme Court, U.S. Court of Appeals, U.S. District Court. A judge who sits on two or three districts under one multi-district judgeship is counted once, in the multi-district row. Party is "Party of Appointing President" on that appointment. Trump appointees from both terms are pooled in the party columns; the circuit CSV splits by President.

| Bench | Authorized | FJC-active | Appointed by a Republican President | Appointed by a Democratic President | Vacant now |
|---|---|---|---|---|---|
| Supreme Court | 9 | 9 | 6 | 3 | 0 |
| 13 circuits | 179 | 179 | 92 | 87 | 0 |
| District courts, §133 permanent seats | 673 | 647 | 275 | 372 | 28 |

By circuit (full detail in `COURTS-judgeships-circuits.csv`):

| Circuit | Seats | R | D | | Circuit | Seats | R | D |
|---|---|---|---|---|---|---|---|---|
| D.C. | 11 | 4 | 7 | | Seventh | 11 | 6 | 5 |
| First | 6 | 1 | 5 | | Eighth | 11 | 10 | 1 |
| Second | 13 | 6 | 7 | | Ninth | 29 | 13 | 16 |
| Third | 14 | 8 | 6 | | Tenth | 12 | 5 | 7 |
| Fourth | 15 | 6 | 9 | | Eleventh | 12 | 7 | 5 |
| Fifth | 17 | 12 | 5 | | Federal | 12 | 4 | 8 |
| Sixth | 16 | 10 | 6 | | | | | |

Reconciliation. FJC-active plus uscourts vacancies equals the §133 seat count in every district row except two, which I did not resolve:

- S.D. Fla.: FJC lists 19 active against 18 seats.
- N.D. Ill.: FJC lists 22 active against 22 seats while uscourts also lists one vacancy there.

One more row, E.D. Tenn., disagreed until I removed an incumbent that the uscourts list shows as having taken senior status on 2026-10-05 and the FJC export still shows as active. That adjustment is in the CSV note column. Circuits reconcile exactly (179 active, 0 vacancies).

The FJC export also carries a "Seat ID" for each appointment (a stable seat label such as a court code plus a two-digit sequence), which the engine could reuse as the seat id.

### 1.4 Facts and inferences: senior status

Fact. 28 U.S.C. §371(b)-(c): a judge may keep the office but retire from regular active service ("senior status") on full salary at these age and service pairs: 65 with 15 years, 66 with 14, 67 with 13, 68 with 12, 69 with 11, 70 with 10. §371(d): the President appoints a successor. §371(e): to keep drawing the salary the judge must be certified each year as doing a set minimum of work, roughly three months of an active judge's workload. Source: https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partI-chap17-sec371.htm (accessed 2026-10-11). The "Rule of 80" is the common name for age plus service of at least 80 with a floor of age 65 and 10 years; the table gives exactly that, and the name is not in the statute text.

Fact. §46(c) lets a senior circuit judge take part in an en banc court in two situations: reviewing a decision of a panel he or she sat on, or continuing a case heard en banc while in active service. Whether and how senior judges fill ordinary panels (28 U.S.C. §294) I did not read.

Inference, eligible judges now (my count from the FJC export, year-resolution ages, service counted from first Article III commission): about 104 of 652 district appointments, 43 of 178 circuit appointments, and 5 of the 9 Justices meet the age and service test as of 2026. Treat as approximate; birth and commission months were ignored.

Fact, no official take-up rate. I did not find an Administrative Office or FJC statistic for the share of eligible judges who take senior status in a year. I tabulated it myself (§3.3).

### 1.5 Inference: nomination to confirmation lags (circuit and district)

From the FJC export, nomination date to confirmation date, in days. Medians, with quartiles in parentheses (my calculation; the 2025-26 row covers only nominees already confirmed, so it is cut off on the slow side):

| Era (by nomination date) | Circuit | n | District | n |
|---|---|---|---|---|
| Obama | 191 (126-235) | 55 | 160 (122-224) | 269 |
| Trump, first term | 87 (49-122) | 54 | 181 (122-220) | 177 |
| Biden | 131 (87-159) | 45 | 98 (68-154) | 187 |
| Trump, second term to date | 75 (43-105) | 10 | 78 (71-92) | 46 |

---

## 2. Mortality

### 2.1 Facts

**Source used.** National Center for Health Statistics, *United States Life Tables, 2024*, National Vital Statistics Reports vol. 75 no. 5, dated August 25, 2026, by Arias, Xu and Tejada-Vera. PDF https://www.cdc.gov/nchs/data/nvsr/nvsr75/nvsr75-05.pdf. Spreadsheet tables Table01 (total), Table02 (males), Table03 (females) at https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/NVSR/75-05/ (the ftp copy of Table02 is dated 2026-04-06). Accessed 2026-10-11. Index page: https://www.cdc.gov/nchs/products/life_tables.htm.

Table year: 2024 period life table. Life expectancy at birth 79.0 total, 76.5 males, 81.4 females. The report is a complete (single-year-of-age) table built from 2024 final mortality data, July 1, 2024 population estimates and 2024 Medicare data for ages 66 to 99.

**Extract, ages 45 to 95** (qx = probability of dying between age x and x+1; every year in `COURTS-life-table-us-2024-qx-ages45-95.csv`):

| Age | qx male | qx female | ex male | ex female |
|---|---|---|---|---|
| 45 | 0.00353 | 0.00204 | 34.6 | 38.3 |
| 55 | 0.00704 | 0.00429 | 26.1 | 29.2 |
| 65 | 0.01569 | 0.00996 | 18.4 | 20.8 |
| 70 | 0.02222 | 0.01447 | 14.9 | 16.9 |
| 75 | 0.03290 | 0.02308 | 11.6 | 13.2 |
| 80 | 0.05391 | 0.04001 | 8.6 | 9.9 |
| 85 | 0.09058 | 0.07022 | 6.1 | 7.1 |
| 90 | 0.15666 | 0.12721 | 4.2 | 4.9 |
| 95 | 0.25303 | 0.21388 | 2.9 | 3.3 |

**SSA actuarial life table.** https://www.ssa.gov/oact/STATS/table4c6.html returned HTTP 403 to curl and to the fetch tool. Not read, not used. The CDC table is the primary source in this note.

### 2.2 Inference: judges die much less often than the general table says

My calculation. For judge-years 2005 to 2024 (a judge counted from the year after first commission until death or leaving the judiciary, ages 55 to 95, active or senior), I summed the CDC 2024 sex-specific qx to get expected deaths and counted deaths recorded in the FJC export:

| Age band | Judge-years | Deaths | Expected at CDC qx | Ratio |
|---|---|---|---|---|
| 55-64 | 7,345 | 13 | 70.2 | 0.19 |
| 65-74 | 7,680 | 38 | 153.7 | 0.25 |
| 75-95 | 7,765 | 375 | 607.7 | 0.62 |
| All | 22,790 | 426 | 831.6 | 0.51 |

Cautions: the 2024 table has lower mortality than the 2005-2023 years it is applied to, which pushes the ratios down a little; the FJC export may miss deaths of judges who resigned and later died (I stopped counting them at resignation); small cells at 55-64. Directionally it is robust: sitting federal judges are a healthy, high-income, well-insured group, and the ratio rises with age.

---

## 3. Strategic retirement and the hazard of leaving

### 3.1 Facts: Supreme Court (the strongest source)

Stolzenberg, R. M. and Lindgren, J. (2010), "Retirement and Death in Office of U.S. Supreme Court Justices," *Demography* 47(2): 269-298. DOI 10.1353/dem.0.0100. Results, Discussion and tables read at https://pmc.ncbi.nlm.nih.gov/articles/PMC3000028/ (accessed 2026-10-11); the methods section was not read closely. Data: every Justice 1789 through 2006, 1,895 justice-years, 110 justices; discrete-time logit event-history models with clustered errors. Findings, from its Tables 3 and 4 and text:

- **Same party as the President, first two years of his term.** The coefficient is 0.985 (z = 2.09), so the odds of retiring rise about 168% (a multiple of about 2.6). Their worked example: a 1% annual retirement probability becomes 2.6%; 10% becomes 22.9%. The same-party effect in years three and four (0.58) and the other-party effect in years one and two (0.71) are not statistically significant.
- **Death in office.** The odds of dying in office are about three times higher when the sitting President is of a different party than the appointer (a 1% annual probability becomes 2.9%). Same-party, years three and four: odds lower by about two-thirds. This is the "hold on until a friendly President" pattern.
- **Age.** Each added year of age raises the odds of retiring about 5.5% (Model 4) to 6.5% (Models 2 and 3). Death-in-office coefficient on age: 0.0646 per year.
- **Pension eligibility.** Becoming eligible multiplies the odds of retiring by about 8.1 to 10.7 (coefficients 2.09 to 2.45). A justice with a 1% probability goes to roughly 8 to 10%; a 5% probability goes to 30 to 36%.
- **Tenure.** The effect is bathtub-shaped: negative and nearly zero in year one, most negative at 15 years (an added year cuts the odds of retiring 12.5%), positive after 25 years, and up 11.2% per added year at 28 years. Authors' summary: average service about 25 years.
- **Health.** Fewer years left to live raises the odds of retiring, to about 8% per year at nine years left.
- **Calendar time.** Retirement odds fell over time; an added decade lowers annual odds 2.2% around 2005.

Caution on use: the printed coefficients are rounded (tenure cubed to two significant figures), so re-evaluating their logit directly gives unstable probabilities. Use their relative effects (odds multiples), not their intercept.

### 3.2 Facts: lower federal courts (abstracts read, full text not read)

The following full texts were not accessible to me (publisher blocks), so these are abstract-level findings. Abstracts were read through the OpenAlex metadata API (https://api.openalex.org/works/doi:...) on 2026-10-11, which republishes the publisher abstract.

- Spriggs and Wahlbeck (1995), "Calling It Quits: Strategic Retirement on the Federal Courts of Appeals, 1893-1991," *Political Research Quarterly*. DOI 10.1177/106591299504800306. Event-count model of annual voluntary departures. Finds more retirements when political conditions favor a successor with the judge's policy views, or when unfavorable conditions are unlikely to change, even with costs of continued service controlled. No effect size in the abstract.
- Nixon and Haskin (2000), "Judicial Retirement Strategies," *American Politics Quarterly*. DOI 10.1177/1532673x00028004002. Panel probit on appellate judges since 1892. Retirement is mostly explained by personal factors (salary, pension, workload); the one clear strategic effect is whether a judge facing an opposing-party President is far from that President's next election.
- Yoon (2006), "Pensions, Politics, and Judicial Tenure: An Empirical Study of Federal Judges, 1869-2002," *American Law and Economics Review*. DOI 10.1093/aler/ahj003. Finds departures increasingly timed to pension qualification, with political and institutional factors having little influence.
- Vining (2009), "Politics, Pragmatism, and Departures from the U.S. Courts of Appeals, 1954-2004," *Social Science Quarterly*. DOI 10.1111/j.1540-6237.2009.00665.x. Cox proportional hazards; 1954-2004 judge-years. Political effects are limited to partial retirements (senior status); personal and institutional variables dominate outright departures; reform of pension rules in 1984 widened room for strategy.
- Chen and Reinhart (2024), "The Disavowal of Decisionism: Politically Motivated Exits from the U.S. Courts of Appeals," *Review of Law & Economics*. DOI 10.1515/rle-2024-0044. Data 1802-2019 at the quarter-to-election level. Reports that 11% of retirements and 23% of resignations from the courts of appeals may be linked to political cycles; judges are less likely to retire before an election when the President is of a different party than their appointer, and more likely to resign after the election if the President is of their appointing party; politically motivated retirements account for 14% of retirements since 1975.
- Deschler and Sen (2024), "The Role of Judge Ideology in Strategic Retirements in U.S. Federal Courts," *Journal of Law and Empirical Analysis*. DOI 10.1177/2755323X241246849. Since Reagan's election, Democratic appointees to lower federal courts have been more likely to retire strategically than Republican appointees; more conservative Republican appointees retire strategically more than moderates, who appear to wait out Trump-type Presidents and leave under Democrats. No effect sizes in the abstract.

Reading across them: the literature disagrees on lower courts before the 1980s and agrees increasingly on a partisan-timing effect since then, with pension eligibility as the dominant cause everywhere.

### 3.3 Inference: my own tabulation from the FJC export (not peer reviewed)

Question. Among judges who meet the §371(c) test at the start of a year, how often do they leave active service in that year, and does it differ when the sitting President shares the judge's appointing party?

Method. Judge-years 1985 to 2025. A judge is at risk in year Y if still active on January 1, with age (Y-1 minus birth year) at least 65, service (Y-1 minus first Article III commission year) at least 10, and age plus service at least 80. Event: senior status, retirement or resignation dated in year Y. Death, and elevation to another court, are treated as censored. "Same party" means the President in office that year (the inauguration year goes to the new President) shares the party of the judge's appointing President. Judge's court is the court of the first appointment. No controls. Counts are in `COURTS-senior-status-hazard.csv`. The risk ratios use a log-ratio normal approximation for the 95% interval.

| Period | Court | Same-party exits / eligible judge-years | Other-party | Ratio (95% CI) |
|---|---|---|---|---|
| 1985-2025 | District | 268 / 1,177 = 22.8% | 191 / 1,247 = 15.3% | 1.49 (1.26-1.76) |
| 1985-2025 | Appeals | 74 / 466 = 15.9% | 24 / 417 = 5.8% | 2.76 (1.78-4.29) |
| 1985-2000 | District | 27.3% | 21.1% | 1.30 (0.97-1.73) |
| 1985-2000 | Appeals | 20.5% | 20.3% | 1.01 (0.53-1.92) |
| 2001-2025 | District | 197 / 917 = 21.5% | 125 / 934 = 13.4% | 1.61 (1.31-1.97) |
| 2001-2025 | Appeals | 58 / 388 = 14.9% | 10 / 348 = 2.9% | 5.20 (2.70-10.02) |
| 2009-2025 | Appeals | 53 / 320 = 16.6% | 8 / 303 = 2.6% | 6.27 (3.03-12.97) |
| 2001-2025, years 1-2 of a term | Appeals | 18.8% | 4.7% | 3.98 (1.91-8.29) |
| 2001-2025, years 3-4 of a term | Appeals | 10.6% | 1.1% | 9.39 (2.22-39.74) |

Annual exit rate among eligible judges by age (all courts, 1985-2025): 19% at 65-66, 19% at 67-68, 22% at 69-70, 15% at 71-72, 12.5% at 73-75, 10% at 76-80, 14% at 81+. By years since first becoming eligible: 25.6% in the first eligible year, then 17.8%, 16.2%, 15.1%, 20.8%, 14.4%, 13.4%, 7.4%, 9.4%, 13.1%, and 10.3% for ten or more years.

Reading. The pre-2001 appeals effect is zero; the post-2001 appeals effect is large and wide in its interval. That pattern agrees with Deschler and Sen's and Chen and Reinhart's reading and with Vining's 1984 turning point, but my numbers are crude and unadjusted for age, workload or ideology.

---

## 4. Universal injunctions: the current law

### 4.1 Facts: Trump v. CASA, Inc., 606 U.S. 831 (2025)

Read from the Court's preliminary print, https://www.supremecourt.gov/opinions/24pdf/606us2r66_j426.pdf (listed at https://www.supremecourt.gov/opinions/slipopinion/24, accessed 2026-10-11). No. 24A884, argued May 15, 2025, decided June 27, 2025, on applications for partial stays. Justice Barrett wrote for six (the Chief Justice and Justices Thomas, Alito, Gorsuch and Kavanaugh joined); Justices Sotomayor, Kagan and Jackson dissented.

**Holding.** The Court held that "Universal injunctions likely exceed the equitable authority" the Judiciary Act of 1789 gave federal courts, because nothing like them existed in the equity practice the statute incorporates. It granted the partial stays only to the extent the injunctions reach beyond what gives each plaintiff with standing complete relief (syllabus; opinion pp. 839-862). The question decided was remedy; the Court did not reach the merits of the executive order on birthright citizenship.

**Complete relief is not universal relief.** Relief limited to the parties can incidentally help nonparties, but the court may not extend it to cover everyone similarly situated.

**What it left open, in the Court's words or the separate opinions:**

1. **Class actions under Rule 23.** The majority treated the old "bill of peace" as the ancestor of the Rule 23 class action and said universal injunctions get around Rule 23's protections (numerosity, commonality, typicality, adequacy). It did not rule on any class. Justice Alito's concurrence flagged class certification, and third-party standing for States, as unresolved issues that could limit the decision's practical effect. Justice Kavanaugh's concurrence listed preliminary relief to a Rule 23(b)(2) nationwide class and APA set-aside as the routes that remain, and predicted that losing parties in such cases will regularly bring stay applications to the Court, which must then grant or deny them.
2. **State plaintiffs.** The Court did not decide whether the States' injuries required a universal injunction; it left it to the lower courts to consider whether a narrower injunction affords the States complete relief. It also did not address whether the States have third-party standing to assert their residents' citizenship claims (opinion n. 2; Justice Alito's concurrence).
3. **APA vacatur.** Footnote 10: "Nothing we say today resolves" whether the APA authorizes vacatur of agency action, citing 5 U.S.C. §706(2), which directs courts to "hold unlawful and set aside agency action" (text read at https://www.govinfo.gov/content/pkg/USCODE-2024-title5/html/USCODE-2024-title5-partI-chap7-sec706.htm).
4. **Article III.** Footnote 4: the decision rests only on the Judiciary Act; the Court expresses "no view" on the Government's argument that Article III forecloses universal relief.
5. **Timing.** The executive order's citizenship section was not to take effect until 30 days after the opinion, per the Solicitor General's representation at argument.

### 4.2 Facts: what has happened since, on supremecourt.gov

- **Trump v. Barbara, No. 25-365**, argued April 1, 2026, decided June 30, 2026 (https://www.supremecourt.gov/opinions/25pdf/25-365_new_5if6.pdf, accessed 2026-10-11). After CASA, plaintiffs filed new suits; in this one the district court provisionally certified a nationwide Rule 23(b)(2) class of affected children and preliminarily enjoined the order. The Court granted certiorari before judgment, held that children born here to parents unlawfully or temporarily present are citizens under the Fourteenth Amendment, and affirmed the district court. So the class route CASA pointed to was the route used, and the case reached the merits within about a year of CASA. I searched the opinion for "class", "Rule 23" and "CASA"; the hits are procedural history and Justice Thomas's dissent, and I found no separate holding on the class certification. That is a keyword search, not a full read.
- **Trump v. California, Nos. 26A124 and 26A139**, per curiam, August 24, 2026 (https://www.supremecourt.gov/opinions/25pdf/26a124_hgci.pdf). A district court entered a final judgment, for plaintiff States, blocking parts of an executive order on elections as to those States; the Court stayed it pending appeal because the Government is likely to show the States lacked standing. It restates the stay test (§5.3). Only the first pages and the stay-standard passage were read.
- I scanned the other 2026 per curiam stay rulings listed on the slip-opinion page (e.g. Nos. 26A203, 26A308, 26A274, 26A388); none turned on universal injunctions on the pages I read. Not read in full.
- *A.A.R.P. v. Trump*, 605 U.S. 91 (2025) is cited in Justice Kavanaugh's concurrence for interim classwide relief. Not opened.

### 4.3 Recommendation for the rule text

Model relief as party-specific by default (the plaintiffs' own complete relief). Give a plaintiff three ways to a wider order, each with its own cost and clock: a provisionally certified nationwide Rule 23(b)(2) class; an APA set-aside of agency action (unresolved, so it should carry real risk of reversal); a state plaintiff arguing the States need broader relief to be whole (remanded, uncertain). Date-stamp the rule "as of June 2025 (CASA), applied in Barbara, June 2026".

---

## 5. The path of a case

### 5.1 District court to circuit

**Facts.**

- Interlocutory appeal of injunctions: 28 U.S.C. §1292(a)(1) gives the courts of appeals jurisdiction of appeals from interlocutory orders "granting, continuing, modifying, refusing or dissolving injunctions" (https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partIV-chap83-sec1292.htm).
- Notice of appeal: 30 days; 60 days if the United States, an agency or an officer is a party (FRAP 4(a)(1)(A)-(B)). Stay pending appeal: ask the district court first (FRAP 8(a)(1)), then the court of appeals, normally decided by a panel, by one judge only where time makes a panel impracticable (FRAP 8(a)(2)(D)).
- Panels: each circuit may hear cases in panels of three judges, a majority of whom must be judges of that court (28 U.S.C. §46(b)); the full court sits in banc only if a majority of circuit judges in regular active service orders it (§46(c)).
- Rehearing: FRAP 40 (the old FRAP 35 is marked "Transferred"; the Federal Rules of Appellate Procedure, effective Dec. 1, 2024: https://www.uscourts.gov/sites/default/files/2025-02/federal-rules-of-appellate-procedure-dec-1-2024_0.pdf, accessed 2026-10-11; I did not check for a Dec. 2025 revision). Petition due 14 days after judgment, 45 in a civil case with the United States as a party. Rehearing en banc "is not favored" and is allowed only for conflict with the circuit's own cases, the Supreme Court, another circuit, or a question of exceptional importance. No response is permitted unless the court asks. Initial hearing en banc is also available and "not favored" (Rule 40(g)). Mandate issues 7 days after rehearing time expires or is denied (Rule 41(b)).

**Timelines, official statistics.** uscourts Table B-4, "Median Time Intervals in Months for Cases Terminated on the Merits, by Circuit," 12 months ending September 30, 2025 (https://www.uscourts.gov/data-news/data-tables/2025/09/30/judicial-business/b-4; data https://www.uscourts.gov/sites/default/files/document/jb_b4_0930.2025.xlsx, accessed 2026-10-11; excludes the Federal Circuit). 25,969 cases terminated on the merits.

| Interval | National median (months) | Range across the 12 regional circuits |
|---|---|---|
| Notice of appeal to last opinion or final order | 9.9 | 4.6 (Eighth) to 15.3 (Second) |
| Oral argument to last opinion | 3.2 | 1.4 (Fifth, Ninth) to 5.4 (D.C.) |
| Lower-court filing to last opinion | 33.9 | 27.1 (Eighth) to 48.9 (Second) |

Table B-4A (civil and criminal appeals only) gives a national median of 10.2 months from notice of appeal to disposition. These are ordinary merits appeals. Expedited appeals from preliminary injunctions run much faster, and I found no official median for them.

**Inference, two recent emergency-path timelines read from per curiam opinions** (https://www.supremecourt.gov/opinions/25pdf/26a203_2b8e.pdf and 26a124_hgci.pdf): *National Park Service v. National Trust* (a non-presidential-power example): preliminary injunction March 31, 2026; circuit stay April 17 (17 days); circuit merits ruling August 7 (about 4 months); Supreme Court ruling on the stay application August 31 (24 days after that ruling). *Trump v. California*: executive order issued about five months before the August 24, 2026 stay. These suggest a stay application is resolved in weeks, not months, once the circuit has ruled.

### 5.2 Supreme Court: emergency applications

**Facts.**

- Supreme Court Rules (effective March 16, 2026; https://www.supremecourt.gov/filingandrules/2026RulesoftheCourt_WEB.pdf, accessed 2026-10-11). Rule 22: an application goes to the Justice allotted the circuit; that Justice may refer it to the full Court; a denied applicant may renew it to another Justice, but a renewed application "is not favored" except where the denial was without prejudice. Rule 23.3: the applicant must say why the relief is not available elsewhere and, except in the most extraordinary circumstances, must have asked the courts below first. 28 U.S.C. §2101(f) is the stay authority cited by Rule 23.2 (statute text not opened).
- Standard, from the Court's own opinions (bound volumes on supremecourt.gov): *Nken v. Holder*, 556 U.S. 418, 426, 434 (2009): the applicant must make "a strong showing" of likely success on the merits; irreparable injury; harm to others; the public interest; the first two are "the most critical." *Hollingsworth v. Perry*, 558 U.S. 183, 190 (2010) (per curiam), for a stay pending certiorari: (1) a reasonable probability that four Justices will consider the issue sufficiently meritorious to grant certiorari; (2) a fair prospect that a majority will vote to reverse; (3) a likelihood of irreparable harm; in close cases the equities are balanced. Texts read at https://www.supremecourt.gov/opinions/boundvolumes/556BV.pdf and https://www.supremecourt.gov/opinions/boundvolumes/558BV.pdf. In 2026 the Court restated the test as likely success, likely irreparable harm and the balance of equities, citing *Nken* (*Trump v. California*, above).
- In CASA the Court also said an applicant on a threshold issue need not show it will win the merits.

### 5.3 Supreme Court: certiorari

**Facts.**

- Rule 10: review "is not a matter of right"; a petition is granted "only for compelling reasons." Listed considerations: a circuit conflict, a state court of last resort conflict, an important federal question not yet settled, or a departure from accepted proceedings; errors of fact or misapplied correct rules are rarely granted. Rule 11: certiorari before judgment only on a showing of "imperative public importance." Rule 13: 90 days to petition after judgment (Rules of the Supreme Court, URL above). 28 U.S.C. §1254(1) authorizes certiorari in any civil or criminal case in a court of appeals.
- Rule of four: at least four Justices must vote to grant certiorari; it began as an unwritten practice and is a hard minimum now. Source: Federal Judicial Center, "The Supreme Court's Rule of Four," https://www.fjc.gov/history/spotlight-judicial-history/rule-four (accessed 2026-10-11). I did not find the rule stated in the Court's own published rules.
- Volume. The Chief Justice's 2025 Year-End Report (https://www.supremecourt.gov/publicinfo/year-end/2025year-endreport.pdf, accessed 2026-10-11): in October Term 2024, 3,856 cases were filed (2,527 in forma pauperis, 1,329 paid), 73 were argued. The Court's own "Supreme Court at Work" page (https://www.supremecourt.gov/about/courtatwork.aspx) says about 80 cases a term get plenary review, but its filing count (5,000 to 7,000) is out of date against the Year-End Report, so I would use the Year-End figures. Inference: about 1.9% of filings were argued.
- Call for response and the Solicitor General's views: see §6.

### 5.4 Supreme Court: the term and the opinion calendar

**Facts.**

- 28 U.S.C. §2: the term begins on the first Monday in October (https://www.govinfo.gov/content/pkg/USCODE-2024-title28/html/USCODE-2024-title28-partI-chap1-sec2.htm). In 2026 that is Monday, October 5 (calendar arithmetic).
- supremecourt.gov: "Usually Court sessions continue until late June or early July"; sittings and recesses alternate at about two-week intervals; opinions are announced during the sittings; the Justices keep working through the summer on petitions and applications (https://www.supremecourt.gov/about/courtatwork.aspx, accessed 2026-10-11).
- Observed: the last opinions of October Term 2025 are dated June 30, 2026 (the slip-opinion list, https://www.supremecourt.gov/opinions/slipopinion/25), and October Term 2023's workload statistics run to a release of opinions and an orders list on July 2, 2024 (Year-End Report 2024, https://www.supremecourt.gov/publicinfo/year-end/2024year-endreport.pdf). The same list shows emergency per curiam rulings continuing in August and September 2026 (nos. 69 to 73).
- Cases argued and decided (Year-End Reports, 2024 and 2025 editions): October Term 2022: 68 argued, 66 disposed of in 55 signed opinions; Term 2023: 69 argued, 64 disposed of in 55 signed opinions; Term 2024: 73 argued, 64 disposed of in 56 signed opinions. In each of 2023 and 2024 there were four per curiam opinions in argued cases. The reports do not explain the gap between cases argued and cases disposed; consolidated cases sharing one opinion and carryover are the likely causes (inference).
- Cases decided in a term that were not argued (emergency per curiams, summary reversals) are extra; October Term 2025's slip list has 68 numbered entries through June 30, 2026, which includes such rulings, so it is not a count of argued cases. Unverified as a measure.

### 5.5 Recommendation: stages with defaults

| Stage | Clock | Default if the player does nothing |
|---|---|---|
| District order (TRO or preliminary injunction) | Days to weeks | Order stands; scope is parties unless a class or set-aside route was used |
| Government notice of appeal | 60 days (30 for private parties) | Order stands |
| Circuit stay motion | Weeks (example: 17 days) | Stay denied; order stands |
| Circuit merits panel | Median 9.9 months for ordinary appeals; seeded per circuit from the CSV | Panel decides |
| Rehearing en banc | Petition within 14 or 45 days | Denied (disfavored by rule) |
| Emergency application | Weeks (example: 24 days after circuit ruling) | Denied unless granted |
| Certiorari | 90 days to petition; four votes | Denied |
| Argument and opinion | Argued October to April; opinion by end of June or early July | Decided on the term calendar |

---

## 6. The Solicitor General

### 6.1 Facts

- Institutional position. The Solicitor General controls the United States' appeals and certiorari petitions, files briefs as amicus, and is invited by the Court to give its views in pending cases (a "CVSG"). In *CASA* the Court itself noted that "on multiple occasions, and across administrations" the Solicitor General had asked it to take up the remedy (syllabus).
- Cert-stage, a study of the Court's own practice. Thompson, D. C. and Wachtell, M. F. (2009), "An Empirical Analysis of Supreme Court Certiorari Petition Procedures: The Call for Response and the Call for the Views of the Solicitor General," 16 *George Mason Law Review* 237 (read at https://patentlyo.com/media/docs/2012/12/16-2_Wachtell.pdf, a mirror of the article; accessed 2026-10-11; a student-edited law review, not peer-reviewed). Findings for 1994 to 2004: the Court asks for the Solicitor General's views in about 11 petitions a year; the grant rate for all petitions is 0.9% but 34% after a CVSG (42% on the paid docket); the Court follows the Solicitor General's recommendation to grant, deny or GVR in 79.6% of cases. In its footnote 163 it reports older estimates of the Solicitor General's grant rate as petitioner of 46% to 80% (70% for 1958-1967; 46% for 1992-1998; "almost 80 percent" in another source). Those are reported by the article from earlier works I did not open.
- Why the Court listens. Bailey, Kamoie and Maltzman (2005), "Signals from the Tenth Justice: The Political Role of the Solicitor General in Supreme Court Decision Making," *American Journal of Political Science* 49(1): 72-85. DOI 10.1111/j.0092-5853.2005.00111.x (abstract read via OpenAlex; full text not read). 1953-2002 data. Justices respond more to the Solicitor General's signal when he and the Justice are ideologically close, or when the signal runs against his own ideological predisposition. The authors present it as a political account, not just expertise.
- Emergency applications. Vladeck (2019), "The Solicitor General and the Shadow Docket," 133 *Harvard Law Review* 123 (read at https://harvardlawreview.org/wp-content/uploads/2019/11/123-163_Online.pdf; student-edited law review essay, not peer-reviewed). Through September 2019, the Solicitor General in the first Trump administration had filed at least 21 applications for stays in about 32 months (12 granted in whole or part), 9 petitions for certiorari before judgment (5 granted), and at least 3 mandamus requests (none granted as such). In the 16 years of the George W. Bush and Obama administrations the office filed 8 stay applications in total. Twelve of the 21 first-term applications sought to stay a nationwide injunction.

### 6.2 Inference

- At the cert stage the office's own petitions are granted at a rate that, whatever the exact figure (46% to 80%), is more than an order of magnitude above the Court's overall 0.9% to 1.9%. Its views in a CVSG carry a 79.6% agreement rate.
- Its emergency record in the first Trump term was about 57% (12 of 21) with at least partial success. The rate of filing rose sharply; success per filing did not match its cert-stage record.
- I did not find a verified count for the second Trump administration's emergency applications or outcomes (2025-26) from a primary source; the decisions I read (*CASA*, *Trump v. California*) are examples, not a tally.

---

## 7. What the engine can use

Each finding is mapped to the §4 design in `PEOPLE-CONGRESS-COURTS.md`.

### Benches

| Design element | Finding to use | Notes |
|---|---|---|
| Thirteen circuits, light seats | Seats per circuit from §44 (179 total); active counts by appointing party from `COURTS-judgeships-circuits.csv` (92 R, 87 D); zero circuit vacancies; four announced future circuit vacancies | A seat's "lean" is not in any source. Derive it from appointing party, or, if the design wants a finer lean, treat it as an authored model, not a finding. |
| Ninety-four districts as aggregate benches | `COURTS-judgeships-districts.csv`: 94 statute rows (91 districts + 3 multi-district groups; add the 3 territories by hand), 673 permanent seats, 647 active, 28 vacant, 275 R / 372 D active | Each district's lean = its R share. FJC seat ids are reusable as stable ids. |
| Supreme Court with vacancies | 9 seats, 6 R and 3 D appointers; ages 54 to 78; 4 to 35 years on the Court; 5 of 9 meet Rule of 80 | Counts only; do not copy individual ages. |
| Lower-court vacancies from senior status and death | Annual exit rate among Rule-of-80-eligible judges: district 13% (other-party President) to 22% (same party); circuit about 3% to 15% since 2001 (about 20% before 2001, with no party gap); the first eligible year is the peak (~26%) (`COURTS-senior-status-hazard.csv`) | Eligible pool now: ~104 district, ~43 circuit appointments. Announced departures are usually conditioned on a successor (11 of 15 future vacancies show "TBD"; inference). |
| Circuit nominations to the Senate count | Median nomination to confirmation 75 to 191 days by era (§1.5); open seats median 370 days old now | The Senate step uses the member-by-member count in Phase J. |

### Retirement and mortality for Justices

- Annual death: CDC 2024 qx by sex and age, with a multiplier for sitting judges of roughly 0.2 at 55-64, 0.25 at 65-74 and 0.6 at 75+ (§2.2; my estimate, flagged).
- Annual retirement: start from a calibrated baseline and apply Stolzenberg-Lindgren's relative effects: about +6% odds per year of age; ×8 to ×10 odds on reaching pension eligibility; ×2.6 odds when the President shares the appointer's party and is in years one or two; the tenure bathtub (low from year 1 to about 15, rising after 25); death-in-office odds about three times higher under an opposing-party President. Do not implement their printed intercept (§3.1).
- Lower courts: apply the same-party multiplier, stronger on the circuits and stronger after 2001 (district ~1.6, circuit ~3 to 6; the circuit interval is wide).

### The case path

- Filing and forum: any challengeable act, plaintiff chooses the district. Clock and default per stage in the table in §5.5.
- Scope: use §4.3 (party-specific by default; class and APA routes; state plaintiffs).
- Circuit panel: three judges from the circuit's seats (§46(b)); full court on a majority of active judges; en banc "not favored" by rule. Durations seeded from `COURTS-appeals-median-months-2025-09-30.csv` (4.6 to 15.3 months median, ordinary appeals).
- Emergency application: Rule 22 and 23, test from *Nken* and *Hollingsworth* (§5.2); record in the case that the application must first be tried below.
- Review: four votes (rule of four); circuit split raises odds (Rule 10); certiorari before judgment on "imperative public importance" (Rule 11). A grant means the case is argued in the term calendar.
- Term calendar: opens first Monday of October (Oct. 5, 2026); opinions through late June or early July; 64 to 66 cases disposed per term in the last three terms (55 to 56 signed opinions, plus about 4 per curiam opinions in argued cases); emergency rulings continue through summer.

### The Solicitor General's standing

- The lever exists in the literature: the Court follows the office's cert-stage recommendations about 80% of the time and is more persuaded when the office argues against its own side's leanings (Bailey et al.). That supports a trust value that moves with the record.
- Suggested inputs: the share of emergency applications won in whole or part (about 57% in the first Trump term sample), applications filed (a surge lowers marginal credibility), positions reversed, arguments the Court rejected. Suggested effects: scale the odds of a stay and of review being granted. These weights are design choices; no source sets them.
- Cert-stage baseline for the office's own petitions: 46% to 80% granted (older estimates), against under 2% for everyone else.

---

## 8. Gaps: what I could not verify

1. **SSA life table**: ssa.gov returned 403; used the CDC/NCHS table instead.
2. **Peer-reviewed full texts**: Spriggs-Wahlbeck, Nixon-Haskin, Yoon, Vining, Chen-Reinhart, Deschler-Sen and Bailey et al. were read at abstract level only; publisher sites blocked retrieval (Sage and others sit behind bot checks, which I did not try to bypass). No hazard ratios from those papers are quoted. Stolzenberg-Lindgren was read in its results, discussion and tables, not in full.
3. **Judges' mortality ratio** (0.19 to 0.62): my own calculation from the FJC export against the 2024 table, with the cautions in §2.2.
4. **The senior-status hazard table** (§3.3) is my own crude tabulation, unadjusted; the CIs are approximations.
5. **Official take-up rate for senior status**: no AO or FJC statistic found.
6. **District reconciliation**: S.D. Fla. and N.D. Ill. do not reconcile between the FJC export and uscourts; I did not determine why. Temporary judgeships (uscourts "Authorized Temporary Judgeships" PDF) were not read. Territorial district judgeships (Guam, N. Mariana Islands, V.I.) were not fetched.
7. **Party is not lean.** Appointing-party counts are facts; ideology scores for seats are not in any source I used.
8. **28 U.S.C. §2101(f)** (stay power) cited through Rule 23 but not opened. *A.A.R.P. v. Trump* not opened.
9. **Trump v. Barbara**: no separate holding on class certification found by keyword search; full read not done. The other August to September 2026 per curiams were skimmed only.
10. **Emergency-application record in 2025-26**: no primary tally found. The 12-of-21 figure is first Trump term, through September 2019, from a law review essay, not peer-reviewed.
11. **Solicitor General cert grant rate**: only older estimates (46% to 80%) reported secondhand in the 2009 Thompson-Wachtell article; no current official rate found. The Office of the Solicitor General's own statistics were not located.
12. **Median time for expedited preliminary-injunction appeals and for emergency motions in circuits**: no official statistic found; B-4 covers ordinary merits appeals.
13. **Circuit panel composition** (share of panels with senior or visiting judges; random assignment rules per circuit): not researched; only §46(b) read.
14. **En banc size in the Ninth Circuit** and other limited en banc courts: §46(c) points to a statute I did not open.
15. **FRAP edition**: used the Dec. 1, 2024 edition; a Dec. 1, 2025 amendment set may exist.
16. **Term-year opinion counts for October Term 2025** were not available (the 2026 Year-End Report is not out); the slip list is not a clean count.
17. **FJC lag**: the FJC export was current to the hour for most rows but lagged the uscourts list by at least one incumbent. Active counts can be off by one or two per district until reconciled.

---

## 9. Case-family predicates and limits (2026-10-12 addendum)

The following 2024 United States Code provisions were opened on 2026-10-12. They identify records the simulation needs before a court case can begin. The case-family mechanics below are recommendations, not claims that every cited statute creates the same cause of action or forum.

| Family | Statutory fact | Required simulation record or constraint |
|---|---|---|
| Emergency construction | [10 U.S.C. §2808](https://www.govinfo.gov/content/pkg/USCODE-2024-title10/html/USCODE-2024-title10-subtitleA-partIV-chap169.htm) permits military construction necessary to support use of the armed forces during a qualifying declared emergency. Section (c)(2) caps domestic-only emergency construction at an aggregate $100 million per declaration. Section (e) requires notice to the congressional defense committees and five days after their receipt before construction proceeds. Section (b) requires source funds to remain unobligated at the first contract; authority ends with the emergency under (f). | Preserve the declaration, military necessity, source project, aggregate redirection, notice receipt, first permitted contract date, actual first contract, obligations, and outlays. Judicial relief can limit future authority or unobligated spending; it cannot refund already obligated or sunk funds. |
| Immigration | [8 U.S.C. §1252](https://www.govinfo.gov/content/pkg/USCODE-2024-title8/html/USCODE-2024-title8-chap12-subchapII-partV-sec1252.htm) places review of final removal orders in courts of appeals. | Record an application or rule injury and select a forum from the actual challenged action. Do not route final-order review through a generic district-court track. |
| Civil rights | [42 U.S.C. §2000d](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/html/USCODE-2024-title42-chap21-subchapV-sec2000d.htm) prohibits discrimination in a program or activity receiving federal financial assistance. | Record a complaint and identify the affected, federally assisted program; a generic rights label does not establish the program nexus. |
| Labor | [42 U.S.C. §2000e-2](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/html/USCODE-2024-title42-chap21-subchapVI-sec2000e-2.htm) identifies unlawful employment practices. | Record the affected worker and employer, or a final rule and a concrete injury, before generating a labor case. |
| Procurement | [41 U.S.C. chapter 71](https://www.govinfo.gov/content/pkg/USCODE-2024-title41/html/USCODE-2024-title41-subtitleIII-chap71.htm) requires a claim decision by a contracting officer before the specified contractor appeal to an agency board or action in the Court of Federal Claims. | Preserve the contractor's claim and contracting-officer decision; that decision determines the next forum and prevents a free-floating procurement suit. |
| Surveillance | [50 U.S.C. §1810](https://www.govinfo.gov/content/pkg/USCODE-2024-title50/html/USCODE-2024-title50-chap36-subchapI-sec1810.htm) provides a civil claim for an aggrieved person subjected to surveillance unlawful under §1809. | Record the particular collection, why it was unlawful, and the aggrieved person; an abstract surveillance policy is insufficient for this path. |

The HAVA election-access path records a dated audit, state response deadline, later Attorney General filing, prospective injunction, and election-night state-call snapshot. The lower judgment's stored enforcement state is in force; its later history describes denial of a stay without labeling the merits appeal denied. Installation is capped by a recorded capacity, so a shortfall can persist into the election-night snapshot.

The emergency-construction slice now records each enacted source project's host state, appropriation, preexisting obligation, transferred authority, emergency-project obligation, and outlay separately. Its signed notice records the congressional committees' receipt day, a first permitted contract day five calendar days later, destination, direct military support, source-project impact, estimated cost, and contract ID. The source project records the day and ID of its first redirected contract. The order may draw no more than the unused part of the $100 million domestic cap for that declaration. A House institutional challenge can cite the enacted bill and named project, but House standing is contested and must pass the ordinary threshold rather than being assumed. A strike-down or emergency termination stops new destination obligations; obligations already made continue to pay out. This is the simulator's bounded treatment of §2808 litigation, not a claim that an appropriation transfer is recoverable from completed construction.
