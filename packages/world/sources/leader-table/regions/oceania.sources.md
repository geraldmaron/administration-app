# Oceania leader table: sources

Region file: `oceania.tsv` (14 rows: AUS, NZL, FJI, KIR, MHL, FSM, NRU, PLW, PNG, WSM, SLB, TON, TUV, VUT).
Every source below was opened on 2026-09-23. No incumbent is named here; a URL may carry a name because that is the page's address.

## How the columns were filled

- **leader_seat.** Parliamentary systems (the realms, Fiji, Samoa, Tonga, Vanuatu) use `head_of_government`. The five Micronesian presidencies (KIR, MHL, FSM, NRU, PLW) combine both seats in one office, so they are `head_of_state` with `second_seat_title` = `same`.
- **Commonwealth realms (AUS, NZL, PNG, SLB, TUV).** The head of state is the King, who is shared with the United Kingdom. `second_seat_title` records the resident Governor-General, who exercises the head-of-state functions locally, and `second_seat_sex` is the Governor-General's sex. If the merged table wants the monarch instead, every one of these rows becomes `King` / `M`.
- **Tonga.** Tonga is `head_of_government` (the Prime Minister runs the cabinet). It is typed `constitutional_monarchy_executive` because the King keeps a veto, dissolution, judicial and cabinet appointment powers, and his influence over the government grew in 2025 (TON-3, TON-5).
- **regime_type.** The EIU Democracy Index 2025 category is used where the EIU rates the country (AUS, NZL, FJI, PNG; OCE-EIU). The EIU does not rate the other ten. For those, Freedom House *Freedom in the World 2026* is used instead, with a stated rule: Free at 90 or above is `full_democracy`, Free below 90 is `flawed_democracy`, and Tonga takes the special monarchy type described above.
- **women_cabinet_share.** Taken from the most recent edition that could be opened: UN Women/IPU *Women in Politics: 2026* (data as at 1 January 2026, OCE-WIP26). The 2025 edition (as at 1 January 2025, OCE-WIP25) is recorded below for each country. The value is a plain percent with no % sign. It is only as current as 1 January 2026. The Solomon Islands (new cabinet May 2026) and Tonga (cabinet completed 5 January 2026) have changed since.
- **next_leader_selection.** Where a date is fixed, it is used (NZL). Otherwise the row gives the month the constitution requires or the cycle implies, marked "(est.)" below. For systems where parliament chooses the president (MHL, FSM, NRU), the row gives the general election that decides it, and the indirect selection that follows is noted.
- **surname_rule.** This column is the compiler's summary of each country's naming convention. No opened source backs it, so treat it as inference.
- **name_culture.** Keys come from `packages/world/src/dataset/people.ts` (AUS → `anglo`) and `name-cultures.ts` `ROSTER_NAME_CULTURE` (NZL → `anglo`; FJI, PNG, SLB, VUT → `melanesian`; WSM, TON, TUV → `polynesian`; KIR, MHL, FSM, NRU, PLW → `micronesian`).
- **Search limits.** The session's web-search budget ran out partway through. From then on, verification used direct page fetches only. RNZ, the Washington Post and SIBC returned HTTP 403, and `gg.gov.au` and `usnews.com` timed out. None of those are cited.

## Shared sources

| id | URL | opened | established |
|---|---|---|---|
| OCE-WIP26 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026) | 2026-09-23 | Women's share of cabinet ministers as at 1 Jan 2026: AUS 54.5 (12/22), NZL 35.0 (7/20), FJI 13.6 (3/22), KIR 14.3 (2/14), MHL 0.0 (0/9), FSM 37.5 (3/8), NRU 12.5 (1/8), PLW 14.3 (1/7), PNG 2.7 (1/37), WSM 6.7 (1/15), SLB 9.5 (2/21), TON 9.1 (1/11), TUV 0.0 (0/9), VUT 0.0 (0/12). |
| OCE-WIP25 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2025/03/women-in-politics-map-2025) | 2026-09-23 | The same measure as at 1 Jan 2025: AUS 48.3 (14/29), NZL 35.0 (7/20), FJI 10.5 (2/19), KIR 14.3 (2/14), MHL 0.0 (0/9), FSM 37.5 (3/8), NRU 14.3 (1/7), PLW 12.5 (1/8), PNG 2.7 (1/37), WSM 23.1 (3/13), SLB 9.5 (2/21), TON 18.2 (2/11), TUV 0.0 (0/8), VUT 0.0 (0/12). |
| OCE-EIU | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index | 2026-09-23 | EIU 2025 (and 2024): AUS 8.85 full democracy (8.85); NZL 9.62 full democracy (9.61); FJI 5.39 hybrid regime (5.39); PNG 5.90 hybrid regime (5.97). The other ten Oceania states are not rated. |

