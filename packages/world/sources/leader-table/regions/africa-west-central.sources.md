# West and central Africa leader table: sources

Verified 2026-09-23 for 23 governments: NGA, CMR, CAF, TCD, GNQ, GAB, COG, STP, COD, BEN, BFA, CPV, CIV, GMB, GHA, GIN, GNB, LBR, MLI, NER, SEN, SLE, TGO. Every URL below was opened on 2026-09-23. Wikipedia pages were read as raw wikitext (`action=raw`) unless the row says the rendered page. No incumbent is named in this file. A URL can carry a name because that is the page's address.

Reuters, AP and RFI refused automated fetches in this session. Where a Wikipedia page cites one of them for a 2025-2026 change, the row says so. The Wikipedia page is what was opened, not the wire story.

## Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/w/index.php?title=The_Economist_Democracy_Index&action=raw (the country table, whose first data column is 2025 per its header) | 2026-09-23 | EIU Democracy Index 2025 category and score. Flawed democracy: Cape Verde 7.58, Ghana 6.24, Senegal 6.05 (upgraded from hybrid in 2025). Hybrid regime: Liberia 5.57, Gambia 4.47, Sierra Leone 4.44, Benin 4.26, Ivory Coast 4.24, Nigeria 4.10. Authoritarian: Gabon 3.49, Togo 2.88, Republic of the Congo 2.79, Cameroon 2.56, Burkina Faso 2.55, Mali 2.40, Guinea 2.15, Niger 1.95, Equatorial Guinea 1.92, DR Congo 1.92, Chad 1.76, Guinea-Bissau 1.37, Central African Republic 1.18. São Tomé and Príncipe is not covered by the index. |
| FH-2026 | https://freedomhouse.org/country/sao-tome-and-principe/freedom-world/2026 (rendered page) | 2026-09-23 | Freedom in the World 2026: São Tomé and Príncipe is Free, 84/100. Used only because the EIU does not rate it. |
| WIP-2026 | https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026 and the PDF it links, https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (text extracted with `pdftotext -raw`) | 2026-09-23 | IPU and UN Women "Women in Politics: 2026": women's share of cabinet members who head ministries, **as at 1 January 2026**. It is newer than the 2025 map the brief names, so it is used for every `women_cabinet_share` value. Values (women/total): STP 40.0 (4/10), GAB 35.7 (10/28), LBR 35.3 (6/17), SLE 33.3 (9/27), BEN 26.3 (5/19), COD 25.0 (10/40), TGO 22.2 (4/18), GIN 21.9 (7/32), GNB 21.7 (5/23, asterisked: from publicly available information), COG 21.6 (8/37), GHA 21.1 (4/19), NER 20.8 (5/24), CIV 20.0 (6/30), CAF 19.4 (6/31), CMR 18.8 (6/32), MLI 18.5 (5/27), TCD 16.0 (4/25), SEN 16.0 (4/25), GMB 14.3 (3/21), CPV 12.5 (2/16), BFA 9.5 (2/21), NGA 8.6 (3/35), GNQ 5.0 (1/20, asterisked). The map also lists DR Congo among countries with a woman head of government. |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The 2025 edition (as at 1 January 2025), opened as a cross-check only. No TSV value comes from it. |
| HEADS | https://en.wikipedia.org/w/index.php?title=List_of_current_heads_of_state_and_government&action=raw (page last modified 2026-09-23 05:30 GMT per the HTTP header) | 2026-09-23 | The current holder of both seats for all 23 ids, and which seat Wikipedia marks as holding executive power. It is the source for the second seat's sex where no other row names it. |
| REPO | `packages/world/src/dataset/name-cultures.ts` (`ROSTER_NAME_CULTURE`), `packages/world/src/dataset/people.ts` (authored nations: NGA `west-african`, COD `central-african`), `name-banks.ts` and `name-banks.vendored.ts` (culture keys) | 2026-09-23 | The repo already maps all 23 ids to a bank key, and the TSV uses those keys unchanged. CMR `cameroonian`; CAF, GNQ, GAB and COG `equatorial-african`; TCD `arabic`; STP, CPV and GNB `lusophone`; BEN and TGO `gbe-speaking`; BFA `burkinabe`; CIV `ivorian`; GMB and SEN `senegambian`; GHA `ghanaian`; GIN and MLI `mande`; LBR and SLE `upper-guinea-coast`; NER `nigerien`. |

Two caveats apply throughout.

