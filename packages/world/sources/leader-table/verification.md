# Nation leader table: verification pass

Run on 2026-09-23 against `nation-leaders.tsv` as merged that morning.

## Result

**45 rows checked. 43 passed on every checked column. Two rows had one wrong cell each, and both are corrected in `nation-leaders.tsv`:**

| Row | Column | Was | Now | Proof |
|---|---|---|---|---|
| HTI | `leader_title` | Acting Prime Minister | Prime Minister | VER-HTI-1, VER-HTI-2 |
| ISR | `governing_parties` | Likud; Shas; Otzma Yehudit; Religious Zionist Party; New Hope | Likud; Shas; Otzma Yehudit; Religious Zionist Party | VER-ISR-1, VER-ISR-2 |

Among the 45 rows, no independent source contradicted a `leader_seat`, `leader_sex`, `leader_age_band` or `regime_type` cell. `governing_parties` is the weakest column. For 28 rows an independent source confirmed the list, or at least its lead party, or the absence of parties. For 16 rows (and ISR's Shas entry), no independent source was opened, so those lists are uncontradicted rather than confirmed. See "What this pass did not prove" below.

## Scope

**Rows.** The 36 named rows (RUS, CHN, IND, JPN, DEU, GBR, FRA, BRA, MEX, SAU, IRN, ISR, TUR, EGY, NGA, ZAF, PAK, IDN, KOR, PRK, CAN, AUS, UKR, POL, ITA, AFG, MMR, SDN, BFA, NER, MLI, VEN, ARG, BHR, OMN, MAR) plus 9 drawn at random from the other 159 non-player rows. The draw used Python's `random.sample` with seed `20260923` and returned AUT, GIN, HTI, HUN, KNA, MDA, MNE, NZL and SRB.

**Columns.** `leader_seat`, `leader_title`, `leader_sex`, `leader_age_band`, `regime_type`, `governing_parties`. Anything this pass noticed in other columns is listed under "Observations outside the checked columns". None of those cells were changed.

**Rule.** A cell is wrong when a source opened in this pass contradicts it. A judgment call that the regional researchers documented (the SAU and MDA seat choices, TUR counting a support party that holds no ministries) counts as wrong only if a source contradicts the fact the judgment rests on. None did.

**Age bands** are computed as age on 2026-09-23. A birth year alone settles the band unless the leader turns 30, 40, 50, 60, 70 or 80 during 2026. Three leaders were in that position, and each was settled with a full birth date from the Rulers.org name index: MMR (born 3 July 1956, so 70), KNA (born 22 November 1976, so 49) and MNE (born 24 September 1987, so 38 on as-of day). OMN's birth year is 1954 in Rulers.org, not the 1955 often given elsewhere. The band is 70-79 either way.

## Method and independence

None of the regional researchers' URLs were reused. They relied mostly on English Wikipedia (518 of their links). This pass used five source families that do not draw on those pages:

1. **CIA World Leaders** (`cia.gov/resources/world-leaders/foreign-governments/<country>/`), one page per country with a "last updated" date. The directory is uneven: 22 of the 44 pages opened were last updated before 2026 (listed below), and several still name a predecessor. A stale page was never counted as contradicting the table.
2. **UN General Debate, 81st session** (`gadebate.un.org/en` and `/en/81/<country>`). Dated speaker pages for 22 and 23 September 2026 give each speaker's title and honorific ("His" or "Her Excellency").
3. **Rulers.org**, maintained independently of Wikipedia: the country lists (officeholders, start dates, birth years, an `(f)` marker for women, party abbreviations for some countries), the name index (full birth dates), and the monthly change logs for October 2025 through September 2026.
4. **EIU Democracy Index 2025** (published April 2026), read from the country table on German Wikipedia (`de.wikipedia.org`, "Demokratieindex (The Economist)", raw wikitext, first score column headed 2025). That table is maintained separately from the English one the researchers used, but it is still a transcription of the EIU. The EIU's own site refused the connection, and Our World in Data stops at 2024.
5. **Dated news**: Saudi Gazette and Al Jazeera for SAU, Times of Israel for ISR.

Unreachable in this session: Britannica (403), UN Press meetings coverage (a bot challenge, which was not bypassed) and eiu.com. The web-search budget was already spent when this pass started, so every source was reached by a known URL.

## Per-row results

Key: **UN81** = UN General Debate speaker page; **CIA** = CIA World Leaders (date = its "last updated"); **RUL** = Rulers.org; **EIU** = EIU 2025 score from the German table. Parties: **A** = independent source confirms the list or the single party; **B** = lead party confirmed, partners not independently checked; **C** = no-party government consistent with an independent source (monarchy, junta, theocracy, sole nonpartisan executive); **D** = not independently checked, not contradicted.

| # | Row | Seat and title | Sex | Age band (birth year) | `regime_type` vs EIU 2025 | Parties | Verdict | Sources |
|---|---|---|---|---|---|---|---|---|
| 1 | RUS | ✓ President; head of state since 7 May 2012 | ✓ | ✓ 70-79 (1952) | ✓ authoritarian = EIU authoritarian 2.03 | B | pass | CIA 2024-06-18; RUL rulqr; EIU |
| 2 | CHN | ✓ Party General Secretary since Nov 2012, President since Mar 2013 | ✓ | ✓ 70-79 (1953) | ✓ one_party_state (EIU authoritarian 2.24) | A | pass | CIA 2025-08-07; RUL rulc2; EIU |
| 3 | IND | ✓ Prime Minister since 26 May 2014; President (f) | ✓ | ✓ 70-79 (1950) | ✓ flawed = EIU 6.96 | D | pass | CIA 2026-08-07; RUL ruli; EIU |
| 4 | JPN | ✓ Prime Minister since 21 Oct 2025 | ✓ F ("Her Excellency"; RUL `(f)`) | ✓ 60-69 (1961) | ✓ full = EIU 8.85 | B (LDP; LDP won 316 of 465 seats Feb 2026) | pass | UN81 jp (22 Sep 2026); RUL ruljk, 2026-02; CIA 2025-05-23 stale; EIU |
| 5 | DEU | ✓ Chancellor since 6 May 2025 | ✓ | ✓ 70-79 (1955) | ✓ full = EIU 8.73 | B (CDU) | pass | CIA 2025-05-09; RUL rulg1; EIU |
| 6 | GBR | ✓ Prime Minister since 20 Jul 2026 | ✓ | ✓ 50-59 (1970) | ✓ full = EIU 8.34 | A (Labour) | pass | UN81 front page; CIA 2026-07-23; RUL rulu, 2026-07; EIU |
| 7 | FRA | ✓ President since 14 May 2017 | ✓ | ✓ 40-49 (1977) | ✓ full = EIU 8.05 | D | pass | UN81 fr (22 Sep 2026); CIA 2025-11-18; RUL rulf; EIU |
| 8 | BRA | ✓ President since 1 Jan 2023 | ✓ | ✓ 80+ (1945) | ✓ flawed = EIU 6.76 | D | pass | UN81 br (22 Sep 2026); CIA 2026-05-11; RUL rulb2; EIU |
| 9 | MEX | ✓ President since 1 Oct 2024 | ✓ F (RUL `(f)`) | ✓ 60-69 (1962) | ✓ hybrid = EIU 5.40 | B (MORENA) | pass | CIA 2026-06-23; RUL rulm2; EIU |
| 10 | SAU | ✓ Crown Prince and Prime Minister since 27 Sep 2022; King reigning | ✓ | ✓ 40-49 (1985) | ✓ absolute_monarchy (EIU authoritarian 2.08) | C | pass | Saudi Gazette 22 Sep 2026; Al Jazeera 22 Sep 2026; RUL ruls1, 2026-08; CIA 2022 stale; EIU |
| 11 | IRN | ✓ Supreme Leader elected 8 Mar 2026; President unchanged | ✓ | ✓ 50-59 (1969) | ✓ theocracy (EIU authoritarian 1.96) | C | pass | RUL ruli, 2026-02, 2026-03; UN81 ir (President, 23 Sep 2026); CIA 2024 stale; EIU |
| 12 | ISR | ✓ Prime Minister since 29 Dec 2022 | ✓ | ✓ 70-79 (1949) | ✓ flawed = EIU 7.80 | **corrected** (New Hope merged into Likud in 2025) | **1 cell wrong, fixed** | VER-ISR-1, VER-ISR-2; RUL ruli; CIA 2024 stale; EIU |
| 13 | TUR | ✓ President since 28 Aug 2014 | ✓ | ✓ 70-79 (1954) | ✓ hybrid = EIU 4.26 | D | pass | UN81 tr (22 Sep 2026); CIA 2026-02-25; RUL rult; EIU |
| 14 | EGY | ✓ President since 8 Jun 2014 | ✓ | ✓ 70-79 (1954) | ✓ authoritarian = EIU 2.79 | B (see note) | pass | CIA 2026-06-02; RUL rule, 2026-01; Al Jazeera 22 Sep 2026; EIU |
| 15 | NGA | ✓ President since 29 May 2023 | ✓ | ✓ 70-79 (1952) | ✓ hybrid = EIU 4.10 | D | pass | CIA 2026-05-05; RUL ruln2; EIU |
| 16 | ZAF | ✓ President since 14 Feb 2018 | ✓ | ✓ 70-79 (1952) | ✓ flawed = EIU 7.16 | B (ANC); the other nine GNU parties not checked | pass | CIA 2026-07-07; RUL ruls2, 2026-05; EIU |
| 17 | PAK | ✓ Prime Minister since 4 Mar 2024; President (M) | ✓ | ✓ 70-79 (1951) | ✓ authoritarian = EIU 2.44 | D | pass | CIA 2025-09-09; RUL rulp1; EIU |
| 18 | IDN | ✓ President since 20 Oct 2024 (both seats) | ✓ | ✓ 70-79 (1951) | ✓ flawed = EIU 6.37 | D | pass | CIA 2025-08-21; RUL ruli, 2026-09; EIU |
| 19 | KOR | ✓ President since 4 Jun 2025; PM (f) since 1 Jul 2026 | ✓ | ✓ 60-69 (1963) | ✓ flawed = EIU 7.75 | D | pass | UN81 kr (22 Sep 2026); CIA 2026-07-24; RUL ruljk; EIU |
| 20 | PRK | ✓ paramount leader since Dec 2011 (party leader Apr 2012) | ✓ | ✓ 40-49 (1984, disputed 1982-84) | ✓ one_party_state (EIU authoritarian 1.08) | A | pass | CIA 2023 stale; RUL ruljk; EIU |
| 21 | CAN | ✓ Prime Minister since 14 Mar 2025 | ✓ | ✓ 60-69 (1965) | ✓ full = EIU 9.08 | A (Liberal) | pass | CIA 2025-05-14; RUL rulc1, 2025-11, 2026-02; EIU |
| 22 | AUS | ✓ Prime Minister since 23 May 2022; Governor-General (f) | ✓ | ✓ 60-69 (1963) | ✓ full = EIU 8.85 | A (Labor) | pass | RUL rula2; EIU |
| 23 | UKR | ✓ President since 20 May 2019; new PM (M) 16 Jul 2026 | ✓ | ✓ 40-49 (1978) | ✓ hybrid = EIU 4.79 | D | pass | UN81 ua (23 Sep 2026); CIA 2026-09-04; RUL rulu, 2026-07; EIU |
| 24 | POL | ✓ Prime Minister since 13 Dec 2023; President (M) | ✓ | ✓ 60-69 (1957) | ✓ flawed = EIU 7.65 | D | pass | CIA 2025-08-06; RUL rulp2; UN81 front page (President); EIU |
| 25 | ITA | ✓ President of the Council since 22 Oct 2022 | ✓ F (RUL `(f)`) | ✓ 40-49 (1977) | ✓ flawed = EIU 7.58 | D | pass | CIA 2025-03-14; RUL ruli; EIU |
| 26 | AFG | ✓ Taliban leader since Aug 2021 (CIA: "Overall Taliban Leader") | ✓ | ✓ 50-59 (1967 per RUL; still disputed) | ✓ theocracy (EIU authoritarian 0.25) | C | pass | CIA 2026-09-03; RUL rula1; EIU |
| 27 | MMR | ✓ President (acting from 2024, elected 10 Apr 2026); no PM since Apr 2026 | ✓ | ✓ 70-79 (3 Jul 1956) | ✓ authoritarian = EIU 0.96 | A (USDP won Jan 2026 election) | pass | CIA 2026-04-17; RUL rulm2, 2026-01, 2026-04, index; EIU |
| 28 | SDN | ✓ Chairman of the Sovereignty Council since 2019; PM (M) since May 2025 | ✓ | ✓ 60-69 (1960) | ✓ military_junta (EIU authoritarian 1.46) | C | pass | RUL ruls3; CIA 2022 stale; EIU |
| 29 | BFA | ✓ transitional President since 30 Sep 2022 | ✓ | ✓ 30-39 (1988) | ✓ military_junta (EIU authoritarian 2.55) | C | pass | CIA 2026-05-27; RUL rulb2; EIU |
| 30 | NER | ✓ President since 26 Mar 2025 (junta chair from Jul 2023) | ✓ | ✓ 60-69 (1964) | ✓ military_junta (EIU authoritarian 1.95) | C | pass | RUL ruln2; CIA 2025-06-17; EIU |
| 31 | MLI | ✓ Transition President since May 2021 | ✓ | ✓ 40-49 (1983) | ✓ military_junta (EIU authoritarian 2.40) | C | pass | CIA 2026-08-24; RUL rulm1, 2026-05; EIU |
| 32 | VEN | ✓ Acting President since 5 Jan 2026, also Executive VP | ✓ F ("Her Excellency"; RUL `(f)`) | ✓ 50-59 (1969) | ✓ authoritarian = EIU 2.13 | D | pass | UN81 front page; CIA 2026-08-26; RUL rulvw, 2026-01; EIU |
| 33 | ARG | ✓ President since 10 Dec 2023 | ✓ | ✓ 50-59 (1970) | ✓ flawed = EIU 6.89 | B (LLA) | pass | UN81 front page; CIA 2026-08-06; RUL rula2, 2025-10, 2026-06; EIU |
| 34 | BHR | ✓ King since 1999; Crown Prince and PM (M) | ✓ | ✓ 70-79 (1950) | ✓ constitutional_monarchy_executive (EIU authoritarian 2.46-2.54) | C | pass | RUL rulb1, 2026-04; CIA 2022 stale; EIU |
| 35 | OMN | ✓ Sultan, also Prime Minister | ✓ | ✓ 70-79 (13 Oct 1954) | ✓ absolute_monarchy (EIU authoritarian 3.05) | C | pass | CIA 2025-06-05; RUL ruln2, index; EIU |
| 36 | MAR | ✓ King since 1999; Head of Government (M) since 2021 | ✓ | ✓ 60-69 (1963) | ✓ constitutional_monarchy_executive (EIU hybrid 4.97) | D | pass | RUL rulm2; UN81 ma (foreign minister spoke); CIA 2024 stale; EIU |
| 37 | AUT | ✓ Federal Chancellor since 3 Mar 2025 | ✓ | ✓ 60-69 (1960) | ✓ full = EIU 8.42 | B (ÖVP) | pass | RUL rula2; CIA 2025-07-29; EIU |
| 38 | GIN | ✓ President (inaugurated Jan 2026, head of state since 2021); PM (M) reappointed | ✓ | ✓ 40-49 (1984) | ✓ authoritarian = EIU 2.15 | B (GMD, 94 of 147 seats) | pass | UN81 gn (23 Sep 2026); CIA 2026-07-29; RUL rulg2, 2026-01, 2026-05; EIU |
| 39 | HTI | ✓ seat; **title wrong**: PM since 11 Nov 2024, not acting; acting head of state since 7 Feb 2026 | ✓ | ✓ 50-59 (1971) | ✓ authoritarian = EIU 2.81 | C | **1 cell wrong, fixed** | VER-HTI-1, VER-HTI-2; EIU |
| 40 | HUN | ✓ Prime Minister since 9 May 2026; President (M) since 19 Aug 2026 | ✓ | ✓ 40-49 (1981) | ✓ flawed = EIU 6.58 | A (Tisza, 141 of 199 seats) | pass | RUL rulh, 2026-04, 2026-05, 2026-07, 2026-08; CIA 2026-07-02 (predates new President); EIU |
| 41 | KNA | ✓ Prime Minister since 6 Aug 2022 | ✓ | ✓ 40-49 (22 Nov 1976) | not rated by EIU; `flawed_democracy` is the researcher's labeled inference, not checked | A (SKNLP leader since 2021) | pass | RUL ruls1, index; CIA 2024 stale |
| 42 | MDA | ✓ President (f) since 24 Dec 2020; new PM (M) 22 Jul 2026 | ✓ F (RUL `(f)`) | ✓ 50-59 (1972) | ✓ hybrid = EIU 5.86 | D (government confirmed 53-21; party not named) | pass | CIA 2026-09-04; RUL rulm2, 2026-07; EIU |
| 43 | MNE | ✓ Prime Minister since 31 Oct 2023 | ✓ | ✓ 30-39 (24 Sep 1987) | ✓ flawed = EIU 6.73 | D | pass | CIA 2026-08-03; RUL rulm2, index; UN81 front page (President); EIU |
| 44 | NZL | ✓ Prime Minister since 27 Nov 2023; Governor-General (f) | ✓ | ✓ 50-59 (1970) | ✓ full = EIU 9.62 | B (National) | pass | CIA 2026-08-17; RUL ruln1, 2026-04, 2026-08; EIU |
| 45 | SRB | ✓ President since 31 May 2017, still in office and speaking at UNGA on 23 Sep 2026 | ✓ | ✓ 50-59 (1970) | ✓ flawed = EIU 6.30 | D | pass | UN81 front page; RUL ruls2, 2026-06, 2026-09; CIA 2025-04-17; EIU |

Counts in the parties column: A 8, B 10, C 10, D 16, corrected 1. That makes 18 rows confirmed at level A or B, 10 no-party rows consistent with the regime, and 16 lists never checked here.

## The two corrections

**HTI `leader_title`.** The row said "Acting Prime Minister". The CIA page (last updated 2026-03-10) lists the office as "Prime Minister" and lists no President. Rulers.org lists the same person as Prime Minister from 11 Nov 2024 with no "acting" marker, though the same list marks acting premiers elsewhere, and lists him separately as acting head of state from 7 Feb 2026. Its February 2026 log says he "assumes the functions of head of state" when the Transitional Presidential Council's mandate ended. The researchers' HTI-1 (an English Wikipedia biography) was the only source for "acting". The seat, sex, age band, regime and parties cells were right and stay as they were.

**ISR `governing_parties`.** The row listed New Hope as a separate governing party. Times of Israel (2026-08-11) reports that the foreign minister holds a reserved Likud slot "under the terms of last year's merger between his New Hope party and Likud", so New Hope stopped being a separate party in 2025. The researchers' ISR-1 still listed it among the parties in the coalition at the 17 July 2026 dissolution. The Times of Israel front page on 2026-09-23 confirms that the Otzma Yehudit and Religious Zionism leaders still hold their ministries. Shas stays in the list: no source opened here confirmed or contradicted its standing, and the Shas topic page shows no headline about it leaving the coalition.

Both rows gained `VER-*` ids in `source_ids`. The ids are defined in `sources.md` under "Verification-pass sources" and in each nation's section.

## Observations outside the checked columns (nothing changed)

- **HTI second seat.** Rulers.org has the Prime Minister acting as head of state since 7 Feb 2026. `same`/`same` may describe that better than `none`/`none`. The table's own README codes a vacant presidency `none`, so this is a convention question for the owner, not an error.
- **EGY parties.** The EGY note says `governing_parties` "names the parliamentary majority", but Rulers.org's January 2026 log gives Nation's Future 227 of 568 elected seats, a plurality. Homeland Defenders (87), National Front (65) and Republican People's (25) follow. No source opened here says which of those parties back the government, so the cell is unchanged, but "majority" in the note overstates it.
- **MAR regime.** The EIU rates Morocco a hybrid regime (4.97). The row's `constitutional_monarchy_executive` fits the table's definition, but it hides the only non-authoritarian EIU category among the monarchy overrides (BHR, JOR and MAR share the type). Worth knowing if a consumer maps regime type back to EIU bands.
- **Stale CIA pages.** 22 of the 44 CIA pages were last updated before 2026: RUS, CHN, JPN, DEU, FRA, SAU, IRN, ISR, PAK, IDN, PRK, CAN, POL, ITA, SDN, NER, BHR, OMN, MAR, AUT, KNA and SRB. Four CIA pages name a predecessor the table correctly replaces: JPN (previous PM), SAU (the King as PM) and IRN (the late Supreme Leader), all pre-2026, plus HUN, whose page is dated 2026-07-02 and still shows the President removed that month. The table is right in each case, and the newer sources above settle it.
- **Rows about to change.** SRB (resignation announced for 27 Sep), MAR (legislative election held on as-of day) and ISR (election 27 Oct) all fit this pass's checks on 2026-09-23. They will go stale within weeks, as the README already warns.
- **Rebuild risk.** `regions/americas.tsv` and `regions/mena.tsv` still carry the old HTI and ISR values, and the README's "Merge-pass changes" list doesn't mention these two corrections. Both files are outside this pass's write scope. A rebuild of `nation-leaders.tsv` from the regional files would bring the errors back.

## What this pass did not prove

- **Coalition partners.** For the D rows (IND, FRA, BRA, TUR, NGA, PAK, IDN, KOR, UKR, POL, ITA, VEN, MAR, MDA, MNE, SRB) and the partners in the B rows (DEU, JPN, ZAF, EGY, ARG, AUT, NZL, MEX, RUS, GIN), no independent source was opened. The lists are not contradicted, and that is all this pass can say about them.
- **EIU scores** were read from a transcription (German Wikipedia), not from the EIU report. The category for all 44 rated rows matched the table.
- **KNA `regime_type`** is unrated by the EIU and was not re-checked against Freedom House.
- **Birth years** come from Rulers.org, one independent compilation. Where it gives only a year and no band boundary falls in 2026, the band follows from the year whatever the birthday. AFG's and PRK's birth years remain disputed. PRK's range (1982 to 1984) stays inside 40-49. AFG's doesn't: 1967 gives 50-59, but the older estimates (1959 to 1961) would give 60-69. Rulers.org uses 1967, as the row does, so the row stands, but the band isn't settled.

## Sources opened in this pass

All opened on 2026-09-23.

| id | URL | What it established |
|---|---|---|
| VER-CIA-* | `https://www.cia.gov/resources/world-leaders/foreign-governments/<slug>/` for russia, china, india, japan, germany, united-kingdom, france, brazil, mexico, saudi-arabia, iran, israel, turkey, egypt, nigeria, south-africa, pakistan, indonesia, korea-south, korea-north, canada, ukraine, poland, italy, afghanistan, burma, sudan, burkina-faso, niger, mali, venezuela, argentina, bahrain, oman, morocco, austria, guinea, haiti, hungary, saint-kitts-and-nevis, moldova, montenegro, new-zealand, serbia | Office titles and holders per country, with each page's last-updated date (dates in the per-row table). VER-HTI-1 is the Haiti page. |
| VER-UN81 | https://gadebate.un.org/en | Speakers on 22 and 23 September 2026 with titles and honorifics, including the UK Prime Minister, Japan's Prime Minister ("Her Excellency"), Argentina's, Serbia's, Guinea's, Poland's and Montenegro's Presidents, and Venezuela's Acting President ("Her Excellency"). |
| VER-UN81-* | https://gadebate.un.org/en/81/brazil, /turkiye, /japan, /france, /republic-korea, /iran-islamic-republic, /ukraine, /guinea, /morocco | Individual speaker pages with the date and title of each statement. The Israel page returned 403, and the other target countries had not spoken yet. |
| VER-RUL-C | https://rulers.org/ country lists: rula1, rula2, rulb1, rulb2, rulc1, rulc2, rule, rulf, rulg1, rulg2, rulh, ruli, ruljk, rulm1, rulm2, ruln1, ruln2, rulp1, rulp2, rulqr, ruls1, ruls2, ruls3, rult, rulu, rulvw (`.html`) | Current officeholders, start dates, birth years, `(f)` markers and, for some countries, party abbreviations. VER-HTI-2 includes rulh. |
| VER-RUL-I | https://rulers.org/indexd4.html, /indexh1.html, /indexm4.html, /indexs4.html | Full birth dates: KNA 22 Nov 1976, MMR 3 Jul 1956, OMN 13 Oct 1954, MNE 24 Sep 1987. The KNA entry also names his party leadership (SKNLP, 2021-). |
| VER-RUL-M | https://rulers.org/2025-10.html through /2026-09.html (twelve monthly logs) | Dated leadership changes: IRN Supreme Leader (Feb and Mar 2026), VEN acting presidency (Jan 2026), HTI head-of-state functions (Feb 2026), MMR presidency (Apr 2026), HUN election, PM and President (Apr to Aug 2026), GBR PM (Jul 2026), UKR PM (Jul 2026), MDA PM (Jul 2026), SAU PM reappointment (Aug 2026), SRB resignation plan (Sep 2026), GIN and MMR election results, and EGY's January 2026 seat counts. |
| VER-EIU-DE | https://de.wikipedia.org/w/index.php?title=Demokratieindex_(The_Economist)&action=raw | EIU Democracy Index 2025 category and score for every rated country (first score column headed 2025). |
| VER-SAU-1 | https://saudigazette.com.sa/article/664763/saudi-arabia/king-salman-houthi-bid-to-target-makkah-provokes-sentiments-of-world-muslims | Dated 22 Sep 2026: the King addressed a cabinet session, and the cabinet reviewed the visit of the "Crown Prince and Prime Minister" to Egypt. |
| VER-SAU-2 | https://www.aljazeera.com/news/2026/9/22/saudi-king-slams-heinous-targeting-of-mecca-by-terrorist-houthis | Dated 22 Sep 2026: the 90-year-old King is reigning, and the Crown Prince met Egypt's President. |
| VER-ISR-1 | https://www.timesofisrael.com/saar-katz-to-receive-reserved-slots-on-likud-list-expanding-pms-control-of-party-slate/ | Dated 11 Aug 2026: New Hope merged into Likud in 2025. |
| VER-ISR-2 | https://www.timesofisrael.com/ and https://www.timesofisrael.com/topic/aryeh-deri/ | 23 Sep 2026: Otzma Yehudit and Religious Zionism leaders still hold their ministries, and the election is about a month away. The Knesset dispersed on 17 Jul 2026, and no headline reports Shas leaving the coalition. |
| VER-ISR-3 | https://www.timesofisrael.com/topic/gideon-saar/ | Headlines from Aug and Sep 2026 show the New Hope leader serving as foreign minister and taking a reserved Likud slot. |
| (context) | https://www.aljazeera.com/where/saudi-arabia/, https://www.aljazeera.com/news/2026/9/22/trump-gcc-summit-in-new-york-what-does-each-side-want | Dated September 2026 headlines. They added nothing beyond VER-SAU-1 and VER-SAU-2. |

Tried and unusable: `eiu.com` (refused), Our World in Data's EIU chart (data only to 2024, download blocked), `britannica.com` (403), `press.un.org` (bot challenge, not bypassed), `arabnews.com` and `english.alarabiya.net` (no readable content or 403), `saudiembassy.net` (certificate error), and several South African and Polish news indexes, whose headlines said nothing about coalition membership.
