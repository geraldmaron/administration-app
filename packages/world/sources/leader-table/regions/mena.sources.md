# MENA leader table: sources

Verified 2026-09-23 for 21 governments: SAU, IRQ, IRN, ISR, ARE, YEM, SYR, EGY, MAR, DZA, QAT, BHR, JOR, KWT, LBN, OMN, PSE, LBY, MRT, SDN, TUN. Every URL below was opened on 2026-09-23. No incumbent is named in this file. A URL can carry a name because that is the page's address.

## Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (rendered page, and the same page's raw wikitext via `action=raw`) | 2026-09-23 | EIU Democracy Index 2025 categories: Israel flawed democracy (7.80); Morocco hybrid (4.97); Tunisia hybrid (4.65); every other MENA id authoritarian (Mauritania 3.84, down from 3.96; Sudan 1.46; Syria 1.37). The EIU report itself is behind registration, so this is the table of record I could open. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map, women among cabinet members who head ministries **as at 1 January 2026**. This is the most recent edition and it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from here. Palestine is not ranked. |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The 2025 edition (as at 1 January 2025), opened to cross-check. Not used in the TSV. It had Syria "information not available" and also leaves Palestine unranked. |
| REPO | `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` (`NAME_CULTURES`) | 2026-09-23 | The repo already maps 19 of these ids to `arabic`, IRN to `persian` and ISR to `hebrew`. The TSV uses those keys unchanged. |

A women-cabinet caveat applies throughout. The map is a 1 January 2026 snapshot, so it predates the cabinets that Iraq (May 2026), Yemen (February 2026) and Egypt (February 2026 reshuffle) formed since.

## How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Monarchies with a ruling king, emir or sultan get `head_of_state`. Saudi Arabia is the exception, covered below. Parliamentary systems get `head_of_government` (Iraq, Israel, Lebanon). So does Libya, where the prime minister of the recognized government is the working executive.
- **Regime type.** I used the EIU 2025 category except where the form of government calls for a special type. Hereditary monarchies with no empowered elected chamber get `absolute_monarchy` (SAU, ARE, QAT, OMN; KWT while its parliament is suspended). Monarchies where the king rules through a constitution and an elected lower house get `constitutional_monarchy_executive` (MAR, JOR, BHR). Iran gets `theocracy`, and Sudan's army-led council gets `military_junta`. Each row notes the EIU category it overrode.
- **Next leader selection.** This is the next event that could replace the person in the leader seat, not every election on the calendar.

## Saudi Arabia (SAU)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SAU-1 | https://en.wikipedia.org/wiki/King_of_Saudi_Arabia | 2026-09-23 | The King is incumbent (reigning since 2015, age 90) and holds "absolute power". The Crown Prince (born 1985, age 41) is also Prime Minister. |
| SAU-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Saudi_Arabia | 2026-09-23 | The Crown Prince became Prime Minister by royal decree on 27 September 2022, which made him head of government while the King stays head of state. |
| SAU-3 | https://en.wikipedia.org/wiki/Salman_of_Saudi_Arabia | 2026-09-23 | The King is still reigning. The page calls the Crown Prince "de facto ruler" because of the King's poor health. |

The leader seat is **head_of_government**, on the brief's rule: the Crown Prince and Prime Minister is the effective ruler (SAU-3), so the row describes him. The King goes in `second_seat`. Political parties are banned. EIU: authoritarian, overridden to absolute_monarchy. Next selection: none scheduled, since succession is dynastic.

