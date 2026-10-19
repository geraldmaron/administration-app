# US bench priors: sources, method and name-culture mapping

Companion to `us-bench.tsv`. Researched and written 2026-09-23.

## What the table says

A generated US political bench that looks like the real one is not an Anglo list. Against a 2020 adult population that is 60.8% non-Hispanic white, recent federal leadership runs from about 60% white (Democratic cabinets, House Democrats) to over 90% white (House, Senate and governors on the Republican side). The party gap is larger than the office gap, so the party of the drawn person should drive the draw.

| Row | Women | White NH | Hispanic | Black | Asian Am. | Other |
|---|---|---|---|---|---|---|
| US adults, 2020 Census | 51.5% | 60.8% | 16.8% | 11.7% | 6.1% | 4.6% |
| Cabinets, Democratic administrations | 29.6% | 60.6% | 17.3% | 13.9% | 4.8% | 3.3% |
| Cabinets, Republican administrations | 21.0% | 82.0% | 8.0% | 5.0% | 2.1% | 2.9% |
| House Democrats | 44.3% | 50.9% | 16.5% | 25.0% | 7.1% | 0.5% |
| House Republicans | 14.2% | 91.3% | 5.0% | 1.8% | 0.9% | 0.9% |
| Senate Democrats (with independents) | 34.0% | 76.6% | 8.5% | 8.5% | 6.4% | 0.0% |
| Senate Republicans | 18.9% | 92.5% | 3.8% | 1.9% | 0.0% | 1.9% |
| Governors, Democratic | 41.7% | 91.7% | 6.2% | 2.1% | 0.0% | 0.0% |
| Governors, Republican | 15.4% | 96.2% | 0.0% | 0.0% | 0.0% | 3.8% |

Three things a generator should take from this:

1. **The House Democratic caucus is the most diverse body in the set.** A quarter of its members are Black. Drawing it from the adult population would under-produce Black members by half.
2. **Governors are the least diverse office on both sides.** One Black governor (Moore), one Hispanic (Lujan Grisham) and one Native American (Stitt) among 50.
3. **Republican benches are not all white, but close.** The minority Republicans in the record are concentrated among Hispanic officials (Rubio, Cruz, Moreno, Acosta, Chavez-DeRemer) plus a few Black officials (T. Scott, Carson, Turner) and two Cherokee officials (Mullin, Stitt).

## Coding rules

These rules turn sources that count people differently into shares that sum to one.

- **Five exclusive groups.** Hispanic of any race counts as Hispanic. White, Black and Asian American mean non-Hispanic and single-race. "Other" is Native American, Alaska Native, Native Hawaiian or Pacific Islander, some other race, and (Census only) two or more races.
- **People with two identities count one half in each.** CRS and Pew count them in both groups. A half weight keeps the total at one person without choosing for them. This touches John King Jr. (Black and Puerto Rican), Governor Moore (listed as African American and Cuban American), and four House Democrats CRS names as dual (two Black and Asian, two Black and Hispanic). The notes column gives the alternative reading where it moves a share by more than a point.
- **Middle Eastern and North African ancestry is coded white,** following the 2020 Census. This affects LaHood and Azar. Portuguese ancestry is not Hispanic under Census rules, so Moniz is coded white. CRS's congressional Hispanic count includes a few Portuguese-ancestry members of the Hispanic caucus or conference; Pew excludes at least three. The House rows use CRS counts, so their Hispanic shares may run about one point high.
- **Congress rows use voting members only.** Delegates and the Resident Commissioner are removed from the CRS counts. Independents are counted with the party they caucus with.
- **Cabinet rows use the 15 executive department heads** (the Secretaries and the Attorney General) with a confirmation date on the Senate's per-administration table. Each person counts once per administration. Acting officials and nominees who were withdrawn or never confirmed are excluded. Cabinet-rank posts that are not departments (UN ambassador, OMB, EPA, USTR, chief of staff) are excluded.
- **"Average of the last four administrations" is an equal-weight mean of the four per-administration shares.** Obama's eight years produce 31 secretaries and would otherwise count twice as heavily as Biden's 15. The pooled figure is in each row's notes.
- Shares are rounded to three decimals, so a row can sum to 0.999 or 1.001.

## Per-row derivation

### Census reference

