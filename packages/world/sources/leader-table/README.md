# Nation leader constraint table

`nation-leaders.tsv` has one row for each of the 196 roster nations. It describes who held each country's leader seat on 2026-09-23 in terms of attributes only: sex, age band, title, which seat, regime, name culture, surname rule and governing parties. No name appears in it.

It exists because of the rule **"Fictional, faithful"** (`docs/DECISIONS.md` §4.10). Every foreign leader in the game gets an invented name, and each invention has to match its real counterpart on these attributes. This table is the dated constraint set those inventions are checked against. **It is never rendered to a player.**

## Status

- **Complete.** 196 rows: 195 non-player nations plus a `USA` row for the player. The id set is exactly the roster in `packages/world/src/dataset/nations*.ts` (61 core records plus 135 regional ones).
- **Every cell is filled.** Six `women_cabinet_share` cells were blank in the regional files. The merge pass filled them from cabinet lists and says so in `sources.md` (see "Merge-pass changes" below).
- **No personal names** appear in the title, party, name-culture or surname-rule columns. Four party names built on a real person's name were reduced to their initials plus a neutral description, and two surname examples that were sitting officeholders' names were swapped out.
- **Not verified here:** the regional researchers' seat facts. The merge pass checked format, coverage, internal consistency and names, and it researched only the six blank cells. The seat facts rest on the regional files' sources, every one opened on 2026-09-23.

## Files

| File | What it is |
|---|---|
| `nation-leaders.tsv` | The table. Tab-separated, UTF-8, one header row, sorted by `nation_id`. |
| `sources.md` | Sources grouped by nation (USA first, then A to Z), followed by the shared source ids, the merge-pass sources, and each region's method notes. |
| `regions/*.tsv`, `regions/*.sources.md` | The eight regional researchers' files, kept unedited. `nation-leaders.tsv` is built from them. |
| `us-bench.tsv`, `us-bench.sources.md` | A separate table from the same decision: demographic priors for the generated US political bench. It has its own sources file, and this README does not describe it. |

## As-of date and data vintages

Every row has `as_of` = **2026-09-23**. The seat facts (who holds the leader seat, since when, age band, second seat, governing parties, next selection) were checked against sources opened that day. Three inputs are older, and a reader should know which:

| Input | Vintage | Rows |
|---|---|---|
| `women_cabinet_share` | IPU and UN Women "Women in Politics: 2026" map, **as at 1 January 2026** | 189 of 195. Many cabinets have changed since then, and the uncertain-rows list below names them. |
| `women_cabinet_share` (merge pass) | Cabinet lists dated March 2024 (PSE, with 2025 changes) through September 2026 (XKX) | AFG, MMR, PRK, PSE, TWN, XKX |
| `regime_type` | EIU Democracy Index 2025 (published April 2026) | 170 rows. The other 25 are small states the EIU does not rate. They take Freedom House 2026 or the form of government. |

Tenure starts run from 1967 to 2026. Next selections run from 2026-09 to 2033-04.

**The campaign starts on 2029-01-20 (decision D1), but this table describes September 2026.** Before that start date, 77 of the 195 non-player seats have a selection scheduled, and 14 of those fall before the end of 2026. Whoever builds on this table has to decide whether the 2029 world keeps these incumbents' attributes or advances them. The table can't make that call.

## Columns

