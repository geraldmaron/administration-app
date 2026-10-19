# Phase J research: the 535 members

Researched 2026-10-11 for `PEOPLE-CONGRESS-COURTS.md` §3 and §6. Every source below was opened by the researcher on 2026-10-11 (fetched, or downloaded and parsed). "As of" is the date the source itself states, or the file's HTTP `Last-Modified` where it states none, labeled as such. The game's members are fictional: nothing here names a real member, and the CSVs carry seat keys and aggregates only. (Member identifiers in the source files were used in memory during computation to join datasets and were not written out.)

Companion files, all in this directory: `MEMBERS-house-seats.csv`, `MEMBERS-senate-seats.csv`, `MEMBERS-seniority-hist.csv`, `MEMBERS-nominate-summary.csv`, `MEMBERS-nominate-hist.csv`, `MEMBERS-nominate-vs-lean-correlation.csv`, `MEMBERS-lean-by-party-hist.csv`, `MEMBERS-committees.csv`, `MEMBERS-committee-assignments-hist.csv`, `MEMBERS-turnover-brookings-ballotpedia.csv`, `MEMBERS-turnover-voteview.csv`, `MEMBERS-vacancies-specials.csv`, `MEMBERS-party-unity.csv`, `MEMBERS-party-unity-member-hist.csv`.

## Summary

1. The House seat table in `house-delegations.ts` matches the Clerk's file today in all 50 states (214 D, 218 R, 1 I, 2 vacant). The Senate table matches senate.gov in all 100 rows (state, class, party). Nothing to fix; only the stamped dates are older than the files.
2. A usable per-district presidential vote exists only as a secondary compilation (The Downballot). No official one exists. It is on the lines for the 2026 elections, not the lines the sitting members were elected on, and nine states changed lines since 2024.
3. Voteview's DW-NOMINATE gives party means and spreads by chamber. Across all members, ideology tracks district lean at r ≈ 0.83. Within a party it is much weaker (R 0.32 to 0.35, D 0.51 to 0.57 in the House; R 0.06 in the Senate). That is the key calibration for "ideology from party plus district lean plus jitter".
4. Members almost always vote with their party on party-unity votes (119th so far: mean unity 95 to 99%), and such votes are 70% of House roll calls and 92% of Senate roll calls. A vote model needs defection to be rare, concentrated in a tail of members, and tied to exposure.

## Sources

