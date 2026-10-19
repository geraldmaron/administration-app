# Leader table sources: Europe (west, north, central)

Companion to `europe-west-north-central.tsv`. Every source below was opened on 2026-09-23. No incumbent is named here: rows describe offices and attributes only, and a URL may carry a name because that is the page's address.

## Method and conventions

- **Incumbents** were checked against live pages on 2026-09-23. Where an official site blocked automated access (403, 429 or a CAPTCHA), the row rests on Wikipedia's current-officeholder pages plus a dated news or other official page. I didn't bypass any CAPTCHA. Each case is noted under its nation.
- **Ages** come from the birth dates on the cited biography pages, computed as of 2026-09-23.
- **next_leader_selection** is the month of a scheduled vote or selection that could replace the leader. Where no date is fixed, it's the month of the legal deadline, and the nation's notes say so.
- **women_cabinet_share** is taken as printed from the IPU/UN Women *Women in Politics: 2026* map (SHR-1), which counts cabinet members who head ministries as of 2026-01-01. I didn't recompute it. Governments that changed after that date are flagged in their notes, because the map figure describes the previous cabinet.
- **regime_type** is the EIU Democracy Index 2025 category (SHR-2, SHR-3). The EIU doesn't rate Andorra, Liechtenstein, Monaco or San Marino. For those four I used Freedom House *Freedom in the World 2026*, plus the special type `constitutional_monarchy_executive` where the monarch holds real executive or veto power.
- **name_culture** keys come from the repo: `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`) and `packages/world/src/dataset/name-cultures.ts` (`ROSTER_NAME_CULTURE`). Each row uses the key that the repo already maps to that nation. All 30 nations are mapped there, so no `none:` value was needed.

## Shared sources (cited on every row)

| id | URL | opened | what it established |
|---|---|---|---|
| SHR-1 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | IPU/UN Women map, published March 2026, with data as of 2026-01-01: share of women among cabinet ministers who head ministries, for every row's women_cabinet_share. |
| SHR-2 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (raw wikitext) | 2026-09-23 | EIU Democracy Index 2025 category and score for each of the 26 rated nations here. The four microstates aren't listed. |
| SHR-3 | https://www.prnewswire.com/news-releases/eiu-democracy-index-2025-democracy-stabilises-after-eight-years-of-decline-302734863.html | 2026-09-23 | EIU press release of 2026-04-07 confirming the 2025 edition and France's return to "full democracy". |
| SHR-4 | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (raw wikitext) | 2026-09-23 | Current holder of both seats for all 30 nations, and which office the list treats as holding executive power. |

## DEU

| id | URL | opened | what it established |
|---|---|---|---|
| DEU-1 | https://www.bundeskanzler.de/bk-en | 2026-09-23 | Official site shows the current Federal Chancellor (M). |
| DEU-2 | https://en.wikipedia.org/wiki/Friedrich_Merz | 2026-09-23 | Chancellor born 1955-11-11 (age 70), in office since 2025-05-06. |
| DEU-3 | https://en.wikipedia.org/wiki/Merz_cabinet | 2026-09-23 | Coalition of CDU, CSU and SPD, formed 2025-05-06. |
| DEU-4 | https://www.bundespraesident.de/EN/Home/home_node.html | 2026-09-23 | Federal President in office (M). The term runs to March 2027, but that seat isn't the leader seat. |
| DEU-5 | https://en.wikipedia.org/wiki/Next_German_federal_election | 2026-09-23 | Bundestag election due on or before 2029-03-25 (deadline month used). |

## POL

| id | URL | opened | what it established |
|---|---|---|---|
| POL-1 | https://www.gov.pl/web/premier | 2026-09-23 | Official PM page names the current Prime Minister (M), with news dated 2026-09-22. |
| POL-2 | https://en.wikipedia.org/wiki/Donald_Tusk | 2026-09-23 | PM born 1957-04-22 (age 69), current term since 2023-12-13. |
| POL-3 | https://en.wikipedia.org/wiki/Third_Cabinet_of_Donald_Tusk | 2026-09-23 | Cabinet parties: Civic Coalition, Polish People's Party, New Left, Poland 2050 and the Centre group (2026). President (M) in office since 2025. |
| POL-4 | https://notesfrompoland.com/2026/02/18/polish-junior-ruling-party-splits-amid-fallout-from-leadership-election/ | 2026-09-23 | Dated 2026-02-18: about half of Poland 2050's MPs split off as "Centre" and stayed in the ruling coalition. |
| POL-5 | https://en.wikipedia.org/wiki/Next_Polish_parliamentary_election | 2026-09-23 | Sejm election due by 2027-11-11 (deadline month used). |

