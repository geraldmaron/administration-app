# Americas leader table: sources and notes

Companion to `americas.tsv` (34 rows: CAN, MEX, BRA, COL, VEN, CUB, ARG, CHL, ATG, BHS, BRB, DMA, DOM, GRD, HTI, JAM, KNA, LCA, VCT, TTO, BLZ, CRI, SLV, GTM, HND, NIC, PAN, BOL, ECU, GUY, PRY, PER, SUR, URY). Every row was verified on 2026-09-23. No real person is named here; the table constrains attributes only. Some URLs contain a name because that is the page's address.

## Method

- **Wikipedia pages** marked "(wikitext)" were read through `https://en.wikipedia.org/w/index.php?title=<Title>&action=raw` on 2026-09-23; the canonical article URL is listed. Infobox `birth_date`, `term_start` and `party` fields gave age, tenure and party. Pages without that mark were opened with a page fetch the same day.
- **Current incumbents** were cross-checked against the live "List of current heads of state and government" (WIKI-HEADS). Every seat that changed in 2025 or 2026 was then confirmed with a dated news report, and for several unchanged seats with the government's own site.
- **Age band** is the incumbent's age on 2026-09-23.
- **`leader_seat`.** Presidential systems where one person holds both seats are coded `head_of_state` with `same`/`same`. Westminster systems are coded `head_of_government` (Prime Minister). For the Commonwealth realms (CAN, ATG, BHS, GRD, JAM, KNA, LCA, VCT, BLZ) the second seat is the King (M), represented locally by a Governor-General; the Governor-General's sex is recorded in the nation note, not in the table.
- **`regime_type`.** The EIU Democracy Index 2025 (covering calendar 2025, published April 2026) where the country is scored. The index does not cover ATG, BHS, BRB, DMA, GRD, KNA, LCA, VCT or BLZ. For those nine the table says `flawed_democracy`. **That is an inference, not an EIU rating.** All nine are "Free" in Freedom House 2026 (scores 83 to 94). The EIU rates every English-speaking Caribbean state it does score (JAM, TTO, GUY) as a flawed democracy, and those states have comparable Freedom House scores (81 to 83 for JAM and TTO). No Freedom House cut-off was used to pick `full_democracy`: Chile scores 95 in Freedom House and is still a flawed democracy in the EIU. CUB is coded `one_party_state` rather than the EIU's `authoritarian` because its constitution names the Communist Party as the leading force of society and state.
- **`next_leader_selection`.** Presidential systems use the constitutional election month. Westminster systems without fixed terms (every Caribbean parliamentary state here plus BLZ) use **the month five years after the last general election**. That is the parliament's normal term: the legal deadline falls some months later (dissolution five years after the first sitting, then a 90-day window), and an early election can be called at any time. Where a source gives the exact deadline, the nation note records it. CAN has a statutory fixed date. GUY and SUR run five-year cycles.
- **`women_cabinet_share`** comes from IPU and UN Women, "Women in politics: 2026" (data as at 1 January 2026), the most recent edition that could be opened. Several governments changed after that date (COL, VEN, CHL, HND, CRI, PER, HTI, and new post-election cabinets in ATG, BHS and BRB). **For those countries the figure describes the cabinet in office on 1 January 2026, not today's.** The nation note gives the current count where a source had one.
- **`name_culture`** uses the repo's own mapping: `NATION_NAME_CULTURE` in `packages/world/src/dataset/people.ts` for CAN, MEX, BRA, COL, VEN, CUB, ARG and CHL, and `ROSTER_NAME_CULTURE` in `packages/world/src/dataset/name-cultures.ts` for the rest. Every one of the 34 ids already has a key, so none needed a `none:` entry. Where the elite's naming is visibly mixed, the nation note says so.

## Shared sources

| id | URL | opened | what it established |
|---|---|---|---|
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | Share of women among cabinet ministers who head ministries, as at 1 January 2026, for all 34 countries (ranking table read in full). Colombia's figure excludes one non-binary minister (map footnote). |
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (wikitext; fetched page also opened) | 2026-09-23 | EIU Democracy Index 2025 category and score for the 25 covered countries. First score column is 2025, checked against Canada's 9.08, which also appears in DWB-2025. Peru is a hybrid regime at 5.88. |
| DWB-2025 | https://www.democracywithoutborders.org/42392/democracy-stabilizes-globally-after-eight-years-of-decline-eiu-says/ | 2026-09-23 | Dated 9 April 2026: EIU 2025 regional average rose from 5.61 to 5.71; Paraguay moved from hybrid regime to flawed democracy; Canada rose to 9.08. Corroborates EIU-2025. |
| FH-2026 | https://freedomhouse.org/countries/freedom-world/scores | 2026-09-23 | Freedom in the World 2026 scores, all "Free": ATG 83, BHS 90, BRB 94, BLZ 87, DMA 92, GRD 89, KNA 89, LCA 91, VCT 90. Comparators: CRI 91, URY 97, CAN 97, CHL 95, JAM 81, TTO 83. |
| WIKI-HEADS | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (wikitext) | 2026-09-23 | The current holder of both seats for all 34 countries. Two footnotes matter: Haiti's presidency is vacant, and Venezuela's formal president was captured on 3 January 2026, with an acting president since then. Also gives the Governor-General for each realm. |
| REPO-NAMES | `packages/world/src/dataset/name-cultures.ts`, `packages/world/src/dataset/people.ts`, `packages/world/src/dataset/name-banks.ts` (local) | 2026-09-23 | The culture key each of the 34 ids already maps to. |

