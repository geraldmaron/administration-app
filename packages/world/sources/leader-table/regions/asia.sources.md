# Asia leader table: sources and notes

Companion to `asia.tsv` (30 rows: CHN, SGP, PRK, VNM, IDN, IND, PAK, BGD, AFG, KAZ, JPN, KOR, TWN, THA, PHL, MYS, KGZ, TJK, TKM, UZB, MNG, BTN, MDV, NPL, LKA, BRN, KHM, LAO, MMR, TLS). Every row was verified on 2026-09-23. No real person is named here; the table constrains attributes only.

## Method

- **Wikipedia pages** were read as wikitext through `https://en.wikipedia.org/w/index.php?title=<Title>&action=raw` on 2026-09-23. The canonical article URL is listed below. Infobox `term_start`/`term_end` and `birth_date` fields were used for tenure and age, then checked against a dated news report or an official site wherever the seat changed in 2025 or 2026.
- **Official sites** were fetched directly on 2026-09-23. A hit is recorded only where the page text named the incumbent with a 2026 date.
- **Age band** is the incumbent's age on 2026-09-23.
- **Party-states (CHN, PRK, VNM, LAO).** The person a foreign president deals with is the party General Secretary, who in all four also holds the state presidency. The seat is coded `head_of_state`, the title names both offices, and `leader_in_office_since` is the year the person became paramount (the party post), not the later state post.
- **`next_leader_selection`** is the constitutional or published date where one exists. Where only a deadline or a cycle exists, the month is an estimate, and the nation note says so.
- **`women_cabinet_share`** comes from the most recent edition that could be opened, IPU and UN Women "Women in politics: 2026" (data as at 1 January 2026). Several cabinets changed after that date (BGD, NPL, VNM, LAO, MNG, THA, JPN, KOR). The figure describes the cabinet in office on 1 January 2026, not today's.
- **`name_culture`** uses the repo's own mapping (`NATION_NAME_CULTURE` in `packages/world/src/dataset/people.ts` and `ROSTER_NAME_CULTURE` in `packages/world/src/dataset/name-cultures.ts`). Every one of the 30 ids already has a key there, and each key fits the political elite's naming tradition, so none needed a `none:` entry.

## Shared sources

| id | URL | opened | what it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index | 2026-09-23 | EIU Democracy Index 2025 (published 7 April 2026) regime category and score per country. The first score column is 2025; checked against the US row (7.65 in 2025, 7.85 in 2024). Maldives and Brunei are not covered by the index. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | Share of women among cabinet ministers who head ministries, as at 1 January 2026. "Information not available" for Afghanistan, North Korea and Myanmar. Taiwan is not covered (not a UN member). |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The prior edition (as at 1 January 2025). Consulted only to confirm the 2026 edition supersedes it; not used in the table. |
| REPO-NAMES | `packages/world/src/dataset/name-cultures.ts`, `packages/world/src/dataset/people.ts`, `packages/world/src/dataset/name-banks.ts` (local) | 2026-09-23 | The culture key each of the 30 ids already maps to. |

EIU-2025 and WIP-2026 are cited on every row except MDV and BRN, which carry no EIU score (see their notes).

## CHN (China)

| id | URL | opened | what it established |
|---|---|---|---|
| CHN-1 | https://en.wikipedia.org/wiki/Xi_Jinping | 2026-09-23 | Party General Secretary since November 2012, state President since March 2013, born 1953 (age 73). |
| CHN-2 | https://en.wikipedia.org/wiki/Li_Qiang | 2026-09-23 | Premier (head of government, male) since March 2023. |
| CHN-3 | https://english.www.gov.cn/ | 2026-09-23 | State Council site lists the same Premier and vice-premiers in September 2026. |

Notes: `one_party_state` (EIU 2025: authoritarian, 2.24). The next selection is the 21st Party Congress. The five-year cycle puts it in autumn 2027, but no date has been announced, so 2027-10 is an estimate. The state presidency follows at the National People's Congress around March 2028.

## SGP (Singapore)

| id | URL | opened | what it established |
|---|---|---|---|
| SGP-1 | https://en.wikipedia.org/wiki/Lawrence_Wong | 2026-09-23 | Prime Minister since 15 May 2024, born December 1972 (age 53). |
| SGP-2 | https://en.wikipedia.org/wiki/Tharman_Shanmugaratnam | 2026-09-23 | President (male) since September 2023. |
| SGP-3 | https://www.istana.gov.sg/ | 2026-09-23 | Official site names the same President as the 9th President. |
| SGP-4 | https://www.pmo.gov.sg/newsroom/pm-lawrence-wong-at-the-joint-press-conference-with-prime-minister-of-timor-leste-xanana-gusmao-july-2026/ | 2026-09-23 | PMO release dated July 2026 confirms the same Prime Minister in office. |
| SGP-5 | https://en.wikipedia.org/wiki/Next_Singaporean_general_election | 2026-09-23 | Next general election due by 5 December 2030 (coded 2030-12, a deadline). |

