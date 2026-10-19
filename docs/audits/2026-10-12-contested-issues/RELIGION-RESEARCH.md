# Religion cohort axis: source research

Researched 2026-10-12. Answers PLAN.md §8.2 and the conditional sentence in DECISIONS §5.8. Every URL below was opened on 2026-10-12 unless marked "not opened". Nothing was downloaded into the repo; the CES questionnaires and guides were read as documents only.

## Recommendation

Use the Cooperative Election Study (CES) Common Content, 2020 and 2024 pooled, as the one source for the religion axis. It is CC0, it is the same respondents, weights and validated vote as the existing cohort baseline, and it is the only candidate that lets the game cross religion with race and take a partisan baseline from one file. Use Pew's 2023-24 Religious Landscape Study (RLS) state pages as an outside check on the state shares, not as the shipped data.

Ship seven traditions: white evangelical Protestant, white mainline/non-evangelical Protestant, Black Protestant, Catholic, other Christian, other faiths, unaffiliated. See "Proposed closed set" for why Catholic stays whole.

Largest risk: the guardrails in §5.8 leave religion with few honest material channels. The axis would mostly carry a measured baseline and institutional exposure, not the abortion, LGBTQ, gun and schooling fights that make religion matter in real politics. If the owner wants those issues to reach religion cohorts by name, §5.8 forbids it. Details below.

## Facts (with citations)

### 1. CES Common Content 2020 and 2024