## AUS: Australia

| id | URL | opened | established |
|---|---|---|---|
| AUS-1 | https://www.abc.net.au/news/2026-09-23/federal-politics-albanese-responds-us-criticism-social-media-law/107184528 | 2026-09-23 | ABC News, dated 2026-09-23, reports the sitting Prime Minister in office today. |
| AUS-2 | https://en.wikipedia.org/wiki/Anthony_Albanese | 2026-09-23 | Incumbent PM since 23 May 2022, Australian Labor Party, re-elected May 2025. Born March 1963 (age 63, band 60-69). |
| AUS-3 | https://en.wikipedia.org/wiki/Governor-General_of_Australia | 2026-09-23 | Governor-General is a woman, in office since 1 July 2024. |
| AUS-4 | https://en.wikipedia.org/wiki/Next_Australian_federal_election | 2026-09-23 | No date set. A simultaneous House and half-Senate election is due on or before 20 May 2028 (row uses 2028-05). A House-only election could run to 23 Sept 2028. |
| AUS-5 | https://en.wikipedia.org/wiki/Prime_Minister_of_Australia | 2026-09-23 | Confirms the office and the incumbent's party and start date. |

## NZL: New Zealand

| id | URL | opened | established |
|---|---|---|---|
| NZL-1 | https://en.wikipedia.org/wiki/2026_New_Zealand_general_election | 2026-09-23 | General election fixed for 7 Nov 2026 (announced 21 Jan 2026). The government is a National, ACT and NZ First coalition. |
| NZL-2 | https://www.1news.co.nz/2026/08/12/full-statement-luxon-survives-caucus-showdown-united/ | 2026-09-23 | 1News, 2026-08-12: the PM survived a National caucus confidence vote (the second of 2026) and remains PM and party leader. |
| NZL-3 | https://en.wikipedia.org/wiki/Christopher_Luxon | 2026-09-23 | PM since 27 Nov 2023, National Party. Born July 1970 (age 56, band 50-59). |
| NZL-4 | https://en.wikipedia.org/wiki/Cindy_Kiro | 2026-09-23 | The Governor-General (a woman) is still in office. Her term was extended to 31 Mar 2027 so the next appointment does not clash with the election. |
| NZL-5 | https://en.wikipedia.org/wiki/Governor-General_of_New_Zealand | 2026-09-23 | Governor-General in office since 21 Oct 2021. |

## FJI: Fiji

| id | URL | opened | established |
|---|---|---|---|
| FJI-1 | https://pina.com.fj/2026/06/26/fiji-pm-says-next-election-due-between-24-december-and-early-february-2027/ | 2026-09-23 | PINA, 2026-06-26: the sitting PM says the next election falls between 24 Dec 2026 and the first week of Feb 2027. |
| FJI-2 | https://en.wikipedia.org/wiki/2026_Fijian_general_election | 2026-09-23 | Election due by 6 Feb 2027 (row uses 2027-02, the due-by month). Governing coalition is People's Alliance, NFP and SODELPA. The Deputy PM resigned in Oct 2025, and the opposition regrouped into new parties in 2026. |
| FJI-3 | https://en.wikipedia.org/wiki/Sitiveni_Rabuka | 2026-09-23 | Incumbent PM since 24 Dec 2022 (he also held the office earlier), People's Alliance. Born Sept 1948 (age 78, band 70-79). |
| FJI-4 | https://en.wikipedia.org/wiki/President_of_Fiji | 2026-09-23 | President (male, chiefly title Ratu) in office since 12 Nov 2024. |
| FJI-5 | https://www.feo.org.fj/ | 2026-09-23 | Fijian Elections Office items dated up to 10 Sept 2026 show election-official training but no announced polling date. |