| Column | Meaning | Values |
|---|---|---|
| `nation_id` | Roster id | ISO 3166-1 alpha-3, plus `XKX` for Kosovo |
| `as_of` | The date the row describes | `2026-09-23` |
| `leader_seat` | The seat a US President treats as the counterpart | `head_of_state`, `head_of_government` |
| `leader_title` | English title of that seat | free text, no names |
| `leader_sex` | Sex of the person in the leader seat | `M`, `F` |
| `leader_age_band` | Age on `as_of` | `30-39`, `40-49`, `50-59`, `60-69`, `70-79`, `80+` |
| `leader_in_office_since` | Year the person took the leader seat. In party-states and juntas, the year they took paramount power | `YYYY` |
| `second_seat_title` | Title of the other executive seat | free text; `same` when the leader holds both; `none` when the seat is vacant or absent (HTI, SYR) |
| `second_seat_sex` | Sex of the second-seat holder | `M`, `F`, `same`, `none`; SMR is `M;F` (two Captains Regent) |
| `regime_type` | Regime category | `full_democracy`, `flawed_democracy`, `hybrid_regime`, `authoritarian`, `one_party_state`, `military_junta`, `absolute_monarchy`, `constitutional_monarchy_executive`, `theocracy` |
| `name_culture` | Key into the repo's name banks (`name-cultures.ts`, `people.ts`). Thirty-four rows were rekeyed on 2026-09-23, when banks several peoples shared were split (Russian and Ukrainian, the Central Asian republics, Gulf and Maghreb Arabic, and others); the traditions each nation's people carry are in `name-traditions.tsv` | 94 keys in use |
| `surname_rule` | How the political elite's surnames work: gendered forms, patronymics, and what happens at marriage | plain text. Onomastic inference, not a sourced fact |
| `governing_parties` | Parties in government, largest first where known, separated by semicolons | English names; `none (...)` for nonpartisan, military or party-less governments |
| `women_cabinet_share` | Percent of ministers heading ministries who are women | one decimal |
| `next_leader_selection` | Month of the next scheduled event that could replace the leader seat | `YYYY-MM` or `none scheduled`. Estimated months are marked in `sources.md` |
| `source_ids` | Ids of the sources behind the row, separated by semicolons | defined in `sources.md` |

**The `USA` row** has `leader_seat` = `head_of_state` and `leader_title` = `President`, and every other attribute column reads `player`, because the player is the President. A consumer should skip it or treat `player` as "set by the player."

## Counts (195 non-player rows)

**Sex.** 15 of 195 leaders are women (**7.7%**): BRB, CRI, DNK, ISL, ITA, JPN, MDA, MEX, MHL, NAM, PER, SUR, TTO, TZA, VEN. Another 19 second seats are held by women, and SMR's pair of Captains Regent is mixed. A woman holds at least one executive seat in 33 countries (16.9%).

**Seat.** 115 leaders sit in the head-of-state seat and 80 in the head-of-government seat. In 57 countries, one person holds both.

**Regime type.**

| `regime_type` | Rows |
|---|---|
| flawed_democracy | 63 |
| authoritarian | 42 |
| full_democracy | 32 |
| hybrid_regime | 31 |
| absolute_monarchy | 7 |
| one_party_state | 6 |
| military_junta | 6 |
| constitutional_monarchy_executive | 6 |
| theocracy | 2 |

**Age band.** 30-39: 7. 40-49: 32. 50-59: 48. 60-69: 58. 70-79: 33. 80+: 17.

**Tenure.** 51 leaders took the seat in 2025 or 2026 (23 of them in 2026). Fourteen have held it since 2000 or earlier, the longest since 1967 (BRN).

**Next selection.** 14 selections fall by the end of 2026 (BIH, BRA, CHE, ETH, GMB, GNB, HTI, ISR, LVA, NZL, SRB, SSD, STP, SWE). 21 seats have none scheduled: monarchies, party-states, juntas and suspended elections.

**Women in cabinet.** The median is 21.4% and the mean 22.7%, with a range from 0.0 to 64.3 (NAM). Nine rows are 0.0 (AFG, AZE, HUN, MHL, SAU, TKM, TUV, VUT, YEM). HUN's zero describes the previous government. Fourteen rows are at 50% or above.

**Parties.** 31 rows have no governing party (`none (...)`).

## Rows the regional researchers flagged as uncertain

These are the researchers' own flags, grouped by region file. A consumer should treat each one as liable to change, or as a judgment call.

### Americas