Rows cite EIU-2025 where the country is scored and FH-2026 where it is not (ATG, BHS, BRB, DMA, GRD, KNA, LCA, VCT, BLZ). All rows cite WIP-2026, WIKI-HEADS and REPO-NAMES.

## CAN (Canada)

| id | URL | opened | what it established |
|---|---|---|---|
| CAN-1 | https://en.wikipedia.org/wiki/Mark_Carney (wikitext) | 2026-09-23 | Prime Minister since 14 March 2025, Liberal, born March 1965 (age 61). |
| CAN-2 | https://www.hilltimes.com/2026/04/14/carney-clinches-slim-majority-in-byelections-but-lacklustre-conservative-showing-makes-time-ripe-to-hunt-floor-crossers-say-politicos/499677/ | 2026-09-23 | Dated 14 April 2026: three by-election wins took the Liberal caucus to 174 seats, a majority. The minority government became a majority through floor-crossings and by-elections, without a general election. |
| CAN-3 | https://laws-lois.justice.gc.ca/eng/acts/e-2.01/page-6.html | 2026-09-23 | Canada Elections Act s. 56.1(2): the general election is held on the third Monday of October in the fourth calendar year after the last polling day. The last polling day was 28 April 2025, so the next election is October 2029. |
| CAN-4 | https://www.pm.gc.ca/en | 2026-09-23 | Official site: the same incumbent holds the office titled Prime Minister of Canada. |

Notes: the second seat is the King. The Governor General is currently a woman (WIKI-HEADS). The Quebec surname rule (women keep their birth surname) is general knowledge and was not re-sourced today. `anglo` is the repo key, though French-Canadian names are common in federal politics and the repo also has a `french` bank.

## MEX (Mexico)

| id | URL | opened | what it established |
|---|---|---|---|
| MEX-1 | https://en.wikipedia.org/wiki/Claudia_Sheinbaum (wikitext) | 2026-09-23 | President (female) since October 2024, born June 1962 (age 64), National Regeneration Movement; coalition "Sigamos Haciendo Historia". |
| MEX-2 | https://en.wikipedia.org/wiki/Cabinet_of_Claudia_Sheinbaum | 2026-09-23 | Majority government of the Sigamos Haciendo Historia coalition (Morena plus allies); women hold roughly half of cabinet posts. |
| MEX-3 | https://www.gob.mx/presidencia | 2026-09-23 | Official site shows the office as "Presidenta de México", held by a woman. |

Notes: the MEX-1 wikitext links the Labor Party and the Ecologist Green Party of Mexico as Morena's partners in Sigamos Haciendo Historia; no 2026 source was opened to confirm each partner's current standing. The next presidential election is June 2030 (six-year term). A recall referendum is possible but not scheduled.

## BRA (Brazil)

| id | URL | opened | what it established |
|---|---|---|---|
| BRA-1 | https://en.wikipedia.org/wiki/Luiz_In%C3%A1cio_Lula_da_Silva (wikitext) | 2026-09-23 | President since 1 January 2023, born October 1945 (age 80). |
| BRA-2 | https://pt.wikipedia.org/wiki/Governo_Lula_(2023%E2%80%93presente) (wikitext; fetched page also opened) | 2026-09-23 | Government led by the Workers' Party. Formal coalition: PCdoB, PV, PSOL, REDE, AGIR, PSB, Avante and Solidariedade. PSD, MDB and PDT have supported it since 2023; União Brasil and PP withdrew in 2025. 38 ministries, 10 held by women. |
| BRA-3 | https://www.aljazeera.com/news/2026/9/22/brazil-election-lula-and-flavio-bolsonaro-tied-in-latest-polls | 2026-09-23 | Dated 22 September 2026: the incumbent is running for a fourth term and is statistically tied in runoff polling. First round 4 October 2026, runoff 25 October 2026. |
| BRA-4 | https://en.wikipedia.org/wiki/2026_Brazilian_general_election | 2026-09-23 | Confirms the election dates and the incumbent's 2026 electoral alliance (PT, PCdoB, PV, PSOL, REDE, PSB, PDT). |