| Id | Source | URL | As of (stated) | Class |
|---|---|---|---|---|
| S1 | Clerk of the House, MemberData.xml | https://clerk.house.gov/xml/lists/MemberData.xml | `publish-date` October 1, 2026; HTTP Last-Modified 2026-09-29 | Primary |
| S2 | Senate roster XML | https://www.senate.gov/general/contact_information/senators_cfm.xml | Last-Modified 2026-10-08 | Primary |
| S3 | Senate committee rosters (one XML per committee) | https://www.senate.gov/general/committee_membership/committee_memberships_SSAF.xml (and the same pattern for 23 other codes) | Last-Modified 2026-10-11 (SSAF) | Primary |
| S4 | Clerk, House vacancies | https://clerk.house.gov/Members/ViewVacancies | none stated | Primary |
| S5 | House Historian, Vacancies and Successors | https://history.house.gov/Institution/Vacancies-Successors/Vacancies-Successors/ | page states 2026-10-11 | Primary |
| S6 | Senate Historical Office, Appointed Senators | https://www.senate.gov/senators/AppointedSenators.htm | none stated | Primary |
| S7 | Senate party division | https://www.senate.gov/history/partydiv.htm | none stated | Primary |
| S8 | CRS R48535, Membership of the 119th Congress: A Profile | https://www.congress.gov/crs_external_products/R/PDF/R48535/R48535.2.pdf | May 21, 2025 (tenure data as of 2025-01-03) | Official |
| S9 | CRS R46786, House committee assignment rules | https://www.everycrsreport.com/files/2025-08-14_R46786_ad250e4c0780dbb502223eede14267db799f7e28.html | Aug 14, 2025 | Official (CRS text, mirror host) |
| S10 | CRS R46806, Senate committee assignment rules | https://www.everycrsreport.com/files/2025-08-14_R46806_8a83c4c59afacdb67abfcaa5f94f41625a9f3f22.html | Aug 14, 2025 | Official (CRS text, mirror host) |
| S11 | Voteview HSall_members.csv | https://voteview.com/static/data/out/members/HSall_members.csv | Last-Modified 2026-10-11 | Primary for DW-NOMINATE (UCLA, Poole and Rosenthal) |
| S12 | Voteview HS116 to HS119 votes, rollcalls, members | https://voteview.com/static/data/out/votes/HS119_votes.csv (and `rollcalls`, `members`, Congresses 116 to 118) | Last-Modified 2026-10-01; 119th rolls run 2025-01-03 to 2026-09-30 | Primary |
| S13 | Voteview, Party Unity Scores | https://voteview.com/articles/party_unity_scores | page dated 2026-10-06 | Primary (definition) |
| S14 | FEC, Official 2024 Presidential General Election Results | https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf | Last-Modified 2025-01-17; compiled from state election offices | Official |
| S15 | The Downballot, 2020 and 2024 presidential results by congressional district (2026 lines) | https://www.the-downballot.com/p/the-downballots-calculations-of-presidential ; data: https://docs.google.com/spreadsheets/d/1eZfaFI-c-PFOoKx1-zZA2MP0_dxRq_LVK0re3BOQqy0 (tab "Vote totals", gid 1491069057) | post dated 2025-04-23; sheet contents reflect later maps (see §3) | Secondary |
| S16 | Brookings, Vital Statistics on Congress Tables 2-7 and 2-8 | https://www.brookings.edu/wp-content/uploads/2024/11/2-7-Full.pdf , https://www.brookings.edu/wp-content/uploads/2024/11/2-8-Full.pdf | PDFs Last-Modified 2024-11-01; tables end at 2022 | Secondary (think tank, cites FEC and CQ) |
| S17 | Ballotpedia News, retirements | https://news.ballotpedia.org/2024/09/18/for-a-fourth-straight-month-the-number-of-members-of-congress-who-have-announced-retirement-so-far-this-year-is-53/ | 2024-09-18 | Secondary |
| S18 | Ballotpedia News, incumbents who lost | https://news.ballotpedia.org/2024/12/12/fifteen-u-s-house-incumbents-lost-their-re-election-campaigns-this-year/ | 2024-12-12 | Secondary |
| S19 | NCSL, Changing the Maps | https://www.ncsl.org/redistricting-and-census/changing-the-maps-tracking-mid-decade-redistricting | page states 2026-09-11 | Secondary (see why below) |
| S20 | Supreme Court, Louisiana v. Callais, No. 24-109 | https://www.supremecourt.gov/opinions/25pdf/24-109_21o3.pdf | decided April 29, 2026 | Primary |
| S21 | Supreme Court, Allen v. Milligan stay order, No. 25A1314 | https://www.supremecourt.gov/opinions/25pdf/25a1314_7m58.pdf | June 2, 2026 | Primary |
| S22 | Wikipedia, List of special elections to the US House | https://en.wikipedia.org/wiki/List_of_special_elections_to_the_United_States_House_of_Representatives | page as served 2026-10-11 | Secondary |
| S23 | Wikipedia, 2026 United States Senate elections | https://en.wikipedia.org/wiki/2026_United_States_Senate_elections | page as served 2026-10-11 | Secondary |
| S24 | Roll Call (CQ), 2025 vote studies | https://rollcall.com/2026/03/05/vote-studies-2025-sets-new-mark-for-partisanship-on-capitol-hill/ | 2026-03-05 | Secondary |

Why secondary sources were used where they were: S15 because no federal or state body publishes presidential results re-tabulated to congressional districts (states publish precinct data, S14 is state-level only). S16 to S18 because the official Clerk "Statistics of the Congressional Election" volumes do not carry a retirement count, and Brookings tabulates the FEC data. S19, S22 and S23 because the primary records (state statutes, court orders, state election calendars) are fifty-plus separate documents; the two Supreme Court orders that matter most were opened (S20, S21). S24 only as a cross-check on my own party-unity computation.

## 1. House: per-seat table

### Facts