## KIR: Kiribati

| id | URL | opened | established |
|---|---|---|---|
| KIR-1 | https://www.president.gov.ki/ | 2026-09-23 | The Office of Te Beretitenti site names the sitting President. |
| KIR-2 | https://en.wikipedia.org/wiki/Taneti_Maamau | 2026-09-23 | President since 11 Mar 2016, now in a third and final term (from 2024). Born 16 Sept 1960 (age 66, band 60-69). |
| KIR-3 | https://en.wikipedia.org/wiki/President_of_Kiribati | 2026-09-23 | Tobwaan Kiribati Party. The President is elected by popular vote from candidates the House nominates after the parliamentary election. Terms are four years, with a three-term limit. |
| KIR-4 | https://en.wikipedia.org/wiki/House_of_Assembly_(Kiribati) | 2026-09-23 | Four-year House. Last election 14 and 19 Aug 2024, next by 2028. TKP holds 33 of 45 seats. The presidential vote follows the parliamentary election, as it did in Oct 2024, so the row uses 2028-10 (est.). The incumbent cannot stand again. |
| KIR-5 | https://freedomhouse.org/country/kiribati/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 89/100, with concerns about judicial independence. This gives `flawed_democracy` under the stated rule. |

## MHL: Marshall Islands

| id | URL | opened | established |
|---|---|---|---|
| MHL-1 | https://en.wikipedia.org/wiki/Hilda_Heine | 2026-09-23 | President (a woman) in the current term since 3 Jan 2024 (she also served 2016-2020). Independent. Born Apr 1951 (age 75, band 70-79). |
| MHL-2 | https://en.wikipedia.org/wiki/President_of_the_Marshall_Islands | 2026-09-23 | The Nitijela elects the President from its members for a four-year term. Next general election in 2027. The November cycle gives 2027-11 (est.), and the Nitijela's selection follows in Jan 2028. |
| MHL-3 | https://en.wikipedia.org/wiki/2026_in_the_Marshall_Islands | 2026-09-23 | The same President is listed as the 2026 incumbent, with no change of government in 2026. |
| MHL-4 | https://freedomhouse.org/country/marshall-islands/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 93/100, which gives `full_democracy`. |

## FSM: Federated States of Micronesia

| id | URL | opened | established |
|---|---|---|---|
| FSM-1 | https://gov.fm/ | 2026-09-23 | The FSM government site lists items dated 13 Aug to 1 Sept 2026 that name the sitting President. The 1 Sept item also refers to the sitting President of Palau. |
| FSM-2 | https://en.wikipedia.org/wiki/Wesley_Simina | 2026-09-23 | President since 11 May 2023. Born 10 Sept 1961 (age 65, band 60-69). A Vice President is in office. |
| FSM-3 | https://en.wikipedia.org/wiki/President_of_the_Federated_States_of_Micronesia | 2026-09-23 | Congress elects the President from its at-large members for four years. The current mandate ends 11 May 2027. The row uses the March 2027 congressional election (est.), and Congress selects the President by May 2027. |
| FSM-4 | https://freedomhouse.org/country/micronesia/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 92/100, which gives `full_democracy`. |

## NRU: Nauru