1. The women-cabinet figures are a 1 January 2026 snapshot. They predate the cabinets formed since then in Guinea (January 2026), Benin (May 2026), Senegal (June 2026) and Cape Verde (June 2026). For Senegal, SEN-3 counts 4 women among the 30 members of the June 2026 government. That figure is not the same measure as the IPU/UN Women one, so the TSV keeps the map's value.
2. `surname_rule` is general onomastic knowledge about each country's political elite. No source here establishes it, so treat it as inference.

## How the judgment columns were decided

- **Leader seat.** The office a foreign president actually deals with. Every presidential and semi-presidential system in this region with a dominant president gets `head_of_state`. Cape Verde is parliamentary and gets `head_of_government`. Togo moved to a parliamentary constitution in 2025: executive power passed to the President of the Council of Ministers, and the President of the Republic, elected by parliament, is ceremonial. So Togo gets `head_of_government`. São Tomé and Príncipe gets `head_of_government` because its constitution vests executive government in the Prime Minister and HEADS marks that seat as executive. That call is contested; see the STP note.
- **Second seat.** `same` where one person is both head of state and head of government: Nigeria, Gabon (the premiership was abolished in May 2025), Benin, the Gambia, Ghana, Liberia and Sierra Leone. Sierra Leone's Chief Minister is a presidential appointee, not the head of government. Everywhere else the second seat is the constitutional head of government (a Prime Minister) or, for the two parliamentary cases and São Tomé, the President of the Republic.
- **Regime type.** The EIU 2025 category, except where the form of government calls for a special type. Burkina Faso, Mali, Niger and Guinea-Bissau get `military_junta` (EIU: authoritarian), because each is ruled by officers who took power by coup and hold no election mandate. Guinea and Gabon keep the EIU's `authoritarian`: their coup leaders were elected president in December 2025 and April 2025. São Tomé and Príncipe is not in the EIU, so FH-2026 decides it: Free, which I map to `flawed_democracy` by analogy.
- **Leader in office since.** The year the person began holding executive power continuously, including a transitional or de facto period before any election. That is why Chad, Guinea and Mali show 2021, Gabon and Niger 2023, and Togo 2005 (president from 2005, President of the Council since May 2025).
- **Next leader selection.** The next event that could replace the person in the leader seat. Where no electoral body has published a date, I derived the month from the previous election plus the constitutional term, and the nation's note says so. For juntas with a charter end date, that date is used.

## Nigeria (NGA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NGA-1 | https://statehouse.gov.ng/ (official) | 2026-09-23 | The President and Vice President in office, with news items dated 2026-09-22. |
| NGA-2 | https://en.wikipedia.org/w/index.php?title=Bola_Tinubu&action=raw | 2026-09-23 | In office since 29 May 2023, All Progressives Congress. Born March 1952, so 74 on the as-of date. |
| NGA-3 | https://inecnigeria.org/elections/calendar (INEC, official) | 2026-09-23 | Presidential and National Assembly elections are on 16 January 2027. |
| NGA-4 | https://www.premiumtimesng.com/news/top-news/859957-updated-inec-reschedules-2027-general-election-releases-new-election-timetable.html | 2026-09-23 | Dated news (2026-02-26): INEC moved the presidential election from 20 February to 16 January 2027 after the Electoral Act 2026. |
| NGA-5 | https://en.wikipedia.org/w/index.php?title=2027_Nigerian_general_election&action=raw | 2026-09-23 | Confirms 16 January 2027 and that INEC published the final presidential candidate list on 2026-09-12. |

The President is head of state and government, so the second seat is `same`. The Vice President is a man (NGA-1).

## Cameroon (CMR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CMR-1 | https://www.prc.cm/en (official Presidency) | 2026-09-23 | The same President is in office, with news items dated August 2026. |
| CMR-2 | https://www.france24.com/en/live-news/20251027-cameroon-s-paul-biya-92-wins-re-election-constitutional-court-announces | 2026-09-23 | Dated news (2025-10-27): re-elected with 53.66% on 12 October 2025 to an eighth seven-year term, so the next election falls in 2032. Aged 92 then. |
| CMR-3 | https://en.wikipedia.org/w/index.php?title=Paul_Biya&action=raw | 2026-09-23 | President since 6 November 1982, party RDPC (Cameroon People's Democratic Movement). Born February 1933, so 93 on the as-of date. |
| CMR-4 | https://en.wikipedia.org/w/index.php?title=Joseph_Ngute&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 4 January 2019. HEADS still lists him. |
| CMR-5 | https://en.wikipedia.org/wiki/2025_Cameroonian_presidential_election (raw) | 2026-09-23 | Election on 12 October 2025. The next is labeled the 2032 election. |