## ISL

| id | URL | opened | what it established |
|---|---|---|---|
| ISL-1 | https://www.government.is/ministries/prime-ministers-office/prime-minister/ | 2026-09-23 | Official page: the PM (F) took office in December 2024 and leads the Social Democratic Alliance, Liberal Reform Party and People's Party. |
| ISL-2 | https://en.wikipedia.org/wiki/Kristr%C3%BAn_Frostad%C3%B3ttir | 2026-09-23 | PM born 1988-05-12 (age 38), in office since 2024-12-21. |
| ISL-3 | https://en.wikipedia.org/wiki/Next_Icelandic_parliamentary_election | 2026-09-23 | Althing election due before 2028-11-30 (deadline month used). The President (F) comes from SHR-4. |

## GBR

| id | URL | opened | what it established |
|---|---|---|---|
| GBR-1 | https://www.gov.uk/government/ministers/prime-minister | 2026-09-23 | Official page: the current Prime Minister (M) took office on 2026-07-20. |
| GBR-2 | https://en.wikipedia.org/wiki/2026_Labour_Party_leadership_crisis | 2026-09-23 | The previous PM announced his resignation on 2026-06-22. The successor was elected Labour leader unopposed on 2026-07-17 and became PM on 2026-07-20. |
| GBR-3 | https://en.wikipedia.org/wiki/Andy_Burnham | 2026-09-23 | PM born 1970-01-07 (age 56). Entered the Commons at a by-election on 2026-06-18. |
| GBR-4 | https://en.wikipedia.org/wiki/Next_United_Kingdom_general_election | 2026-09-23 | General election due on or before 2029-08-15 (deadline month used). |

Note: the women share (50.0) is the cabinet as of 2026-01-01, before the July 2026 change of Prime Minister.

## FRA

| id | URL | opened | what it established |
|---|---|---|---|
| FRA-1 | https://www.elysee.fr/en/ | 2026-09-23 | Official site: the President (M), elected 2017, is at the 81st UN General Assembly (September 2026). |
| FRA-2 | https://en.wikipedia.org/wiki/Emmanuel_Macron | 2026-09-23 | President born 1977-12-21 (age 48), in office since 2017-05-14. |
| FRA-3 | https://fr.wikipedia.org/wiki/Gouvernement_Lecornu_II | 2026-09-23 | Government still in office. Parties: Renaissance, MoDem, Horizons and UDI (the EPR bloc), plus dissident Republicans and independents. Latest reshuffle 2026-09-22. |
| FRA-4 | https://www.parlons-politique.fr/actualite-nationale/budget-2027-le-compromis-entre-lecornu-et-les-socialistes-peut-il-eviter-une-nouvelle-crise-parlementaire_27678/ | 2026-09-23 | Dated 2026-09-23: the same Prime Minister (M) is negotiating the 2027 budget with the Socialists to avoid censure. |
| FRA-5 | https://en.wikipedia.org/wiki/2027_French_presidential_election | 2026-09-23 | Presidential election scheduled for April 2027. The incumbent is term-limited. |

Leader seat: the President holds executive power outside periods of cohabitation (SHR-4 marks the presidency).

## ITA

| id | URL | opened | what it established |
|---|---|---|---|
| ITA-1 | https://www.governo.it/it/i-governi-dal-1943-ad-oggi/xix-legislatura-dal-13-ottobre-2022/governo-meloni/20488 | 2026-09-23 | The page returned "not found", but the site's navigation names the current President of the Council (F). |
| ITA-2 | https://cyprus-mail.com/2026/09/16/italys-meloni-says-she-aims-to-remain-in-office-until-end-of-term | 2026-09-23 | Reuters copy dated 2026-09-16: the PM means to serve until the legislature ends in autumn 2027. Coalition of Brothers of Italy, League and Forza Italia. |
| ITA-3 | https://en.wikipedia.org/wiki/Meloni_government | 2026-09-23 | Government parties: Brothers of Italy, Lega, Forza Italia, Us Moderates. Formed 2022-10-22. |
| ITA-4 | https://en.wikipedia.org/wiki/Next_Italian_general_election | 2026-09-23 | General election due no later than 2027-12-22 (deadline month used). |
| ITA-5 | https://en.wikipedia.org/wiki/Giorgia_Meloni | 2026-09-23 | PM born 1977-01-15 (age 49). |