- `MEMBERS-house-seats.csv` has 435 rows keyed by (state, district number, 0 for at-large), with the holder's party from S1 (R, D, I or vacant). The Clerk file also lists 6 non-voting seats (DC, PR, GU, VI, AS, MP), which the file excludes, as `house-delegations.ts` does.
- Clerk totals (S1, publish date October 1, 2026): 214 Democrats, 218 Republicans, 1 independent (CA-3, listed with party I and caucus R), 2 vacant (FL-20, TX-23). The file's title block reads congress 119, session 2, majority R.
- Reconciliation with `house-delegations.ts` (stamped as published 2026-09-02, opened 2026-09-28): I compared all 50 state rows on (D, R, I, vacant). **Zero differences.** The file now on the server is a newer publication (October 1, 2026) with the same party map. S4 shows two seats filled in September 2026 (GA-13 oath September 1; CA-14 oath September 2), so I infer the September 2 table already held them.
- What S1 does and does not carry: it has state-district, party, caucus, election date, swearing-in date, bioguide id, and committee assignments with rank. It has no birth date, no first-year-in-office and no terms served. The `prior-congress` field holds 118 for 364 members, 0 for 74, and 116, 114 and 104 for one member each. From that distribution I infer it is the number of the previous Congress a member served in, not a tenure count, so it cannot give seniority by itself.
- 13 vacancies have occurred in the 119th so far (S4, S5): 5 by death, 8 by resignation. Two remain open (FL-20, TX-23), each with "date TBD" on S4.

### Mid-decade redistricting since 2024 (dated fact list)

Source for the table is S19 (NCSL, page dated 2026-09-11) unless a primary is named. NCSL is a secondary compilation of state actions. I did not open the state statutes or most court orders.

| State | What changed | Date | Used for the Nov 3, 2026 election |
|---|---|---|---|
| Texas | New map enacted; a lower-court injunction was stayed | enacted Aug 29 (2025 implied); U.S. Supreme Court stay Dec 4, 2025 | Yes |
| California | New map approved by ballot measure (Proposition 50) | voters Nov 4, 2025 | Yes |
| North Carolina | New map enacted | Oct 22, 2025 | Page does not say explicitly; primaries were held Mar 3, 2026 |
| Ohio | Backup redistricting commission adopted a new map | Oct 31, 2025 | Yes |
| Utah | New map adopted by court order | Nov 10, 2025 | Yes |
| Missouri | 2025 map adopted, then paused because a repeal referendum qualified; Missouri Supreme Court reinstated the 2022 map | ruling Sep 3, 2026 | August primaries used the 2025 map; the general is expected to use the 2022 map |
| Florida | New map enacted; state-court litigation continues | May 4, 2026 | Yes; primary Aug 18, 2026 |
| Tennessee | New map adopted | May 7, 2026 | Yes; primary Aug 6, 2026 |
| Louisiana | New map enacted after Callais | May 29, 2026 | Yes, but congressional primaries moved to Nov 3 and the general to Dec 12, 2026 |
| Alabama | 2023 state map restored after the U.S. Supreme Court granted Alabama's stay | June 2, 2026 (S21 confirms the stay order and date) | Yes; special primaries Aug 11 |
| Virginia | 2026 map enacted, then voided by the state Supreme Court; 2021 map stays | May 8, 2026 | Old map |

Primary confirmations I opened: S20 (Louisiana v. Callais, argued October 15, 2025, decided April 29, 2026) and S21 (Allen v. Milligan stay, June 2, 2026). NCSL also records proposed changes that did not pass: Indiana (voted down Dec 11, 2025), South Carolina, Washington, and Georgia declining a June 2026 special session.

Consequences for the data:

- Nine states have lines changed since the 2024 election and used in 2026: AL, CA, FL, LA, NC, OH, TN, TX, UT. Together they hold 173 seats. Missouri is treated as unchanged for the general election (2022 shapes).
- A seat key (state, number) is stable, but the people and the lean behind it are not, in those 173 seats. The CSV flags them in `lines_changed_since_2024`.
- Louisiana's congressional general election is Dec 12, 2026, five weeks after the rest.

## 2. Senate: per-seat table

### Facts