Notes: this seat can change within weeks. The new term would begin 1 January 2027. `governing_parties` lists the coalition and support parties with ministries; AGIR, Avante and Solidariedade are smaller coalition members left out for length. The current cabinet is 10 women of 38 (26%), against the map's 29.0%.

## COL (Colombia)

| id | URL | opened | what it established |
|---|---|---|---|
| COL-1 | https://en.wikipedia.org/wiki/Abelardo_de_la_Espriella | 2026-09-23 | President since 7 August 2026, male, born July 1978 (age 48). Founder and leader of the "Defenders of the Homeland" movement. |
| COL-2 | https://www.atlanticcouncil.org/dispatches/deadly-earthquake-gives-colombian-president-his-first-test/ | 2026-09-23 | Dated news: took office 7 August 2026 in Cali, the first inauguration held outside Bogotá. |
| COL-3 | https://directoriolegislativo.org/en/colombia-2026-2030-the-miracle-homeland-and-abelardo-de-la-espriellas-new-power-map/ | 2026-09-23 | Dated 13 August 2026: the president's movement is a congressional minority. A provisional coalition takes in the Democratic Center, Conservative Party, Liberal Party, Radical Change and We Believe. |
| COL-4 | https://www.as-coa.org/articles/whos-who-abelardo-de-la-espriellas-cabinet | 2026-09-23 | Dated 9 July 2026: the party label is National Salvation. The cabinet draws on National Salvation, Radical Change, the Liberal Party and We Believe. Three of the first 11 named ministers are women; 6 of the 7 pending posts were pledged to women. |
| COL-5 | https://en.wikipedia.org/wiki/2026_Colombian_presidential_election (wikitext) | 2026-09-23 | First round 31 May 2026, runoff 21 June 2026. |

Notes: sources differ on the vehicle's name. "Defenders of the Homeland" is the president's movement; the National Salvation Movement is the party label reported for the candidacy. Both are listed. The 55.6% share describes the outgoing cabinet. If the pledge was honored, the new cabinet is about 9 women of 18 (50%), which is unverified. The next election is May 2030 (four-year term).

## VEN (Venezuela)

| id | URL | opened | what it established |
|---|---|---|---|
| VEN-1 | https://en.wikipedia.org/wiki/Delcy_Rodr%C3%ADguez | 2026-09-23 | Acting president since 5 January 2026, female, born May 1969 (age 57), United Socialist Party of Venezuela. She also holds the vice presidency herself. |
| VEN-2 | https://www.click2houston.com/news/politics/2026/09/18/trump-to-meet-acting-venezuelan-president-delcy-rodriguez-in-new-york-next-week-white-house-says/ | 2026-09-23 | AP, dated 18 September 2026: still acting president, in office since the January 2026 US operation. No election mentioned. |
| VEN-3 | https://www.caracaschronicles.com/2026/08/12/has-the-transition-in-venezuela-formally-begun/ | 2026-09-23 | Dated 12 August 2026: a US-mediated agreement to seat an independent Supreme Court. No presidential election date. |
| VEN-4 | https://en.wikipedia.org/wiki/Next_Venezuelan_presidential_election | 2026-09-23 | As of the September 2026 revision, no election date is set, and the constitutional timetable after the capture is unresolved. |

Notes: **contested seat.** The formal president is detained abroad and still listed as de jure president. Some sources describe US officials as the de facto power (WIKI-HEADS footnote). EIU 2025 (2.13) predates the change. `second_seat` is `same` because the acting president exercises both seats.

## CUB (Cuba)

| id | URL | opened | what it established |
|---|---|---|---|
| CUB-1 | https://en.wikipedia.org/wiki/Miguel_D%C3%ADaz-Canel | 2026-09-23 | Still President of the Republic (since October 2019; head of state since April 2018 as President of the Council of State) and party First Secretary (since April 2021). Born April 1960 (age 66). Re-elected April 2023; limited to two consecutive five-year terms. |
| CUB-2 | https://www.euronews.com/2026/06/18/cubas-president-miguel-diaz-canel-admits-urgent-changes-needed-to-overcome-crisis | 2026-09-23 | Dated 18 June 2026: still president, calling for urgent economic reform. No leadership change reported. |
| CUB-3 | https://en.wikipedia.org/wiki/Manuel_Marrero_Cruz (wikitext) | 2026-09-23 | The Prime Minister (head of government under the 2019 constitution) is male, in office since 21 December 2019. |

Notes: **flagged uncertain.** WIKI-HEADS notes that some sources treat the former First Secretary as the de facto leader, and US pressure on the government was intense through 2026. The next selection is the National Assembly's vote after the 2028 legislative elections. The current Assembly was elected March 2023 for five years, and the incumbent is term-limited, so the month (2028-04) is an estimate.

## ARG (Argentina)