## ESP

| id | URL | opened | what it established |
|---|---|---|---|
| ESP-1 | https://www.lamoncloa.gob.es/presidente/Paginas/index.aspx | 2026-09-23 | Official site: the current President of the Government (M) is traveling to the 81st UN General Assembly "today". |
| ESP-2 | https://en.wikipedia.org/wiki/Next_Spanish_general_election | 2026-09-23 | No early election called. Due no later than 2027-08-22 (deadline month used). |
| ESP-3 | https://en.wikipedia.org/wiki/Third_government_of_Pedro_S%C3%A1nchez | 2026-09-23 | Coalition of PSOE and Sumar, formed 2023-11-21. |
| ESP-4 | https://en.wikipedia.org/wiki/Pedro_S%C3%A1nchez | 2026-09-23 | PM born 1972-02-29 (age 54), in office since 2018-06-02. |

## SWE

| id | URL | opened | what it established |
|---|---|---|---|
| SWE-1 | https://www.regeringen.se/ | 2026-09-23 | Official notice dated 2026-09-17: the PM asked to be dismissed, and the Speaker dismissed the PM and ministers. They stay on as a caretaker (övergångsregering) until a successor takes office. |
| SWE-2 | https://www.riksdagen.se/sv/aktuellt/aktuelltnotiser/2026/sep/18/talmannen-ger-sonderingsuppdrag-till-magdalena_cmse396c91a-ef46-4f54-88c6-10a144af63fcsv/ | 2026-09-23 | Riksdag notice of 2026-09-18: the Speaker gave the Social Democratic leader (F) the mandate to explore forming a government. |
| SWE-3 | https://www.aljazeera.com/news/2026/9/17/sweden-prime-minister-to-resign-as-left-wing-bloc-seals-narrow-election-win | 2026-09-23 | Dated 2026-09-17: the opposition bloc won 176 of 349 seats. The Riksdag can vote on a new PM from 2026-09-29 at the earliest. |
| SWE-4 | https://en.wikipedia.org/wiki/2026_Swedish_general_election | 2026-09-23 | Election held 2026-09-13; seat counts by party. The new PM is still to be decided. |
| SWE-5 | https://en.wikipedia.org/wiki/Ulf_Kristersson | 2026-09-23 | Caretaker PM born 1963-12-29 (age 62), in office since 2022-10-18 and caretaker since 2026-09-17. |

Contested row: it describes the caretaker incumbent. A new PM (F, born 1967, so 50-59) from a Social Democrat-led government of S, V, MP and C is likely after the Riksdag vote. That's why next_leader_selection is 2026-09. The women share (52.2) is the outgoing cabinet's.

## CHE

| id | URL | opened | what it established |
|---|---|---|---|
| CHE-1 | https://www.admin.ch/gov/en/start/federal-council/members-of-the-federal-council.html | 2026-09-23 | Official list: the 2026 President of the Confederation (M, SVP) and the seven Federal Councillors (2 SVP, 2 FDP, 2 SP, 1 Centre; two are women). |
| CHE-2 | https://en.wikipedia.org/wiki/Guy_Parmelin | 2026-09-23 | President born 1959-11-09 (age 66). Presidential term began 2026-01-01. |
| CHE-3 | https://www.admin.ch/gov/en/start/federal-council.html | 2026-09-23 | The presidency rotates yearly among the seven members. The Federal Assembly elects the 2027 President in December 2026. |

Leader seat: the collegial Federal Council is both head of state and head of government. The one-year President is primus inter pares and represents both seats, so the second seat is "same".

## HUN

| id | URL | opened | what it established |
|---|---|---|---|
| HUN-1 | https://www.aljazeera.com/news/2026/5/9/peter-magyar-sworn-in-as-hungarys-pm-ending-orbans-16-years-in-power | 2026-09-23 | Dated 2026-05-09: the new PM (M, 45) was sworn in after Tisza won 141 of 199 seats. |
| HUN-2 | https://www.keh.hu/ | 2026-09-23 | Office of the President: items dated 2026-09-21 and 2026-09-22 show the new President of the Republic (M) in office. |
| HUN-3 | https://en.wikipedia.org/wiki/Andr%C3%A1s_Baka | 2026-09-23 | President in office since 2026-08-19. The predecessor was removed by constitutional amendment, with an acting president in between. |
| HUN-4 | https://en.wikipedia.org/wiki/P%C3%A9ter_Magyar | 2026-09-23 | PM born 1981-03-16 (age 45), in office since 2026-05-09. |
| HUN-5 | https://en.wikipedia.org/wiki/Magyar_government | 2026-09-23 | Single-party Tisza government, formed 2026-05-13. |
| HUN-6 | https://en.wikipedia.org/wiki/2030_Hungarian_parliamentary_election | 2026-09-23 | Next parliamentary election in April or May 2030 (2030-04 used). |
| HUN-7 | https://en.wikipedia.org/wiki/2026_Hungarian_presidential_election | 2026-09-23 | President elected by the National Assembly on 2026-08-11; took office 2026-08-19. |