Notes: flawed democracy (EIU 2025: 6.18). The People's Action Party governs alone.

## PRK (North Korea)

| id | URL | opened | what it established |
|---|---|---|---|
| PRK-1 | https://en.wikipedia.org/wiki/Kim_Jong_Un | 2026-09-23 | Party General Secretary (party leader since April 2012; supreme leader from December 2011) and President of the State Affairs since 2016. Birth year officially 1984, disputed 1982 to 1984: age 42 to 44, 40-49 either way. |
| PRK-2 | https://en.wikipedia.org/wiki/15th_Supreme_People%27s_Assembly | 2026-09-23 | SPA elected 15 March 2026; at its first session on 22 March 2026 the leader was re-elected President of the State Affairs and the Premier was re-elected. The 9th Party Congress was held in February 2026. |
| PRK-3 | https://en.wikipedia.org/wiki/Pak_Thae-song | 2026-09-23 | Premier (male) since 29 December 2024. |

Notes: `one_party_state` (EIU 2025: authoritarian, 1.08). The Workers' Party of Korea leads a front with two nominal allied parties. No women's cabinet figure (WIP-2026: information not available). No selection is scheduled that could replace the leader.

## VNM (Vietnam)

| id | URL | opened | what it established |
|---|---|---|---|
| VNM-1 | https://en.wikipedia.org/wiki/T%C3%B4_L%C3%A2m | 2026-09-23 | General Secretary since August 2024 (acting from July 2024), born July 1957 (age 69). |
| VNM-2 | https://en.wikipedia.org/wiki/Government_of_L%C3%AA_Minh_H%C6%B0ng | 2026-09-23 | Government formed 7 April 2026. Lists the head of state as "General Secretary and State President" and the Communist Party of Vietnam as sole party. |
| VNM-3 | https://gulfnews.com/world/asia/vietnam-parliament-elects-party-chief-to-lam-as-president-1.500498408 | 2026-09-23 | Dated 7 April 2026: the National Assembly unanimously elected the party chief State President for 2026-2031. He had been re-elected General Secretary in January 2026. |
| VNM-4 | https://en.wikipedia.org/wiki/L%C3%AA_Minh_H%C6%B0ng | 2026-09-23 | New Prime Minister (male) since 7 April 2026. |

Notes: `one_party_state` (EIU 2025: authoritarian, 2.62). The women's share of 7.1% predates the April 2026 government. The next selection is the 15th Party Congress, expected around January 2031 (estimate).

## IDN (Indonesia)

| id | URL | opened | what it established |
|---|---|---|---|
| IDN-1 | https://en.wikipedia.org/wiki/Prabowo_Subianto | 2026-09-23 | President since 20 October 2024, born October 1951 (age 74). The President is both head of state and head of government. |
| IDN-2 | https://en.wikipedia.org/wiki/Red_and_White_Cabinet | 2026-09-23 | Cabinet parties in the Advanced Indonesia Coalition Plus: Gerindra, Golkar, National Awakening Party, National Mandate Party and Democratic Party (348 of 580 seats), plus smaller extra-parliamentary parties. |
| IDN-3 | https://en.wikipedia.org/wiki/Elections_in_Indonesia | 2026-09-23 | Five-year cycle; the current DPR term runs 2024 to 2029. |

Notes: flawed democracy (EIU 2025: 6.37). Next national election is in 2029. The month (2029-02) is an estimate from the February 2024 cycle; no date has been fixed.

## IND (India)

| id | URL | opened | what it established |
|---|---|---|---|
| IND-1 | https://en.wikipedia.org/wiki/Narendra_Modi | 2026-09-23 | Prime Minister since 26 May 2014, born 17 September 1950 (age 76). |
| IND-2 | https://en.wikipedia.org/wiki/Droupadi_Murmu | 2026-09-23 | President (female) since July 2022. |
| IND-3 | https://www.pmindia.gov.in/en/ | 2026-09-23 | PM's office site carries items dated 23 September 2026 from the same Prime Minister. |
| IND-4 | https://en.wikipedia.org/wiki/Third_Modi_ministry | 2026-09-23 | National Democratic Alliance cabinet parties: BJP, TDP, JD(U), LJP(RV), JD(S) and smaller allies. |
| IND-5 | https://en.wikipedia.org/wiki/Next_Indian_general_election | 2026-09-23 | Next Lok Sabha election due by May/June 2029 (coded 2029-05). |

Notes: flawed democracy (EIU 2025: 6.96).

## PAK (Pakistan)