- **VEN:** Acting president since 5 Jan 2026, after US forces captured the formal president. The formal president is still listed as de jure. US-mediated transition talks are ongoing, and no election date is set.
- **HTI:** The presidency has been vacant since the transitional council expired on 7 Feb 2026, and the acting PM rules alone. The 13 Dec 2026 election has already slipped from August and could slip again.
- **CUB:** The incumbent formally holds both posts, but some sources treat the former First Secretary as the de facto leader. US pressure continues through 2026. The 2028-04 selection month is an estimate.
- **NIC:** A formal two-person co-presidency, so which co-president to code as leader is a judgment call. On 20 Jul 2026 the elections due Nov 2027 were declared abolished.
- **BRA:** First round on 4 Oct 2026, with the incumbent statistically tied in polling. The seat may change on 1 Jan 2027.
- **COL:** New president since 7 Aug 2026. Sources differ on his party label (Defenders of the Homeland or National Salvation), and the coalition is described as provisional.
- **PER:** New president since 28 Jul 2026, after a runoff decided by fewer than 50,000 votes. Nine presidents in a decade.
- **HND:** New president since 27 Jan 2026, after a razor-thin result disputed amid fraud allegations.
- **CHL:** New president since 11 Mar 2026. He resigned his party membership before taking office and has no congressional majority.
- **CRI:** New president since 8 May 2026.
- **BOL:** President since 8 Nov 2025. Search results reported a governance crisis and a rift with the vice president, but those pages were not opened.
- **GTM:** The president's party (Semilla) was canceled de jure on 27 Mar 2026, and he is now an independent.
- **VCT:** Change of government on 28 Nov 2025, after 25 years of the previous party.

### Europe (west, north and central)

- **SWE:** Caretaker PM since 2026-09-17, after losing the 2026-09-13 election, and the row describes the caretaker. A new PM (F, 50-59, heading a Social Democrat-led S/V/MP/C government) is likely after the Riksdag vote, from 2026-09-29 at the earliest.
- **GBR:** The Prime Minister changed on 2026-07-20 after the previous PM resigned. The women share (50.0) is the pre-change cabinet's.
- **HUN:** New PM since 2026-05-09 (Tisza supermajority). A new President has served since 2026-08-19, after the predecessor was removed by constitutional amendment. The women share (0.0) is the previous government's.
- **LTU:** New PM since 2026-07-14, after the coalition collapsed in June 2026. The coalition is now LSDP, Democrats "For Lithuania" and LVZS.
- **LVA:** New PM since 2026-05-28. A Saeima election on 2026-10-03 may replace him within two weeks. The current cabinet is 2 of 15 women (13.3), against the map's 28.6.
- **SVN:** New right-wing minority government since 2026-06-04. The women share (36.8) is the previous government's.
- **NLD:** New PM and a minority D66/VVD/CDA cabinet since 2026-02-23. The women share (28.6) is the outgoing cabinet's.
- **DNK:** Same PM, but a new four-party minority government since 2026-06-03, after the 2026-03-24 snap election. The women share (33.3) is the previous cabinet's.
- **NOR:** The King died on 2026-08-28, and his successor (M) now holds the second seat. The PM is unchanged.
- **EST:** The second seat moves from M to F on 2026-10-12, when the President-elect is sworn in.
- **SMR:** `leader_seat` is a judgment call: the row takes the de facto head of government, the Secretary of State for Foreign and Political Affairs. The Captains Regent are M;F until 2026-10-01, then M;M.
- **LIE:** `leader_seat` is a judgment call. The row takes the Hereditary Prince, who has exercised the Reigning Prince's powers as regent since 2004. The alternative is the Prime Minister (F, 60-69, since 2025).
- **MLT:** The PM is unchanged, but Labour was re-elected in a 2026-05-30 snap election. The women share (12.5) is the pre-election cabinet's.
- **FRA:** The PM is unchanged but fragile. As of 2026-09-23 he was negotiating the 2027 budget with the Socialists to avoid censure.

### Southeast Europe and the Caucasus

- **SRB:** The president still holds office on 2026-09-23, but says he will resign on 2026-09-27 and run for prime minister in the 2026-10-25 snap election, so the leader seat may move to head of government.
- **ROU:** A caretaker government has served since the May 2026 no-confidence vote. A PM-designate was nominated on 2026-09-17, but talks are deadlocked short of 233 votes. The governing parties and second seat are in flux, though the second seat is male either way.
- **XKX:** The acting president is the Speaker, and the opposition contests her standing. The fourth cabinet (2026-09-13) faces a Constitutional Court challenge. Failing to elect a president would force a fourth snap election, well before the regular 2030-06 date.
- **BIH:** The leader seat is set to the rotating Presidency chair as a judgment call. The 2026-10-04 general election replaces the whole Presidency, and the state coalition is largely paralyzed.
- **BGR:** New prime minister since 2026-05-08. The second seat (a female president since January 2026) is up for election on 2026-10-25, and the women share of 5.3 describes the previous cabinet.
- **UKR:** New male prime minister since 2026-07-16. Elections are suspended under martial law through 2026-10-31, and the women share of 20.0 describes the previous cabinet.
- **MDA:** New prime minister since 2026-07-22. The leader seat is set to the president as a judgment call, in a formally parliamentary republic.
- **GEO:** Recurring rumors in September 2026 that the prime minister will resign. Real power sits informally with the ruling party's founder, who holds no state office.