Next selection: 2032-10, derived from the October 2025 election plus the seven-year term. At 93, the incumbent is the oldest head of state in this table, so an unscheduled succession before 2032 is a real possibility. None had occurred as of 2026-09-23 (CMR-1 shows him active in August 2026).

## Central African Republic (CAF)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CAF-1 | https://www.france24.com/en/live-news/20260105-central-african-republic-president-touadera-re-elected-with-over-76-of-vote | 2026-09-23 | Dated news (2026-01-05/06): re-elected with 76.15% on 28 December 2025 to a third term, after the 2023 referendum removed term limits. |
| CAF-2 | https://en.wikipedia.org/w/index.php?title=Faustin-Archange_Touad%C3%A9ra&action=raw | 2026-09-23 | In office since 30 March 2016, United Hearts Movement. Born April 1957, so 69 on the as-of date. |
| CAF-3 | https://en.wikipedia.org/w/index.php?title=2025%E2%80%9326_Central_African_general_election&action=raw | 2026-09-23 | General election on 28 December 2025, with the legislative runoff on 26 April 2026. The ruling party won the presidency. |
| CAF-4 | https://en.wikipedia.org/w/index.php?title=2023_Central_African_constitutional_referendum&action=raw | 2026-09-23 | The 2023 constitution lengthened presidential terms from five to seven years and removed term limits. |
| CAF-5 | https://en.wikipedia.org/w/index.php?title=F%C3%A9lix_Moloua&action=raw | 2026-09-23 | The Prime Minister (a man) has served since February 2022 and was reappointed in 2024. HEADS still lists him. |

Next selection: 2032-12, derived from the December 2025 election plus the seven-year term.

## Chad (TCD)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TCD-1 | https://en.wikipedia.org/w/index.php?title=Mahamat_D%C3%A9by&action=raw | 2026-09-23 | De facto head of state from April 2021 as president of the Transitional Military Council, transitional president from October 2022, elected president and sworn in 23 May 2024. Patriotic Salvation Movement. Born April 1984, so 42 on the as-of date. |
| TCD-2 | https://www.africanews.com/2025/10/04/chad-scraps-presidential-term-limits-cementing-debys-rule/ | 2026-09-23 | Dated news (2025-10-04): the amendment replaces the five-year term renewable once with a seven-year term with no limit. "The new rules take effect at the next presidential election," though opponents say it gives the incumbent two extra years. |
| TCD-3 | https://en.wikipedia.org/w/index.php?title=Allamaye_Halina&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 23 May 2024. HEADS still lists him. |
| TCD-4 | https://en.wikipedia.org/w/index.php?title=2025_in_Chad&action=raw | 2026-09-23 | The National Assembly passed the term-limit amendment on 3 October 2025. |
| TCD-5 | https://en.wikipedia.org/w/index.php?title=2024_Chadian_presidential_election&action=raw | 2026-09-23 | The 6 May 2024 election was for a five-year term. |

Next selection: 2029-05, derived from the May 2024 election plus the five-year term the incumbent was elected to. This is contested. If the 2025 amendment is read as extending the current mandate to seven years, the date becomes 2031-05. The name culture is the repo's `arabic` mapping. It fits the northern Muslim elites who dominate the presidency and security services, though many southern ministers carry non-Arabic names.

## Equatorial Guinea (GNQ)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GNQ-1 | https://en.wikipedia.org/w/index.php?title=Teodoro_Obiang_Nguema_Mbasogo&action=raw | 2026-09-23 | Head of state since the August 1979 coup (Supreme Military Council chairman, then president from 1982). Democratic Party of Equatorial Guinea. Born June 1942, so 84 on the as-of date. |
| GNQ-2 | https://en.wikipedia.org/w/index.php?title=Manuel_Osa_Nsue_Nsua&action=raw | 2026-09-23 | A man has been Prime Minister since August 2024, replacing the country's first woman prime minister. He belongs to the PDGE. |
| GNQ-3 | https://en.wikipedia.org/w/index.php?title=Prime_Minister_of_Equatorial_Guinea&action=raw | 2026-09-23 | The Prime Minister is formally head of government, and the current incumbent is that man. |
| GNQ-4 | https://en.wikipedia.org/wiki/2022_Equatorial_Guinean_general_election (rendered) | 2026-09-23 | The last presidential election was on 20 November 2022 (97% for the incumbent). The page does not state the term length. |