| id | URL | opened | what it established |
|---|---|---|---|
| PAK-1 | https://en.wikipedia.org/wiki/Shehbaz_Sharif | 2026-09-23 | Prime Minister since 4 March 2024 (an earlier term ran 2022 to 2023), born 23 September 1951 (75 today). |
| PAK-2 | https://en.wikipedia.org/wiki/Asif_Ali_Zardari | 2026-09-23 | President (male) since March 2024. |
| PAK-3 | https://www.pmo.gov.pk/ | 2026-09-23 | PM's office site shows the same Prime Minister at the SCO summit in Bishkek on 1 September 2026. |
| PAK-4 | https://en.wikipedia.org/wiki/Second_Shehbaz_Sharif_government | 2026-09-23 | Governing coalition: PML(N) and PPP, with MQM-P, PML(Q), IPP, BAP and smaller parties. |
| PAK-5 | https://en.wikipedia.org/wiki/Next_Pakistani_general_election | 2026-09-23 | Next general election expected by 28 February 2029. |
| PAK-6 | https://en.wikipedia.org/wiki/Asim_Munir | 2026-09-23 | The army chief is a Field Marshal and now also Chief of Defence Forces, received separately by the US president in 2025. |

Notes: the constitutional executive is the Prime Minister, so the seat is `head_of_government`. The army chief (PAK-6) holds power a foreign government also deals with directly, so the seat is flagged as uncertain. EIU 2025 classes Pakistan authoritarian (2.44).

## BGD (Bangladesh)

| id | URL | opened | what it established |
|---|---|---|---|
| BGD-1 | https://en.wikipedia.org/wiki/Tarique_Rahman | 2026-09-23 | Prime Minister since 17 February 2026. Birth date given as 20 November 1968, citing the Jatiya Sangsad member profile and a Bangladesh Pratidin biography. |
| BGD-2 | https://www.dawn.com/news/1973874 | 2026-09-23 | Dated 17 February 2026 (wire report): sworn in after the 12 February election. The BNP coalition won 212 seats. The report gives his age as 60. |
| BGD-3 | https://www.aljazeera.com/news/2026/8/20/bangladesh-elects-ruling-party-veteran-alamgir-as-president | 2026-09-23 | Dated 20 August 2026: parliament elected a 78-year-old BNP veteran (male) President, 255 to 88. The previous President resigned on 24 July 2026. |
| BGD-4 | https://en.wikipedia.org/wiki/Mirza_Fakhrul_Islam_Alamgir | 2026-09-23 | New President in office from 21 August 2026. |
| BGD-5 | https://en.wikipedia.org/wiki/2026_Bangladeshi_general_election | 2026-09-23 | Election held 12 February 2026. The next is due at the end of the five-year term (coded 2031-02, an estimate). |

Notes: hybrid regime (EIU 2025: 4.27). The age band is uncertain. The parliament-cited 1968 birth date gives 57 (50-59); wire reports and Britannica use 1965, which gives 60 (60-69). The table uses the official record. The women's share of 19.0% is the interim government's on 1 January 2026, not the BNP cabinet's.

## AFG (Afghanistan)

| id | URL | opened | what it established |
|---|---|---|---|
| AFG-1 | https://en.wikipedia.org/wiki/Hibatullah_Akhundzada | 2026-09-23 | Supreme Leader of Afghanistan since 15 August 2021 (Taliban leader since 2016). Birth date 19 October 1967 per Taliban sources and the ICC; other estimates run from 1959 to 1961. |
| AFG-2 | https://en.wikipedia.org/wiki/Hasan_Akhund | 2026-09-23 | Prime Minister (male), acting from September 2021 and substantive from 15 August 2025. |

Notes: coded `theocracy` because the Islamic Emirate's form demands it (EIU 2025: authoritarian, 0.25). Parties are not permitted. Age band 50-59 follows the 1967 date; the older estimates give 60-69, so the band is uncertain. No women's figure (WIP-2026: information not available; the cabinet has no women). No selection is scheduled.

## KAZ (Kazakhstan)