- `MEMBERS-senate-seats.csv`: 100 rows (state, class, party, caucus, next regular election year, 2024 presidential result in the state).
- S2 holds 100 senators: 53 R, 45 D, 2 I. Party by class: Class I 14 R, 17 D, 2 I; Class II 20 R, 13 D; Class III 19 R, 15 D.
- Reconciliation with `senate-classes.ts` (as of 2026-09-27): all 100 (state, class, party) rows match S2. No differences.
- Independents: Maine Class I and Vermont Class I. S2 has no caucus field, and S7 does not name the caucus. CRS S8 states that the 2 independents "both caucus with the Democrats" (as of May 21, 2025). S3's committee rosters code both as party D, which agrees. So caucus is D for both; the evidence is CRS plus the committee rosters, not senate.gov's party page.
- The 33/33/34 class sizes in `senate-classes.ts`: Class II is 33 (S23 says 33 regular seats in 2026), which fits. I did not independently count Class I and III beyond S2.

### Inferences

- Next regular election: Class II 2026, Class III 2028, Class I 2030, from six-year terms and the 2024 election of Class I. The CSV states that year and nothing else.
- Two Class III seats also have 2026 special elections, which the roster does not show (S23, secondary): Florida (seat vacated for a cabinet post in 2025) and Ohio (vacated on the Vice Presidency, 2025). Each holder is an appointee. S23 also lists 2026 appointments in Oklahoma (Class II, open seat) and South Carolina (Class II), and 11 open Class II seats (4 D, 7 R). The Senate Historical Office list (S6) shows two appointments effective in 2026, consistent with that, but S6 omits state names in my parse, so I did not match them.

## 3. District lean

### Facts

- No official compilation of presidential results by congressional district exists, as far as I found. States publish precinct or county returns; the FEC's 2024 file (S14) is state-level only (Harris 75,017,613; Trump 77,302,580; total 155,238,302, which my parse of the PDF reproduces).
- Best citable secondary source: The Downballot (S15), which assembled 2024 and 2020 results by hand from precinct data. Its sheet title says "congressional districts used in the 2026 elections". Its post is dated 2025-04-23 and says it reflects all maps adopted before the midterms. The sheet I downloaded today has 435 district rows and reflects at least the later changes in Tennessee, Louisiana, Utah and Missouri (I checked margins in a few districts, not names), so its maps are current to a date after the post. The sheet states no last-edited date, so its as-of is unknown.
- The 2020 columns are blank for districts whose lines changed, so 2020 is only usable for unchanged districts (see `biden_pct_2020`).
- State-level lean for senators comes from S14 (official).

### Distribution (2026 lines, margin = Harris minus Trump, `MEMBERS-lean-by-party-hist.csv`)

- R-held seats (218): mean margin -23.6 points, SD 14.0. D-held seats (214): mean +23.0, SD 21.0.
- R-held seats Harris carried: 7 (4 in changed-line states, 3 in unchanged). D-held seats Trump carried: 22 (15 in changed-line states, 7 in unchanged). Seats within 5 points: 15 R-held, 22 D-held. Within 10 points: 27 R-held, 52 D-held.
- The D-held Trump-carried count is mostly a map effect: members elected on 2024 lines now sit under 2026 lines. That is a fact about this snapshot, not a prediction about who holds those seats after November.
- Senate: 1 R-held seat is in a state Harris carried (Maine); 10 D or I-held seats are in states Trump carried (AZ 2, GA 2, MI 2, NV 2, PA 1, WI 1).

## 4. Seniority

### Facts

- The Clerk XML cannot give seniority (see §1). CRS S8 gives averages: at the start of the 119th (2025-01-03) the House average was 8.6 years (4.3 terms) and the Senate 11.2 years (1.9 terms). 62 House members (14.1%) and 12 senators (12%) were first elected in November 2024. 135 House members (30.6%) and 20 senators (20%) had two years or less in their chamber. CRS notes the tenure sections are not updated after that date.
- I computed distributions from Voteview (S11) joined to the sitting rosters by bioguide id: the number of distinct Congresses each sitting member has appeared in for their current chamber, including the 119th. `MEMBERS-seniority-hist.csv` has the histograms by party (House in Congresses served; Senate in six-year terms, defined as ceil(Congresses / 3)).
- Check against CRS: my House mean is about 5.3 Congresses overall (R 4.74, D 5.85); dropping the 119th itself gives about 4.3, which agrees with CRS's 4.3 terms at the start of the Congress. Counting a member who served non-consecutively once per Congress is how Voteview rows work.
- Shape: House R is concentrated in 1 to 3 Congresses (34, 36, 38 members) with a thin tail to 25; House D is flatter with a heavier tail (13 members at 16 to 20 Congresses against 2 for R). Senate R: 18 in a first term, 16 in a second, 10 in a third, 9 beyond; Senate D: 13, 8, 16, then 8 beyond. House D medians and R medians are both 4.