- Religion variables exist in both years. The 2020 codebook table in the guide lists `religpew` (12 categories: Protestant 19,295; Roman Catholic 11,232; Mormon 763; Eastern or Greek Orthodox 352; Jewish 1,560; Muslim 438; Buddhist 583; Hindu 221; Atheist 4,642; Agnostic 4,048; Nothing in particular 13,682; Something else 4,150; N 60,966), `religpew_protestant` (Baptist, Methodist, Nondenominational, Lutheran, Presbyterian, Pentecostal, Episcopalian, Church of Christ/Disciples, Congregational/UCC, Holiness, Reformed, Adventist, Jehovah's Witness, Something else; N 23,377), the denomination follow-ups (`religpew_baptist`, `_methodist`, `_nondenom`, `_lutheran`, `_presby`, `_pentecost`, `_episcop`, `_christian`, and more), `pew_bornagain` (Yes 16,227; No 44,702), `pew_religimp`, `pew_churatd` and `pew_prayer`. Source: CCES Guide 2020, file id 5793681 in doi:10.7910/DVN/E9N6PH, codebook section.
- The 2024 pre-election questionnaire has the same set with the same wording: `religpew` (same 12 codes, with an open-text `religpew_t` for "Something else"), `religpew_protestant` (adds the same 13 groups plus open text), the denomination follow-ups, `pew_bornagain`, `pew_religimp`, `pew_churatd`, `pew_prayer`. Source: CCES24_Common_pre.docx, file id 11032062 in doi:10.7910/DVN/X11EP6. The 2024 guide I opened has no frequency table for these variables, so the 2024 counts are not verified. I read the questionnaire, not the CSV header, so the column names in the 2024 CSV are expected, not confirmed.
- The items are YouGov profile questions, shown "if not asked in the last 14 months" (both questionnaires). Panelists asked earlier have prior answers carried in. How the CSV marks carried-in answers is not documented in what I read.
- Sample: 2024 Common Content is 60,000 cases from 60 teams, fielded October 1 to December 10, 2024, matched samples from YouGov (CES_2024_GUIDE_vv.pdf, file id 12050326). 2020 is N = 61,000 (dataset page description, doi:10.7910/DVN/E9N6PH).
- Per-state N, 2024 (guide Table 2): Wyoming 95, North Dakota 114, Vermont 124, Alaska 128, DC 170, South Dakota 173, Hawaii 183, Rhode Island 212, Delaware 219, Montana 231, Maine 287, New Hampshire 298, Idaho 313. 2020 (CCES Guide 2020, Table 2): Wyoming 95, Vermont 150, North Dakota 157, South Dakota 162, Hawaii 196, Rhode Island 197. I did not copy the other 2020 rows. Pooled, Wyoming is 190, North Dakota 271, Vermont 274, South Dakota 335.
- Weights: `commonweight` (all adults), `commonpostweight` (both waves), `vvweight` and `vvweight_post` (matched to a validated registration record, defined for registered adults only). Weighting uses entropy balancing to the 2023 ACS (2019 ACS in 2020), then post-stratifies on age, gender, education, race, born-again status, registration, and prior and current presidential vote, and across states. Weights above 15 are trimmed. Source: both guides, "Using Weights". Born-again status is therefore a weighting target; the guide passage does not name the benchmark for it. Religious tradition (`religpew`) is not a weighting target.
- Vote validation: TargetSmart in 2024, Catalist in 2020 (guides). The existing baseline script already uses these.
- Licensing: CC0 1.0 public domain dedication on both Dataverse records (Dataverse API metadata, opened 2026-10-12). "No files are restricted" on the 2024 record.
- Fit to Pew: a Tufts CES post compares CES 2024 with RLS 2023-24. CES shows Protestant 34.9% vs Pew 40%, nothing in particular 21.2% vs 19%, born-again or evangelical 33% vs 29%, evangelical denomination 21% vs Pew 23%, and "something else" 6.9% vs 2% after hand recoding. Weekly attendance and "very important" are within about 0.7 points. The author calls CES "a slightly more secular America" (https://sites.tufts.edu/cooperativeelectionstudy/?p=82). The post says nothing about state-level use.
- The CES 2020 guide itself publishes a vote split for "White evangelical/born-again Christian": 15% Biden, 83% Trump, 34% of the sample (guide, validated-vote table). That is a published example of the baseline this axis needs.

### 2. Pew Religious Landscape Study 2023-24

- Design: NORC, July 17, 2023 to March 4, 2024, address-based, mixed mode (web, paper, phone), 36,908 completes from 205,100 sampled addresses, AAPOR RR3 of 20%. Designed for at least 300 completes per state. Weights are raked to noninstitutionalized adults with State x Race/Ethnicity as a raking dimension. Variance by 500 Rao-Wu bootstrap replicates. (https://www.pewresearch.org/religious-landscape-study/methodology)
- Unweighted state N and published margin of error (https://www.pewresearch.org/2025/02/26/2023-24-rls-sample-sizes-and-margins-of-error/): Iowa 310 (±7.8), New Hampshire 313 (±8.0), West Virginia 335 (±7.0), Mississippi 338 (±7.7), Utah 340 (±7.3), Maine 343 (±7.2), DC 344 (±7.3), Delaware 345 (±7.4), Idaho 346 (±7.1), Hawaii 348 (±8.1), Alaska 350 (±7.7), Wyoming 367 (±7.1), Vermont 373 (±7.3). California 3,746 (±2.4).
- Categories on the state pages: Evangelical Protestant, Mainline Protestant, Historically Black Protestant, Catholic, Latter-day Saint, Orthodox, Jehovah's Witness, Other Christian, Jewish, Muslim, Buddhist, Hindu, Other world religions, Something else, Atheist, Agnostic, Nothing in particular (https://www.pewresearch.org/religious-landscape-study/). Pew assigns evangelical, mainline and Black Protestant by denomination (the classification is in Appendix B, not opened).
- Shape of state output: whole-number percentages, "<1%" for small groups, "may not sum to 100% due to rounding", "1% did not answer" (Wyoming and Vermont pages, opened). So a state's shares do not sum to 1 as published and a "did not answer" remainder exists. Wyoming: evangelical 23, mainline 19, Catholic 12, Latter-day Saint 6, unaffiliated 34 (atheist 5, agnostic 5, nothing 24); Vermont: evangelical 8, mainline 17, Catholic 18, unaffiliated 45.
- Race crossing and party at state level: the state pages show a "Political party" chart title but the text I could read has no figures, and no tradition-by-race table. Not found. Weighting includes State x Race, so microdata could cross them; the public pages do not.
- Microdata: a restricted-use file at ICPSR (study 39498) needs a Restricted Data Use Agreement; a public version is said to be on openICPSR. I did not open ICPSR; this comes from a search result, so treat it as unverified.
- Terms (https://www.pewresearch.org/about/terms-and-conditions/): Section 1 allows copying, citing, modifying, creating derivatives and selling or licensing Content, with copyright notices kept and no implied endorsement. Content "attributed to a third party" cannot be downloaded or republished as a standalone file, and Content may not be republished "in full or in principal part" without written permission. Section 13 (datasets): excerpts only, not in full or substantially in full; attribution and a disclaimer required; no re-identification. Section 3 bars scraping. The page's recommended citation is "Pew Research Center. 2025. '2023-24 U.S. Religious Landscape Study Interactive Database.' DOI: 10.58094/3zs9-jc14." A full 51-row by 17-column table is arguably "substantially in full", so I would not ship it without asking Pew. I am not giving legal advice.

### 3. PRRI Census of American Religion and American Values Atlas

- Source: the 2023 report PDF (https://www.prri.org/wp-content/uploads/2024/08/PRRI_Dec_2024_Religion_final.pdf), its landing page (https://prri.org/research/census-2023-american-religion/) and a search listing of the 2023 methodology (the methodology page at avaclassic.prri.org did not resolve; ava.prri.org not opened).
- What it publishes: county-level estimates for 3,142 counties in 18 religious and racial categories, including white evangelical Protestant, white mainline/non-evangelical Protestant, Black Protestant, Hispanic Protestant, white Catholic, Hispanic Catholic, Latter-day Saints, Jewish, Muslim, Buddhist, Hindu, and unaffiliated. The report text shows the top 10 counties per group, not a state table. A state-by-category table of shares was not found in the report or on the landing page.
- Method: pooled AVA surveys 2014-2023 (the report gives both "roughly 500,000" and "417,000" cases), phone through 2020 and Ipsos KnowledgePanel from 2021. County estimates come from a small-area model whose inputs include county demographics, urbanicity and the county's 2020 Trump vote share (report, footnote and "American Religious Identity at the County Level").
- State N (report Table A1): the 2023 panel sample is 40,000, with 2023-only state N of Wyoming 90, Vermont 69, DC 69, Alaska 55, North Dakota 84, Hawaii 100. The 2021-2023 pool has Wyoming 104, Alaska 128, North Dakota 141, Vermont 120, DC 137.
- Race crossing is built into the categories. Born-again or evangelical self-identification, asked of Christians, splits white Protestants into evangelical and mainline (report footnote 2).
- Party: the report states party identification by group at the national level (for example, 61% of white evangelical Protestants identify as Republicans). It reports identification, not validated vote.
- Terms: "All rights reserved"; PRRI, PRRI Census of American Religion and American Values Atlas are registered trademarks (landing page footer). No data-use or citation terms found. A PRRI terms-of-use URL returned 404.

### 4. U.S. Religion Census 2020 (ASARB)

- What it counts: congregations and their adherents, by county, for 372 religious bodies; 356,642 congregations; adherents are people affiliated with a congregation, including members, children and regular attendees. Adherent data exist for only some bodies (https://www.usreligioncensus.org/node/581; Intro-NationalOverview-Grammich.pdf at usreligioncensus.org).
- The study says adherents are 48.6% of the 2020 population and notes that national surveys show higher identification; it cites the 2018 GSS at 76.5% of adults identifying with a religious group. Black Protestant bodies "have not participated to the same degree", so ASARB gathered some data from church directories and "recognizes likely inaccuracies in several". Table 1: Conservative Protestant 16.5% of population, Mainline 5.2%, Black Protestant 2.2%, Catholic 18.7%, Latter-day Saints 2.0%.
- No race crossing, no individual-level data, no partisan data. No unaffiliated count exists by construction.
- Terms: the page says "This study is not for marketing purposes"; no data-use or citation terms found; a copyright footer with no named owner. The publication is sold for $50.

### 5. Gallup and others

- Gallup's state religious-affiliation page covers 2000-2004 only: 62,744 telephone interviews, categories Protestant, Other Christian, Catholic, Mormon, Jewish, None, at least 200 per state except North Dakota, South Dakota, Wyoming and Delaware (Delaware 145, DC 121). It is 22 years old, has no race crossing and no newer replacement (https://news.gallup.com/poll/12091/Tracking-Religious-Affiliation-State-State.aspx). Not usable.
- No other state-level source with tradition shares was found in this pass. The GSS and ANES are national samples too thin for states; I did not open either, so that is a recollection and not a finding.

## Comparison

| | CES 2020 + 2024 | Pew RLS 2023-24 | PRRI AVA / Census | U.S. Religion Census 2020 | Gallup 2000-04 |
|---|---|---|---|---|---|
| Measures | Self-identification, plus born-again | Self-identification, tradition by denomination | Self-identification, race x tradition | Congregation adherents | Self-identification |
| Unit | Individual respondent | Individual (state pages show aggregates) | Individual; county estimates modeled | Congregation, county | Individual |
| Years | 2020, 2024 (pool) | Jul 2023 to Mar 2024 | 2014-2023 pooled; 2021-23 online | 2020 | 2000-2004 |
| Categories | 12 `religpew` + denomination + born-again | 17 on state pages | 18 incl. race | 372 bodies, 217 with adherents | 6 |
| Smallest state N | WY 95 (190 pooled) | Iowa 310, WY 367 | WY 104 (2021-23) | not a sample | DE 145 |
| Shares sum to 1 | Yes, if built from one coded variable | No as published (rounded, "did not answer") | Not found at state level | No (48.6% of population) | Yes |
| Crosses with race | Yes, individual level | Not on public pages | Built into categories | No | No |
| Partisan / vote | Validated vote, same file | Party chart exists, figures not read | Party ID, national | None | None |
| Terms | CC0 | Citation plus excerpt limits; microdata restricted | All rights reserved; no data terms found | Not found; "not for marketing" | Not found |
| Main weakness | Small states; opt-in panel; tradition not weighted | Small state MOE ±7 to 8; no race cross; coarse rounding | No state table; model uses 2020 vote as input | Wrong construct for voters | Obsolete |

## Inferences

- Every source is thin for the smallest states. Pooled CES gives Wyoming 190 respondents. For a 25% share the unweighted standard error is about 3.1 points (the square root of 0.25 x 0.75 / 190), so a 95% interval is about ±6 before the design effect and plausibly ±8 after it. Pew's published margin for Wyoming is ±7.1. CES pooled is about as precise as Pew for the smallest states and more precise for most others (for example Texas, Florida, California, with thousands per year). No source removes the small-state problem; the fallback does.
- Pew is the better measure of religious composition (probability-based, mixed mode, denomination-coded, "something else" at 2%). CES over-reports "something else" and the secular side by a few points. The adults-by-tradition margin can be raked to Pew's national figures to remove that gap.
- PRRI cannot be used for a state axis. It publishes no state table I could find, and its county model takes the 2020 Trump vote as an input, so a PRRI-derived share already contains partisanship. That would sit badly with §5.10 (demography never derives lean) once composition and baseline came from different places.
- The U.S. Religion Census measures congregations, not people. Adherents are 48.6% of the population, Black Protestant counts are admittedly incomplete, and the unaffiliated are absent. A voter cohort needs everyone, so it cannot serve as the composition source. It could sanity-check geography (where Southern Baptists or Latter-day Saints concentrate) but the game would not ship its numbers.
- CES's weights treat born-again status as a calibration target, so the evangelical share is partly pinned by CES's own benchmark. That helps the evangelical split and also means CES cannot be used to test it independently. Pew's number is the independent check.

## Proposed closed set (recommendation)

Seven cohorts, one per person, summing to 1 in every state:

1. White evangelical Protestant: `religpew` = Protestant, white non-Hispanic, `pew_bornagain` = Yes. PRRI draws the same line (footnote 2).
2. White mainline or non-evangelical Protestant: Protestant, white non-Hispanic, `pew_bornagain` = No. Includes respondents who say only "Protestant" and give no denomination.
3. Black Protestant: Protestant, Black non-Hispanic, any born-again answer. This is the PRRI definition by race and tradition. Pew uses denomination, which the CES denomination follow-ups allow as a check but not as the main rule.
4. Catholic: `religpew` = Roman Catholic, all races. Keep it whole. The Hispanic-Catholic split is already carried by the race axis (`race-hispanic`), and a second split would double count with only 8 percent of the population in each of the white and Hispanic halves (PRRI national, 2023). The abortion and immigration views of the two halves differ, but under §5.8 the game cannot assign a belief by group, so the extra split buys no mechanism.
5. Other Christian: Mormon (763 in 2020), Eastern or Greek Orthodox (352), Jehovah's Witness (from `religpew_protestant`, 277), and Protestants who are neither white nor Black non-Hispanic (Hispanic, Asian, Native, multiracial). Latter-day Saints are concentrated enough to dominate Utah and Idaho and deserve a named reading there, so keep Latter-day Saints as a member of this cohort now and split it only if the share in Utah or Idaho proves large and sampling allows.
6. Other faiths: Jewish (1,560), Muslim (438), Buddhist (583), Hindu (221) and recoded "Something else" that resolves to a named faith. Small nationally, so a state's reading will lean on shrinkage.
7. Unaffiliated: Atheist, Agnostic, Nothing in particular. One cohort, 31% of the 2020 sample by the three categories (4,642 + 4,048 + 13,682 of 60,966, or 30.3%). Do not split secular from "nothing in particular" in the state shares; `pew_religimp` could do it later.

Why these splits matter for the game: the abortion, LGBTQ and gun fights divide white evangelicals, white mainline Protestants and Black Protestants from each other in real coalitions, and a single "Protestant" bucket would repeat the §13.1 failure of putting opposing coalitions on one line. Catholic stays whole because the race axis already carries the Hispanic split. The unaffiliated are about 30% of the CES 2020 sample and, in the CES 2020 guide's validated-vote table, 72% Biden for the "None" group, so merging them into "other" would hide a large, distinctive bloc.

"Something else" needs a rule. In 2020 it is 4,150 of 60,966 (6.8%) against Pew's 2%. The Tufts author hand-recoded it. Recommend a coded mapping: if the open text names a faith, assign it; if it says Christian, assign by race and born-again; else place it in other faiths and record the count. The 2024 open-text field `religpew_t` supports this; whether the 2020 CSV carries open text is not verified.

## Minimum sample and small-state fallback

Judgment, not a rule: accept a direct state estimate for a tradition only where the pooled effective sample for that state is large enough that the cell's interval is narrower than the difference between the next-largest state cohorts the game cares about, and use partial pooling otherwise. In practice that means:

1. Estimate each state's seven shares by multilevel regression on respondent race, education, age and urbanicity plus a state intercept, with poststratification to the state's Census cell counts (the same Census source `state-demographics.ts` already records). This pools information from all 60,000 respondents and fixes the small-state noise that a raw share cannot.
2. If the owner wants a simpler method, shrink each state's raw share toward its Census division mean with weight n_eff / (n_eff + k), with k chosen so Wyoming, North Dakota, Vermont, Alaska, DC and South Dakota move most. State k and show the before and after in the vendor note.
3. Pool 2020 and 2024 (done above). CES 2022 and earlier common content exist but I did not open them; adding years would help but would age the shares.
4. Normalize each state to sum to 1, then rake the national total to Pew's national shares to remove CES's secular tilt. Record the raking in the vendor header the way `state-demographics.ts` records its rescaling.
5. Record per-state N and a standard error beside each share, so jitter at campaign start stays inside the estimate's error as DECISIONS §5.8 says for the baseline.
6. Cross-check against the Pew state pages (printed in the vendor note as a comparison, with attribution; not shipped as data) and flag any state where CES and Pew differ by more than the sum of their margins.

The partisan baseline per tradition comes from the same file with `vvweight` on validated voters, following the existing fit script (state-cluster bootstrap). Thin cells: Black Protestant is large in the CES (Black respondents are a large share of 60,000), but "other faiths" splits Jewish, Muslim, Buddhist and Hindu voters whose votes differ; a pooled "other faiths" baseline will be a mix, and the note should say so.

## How this meets DECISIONS §5.8, and where it does not

Met:
- Beliefs stay at the center of the three or four axes and spread stays wide (the §5.8 rule for new cohorts).
- The baseline is an observed, dated, validated-voter two-party share, applied relative to the President's party, not a belief vector inferred from identity.
- No state's lean is derived from composition (§5.10): shares are measured composition, and the baseline is national per tradition.
- Cohorts do not move headline approval (§5.9): the baseline is calibrated so the share-weighted cohorts reproduce the headline.
- Source: individual-level, published, CC0.

Tension, plainly:
- §5.8 says a cohort exists only if a decision in Washington reaches its household through a named mechanism. Religion has no program that reaches a household because of its religion, in the way Medicare, SNAP, disability programs and veterans' benefits do. What reaches a religious cohort reaches it through institutions, and only some of those are honest:
  - Religious-liberty and exemption law (RFRA, employer conscience rules for contraception and health plans, Title VII religious accommodation): a mechanism for people whose practice an act burdens or exempts. Reaches the evangelical, Catholic, other-faith and Jewish and Muslim cohorts differently, but only for religiously observant members, not for the whole self-identified group.
  - Tax status and speech rules for churches and religious nonprofits (the Johnson Amendment, charity deductions): reaches congregations and their givers.
  - School funding rules (vouchers, aid to religious schools): reaches households with children in religious schools, strongest for Catholics and evangelicals.
  - Contracting with faith-based social service providers and refugee resettlement through religious agencies: reaches the staff, clients and donors of those providers.
  - Protection and security grants for houses of worship and enforcement of religious hate-crime law: reaches Jewish, Muslim and Black Protestant congregations most.
- These channels reach institutions and the observant, not the identifying majority. Attendance (`pew_churatd`) is a better exposure proxy than affiliation, which the game could add as a within-cohort exposure weight (observed, not assumed).
- Abortion, LGBTQ rights, guns and public-school curriculum, the four issues you listed, reach religion cohorts through belief and moral conviction. §5.8 allows a belief to move a cohort only through "named mechanisms", and "no scenario or act is keyed to a demographic group by name." So under the guardrail those issues cannot target the religion cohorts. They would reach people through the cultural axis in §13.1 and through the issue channels (health care access, enforcement, school rules), where religious people are affected like others. The religion axis would then show the President's standing among religious groups, as measured, and not push them over a policy that nothing in the model says they feel.
- A flat statement: if the owner reads "material channel" strictly, the honest scope of this axis is a measured partisan baseline, a displayed composition, and the four institutional channels above. If the owner wants culture-war issues to move religious groups by name, §5.8 has to change first, and the research here does not support changing it.

## Resolution option: measured issue positions

Sources: CCES24_Common_pre.docx (file 11032062) and the 2024 guide's codebook (file 12050326) in doi:10.7910/DVN/X11EP6; CES20_Common_pre_qx.pdf (file 4462965) and the CCES Guide 2020 codebook (file 5793681) in doi:10.7910/DVN/E9N6PH. All read as documents on 2026-10-12, no data files opened. Variable names are as printed in the questionnaires; I did not check them against the CSV headers.

### Facts: the items

Every item below is a two-option item (Support/Oppose, or Favor/Oppose for the 2020 roll-call grid). None is a four-point agree scale. The one graded item is `CC24_325`, a 0 to 40 week limit question.

| Issue | 2020 (variable: wording) | 2024 (variable: wording) | Pools across years? |
|---|---|---|---|
| Abortion | `CC20_332a` always allow as a matter of choice; `332b` only in rape, incest or life danger; `332c` prohibit after 20th week; `332d` employers may decline coverage; `332e` no federal funds for any abortion; `332f` illegal in all circumstances; `332g` no hospital-only requirement | `CC24_324a` always allow ("the right to obtain"); `324b` only in rape, incest or life danger; `324c` illegal in all circumstances; `324d` expand access; `CC24_325` until what week should abortion be legal (graded); `CC24_340b` prohibit restrictions on abortion services | Yes for 3 items: always allow (`332a`/`324a`, 2024 adds "the right to obtain"), rape/incest only (`332b`/`324b`), illegal in all circumstances (`332f`/`324c`). Slight drift in the first. |
| Same-sex marriage, LGBTQ, transgender | `CC20_350a` amend federal law to bar discrimination on gender identity and sexual orientation (Favor/Oppose); `CC20_355d` ban transgender people in the military | `CC24_340c` require federal agencies to recognize same-sex and interracial marriages. No transgender-policy item found. | No. No same-wording pair, and `340c` is a double-barreled item. |
| Contraception | none found | `CC24_340a` prohibit government restrictions on contraceptives | 2024 only |
| Guns | `CC20_330a` bar publishing gun-owner names; `330b` ban assault rifles; `330c` easier concealed-carry permits | `CC24_321a` ban assault rifles; `321b` easier concealed-carry permits; `321c` background checks on all sales; `321f` bundle of mental health, red-flag, domestic-violence and background-check measures | Yes for assault ban and concealed carry (same wording). |
| Immigration | `CC20_331a` legal status for long-employed, tax-paying, no-felony immigrants; `331b` more border patrols; `331c` withhold funds from non-reporting police; `331d` cut legal immigration 50%; `331e` +$25 billion border security including a wall; `CC20_350e` Dreamers | `CC24_323a` legal status (same text); `323b` more border patrols (same text); `323c` build a wall; `323d` Dreamers; `CC24_340f` deny asylum to those crossing illegally | Yes for legal status and border patrols. Wall changed (2020 bundles it with $25 billion). Dreamers is on a different grid in each year. |
| Policing, criminal justice | `CC20_334a` end mandatory minimums for non-violent drug offenders; `334b` body cameras; `334c` +10% police; `334d` -10% police and more public services; `334e` ban choke holds; `334f` misconduct registry; `334g` end military surplus program; `334h` allow suits against officers | `CC24_321d` +10% police; `321e` -10% police | Yes for the two police-count items, same wording, but in 2024 they sit inside the gun grid. Context shift is likely. |
| Religion in schools, religious exemptions, school choice | none found | none found | Not available in either year. |

Common Content or module: the 2024 guide defines Common Content as questions "common to all team modules", with a sample size equal to the total (60,000), and the codebook tables show N near 59,970 to 60,000 for abortion, guns and immigration items and 59,688 to 59,846 for the `CC24_340` items. In 2020 the same tables show N near 60,980 for the gun, abortion and policing grids and 60,943 for `CC20_350a`. So these are asked of essentially all respondents, and the N matches the religion counts (2020 `religpew` N 60,966). Two cautions: `CC20_355d` and the 2020 Executive Orders grid have N around 60,500; and the guide carries a section titled "A Warning about Analyzing Subsamples" about small-cell noise.

### Facts: what the data show about spread

The 2024 codebook totals show items that split the whole sample, not only one group. "Make abortions illegal in all circumstances" is supported by 6,304 of 59,964 respondents, "always allow" by 39,048 of 59,971, and the rape-and-incest-only item splits nearly evenly (29,102 support, 30,867 oppose of 59,969). The three abortion items therefore form a usable ladder, and the weeks item (`CC24_325`) gives a graded reading. The unweighted counts above are not population shares; weights (`commonweight`, adults) apply.

### Inference: what the proposal is and is not

The proposal. For each cohort on every axis, compute the weighted share supporting each pooled item, with a standard error, and treat that as the cohort's starting position on the issue. An abortion act then reaches a religion cohort through the cohort's measured distribution on the abortion ladder, the way an act reaches a cohort through its measured exposure on other axes.

How it differs from an identity-inferred belief. Provenance: the number is a dated, sourced, weighted answer to a named question, with an error bar, so it can be audited and re-run; an inferred belief is an author's guess about a kind of person. Shape: the measured position is a distribution (the share on each rung), and CES shows real spread inside groups, so it need not collapse a cohort to a point. Parity: the same fit would be applied to every axis, so religion is not singled out.

How it does not differ. A group average is still a belief assigned to everyone in the group. §5.8 says the partisan baseline "changes only where a cohort starts, never how an act reaches it." Using a measured position as the way an act reaches a cohort goes past that. The partisan baseline is an outcome; an issue position used as a mechanism is an input to behavior. That is a larger step than the baseline and the owner should decide it as a step, not as a footnote.

What DECISIONS would have to say. An amendment to §5.8 along these lines: a cohort may carry a measured position on an issue, taken from a named public survey item pooled across years only where the wording is unchanged, weighted, with its standard error and its within-cohort spread; it sets where the cohort starts on that issue and how wide its response is; `beliefs` still sit at center; no act is keyed to a group by name, and an act reaches a cohort only through its issue's channel and the cohort's measured position there; the position carries a mandatory reason sentence under §5.11; a position moves no headline figure (§5.9) and never derives a state's lean (§5.10). §13.2's IssueDef would need a field naming the survey item or ladder it reads.

### Inference: risks

1. Wording drift. Only about half the items pool cleanly: abortion has three, guns two, immigration two, policing two. "Always allow" changed by two words in 2024, the wall item changed substantively, and the two police-count items moved into a gun grid. Same-sex marriage and transgender policy have no same-wording pair in the two years, so LGBTQ acts could not be fit from CES alone. Religion in schools and exemptions have no items at all.
2. Scale mismatch. Binary support/oppose shares are not a 0 to 6 law-of-the-land scale. A ladder can be built for abortion (illegal in all circumstances, rape and incest only, 20-week limit in 2020 only, always allow, expand access in 2024 only, plus the weeks item), but the mapping from rung shares to a 0 to 6 position is a modeling choice that needs its own rule and its own check. Guns, immigration and policing have no ladder across both years.
3. Small cells. Religion by state has seven cohorts across 51 states; Wyoming has 190 pooled respondents (see above), so a seven-way split leaves tens per cell and a binary item in a cell of 15 has a standard error near 13 points. Measured positions should be national per cohort, with state differences coming only from composition, the same structure as the baseline. Every other axis has the same limit in the small states.
4. Mode and panel. CES is an opt-in YouGov panel matched to a sample frame; it over-represents the secular side by a few points (Tufts post, above), and some cohorts' items could show the same tilt. Weights target born-again status but not issue positions.
5. Period effects. 2020 predates Dobbs; 2024 follows it. Abortion answers may have shifted for reasons unrelated to cohort. Pooling years then blends two regimes; a 2024-only fit is cleaner on abortion but noisier.
6. Stability. A measured position is a snapshot. The game runs for years of in-game time, and an act that changes law should change the position by an authored channel, not leave it frozen.

### Recommendation

Adopt the measured position only for issues where the pooled items support it: abortion (ladder), guns (two items), immigration (two items), policing (two items), and not yet LGBTQ or religion-in-schools. Apply it as a starting distribution with measured spread, national per cohort, on every axis. Amend §5.8 as above before building. For the cultural-issue acts the game cares about, add the missing questions by buying or finding same-wording items; CES team modules and other public surveys may carry them, but I did not open any.

Does this make the religion axis worth adding? Partly. It gives abortion acts a real reach into the religion cohorts, which the current §5.8 does not. For LGBTQ, schools and exemptions it gives nothing from CES, so the institutional channels listed above remain the only honest reach. My judgment: add the religion axis if the owner accepts the §5.8 amendment, because then abortion and guns can reach it by a measured position and the partisan baseline comes along at no extra cost. If the owner declines the amendment, the axis is a baseline and a display, and I would defer it.

## What would change this recommendation

- A written answer from Pew permitting a shipped 51-state table, or access to the openICPSR public file with state identifiers and race, would make Pew the primary composition source and CES the baseline source. Pew has the better composition measure; the blocker is terms and the public pages' lack of a race cross.
- The CES 2024 CSV turning out not to carry `religpew` or `pew_bornagain` for most respondents (the profile-carry-in design could leave them missing). That would break the plan. A header and missing-rate check on the CSV settles it.
- Per-state CES cells below what the multilevel model can stabilize, for example Wyoming's "other faiths" and "Black Protestant" cells being nearly empty. Then collapse to five traditions (merge other Christian into other faiths, merge Black Protestant into a single Protestant-of-color bucket outside the South).
- PRRI publishing a state-by-category table with open terms and a method that does not use the 2020 vote. It would then be a candidate for composition.
- An owner decision that no religion channel is material enough. Then do not add the axis. A "no religion axis" outcome is consistent with the facts above and costs nothing.

## Results (computed 2026-10-12)

The owner approved the download on 2026-10-12. Both CSVs were fetched from Harvard Dataverse (CC0, unrestricted, byte sizes as listed below) into the session scratchpad, outside the repo. The script is `religion-issue-fit.py` (standard library, about 7 seconds), and its full output is `religion-issue-fit.json`, both beside this note. The owner's direction for this step was to do what is best for the application at no added cost: CES is free and the fit runs locally.

**Data checks.** 2024 has 60,000 rows and 2020 has 61,000. Missing `religpew` is 0.10% and 0.06%, missing `pew_bornagain` is 0.05% and 0.12%, and `commonweight` is never missing. The profile carry-in risk under "What would change this recommendation" did not happen.

**"Something else" rule.** CES records 4,837 (2024) and 4,150 (2020) "something else" answers; most leave the write-in blank (3,756 and 2,792). Coded as follows:
- A write-in naming a Christian group goes to that group: Catholic, or Protestant by race and the born-again answer.
- A write-in naming another practice (pagan, Wiccan, spiritual and similar) goes to other faiths.
- A blank write-in goes by the born-again answer or by attending monthly or more, which reads as Christian by race. Seldom or never reads as unaffiliated.

The first draft of the rule sent every non-born-again answer to other faiths, which pushed it to 8.6%. The final rule gives 5.3%.

**National adult shares (pooled, weighted, before any correction):**

| Tradition | Share | Two-party Republican share, validated voters (± state-cluster bootstrap SE) |
|---|---|---|
| Evangelical Protestant (white) | 17.6% | 86.6% ± 0.7 |
| Mainline Protestant (white) | 9.3% | 55.8% ± 1.6 |
| Black Protestant | 6.2% | 14.9% ± 1.4 |
| Catholic | 18.0% | 56.1% ± 1.9 |
| Other Christian | 7.2% | 63.2% ± 1.7 |
| Other faiths | 5.3% | 29.6% ± 2.3 |
| Unaffiliated | 36.4% | 27.4% ± 1.1 |

The evangelical figure agrees with the CES 2020 guide's published 83% Trump among white evangelical or born-again voters (two-party, so slightly higher here).

**State shares.** Each state's raw share is shrunk toward its Census division with weight n_eff / (n_eff + 150). Wyoming (190 respondents) keeps 39% of its own reading, Vermont 49%, Texas and California 96%. Spot checks: Utah's other Christian share (Latter-day Saints) is 38%; Alabama's evangelical share is 34% and Mississippi's 32%; Massachusetts's Catholic share is 28%.

**Raked by race (done 2026-10-12).** CES leans secular, most of all among Black respondents. In Mississippi, whose weighted Black share is a correct 40.6%, only 53% of Black respondents answer Protestant, and nationally 29% of Black respondents say "nothing in particular". So each race group's national tradition mix is now raked to the published mix in `PUBLISHED-TOPLINES.md` Part A (Pew RLS 2023-24; the White and Asian rows are derived, because Pew's pages for them were blocked). Each group's size in each state is kept, and the division shrinkage runs again. The owner's standard for this step: reasonable, not exact. The raked figures are what the game should use (`raked_share` and `raked_national_share` in the JSON).

| Tradition | Raw CES | Raked | Published (source) |
|---|---|---|---|
| Evangelical Protestant (white) | 17.6% | 18.1% | about 16 (Pew, derived), 13 (PRRI) |
| Mainline Protestant (white) | 9.3% | 9.8% | about 9 (Pew, derived), 13 (PRRI) |
| Black Protestant | 6.2% | 8.0% | 8 (PRRI), 5 (Pew, by denomination) |
| Catholic | 18.0% | 18.9% | 19 (Pew), 22 (PRRI) |
| Other Christian | 7.2% | 9.0% | 8 to 10 |
| Other faiths | 5.3% | 5.8% | 6 to 7 |
| Unaffiliated | 36.4% | 30.3% | 29 (Pew), 27 (PRRI) |

Evangelical stays a little high because the CES and PRRI line is the born-again answer, which catches more people than Pew's denominational count.

State changes, raw to raked: Black Protestant in Mississippi 21 to 27%, Alabama 15 to 19%, Georgia 17 to 22%, DC 16 to 20%. Unaffiliated in California 43 to 36%. Other Christian (mostly Latter-day Saints) in Utah 38 to 52%. The issue positions and vote baselines below are unchanged by raking, since they're read within each tradition.

**Measured issue positions.** Support for each item was computed for every existing cohort and all seven traditions, with Kish effective-n standard errors. Pooled items use both years; LGBTQ items are reported per year. A few rows:

| Group | Abortion always legal | Abortion illegal always | Assault-weapon ban | Easier concealed carry | More border patrols | Marriage recognition (2024) |
|---|---|---|---|---|---|---|
| All adults | 58.0% | 16.3% | 58.7% | 39.9% | 70.6% | 64.0% |
| Evangelical Protestant | 20.9% | 30.8% | 37.8% | 58.5% | 89.7% | 33.8% |
| Mainline Protestant | 57.3% | 8.3% | 58.2% | 40.3% | 77.3% | 69.7% |
| Black Protestant | 69.5% | 18.4% | 76.7% | 29.2% | 65.7% | 55.7% |
| Catholic | 55.5% | 18.0% | 59.6% | 40.2% | 75.3% | 64.4% |
| Unaffiliated | 76.2% | 9.1% | 65.6% | 32.5% | 58.5% | 80.6% |

**Cultural-axis reading.** This is the mean share answering on the progressive side across the abortion, gun and LGBTQ items, mapped to −1..+1 and centered on all adults. It's a transparent average, not a fitted scale. Religion separates groups on this axis more than any existing axis does:

| Axis | Lowest group | Highest group | Spread |
|---|---|---|---|
| Religion | evangelical −0.458 | unaffiliated +0.226 | 0.684 |
| Work and veteran status | veteran −0.255 | professional-technical +0.109 | 0.364 |
| Race | race-other −0.087 | Asian +0.153 | 0.240 |
| Schooling | no degree −0.058 | degree +0.117 | 0.175 |

**Conclusion (lead, 2026-10-12).** The religion axis is worth adding, and measured positions are what make it work.
- Religion is the strongest predictor on the cultural axis in the data the game already uses. Leaving it out would leave §13.1's new axis without the group that defines one end of it.
- The measured positions give abortion, gun, immigration and policing acts an honest, sourced reach into every cohort, religion included.
- They replace the §5.8 rule that a new cohort's beliefs sit at the center, which would have made the new axis inert.
- LGBTQ positions are weaker: one item per year, each worded differently, and the 2024 item also covers interracial marriage. Use them, labeled as single-year estimates. Religion in schools and religious exemptions have no CES item; those acts read the cultural reading instead.

This departs from the earlier "partly" judgment above, on the owner's direction to do what is best for the application rather than follow the existing guardrail.

## Next steps

1. **Raking by race is done** (above). `PUBLISHED-TOPLINES.md` Part B also carries published positions by tradition for the issues CES lacks (same-sex marriage, LGBTQ nondiscrimination, religious refusals, transition care for minors, school prayer, the death penalty, marijuana). Phase 1 uses them where CES has no item, labeled as outside estimates.
2. **Turn positions into game parameters** in phase 1. Each cohort gets a measured position per issue (pooled support share and SE) and a measured cultural-axis coordinate. Seeded jitter stays inside the error, following the partisan baseline's rule. Mapping a binary support share onto the 0–6 law-of-the-land scale is a modeling rule, written once and tested.
3. **Vendor the tables** into `packages/world` with a source header, in the shape `state-demographics.ts` uses. Register each new field's consumer (DECISIONS §4.2), and update `cohort.test.ts`'s "names no religion axis" test, which then becomes false.
4. **Amend DECISIONS §5.8 and §13** to record that religion is accepted and that cohort issue positions are measured.

## Download record

Fetched 2026-10-12 with owner approval, through `https://dataverse.harvard.edu/api/access/datafile/<id>?format=original`. Byte sizes matched the listing exactly. The files sit in the session scratchpad and are not in the repo.

1. `CES20_Common_OUTPUT_vv.csv`, 188,283,717 bytes (about 188 MB), Harvard Dataverse file id 4949558, https://doi.org/10.7910/DVN/E9N6PH (file page: https://dataverse.harvard.edu/api/access/datafile/4949558). CC0.
2. `CCES24_Common_OUTPUT_vv_topost_final.csv`, 183,679,005 bytes (about 184 MB), file id 12050325, https://doi.org/10.7910/DVN/X11EP6 (file page: https://dataverse.harvard.edu/api/access/datafile/12050325). CC0.

Not needed to compute shares, and already read for this note: `CES_2024_GUIDE_vv.pdf` (1,162,260 bytes), `CCES Guide 2020.pdf` (879,624 bytes), `CCES24_Common_pre.docx` (113,082 bytes).