The President holds real executive power, so the seat is `head_of_state`. Next selection: 2029-11. **Inference, not confirmed in an opened source:** it assumes the seven-year presidential term of the 2011 constitution, counted from the November 2022 election.

## Gabon (GAB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GAB-1 | https://www.aljazeera.com/news/2025/5/3/gabon-swears-in-ex-military-chief-oligui-as-president | 2026-09-23 | Dated news (2025-05-03): the 2023 coup leader was sworn in as elected president after a 19-month transition. |
| GAB-2 | https://en.wikipedia.org/w/index.php?title=Brice_Oligui_Nguema&action=raw | 2026-09-23 | De facto head of state from 30 August 2023, elected president from 3 May 2025, Democratic Union of Builders. Born March 1975, so 51 on the as-of date. |
| GAB-3 | https://en.wikipedia.org/w/index.php?title=2025_Gabonese_presidential_election&action=raw | 2026-09-23 | Election on 12 April 2025. The President is elected for a seven-year term, and the next general election is labeled 2032. |
| GAB-4 | https://en.wikipedia.org/w/index.php?title=Prime_Minister_of_Gabon&action=raw | 2026-09-23 | The post of Prime Minister was abolished on 4 May 2025 under the November 2024 constitution. A Vice President of the Government took over its coordinating duties, and the President is head of government. |
| GAB-5 | https://en.wikipedia.org/w/index.php?title=2025_Gabonese_parliamentary_election&action=raw | 2026-09-23 | The Democratic Union of Builders won 101 seats in the September-November 2025 legislative elections. |

Second seat: `same`. Next selection: 2032-04, derived.

## Republic of the Congo (COG)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COG-1 | https://www.africanews.com/2026/03/29/congo-brazzaville-court-confirms-sassou-nguesso-reelection-with-95/ | 2026-09-23 | Dated news (2026-03-29): the constitutional court confirmed re-election with 94.9% for a five-year term. Aged 82. |
| COG-2 | https://en.wikipedia.org/w/index.php?title=Denis_Sassou_Nguesso&action=raw | 2026-09-23 | President continuously since 25 October 1997 (and earlier, 1979-1992), Congolese Party of Labour. Born November 1943, so 82 on the as-of date. |
| COG-3 | https://en.wikipedia.org/w/index.php?title=2026_Republic_of_the_Congo_presidential_election&action=raw | 2026-09-23 | Election on 15 March 2026, five-year term, next election 2031. |
| COG-4 | https://en.wikipedia.org/w/index.php?title=2026_in_the_Republic_of_the_Congo&action=raw | 2026-09-23 | Inaugurated 16 April 2026 (cites AP, 2026-04-17). The Prime Minister is unchanged. |
| COG-5 | https://en.wikipedia.org/w/index.php?title=Anatole_Collinet_Makosso&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 12 May 2021. |

Next selection: 2031-03.

## São Tomé and Príncipe (STP)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| STP-1 | https://www.africanews.com/2026/07/20/sao-tome-and-principes-president-vila-nova-projected-to-win-second-term/ | 2026-09-23 | Dated news (2026-07-20): the President won a second term with over 55%, running as an independent after breaking with Independent Democratic Action (ADI). His ADI rival was backed by the Prime Minister. The President is 66. |
| STP-2 | https://www.stp-press.st/2026/01/24/presidente-marca-eleicoes-presidenciais-para-19-de-julho-e-legislativas-regional-e-autarquicas-para-27-de-setembro/ (state news agency) | 2026-09-23 | Dated news (2026-01-24): presidential decree setting the presidential election for 19 July 2026 and the legislative, regional and municipal elections for 27 September 2026. |
| STP-3 | https://en.wikipedia.org/w/index.php?title=2026_S%C3%A3o_Tom%C3%A9an_presidential_election&action=raw | 2026-09-23 | Result 55.88% to 41.46%. The President dismissed the previous Prime Minister in January 2025, and ADI has since been split between factions. |
| STP-4 | https://en.wikipedia.org/w/index.php?title=2026_S%C3%A3o_Tom%C3%A9an_parliamentary_election&action=raw | 2026-09-23 | Legislative election on 27 September 2026. The sitting Prime Minister is an ADI member, and ADI holds 30 of 55 seats going in. |
| STP-5 | https://www.telanon.info/destaques/2025/01/12/46992/americo-doliveira-dos-ramos-e-o-novo-primeiro-ministro-de-sao-tome-e-principe/ | 2026-09-23 | Dated news (2025-01-12): a man (ADI, former central bank governor and finance minister) was appointed Prime Minister by presidential decree 04/2025. |
| STP-6 | https://pt.wikipedia.org/w/index.php?title=Am%C3%A9rico_Ramos&action=raw | 2026-09-23 | The Prime Minister was born in 1957, so he is 68 or 69. **Unsourced on that page**, so the 60-69 band is weakly supported. |
| STP-7 | https://en.wikipedia.org/w/index.php?title=Carlos_Vila_Nova&action=raw | 2026-09-23 | The President (a man, born July 1959) has held office since 2 October 2021 and has been an independent since 2026. |