| id | URL | opened | established |
|---|---|---|---|
| NRU-1 | https://en.wikipedia.org/wiki/2025_Nauruan_parliamentary_election | 2026-09-23 | Parliamentary election on 11 Oct 2025, with all candidates independent. The incumbent President was re-elected unopposed by Parliament on 14 Oct 2025. |
| NRU-2 | https://en.wikipedia.org/wiki/David_Adeang | 2026-09-23 | President since 30 Oct 2023. Born Nov 1969 (age 56, band 50-59). |
| NRU-3 | https://en.wikipedia.org/wiki/2025_Nauruan_constitutional_referendum | 2026-09-23 | Voters rejected a 3-to-4-year parliamentary term in Oct 2025 (44.67% yes, with two-thirds required). Parliament then passed the extension on 26 and 31 Mar 2026. |
| NRU-4 | https://en.wikipedia.org/wiki/2026_in_Nauru | 2026-09-23 | The term extension passed on 31 Mar 2026. A new Vice President office was filled on 16 Apr 2026. The country was officially renamed the Republic of Naoero on 3 Aug 2026. |
| NRU-5 | https://en.wikipedia.org/wiki/Parliament_of_Nauru | 2026-09-23 | Gives a four-year term and next election 2029. The row uses 2029-10 (est.). |
| NRU-6 | https://en.wikipedia.org/wiki/Politics_of_Nauru | 2026-09-23 | Still describes a three-year term, which conflicts with NRU-3, NRU-4 and NRU-5. If the extension did not take effect, the next election is about Oct 2028. |
| NRU-7 | https://freedomhouse.org/country/nauru/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 75/100, which gives `flawed_democracy`. |

## PLW: Palau

| id | URL | opened | established |
|---|---|---|---|
| PLW-1 | https://www.forumsec.org/ | 2026-09-23 | Pacific Islands Forum Secretariat: the sitting President of Palau chaired the Smaller Island States Leaders Meeting on 31 Aug 2026. The Leaders' Communique followed on 4 Sept 2026. |
| PLW-2 | https://en.wikipedia.org/wiki/Surangel_Whipps_Jr. | 2026-09-23 | President since 21 Jan 2021, re-elected Nov 2024. Independent. Born Aug 1968 (age 58, band 50-59). |
| PLW-3 | https://www.palaugov.pw/ | 2026-09-23 | The government site carries the sitting President's State of the Republic address dated 22 July 2026. |
| PLW-4 | https://freedomhouse.org/country/palau/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 92/100, which gives `full_democracy`. The four-year cycle (2020, 2024) puts the next direct presidential election in 2028-11, and the incumbent is term-limited after two consecutive terms. The cycle and term limit are inference and not stated in an opened source. |

## PNG: Papua New Guinea

| id | URL | opened | established |
|---|---|---|---|
| PNG-1 | https://www.pmnec.gov.pg/ | 2026-09-23 | Department of PM and NEC items dated 22 Sept 2026 name the sitting PM, who is attending UNGA 81. |
| PNG-2 | https://en.wikipedia.org/wiki/James_Marape | 2026-09-23 | PM since 30 May 2019, Pangu Pati. Born Apr 1971 (age 55, band 50-59). |
| PNG-3 | https://en.wikipedia.org/wiki/Governor-General_of_Papua_New_Guinea | 2026-09-23 | Governor-General (male) in office since 28 Feb 2017, re-elected for a second term. |
| PNG-4 | https://en.wikipedia.org/wiki/Next_Papua_New_Guinean_general_election | 2026-09-23 | Next general election in or before 2027. |
| PNG-5 | https://en.wikipedia.org/wiki/National_Parliament_of_Papua_New_Guinea | 2026-09-23 | Five-year term. Last polling was in July 2022, so the row uses 2027-07 (est.). A Pangu-led coalition holds about 102 seats, with United Resources, National Alliance, People's Party and independents. |
| PNG-6 | https://en.wikipedia.org/wiki/Cabinet_of_Papua_New_Guinea | 2026-09-23 | Coalition parties in the cabinet as of the Jan 2024 reshuffle: Pangu, URP, National Alliance, People's Party, SDP and smaller parties. The page is not current for 2026. |

## WSM: Samoa