### Middle East and North Africa

- **IRN:** The Supreme Leader seat changed on 2026-03-08, after the predecessor's assassination on 2026-02-28. The successor has made no public appearance since, and authorities confirmed he was injured in the strikes.
- **IRQ:** New President (2026-04-11) and new PM (2026-05-14). When last checked, 9 of 23 portfolios were unfilled, and the women share of 13.0 predates this cabinet.
- **MAR:** The legislative election was held on as_of day (2026-09-23), and results were not yet published. The outgoing Head of Government no longer leads his party, and PAM is led by a woman, so `second_seat_sex` could flip to F.
- **LBY:** A dual executive (the GNU in Tripoli and the GNS in the east). A June 2026 power-sharing deal adds a three-person presidency that has not been confirmed as installed. The 2027-02 election date is a deadline, not a fixed date.
- **SDN:** Authority is contested by the RSF's unrecognized Government of Peace and Unity (Nyala). The US is withholding the army chief's UNGA visa (2026-09-23).
- **YEM:** The row covers only the recognized Presidential Leadership Council. The Houthis hold Sanaa. STC members were removed from the council in January 2026, and a new PM took office on 2026-02-06.
- **ISR:** The Knesset dissolved on 2026-07-17, and the 2026-10-27 election could replace the PM within weeks. Shas has held no ministries since July 2025 but remains in the coalition.
- **SAU:** `leader_seat` is `head_of_government` because the Crown Prince and Prime Minister is the effective ruler. The King (age 90) remains head of state.
- **LBN:** `leader_seat` is a judgment call. Under Taif the PM leads the Council of Ministers, but the President is the security counterpart. Parliament postponed elections to 2028-05.
- **PSE:** The head of state is 90. Legislative elections were decreed for 2026-11-28, but no presidential date is set (expected Q1 2027), and Gaza is administered separately.
- **SYR:** A transitional president since 2025, under a five-year Constitutional Declaration, with no prime minister and no party law.

### West and central Africa

- **STP:** The legislative election on 2026-09-27, four days after as_of, will decide the next PM. The President broke with the governing ADI and won re-election in July 2026, so choosing head of government over head of state is a judgment call. The PM's 1957 birth year is unsourced (Portuguese Wikipedia).
- **SEN:** The President dismissed the PM on 2026-05-22 and named an independent economist on 2026-05-25. The majority party, PASTEF, formally declined to join the June 2026 government, so `none (nonpartisan)` is a judgment.
- **GNB:** Military junta since the 2025-11-26 coup. A new presidential constitution was approved by referendum on 2026-08-30. Elections are set for 2026-12-06, and the transitional leader is barred from them. His age band rests on an unsourced birth year of about 1960.
- **NER:** A failed mutiny or coup attempt against the junta leader on 2026-08-28/29. He remains in power.
- **TCD:** An October 2025 amendment moved to seven-year terms with no limit. It is unclear whether the current mandate ends 2029-05, as the row has it, or 2031-05.
- **CPV:** PAICV won the 2026-05-17 legislative election, and a new PM took office on 2026-06-19. The 2026-11-15 presidential election changes the second seat, and the women share (12.5) predates the new cabinet.
- **BEN:** New President sworn in on 2026-05-24 after the 2026-04-12 election, for a first seven-year term. The women share predates the new cabinet.
- **GIN:** The 2021 coup leader was inaugurated as elected President in January 2026. GMD won the 2026-05-31 legislative election, with the major opposition barred.
- **GMB:** Presidential election on 2026-12-05, with the incumbent seeking a third term.
- **NGA:** The presidential election was moved forward to 2027-01-16.
- **CMR:** The incumbent is 93 and was re-elected in October 2025 to a term ending in 2032. Only Wikipedia confirms the PM is unchanged; the PM's office site does not name him.

### East and southern Africa

