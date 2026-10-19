# Southeast Europe and Caucasus leader table: sources

Verified 2026-09-23 for 19 governments: BLR, UKR, RUS, BGR, MDA, ROU, ALB, BIH, HRV, CYP, GRC, XKX, MNE, MKD, SRB, ARM, AZE, GEO, TUR. Every URL below was opened on 2026-09-23. No incumbent is named in this file. A URL can carry a name because that is the page's address.

Wikipedia pages marked "(raw)" were read as the page's raw wikitext (`index.php?title=...&action=raw`), which is the same content as the rendered article. Official sites marked "(curl)" were read with a plain HTTP fetch because the fetch tool was refused or timed out.

## Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| HEADS | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (rendered, and raw) | 2026-09-23 | The current head of state and head of government for all 19 ids, and which of the two the page marks as holding executive power. It also flagged every 2026 change this file then confirmed with dated news: new prime ministers in Bulgaria, Moldova and Ukraine, a caretaker prime minister in Romania, an acting president in Kosovo, the rotating Bosnian chair, and an informal ruling-party figure in Georgia. Every second-seat sex in the TSV comes from this page. |
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (raw), with https://www.eiu.com/n/campaigns/democracy-index-2025/ (curl) | 2026-09-23 | EIU Democracy Index 2025 categories and scores: Greece full democracy (8.07). Flawed democracies: Cyprus 7.45, Montenegro 6.73, Croatia 6.50, Bulgaria 6.34, Serbia 6.30, North Macedonia 6.28, Albania 6.20, Romania 6.11 (back up from hybrid in 2024). Hybrid regimes: Moldova 5.86 (downgraded in 2025), Armenia 5.35, Bosnia 5.23, Ukraine 4.79, Georgia 4.36, Turkey 4.26. Authoritarian: Azerbaijan 2.80, Russia 2.03, Belarus 1.99. The EIU landing page confirms the 2025 edition exists; the report itself sits behind registration, so the Wikipedia table is the copy I could open. Kosovo is not covered by the EIU. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026) | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map: women among cabinet members who head ministries **as at 1 January 2026**. This is the most recent edition, so it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from its ministers table. Kosovo is not listed. |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The 2025 edition (as at 1 January 2025), opened to cross-check. Not used in the TSV. The direction of change is plausible for each id, for example Albania 41.7 to 46.2 and Ukraine 26.3 to 20.0. |
| REPO | `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`: RUS, UKR, BLR to `slavic-east`; TUR to `turkish`), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` and `name-banks.vendored.ts` | 2026-09-23 | Every one of the 19 ids already has a bank key in the repo, and the TSV uses those keys unchanged: `greek` (GRC, CYP), `romanian` (ROU, MDA), `serbo-croatian` (SRB, HRV, BIH, MNE), `macedonian`, `bulgarian`, `albanian` (ALB, XKX), `georgian`, `armenian`, `azerbaijani`. |

The women-cabinet share has one caveat throughout. The map is a 1 January 2026 snapshot, so it predates the cabinets formed since then in Bulgaria (May 2026), Ukraine (July 2026), Moldova (July 2026), Armenia (August 2026) and Kosovo (September 2026), Romania's caretaker status (from May 2026), and Cyprus's August 2026 reshuffle.

## How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Presidential and semi-presidential systems get `head_of_state` (BLR, UKR, RUS, ROU, SRB, AZE, TUR, CYP). Parliamentary systems get `head_of_government` (BGR, ALB, HRV, GRC, XKX, MNE, MKD, ARM, GEO). There are two judgment calls, Moldova and Bosnia, and each is covered in its own section below.
- **Regime type.** I used the EIU 2025 category for every id except Kosovo, which the EIU does not rate. There I used Freedom House's Nations in Transit category (XKX-7). None of these governments has a form that calls for a special type.
- **Next leader selection.** This is the next event that could replace the person in the leader seat, not every election on the calendar. Where the month is estimated from a term length rather than a set date, the nation's note says so.
- **Surname rule.** This follows each language's standard morphology for the political elite. It is not taken from a single opened source.

## Belarus (BLR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BLR-1 | https://president.gov.by/en/events (curl) | 2026-09-23 | Primary source. The President was issuing greetings and chairing meetings on 22 September 2026. The site also lists him as chairman of the Belarusian People's Congress (the All-Belarusian People's Assembly). |
| BLR-2 | https://en.wikipedia.org/wiki/Alexander_Lukashenko (raw) | 2026-09-23 | President since 20 July 1994, born 1954 (age 72). Formally an independent. The page links the 2025 presidential election, which began his current five-year term. |

The Prime Minister (M) is from HEADS. Political parties play no governing role. The pro-government Belaya Rus party dominates the legislature, but the President is nonpartisan and the cabinet is technocratic, so `governing_parties` is "none (nonpartisan)". EIU: authoritarian (1.99). The next presidential election is estimated at early 2030 from the five-year term after the January 2025 vote. No date has been set.

## Ukraine (UKR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| UKR-1 | https://www.pravda.com.ua/eng/news/2026/07/16/8044351/ | 2026-09-23 | Dated news (2026-07-16): the Rada appointed a new Prime Minister (M) with 289 votes. He is the former head of the state energy company Naftogaz and was nominated by the President. |
| UKR-2 | https://razomua.media/en/news/politika/313-holosiv-20-y-raz-pospil-yak-parlament-prodovzhuye-voyennyy-stan-u-rezhymi-avtopilota-i-chomu-tse-ne-tak-prosto-yak-zdayetsya | 2026-09-23 | Dated news (2026-07-14): the 20th extension of martial law (313 votes) runs from 2 August to 31 October 2026. Elections cannot be held under martial law, so November 2026 is the earliest horizon, and only if martial law is lifted. |
| UKR-3 | https://en.wikipedia.org/wiki/Volodymyr_Zelenskyy (raw) | 2026-09-23 | President since 20 May 2019, born 1978 (age 48). Came to office on the Servant of the People ticket. |

The President holds executive power, so the row describes the President. The new Prime Minister (M) goes in `second_seat` and replaces the woman who served from 2025 to 2026. That change is why WIP-2026 (20.0) describes the earlier cabinet. `governing_parties` is the Rada majority faction. EIU: hybrid regime (4.79). Next selection: none scheduled, because every election is suspended while martial law lasts.

## Russia (RUS)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| RUS-1 | http://en.kremlin.ru/events/president/news (curl) | 2026-09-23 | Primary source. Presidential events are dated 22 and 23 September 2026. |
| RUS-2 | http://government.ru/en/ (curl) | 2026-09-23 | Primary source. The Prime Minister (M) held government meetings on 9, 15, 17 and 21 September 2026. |
| RUS-3 | https://en.wikipedia.org/wiki/2026_Russian_legislative_election (raw) | 2026-09-23 | The State Duma election ran 18 to 20 September 2026. Preliminary figures (97.64% reporting) give United Russia about 58% and 347 of 450 seats. |
| RUS-4 | https://en.wikipedia.org/wiki/Vladimir_Putin (raw) | 2026-09-23 | In the presidency continuously since 7 May 2012 (acting from 31 December 1999, then president 2000 to 2008, then prime minister 2008 to 2012). Born 1952, so age 73 on as_of. |
| RUS-5 | http://en.kremlin.ru/search?query=State+Duma+elections (curl) | 2026-09-23 | Primary source. The President voted in the Duma election on 18 September 2026 and gave a pre-election address on 16 September. |

`leader_in_office_since` is 2012, the start of the current continuous presidency. The same person has been the paramount leader since 2000. EIU: authoritarian (2.03). The next presidential election is March 2030, six years after the March 2024 vote.

## Bulgaria (BGR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BGR-1 | https://www.euronews.com/my-europe/2026/05/08/bulgarian-parliament-confirms-rumen-radev-as-new-prime-minister | 2026-09-23 | Dated news (2026-05-08): parliament elected the Prime Minister 124 to 70 with 36 abstentions. His party, Progressive Bulgaria, won an outright majority (131 of 240) in the 19 April 2026 election, the first single-party majority since 1997. He resigned the presidency in January 2026 to run. |
| BGR-2 | https://www.gov.bg/en | 2026-09-23 | Primary source. The government portal names him as Prime Minister, with a news item dated 10 September 2026. |
| BGR-3 | https://sofiaglobe.com/2026/07/29/bulgaria-sets-october-25-date-for-2026-presidential-elections/ | 2026-09-23 | Dated news (2026-07-29): the presidential election is on 25 October 2026, with a runoff on 1 November if needed. |
| BGR-4 | https://en.wikipedia.org/wiki/Rumen_Radev (raw) | 2026-09-23 | Prime Minister since 8 May 2026, born 1963 (age 63). |

The President (F) took over when the former president resigned in January 2026 and is the second seat. That seat is up for election in October 2026, but the vote cannot replace the Prime Minister. The next parliamentary election is estimated at April 2030 from the four-year term after April 2026. WIP-2026 (5.3) describes the cabinet that was in office before May 2026. EIU: flawed democracy (6.34).

## Moldova (MDA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MDA-1 | https://radiomoldova.md/p/81391/vasile-tofan-takes-office-as-moldova-pm-to-push-eu-reforms | 2026-09-23 | Dated news (July 2026): the new Prime Minister (M) was sworn in on 22 July 2026, backed by the Party of Action and Solidarity (53 votes). His predecessor had resigned. |
| MDA-2 | https://presedinte.md/eng | 2026-09-23 | Primary source. The Presidency site names the incumbent President (F). The latest press release on the page is from June 2026. |
| MDA-3 | https://en.wikipedia.org/wiki/Maia_Sandu (raw) | 2026-09-23 | President since 24 December 2020, born 1972 (age 54). |

The leader seat is a **judgment call**. Moldova is formally a parliamentary republic, but the directly elected President founded the ruling party, and it was the President who picked the new Prime Minister (MDA-1). A foreign president deals with the President, so the row records `head_of_state`. EIU: hybrid regime (5.86, downgraded in 2025). The next presidential election is estimated at October 2028 from the four-year term after the October and November 2024 vote.

## Romania (ROU)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ROU-1 | https://www.wral.com/news/ap/5e2f4-romanias-president-nominates-a-new-prime-minister-to-break-a-political-deadlock/ | 2026-09-23 | AP, dated 2026-09-17: the President nominated a National Liberal member of the European Parliament (M, 44) as Prime Minister. The previous prime minister (M) has been caretaker since his government was ousted in May 2026. Two earlier nominees failed: one was rejected by parliament and one withdrew. The next general election is due in 2028. |
| ROU-2 | https://www.rri.ro/en/news-and-current-affairs/newsflash/september-20-2026-update-id1061512.html | 2026-09-23 | Dated news (updated 2026-09-22): the National Liberals, Save Romania Union and the Hungarian alliance back the designate but lack the 233 votes needed. Negotiations are deadlocked. |
| ROU-3 | https://en.wikipedia.org/wiki/Nicu%C8%99or_Dan (raw) | 2026-09-23 | President since 26 May 2025, born 1969 (age 56). |

The semi-presidential President holds defense and foreign policy and represents Romania in the European Council, so the row records `head_of_state`. The prime minister seat is male whether the caretaker or the designate holds it. `governing_parties` lists the three parties in the caretaker cabinet; the Social Democrats left the coalition in April 2026. The next presidential election is estimated at May 2030 from the five-year term. EIU: flawed democracy (6.11).

## Albania (ALB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ALB-1 | https://en.wikipedia.org/wiki/Rama_IV_Government (raw) | 2026-09-23 | The fourth government of the same Prime Minister is a single-party Socialist Party majority formed after the 2025 parliamentary election. |
| ALB-2 | https://en.wikipedia.org/wiki/Edi_Rama (raw) | 2026-09-23 | Prime Minister since 11 September 2013, born 1964 (age 62). |

The government portal (https://kryeministria.al/en/) returned an empty shell to a plain fetch and could not be read. The President (M) is from HEADS. The next parliamentary election is estimated at May 2029 from the four-year term after May 2025. EIU: flawed democracy (6.20).

## Bosnia and Herzegovina (BIH)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BIH-1 | https://www.predsjednistvobih.ba/saop/default.aspx?id=109511&langTag=en-US (curl) | 2026-09-23 | Primary source, a Presidency press release: the Bosniak member became Chair of the Presidency on 16 March 2026 under the eight-month rotation. |
| BIH-2 | https://europeanwesternbalkans.com/2026/05/07/the-general-election-in-bih-to-be-held-on-4-october/ | 2026-09-23 | Dated news (2026-05-07): the Central Election Commission set the general election, which includes the Presidency, for 4 October 2026. |
| BIH-3 | https://www.kas.de/en/country-reports/detail/-/content/bosnia-and-herzegovina-in-the-election-year-2026 | 2026-09-23 | Country report dated 2026-04-02: the state-level coalition (HDZ BiH holds the Council of Ministers chair, with SNSD and the SDP, People and Justice and Our Party "Troika") is still in place but largely paralyzed. |
| BIH-4 | https://en.wikipedia.org/wiki/Denis_Be%C4%87irovi%C4%87 (raw) | 2026-09-23 | Chair since 16 March 2026 and Presidency member since 2022. Born 1975 (age 50). |

The leader seat is a **judgment call**. Executive power is split three ways: a three-member Presidency conducts foreign policy, the Council of Ministers is the government, and the international High Representative holds override powers. A foreign president deals with the Presidency, so the row records the rotating Chair as `head_of_state`. `leader_in_office_since` is 2026, when the current chair's rotation began, although he has sat on the Presidency since 2022. The Chair of the Council of Ministers (F) is the second seat. The 4 October 2026 election replaces the whole Presidency. EIU: hybrid regime (5.23).

## Croatia (HRV)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| HRV-1 | https://vlada.gov.hr/en | 2026-09-23 | Primary source. The government site carries Prime Minister statements dated 22 September 2026. |
| HRV-2 | https://en.wikipedia.org/wiki/Government_of_Croatia (raw) | 2026-09-23 | The current (third) cabinet under the same Prime Minister has ministers from the Croatian Democratic Union (HDZ) and the Homeland Movement (DP). |
| HRV-3 | https://en.wikipedia.org/wiki/Andrej_Plenkovi%C4%87 (raw) | 2026-09-23 | Prime Minister since 19 October 2016, born 1970 (age 56). |

The President (M) is from HEADS. The next parliamentary election is estimated at April 2028 from the four-year term after April 2024. EIU: flawed democracy (6.50).

## Cyprus (CYP)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CYP-1 | https://www.gov.cy/presidency/ (redirected from presidency.gov.cy, curl) | 2026-09-23 | Primary source. Presidency items are dated 23 September 2026. |
| CYP-2 | https://cyprus-mail.com/2026/08/05/govt-says-partial-cabinet-reshuffle-maintains-centre-right-course | 2026-09-23 | Dated news (2026-08-05): after the partial reshuffle, the Democratic Party (DIKO) holds four ministries and the Democratic Alignment (DIPA) two, while EDEK lost its only cabinet seat. |
| CYP-3 | https://en.wikipedia.org/wiki/Nikos_Christodoulides (raw) | 2026-09-23 | President since 28 February 2023, born 1973 (age 52). |

The President is both head of state and head of government, so the second seat is "same". He was elected as an independent, so `governing_parties` lists the parties that hold cabinet posts. The next presidential election is estimated at February 2028 from the five-year term. EIU: flawed democracy (7.45).

## Greece (GRC)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GRC-1 | https://greekcitytimes.com/2026/09/07/greek-prime-minister-rules-out-snap-elections | 2026-09-23 | Dated news (2026-09-07): the Prime Minister ruled out a snap vote and said elections will be held in spring 2027. New Democracy governs. |
| GRC-2 | https://en.wikipedia.org/wiki/Kyriakos_Mitsotakis (raw) | 2026-09-23 | Prime Minister since 8 July 2019, with the current term from 26 June 2023 after a short caretaker interval. Born 1968 (age 58). |

The official site (https://www.primeminister.gr/en) returned HTTP 403. The President (M) is from HEADS. The next election is set at 2027-05, from the stated "spring 2027"; the month is an estimate, and the legal limit is mid-2027. EIU: full democracy (8.07).

## Kosovo (XKX)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| XKX-1 | https://kryeministri.rks-gov.net/en/ (curl) | 2026-09-23 | Primary source. The Prime Minister's office posted meetings dated 22 and 23 September 2026. |
| XKX-2 | https://en.wikipedia.org/wiki/2026_in_Kosovo (raw) | 2026-09-23 | The 2026 timeline. A government was approved on 11 February. The previous president's term ended on 4 April and the Speaker (F) became acting president. The 7 June snap election gave Vetëvendosje 53 of 120 seats. On 13 September the Assembly was constituted and accepted the Prime Minister's fourth cabinet. PDK and AAK are challenging its legitimacy at the Constitutional Court. |
| XKX-3 | https://www.aljazeera.com/news/2026/9/13/kosovo-approves-new-government-after-months-of-political-deadlock | 2026-09-23 | Dated news (2026-09-13): the cabinet passed with 62 of 120 votes. If parliament fails to elect a president, Kosovo must hold another snap election, the fourth in two years. |
| XKX-4 | https://eualive.net/kosovo-has-a-fourth-kurti-government-but-the-institutional-crisis-is-not-over/ | 2026-09-23 | Dated news (September 2026): the majority is Vetëvendosje's 53 seats plus 9 non-majority community members, 8 of them non-Serb and 1 Serb. The presidential vote has no firm date. |
| XKX-5 | https://balkaninsight.com/2026/08/18/kosovo-opposition-snubs-acting-presidents-meeting-amid-parliamentary-crisis/bi/ | 2026-09-23 | Dated news (2026-08-18): the opposition contests the acting president's standing. The constitution requires a president to be elected within two months of the Assembly's inauguration, and failure triggers new elections. |
| XKX-6 | https://en.wikipedia.org/wiki/Albin_Kurti (raw) | 2026-09-23 | Prime Minister since 22 March 2021, born 1975 (age 51). |
| XKX-7 | https://freedomhouse.org/country/kosovo/nations-transit/2024 (curl) | 2026-09-23 | Freedom House Nations in Transit 2024 rates Kosovo a "Transitional or Hybrid Regime" (Democracy Score 3.29 of 7). This is the source for `hybrid_regime`, because the EIU does not rate Kosovo. The 2025 Nations in Transit page returned 404. |
| XKX-8 | https://freedomhouse.org/country/kosovo/freedom-world/2026 (curl) | 2026-09-23 | Freedom in the World 2026 rates Kosovo Partly Free (61 of 100), which is consistent with the hybrid classification. |

`leader_in_office_since` is 2021. The Prime Minister also held office briefly in 2020 and governed as caretaker through most of 2025 and 2026. The second seat is the Speaker (F) acting as President. `women_cabinet_share` is blank because Kosovo is not in WIP-2026 or WIP-2025. The next scheduled election is the regular parliamentary vote, estimated at June 2030. A snap election is likely sooner if the Assembly cannot elect a president, but none is scheduled.

## Montenegro (MNE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MNE-1 | https://en.wikipedia.org/wiki/Spaji%C4%87_Cabinet (raw) | 2026-09-23 | The cabinet is Europe Now, Democratic Montenegro, For the Future of Montenegro (New Serb Democracy), the Bosniak Party, the Socialist People's Party, Albanian Forum and Albanian Alliance. The Democratic People's Party withdrew on 31 January 2026 after its ministers resigned. |
| MNE-2 | https://www.gov.me/en/prime-minister (curl) | 2026-09-23 | Primary source. The government site names the incumbent Prime Minister. Its items on that page run to June 2026. |
| MNE-3 | https://en.wikipedia.org/wiki/Milojko_Spaji%C4%87 (raw) | 2026-09-23 | Prime Minister since 31 October 2023. Born 24 September 1987, so he is 38 on as_of and turns 39 the next day. |
| MNE-4 | https://www.gov.me/en/news (curl) | 2026-09-23 | Primary source. Ministers of the same government have items dated 21 to 23 September 2026. |

The President (M) is from HEADS. The next parliamentary election is estimated at June 2027 from the four-year term after June 2023. EIU: flawed democracy (6.73). He turns 39 the day after as_of, which keeps him in the 30-39 band until September 2027.

## North Macedonia (MKD)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MKD-1 | https://en.wikipedia.org/wiki/Politics_of_North_Macedonia (raw) | 2026-09-23 | The current cabinet is a coalition of VMRO-DPMNE, the VLEN coalition and ZNAM (For Our Macedonia). |
| MKD-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_North_Macedonia (raw) | 2026-09-23 | The incumbent has been Prime Minister since 23 June 2024. |
| MKD-3 | https://en.wikipedia.org/wiki/Hristijan_Mickoski (raw) | 2026-09-23 | Born 29 September 1977, so age 48 on as_of. |
| MKD-4 | https://vlada.mk/?ln=en-gb (curl) | 2026-09-23 | Primary source. The government site carries an agenda dated 23 September 2026, and its news items quote the incumbent Prime Minister. |

The President (F) is from HEADS. The next parliamentary election is estimated at May 2028 from the four-year term after May 2024. EIU: flawed democracy (6.28).

## Serbia (SRB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SRB-1 | https://balkaninsight.com/2026/09/09/serbias-vucic-calls-early-parliamentary-elections-for-october-25/bi/ | 2026-09-23 | Dated news (2026-09-09): the President dissolved parliament and called a snap election for 25 October 2026 at the government's proposal. The Serbian Progressive Party governs with the Socialist Party of Serbia. The President is expected to run for prime minister. |
| SRB-2 | https://wtop.com/national/2026/09/serbia-will-hold-early-parliamentary-election-in-october-testing-vucics-hold-on-power | 2026-09-23 | AP, dated 2026-09-09: the President is term-limited and plans to run for prime minister. He will resign in the coming weeks, and a separate early presidential election will follow. |
| SRB-3 | https://srpske.rs/en/news/politika/2026/09/15/vucic-new-resignation-date-september-27 | 2026-09-23 | Dated news (2026-09-15): the President said he will submit his resignation on 27 September 2026. The Speaker (F) will then act as president for up to three months, and a presidential election must be held within that window. |
| SRB-4 | https://en.wikipedia.org/wiki/Cabinet_of_%C4%90uro_Macut (raw) | 2026-09-23 | The cabinet is drawn from SNS, SPS, PUPS, SDPS, Serbian Party Oathkeepers, the Serbian People's Party and the Justice and Reconciliation Party. |
| SRB-5 | https://en.wikipedia.org/wiki/Aleksandar_Vu%C4%8Di%C4%87 (raw) | 2026-09-23 | President since 31 May 2017 with no term end recorded, so he is still in office on as_of. Born 1970 (age 56). The page records the June 2026 announcement that he would resign. |
| SRB-6 | https://europeanwesternbalkans.com/2026/08/21/vucic-snap-parliamentary-election-to-be-held-either-on-18-or-25-october-2026/ | 2026-09-23 | Dated news (2026-08-21): the earlier announcement that the snap election would fall on 18 or 25 October. Coalition partners such as the Socialists may run on separate lists. |

**This row goes stale in four days.** On 2026-09-23 the incumbent President is still in office and still runs Serbia, so the row records `head_of_state`. His planned resignation on 27 September hands the presidency to the Speaker (F) as acting president. If his list wins on 25 October and he becomes Prime Minister, the leader seat moves to `head_of_government`. `next_leader_selection` is therefore 2026-10, with an early presidential election due by about the end of 2026. EIU: flawed democracy (6.30).

## Armenia (ARM)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ARM-1 | https://oc-media.org/pashinyans-civil-contract-wins-parliamentary-elections/ | 2026-09-23 | Dated news (June 2026): Civil Contract won about 50% and 64 of 105 seats in the 7 June 2026 election, a working majority. |
| ARM-2 | https://www.primeminister.am/en/press-release/item/2026/08/02/Nikol-Pashinyan-met-with-Vahagn-Khachaturyan/ | 2026-09-23 | Primary source (2026-08-02): the President signed the decree reappointing the Prime Minister on the Civil Contract faction's proposal. |
| ARM-3 | https://en.wikipedia.org/wiki/Nikol_Pashinyan (raw) | 2026-09-23 | Prime Minister since 8 May 2018, born 1975 (age 51). |

The President (M) is from HEADS. The next parliamentary election is estimated at June 2031 from the five-year term after June 2026. EIU: hybrid regime (5.35).

## Azerbaijan (AZE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| AZE-1 | https://president.az/en (curl) | 2026-09-23 | Primary source. The President received new ambassadors on 23 September 2026. |
| AZE-2 | https://en.wikipedia.org/wiki/Ilham_Aliyev (raw) | 2026-09-23 | President since 31 October 2003, born 1961 (age 64). New Azerbaijan Party. |

The Prime Minister (M) is from HEADS. The First Vice President is the President's spouse; she is not a separate seat in this table. The next presidential election is estimated at February 2031 from the seven-year term after the February 2024 snap vote. EIU: authoritarian (2.80). WIP-2026 records no women among 16 ministers.

## Georgia (GEO)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GEO-1 | https://georgiatoday.ge/kobakhidze-on-possible-resignation-ask-me-again-in-3-months/ | 2026-09-23 | Dated news (2026-09-07): the Prime Minister dismissed rumors that he will resign as recurring idle speculation, and credited the ruling party's founder with guiding his anticorruption reforms. |
| GEO-2 | https://civil.ge/archives/750128 | 2026-09-23 | Dated news (2026-09-08): resignation rumors are circulating again. The Prime Minister was still in office and making public appearances. The rest of the article is paywalled. |
| GEO-3 | https://en.wikipedia.org/wiki/Irakli_Kobakhidze (raw) | 2026-09-23 | Prime Minister since 8 February 2024. Born 25 September 1978, so he is 47 on as_of and turns 48 two days later; the band is 40-49 either way. |

The formal executive is the Prime Minister, so the row records `head_of_government`. HEADS also lists Georgian Dream's founder and honorary chairman, who holds no state office, as the operational power behind the government. The President (M) is from HEADS. The next parliamentary election is estimated at October 2028 from the four-year term after October 2024. EIU: hybrid regime (4.36).

## Turkey (TUR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TUR-1 | https://en.wikipedia.org/wiki/Recep_Tayyip_Erdo%C4%9Fan (raw) | 2026-09-23 | President since 28 August 2014, born 1954 (age 72). Justice and Development Party. The page links the 2028 presidential election. |

The official site (https://www.tccb.gov.tr/en/) answered with a redirect that did not resolve to a readable page, so HEADS and TUR-1 carry this row. The office of prime minister was abolished in 2018, so the President holds both seats and the second seat is "same". `governing_parties` pairs the AKP with its People's Alliance partner, the Nationalist Movement Party, which backs it in parliament but holds no cabinet posts. That partnership is general knowledge, not something a source opened this session confirmed. The next presidential election is estimated at May 2028, five years after May 2023. EIU: hybrid regime (4.26).