| id | URL | opened | established |
|---|---|---|---|
| WSM-1 | https://www.samoagovt.ws/ | 2026-09-23 | The government portal names the sitting PM and carries dated 2026 items, including the Budget Address of 27 May 2026. |
| WSM-2 | https://en.wikipedia.org/wiki/La%CA%BBauli_Leuatea_Schmidt | 2026-09-23 | PM since 16 Sept 2025, FAST. Born Apr 1966 (age 60, band 60-69). He was charged with criminal offences in Jan 2025 and had medical treatment abroad in late 2025. |
| WSM-3 | https://en.wikipedia.org/wiki/2026_in_Samoa | 2026-09-23 | The same PM and head of state are the 2026 incumbents. By-elections were held through 18 Sept 2026, with no change of PM. |
| WSM-4 | https://en.wikipedia.org/wiki/O_le_Ao_o_le_Malo | 2026-09-23 | Head of state (male) since 21 July 2017, re-elected 2022 for five years. |
| WSM-5 | https://en.wikipedia.org/wiki/Legislative_Assembly_of_Samoa | 2026-09-23 | Five-year term. Last election 29 Aug 2025, next by 2030 (row uses 2030-08, est.). FAST holds 32 of 51 seats. |
| WSM-6 | https://devpolicy.org/fiame-naomi-mataafas-tumultuous-tenure-has-ended-whats-next-20250530/ | 2026-09-23 | Devpolicy, 2025-05-30: the previous government lost its budget vote (34-16), and a dissolution and snap election followed. This is the dated record of the 2025 change. |
| WSM-7 | https://freedomhouse.org/country/samoa/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 84/100, which gives `flawed_democracy`. |
| WSM-8 | https://en.wikipedia.org/wiki/2025_Samoan_general_election | 2026-09-23 | Snap election on 29 Aug 2025, won by FAST with a majority. The new PM took office when Parliament was sworn in on 16 Sept 2025. |

## SLB: Solomon Islands

| id | URL | opened | established |
|---|---|---|---|
| SLB-1 | https://www.abc.net.au/news/2026-05-07/solomon-islands-new-prime-minister-jeremiah-manele-voted-out/106651634 | 2026-09-23 | ABC, 2026-05-07: the previous PM was removed by a no-confidence vote (26 of 50). |
| SLB-2 | https://www.abc.net.au/news/2026-05-15/solomon-islands-new-prime-minister-matthew-wale/106683120 | 2026-09-23 | ABC, 2026-05-15: the long-time opposition leader was elected PM 26-22 in a secret ballot. |
| SLB-3 | https://pina.com.fj/2026/05/18/pm-wale-sworn-in-names-cabinet-ministers/ | 2026-09-23 | PINA, 2026-05-18: the PM was sworn in and named his cabinet. The Solomon Islands Democratic Party leads, and the PM was 57 at the time. |
| SLB-4 | https://en.wikipedia.org/wiki/Matthew_Wale | 2026-09-23 | PM since 15 May 2026, Solomon Islands Democratic Party. Born June 1968 (age 58, band 50-59). The Governor-General holds a knighthood (male). |
| SLB-5 | https://www.rfa.org/english/pacific/2026/09/02/solomon-islands-no-confidence-wale/ | 2026-09-23 | RFA, 2026-09-02: the Home Affairs minister filed a no-confidence motion against the PM on 29 Aug 2026. |
| SLB-6 | https://www.newcastleherald.com.au/story/9345391/no-confidence-vote-in-solomon-islands-pm-wale-pulled/ | 2026-09-23 | AAP, 2026-09-07: the motion was withdrawn on the eve of debate. The PM stays in office and says his coalition has 31 of 50 MPs. |
| SLB-7 | https://www.lowyinstitute.org/the-interpreter/solomon-islands-has-new-pm-not-new-foreign-policy | 2026-09-23 | Lowy Interpreter, 2026-05-15: the new PM leads the SIDP, and the removal motion was brought by a 28-MP coalition. |
| SLB-8 | https://freedomhouse.org/country/solomon-islands/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 74/100, which gives `flawed_democracy`. |
| SLB-9 | https://en.wikipedia.org/wiki/2026_in_the_Solomon_Islands | 2026-09-23 | 2026 timeline: removal on 7 May and election of the new PM on 15 May. |
| SLB-10 | https://en.wikipedia.org/wiki/Prime_Minister_of_Solomon_Islands | 2026-09-23 | Incumbent since 15 May 2026, SIDP. |
| SLB-11 | https://en.wikipedia.org/wiki/2024_Solomon_Islands_general_election | 2026-09-23 | Last general election on 17 Apr 2024. The row assumes the four-year parliamentary term and uses 2028-04 (est.). The term length is inference and not stated in an opened source. The coalition's formal name could not be confirmed from an opened page. |

## TON: Tonga