| id | URL | opened | what it established |
|---|---|---|---|
| ARG-1 | https://en.wikipedia.org/wiki/Javier_Milei (wikitext) | 2026-09-23 | President since 10 December 2023, born October 1970 (age 55), La Libertad Avanza. |
| ARG-2 | https://en.wikipedia.org/wiki/Cabinet_of_Javier_Milei | 2026-09-23 | Current cabinet of 9: La Libertad Avanza 4, Republican Proposal (PRO) 2, independents 3; 2 women. |
| ARG-3 | https://www.casarosada.gob.ar/ | 2026-09-23 | Official site, latest item dated 15 September 2026, shows the same president. |

Notes: the next election is October 2027. Argentines customarily use only the paternal surname in public life.

## CHL (Chile)

| id | URL | opened | what it established |
|---|---|---|---|
| CHL-1 | https://en.wikipedia.org/wiki/Jos%C3%A9_Antonio_Kast | 2026-09-23 | President since 11 March 2026, male, born January 1966 (age 60). Resigned his Republican Party membership shortly before taking office. |
| CHL-2 | https://en.wikipedia.org/wiki/Jos%C3%A9_Antonio_Kast_cabinet_ministers (fetched page and wikitext) | 2026-09-23 | Cabinet formed 11 March 2026: mostly independents, plus Republican Party, UDI, National Renewal, Evópoli, Radical Party (2018) and Christian Conservative Party ministers. 8 women of 25 on the current roster. |

Notes: the 45.8% share (11 of 24) is the outgoing cabinet's as at 1 January 2026; the current roster is 32%. There is no absolute majority in Congress. The next election is November 2029 (four-year term).

## ATG (Antigua and Barbuda)

| id | URL | opened | what it established |
|---|---|---|---|
| ATG-1 | https://en.wikipedia.org/wiki/Gaston_Browne (wikitext) | 2026-09-23 | Prime Minister since 13 June 2014, born February 1967 (age 59), Antigua and Barbuda Labour Party. |
| ATG-2 | https://en.wikipedia.org/wiki/2026_Antiguan_general_election (wikitext) | 2026-09-23 | Snap general election held 30 April 2026. |

Notes: the ruling party won a fourth consecutive term (15 of 17 seats per the search summary). Its second-term swearing-in (2 May 2026) was seen only in search results, not on an opened page. The Governor-General is male. The next election is 2031-04 on the five-year convention.

## BHS (Bahamas)

| id | URL | opened | what it established |
|---|---|---|---|
| BHS-1 | https://en.wikipedia.org/wiki/Philip_Davis_(Bahamian_politician) (wikitext) | 2026-09-23 | Prime Minister since 17 September 2021, born June 1951 (age 75), Progressive Liberal Party. |
| BHS-2 | https://www.aljazeera.com/news/2026/5/13/philip-davis-and-progressive-liberal-party-win-general-election-in-bahamas | 2026-09-23 | Dated 13 May 2026: the PLP won the 12 May 2026 election, the first back-to-back party win since 1997. |
| BHS-3 | https://en.wikipedia.org/wiki/2026_Bahamian_general_election (wikitext) | 2026-09-23 | Early election on 12 May 2026 for 41 seats; parliament dissolved 8 April 2026. |
| BHS-4 | https://opm.gov.bs/ | 2026-09-23 | Office of the Prime Minister site, item dated 22 September 2026, shows the same Prime Minister. |

Notes: the Governor-General is female. The next election is 2031-05 on the five-year convention.

## BRB (Barbados)

| id | URL | opened | what it established |
|---|---|---|---|
| BRB-1 | https://en.wikipedia.org/wiki/Mia_Mottley (wikitext) | 2026-09-23 | Prime Minister since 25 May 2018, born October 1965 (age 60 on as_of), Barbados Labour Party. |
| BRB-2 | https://barbadostoday.bb/2026/02/12/mottley-leads-blp-to-historic-third-clean-sweep-at-polls/ | 2026-09-23 | Dated 12 February 2026: the BLP won all 30 seats in the 11 February 2026 election, its third straight clean sweep. |
| BRB-3 | https://en.wikipedia.org/wiki/Jeffrey_Bostic (wikitext) | 2026-09-23 | The President of Barbados (ceremonial head of state, male) has been in office since 30 November 2025. |
| BRB-4 | https://en.wikipedia.org/wiki/2026_Barbadian_general_election (wikitext) | 2026-09-23 | Election on 11 February 2026; parliament dissolved 19 January 2026. |

Notes: Barbados is a parliamentary republic. The House of Assembly has no elected opposition. The next election is 2031-02 on the five-year convention.

## DMA (Dominica)

