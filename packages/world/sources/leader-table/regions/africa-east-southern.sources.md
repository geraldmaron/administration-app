# East and southern Africa leader table: sources

Verified 2026-09-23 for 24 governments: ZAF, ETH, RWA, BDI, DJI, ERI, KEN, SOM, SSD, TZA, UGA, AGO, BWA, COM, SWZ, LSO, MDG, MWI, MUS, MOZ, NAM, SYC, ZMB, ZWE. Every URL below was opened on 2026-09-23 unless the row says otherwise. No incumbent is named in this file. A URL can carry a name because that is the page's address.

## Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (rendered page, and the same page's raw wikitext via `action=raw`, parsed row by row) | 2026-09-23 | EIU Democracy Index 2025 categories and scores (first data column is 2025, per the table header). Full democracy: Mauritius 8.23. Flawed democracy: Botswana 7.63, South Africa 7.16, Namibia 6.48, Lesotho 6.23, Malawi 6.10. Hybrid regime: Zambia 5.82, Tanzania 5.13, Madagascar 5.06, Kenya 5.05, Uganda 4.31. Authoritarian: Angola 3.94, Mozambique 3.38, Rwanda 3.34, Ethiopia 3.13, Zimbabwe 2.98, Comoros 2.81, Djibouti 2.70, Eswatini 2.60, Burundi 2.13, Eritrea 1.97. Somalia, South Sudan and Seychelles are not in the index. |
| FH-2026 | https://freedomhouse.org/country/somalia/freedom-world/2026 ; https://freedomhouse.org/country/south-sudan/freedom-world/2026 ; https://freedomhouse.org/country/seychelles/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026, used only for the three ids the EIU does not rate. Somalia Not Free (8/100). South Sudan Not Free (political rights 0/40, civil liberties 4/60). Seychelles Free (81/100). |
| WIP-2026 | https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026 and the PDF it links, https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (text extracted with `pdftotext -raw`) | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map: share of women among cabinet members who head ministries **as at 1 January 2026**. It is the newest edition, so it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from this table. An asterisk in the map (Eritrea, South Sudan, Comoros) means the figure came from publicly available information rather than a Permanent Mission submission. |
| REPO | `packages/world/src/dataset/people.ts` (authored nations' cultures), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` and `name-banks.vendored.ts` (culture keys) | 2026-09-23 | The repo already maps every one of these 24 ids to a bank key. The TSV uses those keys unchanged: ZAF and SWZ `southern-african`; ETH and ERI `east-african`; RWA and BDI `great-lakes`; DJI and SOM `somali`; KEN `kenyan`; SSD `south-sudanese`; TZA `tanzanian`; UGA `ugandan`; AGO and MOZ `lusophone`; BWA and LSO `sotho-tswana`; COM `arabic`; MDG `malagasy`; MWI and ZMB `zambian-malawian`; MUS `south-asian`; NAM `namibian`; SYC `french`; ZWE `zimbabwean`. |

Two caveats apply throughout.

1. The women-cabinet figures are a 1 January 2026 snapshot. They predate cabinets formed since then in Madagascar (March 2026), Djibouti (May 2026), Uganda (June 2026) and Zambia (after the September 2026 inauguration).
2. `surname_rule` is general onomastic knowledge applied to each country's political elite, not a sourced fact. Treat it as inference.

## How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Presidential systems get `head_of_state`. Ethiopia, Lesotho and Mauritius are parliamentary and get `head_of_government`. Eswatini's King rules and gets `head_of_state`.
- **Second seat.** I wrote `same` wherever the constitution makes the president head of government too, even where an appointed prime minister exists. That applies to Djibouti, Tanzania, Uganda, Mozambique and Namibia. The prime minister in those countries is a subordinate appointee, and I note each one's sex below in case the game wants it. A separate prime-minister seat is recorded only where the prime minister is the constitutional head of government: Rwanda, Burundi, Somalia, Madagascar and Eswatini. For Mozambique I checked the constitution directly (MOZ-3), because Wikipedia's own pages disagree on that point.
- **Regime type.** I used the EIU 2025 category except where the form of government calls for a special type. Eswatini gets `absolute_monarchy` (EIU: authoritarian). Eritrea gets `one_party_state` (EIU: authoritarian), because the PFDJ is the only permitted party and no national election has ever been held. Madagascar gets `military_junta` (EIU 2025: hybrid regime, 5.06), because an army-officer council has governed since the October 2025 takeover. For the three ids the EIU does not rate I used Freedom House 2026: Somalia and South Sudan Not Free, so `authoritarian`, and Seychelles Free (81/100), so `flawed_democracy`. The Seychelles mapping is my own analogy, not an EIU rating.
- **Next leader selection.** This is the next event that could replace the person in the leader seat. Where no electoral body has published a date, I derived the month from the previous election plus the constitutional term, and the nation's note says so.

## South Africa (ZAF)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZAF-1 | https://en.wikipedia.org/wiki/Cyril_Ramaphosa | 2026-09-23 | The President has been in office since February 2018 and was re-elected by the National Assembly on 14 June 2024 for a second and final term. Born November 1952, so 73 on the as-of date. |
| ZAF-2 | https://www.cnbcafrica.com/2026/south-africas-president-booked-off-from-public-engagements-over-ill-health | 2026-09-23 | Dated news (2026-09-17): the Presidency booked the President off public engagements on medical advice. He remains in office, no acting president was named, age 73. The Deputy President is also recovering from a procedure. |
| ZAF-3 | https://www.dailymaverick.co.za/article/2026-09-20-ramaphosa-found-his-voice-abroad-but-he-lost-it-at-home/ | 2026-09-23 | Dated news (2026-09-20): the President is still in office, in the "lame-duck" final phase of his tenure, and on sick leave during a row over US visa restrictions. |
| ZAF-4 | https://en.wikipedia.org/wiki/Government_of_National_Unity_(South_Africa) | 2026-09-23 | The ten parties of the Government of National Unity formed in June 2024. The page records no departure. |

The President is head of state and government, so the second seat is `same`. `governing_parties` lists the ten GNU parties. I found no source reporting a party leaving the GNU in 2025 or 2026, but ZAF-4 has no 2026 update, so treat the full list as unconfirmed for 2026. Next selection: 2029-05, derived from the May 2024 election and the five-year National Assembly term. The President is term-limited, and the ANC's leadership conference, due in 2027, will choose its next candidate.

## Ethiopia (ETH)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ETH-1 | https://en.wikipedia.org/wiki/Abiy_Ahmed | 2026-09-23 | The Prime Minister has been in office since 2 April 2018 and leads the Prosperity Party. Born August 1976, so 50 on the as-of date. |
| ETH-2 | https://en.wikipedia.org/wiki/2026_Ethiopian_general_election | 2026-09-23 | The general election was held on 1 June 2026. The Prosperity Party won 438 seats, and no vote was held in Tigray or parts of Amhara and Oromia. |
| ETH-3 | https://www.dawan.africa/news/ethiopias-prosperity-party-secures-parliamentary-majority-paving-way-for-abiys-new-term | 2026-09-23 | Dated news (2026-06-22): the new House is "expected to convene in October," when it will formally reappoint the Prime Minister. |
| ETH-4 | https://www.aljazeera.com/news/2026/6/1/ethiopia-holds-elections-with-pm-abiys-party-expected-to-dominate | 2026-09-23 | Dated news (2026-06-01): the election was held, and the PM was 49 on that date, which matches an August birthday. |
| ETH-5 | https://en.wikipedia.org/wiki/Taye_Atske_Selassie | 2026-09-23 | The President (male) has been head of state since 7 October 2024. The post is ceremonial. |

Next selection is 2026-10, when the new House is due to re-elect the Prime Minister. That vote is a formality, but it is a scheduled selection.

## Rwanda (RWA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| RWA-1 | https://en.wikipedia.org/wiki/Paul_Kagame | 2026-09-23 | The President has been in office since April 2000 and leads the RPF. Born October 1957, so 68 on the as-of date. Terms are five years under the 2015 amendment. |
| RWA-2 | https://en.wikipedia.org/wiki/2024_Rwandan_general_election | 2026-09-23 | The President was re-elected on 15 July 2024 with 99.18% and inaugurated on 11 August 2024. The RPF governs with allied parties. |
| RWA-3 | https://www.primature.gov.rw/news-detail/pm-nsengiyumva-officially-sworn-in-as-prime-minister | 2026-09-23 | Primary source (Office of the Prime Minister): a new Prime Minister (male), appointed by the President, was sworn in on 25 July 2025. |

The constitution requires power-sharing, so ministers from allied parties sit in cabinet. The RPF is the governing party. Next selection: 2029-07, derived from the July 2024 election and the five-year term.

## Burundi (BDI)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BDI-1 | https://en.wikipedia.org/wiki/%C3%89variste_Ndayishimiye | 2026-09-23 | The President has been in office since 18 June 2020 for a seven-year term and belongs to CNDD-FDD. Born June 1968, so 58 on the as-of date. He is African Union chairperson from February 2026. |
| BDI-2 | https://en.wikipedia.org/wiki/Nestor_Ntahontuye | 2026-09-23 | A new Prime Minister (male), formerly finance minister, took office on 5 August 2025. His predecessor moved to the Senate presidency. |
| BDI-3 | https://www.thestar.com.my/news/world/2026/05/09/burundi-announces-schedule-for-2027-presidential-election | 2026-09-23 | Dated news (Bujumbura, 2026-05-08): the electoral commission set the presidential election for 3 May 2027, with the swearing-in on 18 June 2027. The ruling party nominated the incumbent on 26 April, and the term is renewable once. |

Next selection: 2027-05.

## Djibouti (DJI)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| DJI-1 | https://www.aljazeera.com/news/2026/4/11/djiboutis-president-guelleh-claims-sixth-straight-term-in-office | 2026-09-23 | Dated news (2026-04-11): the President won a sixth term on 10 April 2026 with 97.81%, aged 78. The age limit was removed in 2025, and the article gives a five-year term. |
| DJI-2 | https://en.wikipedia.org/wiki/2026_in_Djibouti | 2026-09-23 | The President was sworn in on 9 May 2026. A new 26-member cabinet with 8 women was named on 17 May 2026. The incumbent Prime Minister is male. |
| DJI-3 | https://en.wikipedia.org/wiki/Isma%C3%AFl_Omar_Guelleh | 2026-09-23 | The President has been in office since 8 May 1999. Born November 1947. Party RPP, coalition UMP. |

The President is head of government under the constitution, so the second seat is `same`. The Prime Minister (male) is appointed. DJI-3 says six-year terms and DJI-1 says five. I used five, the dated news figure, which gives a next selection of 2031-04. The May 2026 cabinet had about 31% women, against 21.7% in the 1 January map.

## Eritrea (ERI)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ERI-1 | https://en.wikipedia.org/wiki/Isaias_Afwerki | 2026-09-23 | The President has been in office since 24 May 1993 and chairs the National Assembly, so he is head of state and government. Born February 1946, so 80. The PFDJ is the sole party, and the elections scheduled for 2001 were postponed indefinitely. He gave the May 2026 Independence Day address. |

Next selection: none scheduled.

## Kenya (KEN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| KEN-1 | https://en.wikipedia.org/wiki/William_Ruto | 2026-09-23 | The President has been in office since 13 September 2022 and leads the UDA, heading a "broad-based government" that includes ODM. Born December 1966, so 59. |
| KEN-2 | https://www.the-star.co.ke/news/2026-06-24-iebc-confirms-august-10-as-date-for-2027-general-election | 2026-09-23 | Dated news (2026-06-24): the electoral commission confirmed Tuesday 10 August 2027 as general election day. |
| KEN-3 | https://en.wikipedia.org/wiki/Orange_Democratic_Movement | 2026-09-23 | ODM's founding leader died on 15 October 2025, and a new leader was elected on 27 March 2026. A March 2025 memorandum of understanding binds ODM to cooperate with the President. The page says ODM is "not part of" the administration. |

`governing_parties` is a judgment call. ODM-affiliated figures have held cabinet posts under the 2025 memorandum. KEN-3 frames that as cooperation rather than a formal coalition, so I list UDA as the governing party and ODM as a partner. Next selection: 2027-08.

## Somalia (SOM)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SOM-1 | https://en.wikipedia.org/wiki/Hassan_Sheikh_Mohamud | 2026-09-23 | The President is incumbent, born November 1955 (70). The page records the dispute over whether his mandate ended on 15 May 2026. The Prime Minister (male) has been in office since June 2022. |
| SOM-2 | https://somaliatoday.com/politics/somalias-president-defies-opposition-claims-2027-mandate-2026-05-16/ | 2026-09-23 | Dated news (2026-05-16): the President says the mandates of parliament and government run to 15 May 2027 under the constitutional amendments. The opposition says his four-year term expired on 15 May 2026. No polling date was set. |
| SOM-3 | https://www.somaliguardian.com/news/somalia-news/somalia-president-forms-coalition-bloc-eyes-third-term-amid-vote-row/ | 2026-09-23 | Dated news (2025-05-14): the President formed the Justice and Solidarity Party, and the Prime Minister became one of its deputy leaders. |
| SOM-4 | https://citizen.digital/article/ahmedfiqi-hits-the-ground-as-somalias-2027-presidential-polls-take-shape-n390212 | 2026-09-23 | Dated news (2026-09-15): the 2027 presidential vote is being prepared, but its framework (direct vote or not) is still being negotiated. |

The seat is contested. The government holds it in practice, and it remains the seat a foreign president deals with. Next selection is 2027-05, the end of the mandate the government claims. No electoral body has fixed a polling date, so treat that month as soft. The regime type comes from FH-2026, since the EIU does not rate Somalia.

## South Sudan (SSD)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SSD-1 | https://en.wikipedia.org/wiki/Salva_Kiir_Mayardit | 2026-09-23 | The President has been in office since independence on 9 July 2011 and leads the SPLM. Born September 1951, so 75. |
| SSD-2 | https://www.cnbcafrica.com/2026/south-sudans-president-signs-election-law-changes-ahead-of-december-vote | 2026-09-23 | Dated news (2026-09-22): the President signed election-law amendments ahead of the 22 December 2026 vote. The incumbent executive keeps full powers until a successor takes office, and the vice presidents must leave office within three months before election day. |

The President is head of state and government. The governing arrangement is the SPLM-led transitional unity government. The first vice president, from the main opposition, is detained and on trial (FH-2026 records his suspension). The regime type comes from FH-2026. Next selection: 2026-12.

## Tanzania (TZA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TZA-1 | https://en.wikipedia.org/wiki/Samia_Suluhu_Hassan | 2026-09-23 | The President (female) has been in office since 19 March 2021. She was declared winner of the disputed October 2025 election with 97.66% and inaugurated on 3 November 2025. Born January 1960, so 66. Party CCM. Next election in 2030. |
| TZA-2 | https://en.wikipedia.org/wiki/Mwigulu_Nchemba | 2026-09-23 | A new Prime Minister (male) took office on 13 November 2025. |
| TZA-3 | https://thechanzo.com/2025/11/13/dr-mwigulu-nchemba-appointed-new-prime-minister-of-tanzania/ | 2026-09-23 | Dated news (2025-11-13, Dodoma): parliament confirmed the appointment 369 votes to 371. |

The President is head of government under the constitution, so the second seat is `same`. The Prime Minister is male. Next selection: 2030-10, derived from the October 2025 election and the five-year term.

## Uganda (UGA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| UGA-1 | https://en.wikipedia.org/wiki/Yoweri_Museveni | 2026-09-23 | The President has been in office since 29 January 1986 and was re-elected in January 2026 (71.65%). He was sworn in on 12 May 2026. Party NRM. Born September 1944, so 82. |
| UGA-2 | https://www.monitor.co.ug/uganda/news/national/museveni-unveils-new-cabinet-retains-nabbanja-alupo-and-janet-in-key-reshuffle-5474810 | 2026-09-23 | Dated news (2026-05-26): the 2026-2031 cabinet was named. The Prime Minister (female) and the Vice President (female) were retained. |

The President is head of state and government, so the second seat is `same`. The Prime Minister is female and leads government business. Next selection: 2031-01, derived from the January 2026 election and the five-year term.

## Angola (AGO)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| AGO-1 | https://en.wikipedia.org/wiki/Jo%C3%A3o_Louren%C3%A7o | 2026-09-23 | The President is incumbent, in office since 26 September 2017. Party MPLA. Born March 1954, so 72. The Vice President is female. |
| AGO-2 | https://en.wikipedia.org/wiki/2027_Angolan_general_election | 2026-09-23 | The general election is due "by August 2027", and the incumbent is term-limited. |

Next selection: 2027-08. The MPLA congress in December 2026 is expected to shape the succession, but the leader seat changes only at the 2027 election.

## Botswana (BWA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BWA-1 | https://en.wikipedia.org/wiki/Duma_Boko | 2026-09-23 | The President has been in office since 1 November 2024 and leads the Umbrella for Democratic Change coalition. Born 31 December 1969, so 56. The page records a state visit he hosted in September 2026, which confirms he is still in office. |

Next selection: 2029-10, derived from the October 2024 election and the five-year term.

## Comoros (COM)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COM-1 | https://en.wikipedia.org/wiki/Azali_Assoumani | 2026-09-23 | The President's current continuous tenure began on 3 April 2019, after an acting interim from February 2019. He previously served 1999 to 2006 and 2016 to 2019. Re-elected in January 2024. Party CRC. Born 1 January 1959, so 67. In August 2024 he handed wide powers to a relative as secretary-general of government. There is no prime minister. |

Next selection: 2029-01, derived from the January 2024 election and the five-year term.

## Eswatini (SWZ)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SWZ-1 | https://en.wikipedia.org/wiki/Mswati_III | 2026-09-23 | The King has reigned since 25 April 1986, marked his 40th anniversary in April 2026 and took the SADC Organ chair in August 2026. Born April 1968, so 58. |
| SWZ-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Eswatini | 2026-09-23 | The Prime Minister (male), appointed by the King, has served since 4 November 2023. |

Parties cannot contest elections under the tinkhundla system, so `governing_parties` is `none (nonpartisan)`. Next selection: none scheduled.

## Lesotho (LSO)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LSO-1 | https://en.wikipedia.org/wiki/Sam_Matekane | 2026-09-23 | The Prime Minister has been in office since 28 October 2022 and founded the RFP. Born March 1958, so 68. |
| LSO-2 | https://en.wikipedia.org/wiki/Next_Lesotho_general_election | 2026-09-23 | The next general election is due "by October 2027". |
| LSO-3 | https://bti-project.org/en/reports/country-report/LSO | 2026-09-23 | BTI 2026: the coalition is RFP, MEC and AD. The Basotho Action Party joined in October 2023 and "has since left" by November 2024. |
| LSO-4 | https://en.wikipedia.org/wiki/Cabinet_of_Sam_Matekane | 2026-09-23 | The cabinet page (updated May 2026) still lists BAP, LCD and LPC as partners since November 2023. |

LSO-3 and LSO-4 disagree. I followed BTI on BAP's exit and listed only the three core parties. LCD and LPC may still hold posts, which I could not confirm. The King (male) is head of state. Next selection: 2027-10.

## Madagascar (MDG)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MDG-1 | https://en.wikipedia.org/wiki/Michael_Randrianirina | 2026-09-23 | An army colonel (male, born 1974, so 51 or 52) took power during the October 2025 protests and assumed office on 17 October 2025. The Prime Minister was replaced on 15 March 2026. |
| MDG-2 | https://en.wikipedia.org/wiki/Council_of_the_Presidency_for_the_Re-Foundation_of_the_Republic_of_Madagascar | 2026-09-23 | The title is "President of the Refoundation of the Republic of Madagascar". The ruling council of Armed Forces and Gendarmerie officers has governed since 14 October 2025, and most institutions were dissolved except the National Assembly. The roadmap runs 24 months, and this page puts the presidential election in September 2027. |
| MDG-3 | https://www.africanews.com/2026/05/11/madagascar-presidential-election-scheduled-for-october-2027/ | 2026-09-23 | Dated news (2026-05-11): the electoral commission set a constitutional referendum for June 2027 and the presidential election for October 2027. |
| MDG-4 | https://www.occrp.org/en/news/madagascars-transitional-leader-taps-anti-corruption-expert-as-prime-minister | 2026-09-23 | Dated news (2026-03-16): the transitional president named a new Prime Minister (male), a civilian anti-corruption official, about a week after dismissing the previous government. |

EIU 2025 rates Madagascar a hybrid regime (5.06), but I overrode it to `military_junta`. Next selection is 2027-10, from the electoral commission's calendar in MDG-3, which is later than the September date in MDG-2. The 33.3% women-cabinet figure describes the government in place on 1 January 2026, which was replaced in March.

## Malawi (MWI)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MWI-1 | https://en.wikipedia.org/wiki/Peter_Mutharika | 2026-09-23 | The President is in office from 4 October 2025 (a return; he previously served 2014 to 2020). Party DPP. Born July 1940, so 86. The Vice President is female. |
| MWI-2 | https://en.wikipedia.org/wiki/Second_Vice-President_of_Malawi | 2026-09-23 | The Second Vice President, appointed 5 October 2025, leads AFORD, which allied with the DPP before the election. |
| MWI-3 | https://en.wikipedia.org/wiki/2025_Malawian_general_election | 2026-09-23 | The election was held on 16 September 2025. The incumbent won 56.76% and was inaugurated on 4 October 2025. |

I could not open a dated wire story for the 2025 change: the AP, BBC and Washington Times links were blocked or returned 403. MWI-3 cites Reuters, AP and BBC coverage. Next selection: 2030-09, derived from the September 2025 election and the five-year term.

## Mauritius (MUS)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MUS-1 | https://en.wikipedia.org/wiki/Navin_Ramgoolam | 2026-09-23 | The Prime Minister has been in office since 12 November 2024 (third tenure). Labour Party. Born July 1947, so 79. The Alliance du Changement won 60 to 0 in November 2024. |
| MUS-2 | https://en.wikipedia.org/wiki/President_of_Mauritius | 2026-09-23 | The President (male), elected by the National Assembly, has served since 6 December 2024. |
| MUS-3 | https://en.wikipedia.org/wiki/Fourth_Navin_Ramgoolam_cabinet | 2026-09-23 | As of August 2026, six parties support the government. The MMM's leader resigned as Deputy PM, and an MMM successor (female) took over on 4 May 2026. The MMM stays in government. There are 2 women among 24 ministers. |

Next selection: 2029-11, derived from the November 2024 election and the five-year term.

## Mozambique (MOZ)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MOZ-1 | https://en.wikipedia.org/wiki/Daniel_Chapo | 2026-09-23 | The President has been in office since 15 January 2025 after the disputed October 2024 election. FRELIMO. Born January 1977, so 49. |
| MOZ-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Mozambique | 2026-09-23 | The Prime Minister (female) has served since January 2025. |
| MOZ-3 | https://www.constituteproject.org/constitution/Mozambique_2007 | 2026-09-23 | Primary text: Article 146 makes the head of state also head of government, and Article 160 lets the President appoint and dismiss the Prime Minister. |

Second seat: `same`, per MOZ-3. The Prime Minister is female. Next selection: 2029-10, derived from the October 2024 election and the five-year term.

## Namibia (NAM)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NAM-1 | https://en.wikipedia.org/wiki/Netumbo_Nandi-Ndaitwah | 2026-09-23 | The President (female) has been in office since 21 March 2025. SWAPO. Born October 1952, so 73. The Vice President is female. |
| NAM-2 | https://en.wikipedia.org/wiki/Elijah_Ngurare | 2026-09-23 | The Prime Minister (male), appointed by the President, has served since 21 March 2025. |

The President is head of state and government, so the second seat is `same`. I could not reach the presidency site (op.gov.na refused the connection), so no 2026-dated source confirms her incumbency. Nothing I read suggests a change. Next selection: 2029-11, derived from the November 2024 election and the five-year term.

## Seychelles (SYC)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SYC-1 | https://www.statehouse.gov.sc/news/6600/dr-patrick-herminie-sworn-in-as-sixth-president-of-the-republic-of-seychelles | 2026-09-23 | Primary source (State House): the sixth President was sworn in on the evening of Sunday 26 October 2025, and the outgoing president attended. |
| SYC-2 | https://en.wikipedia.org/wiki/Patrick_Herminie | 2026-09-23 | The President has been in office since 26 October 2025. United Seychelles. Born September 1963, so 63. |
| SYC-4 | https://en.wikipedia.org/wiki/2025_Seychellois_general_election | 2026-09-23 | The runoff on 9 to 11 October 2025 went 52.73% to 47.27%. United Seychelles won 19 of 34 Assembly seats. |

The regime type comes from FH-2026, since the EIU does not rate Seychelles. Next selection: 2030-10, the end of the five-year term.

## Zambia (ZMB)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZMB-1 | https://www.aljazeera.com/news/2026/9/1/hakainde-hichilema-returns-as-zambias-president-following-disputed-vote | 2026-09-23 | Dated news (2026-09-01): the President was sworn in for a second term after the disputed 13 August 2026 vote, with about 60%. The Vice President (female) was sworn in with him. |
| ZMB-2 | https://en.wikipedia.org/wiki/Hakainde_Hichilema | 2026-09-23 | The President has been in office since 24 August 2021. UPND. Born June 1962, so 64. |

Next selection: 2031-08, derived from the August 2026 election and the five-year term.

## Zimbabwe (ZWE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZWE-1 | https://www.aljazeera.com/news/2026/6/24/zimbabwes-senate-approves-amendment-extending-presidential-term | 2026-09-23 | Dated news (2026-06-24): the Senate passed the amendment 75 to 4. Presidential and parliamentary terms go from five to seven years, the president will be elected by parliament, and the incumbent (then 83) stays until 2030. |
| ZWE-2 | https://www.africanews.com/2026/07/07/zimbabwes-mnangagwa-signs-law-extending-presidency-to-2030/ | 2026-09-23 | Dated news (2026-07-07): the President signed the amendment into law. |
| ZWE-3 | https://en.wikipedia.org/wiki/2030_Zimbabwean_parliamentary_election | 2026-09-23 | The next parliamentary election is due "on or before 5 August 2030" under the Constitution Amendment (No. 3) Act, 2026. Parliament sitting jointly then elects the president. |
| ZWE-4 | https://en.wikipedia.org/wiki/Emmerson_Mnangagwa | 2026-09-23 | The President has been in office since 24 November 2017. ZANU-PF. Born 15 September 1942, so 84 on the as-of date. |

Next selection is 2030-08: the parliamentary election, after which parliament elects the president. One source title I saw but did not open (allAfrica, 2026-07-21) reports a ZANU-PF push to extend the presidency again, to 2037. Treat 2030 as the current legal date only.