| id | URL | opened | established |
|---|---|---|---|
| TON-1 | https://en.wikipedia.org/wiki/2025_Tongan_general_election | 2026-09-23 | General election on 20 Nov 2025. The Assembly elected a noble PM 16-10 on 15 Dec 2025. The new cabinet includes the sole woman MP. |
| TON-2 | https://en.wikipedia.org/wiki/Fatafehi_Fakaf%C4%81nua | 2026-09-23 | PM since 18 Dec 2025, a hereditary noble related to the royal family by marriage. Born Mar 1985 (age 41, band 40-49). The cabinet was completed on 5 Jan 2026. |
| TON-3 | https://freedomhouse.org/country/tonga/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 79/100. The King holds veto, dissolution and judicial appointment powers. The crown prince was made foreign and defense minister, and the King's influence over government increased in 2025. This is the basis for `constitutional_monarchy_executive`. |
| TON-4 | https://en.wikipedia.org/wiki/Tupou_VI | 2026-09-23 | The King (male) has reigned since 18 Mar 2012 and is still on the throne. |
| TON-5 | https://en.wikipedia.org/wiki/Politics_of_Tonga | 2026-09-23 | The King appoints the cabinet, including the PM, and all judges. The Assembly has 9 nobles' and 17 people's representatives. There is no party system, which gives `none (nonpartisan)`. |
| TON-6 | https://en.wikipedia.org/wiki/Prime_Minister_of_Tonga | 2026-09-23 | Incumbent since 18 Dec 2025. This page wrongly calls him a commoner, and TON-1 and TON-2 correct it. The four-year cycle (2021, 2025) gives 2029-11 (est.). |

## TUV: Tuvalu

| id | URL | opened | established |
|---|---|---|---|
| TUV-1 | https://en.wikipedia.org/wiki/Feleti_Teo | 2026-09-23 | PM since 26 Feb 2024 (elected unopposed) and incumbent at the page's July 2026 revision. Born Oct 1962 (age 63, band 60-69). |
| TUV-2 | https://en.wikipedia.org/wiki/Governor-General_of_Tuvalu | 2026-09-23 | Governor-General (male) in office since 28 Sept 2021. |
| TUV-3 | https://en.wikipedia.org/wiki/Parliament_of_Tuvalu | 2026-09-23 | Four-year term. Last election 26 Jan 2024, next due 2028 (row uses 2028-01, est.). There are no formal parties. |
| TUV-4 | https://freedomhouse.org/country/tuvalu/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 93/100, which gives `full_democracy`. |

## VUT: Vanuatu

| id | URL | opened | established |
|---|---|---|---|
| VUT-1 | https://en.wikipedia.org/wiki/2025_Vanuatuan_general_election | 2026-09-23 | Snap election on 16 Jan 2025. The coalition agreed on 27 Jan was Leaders Party, Vanua'aku Pati, RMC, Iauko Group and Land and Justice Party. The PM was elected on 11 Feb 2025 with 50 votes. Four-year term, next due 2029 (row uses 2029-01, est.). |
| VUT-2 | https://en.wikipedia.org/wiki/Jotham_Napat | 2026-09-23 | PM since 11 Feb 2025, Leaders Party of Vanuatu. Born Aug 1972 (age 54, band 50-59). |
| VUT-3 | https://en.wikipedia.org/wiki/President_of_Vanuatu | 2026-09-23 | President (male) since 23 July 2022, on a non-renewable five-year term ending July 2027. |
| VUT-4 | https://en.wikipedia.org/wiki/2026_in_Vanuatu | 2026-09-23 | The same PM and President are listed as 2026 incumbents, with no change of government recorded in 2026. |
| VUT-5 | https://en.wikipedia.org/wiki/Nakamal_Agreement | 2026-09-23 | The sitting PM signed the agreement with Australia in Canberra on 29 June 2026. |
| VUT-6 | https://en.wikipedia.org/wiki/Prime_Minister_of_Vanuatu | 2026-09-23 | Incumbent tenure is shown as 1 year 224 days, which is current to late Sept 2026. |
| VUT-7 | https://freedomhouse.org/country/vanuatu/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 82/100, noting unstable coalitions. This gives `flawed_democracy`. |