Note: the women share (0.0) is the previous government's cabinet as of 2026-01-01. The current government took office in May 2026 and hasn't been measured by the map.

## NLD

| id | URL | opened | what it established |
|---|---|---|---|
| NLD-1 | https://www.government.nl/latest/news/2026/02/23/jetten-government-sworn-in | 2026-09-23 | Official, dated 2026-02-23: new government of D66, VVD and CDA sworn in with 18 ministers and 10 state secretaries. |
| NLD-2 | https://en.wikipedia.org/wiki/Rob_Jetten | 2026-09-23 | PM (M) born 1987-03-25 (age 39), in office since 2026-02-23. |
| NLD-3 | https://en.wikipedia.org/wiki/Jetten_cabinet | 2026-09-23 | Minority cabinet of D66, VVD and CDA. |
| NLD-4 | https://en.wikipedia.org/wiki/Next_Dutch_general_election | 2026-09-23 | Next general election by May 2030. |

Note: the women share (28.6) is the outgoing caretaker cabinet as of 2026-01-01.

## BEL

| id | URL | opened | what it established |
|---|---|---|---|
| BEL-1 | https://en.wikipedia.org/wiki/De_Wever_government | 2026-09-23 | "Arizona" majority coalition of N-VA, MR, Les Engagés, Vooruit and CD&V. Formed 2025-02-03, not dissolved. |
| BEL-2 | https://en.wikipedia.org/wiki/Bart_De_Wever | 2026-09-23 | PM (M) born 1970-12-21 (age 55), in office since 2025-02-03. |
| BEL-3 | https://en.wikipedia.org/wiki/Elections_in_Belgium | 2026-09-23 | Chamber members serve five-year terms. The next federal election falls in June 2029, alongside the European election. |

Blocked official sources: premier.be returned 403 and belgium.be served a CAPTCHA, so neither was used. The row rests on BEL-1, BEL-2 and SHR-4.

## NOR

| id | URL | opened | what it established |
|---|---|---|---|
| NOR-1 | https://www.aljazeera.com/news/2026/8/28/norways-king-harald-v-dies-succeeded-by-son | 2026-09-23 | Dated 2026-08-28: the King died that day and the Crown Prince succeeded automatically as King (M). |
| NOR-2 | https://www.nrk.no/artikkel/store-viste-frem-sine-nye-statsrader-1527614 | 2026-09-23 | NRK report on the September 2026 reshuffle: the PM presented new ministers to the new King in council. The fetch summary labeled it 2025, but the text describes the new King, so it's from 2026. |
| NOR-3 | https://en.wikipedia.org/wiki/St%C3%B8re_cabinet | 2026-09-23 | Labour-only government (the Centre Party left in 2025). Reshuffled 2026-09-11. |
| NOR-4 | https://en.wikipedia.org/wiki/Jonas_Gahr_St%C3%B8re | 2026-09-23 | PM (M) born 1960-08-25 (age 66), in office since 2021-10-14. |
| NOR-5 | https://en.wikipedia.org/wiki/2029_Norwegian_parliamentary_election | 2026-09-23 | Next Storting election on 10 or 17 September 2029. |

Official sites regjeringen.no (403) and royalcourt.no / kongehuset.no (429) blocked automated access.

## IRL

| id | URL | opened | what it established |
|---|---|---|---|
| IRL-1 | https://en.wikipedia.org/wiki/Mich%C3%A9al_Martin | 2026-09-23 | Taoiseach (M) born 1960-08-16 (age 66), current term since 2025-01-23. |
| IRL-2 | https://en.wikipedia.org/wiki/Government_of_the_34th_D%C3%A1il | 2026-09-23 | Fianna Fáil and Fine Gael coalition. The agreement rotates the office of Taoiseach to the Fine Gael leader in November 2027 (2027-11 used). |
| IRL-3 | https://en.wikipedia.org/wiki/Next_Irish_general_election | 2026-09-23 | General election due no later than January 2030. |
| IRL-4 | https://www.vlada.gov.sk/ | 2026-09-23 | Slovak government news dated 2026-09-10 records a meeting with the sitting Irish Taoiseach, which confirms the incumbent is in office. |

