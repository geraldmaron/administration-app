# Nation leader table: sources

This file backs `nation-leaders.tsv`. It merges the eight regional source files in `regions/` and adds what the merge pass found on 2026-09-23. Each nation has one section, sorted by id. Every URL was opened on 2026-09-23.

Each nation section names its region file. The shared source ids a row cites (for example `EIU-2025`, `WIP-2026`, `HEADS`, `REPO`) are listed below and defined in full, region by region, in the appendix.

**On names.** The table itself names no one. Many source URLs point at biography pages or news stories, so a URL often carries a person's name because that is the page's address.

## Shared source ids

Different regional researchers used different ids for the same documents. They mean the same thing wherever they appear.

| id (and aliases) | document | used for |
|---|---|---|
| `EIU-2025`, `SHR-2`, `OCE-EIU` | The Economist Intelligence Unit Democracy Index 2025 (published April 2026), read from the country table at https://en.wikipedia.org/wiki/The_Economist_Democracy_Index | `regime_type` category and score |
| `SHR-3`, `DWB-2025` | Press coverage of the EIU 2025 release (PR Newswire; Democracy Without Borders) | confirms the 2025 edition and its column order |
| `WIP-2026`, `SHR-1`, `OCE-WIP26` | IPU and UN Women, "Women in Politics: 2026" map, data as at 1 January 2026, https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | `women_cabinet_share` |
| `WIP-2025`, `OCE-WIP25` | The 2025 edition of the same map (as at 1 January 2025) | cross-check only |
| `FH-2026` | Freedom House, Freedom in the World 2026 country pages | `regime_type` where the EIU gives no score |
| `HEADS`, `SHR-4`, `WIKI-HEADS` | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government | cross-check of both seats |
| `REPO`, `REPO-NAMES` | This repository's `packages/world/src/dataset/people.ts`, `name-cultures.ts` and `name-banks.ts` | `name_culture` keys |
| `MRG-*` | Merge-pass sources, listed in the next section | the six `women_cabinet_share` values that were blank |
| `VER-*` | Verification-pass sources, listed in "Verification-pass sources" below and in full in `verification.md` | the two cells the verification pass corrected (HTI, ISR) |

## Merge-pass sources

The regional files left `women_cabinet_share` blank for six rows because the UN Women/IPU map does not cover them. The merge pass counted each cabinet directly. These figures are counts of officeholders who head a ministry, the map's own rule, but they are not map figures, and four of them describe a cabinet newer than the map's 1 January 2026 snapshot.

| id | URL | opened | what it established |
|---|---|---|---|
| MRG-AFG | https://en.wikipedia.org/w/index.php?title=Women_in_Afghanistan&action=raw | 2026-09-23 | The Taliban returned to power in August 2021 and formed an all-male government. The asia file's note says the same of today's cabinet. Share: 0.0. |
| MRG-PRK | https://en.wikipedia.org/w/index.php?title=Cabinet_of_North_Korea&action=raw | 2026-09-23 | Cabinet as of 22 March 2026, appointed at the first session of the 15th Supreme People's Assembly (the page cites a KCNA Watch report dated 23 March 2026). 35 posts head a ministry or state commission: 32 ministers and 3 commission chairs. The count leaves out the Premier, the vice premiers without a commission, the cabinet secretary general, the Academy of Sciences, the central bank and the statistics bureau. One of the 35 is a woman, the foreign minister. Share: 2.9 (estimate). |
| MRG-TWN | https://en.wikipedia.org/w/index.php?title=Executive_Yuan&action=raw | 2026-09-23 | Lists the 15 ministries of the Executive Yuan and their heads. Two are women (interior and finance). Share: 13.3. Councils and commissions are not counted. The page still lists an economic affairs minister who was replaced in 2025, so the listing may lag the current cabinet. |
| MRG-MMR | https://en.wikipedia.org/w/index.php?title=Second_Min_Aung_Hlaing_cabinet&action=raw | 2026-09-23 | 30 Union ministers were sworn in on 10 April 2026 (the page cites the Ministry of Information). Three are women: legal affairs and education, both confirmed by their own Wikipedia biographies (linked from this page and opened the same day), and women's affairs, whose sex is inferred from the name form. Share: 10.0, or 6.7 if the inference is wrong. The official GNLM nominee list returned HTTP 403. |
| MRG-XKX | https://en.wikipedia.org/w/index.php?title=Fourth_cabinet_of_Albin_Kurti&action=raw | 2026-09-23 | The cabinet formed on 13 September 2026 has the Prime Minister, who holds no portfolio, plus 20 ministers, three of them deputy prime ministers with portfolios. Five of the 20 are women: justice, culture and tourism, economy, environment and spatial planning, and industry, entrepreneurship and trade. Their sex was read from the name form and prior public record, not from each biography. Share: 25.0. |
| MRG-PSE | https://en.wikipedia.org/w/index.php?title=Mustafa_Government&action=raw and https://en.wikipedia.org/w/index.php?title=2026_in_Palestine&action=raw | 2026-09-23 | The 19th government (formed 31 March 2024) is still in office in 2026. After the 2025 changes, 20 people head its 22 ministries: one holds finance and planning, another social development plus an interim portfolio, and the Prime Minister no longer holds foreign affairs. Four of the 20 are women: foreign affairs, labor, social development and women's affairs. PSE-3 (the PMO minister page) shows the same four. Share: 20.0. |

## Verification-pass sources

An adversarial re-check of 45 rows ran on 2026-09-23 against sources other than the ones the regional researchers cited. Its full record, including every source it opened, is `verification.md`. Two cells changed, and these are the sources that proved each change.

| id | URL | opened | what it established |
|---|---|---|---|
| VER-HTI-1 | https://www.cia.gov/resources/world-leaders/foreign-governments/haiti/ | 2026-09-23 | CIA World Leaders, last updated 2026-03-10: the officeholder is listed as "Prime Minister", not acting. No President is listed. |
| VER-HTI-2 | https://rulers.org/rulh.html and https://rulers.org/2026-02.html | 2026-09-23 | Rulers.org lists him as Prime Minister from 11 Nov 2024 with no "acting" marker (the list marks acting premiers elsewhere). He is listed separately as acting head of state from 7 Feb 2026, when the Transitional Presidential Council's mandate ended and he "assumes the functions of head of state". Born 1971. |
| VER-ISR-1 | https://www.timesofisrael.com/saar-katz-to-receive-reserved-slots-on-likud-list-expanding-pms-control-of-party-slate/ | 2026-09-23 | Times of Israel, dated 2026-08-11: the foreign minister "had been guaranteed a reserved slot on the list under the terms of last year's merger between his New Hope party and Likud". New Hope is no longer a separate governing party. |
| VER-ISR-2 | https://www.timesofisrael.com/ (front page) and https://www.timesofisrael.com/topic/aryeh-deri/ | 2026-09-23 | Front page, 2026-09-23: the Otzma Yehudit leader is still National Security Minister and the Religious Zionism leader is still Finance Minister, with the election about a month away. The Shas topic page shows the Knesset dispersed on 2026-07-17 and no headline of Shas leaving the coalition. |

## Nations

### USA (United States)

Region file: none. This is the player's seat. `leader_seat` is `head_of_state`, `leader_title` is `President`, and every other attribute column reads `player`, because the player is the President. No source applies.

### AFG (Afghanistan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| AFG-1 | https://en.wikipedia.org/wiki/Hibatullah_Akhundzada | 2026-09-23 | Supreme Leader of Afghanistan since 15 August 2021 (Taliban leader since 2016). Birth date 19 October 1967 per Taliban sources and the ICC; other estimates run from 1959 to 1961. |
| AFG-2 | https://en.wikipedia.org/wiki/Hasan_Akhund | 2026-09-23 | Prime Minister (male), acting from September 2021 and substantive from 15 August 2025. |

Notes: coded `theocracy` because the Islamic Emirate's form demands it (EIU 2025: authoritarian, 0.25). Parties are not permitted. Age band 50-59 follows the 1967 date; the older estimates give 60-69, so the band is uncertain. No women's figure (WIP-2026: information not available; the cabinet has no women). No selection is scheduled.

- Merge pass: `women_cabinet_share` filled as 0.0 from MRG-AFG (the cabinet has no women; WIP-2026 lists Afghanistan as information not available).
- Merge pass: the `surname_rule` example epithet was replaced with "religious titles such as Mawlawi", because the old example was the sitting second seat's own name.

### AGO (Angola)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| AGO-1 | https://en.wikipedia.org/wiki/Jo%C3%A3o_Louren%C3%A7o | 2026-09-23 | The President is incumbent, in office since 26 September 2017. Party MPLA. Born March 1954, so 72. The Vice President is female. |
| AGO-2 | https://en.wikipedia.org/wiki/2027_Angolan_general_election | 2026-09-23 | The general election is due "by August 2027", and the incumbent is term-limited. |

Next selection: 2027-08. The MPLA congress in December 2026 is expected to shape the succession, but the leader seat changes only at the 2027 election.

### ALB (Albania)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ALB-1 | https://en.wikipedia.org/wiki/Rama_IV_Government (raw) | 2026-09-23 | The fourth government of the same Prime Minister is a single-party Socialist Party majority formed after the 2025 parliamentary election. |
| ALB-2 | https://en.wikipedia.org/wiki/Edi_Rama (raw) | 2026-09-23 | Prime Minister since 11 September 2013, born 1964 (age 62). |