| id | URL | opened | what it established |
|---|---|---|---|
| KAZ-1 | https://en.wikipedia.org/wiki/Kassym-Jomart_Tokayev | 2026-09-23 | President since 20 March 2019, born May 1953 (age 73). |
| KAZ-2 | https://en.wikipedia.org/wiki/Oljas_Bektenov | 2026-09-23 | Prime Minister (male) since February 2024; briefly acting 28 to 31 August 2026 during the handover to the new parliament. |
| KAZ-3 | https://timesca.com/kazakhstan-vice-president-prime-minister-approved/ | 2026-09-23 | Dated 31 August 2026: the new Kurultai approved the Prime Minister (137 votes) and a new Vice President. Adilet won 110 of 145 seats. |
| KAZ-4 | https://www.akorda.kz/en | 2026-09-23 | Presidential site shows the same President acting on 16 to 22 September 2026. |
| KAZ-5 | https://en.wikipedia.org/wiki/2026_Kazakh_constitutional_referendum | 2026-09-23 | New constitution adopted 15 March 2026, in force 1 July 2026. It creates a unicameral Kurultai and a Vice President. The President's current term ends in 2029, and a July 2026 Constitutional Court ruling lets him run again. |
| KAZ-6 | https://en.wikipedia.org/wiki/2026_Kazakh_legislative_election | 2026-09-23 | Kurultai election held 23 August 2026. Adilet, the pro-presidential successor to Amanat, won 71.2%. |
| KAZ-7 | https://en.wikipedia.org/wiki/Erlan_Karin | 2026-09-23 | Vice President (male) since 31 August 2026. The second-seat column still carries the Prime Minister, as head of government. |

Notes: authoritarian (EIU 2025: 2.91). Next presidential election at the end of the seven-year term that began in November 2022 (2029-11, an estimate).

## JPN (Japan)

| id | URL | opened | what it established |
|---|---|---|---|
| JPN-1 | https://en.wikipedia.org/wiki/Sanae_Takaichi | 2026-09-23 | Prime Minister since 21 October 2025 and LDP president since 4 October 2025. Female, born March 1961 (age 65). |
| JPN-2 | https://en.wikipedia.org/wiki/Second_Takaichi_cabinet | 2026-09-23 | Cabinet formed 18 February 2026. Parties: LDP and Japan Innovation Party. JIP ministers joined the cabinet itself for the first time at the 17 September 2026 reshuffle. |
| JPN-3 | https://en.wikipedia.org/wiki/2026_Japanese_general_election | 2026-09-23 | Snap election on 8 February 2026: the LDP won 316 of 465 seats. |
| JPN-4 | https://japantoday.com/category/politics/Takaichi's-cabinet-reshuffle-fires-starting-gun-for-ruling-LDP-leadership-race | 2026-09-23 | Dated 18 September 2026: her LDP presidency runs through September 2027 (the rest of her predecessor's term), so the next leadership race is autumn 2027. |
| JPN-5 | https://japan.kantei.go.jp/ | 2026-09-23 | Kantei site shows the same Prime Minister addressing the UN General Assembly on 22 September 2026. |
| JPN-6 | https://en.wikipedia.org/wiki/Naruhito | 2026-09-23 | Emperor (male), head of state. |

Notes: full democracy (EIU 2025: 8.85). The women's share of 15.8% is the first cabinet's on 1 January 2026.

## KOR (South Korea)

| id | URL | opened | what it established |
|---|---|---|---|
| KOR-1 | https://en.wikipedia.org/wiki/Lee_Jae_Myung | 2026-09-23 | President since 4 June 2025, born around December 1963 (age 62). |
| KOR-2 | https://en.wikipedia.org/wiki/Han_Seong-sook | 2026-09-23 | Prime Minister (female, independent) since 1 July 2026. |
| KOR-3 | https://www.koreatimes.co.kr/southkorea/politics/20260607/smes-minister-han-seong-sook-tapped-as-new-pm | 2026-09-23 | Dated 7 June 2026: the President named the SMEs minister, a former Naver chief executive, as the next Prime Minister. |
| KOR-4 | https://en.wikipedia.org/wiki/Kim_Min-seok_(politician) | 2026-09-23 | The previous Prime Minister's term ended 30 June 2026. |
| KOR-5 | https://en.wikipedia.org/wiki/2030_South_Korean_presidential_election | 2026-09-23 | Next presidential election scheduled for 27 March 2030. |

Notes: flawed democracy (EIU 2025: 7.75). The Democratic Party of Korea governs. The women's share of 22.2% predates the new Prime Minister.

## TWN (Taiwan)

| id | URL | opened | what it established |
|---|---|---|---|
| TWN-1 | https://en.wikipedia.org/wiki/Lai_Ching-te | 2026-09-23 | President since 20 May 2024, born October 1959 (age 66). |
| TWN-2 | https://en.wikipedia.org/wiki/Cho_Jung-tai | 2026-09-23 | Premier (President of the Executive Yuan, male) since 20 May 2024. |
| TWN-3 | https://english.president.gov.tw/ | 2026-09-23 | Presidential office site shows the same President at a 2026 forum. |
| TWN-4 | https://en.wikipedia.org/wiki/2028_Taiwanese_presidential_election | 2026-09-23 | Next presidential election in 2028, inauguration on 20 May 2028. The date is TBD; 2028-01 is an estimate from the January cycle. |

Notes: full democracy (EIU 2025: 8.78). The Democratic Progressive Party holds the executive. Taiwan is not in the UN Women map, so the women's share is blank.