The President (F) took office in November 2025 (SHR-4). gov.ie returned 403.

## DNK

| id | URL | opened | what it established |
|---|---|---|---|
| DNK-1 | https://www.stm.dk/statsministeren/ | 2026-09-23 | Official page: the PM (F) has been PM since 2019-06-27. |
| DNK-2 | https://www.stm.dk/regeringen/ | 2026-09-23 | Official page: the PM's third government took office on 2026-06-03. |
| DNK-3 | https://en.wikipedia.org/wiki/Frederiksen_III_Cabinet | 2026-09-23 | Minority coalition of Social Democrats, Green Left (SF), Moderates and Social Liberals, formed 2026-06-03 after the snap election of 2026-03-24. |
| DNK-4 | https://en.wikipedia.org/wiki/Mette_Frederiksen | 2026-09-23 | PM born 1977-11-19 (age 48). |
| DNK-5 | https://en.wikipedia.org/wiki/Next_Danish_general_election | 2026-09-23 | Next election due on or before 2030-03-23 (deadline month used). |

Note: the women share (33.3) is the previous (second) government's as of 2026-01-01.

## CZE

| id | URL | opened | what it established |
|---|---|---|---|
| CZE-1 | https://vlada.gov.cz/en/vlada/ | 2026-09-23 | Official list: the PM (M) and 15 members including the PM, two of them women. This matches the map's 2 of 14 ministers. |
| CZE-2 | https://en.wikipedia.org/wiki/Andrej_Babi%C5%A1 | 2026-09-23 | PM born 1954-09-02 (age 72), appointed 2025-12-09. Coalition with SPD and Motorists for Themselves (AUTO). |
| CZE-3 | https://en.wikipedia.org/wiki/Next_Czech_parliamentary_election | 2026-09-23 | Next election in or before October 2029. |

## SVK

| id | URL | opened | what it established |
|---|---|---|---|
| SVK-1 | https://www.vlada.gov.sk/ | 2026-09-23 | Official site: news dated 2026-09-10 and 2026-09-15 names the sitting Predseda vlády (M). |
| SVK-2 | https://en.wikipedia.org/wiki/Robert_Fico | 2026-09-23 | PM born 1964-09-15 (age 62). Current term since 2023. |
| SVK-3 | https://en.wikipedia.org/wiki/Fico%27s_Fourth_Cabinet | 2026-09-23 | Coalition of Smer-SD, Hlas-SD and SNS, formed 2023-10-25. Small allied groups sit with SNS. |
| SVK-4 | https://en.wikipedia.org/wiki/Next_Slovak_parliamentary_election | 2026-09-23 | Election due by 2027-09-28 (deadline month used). |

## SVN

| id | URL | opened | what it established |
|---|---|---|---|
| SVN-1 | https://www.gov.si/en/state-authorities/government/ | 2026-09-23 | Official site names the sitting Prime Minister (M), with an item dated 2026-07-23. |
| SVN-2 | https://en.wikipedia.org/wiki/16th_Government_of_Slovenia | 2026-09-23 | Minority coalition of SDS, NSi, SLS, FOKUS and Demokrati, formed 2026-06-04 with confidence-and-supply support. The coalition agreement was signed 2026-05-21. |
| SVN-3 | https://en.wikipedia.org/wiki/Janez_Jan%C5%A1a | 2026-09-23 | PM born 1958-09-17 (age 68). Current term since 2026 (elected in May, government formed 2026-06-04). |
| SVN-4 | https://en.wikipedia.org/wiki/Next_Slovenian_parliamentary_election | 2026-09-23 | Next election on or before 2030-03-22 (deadline month used). |

Note: the women share (36.8) is the previous government's as of 2026-01-01. The President (F) comes from SHR-4.

## EST

| id | URL | opened | what it established |
|---|---|---|---|
| EST-1 | https://www.valitsus.ee/en | 2026-09-23 | Official: the PM (M, born 1975-07-12, age 51) has served since 2024-07-23. Reform Party and Eesti 200 coalition agreement. News dated 2026-09-22. |
| EST-2 | https://news.err.ee/1610126071/estonia-elects-new-president | 2026-09-23 | Dated 2026-09-02: the Riigikogu elected a new President (F), to be sworn in 2026-10-12. The outgoing President (M) serves until then. |
| EST-3 | https://en.wikipedia.org/wiki/Kristen_Michal%27s_cabinet | 2026-09-23 | Cabinet of the Reform Party and Estonia 200. SDE was removed in 2025. |
| EST-4 | https://www.valimised.ee/en/riigikogu-elections-2027 | 2026-09-23 | Electoral office: the Riigikogu election takes place on 2027-03-07. |