- Adults 18 and over: 258,343,281. Hispanic 43,322,792 (16.77%). Non-Hispanic single race: white 157,118,573 (60.82%), Black 30,266,080 (11.72%), Asian 15,713,740 (6.08%), AIAN 1,661,593 (0.64%), NHPI 451,556 (0.17%), some other race 1,177,150 (0.46%), two or more races 8,631,797 (3.34%). Source: `census-pl-p4`.
- Adult women: 168,763,470 women minus 35,725,654 under 18 = 133,037,816 (51.50% of 258,343,281, which matches the P4 adult total exactly). Source: `census-dhc-p12`.
- Cross-check: Census supplementary Table 5 gives Hispanic as 16.8% of adults in 2020 (`census-rst05`).

### Cabinets

| Administration | n | Women | White | Hispanic | Black | Asian | Other |
|---|---|---|---|---|---|---|---|
| Obama 2009-2017 | 31 | 8 | 19 | 4.5 | 4.5 | 3 | 0 |
| Trump 2017-2021 | 24 | 3 | 21 | 1 | 1 | 1 | 0 |
| Biden 2021-2025 | 15 | 5 | 9 | 3 | 2 | 0 | 1 |
| Trump 2025-present | 17 | 5 | 13 | 2 | 1 | 0 | 1 |

The rosters are the confirmed names on the four Senate tables. Minority members, by administration:

- Obama: Salazar, Solis, Perez and Castro (Hispanic); Holder, Lynch, Johnson and Foxx (Black); King (half Black, half Hispanic); Locke, Chu and Shinseki (Asian American).
- Trump, first term: Acosta (Hispanic), Carson (Black), Chao (Asian American).
- Biden: Becerra, Cardona and Mayorkas (Hispanic); Austin and Fudge (Black); Haaland (Laguna Pueblo, counted as other).
- Trump, second term: Rubio and Chavez-DeRemer (Hispanic), Turner (Black), Mullin (Cherokee Nation, counted as other).

The second-term roster reflects the Senate table as opened today. It shows Markwayne Mullin confirmed at Homeland Security on March 23, 2026 and Todd Blanche confirmed Attorney General on August 8, 2026, with Keith Sonderling's Labor nomination still pending. These are after my training data and come from that table alone.

Ethnicity codes are my coding from the officials' Wikipedia biographies (`wiki-bios`), which are an aggregator, not a record. For the minority-coded people, the biography states the identity explicitly: "first Latina to lead" a department (Solis), "African-American and Puerto Rican descent" (King), "Cherokee Nation" (Mullin), "first Native American to serve as a Cabinet secretary" (Haaland), and "Portuguese descent" (Moniz). The white-coded officials were not each checked against a biography. That is an unverified default, and it carries the most risk for officials with less-known ancestry.

### Congress

The source is CRS R48535, as of August 4, 2025. It is the latest version (`crs-r48535`; EveryCRSReport lists no version after that date).

- **House, as CRS reports it (delegates included):** 61 African American members (57 D, including 2 delegates; 4 R). 50 Hispanic (38 D, including one delegate and the Resident Commissioner; 12 R, including one delegate). 21 Asian/Pacific Islander (16 D, 5 R; three are delegates). 3 Native American (2 R, 1 D). Women: 129, of whom 96 D (2 delegates) and 33 R (2 delegates).
- **Voting members after removing delegates:** Democrats (n=212) have 55 Black, 36 Hispanic, 16 Asian, 1 Native and 94 women. Republicans (n=219) have 4 Black, 11 Hispanic, 2 Asian, 2 Native and 31 women. That gives 104 minority Democrats and 19 minority Republicans, or 123 members and 84.6% Democratic. This matches Pew's January figures: 139 minority members overall, 16 of them senators, which leaves 123 in the House; and 85% of those are Democrats.
- **Women cross-check:** CAWP's January 2, 2025 release has 94 House Democratic women and 31 House Republican women, the same as CRS. It had 16 D and 9 R women in the Senate, and Ashley Moody's January 21 swearing-in made that 10 R. CAWP's March 5, 2026 Senate post still reports 26 women, 16 D and 10 R (`cawp-119th`, `cawp-senate-2026`).
- **Senate:** 5 African American (4 D, 1 R). 6 Hispanic (4 D, 2 R). 3 Asian American (all D). 1 Native American (R). Women: 16 D and 10 R.

### Governors