## 5. Ideology (DW-NOMINATE, 119th, S11)

### Facts

Data as of the file's modification time 2026-10-11, with the 119th Congress scored up to then. `MEMBERS-nominate-summary.csv` and `-hist.csv` hold the full tables (bins of 0.1 on each dimension from -1 to 1). Dimension 1 runs liberal (negative) to conservative (positive); Voteview describes dimension 2 as capturing within-party differences in particular periods. Scored members: 431 of 433 House members (2 new Democrats are unscored) and all 100 senators.

| Chamber and party | n | Dim 1 mean | Dim 1 SD | Dim 1 range | Dim 2 mean | Dim 2 SD |
|---|---|---|---|---|---|---|
| House D | 212 | -0.384 | 0.112 | -0.764 to -0.099 | -0.047 | 0.337 |
| House R | 218 | 0.527 | 0.157 | 0.141 to 0.972 | 0.052 | 0.284 |
| House I (caucus R) | 1 | 0.152 | n/a | n/a | 0.357 | n/a |
| Senate D | 45 | -0.367 | 0.107 | -0.745 to -0.177 | -0.091 | 0.286 |
| Senate I (caucus D) | 2 | -0.358 | 0.266 | -0.546 to -0.170 | -0.304 | 0.177 |
| Senate R | 53 | 0.553 | 0.169 | 0.124 to 0.936 | 0.102 | 0.306 |

Notes: the parties do not overlap on dimension 1 (the most liberal House R at 0.141, the most conservative House D at -0.099). Republicans are more dispersed than Democrats in both chambers.

Correlation of dimension 1 with the district or state presidential margin (Trump minus Harris, in points), computed by me from S11 plus S15 (House) and S14 (Senate) (`MEMBERS-nominate-vs-lean-correlation.csv`):

| Subset | n | Pearson r |
|---|---|---|
| House, all scored | 431 | 0.83 |
| House R only | 218 | 0.32 |
| House D only | 212 | 0.51 |
| House, excluding the 9 changed-line states | 261 | 0.85 |
| House R only, same exclusion | 125 | 0.35 |
| House D only, same exclusion | 136 | 0.57 |
| Senate, all | 100 | 0.83 |
| Senate R only | 53 | 0.06 |
| Senate D and I only | 47 | 0.45 |

I did not find a peer-reviewed source reporting these correlations and did not cite one. The pooled number is mostly party sorting; the within-party numbers are the ones that measure how much lean moves a member.

## 6. Turnover, 2016 to 2024

### Facts

Brookings (S16, FEC and CQ based; tables end at 2022), file `MEMBERS-turnover-brookings-ballotpedia.csv`:

| Year | House retired | House sought re-election | Lost primary | Lost general | Re-elected | Re-elected, % of those seeking |
|---|---|---|---|---|---|---|
| 2016 | 41 | 392 | 5 | 8 | 380 | 96.9 |
| 2018 | 52 | 376 | 4 | 30 | 342 | 91.0 |
| 2020 | 36 | 394 | 8 | 13 | 373 | 94.7 |
| 2022 | 49 | 383 | 14 | 9 | 360 | 94.0 |

| Year | Senate not seeking | Sought | Lost primary | Lost general | Re-elected | % |
|---|---|---|---|---|---|---|
| 2016 | 5 | 29 | 0 | 2 | 27 | 93.1 |
| 2018 | 3 | 32 | 0 | 5 | 27 | 84.4 |
| 2020 | 4 | 31 | 0 | 5 | 26 | 83.9 |
| 2022 | 7 | 28 | 0 | 0 | 28 | 100.0 |