## Iraq (IRQ)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| IRQ-1 | https://en.wikipedia.org/wiki/Prime_Minister_of_Iraq | 2026-09-23 | A new Prime Minister has been in office since 14 May 2026, succeeding the 2022 to 2026 incumbent, who served as caretaker after the November 2025 election. The President was also newly elected. |
| IRQ-2 | https://www.aljazeera.com/news/2026/5/14/iraqs-parliament-approves-new-ali-al-zaidi-government | 2026-09-23 | Dated news (2026-05-14): parliament approved the government, and the new PM, aged 40, is Iraq's youngest. He was the Coordination Framework's compromise pick after its first nominee was dropped under US pressure. |
| IRQ-3 | https://www.thenationalnews.com/news/mena/2026/05/14/iraqi-parliament-votes-on-thursday-in-key-step-towards-installing-government/ | 2026-09-23 | Dated news (2026-05-14): the President named the PM-designate on 27 April. It gives his age as 41, which is still in the 40-49 band. 14 of 23 portfolios were filled and 9 left vacant, among them defense and interior. |
| IRQ-4 | https://en.wikipedia.org/wiki/2026_Iraqi_presidential_election | 2026-09-23 | Parliament elected the new President (Patriotic Union of Kurdistan) on 11 April 2026 with 227 votes in the second round. The predecessor did not run. |
| IRQ-5 | https://www.euronews.com/2026/05/15/iraq-swears-in-new-prime-minister-as-us-presses-baghdad-to-disarm-iran-backed-groups | 2026-09-23 | Dated news (2026-05-15): the PM is a businessman and political outsider, backed by the Coordination Framework. |
| IRQ-6 | https://www.longwarjournal.org/archives/2026/05/iraq-forms-new-government-with-only-14-of-23-ministers.php | 2026-09-23 | Dated news (2026-05-15): approved ministers by nominating party. Coordination Framework members (Hikma, Badr), KDP, PUK, New Generation, Taqaddum and Sovereignty (Siyada) each hold portfolios. One of the 14 is a woman. |

Next selection is 2029-11. That is an estimate from the Council of Representatives' four-year term after the November 2025 vote; no election date has been set. `women_cabinet_share` is 13.0 (3/23) from WIP-2026, which describes the previous cabinet. On IRQ-6's count the new cabinet has 1 woman among 14 approved ministers. EIU: authoritarian (3.13).

## Iran (IRN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| IRN-1 | https://en.wikipedia.org/wiki/Supreme_Leader_of_Iran | 2026-09-23 | The previous Supreme Leader was assassinated on 28 February 2026. An interim leadership council served from 1 March. The new Supreme Leader (born 1969, son of the predecessor) took office on 8 March 2026 and is incumbent. The President (in office since 2024) is still in office. |
| IRN-2 | https://en.wikipedia.org/wiki/2026_Iranian_supreme_leader_election | 2026-09-23 | The Assembly of Experts sat 3 to 8 March 2026 and the result was announced 9 March. Authorities confirmed the new leader was injured in the strikes, and he has made no public appearances. Some clerics dispute his fitness. |
| IRN-3 | https://www.leader.ir/en | 2026-09-23 | Primary source, the Office of the Supreme Leader. Items dated June 2026 carry messages issued in the new Supreme Leader's name. |
| IRN-4 | https://fortune.com/2026/09/06/supreme-leader-mojtaba-khamenei-iran-economy-social-cohesion-us-pressure-inflation-gas-shortage-rial-currency/ | 2026-09-23 | Dated news (2026-09-06): still described as Supreme Leader, issuing written statements in late August 2026, not seen in public since February. |
| IRN-5 | https://en.wikipedia.org/wiki/Masoud_Pezeshkian | 2026-09-23 | The President has been in office since 28 July 2024. He sat on the March 2026 interim council and attended UNGA in September 2026. |

The row describes the Supreme Leader's seat. The President (M) is `second_seat`. Iran has no ruling party; factions compete inside the clerical system, so `governing_parties` is "none (nonpartisan)". EIU: authoritarian (1.96), overridden to theocracy. Next selection: none scheduled, because the Supreme Leader serves for life at the Assembly of Experts' pleasure.