| id | URL | opened | what it established |
|---|---|---|---|
| DMA-1 | https://en.wikipedia.org/wiki/Roosevelt_Skerrit (wikitext) | 2026-09-23 | Prime Minister since 8 January 2004, born June 1972 (age 54), Dominica Labour Party. |
| DMA-2 | https://pressroomopm.gov.dm/pm-skerrit-2026-focused-on-completing-transformative-projects-strengthening-education-and-protecting-dominicas-future/ | 2026-09-23 | Office of the Prime Minister, dated 19 January 2026: the same Prime Minister setting 2026 priorities. |
| DMA-3 | https://en.wikipedia.org/wiki/Sylvanie_Burton (wikitext) | 2026-09-23 | The President (ceremonial head of state, female) has been in office since 2 October 2023. |
| DMA-4 | https://www.sknis.gov.kn/2026/02/11/dominica-prime-minister-hon-skerrit-commends-caricom-chair-drews-proactive-regional-consultations-ahead-of-historic-50th-heads-meeting/ | 2026-09-23 | St Kitts and Nevis government news, dated 11 February 2026: names the Dominica Prime Minister in office. |

Notes: the last election was 6 December 2022, so the next is 2027-12 on the five-year convention.

## DOM (Dominican Republic)

| id | URL | opened | what it established |
|---|---|---|---|
| DOM-1 | https://en.wikipedia.org/wiki/Luis_Abinader (wikitext) | 2026-09-23 | President since 16 August 2020, born July 1967 (age 59), Modern Revolutionary Party. |
| DOM-2 | https://presidencia.gob.do/ | 2026-09-23 | Presidency site, item dated 22 September 2026, shows the same president. |

Notes: the next election is May 2028.

## GRD (Grenada)

| id | URL | opened | what it established |
|---|---|---|---|
| GRD-1 | https://en.wikipedia.org/wiki/Dickon_Mitchell (wikitext) | 2026-09-23 | Prime Minister since 24 June 2022, born October 1977 (age 48), National Democratic Congress. |
| GRD-2 | https://www.caribbeantoday.com/sections/politics/grenada-s-prime-minister-mitchell-continues-quest-for-re-election | 2026-09-23 | Dated 18 September 2026: the next election is constitutionally due no later than October 2027 and widely expected earlier. The NDC won 9 of 15 seats in 2022. |

Notes: the Governor-General is female. The table's 2027-06 is the five-year convention; the legal deadline is 2027-10.

## HTI (Haiti)

| id | URL | opened | what it established |
|---|---|---|---|
| HTI-1 | https://en.wikipedia.org/wiki/Alix_Didier_Fils-Aim%C3%A9 | 2026-09-23 | Acting Prime Minister since 10 November 2024, male, born November 1971 (age 54), independent. Sole executive since 7 February 2026. |
| HTI-2 | https://en.wikipedia.org/wiki/2026_Haitian_general_election | 2026-09-23 | The Transitional Presidential Council's mandate expired 7 February 2026. A "National Pact for Stability and the Organization of Elections" backs the acting PM as sole executive; the presidency is vacant. General elections are scheduled for 13 December 2026. |
| HTI-3 | https://www.wlrn.org/americas/2026-05-12/haiti-prime-minister-alix-didier-fils-aime-august-elections-impossible-under-current-crisis | 2026-09-23 | Dated 12 May 2026: an August vote was ruled out on security grounds, with a new president expected by early February 2027. |

Notes: **flagged uncertain.** Elections have slipped repeatedly since 2019, and gang control makes the December date fragile. `second_seat` is `none` because the presidency is vacant. The 22.2% share is the pre-March 2026 cabinet; a new 18-member team was presented in March 2026 (search result only, not opened). The repo's `french` key fits the elite's French-derived names.

## JAM (Jamaica)

| id | URL | opened | what it established |
|---|---|---|---|
| JAM-1 | https://en.wikipedia.org/wiki/Andrew_Holness (wikitext) | 2026-09-23 | Prime Minister since 3 March 2016, born July 1972 (age 54), Jamaica Labour Party. |
| JAM-2 | https://en.wikipedia.org/wiki/2025_Jamaican_general_election (wikitext) | 2026-09-23 | Election on 3 September 2025; the JLP government was returned. |
| JAM-3 | https://jamaica-gleaner.com/article/commentary/20260811/jamaica-64-are-we-becoming-republic-or-just-talking-about-it | 2026-09-23 | Dated 10 August 2026: Jamaica is still a monarchy. The republic bill is tabled but stalled, and change needs two-thirds of both houses plus a referendum. |
| JAM-4 | https://opm.gov.jm/ | 2026-09-23 | Office of the Prime Minister site, item dated 16 September 2026, shows the same Prime Minister. |

Notes: the Governor-General is male. The next election is 2030-09 on the five-year convention.

## KNA (Saint Kitts and Nevis)