- 2024 (secondary): Ballotpedia counted 45 House retirements and 8 Senate retirements as of 2024-09-18 (S17, so later announcements are not included). 15 House incumbents lost in 2024, 11 in the general (4 D, 7 R) and, by subtraction, 4 in primaries (S18). Three senators lost the general; that figure came from a search result summarizing Bloomberg Government, a page I did not open, so treat it as unverified.
- Newcomers by Congress (Voteview, `MEMBERS-turnover-voteview.csv`; counts include delegates and anyone who served any part of the Congress): first-time House members were 14.5% (114th), 14.4% (115th), 22.0% (116th), 15.8% (117th), 18.6% (118th), 16.4% (119th). Senate: 13.0%, 10.5%, 10.8%, 8.8%, 13.3%, 13.5%.
- House special elections held per Congress (S22, secondary): 114th 7, 115th 14, 116th 8, 117th 15, 118th 11, 119th 10 so far. The Clerk's own list for the 119th (S4, S5) has 13 vacancies: 5 deaths, 8 resignations. The House Historian page showed no vacancies for the 114th to 118th in what I could read, so I used S22 for those.
- Senate appointments (S6, counted by me from effective dates): 14 from 2017 through July 2026 (2017: 1; 2018: 3; 2019: 1; 2020: 1; 2021: 1; 2023: 2; 2024: 1; 2025: 2; 2026: 2), about 1.4 per year.

### Inference

- 2024 House re-election rate: if all 435 seats were occupied, about (435 - 45 - 15) / (435 - 45) = 96%. That arithmetic is mine, not a published figure.

## 7. Committees

### Facts

- House: 20 standing committees, 3 select committees (Intelligence permanent select, plus two others listed), and joint committees (S1, S9). Rule X limits a member to two standing committees and four subcommittees of them, waivable by the party. Party rules make Appropriations, Energy and Commerce, Financial Services, Rules and Ways and Means "exclusive" (one assignment, generally), and others "non-exclusive" (up to two) (S9).
- Observed House assignments (voting members, S1): standing committees per member average 2.02 (R) and 1.67 (D); modal value 2 in both. Subcommittee seats per member average 4.15 (R) and 3.20 (D). Tables in `MEMBERS-committee-assignments-hist.csv`. Members with no standing committee: 3 R and 4 D.
- Senate: 16 standing committees, plus Intelligence, Ethics, Indian Affairs and Aging (S3, S10). Rule XXV sorts committees into Classes A, B and C (A: two per senator; B: one; C: unlimited). Senators may sit on at most three subcommittees of each A committee (S10).
- Observed Senate assignments (S3): each senator sits on 4.06 committees on average (range 2 to 6). Class A average is 3.0 per senator (40 of 53 R and 40 of 45 D hold 3), above the "two" in the rule's text. CRS (S10) says the Senate "does not adhere to those restrictions in practice", which is the likely cause; I did not find the specific order that permits it. Class B average is 1.0. Subcommittee seats per senator average 9.5.
- Ratios and chamber ratios. House: CRS says House rules set no ratio and that leaders negotiate after the election, aiming at ratios that "in the aggregate, reflect the overall party composition" (S9). Observed: the majority holds 55.4% of seats on the 20 standing committees (453 of 817), against a chamber share of 50.3%, and individual committees run from 50.0% to 69.2% (Rules is 9 to 4). Senate: CRS says ratios "typically reflect" the chamber split and Ethics is always even (S10). Observed on the 16 standing committees: R 188, D 167 (53.0%, equal to the chamber 53 of 100 with the independents counted with D) and every committee between 51.7% and 55.0%.
- `MEMBERS-committees.csv` lists each committee's code, name, type, class (Senate), majority and minority seat counts and subcommittee counts.

## 8. Party unity

### Facts

Definition (Voteview, S13): a roll call is a party-unity vote when the two parties' majority positions differ, with one party's majority yea and the other's nay; abstentions and missed votes are excluded; a member's unity score is the share of those votes cast with the party's majority position. CQ uses a similar definition and counts independents who caucus with Democrats as Democrats. I recomputed it from the raw roll-call votes (S12), assigning the Senate independents to D and the House independent (119th) to R, requiring at least 20 unity votes per member (`MEMBERS-party-unity.csv`, `-member-hist.csv`).