Leader seat: `head_of_government`, as the constitutional executive and the seat HEADS marks as executive. The President has been ascendant, though: he dismissed an elected prime minister in 2025 and won a fresh mandate in July 2026. A reasonable reader could pick `head_of_state` instead (M, 60-69, in office since 2021). Next selection: 2026-09, the legislative election four days after the as-of date. Its outcome decides the next Prime Minister. Regime: FH-2026.

## Democratic Republic of the Congo (COD)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COD-1 | https://en.wikipedia.org/w/index.php?title=F%C3%A9lix_Tshisekedi&action=raw | 2026-09-23 | President since 24 January 2019, Union for Democracy and Social Progress. Born June 1963, so 63 on the as-of date. |
| COD-2 | https://en.wikipedia.org/w/index.php?title=Judith_Suminwa&action=raw | 2026-09-23 | A woman has been Prime Minister since 12 June 2024. WIP-2026 also lists the DRC among countries with a woman head of government. |
| COD-3 | https://en.wikipedia.org/w/index.php?title=2023_Democratic_Republic_of_the_Congo_general_election&action=raw | 2026-09-23 | The last general election was on 20 December 2023. |

`governing_parties` gives the President's party and the Sacred Union of the Nation, the presidential majority coalition. Next selection: 2028-12, derived from the December 2023 election plus the five-year term. Any constitutional change to presidential terms would move it; none was in force on the as-of date as far as the opened sources show.

## Benin (BEN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BEN-1 | https://www.africanews.com/2026/05/24/former-finance-minister-romuald-wadagni-sworn-is-as-benins-new-president/ | 2026-09-23 | Dated news (2026-05-24): a new President was sworn in after winning 94% on 12 April 2026. A 2025 constitutional reform extended the term to seven years. |
| BEN-2 | https://en.wikipedia.org/w/index.php?title=Romuald_Wadagni&action=raw | 2026-09-23 | In office since 24 May 2026. Nominated by the ruling coalition and formally independent. Born June 1976, so 50 on the as-of date. The Vice President is a woman. |
| BEN-3 | https://en.wikipedia.org/w/index.php?title=2026_Beninese_parliamentary_election&action=raw | 2026-09-23 | The 11 January 2026 election returned the Progressive Union for Renewal (60 seats) and the Republican Bloc (49 seats), all 109 seats between them. The page also records a foiled coup attempt in December 2025. |

Benin has no prime minister; the President is head of state and government, so the second seat is `same`. Next selection: 2033-04, derived from the seven-year term and April election timing.

## Burkina Faso (BFA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BFA-1 | https://en.wikipedia.org/w/index.php?title=Ibrahim_Traor%C3%A9&action=raw | 2026-09-23 | Head of state since the September 2022 coup (sworn in 6 October 2022). The May 2024 national consultations extended the mandate by five years and let the leader stand in a later election. Born March 1988, so 38 on the as-of date. Coup and assassination plots were reported foiled in 2025 and January 2026. |
| BFA-2 | https://en.wikipedia.org/w/index.php?title=2024_in_Burkina_Faso&action=raw | 2026-09-23 | On 25 May 2024 the junta extended its tenure until 2029 (cites AP, 2024-05-26). |
| BFA-3 | https://en.wikipedia.org/w/index.php?title=2026_in_Burkina_Faso&action=raw | 2026-09-23 | On 29 January 2026 the military government dissolved all political parties (cites Reuters, 2026-01-29). The Prime Minister is unchanged. |
| BFA-4 | https://en.wikipedia.org/w/index.php?title=Jean_Emmanuel_Ou%C3%A9draogo&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 7 December 2024. |

Next selection: 2029-07. The year is sourced (BFA-2). The month assumes the 60-month extension runs from July 2024, and no election has been scheduled.