The second seat changes to F on 2026-10-12.

## FIN

| id | URL | opened | what it established |
|---|---|---|---|
| FIN-1 | https://valtioneuvosto.fi/en/government | 2026-09-23 | Official site: the current government is still the one led by the sitting PM (M). |
| FIN-2 | https://en.wikipedia.org/wiki/Petteri_Orpo | 2026-09-23 | PM born 1969-11-03 (age 56), in office since 2023-06-20. |
| FIN-3 | https://en.wikipedia.org/wiki/Orpo_cabinet | 2026-09-23 | Coalition of the National Coalition Party, Finns Party, Swedish People's Party and Christian Democrats. |
| FIN-4 | https://en.wikipedia.org/wiki/2027_Finnish_parliamentary_election | 2026-09-23 | Parliamentary election on 2027-04-18. |

Leader seat: head_of_government, because the government holds general executive power. The President (M) leads foreign and security policy together with the government, so a US president would deal with both. SHR-4 also marks the PM.

## LVA

| id | URL | opened | what it established |
|---|---|---|---|
| LVA-1 | https://eng.lsm.lv/article/politics/politics/28.05.2026-new-latvian-government-approved-by-parliament.a649104/ | 2026-09-23 | Dated 2026-05-28: the Saeima approved a new government 66-25 under a United List PM (M). Coalition of United List, New Unity, National Alliance and ZZS. 2 of 15 ministers are women. |
| LVA-2 | https://en.wikipedia.org/wiki/Andris_Kulbergs | 2026-09-23 | PM born 1979-05-26 (age 47), in office since 2026-05-28. The predecessor resigned on 2026-05-14. |
| LVA-3 | https://en.wikipedia.org/wiki/Kulbergs_cabinet | 2026-09-23 | 43rd government, the same four parties. |
| LVA-4 | https://en.wikipedia.org/wiki/2026_Latvian_parliamentary_election | 2026-09-23 | Saeima election scheduled for 2026-10-03. |

Note: the map's women share (28.6) is the previous cabinet's. The current cabinet has 2 of 15 (13.3) per LVA-1. The leader may change again after the 2026-10-03 election.

## LTU

| id | URL | opened | what it established |
|---|---|---|---|
| LTU-1 | https://www.lrt.lt/en/news-in-english/19/2972052/lithuania-s-president-nominates-soci | 2026-09-23 | Dated 2026-06-26: the President nominated the Social Democratic leader (M) as PM. New coalition of LSDP, Democrats "For Lithuania" and the Farmers, Greens and Christian Families Union. |
| LTU-2 | https://www.lrt.lt/en/news-in-english/19/2990220/seimas-approves-sinkevicius-government-program-new-cabinet-sworn-in | 2026-09-23 | Dated 2026-07-14: programme approved 72-29 and cabinet sworn in. The three factions hold 75 of 141 seats. |
| LTU-3 | https://en.wikipedia.org/wiki/Mindaugas_Sinkevi%C4%8Dius | 2026-09-23 | PM born 1984-06-20 (age 42), in office since 2026-07-14. |
| LTU-4 | https://en.wikipedia.org/wiki/Sinkevi%C4%8Dius_Cabinet | 2026-09-23 | 21st cabinet, formed after the previous coalition collapsed (June 2026). Parties as in the TSV. |
| LTU-5 | https://en.wikipedia.org/wiki/2028_Lithuanian_parliamentary_election | 2026-09-23 | Seimas election on 2028-10-08. |

Note: the women share (35.7) is the previous cabinet's as of 2026-01-01.

## AUT

| id | URL | opened | what it established |
|---|---|---|---|
| AUT-1 | https://www.bundeskanzleramt.gv.at/en.html | 2026-09-23 | Official site names the sitting Bundeskanzler (M). |
| AUT-2 | https://en.wikipedia.org/wiki/Christian_Stocker | 2026-09-23 | Chancellor born 1960-03-20 (age 66), in office since 2025-03-03. |
| AUT-3 | https://en.wikipedia.org/wiki/Stocker_government | 2026-09-23 | Majority coalition of ÖVP, SPÖ and NEOS. |
| AUT-4 | https://en.wikipedia.org/wiki/Next_Austrian_legislative_election | 2026-09-23 | National Council election by 2029. The last one was September 2024 and the term is five years, so 2029-09 is used. |