- Partisan split: 24 Democrats and 26 Republicans (`ballotpedia-gov`, opened 2026-09-23). This follows Virginia flipping in the November 2025 election.
- Women: 14 governors, 10 D and 4 R, per CAWP's post of March 19, 2026 (`cawp-gov-2026`). The names match the Ballotpedia roster.
- Race and ethnicity: the governors table of the Wikipedia list of minority governors (`wiki-minority-gov`) has three sitting governors: Lujan Grisham (D, Mexican American), Stitt (R, Cherokee) and Moore (D, African American and Cuban American). Joe Lombardo (R-NV) was born in Japan to a US Air Force family. His Wikipedia biography does not describe him as Asian American, and the list does not include him, so he is coded white.

## Discrepancies and limits

- **Pew's own figures disagree with each other on the Senate.** Pew's text says 12 of the 16 minority senators are Democrats and names four Republicans: Scott, Rubio, Cruz and Mullin. It leaves out Bernie Moreno (R-OH), whom its own count of seven Hispanic senators needs. With Moreno, the split is 11 D and 5 R. The TSV follows CRS.
- **Pew's House chart labels 301 white members.** Its text (26% non-white across 533 members, 139 minority members, 74% white) implies 311. The chart appears to count its five multiracial members both inside the group segments and again separately. This is an inference from the arithmetic. The TSV does not use the chart's numbers.
- **The rows are snapshots, and the rosters have moved since.** The House Clerk roster (opened 2026-09-23) shows 218 R, 214 D, 1 independent and 2 vacancies, against 219 R and 212 D in the CRS snapshot. The Senate roster (opened 2026-09-23) shows Mullin replaced by Alan Armstrong (R-OK) and Lindsey Graham by Darline Graham (R-SC). I could not verify either newcomer's ethnicity. The Senate Republican notes give the shares under the assumption that both are white non-Hispanic, marked [unverified].
- **CAWP's live "current numbers" pages returned HTTP 403 or render their counts in script,** so no current CAWP House figure by party was captured. A search snippet quoted "124 current women U.S. Representatives" with no party split. That figure is not used.
- **Senior White House staff have no row.** I opened no primary source that tabulates their demographics. Using the cabinet row for the president's party is a reasonable proxy, but it is an inference, not a measurement.
- **House leaders are too few for a share.** For reference, the Clerk's page (opened 2026-09-23) lists the Republican leaders as Johnson, Scalise, Emmer, McClain and Obernolte, and the Democratic leaders as Jeffries, Clark, Aguilar and Lieu. The ethnicity reading of those names (Jeffries Black, Aguilar Hispanic, Lieu Asian American, the Republican leaders white) is my coding and is not sourced here.
- **The Census "other" group includes 3.3% who report two or more races.** The officeholder rows split dual-identity people between named groups instead, so "other" is not like-for-like between the reference row and the officeholder rows.

## Sources

The class column uses these terms: record is a primary official record, derived is an official compilation from records, and aggregator is a secondary compilation.