## Cape Verde (CPV)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CPV-1 | https://www.africanews.com/2026/05/18/cape-verde-opposition-wins-parliamentary-elections/ | 2026-09-23 | Dated news (2026-05-18): the opposition PAICV won the 17 May 2026 parliamentary election, and its leader would become Prime Minister. A presidential election follows in November 2026. |
| CPV-2 | https://en.wikipedia.org/w/index.php?title=Francisco_Carvalho&action=raw | 2026-09-23 | The new Prime Minister (a man, PAICV) took office on 19 June 2026. Born December 1970, so 55 on the as-of date. |
| CPV-3 | https://en.wikipedia.org/wiki/2026_Cape_Verdean_presidential_election (rendered) | 2026-09-23 | The presidential election is set for 15 November 2026. It does not directly select the Prime Minister. |
| CPV-4 | https://en.wikipedia.org/w/index.php?title=Jos%C3%A9_Maria_Neves&action=raw | 2026-09-23 | The President (a man) has held office since 9 November 2021. |

Next selection: 2031-05, derived from the five-year legislature elected in May 2026. The second seat's holder may change after 15 November 2026.

## Côte d'Ivoire (CIV)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CIV-1 | https://www.cei.ci/wp-content/uploads/2025/10/EPR_2025_RESULTAT_NATIONAL.pdf (electoral commission, official) | 2026-09-23 | Provisional national results of the 25 October 2025 presidential election: the RHDP candidate (the incumbent) won 89.77%. |
| CIV-2 | https://en.wikipedia.org/w/index.php?title=2025_Ivorian_presidential_election&action=raw | 2026-09-23 | Final result 91.23%. The next election is labeled 2030. |
| CIV-3 | https://en.wikipedia.org/w/index.php?title=Alassane_Ouattara&action=raw | 2026-09-23 | Term start 11 April 2011, disputed with the predecessor from 4 December 2010. Born 1 January 1942, so 84 on the as-of date. |
| CIV-4 | https://en.wikipedia.org/w/index.php?title=Robert_Beugr%C3%A9_Mamb%C3%A9&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 17 October 2023. HEADS still lists him. |
| CIV-5 | https://en.wikipedia.org/w/index.php?title=Vice_President_of_Ivory_Coast&action=raw | 2026-09-23 | A man has been Vice President since 19 April 2022. The second seat recorded is the Prime Minister, the constitutional head of government. |

`leader_in_office_since` is 2011, when the incumbent actually took control. Official counts that start from December 2010 would give 2010. Next selection: 2030-10, derived.

## The Gambia (GMB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GMB-1 | https://thepoint.gm/africa/gambia/headlines/2026-presidential-election-set-for-dec-5-iec-chairman | 2026-09-23 | Dated news (2025-10-10): the IEC chairman set the presidential election for 5 December 2026. |
| GMB-2 | https://en.wikipedia.org/w/index.php?title=Adama_Barrow&action=raw | 2026-09-23 | President since January 2017, National People's Party. Born February 1965, so 61 on the as-of date. |
| GMB-3 | https://en.wikipedia.org/w/index.php?title=2026_Gambian_presidential_election&action=raw | 2026-09-23 | Election on 5 December 2026, and the incumbent is seeking a third term. |

Second seat: `same`. Next selection: 2026-12.

## Ghana (GHA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GHA-1 | https://presidency.gov.gh/ (official) | 2026-09-23 | The President and the Vice President (a woman) are in office, with press releases dated 2026-09-22. |
| GHA-2 | https://en.wikipedia.org/w/index.php?title=John_Mahama&action=raw | 2026-09-23 | In office since 7 January 2025 (he was also president 2012-2017), National Democratic Congress. Born November 1958, so 67 on the as-of date. |
| GHA-3 | https://en.wikipedia.org/w/index.php?title=2024_Ghanaian_general_election&action=raw | 2026-09-23 | Elected 7 December 2024 to a four-year term. |

Second seat: `same`. Next selection: 2028-12, derived.

## Guinea (GIN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GIN-1 | https://www.africanews.com/2026/01/27/amadou-oury-bah-re-appointed-prime-minister-under-guineas-new-government/ | 2026-09-23 | Dated news (2026-01-27): the former junta leader was inaugurated in January 2026 for a seven-year term after the December 2025 election, and the Prime Minister (a man) was reappointed. |
| GIN-2 | https://en.wikipedia.org/w/index.php?title=Mamady_Doumbouya&action=raw | 2026-09-23 | Head of state since 1 October 2021 (interim until 17 January 2026), Generation for Modernity and Development. Birth date 5 December 1984 per the official Presidency biography, though the page is also categorized under 1980 births. Either way he is 41-46, so 40-49. |
| GIN-3 | https://en.wikipedia.org/w/index.php?title=2025_Guinean_presidential_election&action=raw | 2026-09-23 | Election on 28 December 2025, won with 86.72%. The next is labeled 2032. |
| GIN-4 | https://en.wikipedia.org/w/index.php?title=2026_Guinean_parliamentary_election&action=raw | 2026-09-23 | In the 31 May 2026 legislative election the Generation for Modernity and Development won 93 of 147 seats. Major opposition parties were barred. |
| GIN-5 | https://en.wikipedia.org/w/index.php?title=2026_in_Guinea&action=raw | 2026-09-23 | The Prime Minister was reappointed on 26 January 2026. |