## Israel (ISR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ISR-1 | https://en.wikipedia.org/wiki/2026_Israeli_legislative_election | 2026-09-23 | The election is 27 October 2026 and the Knesset dissolved 17 July 2026. The coalition at dissolution was Likud, Shas, Otzma Yehudit, Religious Zionist Party and New Hope. The incumbent PM leads Likud. |
| ISR-2 | https://www.aljazeera.com/news/2026/7/17/knesset-dissolves-how-will-israel-vote-in-octobers-general-election | 2026-09-23 | Dated news (2026-07-17) confirming the dissolution and the 27 October 2026 date. |
| ISR-3 | https://en.wikipedia.org/wiki/Thirty-seventh_government_of_Israel | 2026-09-23 | UTJ left in July 2025. Shas gave up its ministries in July 2025 but stayed in the coalition. Otzma Yehudit left in January 2025 and rejoined in March 2025. |
| ISR-4 | https://en.wikipedia.org/wiki/President_of_Israel | 2026-09-23 | The President has served since 7 July 2021; the term ends 7 July 2028. |

The PM (born 1949, age 76) has held the current continuous term since December 2022, recorded as 2022. EIU: flawed democracy (7.80).

## United Arab Emirates (ARE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ARE-1 | https://u.ae/en/about-the-uae/the-uae-government/the-federal-supreme-council | 2026-09-23 | Primary source, the UAE government portal. The President (Ruler of Abu Dhabi) was elected by the Federal Supreme Council on 14 May 2022. The Ruler of Dubai is Vice President. |
| ARE-2 | https://en.wikipedia.org/wiki/President_of_the_United_Arab_Emirates | 2026-09-23 | The Federal Supreme Council elects the President to a five-year renewable term, with the next vote due in 2027. The Vice President is also Prime Minister. |
| ARE-3 | https://en.wikipedia.org/wiki/Mohamed_bin_Zayed_Al_Nahyan | 2026-09-23 | Born 11 March 1961 (age 65), President since 14 May 2022, incumbent. |

Next selection is 2027-05, when the Federal Supreme Council's five-year re-election falls due. In practice it is a formality. EIU: authoritarian (3.18), overridden to absolute_monarchy (a federation of hereditary rulers).

## Yemen (YEM)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| YEM-1 | https://en.wikipedia.org/wiki/Presidential_Leadership_Council | 2026-09-23 | The PLC chair has served since 7 April 2022. The STC leader was expelled on 7 January 2026 and a second member removed on 15 January, with two replacements seated the same day. Members' factions are Al-Islah (two vice presidents), National Resistance and Giants Brigades. There are no women members. |
| YEM-2 | https://www.mofa-ye.org/Pages/36202/ | 2026-09-23 | Primary source, the Foreign Ministry. PLC Chairman's Decree No. 17 of 2026 (16 January 2026) appointed the new Prime Minister. |
| YEM-3 | https://en.wikipedia.org/wiki/2026_in_Yemen | 2026-09-23 | The new PM was appointed 15 January 2026 and the cabinet announced 6 February. The STC announced its dissolution on 9 January (disputed). The Houthi Supreme Political Council still governs Sanaa. |
| YEM-4 | https://en.wikipedia.org/wiki/Rashad_al-Alimi | 2026-09-23 | The chair was born 15 January 1954 (age 72) and is incumbent. |
| YEM-5 | https://en.wikipedia.org/wiki/Shaya_al-Zindani | 2026-09-23 | The PM has been in office since 6 February 2026. |

This row covers the internationally recognized government only; the Houthis (Ansar Allah) hold Sanaa and much of the north. `governing_parties` lists the factions seated on the PLC. EIU: authoritarian (1.95). Next selection: none scheduled.

## Syria (SYR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SYR-1 | https://en.wikipedia.org/wiki/Presidency_of_Ahmed_al-Sharaa | 2026-09-23 | The transitional President has served since 29 January 2025. The prime minister post was abolished on 29 March 2025. The Constitutional Declaration sets a five-year transition. Indirect People's Assembly elections were held October 2025. One woman minister is named. |
| SYR-2 | https://en.wikipedia.org/wiki/Ahmed_al-Sharaa | 2026-09-23 | Born 29 October 1982 (age 43), independent since 2025, incumbent. The vice president post is vacant. |