| id | URL | opened | what it established |
|---|---|---|---|
| KNA-1 | https://en.wikipedia.org/wiki/Terrance_Drew (wikitext) | 2026-09-23 | Prime Minister since 6 August 2022, born November 1976 (age 49), Saint Kitts and Nevis Labour Party. |
| KNA-2 | https://www.sknis.gov.kn/2026/02/11/dominica-prime-minister-hon-skerrit-commends-caricom-chair-drews-proactive-regional-consultations-ahead-of-historic-50th-heads-meeting/ | 2026-09-23 | Government information service, dated 11 February 2026: the same Prime Minister, then CARICOM chair. |

Notes: the Governor-General is female. The table's 2027-08 is the five-year convention. Per the search summary, the legislature's term started 25 October 2022, so an election is due within 90 days of October 2027.

## LCA (Saint Lucia)

| id | URL | opened | what it established |
|---|---|---|---|
| LCA-1 | https://en.wikipedia.org/wiki/Philip_J._Pierre (wikitext) | 2026-09-23 | Prime Minister since 28 July 2021, born September 1954 (age 72), Saint Lucia Labour Party. |
| LCA-2 | https://en.wikipedia.org/wiki/2025_Saint_Lucian_general_election (wikitext) | 2026-09-23 | Election on 1 December 2025: the SLP won a landslide and the opposition kept one seat. |

Notes: the Governor-General's post is held by a man in an acting capacity. The next election is 2030-12 on the five-year convention.

## VCT (Saint Vincent and the Grenadines)

| id | URL | opened | what it established |
|---|---|---|---|
| VCT-1 | https://en.wikipedia.org/wiki/Godwin_Friday (wikitext) | 2026-09-23 | Prime Minister since 28 November 2025, born September 1959 (age 66, turning 67 on 28 September 2026), New Democratic Party. |
| VCT-2 | https://www.stvincenttimes.com/godwin-friday-sworn-in-st-vincent-prime-minister/ | 2026-09-23 | Dated news: sworn in 28 November 2025 after the NDP won 14 of 15 seats, ending the previous government's quarter-century in office. |

Notes: the Governor-General is male (a change since the swearing-in). The 14.3% share reflects the new NDP cabinet, sworn in about a month before the 1 January 2026 reference date. The next election is 2030-11 on the five-year convention.

## TTO (Trinidad and Tobago)

| id | URL | opened | what it established |
|---|---|---|---|
| TTO-1 | https://en.wikipedia.org/wiki/Kamla_Persad-Bissessar (wikitext) | 2026-09-23 | Prime Minister since 1 May 2025 (a second tenure after 2010 to 2015), born April 1952 (age 74), United National Congress. |
| TTO-2 | https://en.wikipedia.org/wiki/Second_Persad-Bissessar_administration | 2026-09-23 | Government of the "United National Congress/Coalition of Interests". |
| TTO-3 | https://en.wikipedia.org/wiki/2025_Trinidad_and_Tobago_general_election (wikitext) | 2026-09-23 | Election on 28 April 2025: the UNC won 26 seats and a majority. |
| TTO-4 | https://en.wikipedia.org/wiki/Christine_Kangaloo (wikitext) | 2026-09-23 | The President (ceremonial head of state, female) has been in office since 20 March 2023. |

Notes: `leader_in_office_since` is 2025, the current tenure. The repo's `anglo` key covers given names, but Indo-Trinidadian surnames are prominent in the UNC government. The next election is 2030-04 on the five-year convention.

## BLZ (Belize)

| id | URL | opened | what it established |
|---|---|---|---|
| BLZ-1 | https://en.wikipedia.org/wiki/Johnny_Brice%C3%B1o (wikitext) | 2026-09-23 | Prime Minister since 12 November 2020, born July 1960 (age 66), People's United Party. |
| BLZ-2 | https://en.wikipedia.org/wiki/2025_Belizean_general_election (wikitext) | 2026-09-23 | Election on 12 March 2025: the PUP won a second term. |

Notes: the Governor-General is female. Belize's political elite mixes Creole (Anglo) and Mestizo (Hispanic) names; the repo maps `anglo`. The next election is 2030-03 on the five-year convention.

## CRI (Costa Rica)

| id | URL | opened | what it established |
|---|---|---|---|
| CRI-1 | https://en.wikipedia.org/wiki/Laura_Fern%C3%A1ndez_Delgado | 2026-09-23 | President since 8 May 2026, female, born July 1986 (age 40 on as_of), Sovereign People's Party. Won the 1 February 2026 first round with 48.3%. |
| CRI-2 | https://www.aljazeera.com/news/2026/5/8/laura-fernandez-sworn-in-as-costa-ricas-new-president | 2026-09-23 | Dated 8 May 2026: sworn in. Her party holds 31 of 57 legislative seats. |
| CRI-3 | https://en.wikipedia.org/wiki/2026_Costa_Rican_general_election (wikitext) | 2026-09-23 | The PPSO won an outright legislative majority, the first single-party majority since 1990. |
| CRI-4 | https://www.presidencia.go.cr/ | 2026-09-23 | Presidency site shows the same president. |