## LIE

| id | URL | opened | what it established |
|---|---|---|---|
| LIE-1 | https://www.regierung.li/text/16608/mitglieder | 2026-09-23 | Official: the head of government (F) has served since 2025-04-11. Five-member government, two of them women. |
| LIE-2 | https://fuerstenhaus.li/en/the-monarchy/rights-and-duties-of-the-reigning-prince/ | 2026-09-23 | Princely House: the Reigning Prince appoints the government, can dissolve parliament, and must assent for any law to be valid. |
| LIE-3 | https://en.wikipedia.org/wiki/Alois,_Hereditary_Prince_of_Liechtenstein | 2026-09-23 | The Hereditary Prince (M, born 1968-06-11, age 58) has been regent since 2004 and exercises the Reigning Prince's powers. |
| LIE-4 | https://freedomhouse.org/country/liechtenstein/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 90/100 Free. It describes "a powerful monarchy with a parliamentary system" and scores A1 (chief national authority elected) at 2/4. |
| LIE-5 | https://en.wikipedia.org/wiki/Brigitte_Haas_cabinet | 2026-09-23 | Coalition of VU and FBP, sworn in 2025-04-10. The head of government (F) was born 1964-12-27. |

Leader seat is a judgment call. SHR-4 marks the Prince as the executive office, and Freedom House treats the monarch as the chief national authority, so the row uses head_of_state. Since 2004 the Reigning Prince (M, born 1945, age 80+, reigning since 1989) has delegated the exercise of his powers to the Hereditary Prince as regent, so the row records the regent's attributes. If the game should instead treat the elected head of government as leader, the swap is: Prime Minister, F, 60-69, since 2025, next selection 2029-02 (Landtag election).

## LUX

| id | URL | opened | what it established |
|---|---|---|---|
| LUX-1 | https://gouvernement.lu/en/gouvernement.html | 2026-09-23 | Official list: the PM (M) and 15 members. Five women by name (the fetch summary's "6" counted one person twice). |
| LUX-2 | https://monarchie.lu/en | 2026-09-23 | Grand Ducal site: the Grand Duke (M) spoke at the UN on 2026-09-22. |
| LUX-3 | https://en.wikipedia.org/wiki/Luc_Frieden | 2026-09-23 | PM born 1963-09-16 (age 63), in office since 2023-11-17. |
| LUX-4 | https://en.wikipedia.org/wiki/Frieden-Bettel_Government | 2026-09-23 | CSV and DP coalition, formed 2023-11-17. With a five-year term after the October 2023 election, the next election falls in October 2028. |

## MCO

| id | URL | opened | what it established |
|---|---|---|---|
| MCO-1 | https://www.gouv.mc/en/news/christophe-mirmand-appointed-minister-of-state-of-the-principality-of-monaco-as-of-21-july-2025 | 2026-09-23 | Official: the Sovereign Prince appointed the current Minister of State (M) by Sovereign Ordinance, effective 2025-07-21. |
| MCO-2 | https://freedomhouse.org/country/monaco/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 82/100 Free. "The prince appoints the government, which is responsible only to him." |
| MCO-3 | https://en.wikipedia.org/wiki/Albert_II_of_Monaco | 2026-09-23 | Sovereign Prince born 1958-03-14 (age 68), reigning since 2005. |
| MCO-4 | https://www.palais.mc/en/the-sovereign-prince/h-s-h-prince-albert-ii/biography.html | 2026-09-23 | Palace site confirms the current Sovereign Prince. |

Governing parties: the Council of Government is appointed by the Prince and is nonpartisan.

## PRT

| id | URL | opened | what it established |
|---|---|---|---|
| PRT-1 | https://www.presidencia.pt/presidente-da-republica/o-presidente/biografia/ | 2026-09-23 | Presidency: biography of the current President (M), updated 2026-03-09 (inauguration day). |
| PRT-2 | https://www.portugal.gov.pt/pt/gc25 | 2026-09-23 | Official site of the XXV Constitutional Government, which is in office and led by the Primeiro-Ministro. |
| PRT-3 | https://en.wikipedia.org/wiki/XXV_Constitutional_Government_of_Portugal | 2026-09-23 | PSD and CDS-PP government, formed 2025-06-05. |
| PRT-4 | https://en.wikipedia.org/wiki/Next_Portuguese_legislative_election | 2026-09-23 | Legislative election due on or before 2029-10-14 (deadline month used). |
| PRT-5 | https://en.wikipedia.org/wiki/Lu%C3%ADs_Montenegro | 2026-09-23 | PM (M) born 1973-02-16 (age 53), first took office 2024-04-02. |