| id | Source | URL | Opened | Class |
|---|---|---|---|---|
| census-pl-p4 | Census 2020 P.L. 94-171, Table P4, Hispanic or Latino and not Hispanic or Latino by race, 18 and over, United States | https://data.census.gov/api/access/data/table?id=DECENNIALPL2020.P4&g=010XX00US (the underlying API call is https://api.census.gov/data/2020/dec/pl?get=group(P4)&ucgid=0100000US; variable labels checked at https://api.census.gov/data/2020/dec/pl/variables/P4_005N.json and the sibling variables) | 2026-09-23 | record |
| census-dhc-p12 | Census 2020 DHC, Table P12, sex by age, United States | https://data.census.gov/api/access/data/table?id=DECENNIALDHC2020.P12&g=010XX00US (variable labels checked at https://api.census.gov/data/2020/dec/dhc/variables/P12_006N.json, P12_007N and P12_030N) | 2026-09-23 | record |
| census-rst05 | Census, Redistricting Supplementary Table 5, Hispanic origin and race by age group, 2010 and 2020 | https://www2.census.gov/programs-surveys/decennial/2020/data/redistricting-supplementary-tables/redistricting-supplementary-table-05.pdf | 2026-09-23 | derived |
| crs-r48535 | Jennifer E. Manning, CRS R48535, "Membership of the 119th Congress: A Profile," updated August 4, 2025 | https://www.congress.gov/crs_external_products/R/PDF/R48535/R48535.3.pdf (version history checked at https://www.everycrsreport.com/reports/R48535.html) | 2026-09-23 | derived |
| pew-2025-119th | Katherine Schaeffer, Pew Research Center, "119th Congress brings new growth in racial, ethnic diversity to Capitol Hill," January 21, 2025, with its three charts | https://www.pewresearch.org/short-reads/2025/01/21/119th-congress-brings-new-growth-in-racial-ethnic-diversity-to-capitol-hill/ | 2026-09-23 | derived |
| cawp-119th | CAWP, "Women in the 119th Congress," press release, January 2, 2025 | https://cawp.rutgers.edu/news-media/press-releases/women-119th-congress | 2026-09-23 | derived |
| cawp-senate-2026 | CAWP, "What will the 2026 Election mean for women's representation in the U.S. Senate?", March 5, 2026 | https://cawp.rutgers.edu/blog/2026-senate-outlook-women | 2026-09-23 | derived |
| cawp-gov-2026 | CAWP, "What will the 2026 Election mean for women's gubernatorial representation?", March 19, 2026 | https://cawp.rutgers.edu/blog/2026-governor-election-outlook | 2026-09-23 | derived |
| ballotpedia-gov | Ballotpedia, "Partisan composition of governors" (current officeholder table) | https://ballotpedia.org/Partisan_composition_of_governors | 2026-09-23 | aggregator |
| wiki-minority-gov | Wikipedia, "List of minority governors and lieutenant governors in the United States" (the governors table), plus the Joe Lombardo biography for the Lombardo check | https://en.wikipedia.org/wiki/List_of_minority_governors_and_lieutenant_governors_in_the_United_States ; https://en.wikipedia.org/wiki/Joe_Lombardo | 2026-09-23 | aggregator |
| senate-cab-obama | U.S. Senate, cabinet nominations, Obama administration | https://www.senate.gov/legislative/nominations/Obama_cabinet.htm | 2026-09-23 | record |
| senate-cab-trump45 | U.S. Senate, cabinet nominations, Trump administration (2017-2021) | https://www.senate.gov/legislative/nominations/Trump_cabinet.htm | 2026-09-23 | record |
| senate-cab-biden | U.S. Senate, cabinet nominations, Biden administration | https://www.senate.gov/legislative/nominations/Biden_cabinet.htm | 2026-09-23 | record |
| senate-cab-trump47 | U.S. Senate, cabinet nominations, Trump administration (2025-) | https://www.senate.gov/legislative/nominations/Trump_47_cabinet.htm | 2026-09-23 | record |
| wiki-bios | Wikipedia biographies used to code ethnicity: John_King_Jr., Lori_Chavez-DeRemer, Markwayne_Mullin, Deb_Haaland, Ernest_Moniz, Alexander_Acosta, Scott_Turner_(politician), Gary_Locke, Steven_Chu, Eric_Shinseki, Elaine_Chao, Ken_Salazar, Hilda_Solis, Tom_Perez, Julian_Castro, Xavier_Becerra, Miguel_Cardona, Alejandro_Mayorkas, Marco_Rubio, Eric_Holder, Loretta_Lynch, Jeh_Johnson, Anthony_Foxx, Ben_Carson, Lloyd_Austin, Marcia_Fudge, Todd_Blanche, Ray_LaHood, Alex_Azar, Wes_Moore | https://en.wikipedia.org/wiki/{title} for each title listed | 2026-09-23 | aggregator |
| senate-roster | U.S. Senate, current senators | https://www.senate.gov/senators/index.htm | 2026-09-23 | record |
| clerk-roster | Office of the Clerk, U.S. House, Members page (party counts, leadership) | https://clerk.house.gov/Members | 2026-09-23 | record |