Notes: the 28.6% share is the predecessor's cabinet. The next election is February 2030.

## SLV (El Salvador)

| id | URL | opened | what it established |
|---|---|---|---|
| SLV-1 | https://en.wikipedia.org/wiki/Nayib_Bukele (wikitext) | 2026-09-23 | President since 1 June 2019 (second consecutive term from 2024), born July 1981 (age 45), Nuevas Ideas. |
| SLV-2 | https://ticotimes.net/2026/07/13/bukele-wins-nuevas-ideas-nomination-third-term-el-salvador | 2026-09-23 | Dated 13 July 2026: general elections on 28 February 2027 under the 2025 reform (indefinite re-election, six-year term, no runoff). The incumbent was nominated for a third term. |

## GTM (Guatemala)

| id | URL | opened | what it established |
|---|---|---|---|
| GTM-1 | https://en.wikipedia.org/wiki/Bernardo_Ar%C3%A9valo (wikitext) | 2026-09-23 | President since 14 January 2024, born October 1958 (age 67). Party field: Independent (2026 to present). |
| GTM-2 | https://en.wikipedia.org/wiki/Cabinet_of_Bernardo_Ar%C3%A9valo | 2026-09-23 | The current cabinet is mostly independents, with some Semilla-aligned ministers, one Winaq minister and one military minister. Gender parity held from 28 November 2025 to 6 April 2026. |
| GTM-3 | https://en.wikipedia.org/wiki/Movimiento_Semilla (wikitext) | 2026-09-23 | Semilla was suspended in 2023 and canceled de jure on 27 March 2026. A splinter party, Raíces, broke publicly with the president in 2026. |

Notes: **flagged uncertain.** The president has no party of his own. The 50.0% share reflects the parity period, which ended in April 2026. The next election is June 2027.

## HND (Honduras)

| id | URL | opened | what it established |
|---|---|---|---|
| HND-1 | https://en.wikipedia.org/wiki/Nasry_Asfura | 2026-09-23 | President since 27 January 2026, male, born June 1958 (age 68), National Party of Honduras. |
| HND-2 | https://www.worldpoliticsreview.com/asfura-honduras-president-inauguration/ | 2026-09-23 | Dated 27 January 2026: sworn in after winning by about 30,000 votes amid fraud allegations. |
| HND-3 | https://en.wikipedia.org/wiki/2025_Honduran_general_election (wikitext) | 2026-09-23 | Election on 30 November 2025; the electoral council declared the winner on 24 December 2025. |

Notes: **flagged uncertain** (narrow, disputed result). The 33.3% share is the predecessor's cabinet. The next election is November 2029.

## NIC (Nicaragua)

| id | URL | opened | what it established |
|---|---|---|---|
| NIC-1 | https://en.wikipedia.org/wiki/Daniel_Ortega (wikitext) | 2026-09-23 | President since 10 January 2007 and Co-President since the 2025 reform. Born November 1945 (age 80). FSLN. |
| NIC-2 | https://en.wikipedia.org/wiki/Rosario_Murillo (wikitext) | 2026-09-23 | The other Co-President is female, born June 1951. |
| NIC-3 | https://en.wikipedia.org/wiki/2027_Nicaraguan_general_election | 2026-09-23 | The election was moved from November 2026 to November 2027 by the 2025 term extension. On 20 July 2026 the senior co-president announced there would be no more elections, and the Assembly moved to enact that. |

Notes: **flagged uncertain.** The co-presidency is a formal two-person diarchy. The elder co-president is coded as leader because he has held the seat since 2007; the choice between the two is a judgment call. With elections abolished, `next_leader_selection` is `none scheduled`. The NPR report of the announcement (npr.org, 21 July 2026) timed out and was not read.

## PAN (Panama)

| id | URL | opened | what it established |
|---|---|---|---|
| PAN-1 | https://en.wikipedia.org/wiki/Jos%C3%A9_Ra%C3%BAl_Mulino (wikitext) | 2026-09-23 | President since 1 July 2024, born June 1959 (age 67), Realizing Goals (Realizando Metas). |

Notes: the presidency site (presidencia.gob.pa) returned an empty page. The next election is May 2029.

## BOL (Bolivia)

| id | URL | opened | what it established |
|---|---|---|---|
| BOL-1 | https://en.wikipedia.org/wiki/Rodrigo_Paz (wikitext) | 2026-09-23 | President since 8 November 2025, born 22 September 1967 (turned 59 the day before as_of). The infobox records the Christian Democratic Party as his 2025 candidacy vehicle. |
| BOL-2 | https://en.wikipedia.org/wiki/2025_Bolivian_general_election (wikitext) | 2026-09-23 | Elections on 17 August 2025, runoff 19 October 2025, won by the PDC candidate. |