`second_seat` is "none" because there is no prime minister. No party law is in force, so parties play no role in government ("none (nonpartisan)"). Next selection is 2030-03, the end of the five-year transitional period that began with the Constitutional Declaration in March 2025. Elections are expected then, but none is scheduled. `women_cabinet_share` is 4.3 (1/23; WIP-2026 marks it compiled from public information). EIU: authoritarian (1.37).

## Egypt (EGY)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EGY-1 | https://en.wikipedia.org/wiki/Abdel_Fattah_el-Sisi | 2026-09-23 | The President (born 19 November 1954, age 71) has been in office since 8 June 2014 and is incumbent. The PM is still in post. |
| EGY-2 | https://en.wikipedia.org/wiki/Next_Egyptian_presidential_election | 2026-09-23 | Six-year term, two-round system; the next election is due around 2030. |
| EGY-3 | https://en.wikipedia.org/wiki/Mostafa_Madbouly | 2026-09-23 | The PM has been in office since 14 June 2018 and is an independent. |
| EGY-4 | https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election | 2026-09-23 | In the November 2025 House election, Nation's Future won the most seats (231 including appointees) at the head of the pro-government National Unified List. |

Next selection is 2029-12, an estimate. The current term runs to April 2030, and the constitution opens the election process at least 120 days before the term ends, which is how the December 2023 vote was timed. No date is set, and the incumbent cannot run again under the 2019 amendments. The President and the cabinet are nonpartisan, so `governing_parties` names the parliamentary majority. EIU: authoritarian (2.79).

## Morocco (MAR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MAR-1 | https://en.wikipedia.org/wiki/Mohammed_VI_of_Morocco | 2026-09-23 | The King (born 21 August 1963, age 63) has reigned since 23 July 1999 and is incumbent. Under the 2011 constitution he appoints the Head of Government from the party that wins the most seats. |
| MAR-2 | https://en.wikipedia.org/wiki/Aziz_Akhannouch | 2026-09-23 | The Head of Government (M) has served since 7 October 2021, leading an RNI, PAM and Istiqlal coalition. He stepped down as RNI leader in January 2026. |
| MAR-3 | https://en.wikipedia.org/wiki/2026_Moroccan_general_election | 2026-09-23 | The House of Representatives election is being held **today, 23 September 2026**. PAM is led by a woman. The page's seat figures are the 2021 results, and I could not confirm any 2026 result. |

Morocco is in the uncertain list. The leader seat (King) is unaffected, but the second seat will change hands, because the outgoing Head of Government no longer leads his party. If PAM places first, the second seat could be held by a woman. `second_seat_sex` records the incumbent as of 2026-09-23. EIU: hybrid (4.97), overridden to constitutional_monarchy_executive. Next selection: none scheduled.

## Algeria (DZA)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| DZA-1 | https://en.wikipedia.org/wiki/Abdelmadjid_Tebboune | 2026-09-23 | The President (born 17 November 1945, age 80) has been in office since 19 December 2019. He was re-elected in 2024, is limited to two terms, and sits as an independent. |
| DZA-2 | https://en.wikipedia.org/wiki/Sifi_Ghrieb | 2026-09-23 | The PM (M) has been incumbent since September 2025 (page revised 31 August 2026). |
| DZA-3 | https://en.wikipedia.org/wiki/Ghrieb_government | 2026-09-23 | The government was formed 15 September 2025: 38 members from the FLN, the RND and independents. |
| DZA-4 | https://en.wikipedia.org/wiki/2026_Algerian_parliamentary_election | 2026-09-23 | In the 2 July 2026 legislative election the FLN took 91 seats, RND 74 and Future Front 56, on 20.88% turnout. The FLN and RND minority government continues. |
| DZA-5 | https://allafrica.com/stories/202609020040.html | 2026-09-23 | Dated news (2026-09-01): the President carried out a partial reshuffle of four portfolios in consultation with the sitting PM. It was not a new government. |
| DZA-6 | https://www.aa.com.tr/en/politics/algerian-president-appoints-new-prime-minister/3687262 | 2026-09-23 | Dated news (2025-09-14): appointment of the current PM. |