## THA (Thailand)

| id | URL | opened | what it established |
|---|---|---|---|
| THA-1 | https://en.wikipedia.org/wiki/Anutin_Charnvirakul | 2026-09-23 | Prime Minister since 7 September 2025, born 13 September 1966 (age 60). |
| THA-2 | https://en.wikipedia.org/wiki/2026_Thai_general_election | 2026-09-23 | Election held 8 February 2026; Bhumjaithai came first. The House re-elected the Prime Minister on 19 March 2026 with 293 votes, and the second cabinet was sworn in on 30 March 2026. The coalition is Bhumjaithai, Pheu Thai, Prachachat, Palang Pracharath and small parties. |
| THA-3 | https://en.wikipedia.org/wiki/Vajiralongkorn | 2026-09-23 | King (male), head of state. |

Notes: flawed democracy (EIU 2025: 6.59). The House term is four years from February 2026, so the next election is due around early 2030 (2030-03, an estimate). The women's share of 21.1% predates the March 2026 cabinet.

## PHL (Philippines)

| id | URL | opened | what it established |
|---|---|---|---|
| PHL-1 | https://en.wikipedia.org/wiki/Bongbong_Marcos | 2026-09-23 | President since 30 June 2022, born 13 September 1957 (age 69). The President is both head of state and head of government. |
| PHL-2 | https://en.wikipedia.org/wiki/Alyansa_para_sa_Bagong_Pilipinas | 2026-09-23 | The administration's alliance: PFP, Lakas-CMD, NPC, Nacionalista, NUP. The electoral vehicle was formally dissolved on 30 June 2025, but the member parties remain the administration's bloc. |
| PHL-3 | https://en.wikipedia.org/wiki/2028_Philippine_presidential_election | 2026-09-23 | Next presidential election on 8 May 2028. |

Notes: flawed democracy (EIU 2025: 6.31). Parties are loose and personal, so the party list names the presidential bloc rather than a formal coalition.

## MYS (Malaysia)

| id | URL | opened | what it established |
|---|---|---|---|
| MYS-1 | https://en.wikipedia.org/wiki/Anwar_Ibrahim | 2026-09-23 | Prime Minister since 24 November 2022, born August 1947 (age 79). |
| MYS-2 | https://en.wikipedia.org/wiki/Ibrahim_Iskandar_of_Johor | 2026-09-23 | Yang di-Pertuan Agong (male), head of state. |
| MYS-3 | https://www.pmo.gov.my/ | 2026-09-23 | PM's office site shows the same Prime Minister, with a recent item on a new cabinet line-up. |
| MYS-4 | https://en.wikipedia.org/wiki/Anwar_Ibrahim_cabinet | 2026-09-23 | Unity government of Pakatan Harapan, Barisan Nasional, Gabungan Parti Sarawak and Gabungan Rakyat Sabah, plus minor parties. Perikatan Nasional is in opposition. |
| MYS-5 | https://en.wikipedia.org/wiki/Next_Malaysian_general_election | 2026-09-23 | Parliament dissolves automatically in December 2027, so the latest polling date is February 2028. |
| MYS-6 | https://presidency.gov.mv/ | 2026-09-23 | The Maldives presidency records a state luncheon for Malaysia's Prime Minister on 22 September 2026, which confirms he is in office today. |

Notes: flawed democracy (EIU 2025: 7.11). Coded 2028-02 as the deadline. Coalition partners are pressing for an early GE16, but none has been called.

## KGZ (Kyrgyzstan)

| id | URL | opened | what it established |
|---|---|---|---|
| KGZ-1 | https://en.wikipedia.org/wiki/Sadyr_Japarov | 2026-09-23 | President since 28 January 2021, born December 1968 (age 57). |
| KGZ-2 | https://en.wikipedia.org/wiki/Adylbek_Kasymaliev | 2026-09-23 | Chairman of the Cabinet of Ministers (male) since 18 December 2024. |
| KGZ-3 | https://timesca.com/kyrgyzstan-moves-2027-presidential-election-to-january-27/ | 2026-09-23 | Dated 30 July 2026: presidential election moved to Wednesday, 27 January 2027. |
| KGZ-4 | https://en.wikipedia.org/wiki/2027_Kyrgyz_presidential_election | 2026-09-23 | Election on 27 January 2027. A February 2026 constitutional ruling lets the incumbent seek a second term. |
| KGZ-5 | https://en.wikipedia.org/wiki/2025_Kyrgyz_parliamentary_election | 2026-09-23 | Snap election on 30 November 2025. Independents loyal to the President won 84 of 90 seats. |
| KGZ-6 | https://en.kabar.kg/ | 2026-09-23 | State news agency reports the same Cabinet chairman travelling to China on 23 September 2026. |