Notes: **flagged uncertain** (a governance crisis and a public rift with the vice president were reported in 2026 search results but not opened). A US State Department readout of a 21 September 2026 meeting with the president was listed in search results but returned 403. The next election is August 2030.

## ECU (Ecuador)

| id | URL | opened | what it established |
|---|---|---|---|
| ECU-1 | https://en.wikipedia.org/wiki/Daniel_Noboa (wikitext) | 2026-09-23 | President since 23 November 2023 (re-elected 2025), born November 1987 (age 38), National Democratic Action. |
| ECU-2 | https://en.wikipedia.org/wiki/2025_Ecuadorian_general_election (wikitext) | 2026-09-23 | First round 9 February 2025, runoff 13 April 2025. |

Notes: the next presidential election is February 2029.

## GUY (Guyana)

| id | URL | opened | what it established |
|---|---|---|---|
| GUY-1 | https://en.wikipedia.org/wiki/Irfaan_Ali (wikitext) | 2026-09-23 | President since 2 August 2020, born April 1980 (age 46), People's Progressive Party/Civic. |
| GUY-2 | https://en.wikipedia.org/wiki/2025_Guyanese_general_election (wikitext) | 2026-09-23 | Election on 1 September 2025; the PPP/C was re-elected, and a new party became the main opposition. |
| GUY-3 | https://op.gov.gy/ | 2026-09-23 | Office of the President site shows the same incumbent as "Executive President". |

Notes: the President is both head of state and head of government; the Prime Minister is his principal assistant, not a separate seat. Indo-Guyanese surnames are prominent in the governing party, and the repo maps `anglo`. The next election is 2030-09 on the five-year cycle.

## PRY (Paraguay)

| id | URL | opened | what it established |
|---|---|---|---|
| PRY-1 | https://en.wikipedia.org/wiki/Santiago_Pe%C3%B1a (wikitext) | 2026-09-23 | President since 15 August 2023, born November 1978 (age 47), Colorado Party. |

Notes: EIU 2025 moved Paraguay from hybrid regime to flawed democracy (6.04; DWB-2025). The presidency site (presidencia.gov.py) refused the connection. The next election is April 2028.

## PER (Peru)

| id | URL | opened | what it established |
|---|---|---|---|
| PER-1 | https://en.wikipedia.org/wiki/Keiko_Fujimori | 2026-09-23 | President since 28 July 2026, female, born May 1975 (age 51), Popular Force. The President of the Council of Ministers is male. |
| PER-2 | https://www.aljazeera.com/news/2026/7/28/keiko-fujimori-sworn-in-as-peru-president-after-narrow-election-win | 2026-09-23 | Dated 28 July 2026: sworn in after a narrow runoff win; the ninth president in a decade. |
| PER-3 | https://en.wikipedia.org/wiki/2026_Peruvian_general_election (wikitext) | 2026-09-23 | First round 12 to 13 April 2026, runoff 7 June 2026. |

Notes: **flagged uncertain** (narrow margin, and the country removed or replaced several presidents from 2016 to 2026). `second_seat` is `same`: the President of the Council of Ministers coordinates the cabinet, but the President is head of both state and government. The 21.1% share is the predecessor's cabinet. The next election is April 2031.

## SUR (Suriname)

| id | URL | opened | what it established |
|---|---|---|---|
| SUR-1 | https://en.wikipedia.org/wiki/Jennifer_Geerlings-Simons (wikitext) | 2026-09-23 | President since 16 July 2025, female, born September 1953 (age 73), National Democratic Party. |
| SUR-2 | https://en.wikipedia.org/wiki/2025_Surinamese_general_election (wikitext) | 2026-09-23 | Election on 25 May 2025. On 27 May the NDP agreed a coalition with ABOP, NPS, Pertjajah Luhur, Alternative 2020 and BEP. |
| SUR-3 | https://en.wikipedia.org/wiki/Geerlings-Simons_cabinet | 2026-09-23 | A six-party coalition with 34 of 51 seats (a two-thirds majority). No partner is recorded as having left. |

Notes: the President is head of state and government (the Vice President chairs the Council of Ministers). The elite spans Creole, Hindustani, Javanese and Dutch-origin names; the repo's `dutch` key fits the hyphenated married-name convention the table records. The next election is May 2030.

## URY (Uruguay)

| id | URL | opened | what it established |
|---|---|---|---|
| URY-1 | https://en.wikipedia.org/wiki/Yamand%C3%BA_Orsi (wikitext) | 2026-09-23 | President since 1 March 2025, born June 1967 (age 59), Broad Front. |
| URY-2 | https://www.gub.uy/presidencia/ | 2026-09-23 | Presidency site, item dated 23 September 2026, shows the same president. |

Notes: the next election is October 2029.