Next selection is 2029-09: a five-year term from the September 2024 vote, and the incumbent is term-limited. EIU: authoritarian (3.55).

## Qatar (QAT)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| QAT-1 | https://en.wikipedia.org/wiki/Emir_of_Qatar | 2026-09-23 | The Emir (born 3 June 1980, age 46) has reigned since 25 June 2013. |
| QAT-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Qatar | 2026-09-23 | The PM (M) has been in office since 7 March 2023, with no change since. |

EIU: authoritarian (3.17), overridden to absolute_monarchy. There are no parties. Next selection: none scheduled.

## Bahrain (BHR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BHR-1 | https://en.wikipedia.org/wiki/King_of_Bahrain | 2026-09-23 | The monarch (born 28 January 1950, age 76) has ruled since 6 March 1999 as Emir and since 14 February 2002 as King. The Crown Prince is also PM. The King appoints the PM, the cabinet and the upper house, and can dissolve the elected lower house. |

The King holds executive power, so `head_of_state`. In office since 1999, when he took the throne as Emir. Political societies exist, but the government is appointed, not party-formed. EIU: authoritarian (2.45), overridden to constitutional_monarchy_executive because an elected lower house exists under the 2002 constitution. That is a close call against absolute_monarchy. Next selection: none scheduled.

## Jordan (JOR)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| JOR-1 | https://en.wikipedia.org/wiki/Abdullah_II_of_Jordan | 2026-09-23 | The King (born 30 January 1962, age 64) has reigned since 7 February 1999. He keeps significant executive and legislative powers and appoints the PM. |
| JOR-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Jordan | 2026-09-23 | The PM (M) has been in office since 15 September 2024 and is incumbent. |
| JOR-3 | https://en.wikipedia.org/wiki/Politics_of_Jordan | 2026-09-23 | The PM is an independent. The King signs, vetoes, suspends and dissolves. |

EIU: authoritarian (3.28), overridden to constitutional_monarchy_executive. The cabinet is not formed by a parliamentary party, hence "none (nonpartisan)". Next selection: none scheduled.

## Kuwait (KWT)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| KWT-1 | https://en.wikipedia.org/wiki/Mishal_Al-Ahmad_Al-Jaber_Al-Sabah | 2026-09-23 | The Emir (born 27 September 1940, age 85, turning 86 on 27 September) has reigned since 16 December 2023. On 10 May 2024 he dissolved the National Assembly and suspended constitutional articles for up to four years, and that suspension still holds. A Crown Prince was appointed in June 2024. |
| KWT-2 | https://en.wikipedia.org/wiki/Cabinet_of_Kuwait | 2026-09-23 | The PM (M) has been in office since 15 April 2024. There was a reshuffle on 1 February 2026. |

EIU: authoritarian (2.78), overridden to absolute_monarchy while parliament is suspended. Parties are not legal. Next selection: none scheduled.

## Lebanon (LBN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBN-1 | https://en.wikipedia.org/wiki/Prime_Minister_of_Lebanon | 2026-09-23 | Under the Taif constitution the PM heads the government and carries out Council of Ministers policy; power shifted away from the presidency. The formal title is President of the Council of Ministers. |
| LBN-2 | https://en.wikipedia.org/wiki/Nawaf_Salam | 2026-09-23 | The PM (born 15 December 1953, age 72) has served since 8 February 2025 and is incumbent. He led the March 2026 ban on Hezbollah military activity and the talks with Israel. |
| LBN-3 | https://en.wikipedia.org/wiki/Joseph_Aoun | 2026-09-23 | The President (M) has served since 9 January 2025 and is incumbent. |
| LBN-4 | https://en.wikipedia.org/wiki/2028_Lebanese_general_election | 2026-09-23 | On 9 March 2026 parliament extended its own term by two years, moving elections to May 2028. |
| LBN-5 | https://en.wikipedia.org/wiki/Cabinet_of_Nawaf_Salam | 2026-09-23 | 24 ministers. Nominating blocs are the Lebanese Forces (4), Amal (2), Hezbollah (2), PSP (2), Kataeb (1) and Tashnag/ARF (1), plus 12 independents from the presidential and PM shares. No resignations are recorded through September 2026. |