- **SOM:** The opposition says the President's four-year mandate expired on 2026-05-15. The government says amendments extend it to 2027-05. No polling date is fixed, so the 2027-05 selection is soft.
- **ZAF:** The President was booked off public engagements for ill health on 2026-09-16. He is still in office, and no acting president has been named. No 2026-dated source confirms the current membership of the 10-party GNU.
- **MDG:** An army-officer transitional regime since the October 2025 takeover. The Prime Minister was replaced on 2026-03-15. The electoral commission says the presidential vote is in October 2027, but Wikipedia's roadmap says September 2027.
- **ZMB:** The President was re-elected in the disputed 2026-08-13 vote and sworn in on 2026-09-01.
- **ETH:** The June 2026 election is over, but the new House formally re-selects the Prime Minister in October 2026.
- **SSD:** Election set for 2026-12-22 under election-law changes signed around 2026-09-22. The vice presidents must leave office before the vote, and the first VP is detained.
- **ZWE:** A July 2026 constitutional amendment extended the term to 2030 and moved presidential selection to parliament. There is a reported push for 2037.
- **DJI:** A sixth term won on 2026-04-10 after the age limit was removed. Sources disagree on the term length (5 or 6 years). The row uses 5, giving 2031-04.
- **MWI:** The seat changed hands on 2025-10-04, and the incumbent is 86. No dated wire story could be opened (AP and BBC were blocked).
- **SYC:** The seat changed hands on 2025-10-26, after a runoff.
- **TZA:** A disputed October 2025 re-election. A new Prime Minister took office in November 2025, but the row records the second seat as `same`.
- **UGA:** Re-elected in January 2026 and sworn in on 2026-05-12.
- **KEN:** `governing_parties` is a judgment call. ODM holds posts under a 2025 memorandum, but Wikipedia says it is not formally part of the administration.
- **LSO:** Sources conflict on coalition membership. BTI 2026 lists RFP, MEC and AD (BAP left), while Wikipedia adds LCD and LPC. The row lists the three core parties.
- **RWA:** The second seat changed, with a new Prime Minister since 2025-07-25.
- **BDI:** The second seat changed, with a new Prime Minister since 2025-08-05. The presidential election is set for 2027-05-03.

### Asia

- **BGD:** New PM since February 2026 and new President since August 2026. The leader's birth year is disputed: 1968 per the parliament profile (50-59) or 1965 per wire reports and Britannica (60-69).
- **AFG:** The Supreme Leader's birth year is disputed: 1967 per the ICC and the Taliban (50-59), or other estimates from 1959 to 1961 (60-69).
- **MMR:** The junta chief became a parliament-elected President in April 2026. The row codes him `authoritarian` (EIU), though `military_junta` is defensible. `leader_in_office_since` is 2021, when he seized power, not 2026.
- **PAK:** The constitutional executive is the PM, but the army chief (Field Marshal and Chief of Defence Forces) holds power that foreign governments also deal with directly.
- **TKM:** The President holds both seats, but his father, as People's Council chairman, is widely seen as sharing real power.
- **VNM:** The General Secretary also became State President on 7 Apr 2026, and a new PM took office the same day.
- **KOR:** The PM changed on 1 Jul 2026, and the second seat is now held by a woman.
- **MNG:** The PM changed on 30 Mar 2026, the third PM in under a year.
- **NPL:** A new PM was sworn in on 27 Mar 2026, after the Rastriya Swatantra Party won a majority on 5 Mar 2026.
- **KAZ:** A new constitution took effect on 1 Jul 2026. It created a Vice President post, and a unicameral Kurultai was elected on 23 Aug 2026. The PM was re-approved on 31 Aug 2026, and the 2029 presidential date could shift.
- **JPN:** PM in office since October 2025 and reconfirmed after the 8 Feb 2026 election. The next selection is the LDP race in September 2027.
- **THA:** PM in office since September 2025 and re-elected by the House on 19 Mar 2026, after the February 2026 election.
- **MYS:** GE16 is due by February 2028, but partners are pressing for an early poll.
- **CHN, VNM, LAO, IDN, TWN, THA, BGD, NPL, TKM, UZB, KAZ, BTN, LKA, KHM, MNG, MMR:** The month in `next_leader_selection` is estimated from the electoral or party-congress cycle, and each nation's note in `sources.md` says so.

The Asia researcher also reported gaps, now handled as follows:

- **PRK, AFG, MMR, TWN (`women_cabinet_share` blank):** filled in the merge pass (see below).
- **MDV, BRN (no EIU score):** `regime_type` comes from Freedom House 2026 for MDV (Partly Free, mapped to `hybrid_regime`) and from the form of government for BRN (`absolute_monarchy`).

### Oceania

- **SLB:** The PM changed on 2026-05-15, after a no-confidence vote removed the predecessor on 2026-05-07. A second motion filed on 2026-08-29 was withdrawn on 2026-09-06. The majority is thin, the coalition's formal name is unconfirmed, and the women share (9.5) predates the May 2026 cabinet.
- **NZL:** The general election is fixed for 2026-11-07. The PM survived two National caucus confidence votes in 2026 (April and 2026-08-12). The Governor-General's term was extended to 2027-03-31.
- **FJI:** The election is due between 2026-12-24 and 2027-02-06, and no polling date had been announced as of September 2026. The row uses the due-by month, 2027-02. The coalition has been turbulent (the Deputy PM resigned in October 2025).
- **NRU:** In March 2026 Parliament extended its term to four years, even though voters rejected that in the October 2025 referendum. Sources conflict (one Wikipedia page still says three years), so the next election is 2029-10 (estimated) or about 2028-10. The country was renamed the Republic of Naoero on 2026-08-03.
- **WSM:** The PM changed on 2025-09-16, after the 2025-08-29 snap election. The incumbent faces criminal charges filed in January 2025 and was treated abroad for a health condition in late 2025. The women share of 6.7 is from the 1 January 2026 map.
- **TON:** The PM changed on 2025-12-18. He is a noble related to the royal family by marriage, and the King's influence over government grew in 2025. The women share of 9.1 predates the cabinet completed on 2026-01-05, which reportedly includes more women.

## Merge-pass changes

The merge pass read the eight regional TSVs, checked that their headers were identical, and concatenated them with one header, sorted by id. It then made these changes. Each change is also noted in that nation's section of `sources.md`.

1. **Six blank `women_cabinet_share` cells filled.** The UN Women/IPU map does not cover these rows, so each cabinet was counted directly with the map's rule (ministers heading ministries). Each row gained a `MRG-*` source id.
   - AFG 0.0 (all-male cabinet)
   - PRK 2.9 (1 of 35)
   - TWN 13.3 (2 of 15)
   - MMR 10.0 (3 of 30, or 6.7 if one name-form inference is wrong)
   - XKX 25.0 (5 of 20, cabinet of 2026-09-13)
   - PSE 20.0 (4 of 20)
2. **`second_seat_sex` normalized** from `M` to `same` for BRN, IDN, MDV, MMR, PHL and TKM. These rows had `second_seat_title` = `same`, and every other region codes a single-seat executive `same`/`same`.
3. **Party names built on a real person's name** were rewritten:
   - CIV: `RHDP (a rally named for the founding president)`
   - NIC: `FSLN (a liberation front named for a 1930s guerrilla leader)`
   - IND: `Lok Janshakti Party (RV)`
   - VUT: `IG (a founder-named party)`
4. **Surname examples that named sitting officeholders** were replaced. For BGD, (Rahman, Islam, Hossain) became (Hossain, Uddin, Chowdhury). For AFG, the epithet example became "religious titles such as Mawlawi".
5. **An undefined source id was removed.** SYC cited `SYC-3`, which its sources file never defines.
6. **The USA player row was added.**

## Validation run on the merged file

These checks ran against `nation-leaders.tsv` after the merge, and all passed:

- 196 data rows plus exactly one header row. Every row has 16 fields, and the rows are sorted by `nation_id`.
- The id set equals the roster: the 61 named-constant ids in `nations.ts` plus the 135 literal ids in `nations-{africa,americas,asia,europe,mena,oceania}.ts`, with no duplicates.
- No empty cells.
- `leader_sex` is `M` or `F` on all 195 non-player rows.
- `leader_age_band` is one of the six bands.
- `leader_in_office_since` is a four-digit year.
- `next_leader_selection` is `YYYY-MM` (none earlier than 2026-09) or `none scheduled`.
- `women_cabinet_share` has one decimal.
- Every `source_ids` entry in the regional rows is defined in its region's sources file.
- The title, party, name-culture and surname-rule columns contain no name token taken from the person-page URLs in the sources files. That check, plus a read of every party name and title, produced the edits in items 3 and 4 above.