The government portal (https://kryeministria.al/en/) returned an empty shell to a plain fetch and could not be read. The President (M) is from HEADS. The next parliamentary election is estimated at May 2029 from the four-year term after May 2025. EIU: flawed democracy (6.20).

### AND (Andorra)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| AND-1 | https://www.govern.ad/ca/govern/el-cap-del-govern | 2026-09-23 | Official page of the sitting Cap de Govern (Head of Government, M). |
| AND-2 | https://en.wikipedia.org/wiki/Xavier_Espot_Zamora | 2026-09-23 | Head of Government born 1979-10-30 (age 46), in office since 2019-05-16. |
| AND-3 | https://en.wikipedia.org/wiki/2027_Andorran_parliamentary_election | 2026-09-23 | Election due no later than 2027-06-05. The incumbent is term-limited. DA and CC hold 16 of 28 seats. |
| AND-4 | https://freedomhouse.org/country/andorra/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 93/100 Free. The EIU doesn't rate Andorra, so the row uses full_democracy. |
| AND-5 | https://en.wikipedia.org/wiki/Josep-Llu%C3%ADs_Serrano_Pentinat | 2026-09-23 | The Episcopal Co-Prince (M) has held office since 2025-05-31. The other Co-Prince is the French President (M). |

### ARE (United Arab Emirates)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ARE-1 | https://u.ae/en/about-the-uae/the-uae-government/the-federal-supreme-council | 2026-09-23 | Primary source, the UAE government portal. The President (Ruler of Abu Dhabi) was elected by the Federal Supreme Council on 14 May 2022. The Ruler of Dubai is Vice President. |
| ARE-2 | https://en.wikipedia.org/wiki/President_of_the_United_Arab_Emirates | 2026-09-23 | The Federal Supreme Council elects the President to a five-year renewable term, with the next vote due in 2027. The Vice President is also Prime Minister. |
| ARE-3 | https://en.wikipedia.org/wiki/Mohamed_bin_Zayed_Al_Nahyan | 2026-09-23 | Born 11 March 1961 (age 65), President since 14 May 2022, incumbent. |

Next selection is 2027-05, when the Federal Supreme Council's five-year re-election falls due. In practice it is a formality. EIU: authoritarian (3.18), overridden to absolute_monarchy (a federation of hereditary rulers).

### ARG (Argentina)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| ARG-1 | https://en.wikipedia.org/wiki/Javier_Milei (wikitext) | 2026-09-23 | President since 10 December 2023, born October 1970 (age 55), La Libertad Avanza. |
| ARG-2 | https://en.wikipedia.org/wiki/Cabinet_of_Javier_Milei | 2026-09-23 | Current cabinet of 9: La Libertad Avanza 4, Republican Proposal (PRO) 2, independents 3; 2 women. |
| ARG-3 | https://www.casarosada.gob.ar/ | 2026-09-23 | Official site, latest item dated 15 September 2026, shows the same president. |

Notes: the next election is October 2027. Argentines customarily use only the paternal surname in public life.

### ARM (Armenia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ARM-1 | https://oc-media.org/pashinyans-civil-contract-wins-parliamentary-elections/ | 2026-09-23 | Dated news (June 2026): Civil Contract won about 50% and 64 of 105 seats in the 7 June 2026 election, a working majority. |
| ARM-2 | https://www.primeminister.am/en/press-release/item/2026/08/02/Nikol-Pashinyan-met-with-Vahagn-Khachaturyan/ | 2026-09-23 | Primary source (2026-08-02): the President signed the decree reappointing the Prime Minister on the Civil Contract faction's proposal. |
| ARM-3 | https://en.wikipedia.org/wiki/Nikol_Pashinyan (raw) | 2026-09-23 | Prime Minister since 8 May 2018, born 1975 (age 51). |

The President (M) is from HEADS. The next parliamentary election is estimated at June 2031 from the five-year term after June 2026. EIU: hybrid regime (5.35).

### ATG (Antigua and Barbuda)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| ATG-1 | https://en.wikipedia.org/wiki/Gaston_Browne (wikitext) | 2026-09-23 | Prime Minister since 13 June 2014, born February 1967 (age 59), Antigua and Barbuda Labour Party. |
| ATG-2 | https://en.wikipedia.org/wiki/2026_Antiguan_general_election (wikitext) | 2026-09-23 | Snap general election held 30 April 2026. |

Notes: the ruling party won a fourth consecutive term (15 of 17 seats per the search summary). Its second-term swearing-in (2 May 2026) was seen only in search results, not on an opened page. The Governor-General is male. The next election is 2031-04 on the five-year convention.

### AUS (Australia)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| AUS-1 | https://www.abc.net.au/news/2026-09-23/federal-politics-albanese-responds-us-criticism-social-media-law/107184528 | 2026-09-23 | ABC News, dated 2026-09-23, reports the sitting Prime Minister in office today. |
| AUS-2 | https://en.wikipedia.org/wiki/Anthony_Albanese | 2026-09-23 | Incumbent PM since 23 May 2022, Australian Labor Party, re-elected May 2025. Born March 1963 (age 63, band 60-69). |
| AUS-3 | https://en.wikipedia.org/wiki/Governor-General_of_Australia | 2026-09-23 | Governor-General is a woman, in office since 1 July 2024. |
| AUS-4 | https://en.wikipedia.org/wiki/Next_Australian_federal_election | 2026-09-23 | No date set. A simultaneous House and half-Senate election is due on or before 20 May 2028 (row uses 2028-05). A House-only election could run to 23 Sept 2028. |
| AUS-5 | https://en.wikipedia.org/wiki/Prime_Minister_of_Australia | 2026-09-23 | Confirms the office and the incumbent's party and start date. |

### AUT (Austria)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| AUT-1 | https://www.bundeskanzleramt.gv.at/en.html | 2026-09-23 | Official site names the sitting Bundeskanzler (M). |
| AUT-2 | https://en.wikipedia.org/wiki/Christian_Stocker | 2026-09-23 | Chancellor born 1960-03-20 (age 66), in office since 2025-03-03. |
| AUT-3 | https://en.wikipedia.org/wiki/Stocker_government | 2026-09-23 | Majority coalition of ÖVP, SPÖ and NEOS. |
| AUT-4 | https://en.wikipedia.org/wiki/Next_Austrian_legislative_election | 2026-09-23 | National Council election by 2029. The last one was September 2024 and the term is five years, so 2029-09 is used. |

### AZE (Azerbaijan)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| AZE-1 | https://president.az/en (curl) | 2026-09-23 | Primary source. The President received new ambassadors on 23 September 2026. |
| AZE-2 | https://en.wikipedia.org/wiki/Ilham_Aliyev (raw) | 2026-09-23 | President since 31 October 2003, born 1961 (age 64). New Azerbaijan Party. |

The Prime Minister (M) is from HEADS. The First Vice President is the President's spouse; she is not a separate seat in this table. The next presidential election is estimated at February 2031 from the seven-year term after the February 2024 snap vote. EIU: authoritarian (2.80). WIP-2026 records no women among 16 ministers.

### BDI (Burundi)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BDI-1 | https://en.wikipedia.org/wiki/%C3%89variste_Ndayishimiye | 2026-09-23 | The President has been in office since 18 June 2020 for a seven-year term and belongs to CNDD-FDD. Born June 1968, so 58 on the as-of date. He is African Union chairperson from February 2026. |
| BDI-2 | https://en.wikipedia.org/wiki/Nestor_Ntahontuye | 2026-09-23 | A new Prime Minister (male), formerly finance minister, took office on 5 August 2025. His predecessor moved to the Senate presidency. |
| BDI-3 | https://www.thestar.com.my/news/world/2026/05/09/burundi-announces-schedule-for-2027-presidential-election | 2026-09-23 | Dated news (Bujumbura, 2026-05-08): the electoral commission set the presidential election for 3 May 2027, with the swearing-in on 18 June 2027. The ruling party nominated the incumbent on 26 April, and the term is renewable once. |

Next selection: 2027-05.

### BEL (Belgium)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| BEL-1 | https://en.wikipedia.org/wiki/De_Wever_government | 2026-09-23 | "Arizona" majority coalition of N-VA, MR, Les Engagés, Vooruit and CD&V. Formed 2025-02-03, not dissolved. |
| BEL-2 | https://en.wikipedia.org/wiki/Bart_De_Wever | 2026-09-23 | PM (M) born 1970-12-21 (age 55), in office since 2025-02-03. |
| BEL-3 | https://en.wikipedia.org/wiki/Elections_in_Belgium | 2026-09-23 | Chamber members serve five-year terms. The next federal election falls in June 2029, alongside the European election. |

Blocked official sources: premier.be returned 403 and belgium.be served a CAPTCHA, so neither was used. The row rests on BEL-1, BEL-2 and SHR-4.

### BEN (Benin)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BEN-1 | https://www.africanews.com/2026/05/24/former-finance-minister-romuald-wadagni-sworn-is-as-benins-new-president/ | 2026-09-23 | Dated news (2026-05-24): a new President was sworn in after winning 94% on 12 April 2026. A 2025 constitutional reform extended the term to seven years. |
| BEN-2 | https://en.wikipedia.org/w/index.php?title=Romuald_Wadagni&action=raw | 2026-09-23 | In office since 24 May 2026. Nominated by the ruling coalition and formally independent. Born June 1976, so 50 on the as-of date. The Vice President is a woman. |
| BEN-3 | https://en.wikipedia.org/w/index.php?title=2026_Beninese_parliamentary_election&action=raw | 2026-09-23 | The 11 January 2026 election returned the Progressive Union for Renewal (60 seats) and the Republican Bloc (49 seats), all 109 seats between them. The page also records a foiled coup attempt in December 2025. |

Benin has no prime minister; the President is head of state and government, so the second seat is `same`. Next selection: 2033-04, derived from the seven-year term and April election timing.

### BFA (Burkina Faso)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BFA-1 | https://en.wikipedia.org/w/index.php?title=Ibrahim_Traor%C3%A9&action=raw | 2026-09-23 | Head of state since the September 2022 coup (sworn in 6 October 2022). The May 2024 national consultations extended the mandate by five years and let the leader stand in a later election. Born March 1988, so 38 on the as-of date. Coup and assassination plots were reported foiled in 2025 and January 2026. |
| BFA-2 | https://en.wikipedia.org/w/index.php?title=2024_in_Burkina_Faso&action=raw | 2026-09-23 | On 25 May 2024 the junta extended its tenure until 2029 (cites AP, 2024-05-26). |
| BFA-3 | https://en.wikipedia.org/w/index.php?title=2026_in_Burkina_Faso&action=raw | 2026-09-23 | On 29 January 2026 the military government dissolved all political parties (cites Reuters, 2026-01-29). The Prime Minister is unchanged. |
| BFA-4 | https://en.wikipedia.org/w/index.php?title=Jean_Emmanuel_Ou%C3%A9draogo&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 7 December 2024. |

Next selection: 2029-07. The year is sourced (BFA-2). The month assumes the 60-month extension runs from July 2024, and no election has been scheduled.

### BGD (Bangladesh)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| BGD-1 | https://en.wikipedia.org/wiki/Tarique_Rahman | 2026-09-23 | Prime Minister since 17 February 2026. Birth date given as 20 November 1968, citing the Jatiya Sangsad member profile and a Bangladesh Pratidin biography. |
| BGD-2 | https://www.dawn.com/news/1973874 | 2026-09-23 | Dated 17 February 2026 (wire report): sworn in after the 12 February election. The BNP coalition won 212 seats. The report gives his age as 60. |
| BGD-3 | https://www.aljazeera.com/news/2026/8/20/bangladesh-elects-ruling-party-veteran-alamgir-as-president | 2026-09-23 | Dated 20 August 2026: parliament elected a 78-year-old BNP veteran (male) President, 255 to 88. The previous President resigned on 24 July 2026. |
| BGD-4 | https://en.wikipedia.org/wiki/Mirza_Fakhrul_Islam_Alamgir | 2026-09-23 | New President in office from 21 August 2026. |
| BGD-5 | https://en.wikipedia.org/wiki/2026_Bangladeshi_general_election | 2026-09-23 | Election held 12 February 2026. The next is due at the end of the five-year term (coded 2031-02, an estimate). |

Notes: hybrid regime (EIU 2025: 4.27). The age band is uncertain. The parliament-cited 1968 birth date gives 57 (50-59); wire reports and Britannica use 1965, which gives 60 (60-69). The table uses the official record. The women's share of 19.0% is the interim government's on 1 January 2026, not the BNP cabinet's.

- Merge pass: the `surname_rule` examples changed from (Rahman, Islam, Hossain) to (Hossain, Uddin, Chowdhury). The first is the sitting Prime Minister's surname and the second is one of the sitting President's names.

### BGR (Bulgaria)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BGR-1 | https://www.euronews.com/my-europe/2026/05/08/bulgarian-parliament-confirms-rumen-radev-as-new-prime-minister | 2026-09-23 | Dated news (2026-05-08): parliament elected the Prime Minister 124 to 70 with 36 abstentions. His party, Progressive Bulgaria, won an outright majority (131 of 240) in the 19 April 2026 election, the first single-party majority since 1997. He resigned the presidency in January 2026 to run. |
| BGR-2 | https://www.gov.bg/en | 2026-09-23 | Primary source. The government portal names him as Prime Minister, with a news item dated 10 September 2026. |
| BGR-3 | https://sofiaglobe.com/2026/07/29/bulgaria-sets-october-25-date-for-2026-presidential-elections/ | 2026-09-23 | Dated news (2026-07-29): the presidential election is on 25 October 2026, with a runoff on 1 November if needed. |
| BGR-4 | https://en.wikipedia.org/wiki/Rumen_Radev (raw) | 2026-09-23 | Prime Minister since 8 May 2026, born 1963 (age 63). |

The President (F) took over when the former president resigned in January 2026 and is the second seat. That seat is up for election in October 2026, but the vote cannot replace the Prime Minister. The next parliamentary election is estimated at April 2030 from the four-year term after April 2026. WIP-2026 (5.3) describes the cabinet that was in office before May 2026. EIU: flawed democracy (6.34).

### BHR (Bahrain)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BHR-1 | https://en.wikipedia.org/wiki/King_of_Bahrain | 2026-09-23 | The monarch (born 28 January 1950, age 76) has ruled since 6 March 1999 as Emir and since 14 February 2002 as King. The Crown Prince is also PM. The King appoints the PM, the cabinet and the upper house, and can dissolve the elected lower house. |

The King holds executive power, so `head_of_state`. In office since 1999, when he took the throne as Emir. Political societies exist, but the government is appointed, not party-formed. EIU: authoritarian (2.45), overridden to constitutional_monarchy_executive because an elected lower house exists under the 2002 constitution. That is a close call against absolute_monarchy. Next selection: none scheduled.

### BHS (Bahamas)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| BHS-1 | https://en.wikipedia.org/wiki/Philip_Davis_(Bahamian_politician) (wikitext) | 2026-09-23 | Prime Minister since 17 September 2021, born June 1951 (age 75), Progressive Liberal Party. |
| BHS-2 | https://www.aljazeera.com/news/2026/5/13/philip-davis-and-progressive-liberal-party-win-general-election-in-bahamas | 2026-09-23 | Dated 13 May 2026: the PLP won the 12 May 2026 election, the first back-to-back party win since 1997. |
| BHS-3 | https://en.wikipedia.org/wiki/2026_Bahamian_general_election (wikitext) | 2026-09-23 | Early election on 12 May 2026 for 41 seats; parliament dissolved 8 April 2026. |
| BHS-4 | https://opm.gov.bs/ | 2026-09-23 | Office of the Prime Minister site, item dated 22 September 2026, shows the same Prime Minister. |

Notes: the Governor-General is female. The next election is 2031-05 on the five-year convention.

### BIH (Bosnia and Herzegovina)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BIH-1 | https://www.predsjednistvobih.ba/saop/default.aspx?id=109511&langTag=en-US (curl) | 2026-09-23 | Primary source, a Presidency press release: the Bosniak member became Chair of the Presidency on 16 March 2026 under the eight-month rotation. |
| BIH-2 | https://europeanwesternbalkans.com/2026/05/07/the-general-election-in-bih-to-be-held-on-4-october/ | 2026-09-23 | Dated news (2026-05-07): the Central Election Commission set the general election, which includes the Presidency, for 4 October 2026. |
| BIH-3 | https://www.kas.de/en/country-reports/detail/-/content/bosnia-and-herzegovina-in-the-election-year-2026 | 2026-09-23 | Country report dated 2026-04-02: the state-level coalition (HDZ BiH holds the Council of Ministers chair, with SNSD and the SDP, People and Justice and Our Party "Troika") is still in place but largely paralyzed. |
| BIH-4 | https://en.wikipedia.org/wiki/Denis_Be%C4%87irovi%C4%87 (raw) | 2026-09-23 | Chair since 16 March 2026 and Presidency member since 2022. Born 1975 (age 50). |

The leader seat is a **judgment call**. Executive power is split three ways: a three-member Presidency conducts foreign policy, the Council of Ministers is the government, and the international High Representative holds override powers. A foreign president deals with the Presidency, so the row records the rotating Chair as `head_of_state`. `leader_in_office_since` is 2026, when the current chair's rotation began, although he has sat on the Presidency since 2022. The Chair of the Council of Ministers (F) is the second seat. The 4 October 2026 election replaces the whole Presidency. EIU: hybrid regime (5.23).

### BLR (Belarus)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BLR-1 | https://president.gov.by/en/events (curl) | 2026-09-23 | Primary source. The President was issuing greetings and chairing meetings on 22 September 2026. The site also lists him as chairman of the Belarusian People's Congress (the All-Belarusian People's Assembly). |
| BLR-2 | https://en.wikipedia.org/wiki/Alexander_Lukashenko (raw) | 2026-09-23 | President since 20 July 1994, born 1954 (age 72). Formally an independent. The page links the 2025 presidential election, which began his current five-year term. |

The Prime Minister (M) is from HEADS. Political parties play no governing role. The pro-government Belaya Rus party dominates the legislature, but the President is nonpartisan and the cabinet is technocratic, so `governing_parties` is "none (nonpartisan)". EIU: authoritarian (1.99). The next presidential election is estimated at early 2030 from the five-year term after the January 2025 vote. No date has been set.

### BLZ (Belize)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| BLZ-1 | https://en.wikipedia.org/wiki/Johnny_Brice%C3%B1o (wikitext) | 2026-09-23 | Prime Minister since 12 November 2020, born July 1960 (age 66), People's United Party. |
| BLZ-2 | https://en.wikipedia.org/wiki/2025_Belizean_general_election (wikitext) | 2026-09-23 | Election on 12 March 2025: the PUP won a second term. |

Notes: the Governor-General is female. Belize's political elite mixes Creole (Anglo) and Mestizo (Hispanic) names; the repo maps `anglo`. The next election is 2030-03 on the five-year convention.

### BOL (Bolivia)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| BOL-1 | https://en.wikipedia.org/wiki/Rodrigo_Paz (wikitext) | 2026-09-23 | President since 8 November 2025, born 22 September 1967 (turned 59 the day before as_of). The infobox records the Christian Democratic Party as his 2025 candidacy vehicle. |
| BOL-2 | https://en.wikipedia.org/wiki/2025_Bolivian_general_election (wikitext) | 2026-09-23 | Elections on 17 August 2025, runoff 19 October 2025, won by the PDC candidate. |

Notes: **flagged uncertain** (a governance crisis and a public rift with the vice president were reported in 2026 search results but not opened). A US State Department readout of a 21 September 2026 meeting with the president was listed in search results but returned 403. The next election is August 2030.

### BRA (Brazil)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| BRA-1 | https://en.wikipedia.org/wiki/Luiz_In%C3%A1cio_Lula_da_Silva (wikitext) | 2026-09-23 | President since 1 January 2023, born October 1945 (age 80). |
| BRA-2 | https://pt.wikipedia.org/wiki/Governo_Lula_(2023%E2%80%93presente) (wikitext; fetched page also opened) | 2026-09-23 | Government led by the Workers' Party. Formal coalition: PCdoB, PV, PSOL, REDE, AGIR, PSB, Avante and Solidariedade. PSD, MDB and PDT have supported it since 2023; União Brasil and PP withdrew in 2025. 38 ministries, 10 held by women. |
| BRA-3 | https://www.aljazeera.com/news/2026/9/22/brazil-election-lula-and-flavio-bolsonaro-tied-in-latest-polls | 2026-09-23 | Dated 22 September 2026: the incumbent is running for a fourth term and is statistically tied in runoff polling. First round 4 October 2026, runoff 25 October 2026. |
| BRA-4 | https://en.wikipedia.org/wiki/2026_Brazilian_general_election | 2026-09-23 | Confirms the election dates and the incumbent's 2026 electoral alliance (PT, PCdoB, PV, PSOL, REDE, PSB, PDT). |

Notes: this seat can change within weeks. The new term would begin 1 January 2027. `governing_parties` lists the coalition and support parties with ministries; AGIR, Avante and Solidariedade are smaller coalition members left out for length. The current cabinet is 10 women of 38 (26%), against the map's 29.0%.

### BRB (Barbados)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| BRB-1 | https://en.wikipedia.org/wiki/Mia_Mottley (wikitext) | 2026-09-23 | Prime Minister since 25 May 2018, born October 1965 (age 60 on as_of), Barbados Labour Party. |
| BRB-2 | https://barbadostoday.bb/2026/02/12/mottley-leads-blp-to-historic-third-clean-sweep-at-polls/ | 2026-09-23 | Dated 12 February 2026: the BLP won all 30 seats in the 11 February 2026 election, its third straight clean sweep. |
| BRB-3 | https://en.wikipedia.org/wiki/Jeffrey_Bostic (wikitext) | 2026-09-23 | The President of Barbados (ceremonial head of state, male) has been in office since 30 November 2025. |
| BRB-4 | https://en.wikipedia.org/wiki/2026_Barbadian_general_election (wikitext) | 2026-09-23 | Election on 11 February 2026; parliament dissolved 19 January 2026. |

Notes: Barbados is a parliamentary republic. The House of Assembly has no elected opposition. The next election is 2031-02 on the five-year convention.

### BRN (Brunei)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| BRN-1 | https://en.wikipedia.org/wiki/Hassanal_Bolkiah | 2026-09-23 | Sultan since 1967 and also Prime Minister, born July 1946 (age 80). |
| BRN-2 | https://www.pmo.gov.bn/ | 2026-09-23 | PM's Office site carries a royal address dated 23 September 2026. |
| BRN-3 | https://freedomhouse.org/country/brunei/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026: Not Free, 27/100. |

Notes: `absolute_monarchy` by form; the EIU does not score Brunei. The one office holds both seats. There is no elected legislature, so the parties line reads `none (nonpartisan)` and no selection is scheduled.

- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### BTN (Bhutan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| BTN-1 | https://en.wikipedia.org/wiki/Tshering_Tobgay | 2026-09-23 | Prime Minister since 28 January 2024 (an earlier term ran 2013 to 2018), born September 1965 (age 61). |
| BTN-2 | https://en.wikipedia.org/wiki/Jigme_Khesar_Namgyel_Wangchuck | 2026-09-23 | Druk Gyalpo (King, male), head of state. |
| BTN-3 | https://en.wikipedia.org/wiki/2023%E2%80%9324_Bhutanese_National_Assembly_election | 2026-09-23 | People's Democratic Party won the 2023-24 election (rounds on 30 November 2023 and 9 January 2024). The next election is listed as 2028. |
| BTN-4 | https://en.wikipedia.org/wiki/Elections_in_Bhutan | 2026-09-23 | National Assembly elected every five years in primary and general rounds. |

Notes: hybrid regime (EIU 2025: 5.65). The seat is `head_of_government` because the constitution vests executive power in the cabinet under the Prime Minister. The King keeps wide reserve influence. 2028-11 is an estimate for the primary round.

### BWA (Botswana)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| BWA-1 | https://en.wikipedia.org/wiki/Duma_Boko | 2026-09-23 | The President has been in office since 1 November 2024 and leads the Umbrella for Democratic Change coalition. Born 31 December 1969, so 56. The page records a state visit he hosted in September 2026, which confirms he is still in office. |

Next selection: 2029-10, derived from the October 2024 election and the five-year term.

### CAF (Central African Republic)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CAF-1 | https://www.france24.com/en/live-news/20260105-central-african-republic-president-touadera-re-elected-with-over-76-of-vote | 2026-09-23 | Dated news (2026-01-05/06): re-elected with 76.15% on 28 December 2025 to a third term, after the 2023 referendum removed term limits. |
| CAF-2 | https://en.wikipedia.org/w/index.php?title=Faustin-Archange_Touad%C3%A9ra&action=raw | 2026-09-23 | In office since 30 March 2016, United Hearts Movement. Born April 1957, so 69 on the as-of date. |
| CAF-3 | https://en.wikipedia.org/w/index.php?title=2025%E2%80%9326_Central_African_general_election&action=raw | 2026-09-23 | General election on 28 December 2025, with the legislative runoff on 26 April 2026. The ruling party won the presidency. |
| CAF-4 | https://en.wikipedia.org/w/index.php?title=2023_Central_African_constitutional_referendum&action=raw | 2026-09-23 | The 2023 constitution lengthened presidential terms from five to seven years and removed term limits. |
| CAF-5 | https://en.wikipedia.org/w/index.php?title=F%C3%A9lix_Moloua&action=raw | 2026-09-23 | The Prime Minister (a man) has served since February 2022 and was reappointed in 2024. HEADS still lists him. |

Next selection: 2032-12, derived from the December 2025 election plus the seven-year term.

### CAN (Canada)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| CAN-1 | https://en.wikipedia.org/wiki/Mark_Carney (wikitext) | 2026-09-23 | Prime Minister since 14 March 2025, Liberal, born March 1965 (age 61). |
| CAN-2 | https://www.hilltimes.com/2026/04/14/carney-clinches-slim-majority-in-byelections-but-lacklustre-conservative-showing-makes-time-ripe-to-hunt-floor-crossers-say-politicos/499677/ | 2026-09-23 | Dated 14 April 2026: three by-election wins took the Liberal caucus to 174 seats, a majority. The minority government became a majority through floor-crossings and by-elections, without a general election. |
| CAN-3 | https://laws-lois.justice.gc.ca/eng/acts/e-2.01/page-6.html | 2026-09-23 | Canada Elections Act s. 56.1(2): the general election is held on the third Monday of October in the fourth calendar year after the last polling day. The last polling day was 28 April 2025, so the next election is October 2029. |
| CAN-4 | https://www.pm.gc.ca/en | 2026-09-23 | Official site: the same incumbent holds the office titled Prime Minister of Canada. |

Notes: the second seat is the King. The Governor General is currently a woman (WIKI-HEADS). The Quebec surname rule (women keep their birth surname) is general knowledge and was not re-sourced today. `anglo` is the repo key, though French-Canadian names are common in federal politics and the repo also has a `french` bank.

### CHE (Switzerland)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| CHE-1 | https://www.admin.ch/gov/en/start/federal-council/members-of-the-federal-council.html | 2026-09-23 | Official list: the 2026 President of the Confederation (M, SVP) and the seven Federal Councillors (2 SVP, 2 FDP, 2 SP, 1 Centre; two are women). |
| CHE-2 | https://en.wikipedia.org/wiki/Guy_Parmelin | 2026-09-23 | President born 1959-11-09 (age 66). Presidential term began 2026-01-01. |
| CHE-3 | https://www.admin.ch/gov/en/start/federal-council.html | 2026-09-23 | The presidency rotates yearly among the seven members. The Federal Assembly elects the 2027 President in December 2026. |

Leader seat: the collegial Federal Council is both head of state and head of government. The one-year President is primus inter pares and represents both seats, so the second seat is "same".

### CHL (Chile)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| CHL-1 | https://en.wikipedia.org/wiki/Jos%C3%A9_Antonio_Kast | 2026-09-23 | President since 11 March 2026, male, born January 1966 (age 60). Resigned his Republican Party membership shortly before taking office. |
| CHL-2 | https://en.wikipedia.org/wiki/Jos%C3%A9_Antonio_Kast_cabinet_ministers (fetched page and wikitext) | 2026-09-23 | Cabinet formed 11 March 2026: mostly independents, plus Republican Party, UDI, National Renewal, Evópoli, Radical Party (2018) and Christian Conservative Party ministers. 8 women of 25 on the current roster. |

Notes: the 45.8% share (11 of 24) is the outgoing cabinet's as at 1 January 2026; the current roster is 32%. There is no absolute majority in Congress. The next election is November 2029 (four-year term).

### CHN (China)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| CHN-1 | https://en.wikipedia.org/wiki/Xi_Jinping | 2026-09-23 | Party General Secretary since November 2012, state President since March 2013, born 1953 (age 73). |
| CHN-2 | https://en.wikipedia.org/wiki/Li_Qiang | 2026-09-23 | Premier (head of government, male) since March 2023. |
| CHN-3 | https://english.www.gov.cn/ | 2026-09-23 | State Council site lists the same Premier and vice-premiers in September 2026. |

Notes: `one_party_state` (EIU 2025: authoritarian, 2.24). The next selection is the 21st Party Congress. The five-year cycle puts it in autumn 2027, but no date has been announced, so 2027-10 is an estimate. The state presidency follows at the National People's Congress around March 2028.

### CIV (Côte d'Ivoire)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CIV-1 | https://www.cei.ci/wp-content/uploads/2025/10/EPR_2025_RESULTAT_NATIONAL.pdf (electoral commission, official) | 2026-09-23 | Provisional national results of the 25 October 2025 presidential election: the RHDP candidate (the incumbent) won 89.77%. |
| CIV-2 | https://en.wikipedia.org/w/index.php?title=2025_Ivorian_presidential_election&action=raw | 2026-09-23 | Final result 91.23%. The next election is labeled 2030. |
| CIV-3 | https://en.wikipedia.org/w/index.php?title=Alassane_Ouattara&action=raw | 2026-09-23 | Term start 11 April 2011, disputed with the predecessor from 4 December 2010. Born 1 January 1942, so 84 on the as-of date. |
| CIV-4 | https://en.wikipedia.org/w/index.php?title=Robert_Beugr%C3%A9_Mamb%C3%A9&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 17 October 2023. HEADS still lists him. |
| CIV-5 | https://en.wikipedia.org/w/index.php?title=Vice_President_of_Ivory_Coast&action=raw | 2026-09-23 | A man has been Vice President since 19 April 2022. The second seat recorded is the Prime Minister, the constitutional head of government. |

`leader_in_office_since` is 2011, when the incumbent actually took control. Official counts that start from December 2010 would give 2010. Next selection: 2030-10, derived.

- Merge pass: `governing_parties` now reads "RHDP (a rally named for the founding president)". The party's full name is built on a real person's name, and the table carries no personal names.

### CMR (Cameroon)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CMR-1 | https://www.prc.cm/en (official Presidency) | 2026-09-23 | The same President is in office, with news items dated August 2026. |
| CMR-2 | https://www.france24.com/en/live-news/20251027-cameroon-s-paul-biya-92-wins-re-election-constitutional-court-announces | 2026-09-23 | Dated news (2025-10-27): re-elected with 53.66% on 12 October 2025 to an eighth seven-year term, so the next election falls in 2032. Aged 92 then. |
| CMR-3 | https://en.wikipedia.org/w/index.php?title=Paul_Biya&action=raw | 2026-09-23 | President since 6 November 1982, party RDPC (Cameroon People's Democratic Movement). Born February 1933, so 93 on the as-of date. |
| CMR-4 | https://en.wikipedia.org/w/index.php?title=Joseph_Ngute&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 4 January 2019. HEADS still lists him. |
| CMR-5 | https://en.wikipedia.org/wiki/2025_Cameroonian_presidential_election (raw) | 2026-09-23 | Election on 12 October 2025. The next is labeled the 2032 election. |

Next selection: 2032-10, derived from the October 2025 election plus the seven-year term. At 93, the incumbent is the oldest head of state in this table, so an unscheduled succession before 2032 is a real possibility. None had occurred as of 2026-09-23 (CMR-1 shows him active in August 2026).

### COD (Democratic Republic of the Congo)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COD-1 | https://en.wikipedia.org/w/index.php?title=F%C3%A9lix_Tshisekedi&action=raw | 2026-09-23 | President since 24 January 2019, Union for Democracy and Social Progress. Born June 1963, so 63 on the as-of date. |
| COD-2 | https://en.wikipedia.org/w/index.php?title=Judith_Suminwa&action=raw | 2026-09-23 | A woman has been Prime Minister since 12 June 2024. WIP-2026 also lists the DRC among countries with a woman head of government. |
| COD-3 | https://en.wikipedia.org/w/index.php?title=2023_Democratic_Republic_of_the_Congo_general_election&action=raw | 2026-09-23 | The last general election was on 20 December 2023. |

`governing_parties` gives the President's party and the Sacred Union of the Nation, the presidential majority coalition. Next selection: 2028-12, derived from the December 2023 election plus the five-year term. Any constitutional change to presidential terms would move it; none was in force on the as-of date as far as the opened sources show.

### COG (Republic of the Congo)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COG-1 | https://www.africanews.com/2026/03/29/congo-brazzaville-court-confirms-sassou-nguesso-reelection-with-95/ | 2026-09-23 | Dated news (2026-03-29): the constitutional court confirmed re-election with 94.9% for a five-year term. Aged 82. |
| COG-2 | https://en.wikipedia.org/w/index.php?title=Denis_Sassou_Nguesso&action=raw | 2026-09-23 | President continuously since 25 October 1997 (and earlier, 1979-1992), Congolese Party of Labour. Born November 1943, so 82 on the as-of date. |
| COG-3 | https://en.wikipedia.org/w/index.php?title=2026_Republic_of_the_Congo_presidential_election&action=raw | 2026-09-23 | Election on 15 March 2026, five-year term, next election 2031. |
| COG-4 | https://en.wikipedia.org/w/index.php?title=2026_in_the_Republic_of_the_Congo&action=raw | 2026-09-23 | Inaugurated 16 April 2026 (cites AP, 2026-04-17). The Prime Minister is unchanged. |
| COG-5 | https://en.wikipedia.org/w/index.php?title=Anatole_Collinet_Makosso&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 12 May 2021. |

Next selection: 2031-03.

### COL (Colombia)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| COL-1 | https://en.wikipedia.org/wiki/Abelardo_de_la_Espriella | 2026-09-23 | President since 7 August 2026, male, born July 1978 (age 48). Founder and leader of the "Defenders of the Homeland" movement. |
| COL-2 | https://www.atlanticcouncil.org/dispatches/deadly-earthquake-gives-colombian-president-his-first-test/ | 2026-09-23 | Dated news: took office 7 August 2026 in Cali, the first inauguration held outside Bogotá. |
| COL-3 | https://directoriolegislativo.org/en/colombia-2026-2030-the-miracle-homeland-and-abelardo-de-la-espriellas-new-power-map/ | 2026-09-23 | Dated 13 August 2026: the president's movement is a congressional minority. A provisional coalition takes in the Democratic Center, Conservative Party, Liberal Party, Radical Change and We Believe. |
| COL-4 | https://www.as-coa.org/articles/whos-who-abelardo-de-la-espriellas-cabinet | 2026-09-23 | Dated 9 July 2026: the party label is National Salvation. The cabinet draws on National Salvation, Radical Change, the Liberal Party and We Believe. Three of the first 11 named ministers are women; 6 of the 7 pending posts were pledged to women. |
| COL-5 | https://en.wikipedia.org/wiki/2026_Colombian_presidential_election (wikitext) | 2026-09-23 | First round 31 May 2026, runoff 21 June 2026. |

Notes: sources differ on the vehicle's name. "Defenders of the Homeland" is the president's movement; the National Salvation Movement is the party label reported for the candidacy. Both are listed. The 55.6% share describes the outgoing cabinet. If the pledge was honored, the new cabinet is about 9 women of 18 (50%), which is unverified. The next election is May 2030 (four-year term).

### COM (Comoros)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| COM-1 | https://en.wikipedia.org/wiki/Azali_Assoumani | 2026-09-23 | The President's current continuous tenure began on 3 April 2019, after an acting interim from February 2019. He previously served 1999 to 2006 and 2016 to 2019. Re-elected in January 2024. Party CRC. Born 1 January 1959, so 67. In August 2024 he handed wide powers to a relative as secretary-general of government. There is no prime minister. |

Next selection: 2029-01, derived from the January 2024 election and the five-year term.

### CPV (Cape Verde)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CPV-1 | https://www.africanews.com/2026/05/18/cape-verde-opposition-wins-parliamentary-elections/ | 2026-09-23 | Dated news (2026-05-18): the opposition PAICV won the 17 May 2026 parliamentary election, and its leader would become Prime Minister. A presidential election follows in November 2026. |
| CPV-2 | https://en.wikipedia.org/w/index.php?title=Francisco_Carvalho&action=raw | 2026-09-23 | The new Prime Minister (a man, PAICV) took office on 19 June 2026. Born December 1970, so 55 on the as-of date. |
| CPV-3 | https://en.wikipedia.org/wiki/2026_Cape_Verdean_presidential_election (rendered) | 2026-09-23 | The presidential election is set for 15 November 2026. It does not directly select the Prime Minister. |
| CPV-4 | https://en.wikipedia.org/w/index.php?title=Jos%C3%A9_Maria_Neves&action=raw | 2026-09-23 | The President (a man) has held office since 9 November 2021. |

Next selection: 2031-05, derived from the five-year legislature elected in May 2026. The second seat's holder may change after 15 November 2026.

### CRI (Costa Rica)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| CRI-1 | https://en.wikipedia.org/wiki/Laura_Fern%C3%A1ndez_Delgado | 2026-09-23 | President since 8 May 2026, female, born July 1986 (age 40 on as_of), Sovereign People's Party. Won the 1 February 2026 first round with 48.3%. |
| CRI-2 | https://www.aljazeera.com/news/2026/5/8/laura-fernandez-sworn-in-as-costa-ricas-new-president | 2026-09-23 | Dated 8 May 2026: sworn in. Her party holds 31 of 57 legislative seats. |
| CRI-3 | https://en.wikipedia.org/wiki/2026_Costa_Rican_general_election (wikitext) | 2026-09-23 | The PPSO won an outright legislative majority, the first single-party majority since 1990. |
| CRI-4 | https://www.presidencia.go.cr/ | 2026-09-23 | Presidency site shows the same president. |

Notes: the 28.6% share is the predecessor's cabinet. The next election is February 2030.

### CUB (Cuba)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| CUB-1 | https://en.wikipedia.org/wiki/Miguel_D%C3%ADaz-Canel | 2026-09-23 | Still President of the Republic (since October 2019; head of state since April 2018 as President of the Council of State) and party First Secretary (since April 2021). Born April 1960 (age 66). Re-elected April 2023; limited to two consecutive five-year terms. |
| CUB-2 | https://www.euronews.com/2026/06/18/cubas-president-miguel-diaz-canel-admits-urgent-changes-needed-to-overcome-crisis | 2026-09-23 | Dated 18 June 2026: still president, calling for urgent economic reform. No leadership change reported. |
| CUB-3 | https://en.wikipedia.org/wiki/Manuel_Marrero_Cruz (wikitext) | 2026-09-23 | The Prime Minister (head of government under the 2019 constitution) is male, in office since 21 December 2019. |

Notes: **flagged uncertain.** WIKI-HEADS notes that some sources treat the former First Secretary as the de facto leader, and US pressure on the government was intense through 2026. The next selection is the National Assembly's vote after the 2028 legislative elections. The current Assembly was elected March 2023 for five years, and the incumbent is term-limited, so the month (2028-04) is an estimate.

### CYP (Cyprus)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| CYP-1 | https://www.gov.cy/presidency/ (redirected from presidency.gov.cy, curl) | 2026-09-23 | Primary source. Presidency items are dated 23 September 2026. |
| CYP-2 | https://cyprus-mail.com/2026/08/05/govt-says-partial-cabinet-reshuffle-maintains-centre-right-course | 2026-09-23 | Dated news (2026-08-05): after the partial reshuffle, the Democratic Party (DIKO) holds four ministries and the Democratic Alignment (DIPA) two, while EDEK lost its only cabinet seat. |
| CYP-3 | https://en.wikipedia.org/wiki/Nikos_Christodoulides (raw) | 2026-09-23 | President since 28 February 2023, born 1973 (age 52). |

The President is both head of state and head of government, so the second seat is "same". He was elected as an independent, so `governing_parties` lists the parties that hold cabinet posts. The next presidential election is estimated at February 2028 from the five-year term. EIU: flawed democracy (7.45).

### CZE (Czech Republic)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| CZE-1 | https://vlada.gov.cz/en/vlada/ | 2026-09-23 | Official list: the PM (M) and 15 members including the PM, two of them women. This matches the map's 2 of 14 ministers. |
| CZE-2 | https://en.wikipedia.org/wiki/Andrej_Babi%C5%A1 | 2026-09-23 | PM born 1954-09-02 (age 72), appointed 2025-12-09. Coalition with SPD and Motorists for Themselves (AUTO). |
| CZE-3 | https://en.wikipedia.org/wiki/Next_Czech_parliamentary_election | 2026-09-23 | Next election in or before October 2029. |

### DEU (Germany)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| DEU-1 | https://www.bundeskanzler.de/bk-en | 2026-09-23 | Official site shows the current Federal Chancellor (M). |
| DEU-2 | https://en.wikipedia.org/wiki/Friedrich_Merz | 2026-09-23 | Chancellor born 1955-11-11 (age 70), in office since 2025-05-06. |
| DEU-3 | https://en.wikipedia.org/wiki/Merz_cabinet | 2026-09-23 | Coalition of CDU, CSU and SPD, formed 2025-05-06. |
| DEU-4 | https://www.bundespraesident.de/EN/Home/home_node.html | 2026-09-23 | Federal President in office (M). The term runs to March 2027, but that seat isn't the leader seat. |
| DEU-5 | https://en.wikipedia.org/wiki/Next_German_federal_election | 2026-09-23 | Bundestag election due on or before 2029-03-25 (deadline month used). |

### DJI (Djibouti)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| DJI-1 | https://www.aljazeera.com/news/2026/4/11/djiboutis-president-guelleh-claims-sixth-straight-term-in-office | 2026-09-23 | Dated news (2026-04-11): the President won a sixth term on 10 April 2026 with 97.81%, aged 78. The age limit was removed in 2025, and the article gives a five-year term. |
| DJI-2 | https://en.wikipedia.org/wiki/2026_in_Djibouti | 2026-09-23 | The President was sworn in on 9 May 2026. A new 26-member cabinet with 8 women was named on 17 May 2026. The incumbent Prime Minister is male. |
| DJI-3 | https://en.wikipedia.org/wiki/Isma%C3%AFl_Omar_Guelleh | 2026-09-23 | The President has been in office since 8 May 1999. Born November 1947. Party RPP, coalition UMP. |

The President is head of government under the constitution, so the second seat is `same`. The Prime Minister (male) is appointed. DJI-3 says six-year terms and DJI-1 says five. I used five, the dated news figure, which gives a next selection of 2031-04. The May 2026 cabinet had about 31% women, against 21.7% in the 1 January map.

### DMA (Dominica)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| DMA-1 | https://en.wikipedia.org/wiki/Roosevelt_Skerrit (wikitext) | 2026-09-23 | Prime Minister since 8 January 2004, born June 1972 (age 54), Dominica Labour Party. |
| DMA-2 | https://pressroomopm.gov.dm/pm-skerrit-2026-focused-on-completing-transformative-projects-strengthening-education-and-protecting-dominicas-future/ | 2026-09-23 | Office of the Prime Minister, dated 19 January 2026: the same Prime Minister setting 2026 priorities. |
| DMA-3 | https://en.wikipedia.org/wiki/Sylvanie_Burton (wikitext) | 2026-09-23 | The President (ceremonial head of state, female) has been in office since 2 October 2023. |
| DMA-4 | https://www.sknis.gov.kn/2026/02/11/dominica-prime-minister-hon-skerrit-commends-caricom-chair-drews-proactive-regional-consultations-ahead-of-historic-50th-heads-meeting/ | 2026-09-23 | St Kitts and Nevis government news, dated 11 February 2026: names the Dominica Prime Minister in office. |

Notes: the last election was 6 December 2022, so the next is 2027-12 on the five-year convention.

### DNK (Denmark)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| DNK-1 | https://www.stm.dk/statsministeren/ | 2026-09-23 | Official page: the PM (F) has been PM since 2019-06-27. |
| DNK-2 | https://www.stm.dk/regeringen/ | 2026-09-23 | Official page: the PM's third government took office on 2026-06-03. |
| DNK-3 | https://en.wikipedia.org/wiki/Frederiksen_III_Cabinet | 2026-09-23 | Minority coalition of Social Democrats, Green Left (SF), Moderates and Social Liberals, formed 2026-06-03 after the snap election of 2026-03-24. |
| DNK-4 | https://en.wikipedia.org/wiki/Mette_Frederiksen | 2026-09-23 | PM born 1977-11-19 (age 48). |
| DNK-5 | https://en.wikipedia.org/wiki/Next_Danish_general_election | 2026-09-23 | Next election due on or before 2030-03-23 (deadline month used). |

Note: the women share (33.3) is the previous (second) government's as of 2026-01-01.

### DOM (Dominican Republic)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| DOM-1 | https://en.wikipedia.org/wiki/Luis_Abinader (wikitext) | 2026-09-23 | President since 16 August 2020, born July 1967 (age 59), Modern Revolutionary Party. |
| DOM-2 | https://presidencia.gob.do/ | 2026-09-23 | Presidency site, item dated 22 September 2026, shows the same president. |

Notes: the next election is May 2028.

### DZA (Algeria)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| DZA-1 | https://en.wikipedia.org/wiki/Abdelmadjid_Tebboune | 2026-09-23 | The President (born 17 November 1945, age 80) has been in office since 19 December 2019. He was re-elected in 2024, is limited to two terms, and sits as an independent. |
| DZA-2 | https://en.wikipedia.org/wiki/Sifi_Ghrieb | 2026-09-23 | The PM (M) has been incumbent since September 2025 (page revised 31 August 2026). |
| DZA-3 | https://en.wikipedia.org/wiki/Ghrieb_government | 2026-09-23 | The government was formed 15 September 2025: 38 members from the FLN, the RND and independents. |
| DZA-4 | https://en.wikipedia.org/wiki/2026_Algerian_parliamentary_election | 2026-09-23 | In the 2 July 2026 legislative election the FLN took 91 seats, RND 74 and Future Front 56, on 20.88% turnout. The FLN and RND minority government continues. |
| DZA-5 | https://allafrica.com/stories/202609020040.html | 2026-09-23 | Dated news (2026-09-01): the President carried out a partial reshuffle of four portfolios in consultation with the sitting PM. It was not a new government. |
| DZA-6 | https://www.aa.com.tr/en/politics/algerian-president-appoints-new-prime-minister/3687262 | 2026-09-23 | Dated news (2025-09-14): appointment of the current PM. |

Next selection is 2029-09: a five-year term from the September 2024 vote, and the incumbent is term-limited. EIU: authoritarian (3.55).

### ECU (Ecuador)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| ECU-1 | https://en.wikipedia.org/wiki/Daniel_Noboa (wikitext) | 2026-09-23 | President since 23 November 2023 (re-elected 2025), born November 1987 (age 38), National Democratic Action. |
| ECU-2 | https://en.wikipedia.org/wiki/2025_Ecuadorian_general_election (wikitext) | 2026-09-23 | First round 9 February 2025, runoff 13 April 2025. |

Notes: the next presidential election is February 2029.

### EGY (Egypt)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EGY-1 | https://en.wikipedia.org/wiki/Abdel_Fattah_el-Sisi | 2026-09-23 | The President (born 19 November 1954, age 71) has been in office since 8 June 2014 and is incumbent. The PM is still in post. |
| EGY-2 | https://en.wikipedia.org/wiki/Next_Egyptian_presidential_election | 2026-09-23 | Six-year term, two-round system; the next election is due around 2030. |
| EGY-3 | https://en.wikipedia.org/wiki/Mostafa_Madbouly | 2026-09-23 | The PM has been in office since 14 June 2018 and is an independent. |
| EGY-4 | https://en.wikipedia.org/wiki/2025_Egyptian_parliamentary_election | 2026-09-23 | In the November 2025 House election, Nation's Future won the most seats (231 including appointees) at the head of the pro-government National Unified List. |

Next selection is 2029-12, an estimate. The current term runs to April 2030, and the constitution opens the election process at least 120 days before the term ends, which is how the December 2023 vote was timed. No date is set, and the incumbent cannot run again under the 2019 amendments. The President and the cabinet are nonpartisan, so `governing_parties` names the parliamentary majority. EIU: authoritarian (2.79).

### ERI (Eritrea)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ERI-1 | https://en.wikipedia.org/wiki/Isaias_Afwerki | 2026-09-23 | The President has been in office since 24 May 1993 and chairs the National Assembly, so he is head of state and government. Born February 1946, so 80. The PFDJ is the sole party, and the elections scheduled for 2001 were postponed indefinitely. He gave the May 2026 Independence Day address. |

Next selection: none scheduled.

### ESP (Spain)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| ESP-1 | https://www.lamoncloa.gob.es/presidente/Paginas/index.aspx | 2026-09-23 | Official site: the current President of the Government (M) is traveling to the 81st UN General Assembly "today". |
| ESP-2 | https://en.wikipedia.org/wiki/Next_Spanish_general_election | 2026-09-23 | No early election called. Due no later than 2027-08-22 (deadline month used). |
| ESP-3 | https://en.wikipedia.org/wiki/Third_government_of_Pedro_S%C3%A1nchez | 2026-09-23 | Coalition of PSOE and Sumar, formed 2023-11-21. |
| ESP-4 | https://en.wikipedia.org/wiki/Pedro_S%C3%A1nchez | 2026-09-23 | PM born 1972-02-29 (age 54), in office since 2018-06-02. |

### EST (Estonia)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| EST-1 | https://www.valitsus.ee/en | 2026-09-23 | Official: the PM (M, born 1975-07-12, age 51) has served since 2024-07-23. Reform Party and Eesti 200 coalition agreement. News dated 2026-09-22. |
| EST-2 | https://news.err.ee/1610126071/estonia-elects-new-president | 2026-09-23 | Dated 2026-09-02: the Riigikogu elected a new President (F), to be sworn in 2026-10-12. The outgoing President (M) serves until then. |
| EST-3 | https://en.wikipedia.org/wiki/Kristen_Michal%27s_cabinet | 2026-09-23 | Cabinet of the Reform Party and Estonia 200. SDE was removed in 2025. |
| EST-4 | https://www.valimised.ee/en/riigikogu-elections-2027 | 2026-09-23 | Electoral office: the Riigikogu election takes place on 2027-03-07. |

The second seat changes to F on 2026-10-12.

### ETH (Ethiopia)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ETH-1 | https://en.wikipedia.org/wiki/Abiy_Ahmed | 2026-09-23 | The Prime Minister has been in office since 2 April 2018 and leads the Prosperity Party. Born August 1976, so 50 on the as-of date. |
| ETH-2 | https://en.wikipedia.org/wiki/2026_Ethiopian_general_election | 2026-09-23 | The general election was held on 1 June 2026. The Prosperity Party won 438 seats, and no vote was held in Tigray or parts of Amhara and Oromia. |
| ETH-3 | https://www.dawan.africa/news/ethiopias-prosperity-party-secures-parliamentary-majority-paving-way-for-abiys-new-term | 2026-09-23 | Dated news (2026-06-22): the new House is "expected to convene in October," when it will formally reappoint the Prime Minister. |
| ETH-4 | https://www.aljazeera.com/news/2026/6/1/ethiopia-holds-elections-with-pm-abiys-party-expected-to-dominate | 2026-09-23 | Dated news (2026-06-01): the election was held, and the PM was 49 on that date, which matches an August birthday. |
| ETH-5 | https://en.wikipedia.org/wiki/Taye_Atske_Selassie | 2026-09-23 | The President (male) has been head of state since 7 October 2024. The post is ceremonial. |

Next selection is 2026-10, when the new House is due to re-elect the Prime Minister. That vote is a formality, but it is a scheduled selection.

### FIN (Finland)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| FIN-1 | https://valtioneuvosto.fi/en/government | 2026-09-23 | Official site: the current government is still the one led by the sitting PM (M). |
| FIN-2 | https://en.wikipedia.org/wiki/Petteri_Orpo | 2026-09-23 | PM born 1969-11-03 (age 56), in office since 2023-06-20. |
| FIN-3 | https://en.wikipedia.org/wiki/Orpo_cabinet | 2026-09-23 | Coalition of the National Coalition Party, Finns Party, Swedish People's Party and Christian Democrats. |
| FIN-4 | https://en.wikipedia.org/wiki/2027_Finnish_parliamentary_election | 2026-09-23 | Parliamentary election on 2027-04-18. |

Leader seat: head_of_government, because the government holds general executive power. The President (M) leads foreign and security policy together with the government, so a US president would deal with both. SHR-4 also marks the PM.

### FJI (Fiji)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| FJI-1 | https://pina.com.fj/2026/06/26/fiji-pm-says-next-election-due-between-24-december-and-early-february-2027/ | 2026-09-23 | PINA, 2026-06-26: the sitting PM says the next election falls between 24 Dec 2026 and the first week of Feb 2027. |
| FJI-2 | https://en.wikipedia.org/wiki/2026_Fijian_general_election | 2026-09-23 | Election due by 6 Feb 2027 (row uses 2027-02, the due-by month). Governing coalition is People's Alliance, NFP and SODELPA. The Deputy PM resigned in Oct 2025, and the opposition regrouped into new parties in 2026. |
| FJI-3 | https://en.wikipedia.org/wiki/Sitiveni_Rabuka | 2026-09-23 | Incumbent PM since 24 Dec 2022 (he also held the office earlier), People's Alliance. Born Sept 1948 (age 78, band 70-79). |
| FJI-4 | https://en.wikipedia.org/wiki/President_of_Fiji | 2026-09-23 | President (male, chiefly title Ratu) in office since 12 Nov 2024. |
| FJI-5 | https://www.feo.org.fj/ | 2026-09-23 | Fijian Elections Office items dated up to 10 Sept 2026 show election-official training but no announced polling date. |

### FRA (France)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| FRA-1 | https://www.elysee.fr/en/ | 2026-09-23 | Official site: the President (M), elected 2017, is at the 81st UN General Assembly (September 2026). |
| FRA-2 | https://en.wikipedia.org/wiki/Emmanuel_Macron | 2026-09-23 | President born 1977-12-21 (age 48), in office since 2017-05-14. |
| FRA-3 | https://fr.wikipedia.org/wiki/Gouvernement_Lecornu_II | 2026-09-23 | Government still in office. Parties: Renaissance, MoDem, Horizons and UDI (the EPR bloc), plus dissident Republicans and independents. Latest reshuffle 2026-09-22. |
| FRA-4 | https://www.parlons-politique.fr/actualite-nationale/budget-2027-le-compromis-entre-lecornu-et-les-socialistes-peut-il-eviter-une-nouvelle-crise-parlementaire_27678/ | 2026-09-23 | Dated 2026-09-23: the same Prime Minister (M) is negotiating the 2027 budget with the Socialists to avoid censure. |
| FRA-5 | https://en.wikipedia.org/wiki/2027_French_presidential_election | 2026-09-23 | Presidential election scheduled for April 2027. The incumbent is term-limited. |

Leader seat: the President holds executive power outside periods of cohabitation (SHR-4 marks the presidency).

### FSM (Federated States of Micronesia)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| FSM-1 | https://gov.fm/ | 2026-09-23 | The FSM government site lists items dated 13 Aug to 1 Sept 2026 that name the sitting President. The 1 Sept item also refers to the sitting President of Palau. |
| FSM-2 | https://en.wikipedia.org/wiki/Wesley_Simina | 2026-09-23 | President since 11 May 2023. Born 10 Sept 1961 (age 65, band 60-69). A Vice President is in office. |
| FSM-3 | https://en.wikipedia.org/wiki/President_of_the_Federated_States_of_Micronesia | 2026-09-23 | Congress elects the President from its at-large members for four years. The current mandate ends 11 May 2027. The row uses the March 2027 congressional election (est.), and Congress selects the President by May 2027. |
| FSM-4 | https://freedomhouse.org/country/micronesia/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 92/100, which gives `full_democracy`. |

### GAB (Gabon)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GAB-1 | https://www.aljazeera.com/news/2025/5/3/gabon-swears-in-ex-military-chief-oligui-as-president | 2026-09-23 | Dated news (2025-05-03): the 2023 coup leader was sworn in as elected president after a 19-month transition. |
| GAB-2 | https://en.wikipedia.org/w/index.php?title=Brice_Oligui_Nguema&action=raw | 2026-09-23 | De facto head of state from 30 August 2023, elected president from 3 May 2025, Democratic Union of Builders. Born March 1975, so 51 on the as-of date. |
| GAB-3 | https://en.wikipedia.org/w/index.php?title=2025_Gabonese_presidential_election&action=raw | 2026-09-23 | Election on 12 April 2025. The President is elected for a seven-year term, and the next general election is labeled 2032. |
| GAB-4 | https://en.wikipedia.org/w/index.php?title=Prime_Minister_of_Gabon&action=raw | 2026-09-23 | The post of Prime Minister was abolished on 4 May 2025 under the November 2024 constitution. A Vice President of the Government took over its coordinating duties, and the President is head of government. |
| GAB-5 | https://en.wikipedia.org/w/index.php?title=2025_Gabonese_parliamentary_election&action=raw | 2026-09-23 | The Democratic Union of Builders won 101 seats in the September-November 2025 legislative elections. |

Second seat: `same`. Next selection: 2032-04, derived.

### GBR (United Kingdom)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| GBR-1 | https://www.gov.uk/government/ministers/prime-minister | 2026-09-23 | Official page: the current Prime Minister (M) took office on 2026-07-20. |
| GBR-2 | https://en.wikipedia.org/wiki/2026_Labour_Party_leadership_crisis | 2026-09-23 | The previous PM announced his resignation on 2026-06-22. The successor was elected Labour leader unopposed on 2026-07-17 and became PM on 2026-07-20. |
| GBR-3 | https://en.wikipedia.org/wiki/Andy_Burnham | 2026-09-23 | PM born 1970-01-07 (age 56). Entered the Commons at a by-election on 2026-06-18. |
| GBR-4 | https://en.wikipedia.org/wiki/Next_United_Kingdom_general_election | 2026-09-23 | General election due on or before 2029-08-15 (deadline month used). |

Note: the women share (50.0) is the cabinet as of 2026-01-01, before the July 2026 change of Prime Minister.

### GEO (Georgia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GEO-1 | https://georgiatoday.ge/kobakhidze-on-possible-resignation-ask-me-again-in-3-months/ | 2026-09-23 | Dated news (2026-09-07): the Prime Minister dismissed rumors that he will resign as recurring idle speculation, and credited the ruling party's founder with guiding his anticorruption reforms. |
| GEO-2 | https://civil.ge/archives/750128 | 2026-09-23 | Dated news (2026-09-08): resignation rumors are circulating again. The Prime Minister was still in office and making public appearances. The rest of the article is paywalled. |
| GEO-3 | https://en.wikipedia.org/wiki/Irakli_Kobakhidze (raw) | 2026-09-23 | Prime Minister since 8 February 2024. Born 25 September 1978, so he is 47 on as_of and turns 48 two days later; the band is 40-49 either way. |

The formal executive is the Prime Minister, so the row records `head_of_government`. HEADS also lists Georgian Dream's founder and honorary chairman, who holds no state office, as the operational power behind the government. The President (M) is from HEADS. The next parliamentary election is estimated at October 2028 from the four-year term after October 2024. EIU: hybrid regime (4.36).

### GHA (Ghana)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GHA-1 | https://presidency.gov.gh/ (official) | 2026-09-23 | The President and the Vice President (a woman) are in office, with press releases dated 2026-09-22. |
| GHA-2 | https://en.wikipedia.org/w/index.php?title=John_Mahama&action=raw | 2026-09-23 | In office since 7 January 2025 (he was also president 2012-2017), National Democratic Congress. Born November 1958, so 67 on the as-of date. |
| GHA-3 | https://en.wikipedia.org/w/index.php?title=2024_Ghanaian_general_election&action=raw | 2026-09-23 | Elected 7 December 2024 to a four-year term. |

Second seat: `same`. Next selection: 2028-12, derived.

### GIN (Guinea)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GIN-1 | https://www.africanews.com/2026/01/27/amadou-oury-bah-re-appointed-prime-minister-under-guineas-new-government/ | 2026-09-23 | Dated news (2026-01-27): the former junta leader was inaugurated in January 2026 for a seven-year term after the December 2025 election, and the Prime Minister (a man) was reappointed. |
| GIN-2 | https://en.wikipedia.org/w/index.php?title=Mamady_Doumbouya&action=raw | 2026-09-23 | Head of state since 1 October 2021 (interim until 17 January 2026), Generation for Modernity and Development. Birth date 5 December 1984 per the official Presidency biography, though the page is also categorized under 1980 births. Either way he is 41-46, so 40-49. |
| GIN-3 | https://en.wikipedia.org/w/index.php?title=2025_Guinean_presidential_election&action=raw | 2026-09-23 | Election on 28 December 2025, won with 86.72%. The next is labeled 2032. |
| GIN-4 | https://en.wikipedia.org/w/index.php?title=2026_Guinean_parliamentary_election&action=raw | 2026-09-23 | In the 31 May 2026 legislative election the Generation for Modernity and Development won 93 of 147 seats. Major opposition parties were barred. |
| GIN-5 | https://en.wikipedia.org/w/index.php?title=2026_in_Guinea&action=raw | 2026-09-23 | The Prime Minister was reappointed on 26 January 2026. |

Next selection: 2032-12, derived.

### GMB (The Gambia)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GMB-1 | https://thepoint.gm/africa/gambia/headlines/2026-presidential-election-set-for-dec-5-iec-chairman | 2026-09-23 | Dated news (2025-10-10): the IEC chairman set the presidential election for 5 December 2026. |
| GMB-2 | https://en.wikipedia.org/w/index.php?title=Adama_Barrow&action=raw | 2026-09-23 | President since January 2017, National People's Party. Born February 1965, so 61 on the as-of date. |
| GMB-3 | https://en.wikipedia.org/w/index.php?title=2026_Gambian_presidential_election&action=raw | 2026-09-23 | Election on 5 December 2026, and the incumbent is seeking a third term. |

Second seat: `same`. Next selection: 2026-12.

### GNB (Guinea-Bissau)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GNB-1 | https://www.france24.com/en/africa/20251127-general-horta-nta-sworn-in-as-guinea-bissau-transitional-leader-following-coup | 2026-09-23 | Dated news (2025-11-27): after the 26 November 2025 coup, a general was sworn in as transitional leader for a one-year transition. |
| GNB-2 | https://www.aa.com.tr/en/africa/guinea-bissau-sets-presidential-legislative-elections-for-dec-6/3807220 | 2026-09-23 | Dated news (2026-01-22): presidential decree 02/2026 set presidential and legislative elections for 6 December 2026. |
| GNB-3 | https://www.aljazeera.com/news/2026/8/30/vote-count-starts-in-guinea-bissau-referendum-on-strengthening-presidency | 2026-09-23 | Dated news (2026-08-30): the constitutional referendum moves the country to a presidential system in which the head of state appoints and dismisses the Prime Minister. The 6 December elections stand, and the transitional leader is barred from running. |
| GNB-4 | https://en.wikipedia.org/w/index.php?title=Horta_Inta-A_Na_Man&action=raw | 2026-09-23 | Transitional President since 27 November 2025, also Chief of the High Command. Born "circa 1960", flagged "citation needed". |

The age band (60-69) rests on an unsourced circa-1960 birth year and is weak. The second seat is the Prime Minister (a man, per HEADS). Next selection: 2026-12.

### GNQ (Equatorial Guinea)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GNQ-1 | https://en.wikipedia.org/w/index.php?title=Teodoro_Obiang_Nguema_Mbasogo&action=raw | 2026-09-23 | Head of state since the August 1979 coup (Supreme Military Council chairman, then president from 1982). Democratic Party of Equatorial Guinea. Born June 1942, so 84 on the as-of date. |
| GNQ-2 | https://en.wikipedia.org/w/index.php?title=Manuel_Osa_Nsue_Nsua&action=raw | 2026-09-23 | A man has been Prime Minister since August 2024, replacing the country's first woman prime minister. He belongs to the PDGE. |
| GNQ-3 | https://en.wikipedia.org/w/index.php?title=Prime_Minister_of_Equatorial_Guinea&action=raw | 2026-09-23 | The Prime Minister is formally head of government, and the current incumbent is that man. |
| GNQ-4 | https://en.wikipedia.org/wiki/2022_Equatorial_Guinean_general_election (rendered) | 2026-09-23 | The last presidential election was on 20 November 2022 (97% for the incumbent). The page does not state the term length. |

The President holds real executive power, so the seat is `head_of_state`. Next selection: 2029-11. **Inference, not confirmed in an opened source:** it assumes the seven-year presidential term of the 2011 constitution, counted from the November 2022 election.

### GRC (Greece)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| GRC-1 | https://greekcitytimes.com/2026/09/07/greek-prime-minister-rules-out-snap-elections | 2026-09-23 | Dated news (2026-09-07): the Prime Minister ruled out a snap vote and said elections will be held in spring 2027. New Democracy governs. |
| GRC-2 | https://en.wikipedia.org/wiki/Kyriakos_Mitsotakis (raw) | 2026-09-23 | Prime Minister since 8 July 2019, with the current term from 26 June 2023 after a short caretaker interval. Born 1968 (age 58). |

The official site (https://www.primeminister.gr/en) returned HTTP 403. The President (M) is from HEADS. The next election is set at 2027-05, from the stated "spring 2027"; the month is an estimate, and the legal limit is mid-2027. EIU: full democracy (8.07).

### GRD (Grenada)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| GRD-1 | https://en.wikipedia.org/wiki/Dickon_Mitchell (wikitext) | 2026-09-23 | Prime Minister since 24 June 2022, born October 1977 (age 48), National Democratic Congress. |
| GRD-2 | https://www.caribbeantoday.com/sections/politics/grenada-s-prime-minister-mitchell-continues-quest-for-re-election | 2026-09-23 | Dated 18 September 2026: the next election is constitutionally due no later than October 2027 and widely expected earlier. The NDC won 9 of 15 seats in 2022. |

Notes: the Governor-General is female. The table's 2027-06 is the five-year convention; the legal deadline is 2027-10.

### GTM (Guatemala)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| GTM-1 | https://en.wikipedia.org/wiki/Bernardo_Ar%C3%A9valo (wikitext) | 2026-09-23 | President since 14 January 2024, born October 1958 (age 67). Party field: Independent (2026 to present). |
| GTM-2 | https://en.wikipedia.org/wiki/Cabinet_of_Bernardo_Ar%C3%A9valo | 2026-09-23 | The current cabinet is mostly independents, with some Semilla-aligned ministers, one Winaq minister and one military minister. Gender parity held from 28 November 2025 to 6 April 2026. |
| GTM-3 | https://en.wikipedia.org/wiki/Movimiento_Semilla (wikitext) | 2026-09-23 | Semilla was suspended in 2023 and canceled de jure on 27 March 2026. A splinter party, Raíces, broke publicly with the president in 2026. |

Notes: **flagged uncertain.** The president has no party of his own. The 50.0% share reflects the parity period, which ended in April 2026. The next election is June 2027.

### GUY (Guyana)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| GUY-1 | https://en.wikipedia.org/wiki/Irfaan_Ali (wikitext) | 2026-09-23 | President since 2 August 2020, born April 1980 (age 46), People's Progressive Party/Civic. |
| GUY-2 | https://en.wikipedia.org/wiki/2025_Guyanese_general_election (wikitext) | 2026-09-23 | Election on 1 September 2025; the PPP/C was re-elected, and a new party became the main opposition. |
| GUY-3 | https://op.gov.gy/ | 2026-09-23 | Office of the President site shows the same incumbent as "Executive President". |

Notes: the President is both head of state and head of government; the Prime Minister is his principal assistant, not a separate seat. Indo-Guyanese surnames are prominent in the governing party, and the repo maps `anglo`. The next election is 2030-09 on the five-year cycle.

### HND (Honduras)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| HND-1 | https://en.wikipedia.org/wiki/Nasry_Asfura | 2026-09-23 | President since 27 January 2026, male, born June 1958 (age 68), National Party of Honduras. |
| HND-2 | https://www.worldpoliticsreview.com/asfura-honduras-president-inauguration/ | 2026-09-23 | Dated 27 January 2026: sworn in after winning by about 30,000 votes amid fraud allegations. |
| HND-3 | https://en.wikipedia.org/wiki/2025_Honduran_general_election (wikitext) | 2026-09-23 | Election on 30 November 2025; the electoral council declared the winner on 24 December 2025. |

Notes: **flagged uncertain** (narrow, disputed result). The 33.3% share is the predecessor's cabinet. The next election is November 2029.

### HRV (Croatia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| HRV-1 | https://vlada.gov.hr/en | 2026-09-23 | Primary source. The government site carries Prime Minister statements dated 22 September 2026. |
| HRV-2 | https://en.wikipedia.org/wiki/Government_of_Croatia (raw) | 2026-09-23 | The current (third) cabinet under the same Prime Minister has ministers from the Croatian Democratic Union (HDZ) and the Homeland Movement (DP). |
| HRV-3 | https://en.wikipedia.org/wiki/Andrej_Plenkovi%C4%87 (raw) | 2026-09-23 | Prime Minister since 19 October 2016, born 1970 (age 56). |

The President (M) is from HEADS. The next parliamentary election is estimated at April 2028 from the four-year term after April 2024. EIU: flawed democracy (6.50).

### HTI (Haiti)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| HTI-1 | https://en.wikipedia.org/wiki/Alix_Didier_Fils-Aim%C3%A9 | 2026-09-23 | Acting Prime Minister since 10 November 2024, male, born November 1971 (age 54), independent. Sole executive since 7 February 2026. |
| HTI-2 | https://en.wikipedia.org/wiki/2026_Haitian_general_election | 2026-09-23 | The Transitional Presidential Council's mandate expired 7 February 2026. A "National Pact for Stability and the Organization of Elections" backs the acting PM as sole executive; the presidency is vacant. General elections are scheduled for 13 December 2026. |
| HTI-3 | https://www.wlrn.org/americas/2026-05-12/haiti-prime-minister-alix-didier-fils-aime-august-elections-impossible-under-current-crisis | 2026-09-23 | Dated 12 May 2026: an August vote was ruled out on security grounds, with a new president expected by early February 2027. |

Notes: **flagged uncertain.** Elections have slipped repeatedly since 2019, and gang control makes the December date fragile. `second_seat` is `none` because the presidency is vacant. The 22.2% share is the pre-March 2026 cabinet; a new 18-member team was presented in March 2026 (search result only, not opened). The repo's `french` key fits the elite's French-derived names.

- Verification pass: `leader_title` changed from "Acting Prime Minister" to "Prime Minister". VER-HTI-1 (CIA World Leaders) and VER-HTI-2 (Rulers.org) both list the office as Prime Minister, not acting, since November 2024. VER-HTI-2 also lists him as acting head of state since 7 Feb 2026, so a later pass may prefer `same`/`same` over `none`/`none` for the second seat. That cell was left alone.

### HUN (Hungary)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

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

### IDN (Indonesia)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| IDN-1 | https://en.wikipedia.org/wiki/Prabowo_Subianto | 2026-09-23 | President since 20 October 2024, born October 1951 (age 74). The President is both head of state and head of government. |
| IDN-2 | https://en.wikipedia.org/wiki/Red_and_White_Cabinet | 2026-09-23 | Cabinet parties in the Advanced Indonesia Coalition Plus: Gerindra, Golkar, National Awakening Party, National Mandate Party and Democratic Party (348 of 580 seats), plus smaller extra-parliamentary parties. |
| IDN-3 | https://en.wikipedia.org/wiki/Elections_in_Indonesia | 2026-09-23 | Five-year cycle; the current DPR term runs 2024 to 2029. |

Notes: flawed democracy (EIU 2025: 6.37). Next national election is in 2029. The month (2029-02) is an estimate from the February 2024 cycle; no date has been fixed.

- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### IND (India)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| IND-1 | https://en.wikipedia.org/wiki/Narendra_Modi | 2026-09-23 | Prime Minister since 26 May 2014, born 17 September 1950 (age 76). |
| IND-2 | https://en.wikipedia.org/wiki/Droupadi_Murmu | 2026-09-23 | President (female) since July 2022. |
| IND-3 | https://www.pmindia.gov.in/en/ | 2026-09-23 | PM's office site carries items dated 23 September 2026 from the same Prime Minister. |
| IND-4 | https://en.wikipedia.org/wiki/Third_Modi_ministry | 2026-09-23 | National Democratic Alliance cabinet parties: BJP, TDP, JD(U), LJP(RV), JD(S) and smaller allies. |
| IND-5 | https://en.wikipedia.org/wiki/Next_Indian_general_election | 2026-09-23 | Next Lok Sabha election due by May/June 2029 (coded 2029-05). |

Notes: flawed democracy (EIU 2025: 6.96).

- Merge pass: in `governing_parties`, "Lok Janshakti Party (Ram Vilas)" became "Lok Janshakti Party (RV)". The suffix is a real person's given names.

### IRL (Ireland)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| IRL-1 | https://en.wikipedia.org/wiki/Mich%C3%A9al_Martin | 2026-09-23 | Taoiseach (M) born 1960-08-16 (age 66), current term since 2025-01-23. |
| IRL-2 | https://en.wikipedia.org/wiki/Government_of_the_34th_D%C3%A1il | 2026-09-23 | Fianna Fáil and Fine Gael coalition. The agreement rotates the office of Taoiseach to the Fine Gael leader in November 2027 (2027-11 used). |
| IRL-3 | https://en.wikipedia.org/wiki/Next_Irish_general_election | 2026-09-23 | General election due no later than January 2030. |
| IRL-4 | https://www.vlada.gov.sk/ | 2026-09-23 | Slovak government news dated 2026-09-10 records a meeting with the sitting Irish Taoiseach, which confirms the incumbent is in office. |

The President (F) took office in November 2025 (SHR-4). gov.ie returned 403.

### IRN (Iran)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| IRN-1 | https://en.wikipedia.org/wiki/Supreme_Leader_of_Iran | 2026-09-23 | The previous Supreme Leader was assassinated on 28 February 2026. An interim leadership council served from 1 March. The new Supreme Leader (born 1969, son of the predecessor) took office on 8 March 2026 and is incumbent. The President (in office since 2024) is still in office. |
| IRN-2 | https://en.wikipedia.org/wiki/2026_Iranian_supreme_leader_election | 2026-09-23 | The Assembly of Experts sat 3 to 8 March 2026 and the result was announced 9 March. Authorities confirmed the new leader was injured in the strikes, and he has made no public appearances. Some clerics dispute his fitness. |
| IRN-3 | https://www.leader.ir/en | 2026-09-23 | Primary source, the Office of the Supreme Leader. Items dated June 2026 carry messages issued in the new Supreme Leader's name. |
| IRN-4 | https://fortune.com/2026/09/06/supreme-leader-mojtaba-khamenei-iran-economy-social-cohesion-us-pressure-inflation-gas-shortage-rial-currency/ | 2026-09-23 | Dated news (2026-09-06): still described as Supreme Leader, issuing written statements in late August 2026, not seen in public since February. |
| IRN-5 | https://en.wikipedia.org/wiki/Masoud_Pezeshkian | 2026-09-23 | The President has been in office since 28 July 2024. He sat on the March 2026 interim council and attended UNGA in September 2026. |

The row describes the Supreme Leader's seat. The President (M) is `second_seat`. Iran has no ruling party; factions compete inside the clerical system, so `governing_parties` is "none (nonpartisan)". EIU: authoritarian (1.96), overridden to theocracy. Next selection: none scheduled, because the Supreme Leader serves for life at the Assembly of Experts' pleasure.

### IRQ (Iraq)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| IRQ-1 | https://en.wikipedia.org/wiki/Prime_Minister_of_Iraq | 2026-09-23 | A new Prime Minister has been in office since 14 May 2026, succeeding the 2022 to 2026 incumbent, who served as caretaker after the November 2025 election. The President was also newly elected. |
| IRQ-2 | https://www.aljazeera.com/news/2026/5/14/iraqs-parliament-approves-new-ali-al-zaidi-government | 2026-09-23 | Dated news (2026-05-14): parliament approved the government, and the new PM, aged 40, is Iraq's youngest. He was the Coordination Framework's compromise pick after its first nominee was dropped under US pressure. |
| IRQ-3 | https://www.thenationalnews.com/news/mena/2026/05/14/iraqi-parliament-votes-on-thursday-in-key-step-towards-installing-government/ | 2026-09-23 | Dated news (2026-05-14): the President named the PM-designate on 27 April. It gives his age as 41, which is still in the 40-49 band. 14 of 23 portfolios were filled and 9 left vacant, among them defense and interior. |
| IRQ-4 | https://en.wikipedia.org/wiki/2026_Iraqi_presidential_election | 2026-09-23 | Parliament elected the new President (Patriotic Union of Kurdistan) on 11 April 2026 with 227 votes in the second round. The predecessor did not run. |
| IRQ-5 | https://www.euronews.com/2026/05/15/iraq-swears-in-new-prime-minister-as-us-presses-baghdad-to-disarm-iran-backed-groups | 2026-09-23 | Dated news (2026-05-15): the PM is a businessman and political outsider, backed by the Coordination Framework. |
| IRQ-6 | https://www.longwarjournal.org/archives/2026/05/iraq-forms-new-government-with-only-14-of-23-ministers.php | 2026-09-23 | Dated news (2026-05-15): approved ministers by nominating party. Coordination Framework members (Hikma, Badr), KDP, PUK, New Generation, Taqaddum and Sovereignty (Siyada) each hold portfolios. One of the 14 is a woman. |

Next selection is 2029-11. That is an estimate from the Council of Representatives' four-year term after the November 2025 vote; no election date has been set. `women_cabinet_share` is 13.0 (3/23) from WIP-2026, which describes the previous cabinet. On IRQ-6's count the new cabinet has 1 woman among 14 approved ministers. EIU: authoritarian (3.13).

### ISL (Iceland)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| ISL-1 | https://www.government.is/ministries/prime-ministers-office/prime-minister/ | 2026-09-23 | Official page: the PM (F) took office in December 2024 and leads the Social Democratic Alliance, Liberal Reform Party and People's Party. |
| ISL-2 | https://en.wikipedia.org/wiki/Kristr%C3%BAn_Frostad%C3%B3ttir | 2026-09-23 | PM born 1988-05-12 (age 38), in office since 2024-12-21. |
| ISL-3 | https://en.wikipedia.org/wiki/Next_Icelandic_parliamentary_election | 2026-09-23 | Althing election due before 2028-11-30 (deadline month used). The President (F) comes from SHR-4. |

### ISR (Israel)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ISR-1 | https://en.wikipedia.org/wiki/2026_Israeli_legislative_election | 2026-09-23 | The election is 27 October 2026 and the Knesset dissolved 17 July 2026. The coalition at dissolution was Likud, Shas, Otzma Yehudit, Religious Zionist Party and New Hope. The incumbent PM leads Likud. |
| ISR-2 | https://www.aljazeera.com/news/2026/7/17/knesset-dissolves-how-will-israel-vote-in-octobers-general-election | 2026-09-23 | Dated news (2026-07-17) confirming the dissolution and the 27 October 2026 date. |
| ISR-3 | https://en.wikipedia.org/wiki/Thirty-seventh_government_of_Israel | 2026-09-23 | UTJ left in July 2025. Shas gave up its ministries in July 2025 but stayed in the coalition. Otzma Yehudit left in January 2025 and rejoined in March 2025. |
| ISR-4 | https://en.wikipedia.org/wiki/President_of_Israel | 2026-09-23 | The President has served since 7 July 2021; the term ends 7 July 2028. |

The PM (born 1949, age 76) has held the current continuous term since December 2022, recorded as 2022. EIU: flawed democracy (7.80).

- Verification pass: "New Hope" removed from `governing_parties`. VER-ISR-1 (Times of Israel, 2026-08-11) describes the 2025 merger of New Hope into Likud, under which its leader holds a reserved Likud slot, so ISR-1's list of the coalition at dissolution is out of date on that point. VER-ISR-2 confirms that Otzma Yehudit and Religious Zionism still hold ministries. Shas's standing was not independently confirmed but nothing contradicted it.

### ITA (Italy)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| ITA-1 | https://www.governo.it/it/i-governi-dal-1943-ad-oggi/xix-legislatura-dal-13-ottobre-2022/governo-meloni/20488 | 2026-09-23 | The page returned "not found", but the site's navigation names the current President of the Council (F). |
| ITA-2 | https://cyprus-mail.com/2026/09/16/italys-meloni-says-she-aims-to-remain-in-office-until-end-of-term | 2026-09-23 | Reuters copy dated 2026-09-16: the PM means to serve until the legislature ends in autumn 2027. Coalition of Brothers of Italy, League and Forza Italia. |
| ITA-3 | https://en.wikipedia.org/wiki/Meloni_government | 2026-09-23 | Government parties: Brothers of Italy, Lega, Forza Italia, Us Moderates. Formed 2022-10-22. |
| ITA-4 | https://en.wikipedia.org/wiki/Next_Italian_general_election | 2026-09-23 | General election due no later than 2027-12-22 (deadline month used). |
| ITA-5 | https://en.wikipedia.org/wiki/Giorgia_Meloni | 2026-09-23 | PM born 1977-01-15 (age 49). |

### JAM (Jamaica)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| JAM-1 | https://en.wikipedia.org/wiki/Andrew_Holness (wikitext) | 2026-09-23 | Prime Minister since 3 March 2016, born July 1972 (age 54), Jamaica Labour Party. |
| JAM-2 | https://en.wikipedia.org/wiki/2025_Jamaican_general_election (wikitext) | 2026-09-23 | Election on 3 September 2025; the JLP government was returned. |
| JAM-3 | https://jamaica-gleaner.com/article/commentary/20260811/jamaica-64-are-we-becoming-republic-or-just-talking-about-it | 2026-09-23 | Dated 10 August 2026: Jamaica is still a monarchy. The republic bill is tabled but stalled, and change needs two-thirds of both houses plus a referendum. |
| JAM-4 | https://opm.gov.jm/ | 2026-09-23 | Office of the Prime Minister site, item dated 16 September 2026, shows the same Prime Minister. |

Notes: the Governor-General is male. The next election is 2030-09 on the five-year convention.

### JOR (Jordan)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| JOR-1 | https://en.wikipedia.org/wiki/Abdullah_II_of_Jordan | 2026-09-23 | The King (born 30 January 1962, age 64) has reigned since 7 February 1999. He keeps significant executive and legislative powers and appoints the PM. |
| JOR-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Jordan | 2026-09-23 | The PM (M) has been in office since 15 September 2024 and is incumbent. |
| JOR-3 | https://en.wikipedia.org/wiki/Politics_of_Jordan | 2026-09-23 | The PM is an independent. The King signs, vetoes, suspends and dissolves. |

EIU: authoritarian (3.28), overridden to constitutional_monarchy_executive. The cabinet is not formed by a parliamentary party, hence "none (nonpartisan)". Next selection: none scheduled.

### JPN (Japan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| JPN-1 | https://en.wikipedia.org/wiki/Sanae_Takaichi | 2026-09-23 | Prime Minister since 21 October 2025 and LDP president since 4 October 2025. Female, born March 1961 (age 65). |
| JPN-2 | https://en.wikipedia.org/wiki/Second_Takaichi_cabinet | 2026-09-23 | Cabinet formed 18 February 2026. Parties: LDP and Japan Innovation Party. JIP ministers joined the cabinet itself for the first time at the 17 September 2026 reshuffle. |
| JPN-3 | https://en.wikipedia.org/wiki/2026_Japanese_general_election | 2026-09-23 | Snap election on 8 February 2026: the LDP won 316 of 465 seats. |
| JPN-4 | https://japantoday.com/category/politics/Takaichi's-cabinet-reshuffle-fires-starting-gun-for-ruling-LDP-leadership-race | 2026-09-23 | Dated 18 September 2026: her LDP presidency runs through September 2027 (the rest of her predecessor's term), so the next leadership race is autumn 2027. |
| JPN-5 | https://japan.kantei.go.jp/ | 2026-09-23 | Kantei site shows the same Prime Minister addressing the UN General Assembly on 22 September 2026. |
| JPN-6 | https://en.wikipedia.org/wiki/Naruhito | 2026-09-23 | Emperor (male), head of state. |

Notes: full democracy (EIU 2025: 8.85). The women's share of 15.8% is the first cabinet's on 1 January 2026.

### KAZ (Kazakhstan)

Region file: `regions/asia.sources.md` (Asia).

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

### KEN (Kenya)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| KEN-1 | https://en.wikipedia.org/wiki/William_Ruto | 2026-09-23 | The President has been in office since 13 September 2022 and leads the UDA, heading a "broad-based government" that includes ODM. Born December 1966, so 59. |
| KEN-2 | https://www.the-star.co.ke/news/2026-06-24-iebc-confirms-august-10-as-date-for-2027-general-election | 2026-09-23 | Dated news (2026-06-24): the electoral commission confirmed Tuesday 10 August 2027 as general election day. |
| KEN-3 | https://en.wikipedia.org/wiki/Orange_Democratic_Movement | 2026-09-23 | ODM's founding leader died on 15 October 2025, and a new leader was elected on 27 March 2026. A March 2025 memorandum of understanding binds ODM to cooperate with the President. The page says ODM is "not part of" the administration. |

`governing_parties` is a judgment call. ODM-affiliated figures have held cabinet posts under the 2025 memorandum. KEN-3 frames that as cooperation rather than a formal coalition, so I list UDA as the governing party and ODM as a partner. Next selection: 2027-08.

### KGZ (Kyrgyzstan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| KGZ-1 | https://en.wikipedia.org/wiki/Sadyr_Japarov | 2026-09-23 | President since 28 January 2021, born December 1968 (age 57). |
| KGZ-2 | https://en.wikipedia.org/wiki/Adylbek_Kasymaliev | 2026-09-23 | Chairman of the Cabinet of Ministers (male) since 18 December 2024. |
| KGZ-3 | https://timesca.com/kyrgyzstan-moves-2027-presidential-election-to-january-27/ | 2026-09-23 | Dated 30 July 2026: presidential election moved to Wednesday, 27 January 2027. |
| KGZ-4 | https://en.wikipedia.org/wiki/2027_Kyrgyz_presidential_election | 2026-09-23 | Election on 27 January 2027. A February 2026 constitutional ruling lets the incumbent seek a second term. |
| KGZ-5 | https://en.wikipedia.org/wiki/2025_Kyrgyz_parliamentary_election | 2026-09-23 | Snap election on 30 November 2025. Independents loyal to the President won 84 of 90 seats. |
| KGZ-6 | https://en.kabar.kg/ | 2026-09-23 | State news agency reports the same Cabinet chairman travelling to China on 23 September 2026. |

Notes: authoritarian (EIU 2025: 3.27). The governing bloc is non-party, so it is coded `none (nonpartisan)`.

### KHM (Cambodia)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| KHM-1 | https://en.wikipedia.org/wiki/Hun_Manet | 2026-09-23 | Prime Minister since 22 August 2023, born October 1977 (age 48). |
| KHM-2 | https://en.wikipedia.org/wiki/Norodom_Sihamoni | 2026-09-23 | King (male), head of state. |
| KHM-3 | https://pressocm.gov.kh/en | 2026-09-23 | Government press unit posts the same Prime Minister's remarks on 16 and 17 September 2026. |
| KHM-4 | https://en.wikipedia.org/wiki/2023_Cambodian_general_election | 2026-09-23 | Last election 23 July 2023; the next is in 2028 (2028-07 follows the July cycle). |

Notes: authoritarian (EIU 2025: 2.70). The Cambodian People's Party governs. The previous Prime Minister, the incumbent's father, remains Senate President and party president.

### KIR (Kiribati)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| KIR-1 | https://www.president.gov.ki/ | 2026-09-23 | The Office of Te Beretitenti site names the sitting President. |
| KIR-2 | https://en.wikipedia.org/wiki/Taneti_Maamau | 2026-09-23 | President since 11 Mar 2016, now in a third and final term (from 2024). Born 16 Sept 1960 (age 66, band 60-69). |
| KIR-3 | https://en.wikipedia.org/wiki/President_of_Kiribati | 2026-09-23 | Tobwaan Kiribati Party. The President is elected by popular vote from candidates the House nominates after the parliamentary election. Terms are four years, with a three-term limit. |
| KIR-4 | https://en.wikipedia.org/wiki/House_of_Assembly_(Kiribati) | 2026-09-23 | Four-year House. Last election 14 and 19 Aug 2024, next by 2028. TKP holds 33 of 45 seats. The presidential vote follows the parliamentary election, as it did in Oct 2024, so the row uses 2028-10 (est.). The incumbent cannot stand again. |
| KIR-5 | https://freedomhouse.org/country/kiribati/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 89/100, with concerns about judicial independence. This gives `flawed_democracy` under the stated rule. |

### KNA (Saint Kitts and Nevis)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| KNA-1 | https://en.wikipedia.org/wiki/Terrance_Drew (wikitext) | 2026-09-23 | Prime Minister since 6 August 2022, born November 1976 (age 49), Saint Kitts and Nevis Labour Party. |
| KNA-2 | https://www.sknis.gov.kn/2026/02/11/dominica-prime-minister-hon-skerrit-commends-caricom-chair-drews-proactive-regional-consultations-ahead-of-historic-50th-heads-meeting/ | 2026-09-23 | Government information service, dated 11 February 2026: the same Prime Minister, then CARICOM chair. |

Notes: the Governor-General is female. The table's 2027-08 is the five-year convention. Per the search summary, the legislature's term started 25 October 2022, so an election is due within 90 days of October 2027.

### KOR (South Korea)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| KOR-1 | https://en.wikipedia.org/wiki/Lee_Jae_Myung | 2026-09-23 | President since 4 June 2025, born around December 1963 (age 62). |
| KOR-2 | https://en.wikipedia.org/wiki/Han_Seong-sook | 2026-09-23 | Prime Minister (female, independent) since 1 July 2026. |
| KOR-3 | https://www.koreatimes.co.kr/southkorea/politics/20260607/smes-minister-han-seong-sook-tapped-as-new-pm | 2026-09-23 | Dated 7 June 2026: the President named the SMEs minister, a former Naver chief executive, as the next Prime Minister. |
| KOR-4 | https://en.wikipedia.org/wiki/Kim_Min-seok_(politician) | 2026-09-23 | The previous Prime Minister's term ended 30 June 2026. |
| KOR-5 | https://en.wikipedia.org/wiki/2030_South_Korean_presidential_election | 2026-09-23 | Next presidential election scheduled for 27 March 2030. |

Notes: flawed democracy (EIU 2025: 7.75). The Democratic Party of Korea governs. The women's share of 22.2% predates the new Prime Minister.

### KWT (Kuwait)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| KWT-1 | https://en.wikipedia.org/wiki/Mishal_Al-Ahmad_Al-Jaber_Al-Sabah | 2026-09-23 | The Emir (born 27 September 1940, age 85, turning 86 on 27 September) has reigned since 16 December 2023. On 10 May 2024 he dissolved the National Assembly and suspended constitutional articles for up to four years, and that suspension still holds. A Crown Prince was appointed in June 2024. |
| KWT-2 | https://en.wikipedia.org/wiki/Cabinet_of_Kuwait | 2026-09-23 | The PM (M) has been in office since 15 April 2024. There was a reshuffle on 1 February 2026. |

EIU: authoritarian (2.78), overridden to absolute_monarchy while parliament is suspended. Parties are not legal. Next selection: none scheduled.

### LAO (Laos)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| LAO-1 | https://en.wikipedia.org/wiki/Thongloun_Sisoulith | 2026-09-23 | General Secretary since January 2021 (re-elected 8 January 2026) and President since March 2021. Born November 1945 (age 80). |
| LAO-2 | https://www.thestar.com.my/aseanplus/aseanplus-news/2026/03/23/lao-assembly-elects-sisoulith-president-siphandone-pm | 2026-09-23 | Dated 23 March 2026: the 10th National Assembly re-elected the General Secretary as President and re-elected the Prime Minister. |
| LAO-3 | https://en.wikipedia.org/wiki/Sonexay_Siphandone | 2026-09-23 | Prime Minister (male) since 30 December 2022. |

Notes: `one_party_state` (EIU 2025: authoritarian, 1.71). The next selection is the 13th Party Congress, expected around January 2031 (an estimate).

### LBN (Lebanon)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBN-1 | https://en.wikipedia.org/wiki/Prime_Minister_of_Lebanon | 2026-09-23 | Under the Taif constitution the PM heads the government and carries out Council of Ministers policy; power shifted away from the presidency. The formal title is President of the Council of Ministers. |
| LBN-2 | https://en.wikipedia.org/wiki/Nawaf_Salam | 2026-09-23 | The PM (born 15 December 1953, age 72) has served since 8 February 2025 and is incumbent. He led the March 2026 ban on Hezbollah military activity and the talks with Israel. |
| LBN-3 | https://en.wikipedia.org/wiki/Joseph_Aoun | 2026-09-23 | The President (M) has served since 9 January 2025 and is incumbent. |
| LBN-4 | https://en.wikipedia.org/wiki/2028_Lebanese_general_election | 2026-09-23 | On 9 March 2026 parliament extended its own term by two years, moving elections to May 2028. |
| LBN-5 | https://en.wikipedia.org/wiki/Cabinet_of_Nawaf_Salam | 2026-09-23 | 24 ministers. Nominating blocs are the Lebanese Forces (4), Amal (2), Hezbollah (2), PSP (2), Kataeb (1) and Tashnag/ARF (1), plus 12 independents from the presidential and PM shares. No resignations are recorded through September 2026. |

The leader seat is `head_of_government`, and it was a judgment call. Taif places executive power in the Council of Ministers under the PM, but the President remains the foreign counterpart on security questions. Next selection is 2028-05. `women_cabinet_share` is 22.7 (5/22) from WIP-2026, while LBN-5 lists 3 women among 24. EIU: authoritarian (3.81).

### LBR (Liberia)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBR-1 | https://emansion.gov.lr/ (official Executive Mansion) | 2026-09-23 | The President and the Vice President (a man) are in office, with news dated 2026-09-21. |
| LBR-2 | https://en.wikipedia.org/w/index.php?title=Joseph_Boakai&action=raw | 2026-09-23 | In office since 22 January 2024, Unity Party. Born November 1944, so 81 on the as-of date. |
| LBR-3 | https://en.wikipedia.org/w/index.php?title=2023_Liberian_general_election&action=raw | 2026-09-23 | The next general election is in 2029 (the 2029 election page says "by October 2029"). |

Second seat: `same`. Next selection: 2029-10.

### LBY (Libya)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LBY-1 | https://en.wikipedia.org/wiki/Government_of_National_Unity_(Libya) | 2026-09-23 | The GNU PM has served since 15 March 2021, and the Presidential Council chair (M) is in post. The GNU is UN-recognized. A rival Government of National Stability has operated in the east since 2022. |
| LBY-2 | https://en.wikipedia.org/wiki/Abdul_Hamid_Dbeibeh | 2026-09-23 | The PM (born about 1959, age 66 to 67) is incumbent; page revised 20 September 2026. |
| LBY-3 | https://africanarguments.org/2026/08/48114/ | 2026-09-23 | Dated analysis (2026-08-03): the mid-June 2026 power-sharing deal keeps the GNU PM in post and creates a new three-person presidency under strong eastern (LNA) influence. It had **not yet been installed**, and the transition is to run until elections by February 2027. |
| LBY-4 | https://libyaobserver.ly/news/libyas-three-councils-reach-agreement-hold-elections-february-17-2027 | 2026-09-23 | Dated news (2026-06-18): the HoR, the High Council of State and the Presidential Council agreed to hold presidential and parliamentary elections together **no later than 17 February 2027**. That is a deadline, not a fixed date. |
| LBY-5 | https://en.wikipedia.org/wiki/Presidential_Council_(Libya) | 2026-09-23 | The 2021 council (chair and two vice-chairs) is still listed. No new council is recorded. |
| LBY-6 | https://en.wikipedia.org/wiki/2026_in_Libya | 2026-09-23 | On 25 August 2026 the rival governments reached an initial agreement on electoral overhaul. No new presidency had been installed as of September. |

Libya is in the uncertain list: the executive is contested and a restructured presidency is pending. Next selection is 2027-02, the agreed outer deadline, which has slipped before. EIU: authoritarian (2.31).

### LCA (Saint Lucia)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| LCA-1 | https://en.wikipedia.org/wiki/Philip_J._Pierre (wikitext) | 2026-09-23 | Prime Minister since 28 July 2021, born September 1954 (age 72), Saint Lucia Labour Party. |
| LCA-2 | https://en.wikipedia.org/wiki/2025_Saint_Lucian_general_election (wikitext) | 2026-09-23 | Election on 1 December 2025: the SLP won a landslide and the opposition kept one seat. |

Notes: the Governor-General's post is held by a man in an acting capacity. The next election is 2030-12 on the five-year convention.

### LIE (Liechtenstein)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| LIE-1 | https://www.regierung.li/text/16608/mitglieder | 2026-09-23 | Official: the head of government (F) has served since 2025-04-11. Five-member government, two of them women. |
| LIE-2 | https://fuerstenhaus.li/en/the-monarchy/rights-and-duties-of-the-reigning-prince/ | 2026-09-23 | Princely House: the Reigning Prince appoints the government, can dissolve parliament, and must assent for any law to be valid. |
| LIE-3 | https://en.wikipedia.org/wiki/Alois,_Hereditary_Prince_of_Liechtenstein | 2026-09-23 | The Hereditary Prince (M, born 1968-06-11, age 58) has been regent since 2004 and exercises the Reigning Prince's powers. |
| LIE-4 | https://freedomhouse.org/country/liechtenstein/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 90/100 Free. It describes "a powerful monarchy with a parliamentary system" and scores A1 (chief national authority elected) at 2/4. |
| LIE-5 | https://en.wikipedia.org/wiki/Brigitte_Haas_cabinet | 2026-09-23 | Coalition of VU and FBP, sworn in 2025-04-10. The head of government (F) was born 1964-12-27. |

Leader seat is a judgment call. SHR-4 marks the Prince as the executive office, and Freedom House treats the monarch as the chief national authority, so the row uses head_of_state. Since 2004 the Reigning Prince (M, born 1945, age 80+, reigning since 1989) has delegated the exercise of his powers to the Hereditary Prince as regent, so the row records the regent's attributes. If the game should instead treat the elected head of government as leader, the swap is: Prime Minister, F, 60-69, since 2025, next selection 2029-02 (Landtag election).

### LKA (Sri Lanka)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| LKA-1 | https://en.wikipedia.org/wiki/Anura_Kumara_Dissanayake | 2026-09-23 | Executive President since 23 September 2024, born November 1968 (age 57). |
| LKA-2 | https://en.wikipedia.org/wiki/Harini_Amarasuriya | 2026-09-23 | Prime Minister (female) since 24 September 2024; no end date recorded. |
| LKA-3 | https://en.wikipedia.org/wiki/2024_Sri_Lankan_presidential_election | 2026-09-23 | Last presidential election 21 September 2024. |

Notes: flawed democracy (EIU 2025: 6.57). The National People's Power governs. The five-year term ends in September 2029, and the vote falls one to two months before expiry, so 2029-08 is an estimate.

### LSO (Lesotho)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| LSO-1 | https://en.wikipedia.org/wiki/Sam_Matekane | 2026-09-23 | The Prime Minister has been in office since 28 October 2022 and founded the RFP. Born March 1958, so 68. |
| LSO-2 | https://en.wikipedia.org/wiki/Next_Lesotho_general_election | 2026-09-23 | The next general election is due "by October 2027". |
| LSO-3 | https://bti-project.org/en/reports/country-report/LSO | 2026-09-23 | BTI 2026: the coalition is RFP, MEC and AD. The Basotho Action Party joined in October 2023 and "has since left" by November 2024. |
| LSO-4 | https://en.wikipedia.org/wiki/Cabinet_of_Sam_Matekane | 2026-09-23 | The cabinet page (updated May 2026) still lists BAP, LCD and LPC as partners since November 2023. |

LSO-3 and LSO-4 disagree. I followed BTI on BAP's exit and listed only the three core parties. LCD and LPC may still hold posts, which I could not confirm. The King (male) is head of state. Next selection: 2027-10.

### LTU (Lithuania)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| LTU-1 | https://www.lrt.lt/en/news-in-english/19/2972052/lithuania-s-president-nominates-soci | 2026-09-23 | Dated 2026-06-26: the President nominated the Social Democratic leader (M) as PM. New coalition of LSDP, Democrats "For Lithuania" and the Farmers, Greens and Christian Families Union. |
| LTU-2 | https://www.lrt.lt/en/news-in-english/19/2990220/seimas-approves-sinkevicius-government-program-new-cabinet-sworn-in | 2026-09-23 | Dated 2026-07-14: programme approved 72-29 and cabinet sworn in. The three factions hold 75 of 141 seats. |
| LTU-3 | https://en.wikipedia.org/wiki/Mindaugas_Sinkevi%C4%8Dius | 2026-09-23 | PM born 1984-06-20 (age 42), in office since 2026-07-14. |
| LTU-4 | https://en.wikipedia.org/wiki/Sinkevi%C4%8Dius_Cabinet | 2026-09-23 | 21st cabinet, formed after the previous coalition collapsed (June 2026). Parties as in the TSV. |
| LTU-5 | https://en.wikipedia.org/wiki/2028_Lithuanian_parliamentary_election | 2026-09-23 | Seimas election on 2028-10-08. |

Note: the women share (35.7) is the previous cabinet's as of 2026-01-01.

### LUX (Luxembourg)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| LUX-1 | https://gouvernement.lu/en/gouvernement.html | 2026-09-23 | Official list: the PM (M) and 15 members. Five women by name (the fetch summary's "6" counted one person twice). |
| LUX-2 | https://monarchie.lu/en | 2026-09-23 | Grand Ducal site: the Grand Duke (M) spoke at the UN on 2026-09-22. |
| LUX-3 | https://en.wikipedia.org/wiki/Luc_Frieden | 2026-09-23 | PM born 1963-09-16 (age 63), in office since 2023-11-17. |
| LUX-4 | https://en.wikipedia.org/wiki/Frieden-Bettel_Government | 2026-09-23 | CSV and DP coalition, formed 2023-11-17. With a five-year term after the October 2023 election, the next election falls in October 2028. |

### LVA (Latvia)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| LVA-1 | https://eng.lsm.lv/article/politics/politics/28.05.2026-new-latvian-government-approved-by-parliament.a649104/ | 2026-09-23 | Dated 2026-05-28: the Saeima approved a new government 66-25 under a United List PM (M). Coalition of United List, New Unity, National Alliance and ZZS. 2 of 15 ministers are women. |
| LVA-2 | https://en.wikipedia.org/wiki/Andris_Kulbergs | 2026-09-23 | PM born 1979-05-26 (age 47), in office since 2026-05-28. The predecessor resigned on 2026-05-14. |
| LVA-3 | https://en.wikipedia.org/wiki/Kulbergs_cabinet | 2026-09-23 | 43rd government, the same four parties. |
| LVA-4 | https://en.wikipedia.org/wiki/2026_Latvian_parliamentary_election | 2026-09-23 | Saeima election scheduled for 2026-10-03. |

Note: the map's women share (28.6) is the previous cabinet's. The current cabinet has 2 of 15 (13.3) per LVA-1. The leader may change again after the 2026-10-03 election.

### MAR (Morocco)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MAR-1 | https://en.wikipedia.org/wiki/Mohammed_VI_of_Morocco | 2026-09-23 | The King (born 21 August 1963, age 63) has reigned since 23 July 1999 and is incumbent. Under the 2011 constitution he appoints the Head of Government from the party that wins the most seats. |
| MAR-2 | https://en.wikipedia.org/wiki/Aziz_Akhannouch | 2026-09-23 | The Head of Government (M) has served since 7 October 2021, leading an RNI, PAM and Istiqlal coalition. He stepped down as RNI leader in January 2026. |
| MAR-3 | https://en.wikipedia.org/wiki/2026_Moroccan_general_election | 2026-09-23 | The House of Representatives election is being held **today, 23 September 2026**. PAM is led by a woman. The page's seat figures are the 2021 results, and I could not confirm any 2026 result. |

Morocco is in the uncertain list. The leader seat (King) is unaffected, but the second seat will change hands, because the outgoing Head of Government no longer leads his party. If PAM places first, the second seat could be held by a woman. `second_seat_sex` records the incumbent as of 2026-09-23. EIU: hybrid (4.97), overridden to constitutional_monarchy_executive. Next selection: none scheduled.

### MCO (Monaco)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| MCO-1 | https://www.gouv.mc/en/news/christophe-mirmand-appointed-minister-of-state-of-the-principality-of-monaco-as-of-21-july-2025 | 2026-09-23 | Official: the Sovereign Prince appointed the current Minister of State (M) by Sovereign Ordinance, effective 2025-07-21. |
| MCO-2 | https://freedomhouse.org/country/monaco/freedom-world/2026 | 2026-09-23 | Freedom House 2026: 82/100 Free. "The prince appoints the government, which is responsible only to him." |
| MCO-3 | https://en.wikipedia.org/wiki/Albert_II_of_Monaco | 2026-09-23 | Sovereign Prince born 1958-03-14 (age 68), reigning since 2005. |
| MCO-4 | https://www.palais.mc/en/the-sovereign-prince/h-s-h-prince-albert-ii/biography.html | 2026-09-23 | Palace site confirms the current Sovereign Prince. |

Governing parties: the Council of Government is appointed by the Prince and is nonpartisan.

### MDA (Moldova)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MDA-1 | https://radiomoldova.md/p/81391/vasile-tofan-takes-office-as-moldova-pm-to-push-eu-reforms | 2026-09-23 | Dated news (July 2026): the new Prime Minister (M) was sworn in on 22 July 2026, backed by the Party of Action and Solidarity (53 votes). His predecessor had resigned. |
| MDA-2 | https://presedinte.md/eng | 2026-09-23 | Primary source. The Presidency site names the incumbent President (F). The latest press release on the page is from June 2026. |
| MDA-3 | https://en.wikipedia.org/wiki/Maia_Sandu (raw) | 2026-09-23 | President since 24 December 2020, born 1972 (age 54). |

The leader seat is a **judgment call**. Moldova is formally a parliamentary republic, but the directly elected President founded the ruling party, and it was the President who picked the new Prime Minister (MDA-1). A foreign president deals with the President, so the row records `head_of_state`. EIU: hybrid regime (5.86, downgraded in 2025). The next presidential election is estimated at October 2028 from the four-year term after the October and November 2024 vote.

### MDG (Madagascar)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MDG-1 | https://en.wikipedia.org/wiki/Michael_Randrianirina | 2026-09-23 | An army colonel (male, born 1974, so 51 or 52) took power during the October 2025 protests and assumed office on 17 October 2025. The Prime Minister was replaced on 15 March 2026. |
| MDG-2 | https://en.wikipedia.org/wiki/Council_of_the_Presidency_for_the_Re-Foundation_of_the_Republic_of_Madagascar | 2026-09-23 | The title is "President of the Refoundation of the Republic of Madagascar". The ruling council of Armed Forces and Gendarmerie officers has governed since 14 October 2025, and most institutions were dissolved except the National Assembly. The roadmap runs 24 months, and this page puts the presidential election in September 2027. |
| MDG-3 | https://www.africanews.com/2026/05/11/madagascar-presidential-election-scheduled-for-october-2027/ | 2026-09-23 | Dated news (2026-05-11): the electoral commission set a constitutional referendum for June 2027 and the presidential election for October 2027. |
| MDG-4 | https://www.occrp.org/en/news/madagascars-transitional-leader-taps-anti-corruption-expert-as-prime-minister | 2026-09-23 | Dated news (2026-03-16): the transitional president named a new Prime Minister (male), a civilian anti-corruption official, about a week after dismissing the previous government. |

EIU 2025 rates Madagascar a hybrid regime (5.06), but I overrode it to `military_junta`. Next selection is 2027-10, from the electoral commission's calendar in MDG-3, which is later than the September date in MDG-2. The 33.3% women-cabinet figure describes the government in place on 1 January 2026, which was replaced in March.

### MDV (Maldives)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| MDV-1 | https://en.wikipedia.org/wiki/Mohamed_Muizzu | 2026-09-23 | President since 17 November 2023, born June 1978 (age 48). |
| MDV-2 | https://presidency.gov.mv/ | 2026-09-23 | President's Office site names the same President, with press items dated 22 September 2026. |
| MDV-3 | https://en.wikipedia.org/wiki/2028_Maldivian_presidential_election | 2026-09-23 | Next presidential election in September 2028. A 4 April 2026 referendum to hold it together with the parliamentary election was rejected (about 69% no). |
| MDV-4 | https://freedomhouse.org/country/maldives/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026: Partly Free, 41/100 (43 the year before). |

Notes: the EIU does not score the Maldives. `hybrid_regime` is mapped from Freedom House "Partly Free". The People's National Congress holds a parliamentary supermajority. EIU-2025 is not cited on this row.

- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### MEX (Mexico)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| MEX-1 | https://en.wikipedia.org/wiki/Claudia_Sheinbaum (wikitext) | 2026-09-23 | President (female) since October 2024, born June 1962 (age 64), National Regeneration Movement; coalition "Sigamos Haciendo Historia". |
| MEX-2 | https://en.wikipedia.org/wiki/Cabinet_of_Claudia_Sheinbaum | 2026-09-23 | Majority government of the Sigamos Haciendo Historia coalition (Morena plus allies); women hold roughly half of cabinet posts. |
| MEX-3 | https://www.gob.mx/presidencia | 2026-09-23 | Official site shows the office as "Presidenta de México", held by a woman. |

Notes: the MEX-1 wikitext links the Labor Party and the Ecologist Green Party of Mexico as Morena's partners in Sigamos Haciendo Historia; no 2026 source was opened to confirm each partner's current standing. The next presidential election is June 2030 (six-year term). A recall referendum is possible but not scheduled.

### MHL (Marshall Islands)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| MHL-1 | https://en.wikipedia.org/wiki/Hilda_Heine | 2026-09-23 | President (a woman) in the current term since 3 Jan 2024 (she also served 2016-2020). Independent. Born Apr 1951 (age 75, band 70-79). |
| MHL-2 | https://en.wikipedia.org/wiki/President_of_the_Marshall_Islands | 2026-09-23 | The Nitijela elects the President from its members for a four-year term. Next general election in 2027. The November cycle gives 2027-11 (est.), and the Nitijela's selection follows in Jan 2028. |
| MHL-3 | https://en.wikipedia.org/wiki/2026_in_the_Marshall_Islands | 2026-09-23 | The same President is listed as the 2026 incumbent, with no change of government in 2026. |
| MHL-4 | https://freedomhouse.org/country/marshall-islands/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 93/100, which gives `full_democracy`. |

### MKD (North Macedonia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MKD-1 | https://en.wikipedia.org/wiki/Politics_of_North_Macedonia (raw) | 2026-09-23 | The current cabinet is a coalition of VMRO-DPMNE, the VLEN coalition and ZNAM (For Our Macedonia). |
| MKD-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_North_Macedonia (raw) | 2026-09-23 | The incumbent has been Prime Minister since 23 June 2024. |
| MKD-3 | https://en.wikipedia.org/wiki/Hristijan_Mickoski (raw) | 2026-09-23 | Born 29 September 1977, so age 48 on as_of. |
| MKD-4 | https://vlada.mk/?ln=en-gb (curl) | 2026-09-23 | Primary source. The government site carries an agenda dated 23 September 2026, and its news items quote the incumbent Prime Minister. |

The President (F) is from HEADS. The next parliamentary election is estimated at May 2028 from the four-year term after May 2024. EIU: flawed democracy (6.28).

### MLI (Mali)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MLI-1 | https://www.aljazeera.com/news/2025/7/4/mali-military-chief-granted-renewable-five-year-presidential-term | 2026-09-23 | Dated news (2025-07-04): the transitional parliament granted the junta leader a five-year mandate from the charter's promulgation, renewable "as many times as necessary" without elections, "until the pacification of the country". Political parties were dissolved in May 2025. |
| MLI-2 | https://en.wikipedia.org/w/index.php?title=Assimi_Go%C3%AFta&action=raw | 2026-09-23 | De facto head of state from May 2021, interim until 8 July 2025, then under the new mandate. Born November 1983, so 42 on the as-of date. |
| MLI-3 | https://en.wikipedia.org/w/index.php?title=2025_in_Mali&action=raw | 2026-09-23 | Parties dissolved by decree on 13 May 2025. The renewable five-year term was adopted on 3 July 2025. |
| MLI-4 | https://en.wikipedia.org/w/index.php?title=List_of_prime_ministers_of_Mali&action=raw | 2026-09-23 | An army officer (a man) has been Prime Minister since 21 November 2024 and is still serving. |

Next selection: 2030-07, the end of the renewable mandate. It can be renewed without an election.

### MLT (Malta)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| MLT-1 | https://www.aljazeera.com/news/2026/5/31/labour-triumphs-in-malta-election-preliminary-results-show | 2026-09-23 | Dated 2026-05-31: Labour won a fourth term in the snap election of 2026-05-30. The sitting PM (M, 48) continues. |
| MLT-2 | https://en.wikipedia.org/wiki/Robert_Abela | 2026-09-23 | PM born 1977-12-07 (age 48), in office since 2020-01-13. |
| MLT-3 | https://en.wikipedia.org/wiki/Elections_in_Malta | 2026-09-23 | The House of Representatives serves a five-year term. After May 2026, the next election is due by mid-2031 (2031-06 used). |

Note: the women share (12.5) is the pre-election cabinet as of 2026-01-01. The President (F) comes from SHR-4.

### MMR (Myanmar)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| MMR-1 | https://en.wikipedia.org/wiki/Min_Aung_Hlaing | 2026-09-23 | President since 10 April 2026 (acting from 7 August 2025). Before that he chaired the junta's ruling council from 2 February 2021. Born July 1956 (age 70). |
| MMR-2 | https://www.aljazeera.com/news/2026/4/10/myanmars-coup-leader-min-aung-hlaing-sworn-in-as-president | 2026-09-23 | Dated 10 April 2026: the coup leader was sworn in as President. The military-backed USDP won over 80% of contested seats, and the armed forces hold a further quarter of seats unelected. |
| MMR-3 | https://en.wikipedia.org/wiki/Second_Min_Aung_Hlaing_cabinet | 2026-09-23 | USDP-led cabinet. The two Vice Presidents are one man and one woman. |
| MMR-4 | https://en.wikipedia.org/wiki/2025%E2%80%9326_Myanmar_general_election | 2026-09-23 | Phased election on 28 December 2025, 11 January 2026 and 25 January 2026. |

Notes: coded `authoritarian` (EIU 2025: 0.96) because the junta was formally dissolved and replaced by a parliament-elected presidency. `military_junta` is a defensible alternative, since the same commander rules and the military keeps a quarter of parliament; the row is flagged. `leader_in_office_since` is 2021, when he took power, not 2026. Under the 2008 constitution the President is head of state and head of government, so the second seat is `same`. The next selection (2031-03) estimates the new parliament's presidential vote at the end of the five-year term. No women's figure (WIP-2026: information not available).

- Merge pass: `women_cabinet_share` filled as 10.0 from MRG-MMR (3 women among the 30 Union ministers sworn in on 10 April 2026). One of the three is inferred from the name form; if that minister is male, the share is 6.7.
- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### MNE (Montenegro)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MNE-1 | https://en.wikipedia.org/wiki/Spaji%C4%87_Cabinet (raw) | 2026-09-23 | The cabinet is Europe Now, Democratic Montenegro, For the Future of Montenegro (New Serb Democracy), the Bosniak Party, the Socialist People's Party, Albanian Forum and Albanian Alliance. The Democratic People's Party withdrew on 31 January 2026 after its ministers resigned. |
| MNE-2 | https://www.gov.me/en/prime-minister (curl) | 2026-09-23 | Primary source. The government site names the incumbent Prime Minister. Its items on that page run to June 2026. |
| MNE-3 | https://en.wikipedia.org/wiki/Milojko_Spaji%C4%87 (raw) | 2026-09-23 | Prime Minister since 31 October 2023. Born 24 September 1987, so he is 38 on as_of and turns 39 the next day. |
| MNE-4 | https://www.gov.me/en/news (curl) | 2026-09-23 | Primary source. Ministers of the same government have items dated 21 to 23 September 2026. |

The President (M) is from HEADS. The next parliamentary election is estimated at June 2027 from the four-year term after June 2023. EIU: flawed democracy (6.73). He turns 39 the day after as_of, which keeps him in the 30-39 band until September 2027.

### MNG (Mongolia)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| MNG-1 | https://en.wikipedia.org/wiki/Nyam-Osoryn_Uchral | 2026-09-23 | Prime Minister since 30 March 2026, after his predecessor resigned on 27 March 2026. Born 2 January 1987 (age 39). He also chairs the Mongolian People's Party. |
| MNG-2 | https://en.wikipedia.org/wiki/Cabinet_of_Nyam-Osoryn_Uchral | 2026-09-23 | Cabinet formed 4 April 2026: MPP, HUN Party and National Coalition, with 79 of 126 seats. |
| MNG-3 | https://en.wikipedia.org/wiki/Ukhnaagiin_Kh%C3%BCrels%C3%BCkh | 2026-09-23 | President (male) since June 2021. |
| MNG-4 | https://en.wikipedia.org/wiki/Prime_Minister_of_Mongolia | 2026-09-23 | Incumbent listed since 30 March 2026. |
| MNG-5 | https://en.wikipedia.org/wiki/2024_Mongolian_parliamentary_election | 2026-09-23 | Last parliamentary election 28 June 2024; the next is in 2028 (2028-06 follows the June cycle). |
| MNG-6 | https://montsame.mn/en | 2026-09-23 | State news agency shows the same Prime Minister active on 22 and 23 September 2026. |

Notes: flawed democracy (EIU 2025: 6.50). Executive power sits with the Prime Minister, so the seat is `head_of_government`. He is the third Prime Minister within a year. The presidential election in 2027 does not choose the Prime Minister.

### MOZ (Mozambique)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MOZ-1 | https://en.wikipedia.org/wiki/Daniel_Chapo | 2026-09-23 | The President has been in office since 15 January 2025 after the disputed October 2024 election. FRELIMO. Born January 1977, so 49. |
| MOZ-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Mozambique | 2026-09-23 | The Prime Minister (female) has served since January 2025. |
| MOZ-3 | https://www.constituteproject.org/constitution/Mozambique_2007 | 2026-09-23 | Primary text: Article 146 makes the head of state also head of government, and Article 160 lets the President appoint and dismiss the Prime Minister. |

Second seat: `same`, per MOZ-3. The Prime Minister is female. Next selection: 2029-10, derived from the October 2024 election and the five-year term.

### MRT (Mauritania)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MRT-1 | https://en.wikipedia.org/wiki/Mohamed_Ould_Ghazouani | 2026-09-23 | The President (born 4 December 1956, age 69) has served since 1 August 2019 and was re-elected in 2024. His party is El Insaf (Equity Party). |
| MRT-2 | https://en.wikipedia.org/wiki/Mokhtar_Ould_Djay | 2026-09-23 | The PM (M, El Insaf) has served since 2 August 2024 and is incumbent. |
| MRT-3 | https://en.wikipedia.org/wiki/Government_of_Mokhtar_Ould_Djay | 2026-09-23 | The coalition is El Insaf, the National Democratic Alliance, El Islah and the UDP (which joined 18 September 2025), with 32 ministers. The page was revised 23 May 2026. |

Next selection is 2029-06: a five-year term from the June 2024 vote, and the incumbent is serving his second and final term. EIU: authoritarian (3.84 in 2025; it was 3.96 in 2024). The surname rule is Hassaniya: Ould or Mint plus the father's name.

### MUS (Mauritius)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MUS-1 | https://en.wikipedia.org/wiki/Navin_Ramgoolam | 2026-09-23 | The Prime Minister has been in office since 12 November 2024 (third tenure). Labour Party. Born July 1947, so 79. The Alliance du Changement won 60 to 0 in November 2024. |
| MUS-2 | https://en.wikipedia.org/wiki/President_of_Mauritius | 2026-09-23 | The President (male), elected by the National Assembly, has served since 6 December 2024. |
| MUS-3 | https://en.wikipedia.org/wiki/Fourth_Navin_Ramgoolam_cabinet | 2026-09-23 | As of August 2026, six parties support the government. The MMM's leader resigned as Deputy PM, and an MMM successor (female) took over on 4 May 2026. The MMM stays in government. There are 2 women among 24 ministers. |

Next selection: 2029-11, derived from the November 2024 election and the five-year term.

### MWI (Malawi)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| MWI-1 | https://en.wikipedia.org/wiki/Peter_Mutharika | 2026-09-23 | The President is in office from 4 October 2025 (a return; he previously served 2014 to 2020). Party DPP. Born July 1940, so 86. The Vice President is female. |
| MWI-2 | https://en.wikipedia.org/wiki/Second_Vice-President_of_Malawi | 2026-09-23 | The Second Vice President, appointed 5 October 2025, leads AFORD, which allied with the DPP before the election. |
| MWI-3 | https://en.wikipedia.org/wiki/2025_Malawian_general_election | 2026-09-23 | The election was held on 16 September 2025. The incumbent won 56.76% and was inaugurated on 4 October 2025. |

I could not open a dated wire story for the 2025 change: the AP, BBC and Washington Times links were blocked or returned 403. MWI-3 cites Reuters, AP and BBC coverage. Next selection: 2030-09, derived from the September 2025 election and the five-year term.

### MYS (Malaysia)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| MYS-1 | https://en.wikipedia.org/wiki/Anwar_Ibrahim | 2026-09-23 | Prime Minister since 24 November 2022, born August 1947 (age 79). |
| MYS-2 | https://en.wikipedia.org/wiki/Ibrahim_Iskandar_of_Johor | 2026-09-23 | Yang di-Pertuan Agong (male), head of state. |
| MYS-3 | https://www.pmo.gov.my/ | 2026-09-23 | PM's office site shows the same Prime Minister, with a recent item on a new cabinet line-up. |
| MYS-4 | https://en.wikipedia.org/wiki/Anwar_Ibrahim_cabinet | 2026-09-23 | Unity government of Pakatan Harapan, Barisan Nasional, Gabungan Parti Sarawak and Gabungan Rakyat Sabah, plus minor parties. Perikatan Nasional is in opposition. |
| MYS-5 | https://en.wikipedia.org/wiki/Next_Malaysian_general_election | 2026-09-23 | Parliament dissolves automatically in December 2027, so the latest polling date is February 2028. |
| MYS-6 | https://presidency.gov.mv/ | 2026-09-23 | The Maldives presidency records a state luncheon for Malaysia's Prime Minister on 22 September 2026, which confirms he is in office today. |

Notes: flawed democracy (EIU 2025: 7.11). Coded 2028-02 as the deadline. Coalition partners are pressing for an early GE16, but none has been called.

### NAM (Namibia)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NAM-1 | https://en.wikipedia.org/wiki/Netumbo_Nandi-Ndaitwah | 2026-09-23 | The President (female) has been in office since 21 March 2025. SWAPO. Born October 1952, so 73. The Vice President is female. |
| NAM-2 | https://en.wikipedia.org/wiki/Elijah_Ngurare | 2026-09-23 | The Prime Minister (male), appointed by the President, has served since 21 March 2025. |

The President is head of state and government, so the second seat is `same`. I could not reach the presidency site (op.gov.na refused the connection), so no 2026-dated source confirms her incumbency. Nothing I read suggests a change. Next selection: 2029-11, derived from the November 2024 election and the five-year term.

### NER (Niger)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NER-1 | https://www.aljazeera.com/news/2026/9/6/niger-military-accuses-france-of-orchestrating-failed-mutiny-what-to-know | 2026-09-23 | Dated news (2026-09-06): a mutiny on 28-29 August 2026 attacked the airport base and the presidential palace. It failed, and the 2023 coup leader remains in power. |
| NER-2 | https://en.wikipedia.org/w/index.php?title=Abdourahamane_Tiani&action=raw | 2026-09-23 | Head of state since the July 2023 coup, President of Niger since 26 March 2025. Born 1 January 1964, so 62 on the as-of date. |
| NER-3 | https://en.wikipedia.org/w/index.php?title=2025_in_Niger&action=raw | 2026-09-23 | Sworn in as president on 26 March 2025 for the five-year transition set by the new charter (cites AP, 2025-03-26). The national conference had recommended banning all existing parties. The Prime Minister is unchanged. |
| NER-4 | https://en.wikipedia.org/w/index.php?title=2026_Nigerien_coup_attempt&action=raw | 2026-09-23 | Result: coup failure. |

Next selection: 2030-03, the end of the five-year transition. The Prime Minister is a man (HEADS, NER-3).

### NGA (Nigeria)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| NGA-1 | https://statehouse.gov.ng/ (official) | 2026-09-23 | The President and Vice President in office, with news items dated 2026-09-22. |
| NGA-2 | https://en.wikipedia.org/w/index.php?title=Bola_Tinubu&action=raw | 2026-09-23 | In office since 29 May 2023, All Progressives Congress. Born March 1952, so 74 on the as-of date. |
| NGA-3 | https://inecnigeria.org/elections/calendar (INEC, official) | 2026-09-23 | Presidential and National Assembly elections are on 16 January 2027. |
| NGA-4 | https://www.premiumtimesng.com/news/top-news/859957-updated-inec-reschedules-2027-general-election-releases-new-election-timetable.html | 2026-09-23 | Dated news (2026-02-26): INEC moved the presidential election from 20 February to 16 January 2027 after the Electoral Act 2026. |
| NGA-5 | https://en.wikipedia.org/w/index.php?title=2027_Nigerian_general_election&action=raw | 2026-09-23 | Confirms 16 January 2027 and that INEC published the final presidential candidate list on 2026-09-12. |

The President is head of state and government, so the second seat is `same`. The Vice President is a man (NGA-1).

### NIC (Nicaragua)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| NIC-1 | https://en.wikipedia.org/wiki/Daniel_Ortega (wikitext) | 2026-09-23 | President since 10 January 2007 and Co-President since the 2025 reform. Born November 1945 (age 80). FSLN. |
| NIC-2 | https://en.wikipedia.org/wiki/Rosario_Murillo (wikitext) | 2026-09-23 | The other Co-President is female, born June 1951. |
| NIC-3 | https://en.wikipedia.org/wiki/2027_Nicaraguan_general_election | 2026-09-23 | The election was moved from November 2026 to November 2027 by the 2025 term extension. On 20 July 2026 the senior co-president announced there would be no more elections, and the Assembly moved to enact that. |

Notes: **flagged uncertain.** The co-presidency is a formal two-person diarchy. The elder co-president is coded as leader because he has held the seat since 2007; the choice between the two is a judgment call. With elections abolished, `next_leader_selection` is `none scheduled`. The NPR report of the announcement (npr.org, 21 July 2026) timed out and was not read.

- Merge pass: `governing_parties` now reads "FSLN (a liberation front named for a 1930s guerrilla leader)". The party's full name is built on a real person's name.

### NLD (Netherlands)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| NLD-1 | https://www.government.nl/latest/news/2026/02/23/jetten-government-sworn-in | 2026-09-23 | Official, dated 2026-02-23: new government of D66, VVD and CDA sworn in with 18 ministers and 10 state secretaries. |
| NLD-2 | https://en.wikipedia.org/wiki/Rob_Jetten | 2026-09-23 | PM (M) born 1987-03-25 (age 39), in office since 2026-02-23. |
| NLD-3 | https://en.wikipedia.org/wiki/Jetten_cabinet | 2026-09-23 | Minority cabinet of D66, VVD and CDA. |
| NLD-4 | https://en.wikipedia.org/wiki/Next_Dutch_general_election | 2026-09-23 | Next general election by May 2030. |

Note: the women share (28.6) is the outgoing caretaker cabinet as of 2026-01-01.

### NOR (Norway)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| NOR-1 | https://www.aljazeera.com/news/2026/8/28/norways-king-harald-v-dies-succeeded-by-son | 2026-09-23 | Dated 2026-08-28: the King died that day and the Crown Prince succeeded automatically as King (M). |
| NOR-2 | https://www.nrk.no/artikkel/store-viste-frem-sine-nye-statsrader-1527614 | 2026-09-23 | NRK report on the September 2026 reshuffle: the PM presented new ministers to the new King in council. The fetch summary labeled it 2025, but the text describes the new King, so it's from 2026. |
| NOR-3 | https://en.wikipedia.org/wiki/St%C3%B8re_cabinet | 2026-09-23 | Labour-only government (the Centre Party left in 2025). Reshuffled 2026-09-11. |
| NOR-4 | https://en.wikipedia.org/wiki/Jonas_Gahr_St%C3%B8re | 2026-09-23 | PM (M) born 1960-08-25 (age 66), in office since 2021-10-14. |
| NOR-5 | https://en.wikipedia.org/wiki/2029_Norwegian_parliamentary_election | 2026-09-23 | Next Storting election on 10 or 17 September 2029. |

Official sites regjeringen.no (403) and royalcourt.no / kongehuset.no (429) blocked automated access.

### NPL (Nepal)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| NPL-1 | https://en.wikipedia.org/wiki/Balen_Shah | 2026-09-23 | Prime Minister since 27 March 2026, born April 1990 (age 36). |
| NPL-2 | https://www.aljazeera.com/news/2026/3/27/nepals-youngest-premier-sworn-in-after-releasing-new-rap-song-about-unity | 2026-09-23 | Dated 27 March 2026: sworn in after the Rastriya Swatantra Party won 182 of 275 seats on 5 March 2026, enough to govern alone. |
| NPL-3 | https://en.wikipedia.org/wiki/Ram_Chandra_Paudel | 2026-09-23 | President (male) since March 2023. |
| NPL-4 | https://en.wikipedia.org/wiki/2026_Nepalese_general_election | 2026-09-23 | Election held 5 March 2026, the first after the September 2025 protests. The next is due at the end of the five-year term (2031-03, an estimate). |

Notes: hybrid regime (EIU 2025: 4.01). The women's share of 21.4% is the interim government's on 1 January 2026.

### NRU (Nauru)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| NRU-1 | https://en.wikipedia.org/wiki/2025_Nauruan_parliamentary_election | 2026-09-23 | Parliamentary election on 11 Oct 2025, with all candidates independent. The incumbent President was re-elected unopposed by Parliament on 14 Oct 2025. |
| NRU-2 | https://en.wikipedia.org/wiki/David_Adeang | 2026-09-23 | President since 30 Oct 2023. Born Nov 1969 (age 56, band 50-59). |
| NRU-3 | https://en.wikipedia.org/wiki/2025_Nauruan_constitutional_referendum | 2026-09-23 | Voters rejected a 3-to-4-year parliamentary term in Oct 2025 (44.67% yes, with two-thirds required). Parliament then passed the extension on 26 and 31 Mar 2026. |
| NRU-4 | https://en.wikipedia.org/wiki/2026_in_Nauru | 2026-09-23 | The term extension passed on 31 Mar 2026. A new Vice President office was filled on 16 Apr 2026. The country was officially renamed the Republic of Naoero on 3 Aug 2026. |
| NRU-5 | https://en.wikipedia.org/wiki/Parliament_of_Nauru | 2026-09-23 | Gives a four-year term and next election 2029. The row uses 2029-10 (est.). |
| NRU-6 | https://en.wikipedia.org/wiki/Politics_of_Nauru | 2026-09-23 | Still describes a three-year term, which conflicts with NRU-3, NRU-4 and NRU-5. If the extension did not take effect, the next election is about Oct 2028. |
| NRU-7 | https://freedomhouse.org/country/nauru/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 75/100, which gives `flawed_democracy`. |

### NZL (New Zealand)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| NZL-1 | https://en.wikipedia.org/wiki/2026_New_Zealand_general_election | 2026-09-23 | General election fixed for 7 Nov 2026 (announced 21 Jan 2026). The government is a National, ACT and NZ First coalition. |
| NZL-2 | https://www.1news.co.nz/2026/08/12/full-statement-luxon-survives-caucus-showdown-united/ | 2026-09-23 | 1News, 2026-08-12: the PM survived a National caucus confidence vote (the second of 2026) and remains PM and party leader. |
| NZL-3 | https://en.wikipedia.org/wiki/Christopher_Luxon | 2026-09-23 | PM since 27 Nov 2023, National Party. Born July 1970 (age 56, band 50-59). |
| NZL-4 | https://en.wikipedia.org/wiki/Cindy_Kiro | 2026-09-23 | The Governor-General (a woman) is still in office. Her term was extended to 31 Mar 2027 so the next appointment does not clash with the election. |
| NZL-5 | https://en.wikipedia.org/wiki/Governor-General_of_New_Zealand | 2026-09-23 | Governor-General in office since 21 Oct 2021. |

### OMN (Oman)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| OMN-1 | https://en.wikipedia.org/wiki/Sultan_of_Oman | 2026-09-23 | The Sultan is both head of state and head of government in an absolute monarchy. A Crown Prince was designated in 2021. |
| OMN-2 | https://en.wikipedia.org/wiki/Haitham_bin_Tariq | 2026-09-23 | He has reigned since 11 January 2020 and is also Prime Minister. The page gives his birth as 11 October 1955. Other references give 1954; either way he is 70 or 71, in the 70-79 band. |

`second_seat` is "same". EIU: authoritarian (3.05), overridden to absolute_monarchy. Next selection: none scheduled.

### PAK (Pakistan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| PAK-1 | https://en.wikipedia.org/wiki/Shehbaz_Sharif | 2026-09-23 | Prime Minister since 4 March 2024 (an earlier term ran 2022 to 2023), born 23 September 1951 (75 today). |
| PAK-2 | https://en.wikipedia.org/wiki/Asif_Ali_Zardari | 2026-09-23 | President (male) since March 2024. |
| PAK-3 | https://www.pmo.gov.pk/ | 2026-09-23 | PM's office site shows the same Prime Minister at the SCO summit in Bishkek on 1 September 2026. |
| PAK-4 | https://en.wikipedia.org/wiki/Second_Shehbaz_Sharif_government | 2026-09-23 | Governing coalition: PML(N) and PPP, with MQM-P, PML(Q), IPP, BAP and smaller parties. |
| PAK-5 | https://en.wikipedia.org/wiki/Next_Pakistani_general_election | 2026-09-23 | Next general election expected by 28 February 2029. |
| PAK-6 | https://en.wikipedia.org/wiki/Asim_Munir | 2026-09-23 | The army chief is a Field Marshal and now also Chief of Defence Forces, received separately by the US president in 2025. |

Notes: the constitutional executive is the Prime Minister, so the seat is `head_of_government`. The army chief (PAK-6) holds power a foreign government also deals with directly, so the seat is flagged as uncertain. EIU 2025 classes Pakistan authoritarian (2.44).

### PAN (Panama)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| PAN-1 | https://en.wikipedia.org/wiki/Jos%C3%A9_Ra%C3%BAl_Mulino (wikitext) | 2026-09-23 | President since 1 July 2024, born June 1959 (age 67), Realizing Goals (Realizando Metas). |

Notes: the presidency site (presidencia.gob.pa) returned an empty page. The next election is May 2029.

### PER (Peru)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| PER-1 | https://en.wikipedia.org/wiki/Keiko_Fujimori | 2026-09-23 | President since 28 July 2026, female, born May 1975 (age 51), Popular Force. The President of the Council of Ministers is male. |
| PER-2 | https://www.aljazeera.com/news/2026/7/28/keiko-fujimori-sworn-in-as-peru-president-after-narrow-election-win | 2026-09-23 | Dated 28 July 2026: sworn in after a narrow runoff win; the ninth president in a decade. |
| PER-3 | https://en.wikipedia.org/wiki/2026_Peruvian_general_election (wikitext) | 2026-09-23 | First round 12 to 13 April 2026, runoff 7 June 2026. |

Notes: **flagged uncertain** (narrow margin, and the country removed or replaced several presidents from 2016 to 2026). `second_seat` is `same`: the President of the Council of Ministers coordinates the cabinet, but the President is head of both state and government. The 21.1% share is the predecessor's cabinet. The next election is April 2031.

### PHL (Philippines)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| PHL-1 | https://en.wikipedia.org/wiki/Bongbong_Marcos | 2026-09-23 | President since 30 June 2022, born 13 September 1957 (age 69). The President is both head of state and head of government. |
| PHL-2 | https://en.wikipedia.org/wiki/Alyansa_para_sa_Bagong_Pilipinas | 2026-09-23 | The administration's alliance: PFP, Lakas-CMD, NPC, Nacionalista, NUP. The electoral vehicle was formally dissolved on 30 June 2025, but the member parties remain the administration's bloc. |
| PHL-3 | https://en.wikipedia.org/wiki/2028_Philippine_presidential_election | 2026-09-23 | Next presidential election on 8 May 2028. |

Notes: flawed democracy (EIU 2025: 6.31). Parties are loose and personal, so the party list names the presidential bloc rather than a formal coalition.

- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### PLW (Palau)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| PLW-1 | https://www.forumsec.org/ | 2026-09-23 | Pacific Islands Forum Secretariat: the sitting President of Palau chaired the Smaller Island States Leaders Meeting on 31 Aug 2026. The Leaders' Communique followed on 4 Sept 2026. |
| PLW-2 | https://en.wikipedia.org/wiki/Surangel_Whipps_Jr. | 2026-09-23 | President since 21 Jan 2021, re-elected Nov 2024. Independent. Born Aug 1968 (age 58, band 50-59). |
| PLW-3 | https://www.palaugov.pw/ | 2026-09-23 | The government site carries the sitting President's State of the Republic address dated 22 July 2026. |
| PLW-4 | https://freedomhouse.org/country/palau/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 92/100, which gives `full_democracy`. The four-year cycle (2020, 2024) puts the next direct presidential election in 2028-11, and the incumbent is term-limited after two consecutive terms. The cycle and term limit are inference and not stated in an opened source. |

### PNG (Papua New Guinea)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| PNG-1 | https://www.pmnec.gov.pg/ | 2026-09-23 | Department of PM and NEC items dated 22 Sept 2026 name the sitting PM, who is attending UNGA 81. |
| PNG-2 | https://en.wikipedia.org/wiki/James_Marape | 2026-09-23 | PM since 30 May 2019, Pangu Pati. Born Apr 1971 (age 55, band 50-59). |
| PNG-3 | https://en.wikipedia.org/wiki/Governor-General_of_Papua_New_Guinea | 2026-09-23 | Governor-General (male) in office since 28 Feb 2017, re-elected for a second term. |
| PNG-4 | https://en.wikipedia.org/wiki/Next_Papua_New_Guinean_general_election | 2026-09-23 | Next general election in or before 2027. |
| PNG-5 | https://en.wikipedia.org/wiki/National_Parliament_of_Papua_New_Guinea | 2026-09-23 | Five-year term. Last polling was in July 2022, so the row uses 2027-07 (est.). A Pangu-led coalition holds about 102 seats, with United Resources, National Alliance, People's Party and independents. |
| PNG-6 | https://en.wikipedia.org/wiki/Cabinet_of_Papua_New_Guinea | 2026-09-23 | Coalition parties in the cabinet as of the Jan 2024 reshuffle: Pangu, URP, National Alliance, People's Party, SDP and smaller parties. The page is not current for 2026. |

### POL (Poland)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| POL-1 | https://www.gov.pl/web/premier | 2026-09-23 | Official PM page names the current Prime Minister (M), with news dated 2026-09-22. |
| POL-2 | https://en.wikipedia.org/wiki/Donald_Tusk | 2026-09-23 | PM born 1957-04-22 (age 69), current term since 2023-12-13. |
| POL-3 | https://en.wikipedia.org/wiki/Third_Cabinet_of_Donald_Tusk | 2026-09-23 | Cabinet parties: Civic Coalition, Polish People's Party, New Left, Poland 2050 and the Centre group (2026). President (M) in office since 2025. |
| POL-4 | https://notesfrompoland.com/2026/02/18/polish-junior-ruling-party-splits-amid-fallout-from-leadership-election/ | 2026-09-23 | Dated 2026-02-18: about half of Poland 2050's MPs split off as "Centre" and stayed in the ruling coalition. |
| POL-5 | https://en.wikipedia.org/wiki/Next_Polish_parliamentary_election | 2026-09-23 | Sejm election due by 2027-11-11 (deadline month used). |

### PRK (North Korea)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| PRK-1 | https://en.wikipedia.org/wiki/Kim_Jong_Un | 2026-09-23 | Party General Secretary (party leader since April 2012; supreme leader from December 2011) and President of the State Affairs since 2016. Birth year officially 1984, disputed 1982 to 1984: age 42 to 44, 40-49 either way. |
| PRK-2 | https://en.wikipedia.org/wiki/15th_Supreme_People%27s_Assembly | 2026-09-23 | SPA elected 15 March 2026; at its first session on 22 March 2026 the leader was re-elected President of the State Affairs and the Premier was re-elected. The 9th Party Congress was held in February 2026. |
| PRK-3 | https://en.wikipedia.org/wiki/Pak_Thae-song | 2026-09-23 | Premier (male) since 29 December 2024. |

Notes: `one_party_state` (EIU 2025: authoritarian, 1.08). The Workers' Party of Korea leads a front with two nominal allied parties. No women's cabinet figure (WIP-2026: information not available). No selection is scheduled that could replace the leader.

- Merge pass: `women_cabinet_share` filled as 2.9 from MRG-PRK (1 woman among 35 ministry and state-commission heads). An estimate, since WIP-2026 lists North Korea as information not available.

### PRT (Portugal)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| PRT-1 | https://www.presidencia.pt/presidente-da-republica/o-presidente/biografia/ | 2026-09-23 | Presidency: biography of the current President (M), updated 2026-03-09 (inauguration day). |
| PRT-2 | https://www.portugal.gov.pt/pt/gc25 | 2026-09-23 | Official site of the XXV Constitutional Government, which is in office and led by the Primeiro-Ministro. |
| PRT-3 | https://en.wikipedia.org/wiki/XXV_Constitutional_Government_of_Portugal | 2026-09-23 | PSD and CDS-PP government, formed 2025-06-05. |
| PRT-4 | https://en.wikipedia.org/wiki/Next_Portuguese_legislative_election | 2026-09-23 | Legislative election due on or before 2029-10-14 (deadline month used). |
| PRT-5 | https://en.wikipedia.org/wiki/Lu%C3%ADs_Montenegro | 2026-09-23 | PM (M) born 1973-02-16 (age 53), first took office 2024-04-02. |

### PRY (Paraguay)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| PRY-1 | https://en.wikipedia.org/wiki/Santiago_Pe%C3%B1a (wikitext) | 2026-09-23 | President since 15 August 2023, born November 1978 (age 47), Colorado Party. |

Notes: EIU 2025 moved Paraguay from hybrid regime to flawed democracy (6.04; DWB-2025). The presidency site (presidencia.gov.py) refused the connection. The next election is April 2028.

### PSE (Palestine)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| PSE-1 | https://en.wikipedia.org/wiki/Next_Palestinian_presidential_election | 2026-09-23 | The President has been in office since 2005 (born 1935, age 90) and is incumbent. A Vice President was appointed in April 2025. A presidential vote is expected in 2027, and an elections decree-law was amended 14 June 2026. |
| PSE-2 | https://www.newarab.com/news/scepticism-after-palestinian-president-sets-elections-28-nov | 2026-09-23 | Dated news (2026-07-10): a decree set legislative elections for 28 November 2026 and **deferred setting a presidential date**, which is expected in Q1 2027. |
| PSE-3 | https://pmo.pna.ps/en/Article/5311/ministers | 2026-09-23 | Primary source, the Prime Minister's Office. The PM (M) also holds foreign affairs. The minister list shows 4 women. |

The row describes the Palestinian Authority. Gaza is administered under separate post-war arrangements. `next_leader_selection` is "none scheduled" because the 28 November 2026 legislative vote does not choose the President and no presidential date has been set (expected Q1 2027). `women_cabinet_share` is blank because neither WIP edition ranks Palestine; PSE-3 lists 4 women ministers. EIU: authoritarian (3.44).

- Merge pass: `women_cabinet_share` filled as 20.0 from MRG-PSE (4 women among the 20 ministers who head the 22 ministries of the 19th government; PSE-3 shows the same four women).

### QAT (Qatar)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| QAT-1 | https://en.wikipedia.org/wiki/Emir_of_Qatar | 2026-09-23 | The Emir (born 3 June 1980, age 46) has reigned since 25 June 2013. |
| QAT-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Qatar | 2026-09-23 | The PM (M) has been in office since 7 March 2023, with no change since. |

EIU: authoritarian (3.17), overridden to absolute_monarchy. There are no parties. Next selection: none scheduled.

### ROU (Romania)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ROU-1 | https://www.wral.com/news/ap/5e2f4-romanias-president-nominates-a-new-prime-minister-to-break-a-political-deadlock/ | 2026-09-23 | AP, dated 2026-09-17: the President nominated a National Liberal member of the European Parliament (M, 44) as Prime Minister. The previous prime minister (M) has been caretaker since his government was ousted in May 2026. Two earlier nominees failed: one was rejected by parliament and one withdrew. The next general election is due in 2028. |
| ROU-2 | https://www.rri.ro/en/news-and-current-affairs/newsflash/september-20-2026-update-id1061512.html | 2026-09-23 | Dated news (updated 2026-09-22): the National Liberals, Save Romania Union and the Hungarian alliance back the designate but lack the 233 votes needed. Negotiations are deadlocked. |
| ROU-3 | https://en.wikipedia.org/wiki/Nicu%C8%99or_Dan (raw) | 2026-09-23 | President since 26 May 2025, born 1969 (age 56). |

The semi-presidential President holds defense and foreign policy and represents Romania in the European Council, so the row records `head_of_state`. The prime minister seat is male whether the caretaker or the designate holds it. `governing_parties` lists the three parties in the caretaker cabinet; the Social Democrats left the coalition in April 2026. The next presidential election is estimated at May 2030 from the five-year term. EIU: flawed democracy (6.11).

### RUS (Russia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| RUS-1 | http://en.kremlin.ru/events/president/news (curl) | 2026-09-23 | Primary source. Presidential events are dated 22 and 23 September 2026. |
| RUS-2 | http://government.ru/en/ (curl) | 2026-09-23 | Primary source. The Prime Minister (M) held government meetings on 9, 15, 17 and 21 September 2026. |
| RUS-3 | https://en.wikipedia.org/wiki/2026_Russian_legislative_election (raw) | 2026-09-23 | The State Duma election ran 18 to 20 September 2026. Preliminary figures (97.64% reporting) give United Russia about 58% and 347 of 450 seats. |
| RUS-4 | https://en.wikipedia.org/wiki/Vladimir_Putin (raw) | 2026-09-23 | In the presidency continuously since 7 May 2012 (acting from 31 December 1999, then president 2000 to 2008, then prime minister 2008 to 2012). Born 1952, so age 73 on as_of. |
| RUS-5 | http://en.kremlin.ru/search?query=State+Duma+elections (curl) | 2026-09-23 | Primary source. The President voted in the Duma election on 18 September 2026 and gave a pre-election address on 16 September. |

`leader_in_office_since` is 2012, the start of the current continuous presidency. The same person has been the paramount leader since 2000. EIU: authoritarian (2.03). The next presidential election is March 2030, six years after the March 2024 vote.

### RWA (Rwanda)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| RWA-1 | https://en.wikipedia.org/wiki/Paul_Kagame | 2026-09-23 | The President has been in office since April 2000 and leads the RPF. Born October 1957, so 68 on the as-of date. Terms are five years under the 2015 amendment. |
| RWA-2 | https://en.wikipedia.org/wiki/2024_Rwandan_general_election | 2026-09-23 | The President was re-elected on 15 July 2024 with 99.18% and inaugurated on 11 August 2024. The RPF governs with allied parties. |
| RWA-3 | https://www.primature.gov.rw/news-detail/pm-nsengiyumva-officially-sworn-in-as-prime-minister | 2026-09-23 | Primary source (Office of the Prime Minister): a new Prime Minister (male), appointed by the President, was sworn in on 25 July 2025. |

The constitution requires power-sharing, so ministers from allied parties sit in cabinet. The RPF is the governing party. Next selection: 2029-07, derived from the July 2024 election and the five-year term.

### SAU (Saudi Arabia)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SAU-1 | https://en.wikipedia.org/wiki/King_of_Saudi_Arabia | 2026-09-23 | The King is incumbent (reigning since 2015, age 90) and holds "absolute power". The Crown Prince (born 1985, age 41) is also Prime Minister. |
| SAU-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Saudi_Arabia | 2026-09-23 | The Crown Prince became Prime Minister by royal decree on 27 September 2022, which made him head of government while the King stays head of state. |
| SAU-3 | https://en.wikipedia.org/wiki/Salman_of_Saudi_Arabia | 2026-09-23 | The King is still reigning. The page calls the Crown Prince "de facto ruler" because of the King's poor health. |

The leader seat is **head_of_government**, on the brief's rule: the Crown Prince and Prime Minister is the effective ruler (SAU-3), so the row describes him. The King goes in `second_seat`. Political parties are banned. EIU: authoritarian, overridden to absolute_monarchy. Next selection: none scheduled, since succession is dynastic.

### SDN (Sudan)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SDN-1 | https://en.wikipedia.org/wiki/Abdel_Fattah_al-Burhan | 2026-09-23 | The chair of the Transitional Sovereignty Council was born 11 July 1960 (age 66) and is incumbent. |
| SDN-2 | https://en.wikipedia.org/wiki/Transitional_Sovereignty_Council | 2026-09-23 | He has chaired the council since 21 August 2019. After the October 2021 coup the council "effectively changed" into a military junta. |
| SDN-3 | https://en.wikipedia.org/wiki/Kamil_Idris | 2026-09-23 | The PM (M) has served since 31 May 2025 and is incumbent in 2026. |
| SDN-4 | https://en.wikipedia.org/wiki/Government_of_Peace_and_Unity | 2026-09-23 | The RSF's rival Government of Peace and Unity (announced April 2025, based in Nyala) has its own presidential council and PM and controls most of Darfur. No state recognizes it. |
| SDN-5 | https://www.timeslive.co.za/news/africa/2026-09-23-us-ties-sudanese-army-leader-burhans-un-visa-to-ceasefire-plan-sources/ | 2026-09-23 | Dated news (2026-09-23): the army chief is still the de facto leader since 2019. The US is withholding his UNGA visa over a 90-day ceasefire plan. |

Sudan is in the uncertain list: authority is contested by the RSF parallel government. EIU: authoritarian (1.46), overridden to military_junta. Next selection: none scheduled.

### SEN (Senegal)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SEN-1 | https://www.financialafrik.com/en/2026/05/27/senegal-ahmadou-al-aminou-lo-appointed-prime-minister-in-succession-of-ousmane-sonko/ | 2026-09-23 | Dated news (2026-05-27): the President dismissed the Prime Minister on 22 May 2026 and appointed an economist (a man) on 25 May 2026. |
| SEN-2 | https://www.semafor.com/article/06/02/2026/senegal-forms-new-government-after-pm-sacked | 2026-09-23 | Dated news (2026-06-02): a 30-member government was formed. PASTEF, the majority party in the National Assembly, said it would not take part, though at least three PASTEF members were appointed. |
| SEN-3 | https://www.financialafrik.com/en/2026/06/01/senegal-a-government-of-30-ministers-without-the-pastef-list/ | 2026-09-23 | Dated news (2026-06-01): PASTEF declined to join, and the list of 30 includes 4 women. |
| SEN-4 | https://en.wikipedia.org/w/index.php?title=Bassirou_Diomaye_Faye&action=raw | 2026-09-23 | President since 2 April 2024, independent since 2026 (formerly PASTEF). Born March 1980, so 46 on the as-of date. The ousted Prime Minister was elected speaker of the National Assembly (cites Reuters, 2026-05-26). |
| SEN-5 | https://en.wikipedia.org/w/index.php?title=Ahmadou_Al_Aminou_Lo&action=raw | 2026-09-23 | The new Prime Minister is an independent. |
| SEN-6 | https://en.wikipedia.org/w/index.php?title=2024_Senegalese_presidential_election&action=raw | 2026-09-23 | Election on 24 March 2024. The next presidential election is labeled 2029. |

`governing_parties` is `none (nonpartisan)` because both executive offices are held by independents and the parliamentary majority party formally stayed out of the government. That is a judgment: PASTEF members sit in the cabinet in a personal capacity, and PASTEF controls the legislature. Next selection: 2029-03, derived.

### SGP (Singapore)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| SGP-1 | https://en.wikipedia.org/wiki/Lawrence_Wong | 2026-09-23 | Prime Minister since 15 May 2024, born December 1972 (age 53). |
| SGP-2 | https://en.wikipedia.org/wiki/Tharman_Shanmugaratnam | 2026-09-23 | President (male) since September 2023. |
| SGP-3 | https://www.istana.gov.sg/ | 2026-09-23 | Official site names the same President as the 9th President. |
| SGP-4 | https://www.pmo.gov.sg/newsroom/pm-lawrence-wong-at-the-joint-press-conference-with-prime-minister-of-timor-leste-xanana-gusmao-july-2026/ | 2026-09-23 | PMO release dated July 2026 confirms the same Prime Minister in office. |
| SGP-5 | https://en.wikipedia.org/wiki/Next_Singaporean_general_election | 2026-09-23 | Next general election due by 5 December 2030 (coded 2030-12, a deadline). |

Notes: flawed democracy (EIU 2025: 6.18). The People's Action Party governs alone.

### SLB (Solomon Islands)

Region file: `regions/oceania.sources.md` (Oceania).

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

### SLE (Sierra Leone)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SLE-1 | https://statehouse.gov.sl/ (official State House) | 2026-09-23 | The President is in office, with news dated 2026-09-23. |
| SLE-2 | https://en.wikipedia.org/w/index.php?title=Julius_Maada_Bio&action=raw | 2026-09-23 | In office since 4 April 2018, Sierra Leone People's Party. Born May 1964, so 62 on the as-of date. |
| SLE-3 | https://en.wikipedia.org/w/index.php?title=2023_Sierra_Leonean_general_election&action=raw | 2026-09-23 | The last general election was on 24 June 2023. |

Second seat: `same`. The Chief Minister is a presidential appointee, not the head of government. Next selection: 2028-06, derived from the June 2023 election plus the five-year term. The incumbent is term-limited.

### SLV (El Salvador)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| SLV-1 | https://en.wikipedia.org/wiki/Nayib_Bukele (wikitext) | 2026-09-23 | President since 1 June 2019 (second consecutive term from 2024), born July 1981 (age 45), Nuevas Ideas. |
| SLV-2 | https://ticotimes.net/2026/07/13/bukele-wins-nuevas-ideas-nomination-third-term-el-salvador | 2026-09-23 | Dated 13 July 2026: general elections on 28 February 2027 under the 2025 reform (indefinite re-election, six-year term, no runoff). The incumbent was nominated for a third term. |

### SMR (San Marino)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

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

### SOM (Somalia)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SOM-1 | https://en.wikipedia.org/wiki/Hassan_Sheikh_Mohamud | 2026-09-23 | The President is incumbent, born November 1955 (70). The page records the dispute over whether his mandate ended on 15 May 2026. The Prime Minister (male) has been in office since June 2022. |
| SOM-2 | https://somaliatoday.com/politics/somalias-president-defies-opposition-claims-2027-mandate-2026-05-16/ | 2026-09-23 | Dated news (2026-05-16): the President says the mandates of parliament and government run to 15 May 2027 under the constitutional amendments. The opposition says his four-year term expired on 15 May 2026. No polling date was set. |
| SOM-3 | https://www.somaliguardian.com/news/somalia-news/somalia-president-forms-coalition-bloc-eyes-third-term-amid-vote-row/ | 2026-09-23 | Dated news (2025-05-14): the President formed the Justice and Solidarity Party, and the Prime Minister became one of its deputy leaders. |
| SOM-4 | https://citizen.digital/article/ahmedfiqi-hits-the-ground-as-somalias-2027-presidential-polls-take-shape-n390212 | 2026-09-23 | Dated news (2026-09-15): the 2027 presidential vote is being prepared, but its framework (direct vote or not) is still being negotiated. |

The seat is contested. The government holds it in practice, and it remains the seat a foreign president deals with. Next selection is 2027-05, the end of the mandate the government claims. No electoral body has fixed a polling date, so treat that month as soft. The regime type comes from FH-2026, since the EIU does not rate Somalia.

### SRB (Serbia)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SRB-1 | https://balkaninsight.com/2026/09/09/serbias-vucic-calls-early-parliamentary-elections-for-october-25/bi/ | 2026-09-23 | Dated news (2026-09-09): the President dissolved parliament and called a snap election for 25 October 2026 at the government's proposal. The Serbian Progressive Party governs with the Socialist Party of Serbia. The President is expected to run for prime minister. |
| SRB-2 | https://wtop.com/national/2026/09/serbia-will-hold-early-parliamentary-election-in-october-testing-vucics-hold-on-power | 2026-09-23 | AP, dated 2026-09-09: the President is term-limited and plans to run for prime minister. He will resign in the coming weeks, and a separate early presidential election will follow. |
| SRB-3 | https://srpske.rs/en/news/politika/2026/09/15/vucic-new-resignation-date-september-27 | 2026-09-23 | Dated news (2026-09-15): the President said he will submit his resignation on 27 September 2026. The Speaker (F) will then act as president for up to three months, and a presidential election must be held within that window. |
| SRB-4 | https://en.wikipedia.org/wiki/Cabinet_of_%C4%90uro_Macut (raw) | 2026-09-23 | The cabinet is drawn from SNS, SPS, PUPS, SDPS, Serbian Party Oathkeepers, the Serbian People's Party and the Justice and Reconciliation Party. |
| SRB-5 | https://en.wikipedia.org/wiki/Aleksandar_Vu%C4%8Di%C4%87 (raw) | 2026-09-23 | President since 31 May 2017 with no term end recorded, so he is still in office on as_of. Born 1970 (age 56). The page records the June 2026 announcement that he would resign. |
| SRB-6 | https://europeanwesternbalkans.com/2026/08/21/vucic-snap-parliamentary-election-to-be-held-either-on-18-or-25-october-2026/ | 2026-09-23 | Dated news (2026-08-21): the earlier announcement that the snap election would fall on 18 or 25 October. Coalition partners such as the Socialists may run on separate lists. |

**This row goes stale in four days.** On 2026-09-23 the incumbent President is still in office and still runs Serbia, so the row records `head_of_state`. His planned resignation on 27 September hands the presidency to the Speaker (F) as acting president. If his list wins on 25 October and he becomes Prime Minister, the leader seat moves to `head_of_government`. `next_leader_selection` is therefore 2026-10, with an early presidential election due by about the end of 2026. EIU: flawed democracy (6.30).

### SSD (South Sudan)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SSD-1 | https://en.wikipedia.org/wiki/Salva_Kiir_Mayardit | 2026-09-23 | The President has been in office since independence on 9 July 2011 and leads the SPLM. Born September 1951, so 75. |
| SSD-2 | https://www.cnbcafrica.com/2026/south-sudans-president-signs-election-law-changes-ahead-of-december-vote | 2026-09-23 | Dated news (2026-09-22): the President signed election-law amendments ahead of the 22 December 2026 vote. The incumbent executive keeps full powers until a successor takes office, and the vice presidents must leave office within three months before election day. |

The President is head of state and government. The governing arrangement is the SPLM-led transitional unity government. The first vice president, from the main opposition, is detained and on trial (FH-2026 records his suspension). The regime type comes from FH-2026. Next selection: 2026-12.

### STP (São Tomé and Príncipe)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

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

### SUR (Suriname)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| SUR-1 | https://en.wikipedia.org/wiki/Jennifer_Geerlings-Simons (wikitext) | 2026-09-23 | President since 16 July 2025, female, born September 1953 (age 73), National Democratic Party. |
| SUR-2 | https://en.wikipedia.org/wiki/2025_Surinamese_general_election (wikitext) | 2026-09-23 | Election on 25 May 2025. On 27 May the NDP agreed a coalition with ABOP, NPS, Pertjajah Luhur, Alternative 2020 and BEP. |
| SUR-3 | https://en.wikipedia.org/wiki/Geerlings-Simons_cabinet | 2026-09-23 | A six-party coalition with 34 of 51 seats (a two-thirds majority). No partner is recorded as having left. |

Notes: the President is head of state and government (the Vice President chairs the Council of Ministers). The elite spans Creole, Hindustani, Javanese and Dutch-origin names; the repo's `dutch` key fits the hyphenated married-name convention the table records. The next election is May 2030.

### SVK (Slovakia)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| SVK-1 | https://www.vlada.gov.sk/ | 2026-09-23 | Official site: news dated 2026-09-10 and 2026-09-15 names the sitting Predseda vlády (M). |
| SVK-2 | https://en.wikipedia.org/wiki/Robert_Fico | 2026-09-23 | PM born 1964-09-15 (age 62). Current term since 2023. |
| SVK-3 | https://en.wikipedia.org/wiki/Fico%27s_Fourth_Cabinet | 2026-09-23 | Coalition of Smer-SD, Hlas-SD and SNS, formed 2023-10-25. Small allied groups sit with SNS. |
| SVK-4 | https://en.wikipedia.org/wiki/Next_Slovak_parliamentary_election | 2026-09-23 | Election due by 2027-09-28 (deadline month used). |

### SVN (Slovenia)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| SVN-1 | https://www.gov.si/en/state-authorities/government/ | 2026-09-23 | Official site names the sitting Prime Minister (M), with an item dated 2026-07-23. |
| SVN-2 | https://en.wikipedia.org/wiki/16th_Government_of_Slovenia | 2026-09-23 | Minority coalition of SDS, NSi, SLS, FOKUS and Demokrati, formed 2026-06-04 with confidence-and-supply support. The coalition agreement was signed 2026-05-21. |
| SVN-3 | https://en.wikipedia.org/wiki/Janez_Jan%C5%A1a | 2026-09-23 | PM born 1958-09-17 (age 68). Current term since 2026 (elected in May, government formed 2026-06-04). |
| SVN-4 | https://en.wikipedia.org/wiki/Next_Slovenian_parliamentary_election | 2026-09-23 | Next election on or before 2030-03-22 (deadline month used). |

Note: the women share (36.8) is the previous government's as of 2026-01-01. The President (F) comes from SHR-4.

### SWE (Sweden)

Region file: `regions/europe-west-north-central.sources.md` (Europe (west, north and central)).

| id | URL | opened | what it established |
|---|---|---|---|
| SWE-1 | https://www.regeringen.se/ | 2026-09-23 | Official notice dated 2026-09-17: the PM asked to be dismissed, and the Speaker dismissed the PM and ministers. They stay on as a caretaker (övergångsregering) until a successor takes office. |
| SWE-2 | https://www.riksdagen.se/sv/aktuellt/aktuelltnotiser/2026/sep/18/talmannen-ger-sonderingsuppdrag-till-magdalena_cmse396c91a-ef46-4f54-88c6-10a144af63fcsv/ | 2026-09-23 | Riksdag notice of 2026-09-18: the Speaker gave the Social Democratic leader (F) the mandate to explore forming a government. |
| SWE-3 | https://www.aljazeera.com/news/2026/9/17/sweden-prime-minister-to-resign-as-left-wing-bloc-seals-narrow-election-win | 2026-09-23 | Dated 2026-09-17: the opposition bloc won 176 of 349 seats. The Riksdag can vote on a new PM from 2026-09-29 at the earliest. |
| SWE-4 | https://en.wikipedia.org/wiki/2026_Swedish_general_election | 2026-09-23 | Election held 2026-09-13; seat counts by party. The new PM is still to be decided. |
| SWE-5 | https://en.wikipedia.org/wiki/Ulf_Kristersson | 2026-09-23 | Caretaker PM born 1963-12-29 (age 62), in office since 2022-10-18 and caretaker since 2026-09-17. |

Contested row: it describes the caretaker incumbent. A new PM (F, born 1967, so 50-59) from a Social Democrat-led government of S, V, MP and C is likely after the Riksdag vote. That's why next_leader_selection is 2026-09. The women share (52.2) is the outgoing cabinet's.

### SWZ (Eswatini)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SWZ-1 | https://en.wikipedia.org/wiki/Mswati_III | 2026-09-23 | The King has reigned since 25 April 1986, marked his 40th anniversary in April 2026 and took the SADC Organ chair in August 2026. Born April 1968, so 58. |
| SWZ-2 | https://en.wikipedia.org/wiki/Prime_Minister_of_Eswatini | 2026-09-23 | The Prime Minister (male), appointed by the King, has served since 4 November 2023. |

Parties cannot contest elections under the tinkhundla system, so `governing_parties` is `none (nonpartisan)`. Next selection: none scheduled.

### SYC (Seychelles)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SYC-1 | https://www.statehouse.gov.sc/news/6600/dr-patrick-herminie-sworn-in-as-sixth-president-of-the-republic-of-seychelles | 2026-09-23 | Primary source (State House): the sixth President was sworn in on the evening of Sunday 26 October 2025, and the outgoing president attended. |
| SYC-2 | https://en.wikipedia.org/wiki/Patrick_Herminie | 2026-09-23 | The President has been in office since 26 October 2025. United Seychelles. Born September 1963, so 63. |
| SYC-4 | https://en.wikipedia.org/wiki/2025_Seychellois_general_election | 2026-09-23 | The runoff on 9 to 11 October 2025 went 52.73% to 47.27%. United Seychelles won 19 of 34 Assembly seats. |

The regime type comes from FH-2026, since the EIU does not rate Seychelles. Next selection: 2030-10, the end of the five-year term.

- Merge pass: `SYC-3` was removed from `source_ids`. The row cited it, but the regional sources file never defined it; SYC-1, SYC-2 and SYC-4 carry every claim in the row.

### SYR (Syria)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| SYR-1 | https://en.wikipedia.org/wiki/Presidency_of_Ahmed_al-Sharaa | 2026-09-23 | The transitional President has served since 29 January 2025. The prime minister post was abolished on 29 March 2025. The Constitutional Declaration sets a five-year transition. Indirect People's Assembly elections were held October 2025. One woman minister is named. |
| SYR-2 | https://en.wikipedia.org/wiki/Ahmed_al-Sharaa | 2026-09-23 | Born 29 October 1982 (age 43), independent since 2025, incumbent. The vice president post is vacant. |

`second_seat` is "none" because there is no prime minister. No party law is in force, so parties play no role in government ("none (nonpartisan)"). Next selection is 2030-03, the end of the five-year transitional period that began with the Constitutional Declaration in March 2025. Elections are expected then, but none is scheduled. `women_cabinet_share` is 4.3 (1/23; WIP-2026 marks it compiled from public information). EIU: authoritarian (1.37).

### TCD (Chad)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TCD-1 | https://en.wikipedia.org/w/index.php?title=Mahamat_D%C3%A9by&action=raw | 2026-09-23 | De facto head of state from April 2021 as president of the Transitional Military Council, transitional president from October 2022, elected president and sworn in 23 May 2024. Patriotic Salvation Movement. Born April 1984, so 42 on the as-of date. |
| TCD-2 | https://www.africanews.com/2025/10/04/chad-scraps-presidential-term-limits-cementing-debys-rule/ | 2026-09-23 | Dated news (2025-10-04): the amendment replaces the five-year term renewable once with a seven-year term with no limit. "The new rules take effect at the next presidential election," though opponents say it gives the incumbent two extra years. |
| TCD-3 | https://en.wikipedia.org/w/index.php?title=Allamaye_Halina&action=raw | 2026-09-23 | The Prime Minister (a man) has served since 23 May 2024. HEADS still lists him. |
| TCD-4 | https://en.wikipedia.org/w/index.php?title=2025_in_Chad&action=raw | 2026-09-23 | The National Assembly passed the term-limit amendment on 3 October 2025. |
| TCD-5 | https://en.wikipedia.org/w/index.php?title=2024_Chadian_presidential_election&action=raw | 2026-09-23 | The 6 May 2024 election was for a five-year term. |

Next selection: 2029-05, derived from the May 2024 election plus the five-year term the incumbent was elected to. This is contested. If the 2025 amendment is read as extending the current mandate to seven years, the date becomes 2031-05. The name culture is the repo's `arabic` mapping. It fits the northern Muslim elites who dominate the presidency and security services, though many southern ministers carry non-Arabic names.

### TGO (Togo)

Region file: `regions/africa-west-central.sources.md` (West and central Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TGO-1 | https://www.aljazeera.com/news/2025/7/4/togo-protests-signal-youth-anger-at-dynastic-rule-but-is-change-possible | 2026-09-23 | Dated news (2025-07-04): under the Fifth Republic constitution, the long-serving leader became President of the Council of Ministers, a post with no term limits. Direct presidential elections were abolished, and he has ruled since 2005. |
| TGO-2 | https://en.wikipedia.org/w/index.php?title=Faure_Gnassingb%C3%A9&action=raw | 2026-09-23 | President of the Council of Ministers since 3 May 2025 and president 2005-2025, Union for the Republic. Born June 1966, so 60 on the as-of date. The 2024 amendments moved most presidential powers to this office. |
| TGO-3 | https://en.wikipedia.org/w/index.php?title=2024_Togolese_parliamentary_election&action=raw | 2026-09-23 | Legislative election on 29 April 2024, in which the Union for the Republic won 108 seats. The next is labeled 2030. |

The President of the Republic, elected by parliament, is a man (HEADS). Next selection: 2030-04, derived. The next legislative election decides the majority that designates the President of the Council.

### THA (Thailand)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| THA-1 | https://en.wikipedia.org/wiki/Anutin_Charnvirakul | 2026-09-23 | Prime Minister since 7 September 2025, born 13 September 1966 (age 60). |
| THA-2 | https://en.wikipedia.org/wiki/2026_Thai_general_election | 2026-09-23 | Election held 8 February 2026; Bhumjaithai came first. The House re-elected the Prime Minister on 19 March 2026 with 293 votes, and the second cabinet was sworn in on 30 March 2026. The coalition is Bhumjaithai, Pheu Thai, Prachachat, Palang Pracharath and small parties. |
| THA-3 | https://en.wikipedia.org/wiki/Vajiralongkorn | 2026-09-23 | King (male), head of state. |

Notes: flawed democracy (EIU 2025: 6.59). The House term is four years from February 2026, so the next election is due around early 2030 (2030-03, an estimate). The women's share of 21.1% predates the March 2026 cabinet.

### TJK (Tajikistan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| TJK-1 | https://en.wikipedia.org/wiki/Emomali_Rahmon | 2026-09-23 | Head of state since November 1992 (President since November 1994), born October 1952 (age 73). Leads the People's Democratic Party. |
| TJK-2 | https://en.wikipedia.org/wiki/Qohir_Rasulzoda | 2026-09-23 | Prime Minister (male) since November 2013; no end date recorded. |
| TJK-3 | https://en.wikipedia.org/wiki/2027_Tajik_presidential_election | 2026-09-23 | Next presidential election by October 2027. |

Notes: authoritarian (EIU 2025: 1.94). `leader_in_office_since` is 1992, when he became head of state as chairman of the Supreme Council. The Prime Minister is confirmed only by Wikipedia; the official news agency site did not render.

### TKM (Turkmenistan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| TKM-1 | https://en.wikipedia.org/wiki/Serdar_Berdimuhamedow | 2026-09-23 | President since 19 March 2022, born 22 September 1981 (45 as of yesterday). |
| TKM-2 | https://en.wikipedia.org/wiki/Gurbanguly_Berdimuhamedow | 2026-09-23 | The previous President, the incumbent's father, has chaired the People's Council (Halk Maslahaty) since 2021, now the supreme representative body. |
| TKM-3 | https://en.wikipedia.org/wiki/President_of_Turkmenistan | 2026-09-23 | The President is head of state and head of government, on a seven-year term. |
| TKM-4 | https://tdh.gov.tm/en | 2026-09-23 | State news agency shows the same President holding a working meeting in September 2026. |

Notes: authoritarian (EIU 2025: 1.54). The second seat is `same` because the President chairs the Cabinet. Power is widely described as shared with the father as People's Council chairman, so the seat is flagged as uncertain. Next presidential election is seven years after March 2022 (2029-03, an estimate).

- Merge pass: `second_seat_sex` changed from `M` to `same`, because `second_seat_title` is `same` and every other region codes a single-seat executive `same`/`same`.

### TLS (Timor-Leste)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| TLS-1 | https://en.wikipedia.org/wiki/Xanana_Gusm%C3%A3o | 2026-09-23 | Prime Minister since 1 July 2023 (an earlier term ran 2007 to 2015), born June 1946 (age 80). |
| TLS-2 | https://en.wikipedia.org/wiki/Jos%C3%A9_Ramos-Horta | 2026-09-23 | President (male) since 20 May 2022. |
| TLS-3 | https://www.pmo.gov.sg/newsroom/pm-lawrence-wong-at-the-joint-press-conference-with-prime-minister-of-timor-leste-xanana-gusmao-july-2026/ | 2026-09-23 | Singapore PMO record dated July 2026 names the same Prime Minister of Timor-Leste. |
| TLS-4 | https://en.wikipedia.org/wiki/IX_Constitutional_Government_of_Timor-Leste | 2026-09-23 | Governing parties: CNRT and the Democratic Party (PD), with a majority. |
| TLS-5 | https://en.wikipedia.org/wiki/2028_East_Timorese_parliamentary_election | 2026-09-23 | Next parliamentary election by May 2028. |

Notes: flawed democracy (EIU 2025: 6.97). Executive power sits with the Prime Minister, so the seat is `head_of_government`. The 2027 presidential election does not choose the Prime Minister.

### TON (Tonga)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| TON-1 | https://en.wikipedia.org/wiki/2025_Tongan_general_election | 2026-09-23 | General election on 20 Nov 2025. The Assembly elected a noble PM 16-10 on 15 Dec 2025. The new cabinet includes the sole woman MP. |
| TON-2 | https://en.wikipedia.org/wiki/Fatafehi_Fakaf%C4%81nua | 2026-09-23 | PM since 18 Dec 2025, a hereditary noble related to the royal family by marriage. Born Mar 1985 (age 41, band 40-49). The cabinet was completed on 5 Jan 2026. |
| TON-3 | https://freedomhouse.org/country/tonga/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 79/100. The King holds veto, dissolution and judicial appointment powers. The crown prince was made foreign and defense minister, and the King's influence over government increased in 2025. This is the basis for `constitutional_monarchy_executive`. |
| TON-4 | https://en.wikipedia.org/wiki/Tupou_VI | 2026-09-23 | The King (male) has reigned since 18 Mar 2012 and is still on the throne. |
| TON-5 | https://en.wikipedia.org/wiki/Politics_of_Tonga | 2026-09-23 | The King appoints the cabinet, including the PM, and all judges. The Assembly has 9 nobles' and 17 people's representatives. There is no party system, which gives `none (nonpartisan)`. |
| TON-6 | https://en.wikipedia.org/wiki/Prime_Minister_of_Tonga | 2026-09-23 | Incumbent since 18 Dec 2025. This page wrongly calls him a commoner, and TON-1 and TON-2 correct it. The four-year cycle (2021, 2025) gives 2029-11 (est.). |

### TTO (Trinidad and Tobago)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| TTO-1 | https://en.wikipedia.org/wiki/Kamla_Persad-Bissessar (wikitext) | 2026-09-23 | Prime Minister since 1 May 2025 (a second tenure after 2010 to 2015), born April 1952 (age 74), United National Congress. |
| TTO-2 | https://en.wikipedia.org/wiki/Second_Persad-Bissessar_administration | 2026-09-23 | Government of the "United National Congress/Coalition of Interests". |
| TTO-3 | https://en.wikipedia.org/wiki/2025_Trinidad_and_Tobago_general_election (wikitext) | 2026-09-23 | Election on 28 April 2025: the UNC won 26 seats and a majority. |
| TTO-4 | https://en.wikipedia.org/wiki/Christine_Kangaloo (wikitext) | 2026-09-23 | The President (ceremonial head of state, female) has been in office since 20 March 2023. |

Notes: `leader_in_office_since` is 2025, the current tenure. The repo's `anglo` key covers given names, but Indo-Trinidadian surnames are prominent in the UNC government. The next election is 2030-04 on the five-year convention.

### TUN (Tunisia)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TUN-1 | https://en.wikipedia.org/wiki/Kais_Saied | 2026-09-23 | The President (born 22 February 1958, age 68) has served since 23 October 2019 and was re-elected 7 October 2024. Five-year term, next election 2029. The current Head of Government is a woman. |
| TUN-2 | https://en.wikipedia.org/wiki/Zaafarani_Cabinet | 2026-09-23 | The Head of Government (F) was appointed 20 or 21 March 2025. The cabinet has 25 members. The page was revised 3 September 2026 and records no 2026 change. |

The President governs by decree and without party backing, so `governing_parties` is "none (nonpartisan)". Next selection is 2029-10. EIU: hybrid regime (4.65).

### TUR (Turkey)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TUR-1 | https://en.wikipedia.org/wiki/Recep_Tayyip_Erdo%C4%9Fan (raw) | 2026-09-23 | President since 28 August 2014, born 1954 (age 72). Justice and Development Party. The page links the 2028 presidential election. |

The official site (https://www.tccb.gov.tr/en/) answered with a redirect that did not resolve to a readable page, so HEADS and TUR-1 carry this row. The office of prime minister was abolished in 2018, so the President holds both seats and the second seat is "same". `governing_parties` pairs the AKP with its People's Alliance partner, the Nationalist Movement Party, which backs it in parliament but holds no cabinet posts. That partnership is general knowledge, not something a source opened this session confirmed. The next presidential election is estimated at May 2028, five years after May 2023. EIU: hybrid regime (4.26).

### TUV (Tuvalu)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| TUV-1 | https://en.wikipedia.org/wiki/Feleti_Teo | 2026-09-23 | PM since 26 Feb 2024 (elected unopposed) and incumbent at the page's July 2026 revision. Born Oct 1962 (age 63, band 60-69). |
| TUV-2 | https://en.wikipedia.org/wiki/Governor-General_of_Tuvalu | 2026-09-23 | Governor-General (male) in office since 28 Sept 2021. |
| TUV-3 | https://en.wikipedia.org/wiki/Parliament_of_Tuvalu | 2026-09-23 | Four-year term. Last election 26 Jan 2024, next due 2028 (row uses 2028-01, est.). There are no formal parties. |
| TUV-4 | https://freedomhouse.org/country/tuvalu/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 93/100, which gives `full_democracy`. |

### TWN (Taiwan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| TWN-1 | https://en.wikipedia.org/wiki/Lai_Ching-te | 2026-09-23 | President since 20 May 2024, born October 1959 (age 66). |
| TWN-2 | https://en.wikipedia.org/wiki/Cho_Jung-tai | 2026-09-23 | Premier (President of the Executive Yuan, male) since 20 May 2024. |
| TWN-3 | https://english.president.gov.tw/ | 2026-09-23 | Presidential office site shows the same President at a 2026 forum. |
| TWN-4 | https://en.wikipedia.org/wiki/2028_Taiwanese_presidential_election | 2026-09-23 | Next presidential election in 2028, inauguration on 20 May 2028. The date is TBD; 2028-01 is an estimate from the January cycle. |

Notes: full democracy (EIU 2025: 8.78). The Democratic Progressive Party holds the executive. Taiwan is not in the UN Women map, so the women's share is blank.

- Merge pass: `women_cabinet_share` filled as 13.3 from MRG-TWN (2 women among the 15 ministers who head Executive Yuan ministries). Taiwan is not in the UN Women/IPU map.

### TZA (Tanzania)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| TZA-1 | https://en.wikipedia.org/wiki/Samia_Suluhu_Hassan | 2026-09-23 | The President (female) has been in office since 19 March 2021. She was declared winner of the disputed October 2025 election with 97.66% and inaugurated on 3 November 2025. Born January 1960, so 66. Party CCM. Next election in 2030. |
| TZA-2 | https://en.wikipedia.org/wiki/Mwigulu_Nchemba | 2026-09-23 | A new Prime Minister (male) took office on 13 November 2025. |
| TZA-3 | https://thechanzo.com/2025/11/13/dr-mwigulu-nchemba-appointed-new-prime-minister-of-tanzania/ | 2026-09-23 | Dated news (2025-11-13, Dodoma): parliament confirmed the appointment 369 votes to 371. |

The President is head of government under the constitution, so the second seat is `same`. The Prime Minister is male. Next selection: 2030-10, derived from the October 2025 election and the five-year term.

### UGA (Uganda)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| UGA-1 | https://en.wikipedia.org/wiki/Yoweri_Museveni | 2026-09-23 | The President has been in office since 29 January 1986 and was re-elected in January 2026 (71.65%). He was sworn in on 12 May 2026. Party NRM. Born September 1944, so 82. |
| UGA-2 | https://www.monitor.co.ug/uganda/news/national/museveni-unveils-new-cabinet-retains-nabbanja-alupo-and-janet-in-key-reshuffle-5474810 | 2026-09-23 | Dated news (2026-05-26): the 2026-2031 cabinet was named. The Prime Minister (female) and the Vice President (female) were retained. |

The President is head of state and government, so the second seat is `same`. The Prime Minister is female and leads government business. Next selection: 2031-01, derived from the January 2026 election and the five-year term.

### UKR (Ukraine)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| UKR-1 | https://www.pravda.com.ua/eng/news/2026/07/16/8044351/ | 2026-09-23 | Dated news (2026-07-16): the Rada appointed a new Prime Minister (M) with 289 votes. He is the former head of the state energy company Naftogaz and was nominated by the President. |
| UKR-2 | https://razomua.media/en/news/politika/313-holosiv-20-y-raz-pospil-yak-parlament-prodovzhuye-voyennyy-stan-u-rezhymi-avtopilota-i-chomu-tse-ne-tak-prosto-yak-zdayetsya | 2026-09-23 | Dated news (2026-07-14): the 20th extension of martial law (313 votes) runs from 2 August to 31 October 2026. Elections cannot be held under martial law, so November 2026 is the earliest horizon, and only if martial law is lifted. |
| UKR-3 | https://en.wikipedia.org/wiki/Volodymyr_Zelenskyy (raw) | 2026-09-23 | President since 20 May 2019, born 1978 (age 48). Came to office on the Servant of the People ticket. |

The President holds executive power, so the row describes the President. The new Prime Minister (M) goes in `second_seat` and replaces the woman who served from 2025 to 2026. That change is why WIP-2026 (20.0) describes the earlier cabinet. `governing_parties` is the Rada majority faction. EIU: hybrid regime (4.79). Next selection: none scheduled, because every election is suspended while martial law lasts.

### URY (Uruguay)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| URY-1 | https://en.wikipedia.org/wiki/Yamand%C3%BA_Orsi (wikitext) | 2026-09-23 | President since 1 March 2025, born June 1967 (age 59), Broad Front. |
| URY-2 | https://www.gub.uy/presidencia/ | 2026-09-23 | Presidency site, item dated 23 September 2026, shows the same president. |

Notes: the next election is October 2029.

### UZB (Uzbekistan)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| UZB-1 | https://en.wikipedia.org/wiki/Shavkat_Mirziyoyev | 2026-09-23 | President since December 2016 (acting from September 2016), born July 1957 (age 69). |
| UZB-2 | https://en.wikipedia.org/wiki/Abdulla_Aripov | 2026-09-23 | Prime Minister (male) since December 2016; Liberal Democratic Party. |
| UZB-3 | https://president.uz/en | 2026-09-23 | Presidential site carries items dated 23 September 2026 from the same President. |
| UZB-4 | https://en.wikipedia.org/wiki/2023_Uzbek_presidential_election | 2026-09-23 | Last election 9 July 2023 for a seven-year term, so the next is due around July 2030 (an estimate). |

Notes: authoritarian (EIU 2025: 2.10). The Prime Minister is confirmed only by Wikipedia.

### VCT (Saint Vincent and the Grenadines)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| VCT-1 | https://en.wikipedia.org/wiki/Godwin_Friday (wikitext) | 2026-09-23 | Prime Minister since 28 November 2025, born September 1959 (age 66, turning 67 on 28 September 2026), New Democratic Party. |
| VCT-2 | https://www.stvincenttimes.com/godwin-friday-sworn-in-st-vincent-prime-minister/ | 2026-09-23 | Dated news: sworn in 28 November 2025 after the NDP won 14 of 15 seats, ending the previous government's quarter-century in office. |

Notes: the Governor-General is male (a change since the swearing-in). The 14.3% share reflects the new NDP cabinet, sworn in about a month before the 1 January 2026 reference date. The next election is 2030-11 on the five-year convention.

### VEN (Venezuela)

Region file: `regions/americas.sources.md` (Americas).

| id | URL | opened | what it established |
|---|---|---|---|
| VEN-1 | https://en.wikipedia.org/wiki/Delcy_Rodr%C3%ADguez | 2026-09-23 | Acting president since 5 January 2026, female, born May 1969 (age 57), United Socialist Party of Venezuela. She also holds the vice presidency herself. |
| VEN-2 | https://www.click2houston.com/news/politics/2026/09/18/trump-to-meet-acting-venezuelan-president-delcy-rodriguez-in-new-york-next-week-white-house-says/ | 2026-09-23 | AP, dated 18 September 2026: still acting president, in office since the January 2026 US operation. No election mentioned. |
| VEN-3 | https://www.caracaschronicles.com/2026/08/12/has-the-transition-in-venezuela-formally-begun/ | 2026-09-23 | Dated 12 August 2026: a US-mediated agreement to seat an independent Supreme Court. No presidential election date. |
| VEN-4 | https://en.wikipedia.org/wiki/Next_Venezuelan_presidential_election | 2026-09-23 | As of the September 2026 revision, no election date is set, and the constitutional timetable after the capture is unresolved. |

Notes: **contested seat.** The formal president is detained abroad and still listed as de jure president. Some sources describe US officials as the de facto power (WIKI-HEADS footnote). EIU 2025 (2.13) predates the change. `second_seat` is `same` because the acting president exercises both seats.

### VNM (Vietnam)

Region file: `regions/asia.sources.md` (Asia).

| id | URL | opened | what it established |
|---|---|---|---|
| VNM-1 | https://en.wikipedia.org/wiki/T%C3%B4_L%C3%A2m | 2026-09-23 | General Secretary since August 2024 (acting from July 2024), born July 1957 (age 69). |
| VNM-2 | https://en.wikipedia.org/wiki/Government_of_L%C3%AA_Minh_H%C6%B0ng | 2026-09-23 | Government formed 7 April 2026. Lists the head of state as "General Secretary and State President" and the Communist Party of Vietnam as sole party. |
| VNM-3 | https://gulfnews.com/world/asia/vietnam-parliament-elects-party-chief-to-lam-as-president-1.500498408 | 2026-09-23 | Dated 7 April 2026: the National Assembly unanimously elected the party chief State President for 2026-2031. He had been re-elected General Secretary in January 2026. |
| VNM-4 | https://en.wikipedia.org/wiki/L%C3%AA_Minh_H%C6%B0ng | 2026-09-23 | New Prime Minister (male) since 7 April 2026. |

Notes: `one_party_state` (EIU 2025: authoritarian, 2.62). The women's share of 7.1% predates the April 2026 government. The next selection is the 15th Party Congress, expected around January 2031 (estimate).

### VUT (Vanuatu)

Region file: `regions/oceania.sources.md` (Oceania).

| id | URL | opened | established |
|---|---|---|---|
| VUT-1 | https://en.wikipedia.org/wiki/2025_Vanuatuan_general_election | 2026-09-23 | Snap election on 16 Jan 2025. The coalition agreed on 27 Jan was Leaders Party, Vanua'aku Pati, RMC, Iauko Group and Land and Justice Party. The PM was elected on 11 Feb 2025 with 50 votes. Four-year term, next due 2029 (row uses 2029-01, est.). |
| VUT-2 | https://en.wikipedia.org/wiki/Jotham_Napat | 2026-09-23 | PM since 11 Feb 2025, Leaders Party of Vanuatu. Born Aug 1972 (age 54, band 50-59). |
| VUT-3 | https://en.wikipedia.org/wiki/President_of_Vanuatu | 2026-09-23 | President (male) since 23 July 2022, on a non-renewable five-year term ending July 2027. |
| VUT-4 | https://en.wikipedia.org/wiki/2026_in_Vanuatu | 2026-09-23 | The same PM and President are listed as 2026 incumbents, with no change of government recorded in 2026. |
| VUT-5 | https://en.wikipedia.org/wiki/Nakamal_Agreement | 2026-09-23 | The sitting PM signed the agreement with Australia in Canberra on 29 June 2026. |
| VUT-6 | https://en.wikipedia.org/wiki/Prime_Minister_of_Vanuatu | 2026-09-23 | Incumbent tenure is shown as 1 year 224 days, which is current to late Sept 2026. |
| VUT-7 | https://freedomhouse.org/country/vanuatu/freedom-world/2026 | 2026-09-23 | Freedom House 2026: Free, 82/100, noting unstable coalitions. This gives `flawed_democracy`. |

- Merge pass: in `governing_parties`, the founder-named Iauko Group became "IG (a founder-named party)". The party's name is a real person's surname.

### WSM (Samoa)

Region file: `regions/oceania.sources.md` (Oceania).

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

### XKX (Kosovo)

Region file: `regions/europe-south-east-caucasus.sources.md` (Southeast Europe and the Caucasus).

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

- Merge pass: `women_cabinet_share` filled as 25.0 from MRG-XKX (5 women among the 20 ministers of the cabinet formed 13 September 2026; the Prime Minister holds no portfolio and is not counted). This is the new cabinet, not a 1 January 2026 snapshot.

### YEM (Yemen)

Region file: `regions/mena.sources.md` (Middle East and North Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| YEM-1 | https://en.wikipedia.org/wiki/Presidential_Leadership_Council | 2026-09-23 | The PLC chair has served since 7 April 2022. The STC leader was expelled on 7 January 2026 and a second member removed on 15 January, with two replacements seated the same day. Members' factions are Al-Islah (two vice presidents), National Resistance and Giants Brigades. There are no women members. |
| YEM-2 | https://www.mofa-ye.org/Pages/36202/ | 2026-09-23 | Primary source, the Foreign Ministry. PLC Chairman's Decree No. 17 of 2026 (16 January 2026) appointed the new Prime Minister. |
| YEM-3 | https://en.wikipedia.org/wiki/2026_in_Yemen | 2026-09-23 | The new PM was appointed 15 January 2026 and the cabinet announced 6 February. The STC announced its dissolution on 9 January (disputed). The Houthi Supreme Political Council still governs Sanaa. |
| YEM-4 | https://en.wikipedia.org/wiki/Rashad_al-Alimi | 2026-09-23 | The chair was born 15 January 1954 (age 72) and is incumbent. |
| YEM-5 | https://en.wikipedia.org/wiki/Shaya_al-Zindani | 2026-09-23 | The PM has been in office since 6 February 2026. |

This row covers the internationally recognized government only; the Houthis (Ansar Allah) hold Sanaa and much of the north. `governing_parties` lists the factions seated on the PLC. EIU: authoritarian (1.95). Next selection: none scheduled.

### ZAF (South Africa)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZAF-1 | https://en.wikipedia.org/wiki/Cyril_Ramaphosa | 2026-09-23 | The President has been in office since February 2018 and was re-elected by the National Assembly on 14 June 2024 for a second and final term. Born November 1952, so 73 on the as-of date. |
| ZAF-2 | https://www.cnbcafrica.com/2026/south-africas-president-booked-off-from-public-engagements-over-ill-health | 2026-09-23 | Dated news (2026-09-17): the Presidency booked the President off public engagements on medical advice. He remains in office, no acting president was named, age 73. The Deputy President is also recovering from a procedure. |
| ZAF-3 | https://www.dailymaverick.co.za/article/2026-09-20-ramaphosa-found-his-voice-abroad-but-he-lost-it-at-home/ | 2026-09-23 | Dated news (2026-09-20): the President is still in office, in the "lame-duck" final phase of his tenure, and on sick leave during a row over US visa restrictions. |
| ZAF-4 | https://en.wikipedia.org/wiki/Government_of_National_Unity_(South_Africa) | 2026-09-23 | The ten parties of the Government of National Unity formed in June 2024. The page records no departure. |

The President is head of state and government, so the second seat is `same`. `governing_parties` lists the ten GNU parties. I found no source reporting a party leaving the GNU in 2025 or 2026, but ZAF-4 has no 2026 update, so treat the full list as unconfirmed for 2026. Next selection: 2029-05, derived from the May 2024 election and the five-year National Assembly term. The President is term-limited, and the ANC's leadership conference, due in 2027, will choose its next candidate.

### ZMB (Zambia)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZMB-1 | https://www.aljazeera.com/news/2026/9/1/hakainde-hichilema-returns-as-zambias-president-following-disputed-vote | 2026-09-23 | Dated news (2026-09-01): the President was sworn in for a second term after the disputed 13 August 2026 vote, with about 60%. The Vice President (female) was sworn in with him. |
| ZMB-2 | https://en.wikipedia.org/wiki/Hakainde_Hichilema | 2026-09-23 | The President has been in office since 24 August 2021. UPND. Born June 1962, so 64. |

Next selection: 2031-08, derived from the August 2026 election and the five-year term.

### ZWE (Zimbabwe)

Region file: `regions/africa-east-southern.sources.md` (East and southern Africa).

| id | URL opened | Opened | What it established |
|---|---|---|---|
| ZWE-1 | https://www.aljazeera.com/news/2026/6/24/zimbabwes-senate-approves-amendment-extending-presidential-term | 2026-09-23 | Dated news (2026-06-24): the Senate passed the amendment 75 to 4. Presidential and parliamentary terms go from five to seven years, the president will be elected by parliament, and the incumbent (then 83) stays until 2030. |
| ZWE-2 | https://www.africanews.com/2026/07/07/zimbabwes-mnangagwa-signs-law-extending-presidency-to-2030/ | 2026-09-23 | Dated news (2026-07-07): the President signed the amendment into law. |
| ZWE-3 | https://en.wikipedia.org/wiki/2030_Zimbabwean_parliamentary_election | 2026-09-23 | The next parliamentary election is due "on or before 5 August 2030" under the Constitution Amendment (No. 3) Act, 2026. Parliament sitting jointly then elects the president. |
| ZWE-4 | https://en.wikipedia.org/wiki/Emmerson_Mnangagwa | 2026-09-23 | The President has been in office since 24 November 2017. ZANU-PF. Born 15 September 1942, so 84 on the as-of date. |

Next selection is 2030-08: the parliamentary election, after which parliament elects the president. One source title I saw but did not open (allAfrica, 2026-07-21) reports a ZANU-PF push to extend the presidency again, to 2037. Treat 2030 as the current legal date only.

## Appendix: regional methods and shared-source definitions

Each regional file's method notes and shared-source table, verbatim except for heading levels.

### East and southern Africa (`regions/africa-east-southern.sources.md`)

Verified 2026-09-23 for 24 governments: ZAF, ETH, RWA, BDI, DJI, ERI, KEN, SOM, SSD, TZA, UGA, AGO, BWA, COM, SWZ, LSO, MDG, MWI, MUS, MOZ, NAM, SYC, ZMB, ZWE. Every URL below was opened on 2026-09-23 unless the row says otherwise. No incumbent is named in this file. A URL can carry a name because that is the page's address.

#### Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (rendered page, and the same page's raw wikitext via `action=raw`, parsed row by row) | 2026-09-23 | EIU Democracy Index 2025 categories and scores (first data column is 2025, per the table header). Full democracy: Mauritius 8.23. Flawed democracy: Botswana 7.63, South Africa 7.16, Namibia 6.48, Lesotho 6.23, Malawi 6.10. Hybrid regime: Zambia 5.82, Tanzania 5.13, Madagascar 5.06, Kenya 5.05, Uganda 4.31. Authoritarian: Angola 3.94, Mozambique 3.38, Rwanda 3.34, Ethiopia 3.13, Zimbabwe 2.98, Comoros 2.81, Djibouti 2.70, Eswatini 2.60, Burundi 2.13, Eritrea 1.97. Somalia, South Sudan and Seychelles are not in the index. |
| FH-2026 | https://freedomhouse.org/country/somalia/freedom-world/2026 ; https://freedomhouse.org/country/south-sudan/freedom-world/2026 ; https://freedomhouse.org/country/seychelles/freedom-world/2026 | 2026-09-23 | Freedom in the World 2026, used only for the three ids the EIU does not rate. Somalia Not Free (8/100). South Sudan Not Free (political rights 0/40, civil liberties 4/60). Seychelles Free (81/100). |
| WIP-2026 | https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026 and the PDF it links, https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (text extracted with `pdftotext -raw`) | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map: share of women among cabinet members who head ministries **as at 1 January 2026**. It is the newest edition, so it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from this table. An asterisk in the map (Eritrea, South Sudan, Comoros) means the figure came from publicly available information rather than a Permanent Mission submission. |
| REPO | `packages/world/src/dataset/people.ts` (authored nations' cultures), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` and `name-banks.vendored.ts` (culture keys) | 2026-09-23 | The repo already maps every one of these 24 ids to a bank key. The TSV uses those keys unchanged: ZAF and SWZ `southern-african`; ETH and ERI `east-african`; RWA and BDI `great-lakes`; DJI and SOM `somali`; KEN `kenyan`; SSD `south-sudanese`; TZA `tanzanian`; UGA `ugandan`; AGO and MOZ `lusophone`; BWA and LSO `sotho-tswana`; COM `arabic`; MDG `malagasy`; MWI and ZMB `zambian-malawian`; MUS `south-asian`; NAM `namibian`; SYC `french`; ZWE `zimbabwean`. |

Two caveats apply throughout.

1. The women-cabinet figures are a 1 January 2026 snapshot. They predate cabinets formed since then in Madagascar (March 2026), Djibouti (May 2026), Uganda (June 2026) and Zambia (after the September 2026 inauguration).
2. `surname_rule` is general onomastic knowledge applied to each country's political elite, not a sourced fact. Treat it as inference.

#### How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Presidential systems get `head_of_state`. Ethiopia, Lesotho and Mauritius are parliamentary and get `head_of_government`. Eswatini's King rules and gets `head_of_state`.
- **Second seat.** I wrote `same` wherever the constitution makes the president head of government too, even where an appointed prime minister exists. That applies to Djibouti, Tanzania, Uganda, Mozambique and Namibia. The prime minister in those countries is a subordinate appointee, and I note each one's sex below in case the game wants it. A separate prime-minister seat is recorded only where the prime minister is the constitutional head of government: Rwanda, Burundi, Somalia, Madagascar and Eswatini. For Mozambique I checked the constitution directly (MOZ-3), because Wikipedia's own pages disagree on that point.
- **Regime type.** I used the EIU 2025 category except where the form of government calls for a special type. Eswatini gets `absolute_monarchy` (EIU: authoritarian). Eritrea gets `one_party_state` (EIU: authoritarian), because the PFDJ is the only permitted party and no national election has ever been held. Madagascar gets `military_junta` (EIU 2025: hybrid regime, 5.06), because an army-officer council has governed since the October 2025 takeover. For the three ids the EIU does not rate I used Freedom House 2026: Somalia and South Sudan Not Free, so `authoritarian`, and Seychelles Free (81/100), so `flawed_democracy`. The Seychelles mapping is my own analogy, not an EIU rating.
- **Next leader selection.** This is the next event that could replace the person in the leader seat. Where no electoral body has published a date, I derived the month from the previous election plus the constitutional term, and the nation's note says so.

### West and central Africa (`regions/africa-west-central.sources.md`)

Verified 2026-09-23 for 23 governments: NGA, CMR, CAF, TCD, GNQ, GAB, COG, STP, COD, BEN, BFA, CPV, CIV, GMB, GHA, GIN, GNB, LBR, MLI, NER, SEN, SLE, TGO. Every URL below was opened on 2026-09-23. Wikipedia pages were read as raw wikitext (`action=raw`) unless the row says the rendered page. No incumbent is named in this file. A URL can carry a name because that is the page's address.

Reuters, AP and RFI refused automated fetches in this session. Where a Wikipedia page cites one of them for a 2025-2026 change, the row says so. The Wikipedia page is what was opened, not the wire story.

#### Shared sources

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

#### How the judgment columns were decided

- **Leader seat.** The office a foreign president actually deals with. Every presidential and semi-presidential system in this region with a dominant president gets `head_of_state`. Cape Verde is parliamentary and gets `head_of_government`. Togo moved to a parliamentary constitution in 2025: executive power passed to the President of the Council of Ministers, and the President of the Republic, elected by parliament, is ceremonial. So Togo gets `head_of_government`. São Tomé and Príncipe gets `head_of_government` because its constitution vests executive government in the Prime Minister and HEADS marks that seat as executive. That call is contested; see the STP note.
- **Second seat.** `same` where one person is both head of state and head of government: Nigeria, Gabon (the premiership was abolished in May 2025), Benin, the Gambia, Ghana, Liberia and Sierra Leone. Sierra Leone's Chief Minister is a presidential appointee, not the head of government. Everywhere else the second seat is the constitutional head of government (a Prime Minister) or, for the two parliamentary cases and São Tomé, the President of the Republic.
- **Regime type.** The EIU 2025 category, except where the form of government calls for a special type. Burkina Faso, Mali, Niger and Guinea-Bissau get `military_junta` (EIU: authoritarian), because each is ruled by officers who took power by coup and hold no election mandate. Guinea and Gabon keep the EIU's `authoritarian`: their coup leaders were elected president in December 2025 and April 2025. São Tomé and Príncipe is not in the EIU, so FH-2026 decides it: Free, which I map to `flawed_democracy` by analogy.
- **Leader in office since.** The year the person began holding executive power continuously, including a transitional or de facto period before any election. That is why Chad, Guinea and Mali show 2021, Gabon and Niger 2023, and Togo 2005 (president from 2005, President of the Council since May 2025).
- **Next leader selection.** The next event that could replace the person in the leader seat. Where no electoral body has published a date, I derived the month from the previous election plus the constitutional term, and the nation's note says so. For juntas with a charter end date, that date is used.

### Americas (`regions/americas.sources.md`)

Companion to `americas.tsv` (34 rows: CAN, MEX, BRA, COL, VEN, CUB, ARG, CHL, ATG, BHS, BRB, DMA, DOM, GRD, HTI, JAM, KNA, LCA, VCT, TTO, BLZ, CRI, SLV, GTM, HND, NIC, PAN, BOL, ECU, GUY, PRY, PER, SUR, URY). Every row was verified on 2026-09-23. No real person is named here; the table constrains attributes only. Some URLs contain a name because that is the page's address.

#### Method

- **Wikipedia pages** marked "(wikitext)" were read through `https://en.wikipedia.org/w/index.php?title=<Title>&action=raw` on 2026-09-23; the canonical article URL is listed. Infobox `birth_date`, `term_start` and `party` fields gave age, tenure and party. Pages without that mark were opened with a page fetch the same day.
- **Current incumbents** were cross-checked against the live "List of current heads of state and government" (WIKI-HEADS). Every seat that changed in 2025 or 2026 was then confirmed with a dated news report, and for several unchanged seats with the government's own site.
- **Age band** is the incumbent's age on 2026-09-23.
- **`leader_seat`.** Presidential systems where one person holds both seats are coded `head_of_state` with `same`/`same`. Westminster systems are coded `head_of_government` (Prime Minister). For the Commonwealth realms (CAN, ATG, BHS, GRD, JAM, KNA, LCA, VCT, BLZ) the second seat is the King (M), represented locally by a Governor-General; the Governor-General's sex is recorded in the nation note, not in the table.
- **`regime_type`.** The EIU Democracy Index 2025 (covering calendar 2025, published April 2026) where the country is scored. The index does not cover ATG, BHS, BRB, DMA, GRD, KNA, LCA, VCT or BLZ. For those nine the table says `flawed_democracy`. **That is an inference, not an EIU rating.** All nine are "Free" in Freedom House 2026 (scores 83 to 94). The EIU rates every English-speaking Caribbean state it does score (JAM, TTO, GUY) as a flawed democracy, and those states have comparable Freedom House scores (81 to 83 for JAM and TTO). No Freedom House cut-off was used to pick `full_democracy`: Chile scores 95 in Freedom House and is still a flawed democracy in the EIU. CUB is coded `one_party_state` rather than the EIU's `authoritarian` because its constitution names the Communist Party as the leading force of society and state.
- **`next_leader_selection`.** Presidential systems use the constitutional election month. Westminster systems without fixed terms (every Caribbean parliamentary state here plus BLZ) use **the month five years after the last general election**. That is the parliament's normal term: the legal deadline falls some months later (dissolution five years after the first sitting, then a 90-day window), and an early election can be called at any time. Where a source gives the exact deadline, the nation note records it. CAN has a statutory fixed date. GUY and SUR run five-year cycles.
- **`women_cabinet_share`** comes from IPU and UN Women, "Women in politics: 2026" (data as at 1 January 2026), the most recent edition that could be opened. Several governments changed after that date (COL, VEN, CHL, HND, CRI, PER, HTI, and new post-election cabinets in ATG, BHS and BRB). **For those countries the figure describes the cabinet in office on 1 January 2026, not today's.** The nation note gives the current count where a source had one.
- **`name_culture`** uses the repo's own mapping: `NATION_NAME_CULTURE` in `packages/world/src/dataset/people.ts` for CAN, MEX, BRA, COL, VEN, CUB, ARG and CHL, and `ROSTER_NAME_CULTURE` in `packages/world/src/dataset/name-cultures.ts` for the rest. Every one of the 34 ids already has a key, so none needed a `none:` entry. Where the elite's naming is visibly mixed, the nation note says so.

#### Shared sources

| id | URL | opened | what it established |
|---|---|---|---|
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | Share of women among cabinet ministers who head ministries, as at 1 January 2026, for all 34 countries (ranking table read in full). Colombia's figure excludes one non-binary minister (map footnote). |
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (wikitext; fetched page also opened) | 2026-09-23 | EIU Democracy Index 2025 category and score for the 25 covered countries. First score column is 2025, checked against Canada's 9.08, which also appears in DWB-2025. Peru is a hybrid regime at 5.88. |
| DWB-2025 | https://www.democracywithoutborders.org/42392/democracy-stabilizes-globally-after-eight-years-of-decline-eiu-says/ | 2026-09-23 | Dated 9 April 2026: EIU 2025 regional average rose from 5.61 to 5.71; Paraguay moved from hybrid regime to flawed democracy; Canada rose to 9.08. Corroborates EIU-2025. |
| FH-2026 | https://freedomhouse.org/countries/freedom-world/scores | 2026-09-23 | Freedom in the World 2026 scores, all "Free": ATG 83, BHS 90, BRB 94, BLZ 87, DMA 92, GRD 89, KNA 89, LCA 91, VCT 90. Comparators: CRI 91, URY 97, CAN 97, CHL 95, JAM 81, TTO 83. |
| WIKI-HEADS | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (wikitext) | 2026-09-23 | The current holder of both seats for all 34 countries. Two footnotes matter: Haiti's presidency is vacant, and Venezuela's formal president was captured on 3 January 2026, with an acting president since then. Also gives the Governor-General for each realm. |
| REPO-NAMES | `packages/world/src/dataset/name-cultures.ts`, `packages/world/src/dataset/people.ts`, `packages/world/src/dataset/name-banks.ts` (local) | 2026-09-23 | The culture key each of the 34 ids already maps to. |

Rows cite EIU-2025 where the country is scored and FH-2026 where it is not (ATG, BHS, BRB, DMA, GRD, KNA, LCA, VCT, BLZ). All rows cite WIP-2026, WIKI-HEADS and REPO-NAMES.

### Asia (`regions/asia.sources.md`)

Companion to `asia.tsv` (30 rows: CHN, SGP, PRK, VNM, IDN, IND, PAK, BGD, AFG, KAZ, JPN, KOR, TWN, THA, PHL, MYS, KGZ, TJK, TKM, UZB, MNG, BTN, MDV, NPL, LKA, BRN, KHM, LAO, MMR, TLS). Every row was verified on 2026-09-23. No real person is named here; the table constrains attributes only.

#### Method

- **Wikipedia pages** were read as wikitext through `https://en.wikipedia.org/w/index.php?title=<Title>&action=raw` on 2026-09-23. The canonical article URL is listed below. Infobox `term_start`/`term_end` and `birth_date` fields were used for tenure and age, then checked against a dated news report or an official site wherever the seat changed in 2025 or 2026.
- **Official sites** were fetched directly on 2026-09-23. A hit is recorded only where the page text named the incumbent with a 2026 date.
- **Age band** is the incumbent's age on 2026-09-23.
- **Party-states (CHN, PRK, VNM, LAO).** The person a foreign president deals with is the party General Secretary, who in all four also holds the state presidency. The seat is coded `head_of_state`, the title names both offices, and `leader_in_office_since` is the year the person became paramount (the party post), not the later state post.
- **`next_leader_selection`** is the constitutional or published date where one exists. Where only a deadline or a cycle exists, the month is an estimate, and the nation note says so.
- **`women_cabinet_share`** comes from the most recent edition that could be opened, IPU and UN Women "Women in politics: 2026" (data as at 1 January 2026). Several cabinets changed after that date (BGD, NPL, VNM, LAO, MNG, THA, JPN, KOR). The figure describes the cabinet in office on 1 January 2026, not today's.
- **`name_culture`** uses the repo's own mapping (`NATION_NAME_CULTURE` in `packages/world/src/dataset/people.ts` and `ROSTER_NAME_CULTURE` in `packages/world/src/dataset/name-cultures.ts`). Every one of the 30 ids already has a key there, and each key fits the political elite's naming tradition, so none needed a `none:` entry.

#### Shared sources

| id | URL | opened | what it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index | 2026-09-23 | EIU Democracy Index 2025 (published 7 April 2026) regime category and score per country. The first score column is 2025; checked against the US row (7.65 in 2025, 7.85 in 2024). Maldives and Brunei are not covered by the index. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | Share of women among cabinet ministers who head ministries, as at 1 January 2026. "Information not available" for Afghanistan, North Korea and Myanmar. Taiwan is not covered (not a UN member). |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The prior edition (as at 1 January 2025). Consulted only to confirm the 2026 edition supersedes it; not used in the table. |
| REPO-NAMES | `packages/world/src/dataset/name-cultures.ts`, `packages/world/src/dataset/people.ts`, `packages/world/src/dataset/name-banks.ts` (local) | 2026-09-23 | The culture key each of the 30 ids already maps to. |

EIU-2025 and WIP-2026 are cited on every row except MDV and BRN, which carry no EIU score (see their notes).

### Southeast Europe and the Caucasus (`regions/europe-south-east-caucasus.sources.md`)

Verified 2026-09-23 for 19 governments: BLR, UKR, RUS, BGR, MDA, ROU, ALB, BIH, HRV, CYP, GRC, XKX, MNE, MKD, SRB, ARM, AZE, GEO, TUR. Every URL below was opened on 2026-09-23. No incumbent is named in this file. A URL can carry a name because that is the page's address.

Wikipedia pages marked "(raw)" were read as the page's raw wikitext (`index.php?title=...&action=raw`), which is the same content as the rendered article. Official sites marked "(curl)" were read with a plain HTTP fetch because the fetch tool was refused or timed out.

#### Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| HEADS | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (rendered, and raw) | 2026-09-23 | The current head of state and head of government for all 19 ids, and which of the two the page marks as holding executive power. It also flagged every 2026 change this file then confirmed with dated news: new prime ministers in Bulgaria, Moldova and Ukraine, a caretaker prime minister in Romania, an acting president in Kosovo, the rotating Bosnian chair, and an informal ruling-party figure in Georgia. Every second-seat sex in the TSV comes from this page. |
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (raw), with https://www.eiu.com/n/campaigns/democracy-index-2025/ (curl) | 2026-09-23 | EIU Democracy Index 2025 categories and scores: Greece full democracy (8.07). Flawed democracies: Cyprus 7.45, Montenegro 6.73, Croatia 6.50, Bulgaria 6.34, Serbia 6.30, North Macedonia 6.28, Albania 6.20, Romania 6.11 (back up from hybrid in 2024). Hybrid regimes: Moldova 5.86 (downgraded in 2025), Armenia 5.35, Bosnia 5.23, Ukraine 4.79, Georgia 4.36, Turkey 4.26. Authoritarian: Azerbaijan 2.80, Russia 2.03, Belarus 1.99. The EIU landing page confirms the 2025 edition exists; the report itself sits behind registration, so the Wikipedia table is the copy I could open. Kosovo is not covered by the EIU. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026) | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map: women among cabinet members who head ministries **as at 1 January 2026**. This is the most recent edition, so it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from its ministers table. Kosovo is not listed. |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The 2025 edition (as at 1 January 2025), opened to cross-check. Not used in the TSV. The direction of change is plausible for each id, for example Albania 41.7 to 46.2 and Ukraine 26.3 to 20.0. |
| REPO | `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`: RUS, UKR, BLR to `slavic-east`; TUR to `turkish`), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` and `name-banks.vendored.ts` | 2026-09-23 | Every one of the 19 ids already has a bank key in the repo, and the TSV uses those keys unchanged: `greek` (GRC, CYP), `romanian` (ROU, MDA), `serbo-croatian` (SRB, HRV, BIH, MNE), `macedonian`, `bulgarian`, `albanian` (ALB, XKX), `georgian`, `armenian`, `azerbaijani`. |

The women-cabinet share has one caveat throughout. The map is a 1 January 2026 snapshot, so it predates the cabinets formed since then in Bulgaria (May 2026), Ukraine (July 2026), Moldova (July 2026), Armenia (August 2026) and Kosovo (September 2026), Romania's caretaker status (from May 2026), and Cyprus's August 2026 reshuffle.

#### How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Presidential and semi-presidential systems get `head_of_state` (BLR, UKR, RUS, ROU, SRB, AZE, TUR, CYP). Parliamentary systems get `head_of_government` (BGR, ALB, HRV, GRC, XKX, MNE, MKD, ARM, GEO). There are two judgment calls, Moldova and Bosnia, and each is covered in its own section below.
- **Regime type.** I used the EIU 2025 category for every id except Kosovo, which the EIU does not rate. There I used Freedom House's Nations in Transit category (XKX-7). None of these governments has a form that calls for a special type.
- **Next leader selection.** This is the next event that could replace the person in the leader seat, not every election on the calendar. Where the month is estimated from a term length rather than a set date, the nation's note says so.
- **Surname rule.** This follows each language's standard morphology for the political elite. It is not taken from a single opened source.

### Europe (west, north and central) (`regions/europe-west-north-central.sources.md`)

Companion to `europe-west-north-central.tsv`. Every source below was opened on 2026-09-23. No incumbent is named here: rows describe offices and attributes only, and a URL may carry a name because that is the page's address.

#### Method and conventions

- **Incumbents** were checked against live pages on 2026-09-23. Where an official site blocked automated access (403, 429 or a CAPTCHA), the row rests on Wikipedia's current-officeholder pages plus a dated news or other official page. I didn't bypass any CAPTCHA. Each case is noted under its nation.
- **Ages** come from the birth dates on the cited biography pages, computed as of 2026-09-23.
- **next_leader_selection** is the month of a scheduled vote or selection that could replace the leader. Where no date is fixed, it's the month of the legal deadline, and the nation's notes say so.
- **women_cabinet_share** is taken as printed from the IPU/UN Women *Women in Politics: 2026* map (SHR-1), which counts cabinet members who head ministries as of 2026-01-01. I didn't recompute it. Governments that changed after that date are flagged in their notes, because the map figure describes the previous cabinet.
- **regime_type** is the EIU Democracy Index 2025 category (SHR-2, SHR-3). The EIU doesn't rate Andorra, Liechtenstein, Monaco or San Marino. For those four I used Freedom House *Freedom in the World 2026*, plus the special type `constitutional_monarchy_executive` where the monarch holds real executive or veto power.
- **name_culture** keys come from the repo: `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`) and `packages/world/src/dataset/name-cultures.ts` (`ROSTER_NAME_CULTURE`). Each row uses the key that the repo already maps to that nation. All 30 nations are mapped there, so no `none:` value was needed.

#### Shared sources (cited on every row)

| id | URL | opened | what it established |
|---|---|---|---|
| SHR-1 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | IPU/UN Women map, published March 2026, with data as of 2026-01-01: share of women among cabinet ministers who head ministries, for every row's women_cabinet_share. |
| SHR-2 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (raw wikitext) | 2026-09-23 | EIU Democracy Index 2025 category and score for each of the 26 rated nations here. The four microstates aren't listed. |
| SHR-3 | https://www.prnewswire.com/news-releases/eiu-democracy-index-2025-democracy-stabilises-after-eight-years-of-decline-302734863.html | 2026-09-23 | EIU press release of 2026-04-07 confirming the 2025 edition and France's return to "full democracy". |
| SHR-4 | https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government (raw wikitext) | 2026-09-23 | Current holder of both seats for all 30 nations, and which office the list treats as holding executive power. |

### Middle East and North Africa (`regions/mena.sources.md`)

Verified 2026-09-23 for 21 governments: SAU, IRQ, IRN, ISR, ARE, YEM, SYR, EGY, MAR, DZA, QAT, BHR, JOR, KWT, LBN, OMN, PSE, LBY, MRT, SDN, TUN. Every URL below was opened on 2026-09-23. No incumbent is named in this file. A URL can carry a name because that is the page's address.

#### Shared sources

| id | URL opened | Opened | What it established |
|---|---|---|---|
| EIU-2025 | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index (rendered page, and the same page's raw wikitext via `action=raw`) | 2026-09-23 | EIU Democracy Index 2025 categories: Israel flawed democracy (7.80); Morocco hybrid (4.97); Tunisia hybrid (4.65); every other MENA id authoritarian (Mauritania 3.84, down from 3.96; Sudan 1.46; Syria 1.37). The EIU report itself is behind registration, so this is the table of record I could open. |
| WIP-2026 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf | 2026-09-23 | IPU and UN Women "Women in Politics: 2026" map, women among cabinet members who head ministries **as at 1 January 2026**. This is the most recent edition and it supersedes the 2025 map named in the brief. Every `women_cabinet_share` value comes from here. Palestine is not ranked. |
| WIP-2025 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf | 2026-09-23 | The 2025 edition (as at 1 January 2025), opened to cross-check. Not used in the TSV. It had Syria "information not available" and also leaves Palestine unranked. |
| REPO | `packages/world/src/dataset/people.ts` (`NATION_NAME_CULTURE`), `name-cultures.ts` (`ROSTER_NAME_CULTURE`), `name-banks.ts` (`NAME_CULTURES`) | 2026-09-23 | The repo already maps 19 of these ids to `arabic`, IRN to `persian` and ISR to `hebrew`. The TSV uses those keys unchanged. |

A women-cabinet caveat applies throughout. The map is a 1 January 2026 snapshot, so it predates the cabinets that Iraq (May 2026), Yemen (February 2026) and Egypt (February 2026 reshuffle) formed since.

#### How the judgment columns were decided

- **Leader seat.** I recorded the office a foreign president actually deals with. Monarchies with a ruling king, emir or sultan get `head_of_state`. Saudi Arabia is the exception, covered below. Parliamentary systems get `head_of_government` (Iraq, Israel, Lebanon). So does Libya, where the prime minister of the recognized government is the working executive.
- **Regime type.** I used the EIU 2025 category except where the form of government calls for a special type. Hereditary monarchies with no empowered elected chamber get `absolute_monarchy` (SAU, ARE, QAT, OMN; KWT while its parliament is suspended). Monarchies where the king rules through a constitution and an elected lower house get `constitutional_monarchy_executive` (MAR, JOR, BHR). Iran gets `theocracy`, and Sudan's army-led council gets `military_junta`. Each row notes the EIU category it overrode.
- **Next leader selection.** This is the next event that could replace the person in the leader seat, not every election on the calendar.

#### What was not verified

- **Morocco's 2026 result** was not yet published when checked. The next Head of Government is unknown.
- **Libya's new three-person presidency** was not confirmed installed as of September 2026. The web-search budget ran out before a final check, and the last source I opened (LBY-6) records none.
- **Iraq's remaining nine portfolios** were not re-checked after May 2026.
- **The EIU 2025 table** was read from Wikipedia, not from the registration-gated EIU report.

### Oceania (`regions/oceania.sources.md`)

Region file: `oceania.tsv` (14 rows: AUS, NZL, FJI, KIR, MHL, FSM, NRU, PLW, PNG, WSM, SLB, TON, TUV, VUT).
Every source below was opened on 2026-09-23. No incumbent is named here; a URL may carry a name because that is the page's address.

#### How the columns were filled

- **leader_seat.** Parliamentary systems (the realms, Fiji, Samoa, Tonga, Vanuatu) use `head_of_government`. The five Micronesian presidencies (KIR, MHL, FSM, NRU, PLW) combine both seats in one office, so they are `head_of_state` with `second_seat_title` = `same`.
- **Commonwealth realms (AUS, NZL, PNG, SLB, TUV).** The head of state is the King, who is shared with the United Kingdom. `second_seat_title` records the resident Governor-General, who exercises the head-of-state functions locally, and `second_seat_sex` is the Governor-General's sex. If the merged table wants the monarch instead, every one of these rows becomes `King` / `M`.
- **Tonga.** Tonga is `head_of_government` (the Prime Minister runs the cabinet). It is typed `constitutional_monarchy_executive` because the King keeps a veto, dissolution, judicial and cabinet appointment powers, and his influence over the government grew in 2025 (TON-3, TON-5).
- **regime_type.** The EIU Democracy Index 2025 category is used where the EIU rates the country (AUS, NZL, FJI, PNG; OCE-EIU). The EIU does not rate the other ten. For those, Freedom House *Freedom in the World 2026* is used instead, with a stated rule: Free at 90 or above is `full_democracy`, Free below 90 is `flawed_democracy`, and Tonga takes the special monarchy type described above.
- **women_cabinet_share.** Taken from the most recent edition that could be opened: UN Women/IPU *Women in Politics: 2026* (data as at 1 January 2026, OCE-WIP26). The 2025 edition (as at 1 January 2025, OCE-WIP25) is recorded below for each country. The value is a plain percent with no % sign. It is only as current as 1 January 2026. The Solomon Islands (new cabinet May 2026) and Tonga (cabinet completed 5 January 2026) have changed since.
- **next_leader_selection.** Where a date is fixed, it is used (NZL). Otherwise the row gives the month the constitution requires or the cycle implies, marked "(est.)" below. For systems where parliament chooses the president (MHL, FSM, NRU), the row gives the general election that decides it, and the indirect selection that follows is noted.
- **surname_rule.** This column is the compiler's summary of each country's naming convention. No opened source backs it, so treat it as inference.
- **name_culture.** Keys come from `packages/world/src/dataset/people.ts` (AUS → `anglo`) and `name-cultures.ts` `ROSTER_NAME_CULTURE` (NZL → `anglo`; FJI, PNG, SLB, VUT → `melanesian`; WSM, TON, TUV → `polynesian`; KIR, MHL, FSM, NRU, PLW → `micronesian`).
- **Search limits.** The session's web-search budget ran out partway through. From then on, verification used direct page fetches only. RNZ, the Washington Post and SIBC returned HTTP 403, and `gg.gov.au` and `usnews.com` timed out. None of those are cited.

#### Shared sources

| id | URL | opened | established |
|---|---|---|---|
| OCE-WIP26 | https://www.unwomen.org/sites/default/files/2026-03/women-in-politics-map-2026-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2026/03/women-in-politics-2026) | 2026-09-23 | Women's share of cabinet ministers as at 1 Jan 2026: AUS 54.5 (12/22), NZL 35.0 (7/20), FJI 13.6 (3/22), KIR 14.3 (2/14), MHL 0.0 (0/9), FSM 37.5 (3/8), NRU 12.5 (1/8), PLW 14.3 (1/7), PNG 2.7 (1/37), WSM 6.7 (1/15), SLB 9.5 (2/21), TON 9.1 (1/11), TUV 0.0 (0/9), VUT 0.0 (0/12). |
| OCE-WIP25 | https://www.unwomen.org/sites/default/files/2025-03/women-in-politics-2025-en.pdf (landing page https://www.unwomen.org/en/digital-library/publications/2025/03/women-in-politics-map-2025) | 2026-09-23 | The same measure as at 1 Jan 2025: AUS 48.3 (14/29), NZL 35.0 (7/20), FJI 10.5 (2/19), KIR 14.3 (2/14), MHL 0.0 (0/9), FSM 37.5 (3/8), NRU 14.3 (1/7), PLW 12.5 (1/8), PNG 2.7 (1/37), WSM 23.1 (3/13), SLB 9.5 (2/21), TON 18.2 (2/11), TUV 0.0 (0/8), VUT 0.0 (0/12). |
| OCE-EIU | https://en.wikipedia.org/wiki/The_Economist_Democracy_Index | 2026-09-23 | EIU 2025 (and 2024): AUS 8.85 full democracy (8.85); NZL 9.62 full democracy (9.61); FJI 5.39 hybrid regime (5.39); PNG 5.90 hybrid regime (5.97). The other ten Oceania states are not rated. |