Notes: authoritarian (EIU 2025: 3.27). The governing bloc is non-party, so it is coded `none (nonpartisan)`.

## TJK (Tajikistan)

| id | URL | opened | what it established |
|---|---|---|---|
| TJK-1 | https://en.wikipedia.org/wiki/Emomali_Rahmon | 2026-09-23 | Head of state since November 1992 (President since November 1994), born October 1952 (age 73). Leads the People's Democratic Party. |
| TJK-2 | https://en.wikipedia.org/wiki/Qohir_Rasulzoda | 2026-09-23 | Prime Minister (male) since November 2013; no end date recorded. |
| TJK-3 | https://en.wikipedia.org/wiki/2027_Tajik_presidential_election | 2026-09-23 | Next presidential election by October 2027. |

Notes: authoritarian (EIU 2025: 1.94). `leader_in_office_since` is 1992, when he became head of state as chairman of the Supreme Council. The Prime Minister is confirmed only by Wikipedia; the official news agency site did not render.

## TKM (Turkmenistan)

| id | URL | opened | what it established |
|---|---|---|---|
| TKM-1 | https://en.wikipedia.org/wiki/Serdar_Berdimuhamedow | 2026-09-23 | President since 19 March 2022, born 22 September 1981 (45 as of yesterday). |
| TKM-2 | https://en.wikipedia.org/wiki/Gurbanguly_Berdimuhamedow | 2026-09-23 | The previous President, the incumbent's father, has chaired the People's Council (Halk Maslahaty) since 2021, now the supreme representative body. |
| TKM-3 | https://en.wikipedia.org/wiki/President_of_Turkmenistan | 2026-09-23 | The President is head of state and head of government, on a seven-year term. |
| TKM-4 | https://tdh.gov.tm/en | 2026-09-23 | State news agency shows the same President holding a working meeting in September 2026. |

Notes: authoritarian (EIU 2025: 1.54). The second seat is `same` because the President chairs the Cabinet. Power is widely described as shared with the father as People's Council chairman, so the seat is flagged as uncertain. Next presidential election is seven years after March 2022 (2029-03, an estimate).

## UZB (Uzbekistan)

| id | URL | opened | what it established |
|---|---|---|---|
| UZB-1 | https://en.wikipedia.org/wiki/Shavkat_Mirziyoyev | 2026-09-23 | President since December 2016 (acting from September 2016), born July 1957 (age 69). |
| UZB-2 | https://en.wikipedia.org/wiki/Abdulla_Aripov | 2026-09-23 | Prime Minister (male) since December 2016; Liberal Democratic Party. |
| UZB-3 | https://president.uz/en | 2026-09-23 | Presidential site carries items dated 23 September 2026 from the same President. |
| UZB-4 | https://en.wikipedia.org/wiki/2023_Uzbek_presidential_election | 2026-09-23 | Last election 9 July 2023 for a seven-year term, so the next is due around July 2030 (an estimate). |

Notes: authoritarian (EIU 2025: 2.10). The Prime Minister is confirmed only by Wikipedia.

## MNG (Mongolia)

| id | URL | opened | what it established |
|---|---|---|---|
| MNG-1 | https://en.wikipedia.org/wiki/Nyam-Osoryn_Uchral | 2026-09-23 | Prime Minister since 30 March 2026, after his predecessor resigned on 27 March 2026. Born 2 January 1987 (age 39). He also chairs the Mongolian People's Party. |
| MNG-2 | https://en.wikipedia.org/wiki/Cabinet_of_Nyam-Osoryn_Uchral | 2026-09-23 | Cabinet formed 4 April 2026: MPP, HUN Party and National Coalition, with 79 of 126 seats. |
| MNG-3 | https://en.wikipedia.org/wiki/Ukhnaagiin_Kh%C3%BCrels%C3%BCkh | 2026-09-23 | President (male) since June 2021. |
| MNG-4 | https://en.wikipedia.org/wiki/Prime_Minister_of_Mongolia | 2026-09-23 | Incumbent listed since 30 March 2026. |
| MNG-5 | https://en.wikipedia.org/wiki/2024_Mongolian_parliamentary_election | 2026-09-23 | Last parliamentary election 28 June 2024; the next is in 2028 (2028-06 follows the June cycle). |
| MNG-6 | https://montsame.mn/en | 2026-09-23 | State news agency shows the same Prime Minister active on 22 and 23 September 2026. |

Notes: flawed democracy (EIU 2025: 6.50). Executive power sits with the Prime Minister, so the seat is `head_of_government`. He is the third Prime Minister within a year. The presidential election in 2027 does not choose the Prime Minister.

## BTN (Bhutan)