Next selection: 2032-12, derived.

## Guinea-Bissau (GNB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GNB-1 | https://www.france24.com/en/africa/20251127-general-horta-nta-sworn-in-as-guinea-bissau-transitional-leader-following-coup | 2026-09-23 | Dated news (2025-11-27): after the 26 November 2025 coup, a general was sworn in as transitional leader for a one-year transition. |
| GNB-2 | https://www.aa.com.tr/en/africa/guinea-bissau-sets-presidential-legislative-elections-for-dec-6/3807220 | 2026-09-23 | Dated news (2026-01-22): presidential decree 02/2026 set presidential and legislative elections for 6 December 2026. |
| GNB-3 | https://www.aljazeera.com/news/2026/8/30/vote-count-starts-in-guinea-bissau-referendum-on-strengthening-presidency | 2026-09-23 | Dated news (2026-08-30): the constitutional referendum moves the country to a presidential system in which the head of state appoints and dismisses the Prime Minister. The 6 December elections stand, and the transitional leader is barred from running. |
| GNB-4 | https://en.wikipedia.org/w/index.php?title=Horta_Inta-A_Na_Man&action=raw | 2026-09-23 | Transitional President since 27 November 2025, also Chief of the High Command. Born "circa 1960", flagged "citation needed". |

The age band (60-69) rests on an unsourced circa-1960 birth year and is weak. The second seat is the Prime Minister (a man, per HEADS). Next selection: 2026-12.

## Liberia (LBR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBR-1 | https://emansion.gov.lr/ (official Executive Mansion) | 2026-09-23 | The President and the Vice President (a man) are in office, with news dated 2026-09-21. |
| LBR-2 | https://en.wikipedia.org/w/index.php?title=Joseph_Boakai&action=raw | 2026-09-23 | In office since 22 January 2024, Unity Party. Born November 1944, so 81 on the as-of date. |
| LBR-3 | https://en.wikipedia.org/w/index.php?title=2023_Liberian_general_election&action=raw | 2026-09-23 | The next general election is in 2029 (the 2029 election page says "by October 2029"). |

Second seat: `same`. Next selection: 2029-10.

## Mali (MLI)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MLI-1 | https://www.aljazeera.com/news/2025/7/4/mali-military-chief-granted-renewable-five-year-presidential-term | 2026-09-23 | Dated news (2025-07-04): the transitional parliament granted the junta leader a five-year mandate from the charter's promulgation, renewable "as many times as necessary" without elections, "until the pacification of the country". Political parties were dissolved in May 2025. |
| MLI-2 | https://en.wikipedia.org/w/index.php?title=Assimi_Go%C3%AFta&action=raw | 2026-09-23 | De facto head of state from May 2021, interim until 8 July 2025, then under the new mandate. Born November 1983, so 42 on the as-of date. |
| MLI-3 | https://en.wikipedia.org/w/index.php?title=2025_in_Mali&action=raw | 2026-09-23 | Parties dissolved by decree on 13 May 2025. The renewable five-year term was adopted on 3 July 2025. |
| MLI-4 | https://en.wikipedia.org/w/index.php?title=List_of_prime_ministers_of_Mali&action=raw | 2026-09-23 | An army officer (a man) has been Prime Minister since 21 November 2024 and is still serving. |

Next selection: 2030-07, the end of the renewable mandate. It can be renewed without an election.

## Niger (NER)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NER-1 | https://www.aljazeera.com/news/2026/9/6/niger-military-accuses-france-of-orchestrating-failed-mutiny-what-to-know | 2026-09-23 | Dated news (2026-09-06): a mutiny on 28-29 August 2026 attacked the airport base and the presidential palace. It failed, and the 2023 coup leader remains in power. |
| NER-2 | https://en.wikipedia.org/w/index.php?title=Abdourahamane_Tiani&action=raw | 2026-09-23 | Head of state since the July 2023 coup, President of Niger since 26 March 2025. Born 1 January 1964, so 62 on the as-of date. |
| NER-3 | https://en.wikipedia.org/w/index.php?title=2025_in_Niger&action=raw | 2026-09-23 | Sworn in as president on 26 March 2025 for the five-year transition set by the new charter (cites AP, 2025-03-26). The national conference had recommended banning all existing parties. The Prime Minister is unchanged. |
| NER-4 | https://en.wikipedia.org/w/index.php?title=2026_Nigerien_coup_attempt&action=raw | 2026-09-23 | Result: coup failure. |