| Congress and chamber | Roll calls | Party-unity share | D mean unity | R mean unity | D unity 10th percentile | R unity 10th percentile |
|---|---|---|---|---|---|---|
| 116 House | 952 | 68.5% | 97.8 | 92.9 | 94.8 | 83.5 |
| 116 Senate | 720 | 58.1% | 91.8 | 97.3 | 81.7 | 94.4 |
| 117 House | 996 | 57.6% | 98.5 | 94.7 | 96.3 | 88.4 |
| 117 Senate | 949 | 80.9% | 99.0 | 87.6 | 97.3 | 72.0 |
| 118 House | 1,235 | 70.5% | 96.7 | 93.0 | 91.6 | 82.8 |
| 118 Senate | 691 | 77.6% | 98.4 | 90.6 | 97.2 | 78.0 |
| 119 House (to 2026-09-30) | 674 | 70.0% | 96.4 | 97.1 | 91.5 | 95.3 |
| 119 Senate (to 2026-09-30) | 915 | 91.8% | 95.3 | 98.5 | 89.6 | 96.5 |

- Member scores skew: median unity is 93 to 99.6 in every row, and the standard deviation is 1.4 to 14.2 points, driven by a few members with low scores (the 117th Senate R and 116th Senate D are the extremes). The 10th percentile is the more useful dial than the mean.
- Cross-check (S24, secondary, different definition and period): CQ reports 85.3% of all 2025 roll calls (both chambers pooled) as party-unity votes and average unity of 95% (House R), 93% (House D), 96% (Senate R) and 92% (Senate D) for 2025. My 119th-to-date figures (pooled share (472 + 840) / (674 + 915) = 82.6%) are close in the share and differ by a few points in the means because the period, vote filter and independents' treatment differ. I did not reconcile them further.
- Brookings Table 8-3 and 8-4 carry the older CQ series, but I did not open them, so I report none of their values.

## What the engine can use

Mapping to §3 of `PEOPLE-CONGRESS-COURTS.md`. Facts are marked F, my inference I, a recommendation R.

**Seats.**
- F: vendor `MEMBERS-house-seats.csv` (435 keys) and `MEMBERS-senate-seats.csv` (100 keys). They tie to the apportioned totals; the party map reproduces the existing delegation and class tables exactly.
- R: key each House seat as (state, district, 0 for at-large) and store party at the 2026-10-01 Clerk publication, with vacancies as vacant. Record the Senate caucus as D for the two independents, citing CRS and the committee rosters.
- R: carry a `linesChangedSince2024` flag for the 173 seats in AL, CA, FL, LA, NC, OH, TN, TX, UT, because both holder and lean differ on the 2026 lines.

**People.**
- F: 218 R, 214 D, 1 I in the House plus 2 vacancies; 53 R, 45 D, 2 I in the Senate.
- R: fill each seat from the person pool as the design says; treat the 2 House vacancies (FL-20, TX-23) as open at start. The Senate independents and the House independent need a `caucus` field separate from `party`.

**Character.**
- F: dimension 1 means and SDs by chamber and party (§5 table). Parties barely overlap, with Republicans more dispersed.
- I: draw ideology as party mean + slope × (district lean minus party mean lean) + noise. Within-party r on the House (about 0.35 R, 0.55 D) implies the residual SD is roughly 94% of the party SD for R and 85% for D (SD × sqrt(1 - r²)), so district lean explains little individually and the jitter must be large. Senate R should use almost no lean term (r 0.06); Senate D can use a moderate one (0.45).
- R: use the Voteview bins as the target distribution for a calibration test of the generated members.

**Per-seat facts.**
- F: seniority distribution (histogram by party), average 4.3 House terms and 1.9 Senate terms at the start of the 119th (CRS); House committees: 2 standing committees and 3 to 4 subcommittees typical; Senate: about 4 committees, about 9 subcommittee seats.
- F: Senate next election by class (2026, 2028, 2030) and the 2026 specials (OH, FL Class III, secondary). House next election is 2026 for every seat; Louisiana's general is Dec 12, 2026.
- R: seniority is not in the Clerk file, so generate it from the histogram, correlated with age. A first-term share of about 15 to 22% (House) and 9 to 14% (Senate) per Congress matches 2013 to 2025.