| id | URL | opened | what it established |
|---|---|---|---|
| BTN-1 | https://en.wikipedia.org/wiki/Tshering_Tobgay | 2026-09-23 | Prime Minister since 28 January 2024 (an earlier term ran 2013 to 2018), born September 1965 (age 61). |
| BTN-2 | https://en.wikipedia.org/wiki/Jigme_Khesar_Namgyel_Wangchuck | 2026-09-23 | Druk Gyalpo (King, male), head of state. |
| BTN-3 | https://en.wikipedia.org/wiki/2023%E2%80%9324_Bhutanese_National_Assembly_election | 2026-09-23 | People's Democratic Party won the 2023-24 election (rounds on 30 November 2023 and 9 January 2024). The next election is listed as 2028. |
| BTN-4 | https://en.wikipedia.org/wiki/Elections_in_Bhutan | 2026-09-23 | National Assembly elected every five years in primary and general rounds. |

Notes: hybrid regime (EIU 2025: 5.65). The seat is `head_of_government` because the constitution vests executive power in the cabinet under the Prime Minister. The King keeps wide reserve influence. 2028-11 is an estimate for the primary round.

## MDV (Maldives)

| id | URL | opened | what it established |
|---|---|---|---|
| MDV-1 | https://en.wikipedia.org/wiki/Mohamed_Muizzu | 2026-09-23 | President since 17 November 2023, born June 1978 (age 48). |
| MDV-2 | https://presidency.gov.mv/ | 2026-09-23 | President's Office site names the same President, with press items dated 22 September 2026. |
| MDV-3 | https://en.wikipedia.org/wiki/2028_Maldivian_presidential_election | 2026-09-23 | Next presidential election in September 2028. A 4 April 2026 referendum to hold it together with the parliamentary election was rejected (about 69% no). |
| MDV-4 | https://freedomhouse.org/country/maldives/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026: Partly Free, 41/100 (43 the year before). |

Notes: the EIU does not score the Maldives. `hybrid_regime` is mapped from Freedom House "Partly Free". The People's National Congress holds a parliamentary supermajority. EIU-2025 is not cited on this row.

## NPL (Nepal)

| id | URL | opened | what it established |
|---|---|---|---|
| NPL-1 | https://en.wikipedia.org/wiki/Balen_Shah | 2026-09-23 | Prime Minister since 27 March 2026, born April 1990 (age 36). |
| NPL-2 | https://www.aljazeera.com/news/2026/3/27/nepals-youngest-premier-sworn-in-after-releasing-new-rap-song-about-unity | 2026-09-23 | Dated 27 March 2026: sworn in after the Rastriya Swatantra Party won 182 of 275 seats on 5 March 2026, enough to govern alone. |
| NPL-3 | https://en.wikipedia.org/wiki/Ram_Chandra_Paudel | 2026-09-23 | President (male) since March 2023. |
| NPL-4 | https://en.wikipedia.org/wiki/2026_Nepalese_general_election | 2026-09-23 | Election held 5 March 2026, the first after the September 2025 protests. The next is due at the end of the five-year term (2031-03, an estimate). |

Notes: hybrid regime (EIU 2025: 4.01). The women's share of 21.4% is the interim government's on 1 January 2026.

## LKA (Sri Lanka)

| id | URL | opened | what it established |
|---|---|---|---|
| LKA-1 | https://en.wikipedia.org/wiki/Anura_Kumara_Dissanayake | 2026-09-23 | Executive President since 23 September 2024, born November 1968 (age 57). |
| LKA-2 | https://en.wikipedia.org/wiki/Harini_Amarasuriya | 2026-09-23 | Prime Minister (female) since 24 September 2024; no end date recorded. |
| LKA-3 | https://en.wikipedia.org/wiki/2024_Sri_Lankan_presidential_election | 2026-09-23 | Last presidential election 21 September 2024. |

Notes: flawed democracy (EIU 2025: 6.57). The National People's Power governs. The five-year term ends in September 2029, and the vote falls one to two months before expiry, so 2029-08 is an estimate.

## BRN (Brunei)

| id | URL | opened | what it established |
|---|---|---|---|
| BRN-1 | https://en.wikipedia.org/wiki/Hassanal_Bolkiah | 2026-09-23 | Sultan since 1967 and also Prime Minister, born July 1946 (age 80). |
| BRN-2 | https://www.pmo.gov.bn/ | 2026-09-23 | PM's Office site carries a royal address dated 23 September 2026. |
| BRN-3 | https://freedomhouse.org/country/brunei/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026: Not Free, 27/100. |

Notes: `absolute_monarchy` by form; the EIU does not score Brunei. The one office holds both seats. There is no elected legislature, so the parties line reads `none (nonpartisan)` and no selection is scheduled.

## KHM (Cambodia)