## AND

| id | URL | opened | what it established |
|---|---|---|---|
| AND-1 | https://www.govern.ad/ca/govern/el-cap-del-govern | 2026-09-23 | Official page of the sitting Cap de Govern (Head of Government, M). |
| AND-2 | https://en.wikipedia.org/wiki/Xavier_Espot_Zamora | 2026-09-23 | Head of Government born 1979-10-30 (age 46), in office since 2019-05-16. |
| AND-3 | https://en.wikipedia.org/wiki/2027_Andorran_parliamentary_election | 2026-09-23 | Election due no later than 2027-06-05. The incumbent is term-limited. DA and CC hold 16 of 28 seats. |
| AND-4 | https://freedomhouse.org/country/andorra/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 93/100 Free. The EIU doesn't rate Andorra, so the row uses full_democracy. |
| AND-5 | https://en.wikipedia.org/wiki/Josep-Llu%C3%ADs_Serrano_Pentinat | 2026-09-23 | The Episcopal Co-Prince (M) has held office since 2025-05-31. The other Co-Prince is the French President (M). |

## SMR

| id | URL | opened | what it established |
|---|---|---|---|
| SMR-1 | https://www.congressodistato.sm/pub1/CongressoSM/Composizione-del-Congresso-di-Stato/Membri-del-Congresso-di-Stato.html | 2026-09-23 | Official list of the ten Secretaries of State, headed by the Secretary for Foreign and Political Affairs (M). |
| SMR-2 | https://en.wikipedia.org/wiki/San_Marino_Secretary_of_State_for_Foreign_and_Political_Affairs | 2026-09-23 | The office is "often regarded as the country's de facto head of government", and the incumbent has held it since 2020-01-08. |
| SMR-3 | https://en.wikipedia.org/wiki/Luca_Beccari | 2026-09-23 | Secretary born 1974-10-29 (age 51). Christian Democratic Party. |
| SMR-4 | https://www.sanmarinortv.sm/news/politica-c2/eletti-i-nuovi-capitani-reggenti-gerardo-giovagnoli-e-william-casali-a295919 | 2026-09-23 | Dated 2026-09-15: the Grand and General Council elected the next pair of Captains Regent (both M), who take office on 1 October. |
| SMR-5 | https://freedomhouse.org/country/san-marino/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 97/100 Free, a parliamentary democracy. The EIU doesn't rate San Marino, so the row uses full_democracy. |
| SMR-6 | https://en.wikipedia.org/wiki/Congress_of_State | 2026-09-23 | Post-2024 governing agreement of the PDCS, Libera–PS, PSD and Reformist Alliance. |
| SMR-7 | https://en.wikipedia.org/wiki/Elections_in_San_Marino | 2026-09-23 | The Grand and General Council serves five-year terms. After the June 2024 election, the next falls by mid-2029 (2029-06 used). |

The leader seat is a judgment call, and SHR-4 marks the Secretary of State as the executive office. The Captains Regent are a two-person head of state that rotates every six months. The pair serving until 2026-10-01 is one man and one woman, so second_seat_sex is "M;F". From 2026-10-01 it is "M;M" per SMR-4. Note: the map's women share (10.0, 1 of 10) is from 2026-01-01. The ten names on SMR-1 today appear to be all men, which I didn't confirm.

## MLT

| id | URL | opened | what it established |
|---|---|---|---|
| MLT-1 | https://www.aljazeera.com/news/2026/5/31/labour-triumphs-in-malta-election-preliminary-results-show | 2026-09-23 | Dated 2026-05-31: Labour won a fourth term in the snap election of 2026-05-30. The sitting PM (M, 48) continues. |
| MLT-2 | https://en.wikipedia.org/wiki/Robert_Abela | 2026-09-23 | PM born 1977-12-07 (age 48), in office since 2020-01-13. |
| MLT-3 | https://en.wikipedia.org/wiki/Elections_in_Malta | 2026-09-23 | The House of Representatives serves a five-year term. After May 2026, the next election is due by mid-2031 (2031-06 used). |

Note: the women share (12.5) is the pre-election cabinet as of 2026-01-01. The President (F) comes from SHR-4.