Next selection: 2030-03, the end of the five-year transition. The Prime Minister is a man (HEADS, NER-3).

## Senegal (SEN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SEN-1 | https://www.financialafrik.com/en/2026/05/27/senegal-ahmadou-al-aminou-lo-appointed-prime-minister-in-succession-of-ousmane-sonko/ | 2026-09-23 | Dated news (2026-05-27): the President dismissed the Prime Minister on 22 May 2026 and appointed an economist (a man) on 25 May 2026. |
| SEN-2 | https://www.semafor.com/article/06/02/2026/senegal-forms-new-government-after-pm-sacked | 2026-09-23 | Dated news (2026-06-02): a 30-member government was formed. PASTEF, the majority party in the National Assembly, said it would not take part, though at least three PASTEF members were appointed. |
| SEN-3 | https://www.financialafrik.com/en/2026/06/01/senegal-a-government-of-30-ministers-without-the-pastef-list/ | 2026-09-23 | Dated news (2026-06-01): PASTEF declined to join, and the list of 30 includes 4 women. |
| SEN-4 | https://en.wikipedia.org/w/index.php?title=Bassirou_Diomaye_Faye&action=raw | 2026-09-23 | President since 2 April 2024, independent since 2026 (formerly PASTEF). Born March 1980, so 46 on the as-of date. The ousted Prime Minister was elected speaker of the National Assembly (cites Reuters, 2026-05-26). |
| SEN-5 | https://en.wikipedia.org/w/index.php?title=Ahmadou_Al_Aminou_Lo&action=raw | 2026-09-23 | The new Prime Minister is an independent. |
| SEN-6 | https://en.wikipedia.org/w/index.php?title=2024_Senegalese_presidential_election&action=raw | 2026-09-23 | Election on 24 March 2024. The next presidential election is labeled 2029. |

`governing_parties` is `none (nonpartisan)` because both executive offices are held by independents and the parliamentary majority party formally stayed out of the government. That is a judgment: PASTEF members sit in the cabinet in a personal capacity, and PASTEF controls the legislature. Next selection: 2029-03, derived.

## Sierra Leone (SLE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SLE-1 | https://statehouse.gov.sl/ (official State House) | 2026-09-23 | The President is in office, with news dated 2026-09-23. |
| SLE-2 | https://en.wikipedia.org/w/index.php?title=Julius_Maada_Bio&action=raw | 2026-09-23 | In office since 4 April 2018, Sierra Leone People's Party. Born May 1964, so 62 on the as-of date. |
| SLE-3 | https://en.wikipedia.org/w/index.php?title=2023_Sierra_Leonean_general_election&action=raw | 2026-09-23 | The last general election was on 24 June 2023. |

Second seat: `same`. The Chief Minister is a presidential appointee, not the head of government. Next selection: 2028-06, derived from the June 2023 election plus the five-year term. The incumbent is term-limited.

## Togo (TGO)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TGO-1 | https://www.aljazeera.com/news/2025/7/4/togo-protests-signal-youth-anger-at-dynastic-rule-but-is-change-possible | 2026-09-23 | Dated news (2025-07-04): under the Fifth Republic constitution, the long-serving leader became President of the Council of Ministers, a post with no term limits. Direct presidential elections were abolished, and he has ruled since 2005. |
| TGO-2 | https://en.wikipedia.org/w/index.php?title=Faure_Gnassingb%C3%A9&action=raw | 2026-09-23 | President of the Council of Ministers since 3 May 2025 and president 2005-2025, Union for the Republic. Born June 1966, so 60 on the as-of date. The 2024 amendments moved most presidential powers to this office. |
| TGO-3 | https://en.wikipedia.org/w/index.php?title=2024_Togolese_parliamentary_election&action=raw | 2026-09-23 | Legislative election on 29 April 2024, in which the Union for the Republic won 108 seats. The next is labeled 2030. |

The President of the Republic, elected by parliament, is a man (HEADS). Next selection: 2030-04, derived. The next legislative election decides the majority that designates the President of the Council.