| id | URL | opened | what it established |
|---|---|---|---|
| KHM-1 | https://en.wikipedia.org/wiki/Hun_Manet | 2026-09-23 | Prime Minister since 22 August 2023, born October 1977 (age 48). |
| KHM-2 | https://en.wikipedia.org/wiki/Norodom_Sihamoni | 2026-09-23 | King (male), head of state. |
| KHM-3 | https://pressocm.gov.kh/en | 2026-09-23 | Government press unit posts the same Prime Minister's remarks on 16 and 17 September 2026. |
| KHM-4 | https://en.wikipedia.org/wiki/2023_Cambodian_general_election | 2026-09-23 | Last election 23 July 2023; the next is in 2028 (2028-07 follows the July cycle). |

Notes: authoritarian (EIU 2025: 2.70). The Cambodian People's Party governs. The previous Prime Minister, the incumbent's father, remains Senate President and party president.

## LAO (Laos)

| id | URL | opened | what it established |
|---|---|---|---|
| LAO-1 | https://en.wikipedia.org/wiki/Thongloun_Sisoulith | 2026-09-23 | General Secretary since January 2021 (re-elected 8 January 2026) and President since March 2021. Born November 1945 (age 80). |
| LAO-2 | https://www.thestar.com.my/aseanplus/aseanplus-news/2026/03/23/lao-assembly-elects-sisoulith-president-siphandone-pm | 2026-09-23 | Dated 23 March 2026: the 10th National Assembly re-elected the General Secretary as President and re-elected the Prime Minister. |
| LAO-3 | https://en.wikipedia.org/wiki/Sonexay_Siphandone | 2026-09-23 | Prime Minister (male) since 30 December 2022. |

Notes: `one_party_state` (EIU 2025: authoritarian, 1.71). The next selection is the 13th Party Congress, expected around January 2031 (an estimate).

## MMR (Myanmar)

| id | URL | opened | what it established |
|---|---|---|---|
| MMR-1 | https://en.wikipedia.org/wiki/Min_Aung_Hlaing | 2026-09-23 | President since 10 April 2026 (acting from 7 August 2025). Before that he chaired the junta's ruling council from 2 February 2021. Born July 1956 (age 70). |
| MMR-2 | https://www.aljazeera.com/news/2026/4/10/myanmars-coup-leader-min-aung-hlaing-sworn-in-as-president | 2026-09-23 | Dated 10 April 2026: the coup leader was sworn in as President. The military-backed USDP won over 80% of contested seats, and the armed forces hold a further quarter of seats unelected. |
| MMR-3 | https://en.wikipedia.org/wiki/Second_Min_Aung_Hlaing_cabinet | 2026-09-23 | USDP-led cabinet. The two Vice Presidents are one man and one woman. |
| MMR-4 | https://en.wikipedia.org/wiki/2025%E2%80%9326_Myanmar_general_election | 2026-09-23 | Phased election on 28 December 2025, 11 January 2026 and 25 January 2026. |

Notes: coded `authoritarian` (EIU 2025: 0.96) because the junta was formally dissolved and replaced by a parliament-elected presidency. `military_junta` is a defensible alternative, since the same commander rules and the military keeps a quarter of parliament; the row is flagged. `leader_in_office_since` is 2021, when he took power, not 2026. Under the 2008 constitution the President is head of state and head of government, so the second seat is `same`. The next selection (2031-03) estimates the new parliament's presidential vote at the end of the five-year term. No women's figure (WIP-2026: information not available).

## TLS (Timor-Leste)

| id | URL | opened | what it established |
|---|---|---|---|
| TLS-1 | https://en.wikipedia.org/wiki/Xanana_Gusm%C3%A3o | 2026-09-23 | Prime Minister since 1 July 2023 (an earlier term ran 2007 to 2015), born June 1946 (age 80). |
| TLS-2 | https://en.wikipedia.org/wiki/Jos%C3%A9_Ramos-Horta | 2026-09-23 | President (male) since 20 May 2022. |
| TLS-3 | https://www.pmo.gov.sg/newsroom/pm-lawrence-wong-at-the-joint-press-conference-with-prime-minister-of-timor-leste-xanana-gusmao-july-2026/ | 2026-09-23 | Singapore PMO record dated July 2026 names the same Prime Minister of Timor-Leste. |
| TLS-4 | https://en.wikipedia.org/wiki/IX_Constitutional_Government_of_Timor-Leste | 2026-09-23 | Governing parties: CNRT and the Democratic Party (PD), with a majority. |
| TLS-5 | https://en.wikipedia.org/wiki/2028_East_Timorese_parliamentary_election | 2026-09-23 | Next parliamentary election by May 2028. |

Notes: flawed democracy (EIU 2025: 6.97). Executive power sits with the Prime Minister, so the seat is `head_of_government`. The 2027 presidential election does not choose the Prime Minister.