**The vote's inputs.**
- Ideology distance: use the DW-NOMINATE scale above, which is what real members' votes are scored against.
- Whip: the data say it is nearly always followed. Unity votes are about 70% of House and about 92% of Senate roll calls in the 119th, and 10th-percentile unity is 90 to 97% (the 119th, each party and chamber). So an average defection rate on contested party votes of about 2 to 5% is realistic, concentrated in a minority of members.
- Exposure at home: 7 R-held seats Harris carried and 22 D-held seats Trump carried (2026 lines; 3 and 7 on unchanged lines) are the real crossover seats; 15 R-held and 22 D-held seats sit within 5 points. Senate: 1 R and 10 D or I seats are in states carried by the other party's 2024 nominee.
- Tie to the President, cues, and the aisle-crossing penalty (Phase I): nothing here; these have no empirical source in this research.

**Elections replacing members.**
- F: typical per-cycle House retirements are 36 to 52 (2016 to 2022) and about 45 in 2024; House incumbents lose 8 to 30 seats in a general election (usually 9 to 13, 30 in the 2018 wave); re-election rates run 91 to 97% of those seeking; Senate retirements 3 to 7 per cycle and 0 to 5 general-election losses. Newcomers are 14 to 22% of the House and 9 to 14% of the Senate.
- F: vacancies between elections: about 8 to 15 House specials per Congress; about 1.4 Senate appointments per year in 2017 to 2026.
- R: model retirement as a per-seat hazard of roughly 8% to 12% for the House (36 to 52 over about 435) and roughly 10% to 20% of the seats up for the Senate (3 to 7 of 28 to 35 per cycle), with a wave term for the general-election loss rate; keep the 2018 and 2010 waves as the calibration for how far it can swing. The 2010 figure is from Brookings table rows I saw (54 lost general) but is outside the 2016 to 2024 window you asked for.

**Committees.**
- R: seat the majority party at about 55% of House standing-committee seats (Rules about 69%) and at the chamber share in the Senate (about 53%, Ethics even).

## Gaps

- No official per-district presidential tabulation exists; S15's last-edited date is not stated, and I confirmed its map currency only by spot checks of a few districts. Lean on the 2024 lines (the lines the sitting members won on) was not gathered. The Downballot post says earlier-line data exist; I did not open them.
- The redistricting table is NCSL-based for dates and details. I opened only two court orders (Callais; Milligan stay). I did not open state statutes, the Texas stay order of Dec 4, 2025, the California or Utah orders, or the Missouri ruling. California's 2025 ballot measure and the Florida, Tennessee, Ohio and North Carolina dates are NCSL's word.
- NCSL says North Carolina's use for 2026 is "not explicitly stated"; I treated it as in use because its primary was held March 3, 2026.
- Seniority is derived from Voteview Congress counts, which treat a member's non-consecutive service as separate Congresses but do not distinguish a special-election seat from a full term. The Clerk file has no tenure field.
- No peer-reviewed or Voteview-published figure for the within-party correlation of DW-NOMINATE and district vote was located; the numbers are mine.
- 2024 re-election rate and the 2024 count of senators seeking re-election were not found in a source with a stated denominator. The 3 Senate general-election losses in 2024 came from an unopened page. Ballotpedia's 45 and 8 retirements are as of September 18, 2024, not final.
- House special-election counts for the 114th to 118th are from Wikipedia. The House Historian page did not expose per-Congress lists in what I could read.
- Senate appointments were counted from the Senate Historical Office table by effective date; the state names for the two 2026 appointments were not parsed.
- I did not open Brookings tables 8-3 and 8-4 (party unity), so only my own computation and the CQ 2025 cross-check appear.
- CQ's party-unity method and my method differ in how roll calls are filtered and how the House independent is treated. My numbers are indicative and not a replication of CQ.
- The Senate rule text says two Class A committees; the roster averages three. I did not identify the order or practice that permits it.
- Voteview DW-NOMINATE for the 119th is a running estimate (votes through 2026-09-30) and will move; two House members are unscored.
- House "individuals serving" in `MEMBERS-turnover-voteview.csv` includes delegates and the Resident Commissioner, so the denominator is above 435.