Also consulted, with nothing taken from them: the `senate.gov` index page that links the four cabinet tables (https://www.senate.gov/legislative/nominations_new.htm), CAWP's Congress data page, whose counts render in script (https://cawp.rutgers.edu/data/levels-office/congress?tab=U.S.House); CAWP's June 10, 2026 release on 2026 House candidates, which covers candidates and not officeholders (https://cawp.rutgers.edu/news-media/press-releases/record-number-democratic-women-running-us-house); and CAWP pages that returned HTTP 403 or 404 (https://cawp.rutgers.edu/facts/current-numbers, https://cawp.rutgers.edu/facts/levels-office/congress/women-us-congress-2025, https://cawp.rutgers.edu/facts/levels-office/congress/women-us-house-representatives-2026). The Census API at api.census.gov now requires a key, so the Census tables came through data.census.gov's table endpoint, which returns the same API group.

## Mapping to the repo's name cultures

What exists today (read from `packages/world/src/dataset/people.ts`, `name-banks.ts`, `name-cultures.ts` and `packages/world/src/schemas/people-pool.ts`):

- **The United States draws every name from one key, `anglo`** (`people.ts`, `NATION_NAME_CULTURE.USA`). `anglo` is one group with no weight. The same bank serves GBR, CAN, AUS and IRL, plus the Anglophone Caribbean countries and New Zealand through `ROSTER_NAME_CULTURE`. So a US Secretary, a British minister and a Jamaican minister all come from the same list.
- **The schema already supports what the US needs.** `NameBank` is an array of weighted `NameGroup`s, and the comment in `people-pool.ts` names the United States as the case it was built for: each person should read as belonging to one naming tradition, with the given name and surname drawn from the same group. The US bank does not use it. Its one `anglo` group mixes surnames from several traditions. Among the 119 surnames are Torres and Rivera, and surnames common among Black Americans such as Jackson, Coleman and Freeman. Washington, Jefferson, Booker and Banks are absent.

Keys a US draw should mix, by the groups in the TSV:

| TSV group | Existing key | Fit for a US official | What a US group would need |
|---|---|---|---|
| White non-Hispanic | `anglo` (also `germanic`, `italian`, `polish`, `hebrew` exist) | Good for surnames. Many white US officials carry German, Irish, Italian or Polish surnames, and `anglo` is mostly English-origin. | A US-white group that folds in Irish, German, Italian, Polish and Scandinavian surnames under American given names. `hebrew` is Israeli naming and would misread for American Jewish officials (Schumer, Blinken, Garland, Lutnick). |
| Hispanic | `hispanic` | Usable. It is the shared bank for Mexico, Spain, Cuba, Colombia, Venezuela, Argentina and others. Surnames carry accents (García, Pérez) and given names are Spanish (Andrés, Ángel). US officials mostly drop the accent, and many have English given names (Ted Cruz, Alex Padilla, Catherine Cortez Masto, Bernie Moreno). | A US-Hispanic group: `hispanic` surnames, with unaccented forms available, paired with a mix of Spanish and American given names. |
| Black | **None.** No key exists for Black American names. | `west-african` is Nigerian naming (Adeyemi, Okafor, Adebayo) and does not fit: almost every Black US official in the record carries an English-origin surname (Holder, Johnson, Austin, Fudge, Booker, Warnock, Jeffries, Moore, Scott, Turner). | A new Black-American group: English-origin surnames weighted toward those most common among Black Americans, with given names drawn from Black American usage. A US source such as Census surname tables would be needed to author it; none was opened for this note. |
| Asian American | `han`, `korean`, `japanese`, `vietnamese`, `south-asian`, `thai` | Surnames only, and only partly. `han` is pinyin (Wang, Zhang) and lacks the older romanizations US officials carry (Chu, Wong, Chan, Lee, Lieu, Chao, Locke). `korean` given names are Korean-form (Min-jun, Seo-yeon), and US officials are Andy Kim and Young Kim. `japanese` lacks Hirono, Matsui, Tokuda and Shinseki. `south-asian` given names are recent Indian baby names (Aarav, Vivaan). **No Filipino key exists.** Pew notes that Rep. Bobby Scott is the first member of Congress of Filipino descent. | An Asian-American group per heritage, or one blended group, pairing heritage surnames (with US romanizations) with American given names. |
| Other: Native American | **None.** No key exists. | Not needed for names. Native officials in the record (Mullin, Stitt, Haaland, Cole, Davids) carry English-origin surnames and fit `anglo`. | Nothing for names. The identity is not legible from a name, so it has to live in the person's biography instead. |
| Other: Pacific Islander | `polynesian`, `micronesian` (vendored) | Partial. These are the Samoa/Tonga/Tuvalu and Kiribati/Marshalls/FSM/Nauru/Palau banks. Chamorro naming (Guam, the Northern Marianas) is Spanish-influenced and not covered. | Only relevant to delegates, who are not in the TSV. Low priority. |

**Suggested weights for the US groups.** Use the TSV row that matches the role and party, not the Census row. For example, a House Democrat draws roughly 51% white, 17% Hispanic, 25% Black and 7% Asian American. A Senate Republican draws roughly 92% white, 4% Hispanic, 2% Black and 2% other, which the `anglo` group covers for names. This is a recommendation, not something the sources state.
