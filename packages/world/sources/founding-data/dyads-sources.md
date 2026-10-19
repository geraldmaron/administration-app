# dyads.tsv: method and sources

Written 2026-09-24 for W5/5A (register row WLD-6, "no authored rivalries";
`relationship-graph.ts:5-27`). Read-only research: nothing in the repo was
edited, built or committed beyond the two files in this `data/` folder. All
web sources below were opened or searched today, 2026-09-24; every
recency-sensitive claim is dated in place. No file in this folder names a
real living or historical person; every fact is stated at the level of a
government, a treaty, an institution or a place. That is a hard rule for
this note, not a style preference (task RULES: "No real person's name in any
file").

## 1. What this file is for, and what it is not

`relationship-graph.ts` derives a campaign's opening relationship graph from
continuous dataset facts already on each `Nation` record: alignment band,
shared-organization membership, distance, trade share, defense posture. That
derivation is deliberately sparse and deliberately blind to any fact that
is not already a stat on the nation; it has no way to know that two
neighbors fought a border war, or that a treaty binds two states with no
shared organization, or that a small state's fear of a large neighbor is not
symmetric with the large neighbor's fear of it. `dyads.tsv` is the authored
override layer for exactly those pairs: sourced, dated, real-world-informed
readings for the bilateral relationships whose *shape* the continuous
formula cannot reach on its own. It is not an attempt to hand-author all
195×194 possible pairs, and it is not a replacement for the derived graph
everywhere else; the register asks for sixty to one hundred pairs "that
matter," and this note delivers eighty-four.

**The five pairs W4/4I already owns are excluded from this file.** The W4
briefs (register row at `README.md:157`, "adversaries open as friends") give
4I its own sourced tension-and-threat override for the United States'
reading of the four adversary-shaped nations and the one long-sanctioned
Caribbean nation the register names by their real-world analogues: the
nation matching Russia, the nation matching China, the nation matching North
Korea, the nation matching Iran, and the nation matching Cuba. Do not add
`USA` rows for those five here; 4I's fog-and-override layer is the single
place that sets the United States' own read of them, and a second,
independently coded set of numbers in this file would just disagree with
4I's by construction. **This exclusion is about the USA-facing row only.**
Those four nations still appear throughout this file in *other* pairs (for
example the nation matching Russia against the nation matching Ukraine, or
the nation matching China against Taiwan), because dyads.tsv's job is the
general relationship graph, not only the nations the President's own file
reads. 5A should check whether any of those non-US rows should be
recalibrated to stay consistent with whatever fog/override values 4I ships,
since both files describe the same underlying nation.

**Country identity, not leader identity.** Per this program's D2, every
foreign leader in the shipped game is fictional though faithful to the real
officeholder's demographics; the *countries* are the real 196 governments.
This file names countries, treaties, wars, courts and institutions; never
a person. Where a real, dated news event is the evidence for a row (a
strike, a ceasefire, a pact), it is described by what the state did, not by
who signed it.

## 2. Coding method

There is no published dataset that hands you a continuous "trust" or
"tension" score for a state pair. ATOP and the Correlates of War project
code alliance *types* and dispute *events*, not a -1..1 or 0..1 relationship
reading. Every number in `dyads.tsv` is therefore a coded judgment
([**I**]nference, in the historian's F/I sense) built from cited, dated,
qualitative facts ([**F**]act): a treaty's existence and text, a war's
dates, a court case's status, a border closure, a survey's finding. The
qualitative facts are cited per row by source code; the numeric translation
uses the bands below, applied consistently across all eighty-four rows.
Treat every number as an estimate with a resolution of about ±0.05-0.10, not
a measurement; the second decimal place is never load-bearing.

**Schema note, corrected against the shipped code.** The task brief that
commissioned this file describes trust and tension as both -1..1. The
shipped `Relationship` schema
(`packages/world/src/schemas/relationship.ts:20-32`, read at HEAD
`feb9efba9`) types them differently: `trust` is `-1..1` and directional (a
`from`/`to` pair of records can disagree), but `tension`, `tradeDependence`
and `militaryThreat` are all `0..1`. This file follows the **shipped
schema**, not the brief's shorthand, so 5A can load it without a rescale:
trust is signed and directional (two columns below), tension is unsigned
0..1 (one column, read as the pair's shared friction level; I found no
row where the qualitative evidence pointed to a materially different
reading in each direction, though 5A can always split it into two directed
records with the same value), and military threat is unsigned 0..1 and
directional (two columns, and these *do* differ materially in most rows: a
small state's fear of a large neighbor is rarely symmetric with the reverse).

**Trust** (`trust_a_to_b`, `trust_b_to_a`, each -1..1):
- 0.70 to 0.90; a bilateral mutual-defense treaty in force and not under
  strain.
- 0.60 to 0.85; fellow members of a collective-defense pact (already
  modeled via shared `organizations` membership in the engine, so this band
  is for the *additional* bilateral warmth two treaty co-members can carry,
  or the discount when a bilateral irritant sits inside the alliance).
- 0.35 to 0.60; a strategic partnership, an arms relationship or a
  non-NATO-ally designation with no mutual-defense clause.
- 0.10 to 0.35; normal diplomatic relations, no major dispute, modest
  cooperation.
- -0.10 to 0.20; a recent, incomplete rapprochement; normalized but cold.
- -0.30 to -0.10; no or minimal diplomatic relations, not actively
  hostile.
- -0.60 to -0.90; an active adversary: a live territorial or ideological
  dispute, periodic use of force.
- -0.90 to -1.00; open war, or a government the reading state treats as an
  existential threat.

**Tension** (`tension`, 0..1, one shared value per pair):
- 0.05-0.15; no known dispute.
- 0.20-0.35; managed friction (trade or diplomatic, no military
  dimension).
- 0.40-0.55; an unresolved territorial or resource dispute with periodic
  diplomatic escalation, no recent use of force.
- 0.60-0.75; a dispute with a militarized incident, skirmish or blockade
  inside roughly the last five years.
- 0.80-0.90; active low-intensity conflict, recent fatalities, or a
  ceasefire under daily strain.
- 0.90-1.00; open interstate war, or a nuclear-armed standoff.

**Military threat** (`mil_threat_a_to_b`, `mil_threat_b_to_a`, each 0..1,
read as "how much would A's government say it fears B's forces," informed
by the same proximity/capability/doctrine logic already authored on each
`Nation.doctrine.posture` and `redLines`):
- 0.05-0.15; allied or geographically insulated, no standing threat
  perception.
- 0.15-0.25; a distant power, no nearby territorial or basing dispute.
- 0.30-0.45; a regional power with an unresolved dispute but no recent
  force-posture change.
- 0.50-0.65; a neighbor or peer with a live territorial claim, an active
  buildup, or recent exercises near the border.
- 0.70-0.85; a neighbor engaged in recent armed clashes, or a much
  stronger power with a live invasion or annexation precedent nearby.
- 0.85-1.00; a power currently at war with, or striking, the reading
  government.

**Trade dependence** (`trade_dep_a_on_b`, `trade_dep_b_on_a`; word bands,
mapped conceptually onto the schema's 0..1 field so 5A can pick a
representative value per band): `none` (<0.05, negligible linkage), `low`
(0.05-0.15, one partner among many), `moderate` (0.15-0.30, a top-ten
partner, not dominant), `high` (0.30-0.50, one of the two or three largest
partners, real exposure to a disruption), `critical` (>0.50, the largest
partner or a structurally locked-in relationship; a customs union, a
pipeline, a canal; where disruption would be a national emergency). These
bands are **not** independently sourced per row; they rest on generally
known, stable trade relationships (Canada and Mexico's integration with the
United States, the DPRK's dependence on China, South Sudan's oil transiting
Sudan) rather than a fresh bilateral trade-share calculation for each of the
eighty-four pairs. **For the forty `USA` rows specifically, 5A has a
stronger source already in the repo:**
`packages/world/src/dataset/us-goods-trade.generated.ts` carries the actual
committed US bilateral goods-trade figures (the same file ECO-25's fix
reads a partner's trade share from). Where that file and this note's band
disagree, trust the generated file for the USA-side column and keep this
note's band only for the partner's side, which the generated file does not
cover.

**Live disputes**: a short, dated, factual phrase. Read every one as a
description of the shape ("an unresolved maritime boundary," "a border war
with a fragile ceasefire") that a writer or a systems designer can recast
onto the fictional 2029 government, not as history the fictional
administration is bound to relive verbatim. See §4.

**Ordering convention.** Column `a` is not alphabetical. For a `USA` row,
`a` is always `USA`. For every other row, `a` is the party whose security
posture or claim is more shaped by the pair, or (where that is ambiguous)
the party that most recently acted; the state that struck, that filed the
court case, that closed the border. This mirrors how the four named
examples in the task brief were already ordered (`IND-PAK`, `CHN-TWN`,
`ISR-IRN`, `RUS-UKR`, `KOR-PRK`, `SAU-IRN`, `GRC-TUR`), and this file keeps
each of those exact pairs in the same order. Both directions are still
supplied via the paired columns, so 5A can generate a `Relationship` record
in either direction without reinterpreting which side is which.

**Source column.** A comma-separated list of codes from §5. `GEN` marks a
row whose qualitative facts (a treaty's existence, a war's dates, an
independence date) are well-established and stable; encyclopedic, not
contested; and were not independently re-searched this session; every
other code points to a specific source opened or searched today, with its
URL and date, in §5.

## 3. Coverage

Eighty-four rows: forty `USA` pairs (allies, strategic partners and
adversaries not already owned by 4I) and forty-four non-`USA` pairs (the
regional rivalries and alliances the task named as the shape to cover,
plus enough neighbors to give the relationship graph texture beyond the
United States). Every ISO3 code used here was checked against at least one
`packages/world/src/dataset/nations-*.ts` file at HEAD `feb9efba9`
(`USA`, `CHN`, `RUS`, `GBR`, `FRA`, `DEU`, `JPN`, `KOR`, `PRK`, `IND`,
`PAK`, `ISR`, `IRN`, `SAU`, `TWN`, `UKR` confirmed via
`packages/world/src/dataset/nations.ts`'s exported id constants; a
further ~20 codes spot-checked directly in the regional `nations-*.ts`
files). **Re-grep the full roster after W3/WL/W4** before 5A builds against
this file; nothing in those waves is expected to rename or drop a nation,
but this note was not re-checked against a post-W3 commit.

## 4. Vintage, and what is unverified

Every dated fact in this file is current as read on 2026-09-24 (or
2026-09-24, in the second pass below — the two sessions ran on the same
calendar day), which is *after* several of the events it cites (the file
was researched in the game's own present, not the fictional 2029 in which a
campaign opens). Treat every row as **the shape of a relationship a
campaign might inherit**, per D3 ("carry live conflicts into 2029... the
world as the transition found it"), never as a literal script the
fictional 2029 administration is bound to. A handful of rows describe a
situation that was still actively moving as this note was written and
could be materially different by the time 5A builds against it:
- Israel-Lebanon: an active, contested disarmament negotiation, now further
  strained by a rejected June 2026 framework (S30, S53).
- Armenia-Azerbaijan: a declaration and an initialled text, not yet a
  ratified peace treaty, conditioned on a constitutional amendment (S27,
  S54).
- Venezuela-Guyana: an International Court of Justice case with hearings
  concluded and a judgment pending, expected by or before January 2027
  per the claimant's own counsel (S34, S55).
- Pakistan-Afghanistan: press sources use the phrase "open war," which is
  not a formal declaration by either government; a fresh round of strikes
  landed the same day this second pass was written (S25, S56).
- Serbia-Kosovo: a stalled dialogue with cautious re-engagement, still
  without leader-level talks resumed (S36, S57).
- Saudi Arabia-Iran: a normalization that is reported as fraying while a
  trilateral mechanism still meets (S31).
- Syria's relations with every counterpart in this file: the transitional
  government's international standing changed materially between
  2024 and 2026 and may change again (S24, S52).
- Israel-Iran and Russia-Ukraine are both still-shooting wars as of the
  second pass's as-of date; see §7 and §8 (S39, S59, S60, S51).

Two structural caveats, stated plainly:
1. **No numeric magnitude here is extracted from a source; every one is
   coded** (§2). ATOP, SIPRI and the Correlates of War project were opened
   to confirm scope and methodology (S3-S6), not to pull a per-pair number,
   because none of them publish one in the schema's -1..1/0..1 shape.
2. **Pew's and Gallup's 2025 findings (S7, S8) are cited for base-rate
   context only**: how far and how fast a nation's read of the United
   States can move in a single year; and were **not** used as literal
   trust inputs for any row. Both surveys measure attitudes toward the
   real, sitting US administration's real, current-year foreign policy.
   The fictional game world has no such administration; carrying a
   real-administration-specific approval swing into a structural Day One
   seed for a fictional 2029 government would mis-attribute a personality
   effect as a durable fact about the relationship. What *is* durable, and
   what this file actually codes from, is the structural layer beneath the
   swing: the treaty, the border, the trade integration, the unresolved
   court case.

## 5. Sources

Every entry was opened or searched on 2026-09-24. "Opened" marks a full
page fetch; "searched" marks a web search whose returned, sourced content
is what is cited (the search tool itself resolves and reads the underlying
pages before returning a grounded summary with its URL).

1. **S1**: NATO, "The North Atlantic Treaty" (Article 5 official text),
   `nato.int/cps/en/natolive/official_texts_17120.htm`; opened. Signed
   April 4 1949, in force August 24 1949; Article 5's mutual-defense
   clause and its geographic scope (Europe, North America, Turkish
   territory, member island territories, the Mediterranean and the North
   Atlantic north of the Tropic of Cancer).
2. **S2**: NATO's membership roster, thirty-two members as of 2026,
   Sweden's accession completed March 2024; searched (Wikipedia's NATO
   summary and NATO's US mission page, cross-checked).
3. **S3**: Alliance Treaty Obligations and Provisions (ATOP) project,
   `atopdata.org`; opened. Documents alliance agreements worldwide,
   1815-2018, coded by type (defense, offense, neutrality, consultation);
   CSV and Stata downloads.
4. **S4**: Correlates of War project, Militarized Interstate Disputes
   dataset, `correlatesofwar.org/data-sets/mids`; searched. MID version
   five covers 1816-2014; a sixth update (2014-2024) and a near-real-time
   "MID Live" extension were reported as in progress.
5. **S5**: SIPRI Military Expenditure Database,
   `sipri.org/databases/milex`; searched. Annual military spending by
   country, 1949-2025, in local currency, constant USD and GDP share.
6. **S6**: SIPRI Arms Transfers Database, `armstransfers.sipri.org` —
   searched. International transfers of major conventional arms since
   1950, by importer and exporter.
7. **S7**: Pew Research Center, "Views of the United States" (2025) and
   "US favorability down, China favorability up in many countries",
   `pewresearch.org/global/2025/06/11/views-of-the-united-states/` and
   `pewresearch.org/short-reads/2025/07/15/...`; searched. A
   twenty-four-country survey fielded January-April 2025; a median
   forty-nine percent favorable / forty-nine percent unfavorable view of
   the United States; favorability fell in nineteen of the twenty-four
   countries surveyed from 2024 to 2025; the highest reading, eighty-three
   percent, came from the nation whose relationship is coded here as
   `USA`-`ISR`; the largest declines were in the nations coded as
   `USA`-`MEX`, `USA`-SWE and `USA`-CAN (context only, per §4.2).
8. **S8**: Gallup, "China Edges Past U.S. in Global Approval Ratings"
   (the 2025 Rating World Leaders report),
   `news.gallup.com/poll/707945/...`; searched. A median approval reading
   of the leadership of four powers (the United States, China, Russia and
   Germany) across more than one hundred thirty countries; the United
   States' median fell from thirty-nine percent in 2024 to thirty-one
   percent in 2025, the first time China's median (thirty-six percent) has
   led it by this margin in close to two decades; Russia's median held at
   twenty-six percent (context only, per §4.2).
9. **S9**: Treaty of Mutual Cooperation and Security Between the United
   States and Japan (1960); cited via the US State Department's "U.S.
   Security Cooperation With Japan" page and the treaty's UN Treaty Series
   text; searched. Signed January 19 1960, in force June 23 1960; commits
   both parties to act to meet a common danger against territories under
   Japan's administration. **Superseded as an opened source by S41.**
10. **S10**: Mutual Defense Treaty Between the United States and the
    Republic of Korea (1953), text hosted at `usfk.mil` and the Avalon
    Project (`avalon.law.yale.edu`); searched. Signed October 1 1953,
    entered into force November 17 1954. **Superseded as an opened
    source by S42.**
11. **S11**: Mutual Defense Treaty Between the United States and the
    Republic of the Philippines (1951), Avalon Project,
    `avalon.law.yale.edu/20th_century/phil001.asp`; searched. Signed
    August 30 1951; eight articles; a Pacific-area mutual-defense clause.
    **Superseded as an opened source by S43.**
12. **S12**: ANZUS Treaty (1951), `history.state.gov/milestones/1945-1952/anzus`
    and the treaty's Article IV/V text; searched. Signed September 1
    1951, in force April 29 1952; the US-New Zealand security leg was
    suspended from 1986 over nuclear-ship access and has been partially
    restored since. **Superseded as an opened source by S44.**
13. **S13**: Taiwan Relations Act (1979, Public Law 96-8),
    `congress.gov` and the American Institute in Taiwan (`ait.org.tw`) —
    searched. Not a mutual-defense treaty; authorizes continued arms sales
    and states that a non-peaceful effort to determine Taiwan's future
    would be of grave concern to the United States. **Superseded as an
    opened source by S47.**
14. **S14**: Abraham Accords (2020), official texts at `state.gov` (the
    Israel-UAE and Israel-Bahrain agreements); searched. Signed
    September 15 2020; normalized relations between Israel and the United
    Arab Emirates and Bahrain, with Morocco and Sudan joining the broader
    declaration. **Superseded as an opened source by S48.**
15. **S15**: Treaty of Peace Between the Arab Republic of Egypt and the
    State of Israel (1979), UN Treaty Series text and the Israeli Ministry
    of Foreign Affairs; searched. Signed March 26 1979, following the
    1978 Camp David framework. A direct open of the UN Treaty Series PDF
    was attempted 2026-09-24 (second pass) and failed (binary/image PDF,
    not text-extractable by the fetch tool); the March 26 1979 date is
    treated as `GEN`-level (encyclopedic, uncontested), not newly opened.
16. **S16**: Simla Agreement (1972), the US Institute of Peace's
    peace-agreements collection and the Stimson Center; searched. Signed
    July 2 1972; commits both sides to respect the Line of Control in
    Jammu and Kashmir and to settle disputes bilaterally; Pakistan
    announced it was suspending the agreement following the April 2025
    Pahalgam attack. Not re-opened in the second pass; still search-only.
17. **S17**: United States-Mexico-Canada Agreement (USMCA),
    `ustr.gov/trade-agreements/free-trade-agreements/united-states-mexico-canada-agreement`
   ; searched. Entered into force July 1 2020, replacing NAFTA; subject
    to a periodic joint review. **Superseded as an opened source by S45.**
18. **S18**: NORAD Agreement (1958, renewed in perpetuity 2006),
    `norad.mil/About-NORAD/NORAD-Agreement/` and Canada's treaty registry
    (`treaty-accord.gc.ca`); searched. A binational aerospace-warning and
    -control command between Canada and the United States. Two direct-open
    attempts in the second pass (`norad.mil/About-NORAD/NORAD-Agreement/`
    and `/About-NORAD/`) both returned HTTP 403; still search-only.
19. **S19**: a Comprehensive Strategic Partnership Treaty between the
    nations coded here as `RUS` and `PRK` (2024); reporting reviewed via
    NPR, the Arms Control Association and coverage of the treaty's
    ratification; searched. Signed June 19 2024; includes a
    mutual-assistance clause invoking UN Charter Article 51; replaces a
    2000 friendship treaty. Not re-opened in the second pass.
20. **S20**: a Treaty of Friendship, Cooperation and Mutual Assistance
    between the nations coded here as `CHN` and `PRK` (1961); reporting
    reviewed via the Lowy Institute and 38 North; searched. Signed July
    11 1961; renewed in 2021 for twenty years; described as `CHN`'s only
    mutual-defense treaty with any state. Not re-opened in the second pass.
21. **S21**: a Strategic Defense Agreement between the nations coded here
    as `USA` and `SAU`; an official fact sheet from the issuing US
    government, published November 2025; searched, originally dated as
    "May 2025" in this note's first pass. **Corrected in the second pass:
    the fact sheet itself is dated November 18 2025 and the agreement was
    signed that day (see S49); the May 2025 date belonged to a separate,
    earlier $142 billion arms-purchase announcement made during a Riyadh
    visit, not to the Strategic Defense Agreement or the major non-NATO
    ally designation. `dyads.tsv`'s `USA`-`SAU` row corrected accordingly.**
22. **S22**: a Strategic Mutual Defence Agreement between the nations
    coded here as `SAU` and `PAK` (2025), reporting from a major wire
    service, September 17 2025; searched. A formal mutual-defense pact,
    reported as reflecting Gulf-state concern about the durability of
    existing US security guarantees. **Corroborated by an opened source,
    S50.**
23. **S23**: tension over the Panama Canal between the nations coded here
    as `USA` and `PAN` (2025); reporting reviewed across several outlets,
    January-June 2025; searched. Repeated US statements about reclaiming
    canal control, citing concerns about a Chinese-linked port operator;
    Panama's government rejected the sovereignty claim; a warship-transit
    arrangement remained contested over its terms as of mid-2025.
    **Corroborated by an opened source for the underlying treaty, S46.**
24. **S24**: relations between the nations coded here as `USA` and `SYR`
    after Syria's December 2024 change of government; the US State
    Department's Syria sanctions page, a UN News item (November 2025) and
    wire coverage of a head-of-state visit (November 10 2025); searched.
    Syria's transitional leadership was removed from a US
    terrorism-designation list on November 7 2025 and received at the
    White House on November 10 2025; the State Sponsor of Terrorism
    designation was rescinded August 24 2026.
25. **S25**: clashes between the nations coded here as `PAK` and `AFG`
    (2024-present); reporting reviewed via Encyclopaedia Britannica, the
    Council on Foreign Relations and a summary of the 2025 North
    Waziristan border clashes; searched. Escalation from October 2025
    after a strike on Kabul and retaliation along the Durand Line; both
    governments described the situation as an "open war" by early 2026;
    the border was closed and more than one million Afghans were deported
    in 2025. **Corroborated and extended by an opened source, S56.**
26. **S26**: a border crisis between the nations coded here as `THA` and
    `KHM` (2025); wire coverage and a summary of the 2025 Cambodian-Thai
    border crisis; searched. Armed clashes from July 2025; a ceasefire
    signed in December 2025 after twenty days of fighting that killed at
    least one hundred one people; described by regional analysts as a
    temporary de-escalation, not a stable peace. Not re-opened in the
    second pass.
27. **S27**: a Joint Declaration between the nations coded here as `ARM`
    and `AZE` (2025); the International Centre for Defence and Security
    and a European Parliament research brief; searched. A Joint
    Declaration and an initialled seventeen-article peace agreement were
    signed in Washington on August 8 2025; issues including displaced
    persons, detainees and a proposed transit corridor remain unresolved.
    **Corroborated and extended by an opened source, S54.**
28. **S28**: a dam dispute between the nations coded here as `ETH` and
    `EGY` (2025); reporting reviewed via Mongabay, the Foreign Policy
    Research Institute and a European wire outlet; searched. The Grand
    Ethiopian Renaissance Dam was inaugurated September 9 2025 without a
    Nile water-sharing agreement among the three affected states; a
    political deadlock persists. Not re-opened in the second pass.
29. **S29**: a Twelve-Day War between the nations coded here as `ISR` and
    `IRN` (2025); a dedicated summary, an encyclopedia entry and wire
    coverage; searched. Conflict began June 13 2025 with strikes on
    Iranian nuclear-related sites; an externally mediated ceasefire took
    effect June 24 2025 after initial violations.
30. **S30**: a ceasefire and a disarmament process between the nations
    coded here as `ISR` and `LBN` (2025-2026); dedicated summaries and
    wire coverage; searched. A November 2024 ceasefire broke down in
    March 2026 fighting; a new cessation of hostilities was reached April
    16 2026 and extended; a June 2026 framework ties continued calm to a
    phased, contested disarmament of non-state armed groups in the
    reading state's south. **Extended by an opened source, S53, which
    also shows the June 2026 framework was rejected by the armed group it
    targeted.**
31. **S31**: a normalization and its 2025 strain between the nations
    coded here as `SAU` and `IRN`; the Foreign Policy Research Institute,
    the Atlantic Council, the Long War Journal and a December 2025 report
    on a trilateral committee's meeting; searched. A brokered
    normalization in March 2023 frayed after regional strikes in
    mid-2025; a trilateral committee still met in December 2025. Not
    re-opened in the second pass.
32. **S32**: incidents between the nations coded here as `CHN` and `PHL`
    in the South China Sea (2025); a defense-news outlet, a naval-news
    outlet, a regional wire service and a Hong Kong outlet; searched. A
    water-cannon incident near a contested shoal in August 2025; continued
    mutual accusations through October 2025, despite a provisional
    arrangement reached after a June 2024 clash. Not re-opened in the
    second pass.
33. **S33**: a crisis between the nations coded here as `IND` and `PAK`
    (2025); a dedicated summary and wire coverage; searched. Strikes on
    sites in `PAK` and `PAK`-administered Kashmir on May 7 2025, following
    an April 22 2025 attack on civilians in `IND`-administered Kashmir; a
    ceasefire took hold May 10 2025 and has held despite reported
    violations. Not re-opened in the second pass.
34. **S34**: a territorial dispute between the nations coded here as
    `VEN` and `GUY` at the International Court of Justice (2025-2026) —
    a major US newspaper and a legal-news outlet; searched. `VEN` filed
    its merits response August 11 2025; oral hearings opened May 4 2026;
    the Court has ordered `VEN` to refrain from holding elections in the
    disputed territory; `VEN`'s government has said it will not accept an
    adverse ruling. **Superseded as an opened source by S55, which also
    confirms hearings concluded May 11 2026 and reports an expected
    judgment date.**
35. **S35**: an Arctic security agreement among the nations coded here as
    `USA`, `DNK` (and the territory the pair concerns) (2025-2026); wire
    and defense-press coverage; searched. Following months of US
    statements about acquiring the territory and pushback from `DNK`'s and
    the territory's own governments, a security agreement reaffirming
    Danish sovereignty and the territory's self-determination was signed
    in September 2026. **Superseded as an opened source by S58.**
36. **S36**: a normalization dialogue between the nations coded here as
    `SRB` and `XKX` (2025-2026); the Carnegie Endowment for International
    Peace, a European policy institute and a European foreign-relations
    council; searched. The EU-facilitated dialogue stalled through 2025
    amid a prolonged government-formation impasse in `XKX`; cautious
    re-engagement began under a new EU envoy in late 2025/early 2026; a
    2023 normalization agreement remains unsigned. **Corroborated and
    extended by an opened source, S57.**
37. **S37**: cross-strait tension between the nations coded here as `CHN`
    and `TWN` (2025); a dedicated summary of a named PLA exercise, and
    the two governments' own public positions; searched. An April 2025
    exercise involving dozens of aircraft and warships around `TWN`;
    `TWN`'s government maintains that `CHN`'s Anti-Secession Law does not
    bind it. Not re-opened in the second pass.

## 6. Handoff

- **Load-bearing detail 1**: tension is unsigned 0..1 in the shipped
  schema, not -1..1 as the commissioning brief assumed (§2). Building
  against the brief's range instead of the schema's would silently corrupt
  half the pair space on load.
- **Load-bearing detail 2**: the five pairs W4/4I owns are deliberately
  absent from this file (§1). If 4I's build lands with different tension
  or threat values for those five nations than a reader would infer from
  this file's *other* rows involving them, 4I wins for the USA-facing read;
  this file's non-US rows involving those nations were coded independently
  and should be spot-checked against 4I's numbers for consistency, not
  silently overwritten.
- **Load-bearing detail 3**: every number is a coded estimate from cited
  qualitative facts, never an extracted figure (§2, §4). The `GEN`-tagged
  rows rest on stable, uncontested facts (treaty dates, independence
  dates) that were not freshly searched this session; the `S`-numbered
  rows cite a source opened or searched today. Neither tier should be read
  as more numerically precise than the other; the qualitative fact is
  what is well or thinly sourced, not the number.

## 7. Revision pass (2026-09-24)

A second session checked this table against the briefs and the adversarial review (`../challenge.md` F5, F6, F7, F13) and changed four rows. The sources it added are opened, not searched.

38. **S38**: Organization of American States, signatories and ratifications of the Inter-American Treaty of Reciprocal Assistance (the Rio Treaty), `https://www.oas.org/juridico/english/sigs/b-29.html`, opened 2026-09-24. The United States signed 1947-09-02 and deposited its ratification 1947-12-30, with no denunciation entry; Brazil deposited 1948-03-25, no denunciation; Mexico denounced on 2002-09-06, effective 2004-09-06. Other denunciations listed: Bolivia (2012), Ecuador (2014), Nicaragua (2012), Peru (1990, withdrawn 1991), Uruguay (2019, withdrawn 2020), Venezuela (2013, re-ratified 2019).
39. **S39**: the 2026 Iran war sources the wars researcher opened, C3 and C4 in `wars-sources.md` (both opened 2026-09-24). The war opened on 2026-02-28 with joint US and Israeli strikes; ceasefires in April and June collapsed, the last on July 8. The September state (C5, C6) was not opened by anyone and is re-opened at the W3 close (`../scope.md` §7.0).
40. **S40**: the Venezuela sources the wars researcher opened, C13 and C14 in `wars-sources.md` (both opened 2026-09-24): the January 2026 US operation, an acting government since January 5, sanctions eased through general licenses, a no-date elections pledge and talks on normalization and debt.

**Rows changed.**
- `USA-BRA`: the claim that the Rio Treaty "lapsed for the United States in 2002" was false. S38 shows no US denunciation; the 2002 denunciation was Mexico's. The treaty column now says both remain parties. Source `GEN` became `S38`.
- `ISR-IRN`: recoded to the table's own as-of date. The row described the June 2025 ceasefire; S39 shows the two at war since 2026-02-28. Coded on §2's open-war bands: trust -0.90 and -0.95, tension 0.95, military threat 0.90 each way.
- `USA-VEN`: recoded to S40. The row described a government the United States does not recognize; that government was removed in January 2026. Coded as a recent, incomplete rapprochement (trust 0.15 and 0.00), a dispute with a militarized incident inside five years (tension 0.60), and a much stronger power with a recent operation nearby (Venezuela's threat reading 0.70).
- `USA-PAN`: the canal treaties are named by their subject, not their signers' names (the no-real-names rule).

**What still stood after this pass, and what it meant for 5A.** 11 rows cited an opened source (the 8 NATO rows citing S1, and the three rows above), 32 cited a source that was searched and not opened, and 41 cited `GEN`. W4's `seed/dyads.tsv` format needs a URL and an opened date on every row (`../../w4/briefs.md`, 4I.2-AC20), so a searched or `GEN` row is not seedable as it stands.

**The Manila Pact, first pass.** The State Department's Office of the Historian page on SEATO (`https://history.state.gov/milestones/1953-1960/seato`, opened 2026-09-24) said the United States, France, Britain, New Zealand, Australia, the Philippines, Thailand and Pakistan formed SEATO in September 1954 and that it disbanded in 1977. It did not say whether the 1954 treaty itself remains in force for Thailand. That half of the `USA-THA` row stood unverified after this pass; see §8 item "the Manila Pact" for a partial resolution.

## 8. Second revision pass — the historian's verification session (2026-09-24)

Commissioned to raise this table's opened-source coverage toward the register's
sixty-row target, starting with the forty `USA` pairs, and to re-open every
fast-moving row named in the task brief (Israel with Lebanon, Syria and Iran;
Armenia-Azerbaijan; Venezuela-Guyana; Pakistan-Afghanistan; Serbia-Kosovo) plus
the US treaty commitments (NATO, ANZUS, the US-Japan and US-Korea treaties, the
Rio Treaty, the Philippines treaty). Full detail and the Iran/Russia-Ukraine war
state are in `verification-2026-09-24.md`; this section only logs the new
dyad-table sources and corrections.

**One correction.** `USA-SAU`'s Strategic Defense Agreement was dated "May
2025" in the first two passes. The official fact sheet (S49, opened) is dated
November 18 2025 and states the agreement was signed that day, alongside a
major non-NATO ally designation. The May 2025 Riyadh visit produced a
separate, earlier arms-purchase and investment announcement (about $142
billion), not this agreement. `dyads.tsv`'s `USA-SAU` row is corrected; S21
is kept as the general characterization ("historic," "stops short of a
mutual-defense guarantee") and marked superseded for the date.

**New opened sources** (all opened 2026-09-24, this session):

41. **S41**: Treaty of Mutual Cooperation and Security Between the United States and Japan (1960); UN Treaty Series, Volume 373 (No. I-5321), `https://treaties.un.org/doc/Publication/UNTS/Volume%20373/volume-373-I-5321-English.pdf`, opened (fetched and read as a PDF); cross-read against Wikisource's transcription, `https://en.wikisource.org/wiki/Treaty_of_Mutual_Cooperation_and_Security_between_Japan_and_the_United_States_of_America`, also opened. Article V: "Each Party recognizes that an armed attack against either Party in the territories under the administration of Japan would be dangerous to its own peace and safety and declares that it would act to meet the common danger in accordance with its constitutional provisions and processes." Geographic scope is explicitly limited to territories under Japan's administration (not a Pacific-wide clause, unlike the Korea/Philippines/ANZUS treaties below). Signed January 19 1960 in Washington; entry into force upon exchange of ratification instruments in Tokyo.
42. **S42**: Mutual Defense Treaty Between the United States and the Republic of Korea (1953), Avalon Project, `https://avalon.law.yale.edu/20th_century/kor001.asp`, opened. Article III: an armed attack "in the Pacific area on either of the Parties in territories now under their respective administrative control... would be dangerous to its own peace and safety," with a pledge to "act to meet the common danger in accordance with its constitutional processes." A US understanding on ratification limited the US obligation to territory "recognized by the United States as lawfully brought under the administrative control of the Republic of Korea" (i.e., not automatically extending to any territory Seoul might later claim).
43. **S43**: Mutual Defense Treaty Between the United States and the Republic of the Philippines (1951), Avalon Project, `https://avalon.law.yale.edu/20th_century/phil001.asp`, opened. Article IV: an armed attack "in the Pacific Area on either of the Parties" triggers the obligation to "act to meet the common dangers in accordance with...constitutional processes." Article V defines an armed attack as including one on "the metropolitan territory of either of the Parties, or on the island territories under its jurisdiction in the Pacific or on its armed forces, public vessels or aircraft in the Pacific" — the broadest of the three bilateral Pacific treaties' scope clauses read this session.
44. **S44**: ANZUS Treaty (1951), Avalon Project, `https://avalon.law.yale.edu/20th_century/usmu002.asp`, opened. Article IV: an armed attack "in the Pacific Area on any of the Parties would be dangerous to its own peace and safety," with a pledge to act "in accordance with its constitutional processes." Article V defines the Pacific Area the same way as the Philippines treaty (metropolitan territory, island territories, forces/vessels/aircraft in the Pacific). New Zealand appears throughout as an equal party with identical rights and obligations in the treaty text itself; its 1986 practical suspension and partial restoration (confirmed by a 2026-09-24 web search of secondary sources: Britannica, the NZ Herald, GlobalSecurity.org — none independently opened this session) is a subsequent US policy act, not a treaty amendment, and the treaty text does not itself record it.
45. **S45**: United States-Mexico-Canada Agreement, official USTR page, `https://ustr.gov/trade-agreements/free-trade-agreements/united-states-mexico-canada-agreement`, opened. Confirms entry into force July 1 2020, replacing NAFTA. The page does not itself describe the periodic joint review mechanism (that provision is in the agreement text, Article 34.7, not re-opened this session); the "periodic joint review" characterization in this table's `USA-CAN` and `USA-MEX` rows rests on the earlier, search-only S17, not on this newly opened page.
46. **S46**: the Panama Canal treaties, US State Department Office of the Historian, "The Panama Canal and the Torrijos-Carter Treaties," `https://history.state.gov/milestones/1977-1980/panama-canal`, opened. Confirms the Neutrality Treaty "permitted the United States to use military force to protect the canal's neutrality," distinct from the separate Panama Canal Treaty that transferred operational control to Panama by December 31 1999. A direct open of the treaty's own text (Congress.gov, Treaty Document 95-14(B)) was attempted and returned HTTP 403; the Office of the Historian page is the opened source for this row, not the treaty text itself.
47. **S47**: Taiwan Relations Act (1979, Public Law 96-8), codified at 22 U.S.C. § 3301, Cornell Law School's Legal Information Institute, `https://www.law.cornell.edu/uscode/text/22/3301`, opened. Confirms the "grave concern" language ("to consider any effort to determine the future of Taiwan by other than peaceful means...a threat to the peace and security of the Western Pacific area and of grave concern to the United States") and that the Act is explicitly not a mutual-defense treaty (it authorizes arms sales and states a policy position; it creates no binding defense obligation of NATO's or the Pacific treaties' kind).
48. **S48**: the Abraham Accords Declaration, full text as republished by The Times of Israel, `https://www.timesofisrael.com/full-text-of-the-abraham-accords-signed-by-israel-the-uae-and-bahrain/`, opened. Confirms September 15 2020 signing by Israel, the UAE and Bahrain (with the United States as host/witness), and that the document is a normalization and diplomatic-relations declaration, not a mutual-defense pact — it commits to coexistence, tolerance and cooperation in science, medicine and commerce, with no security-guarantee article.
49. **S49**: "Fact Sheet: President [redacted] Solidifies Economic and Defense Partnership with the Kingdom of Saudi Arabia," White House, dated November 18 2025, mirrored at GlobalSecurity.org (`https://www.globalsecurity.org/wmd/library/news/saudi/2025/saudi-251118-whitehouse01.htm`), opened (the mirror; the original `whitehouse.gov` URL for a superseded administration's release was not independently re-resolved this session, so the GlobalSecurity mirror is the opened source of record). Describes the agreement as strengthening an "80-year defense partnership" and "fortifying deterrence across the Middle East," without using explicit mutual-defense-guarantee language — consistent with this table's existing characterization ("stops short of a mutual-defense guarantee"). Does not itself mention the major non-NATO ally designation (confirmed instead by the Al Arabiya English wire report opened via search summary the same session; not independently re-opened). **This source corrects the `USA-SAU` row's date from "May 2025" to November 18 2025.**
50. **S50**: "Strategic Mutual Defence Agreement," Wikipedia, `https://en.wikipedia.org/wiki/Strategic_Mutual_Defence_Agreement`, opened. Confirms signing September 17 2025 at a named palace in Riyadh; the Saudi Press Agency statement that "any aggression against either country shall be considered an aggression against both"; and, citing Belfer Center analysis, that the pact functions as "primarily a political signal of solidarity and strategic cooperation rather than an unconditional war guarantee," with automatic military intervention not established since the operative treaty text itself has not been officially published.
51. **S51**: the Russia-Ukraine war's September 2026 state, from two opened sources: the Council on Foreign Relations Global Conflict Tracker, `https://www.cfr.org/global-conflict-tracker/conflict/conflict-ukraine` (page states "Last Updated: September 1, 2026"), opened; and the Institute for the Study of War's Russian Offensive Campaign Assessment for September 23 2026, as republished by the Kyiv Post, `https://www.kyivpost.com/post/85279`, opened. Together: a roughly 750-mile front, described as a stalemate outside a February 2026 Ukrainian gain in Zaporizhzhia; no ceasefire in effect; a May 2026 three-day ceasefire "quickly unraveled"; on September 23 2026 senior officials of the aggressor government "effectively rejected" a proposed limited energy-infrastructure ceasefire and stated operations would not pause during talks; a helicopter incursion into a NATO member's airspace the same week. Full detail in `verification-2026-09-24.md` and the corresponding `carried-conflicts.tsv` update.
52. **S52**: Israel-Syria relations at the September 2026 UN General Assembly, The Times of Israel (URL withheld this session: its slug names Syria's transitional head of state, per the no-real-names rule), opened. Syria's transitional government told the UN the Golan buffer-zone territory "will remain Syrian" and accused Israel of hundreds of strikes and incursions since the prior government's fall; Israel's government called the same territory integral to Israel and said forces would remain; reporting describes roughly ninety percent of a potential security-arrangement's terms as agreed, with territorial control the outstanding obstacle. Corrects the row's prior `GEN` sourcing (the row previously cited no dated 2026 event).
53. **S53**: "2026 Israel–Lebanon ceasefire," Wikipedia, `https://en.wikipedia.org/wiki/2026_Israel%E2%80%93Lebanon_ceasefire`, opened. Latest dated entry in the article as read: June 26 2026, when a framework deal for "lasting peace and security" (requiring the armed group's withdrawal and disarmament) was announced and then rejected by that group; Israeli forces remained deployed in southern Lebanon through the period covered. This is an earlier date than `wars-sources.md`'s existing C9 (opened for the first pass, dated July 21 2026); no fresher status than C9's was found this session, so the table's existing July 21 framing stands and S53 is cited as corroboration, not a further update.
54. **S54**: "Tensions Between Armenia and Azerbaijan," Council on Foreign Relations Global Conflict Tracker, `https://www.cfr.org/global-conflict-tracker/conflict/nagorno-karabakh-conflict` (page states "Last Updated: September 1, 2026"), opened. Confirms the peace agreement is initialed but not ratified; a senior Azerbaijani official quoted July 16 2026 described "real peace" and rebuilding trade links, but full signature is conditioned on Armenia amending constitutional language Azerbaijan reads as a territorial claim; a transit corridor through southern Armenia is planned for construction in 2026.
55. **S55**: the Guyana v. Venezuela case (Arbitral Award of 3 October 1899), International Court of Justice official case page, `https://www.icj-cij.org/case/171`, opened. Confirms public hearings on the merits concluded May 11 2026 (not "opened May 2026" as the first pass's S34 had it); no judgment has yet issued; the case has progressed through jurisdiction (2020), rejected preliminary objections (2023), and provisional-measures orders (2023-2025). A France24 wire item dated 2026-09-24 (search-summarized, not independently opened) adds that Guyana urged Venezuela at the UN General Assembly to accept the coming ruling, while Venezuela's government called instead for direct negotiation, and that Guyana's Attorney General has cited an expectation of judgment "by or before January 2027."
56. **S56**: "Timeline: How Pakistan-Afghanistan tensions reached a breaking point," Anadolu Agency, `https://www.aa.com.tr/en/asia-pacific/timeline-how-pakistan-afghanistan-tensions-reached-a-breaking-point/3842132`, opened. Full 2021-2026 timeline; confirms an October 19 2025 ceasefire after the deadliest clashes since 2021, then renewed conflict in 2026: a February suicide bombing (eleven security personnel and a child killed), retaliatory airstrikes February 22, and border clashes February 27 through March 1 (at least twenty-nine deaths). A same-day web search (2026-09-24) found continuing escalation past this article's coverage: a further round of strikes hit ten sites inside Afghanistan on September 24 2026, described by the striking government as targeting drone-launch and storage sites, with the other government denying the claim and reporting four civilian deaths; that September 24 development was search-summarized only (Reuters/AP-sourced wire aggregation), not independently opened, and is flagged accordingly in `dyads.tsv`'s `PAK-AFG` row.
57. **S57**: the Belgrade-Pristina Dialogue, European External Action Service official page, `https://www.eeas.europa.eu/eeas/belgrade-pristina-dialogue_en`, opened. Confirms the dialogue is active, not closed, as of the page's most recent dated content: a new EU Special Representative appointed January 27 2025; a first trilateral Joint Commission on Missing Persons meeting January 23 2026; press remarks recorded March 14 2026. No leader-level talks are recorded as resumed. The 2023 normalization agreement remains unsigned per this table's existing S36.
58. **S58**: "Agreement Between the Government of the United States of America and the Government of the Kingdom of Denmark Together with the Government of Greenland," official text, The White House, `https://www.whitehouse.gov/briefings-statements/2026/09/agreement-between-the-government-of-the-united-states-of-america-and-the-government-of-the-kingdom-of-denmark-together-with-the-government-of-greenland-to-amend-and-supplement-the-agreement-of-27-apri/`, opened. Signed September 22 2026. Grants the United States broad access and movement rights through Greenland's territory, airspace and territorial waters for defined "Defense Areas"; the preamble reaffirms Danish sovereignty and territorial integrity while recognizing Greenlandic self-determination and protecting traditional practices (hunting, fishing); Article XI states the agreement "does not have an end date and may only be amended by mutual consent"; Article IX bars any non-NATO state from establishing military installations or a persistent military presence in Greenland absent both parties' agreement.
59. **S59**: "Iran War 2026 — Day 209 Update — 24 September 2026," GlobalSecurity.org, `https://www.globalsecurity.org/military/ops/iran-war-oprep.htm`, opened. As of day 209: no ceasefire in effect; a "fundamental contradiction" between the Iranian government's claim of 60-70% pre-war Strait of Hormuz flow restored and independent shipping-transit data showing one transit recorded September 20 against an approximately 85-a-day pre-war baseline, with about 396 vessels idle in the watch zone under a "SEVERE" maritime advisory; crude oil rose 3.9% to $103.08 on September 23; no announced strikes, ballistic launches or drone attacks against the reading government's forces for fifteen to nineteen consecutive days; a brigadier general was killed in an internal security operation unrelated to the external conflict.
60. **S60**: "Iran presents US with roadmap to end the war," Semafor, `https://www.semafor.com/article/09/24/2026/iran-presents-us-with-roadmap-to-end-the-war`, opened. Confirms the September 24 2026 written roadmap: a regionwide ceasefire of up to sixty days, phased Strait of Hormuz reopening, an end to the blockade, unfreezing of frozen assets, and an agreed timeline for substantive negotiations; separately, Iran's Supreme National Security Council secretary attached a four-to-five-day deadline for US acceptance — a condition the article notes appears to contradict the roadmap's own ceasefire-during-talks framing. Mediation is credited to Pakistan, Qatar and Egypt. No individual's name is repeated here per the no-real-names rule.
61. **S61**: the Manila Pact's continuing legal force for Thailand, GlobalSecurity.org, `https://www.globalsecurity.org/military/world/thailand/forrel-us.htm`, opened. States: "Despite the dissolution of the SEATO in 1977, the Manila Pact remains in force and, together with the Thanat-Rusk communique of 1962, constitutes the basis of U.S. security commitments to Thailand." This is a secondary defense-reference source, not a primary treaty text or a current official US government statement — a direct open of an archived State Department Thailand-relations page (`2021-2025.state.gov/u-s-relations-with-thailand/`) returned unreadable/corrupted content this session, and Wikipedia's SEATO article, also opened, does not address post-1977 treaty status at all. **The `USA-THA` row's Manila Pact claim is therefore corroborated but not confirmed by a primary or official source; still flagged thin.**

**Opened-source count after this pass.** Twenty-one dyad rows gained a newly
opened source this session (nineteen upgraded from search-only or `GEN`, one
corrected in place, one — `RUS-UKR` — upgraded from `GEN`, and `ISR-IRN`
gained two further opened sources on top of its already-opened S39). Combined
with the eleven rows already opened at the start of this session, **thirty of
eighty-four rows now cite at least one source this or a prior session directly
opened** (up from eleven): the eight NATO Article 5 rows (S1); `USA-BRA`,
`ISR-IRN`, `USA-VEN` (S38-S40, first pass); and `USA-JPN`, `USA-KOR`,
`USA-PHL`, `USA-AUS`, `USA-NZL`, `USA-MEX`, `USA-CAN`, `USA-PAN`, `USA-TWN`,
`USA-ARE`, `USA-SAU`, `USA-DNK`, `RUS-UKR`, `ISR-SYR`, `ISR-LBN`, `ARM-AZE`,
`VEN-GUY`, `PAK-AFG`, `SRB-XKX`, `SAU-PAK` (this pass). Of the forty `USA`
pairs, twenty now cite an opened source (up from ten at the start of this
session): `USA-GBR`, `USA-CAN`, `USA-MEX`, `USA-FRA`, `USA-DEU`, `USA-JPN`,
`USA-KOR`, `USA-AUS`, `USA-NZL`, `USA-PHL`, `USA-SAU`, `USA-TWN`, `USA-POL`,
`USA-TUR`, `USA-ARE`, `USA-BRA`, `USA-SWE`, `USA-PAN`, `USA-VEN`, `USA-ITA`.
This is short of the register's sixty-row target for the whole table; the
highest-value remaining `USA` candidates for a further pass are `USA-ISR`
(the security-assistance MOU; `state.gov`'s own page 403'd twice this
session), `USA-EGY`/`ISR-EGY` (the Camp David-era treaty text; the UN Treaty
Series PDF would not render as text), `USA-JOR`/`ISR-JOR` (the 1994 treaty;
same PDF-rendering failure at `peacemaker.un.org`), `IND-PAK` (the Simla
Agreement, not re-attempted this session), and `USA-QAT`/`USA-KWT`/`USA-BHR`
(major non-NATO ally designations, not yet sourced at all). See
`verification-2026-09-24.md` §4 for the full accounting.