The leader seat is `head_of_government`, and it was a judgment call. Taif places executive power in the Council of Ministers under the PM, but the President remains the foreign counterpart on security questions. Next selection is 2028-05. `women_cabinet_share` is 22.7 (5/22) from WIP-2026, while LBN-5 lists 3 women among 24. EIU: authoritarian (3.81).

## Oman (OMN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| OMN-1 | https://en.wikipedia.org/wiki/Sultan_of_Oman | 2026-09-23 | The Sultan is both head of state and head of government in an absolute monarchy. A Crown Prince was designated in 2021. |
| OMN-2 | https://en.wikipedia.org/wiki/Haitham_bin_Tariq | 2026-09-23 | He has reigned since 11 January 2020 and is also Prime Minister. The page gives his birth as 11 October 1955. Other references give 1954; either way he is 70 or 71, in the 70-79 band. |

`second_seat` is "same". EIU: authoritarian (3.05), overridden to absolute_monarchy. Next selection: none scheduled.

## Palestine (PSE)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| PSE-1 | https://en.wikipedia.org/wiki/Next_Palestinian_presidential_election | 2026-09-23 | The President has been in office since 2005 (born 1935, age 90) and is incumbent. A Vice President was appointed in April 2025. A presidential vote is expected in 2027, and an elections decree-law was amended 14 June 2026. |
| PSE-2 | https://www.newarab.com/news/scepticism-after-palestinian-president-sets-elections-28-nov | 2026-09-23 | Dated news (2026-07-10): a decree set legislative elections for 28 November 2026 and **deferred setting a presidential date**, which is expected in Q1 2027. |
| PSE-3 | https://pmo.pna.ps/en/Article/5311/ministers | 2026-09-23 | Primary source, the Prime Minister's Office. The PM (M) also holds foreign affairs. The minister list shows 4 women. |

The row describes the Palestinian Authority. Gaza is administered under separate post-war arrangements. `next_leader_selection` is "none scheduled" because the 28 November 2026 legislative vote does not choose the President and no presidential date has been set (expected Q1 2027). `women_cabinet_share` is blank because neither WIP edition ranks Palestine; PSE-3 lists 4 women ministers. EIU: authoritarian (3.44).

## Libya (LBY)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBY-1 | https://en.wikipedia.org/wiki/Government_of_National_Unity_(Libya) | 2026-09-23 | The GNU PM has served since 15 March 2021, and the Presidential Council chair (M) is in post. The GNU is UN-recognized. A rival Government of National Stability has operated in the east since 2022. |
| LBY-2 | https://en.wikipedia.org/wiki/Abdul_Hamid_Dbeibeh | 2026-09-23 | The PM (born about 1959, age 66 to 67) is incumbent; page revised 20 September 2026. |
| LBY-3 | https://africanarguments.org/2026/08/48114/ | 2026-09-23 | Dated analysis (2026-08-03): the mid-June 2026 power-sharing deal keeps the GNU PM in post and creates a new three-person presidency under strong eastern (LNA) influence. It had **not yet been installed**, and the transition is to run until elections by February 2027. |
| LBY-4 | https://libyaobserver.ly/news/libyas-three-councils-reach-agreement-hold-elections-february-17-2027 | 2026-09-23 | Dated news (2026-06-18): the HoR, the High Council of State and the Presidential Council agreed to hold presidential and parliamentary elections together **no later than 17 February 2027**. That is a deadline, not a fixed date. |
| LBY-5 | https://en.wikipedia.org/wiki/Presidential_Council_(Libya) | 2026-09-23 | The 2021 council (chair and two vice-chairs) is still listed. No new council is recorded. |
| LBY-6 | https://en.wikipedia.org/wiki/2026_in_Libya | 2026-09-23 | On 25 August 2026 the rival governments reached an initial agreement on electoral overhaul. No new presidency had been installed as of September. |

Libya is in the uncertain list: the executive is contested and a restructured presidency is pending. Next selection is 2027-02, the agreed outer deadline, which has slipped before. EIU: authoritarian (2.31).

## Mauritania (MRT)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MRT-1 | https://en.wikipedia.org/wiki/Mohamed_Ould_Ghazouani | 2026-09-23 | The President (born 4 December 1956, age 69) has served since 1 August 2019 and was re-elected in 2024. His party is El Insaf (Equity Party). |
| MRT-2 | https://en.wikipedia.org/wiki/Mokhtar_Ould_Djay | 2026-09-23 | The PM (M, El Insaf) has served since 2 August 2024 and is incumbent. |
| MRT-3 | https://en.wikipedia.org/wiki/Government_of_Mokhtar_Ould_Djay | 2026-09-23 | The coalition is El Insaf, the National Democratic Alliance, El Islah and the UDP (which joined 18 September 2025), with 32 ministers. The page was revised 23 May 2026. |

Next selection is 2029-06: a five-year term from the June 2024 vote, and the incumbent is serving his second and final term. EIU: authoritarian (3.84 in 2025; it was 3.96 in 2024). The surname rule is Hassaniya: Ould or Mint plus the father's name.

## Sudan (SDN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SDN-1 | https://en.wikipedia.org/wiki/Abdel_Fattah_al-Burhan | 2026-09-23 | The chair of the Transitional Sovereignty Council was born 11 July 1960 (age 66) and is incumbent. |
| SDN-2 | https://en.wikipedia.org/wiki/Transitional_Sovereignty_Council | 2026-09-23 | He has chaired the council since 21 August 2019. After the October 2021 coup the council "effectively changed" into a military junta. |
| SDN-3 | https://en.wikipedia.org/wiki/Kamil_Idris | 2026-09-23 | The PM (M) has served since 31 May 2025 and is incumbent in 2026. |
| SDN-4 | https://en.wikipedia.org/wiki/Government_of_Peace_and_Unity | 2026-09-23 | The RSF's rival Government of Peace and Unity (announced April 2025, based in Nyala) has its own presidential council and PM and controls most of Darfur. No state recognizes it. |
| SDN-5 | https://www.timeslive.co.za/news/africa/2026-09-23-us-ties-sudanese-army-leader-burhans-un-visa-to-ceasefire-plan-sources/ | 2026-09-23 | Dated news (2026-09-23): the army chief is still the de facto leader since 2019. The US is withholding his UNGA visa over a 90-day ceasefire plan. |

Sudan is in the uncertain list: authority is contested by the RSF parallel government. EIU: authoritarian (1.46), overridden to military_junta. Next selection: none scheduled.

## Tunisia (TUN)

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TUN-1 | https://en.wikipedia.org/wiki/Kais_Saied | 2026-09-23 | The President (born 22 February 1958, age 68) has served since 23 October 2019 and was re-elected 7 October 2024. Five-year term, next election 2029. The current Head of Government is a woman. |
| TUN-2 | https://en.wikipedia.org/wiki/Zaafarani_Cabinet | 2026-09-23 | The Head of Government (F) was appointed 20 or 21 March 2025. The cabinet has 25 members. The page was revised 3 September 2026 and records no 2026 change. |

The President governs by decree and without party backing, so `governing_parties` is "none (nonpartisan)". Next selection is 2029-10. EIU: hybrid regime (4.65).

## What was not verified

- **Morocco's 2026 result** was not yet published when checked. The next Head of Government is unknown.
- **Libya's new three-person presidency** was not confirmed installed as of September 2026. The web-search budget ran out before a final check, and the last source I opened (LBY-6) records none.
- **Iraq's remaining nine portfolios** were not re-checked after May 2026.
- **The EIU 2025 table** was read from Wikipedia, not from the registration-gated EIU report.
