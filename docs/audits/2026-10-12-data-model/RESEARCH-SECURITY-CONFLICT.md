# Research: Security and Conflict Outcomes for a Strike or Operation

Date: 2026-10-12. Scope: how military power is measured, what decides the outcome of a strike or operation, how casualties and costs are modeled, and how military events move opinion, the economy, alliances and population. Ends with a proposed outcome model that scales across 196 governments from dataset fields.

Owner's requirement: "If a strike happens, I would expect a combination of the involved parties, their capabilities, and other characteristics and state such as where the strike is called in, type of strike, population and more to determine the output." No precedent, best for the game, no assumptions.

## 0. How to read this document

**Source status.** Every figure below carries a tag.

| Tag | Meaning |
|---|---|
| [O] | I opened the page or PDF in this session and read the figure there. |
| [O-2] | I opened it, but it is a secondary aggregator (Wikipedia, a news site) that relays a primary source or a belligerent's claim. Treat as a lead, not a measurement. |
| [S] | The figure appeared only in a web-search result summary. I did not open the page. Listed so the next pass can open it; do not build calibration on it. |
| [P] | My own arithmetic on [O] figures. The inputs are named. |
| [M] | A modeling choice. No source gives it. It is a parameter to fit, not a fact. |

**Sources I could not open** (HTTP 403/402/404 or unreadable): CBO's own site, IISS Military Balance (only the title "The Military Balance 2026" rendered), RAND MG965 (How Insurgencies End), the NATO Libya fact sheets, the ICRC Libya case study, defense.gov and centcom.mil transcripts, USNI, GlobalSecurity, Brown's displacement report body. Consequences: no IISS figure appears here; the 2018 Syria strike, the Libya sortie counts, the Operation Midnight Hammer munition counts, and the Lancet 2006 estimate are not used as calibration because I only saw them in search summaries.

**Standing caution on 2026 events.** Several 2026 figures come from the Wikipedia page "2026 Iran war" [O-2], which itself relays Iranian, US, Israeli and NGO claims that disagree. They show the order of magnitude and the shape of the event. They are not audited totals.

## 1. Findings in brief

1. **Real operations are small packages, not whole forces.** Wounded-plus-killed for the entire US Iraq campaign (OIF + New Dawn, 2003 to 2011) was about 36,000 [P from CRS RL32492: OIF 4,418 deaths and 31,994 WIA, New Dawn 74 deaths and 298 WIA]. The engine's rule produces about 6,900 a week at intensity 0.5 against anyone (`war-attrition.ts:17-75`, restated in REGIME-CHANGE R7). Section 6.1 shows the gap is roughly two orders of magnitude and why: it multiplies the whole active force, not the committed package.
2. **Wounded outnumber killed ten to one in the modern US record, three to one in Vietnam and the Gulf War.** OIF 31,994 WIA to 2,675 KIA [O: CRS RL32492 Table 12]. Vietnam 153,303 non-mortal wounded to 40,934 KIA. A game that models only "casualties" loses the main shape.
3. **Strikes rarely deliver the stated effect on the first pass.** 1998: most missiles hit their targets, but neither bin Laden nor any leader died; the review put deaths at 20 to 30, and the al Shifa intelligence was never corroborated [O: 9/11 Commission Ch. 4]. 2017: 59 Tomahawks, runways spared, a Syrian jet took off the next day [O: Defense One]. June 2025: sites "damaged", uranium whereabouts unclear [O: CRS IF13032]. The outcome the player sees must separate the immediate kinetic result from a lagged, uncertain assessment.
4. **Retaliation is fast and often calibrated.** Soleimani killed Jan 3, 2020; Iranian missiles hit al Asad Jan 8; no US deaths; 109 troops diagnosed with mild traumatic brain injury by Feb 10, up from 34 on Jan 24 [O: Stripes; Bangor Daily News via search, [S] for the 34]. June 22, 2025 strike; June 23 missiles at Al Udeid, "largely symbolic", no US casualties reported [O: CRS IF13032].
5. **The harm that reaches the economy is a chokepoint, not the strike.** A 2003 Iraq loss of 1.5 mbd moved prices briefly above $30; a wider Gulf disruption could have meant $53 and indefinite duration [O: CRS RL31676]. In 2026, CBO ties more than 40% of Q2 2026 PCE inflation to energy, from Hormuz and Red Sea disruption [O-2 via Roll Call, [O] page].
6. **Munitions, not troops, are the binding resource in a standoff campaign.** CBO: half to two-thirds of the US interceptor inventory used since June 2025, at least five years to rebuild; munitions replacement is the largest single cost [O: Roll Call; O: CNN via kioncentralcoast].
7. **Rallies are conditional and shrinking.** Gallup: +18 (1991), +13 (2003), +35 (9/11); before 1991 no US military action had lifted approval more than 11 points [O: Gallup]. The 2026 Iran strikes are described as a non-bump [O: G. Elliott Morris, paywalled excerpt].
8. **Reported civilian harm depends on who counts.** Mosul: coalition acknowledged 352; Airwars 1,066 to 1,579 from coalition strikes; AP 9,000 to 11,000 total civilian deaths [O: Airwars]. The model needs a true value and a reported value.
9. **Lanchester equations do not fit ground combat history.** Two independent test lines (Ardennes, Kursk) found no usable fit [O-2: Dupuy Institute, an interested party]. Use them only as a shape for air or missile-versus-defense saturation, and calibrate on cases.
10. **Recommended model:** a staged pipeline (access, penetration, effect, collateral, losses, escalation, reaction), driven by the committed package and the target's state, producing a true outcome plus a lagged, noisy observed outcome. Section 7.

## 2. How military power is measured today

### 2.1 Measurement families

| Family | Definition and unit | How it is measured | Range and speed of change | Game representation |
|---|---|---|---|---|
| Force structure | Personnel and platforms by service: headcount, hulls, airframes, brigades | IISS Military Balance (annual; not opened, see section 0), national budget documents | Years to decades. A carrier or fighter fleet turns over on 20 to 40 year cycles; headcount moves a few percent a year in peacetime | Stock. Dataset: `military.activeHeadcount`, `reserveHeadcount`, `orderOfBattle` by branch with `ForceUnit.count` |
| Readiness | Share of the force able to deploy and fight now. Aircraft: mission capable (MC) rate, "the percentage of total time when the aircraft can fly and perform at least one mission" [O: GAO-25-107870] | Service maintenance data; GAO audits | Weeks to months. USAF fleet average (unweighted) 71.24% FY2022, 69.92% FY2023, 67.15% FY2024; F-22 57.4% to 52% to 40.19%; F-35A 51.5% FY2024; historical acceptable band 75 to 80%; deployed aircraft run much higher because they get spare priority [O: Air & Space Forces]. GAO: Air Force tactical rates fell every type FY2018 to 2023, Navy and Marine rose [O: GAO] | Index 0..1, a stock with a decay and a recovery rate. Dataset: `military.readiness`, `ForceUnit.readiness` |
| Munitions stocks and production | Inventory of precision weapons and interceptors; annual production | Classified; CBO infers from reported expenditure. CBO: the Pentagon "did not respond" to its information requests [O: Roll Call] | Consumption in weeks, replenishment in years. Interceptors: at least five years (CBO). Wikipedia relays CSIS: about 65% of 2,330 Patriots used Feb to July 2026, THAAD about 80% by Aug 5, "a little less than half" of the Tomahawk supply, PrSM and ATACMS "virtually all" [O-2] | Stock per munition class with a production flow. Spending a class draws the stock, and the stock gates the next strike |
| Defense spending | Military expenditure, USD, real terms, share of GDP | SIPRI Military Expenditure Database, open sources only, 1949 to 2025, revised annually [O] | Annual. 2025 world total $2,887 bn (+2.9% real; 11th straight rise); USA $954 bn (-7.5%), China $336 bn, Russia $190 bn, Germany $114 bn (+24%), India $92.1 bn, Ukraine $84.1 bn and 40% of GDP [O: SIPRI 2026 fact sheet] | Flow into readiness and procurement, with a lag. Dataset: `military.budget`. Spending is an input to capability only through years of buying |
| Power projection | Ability to deploy and sustain forces away from home: airlift, sealift, bases, tankers | Basing counts, lift capacity. CRS: in-country US troops rose 149,000 (mid-2003) to 165,000 (Nov 2007) in Iraq and 10,000 (2002) to 100,000 (May 2011) in Afghanistan [O: CRS RL33110] | Deployment takes weeks to months; the build-up to a campaign took years | Reach gate on a package. Dataset: `airliftCapacity`, `sealiftCapacity`, `basesAbroad`, `geo.neighbors`, `geo.chokepoints`, `geo.coastline` |
| Nuclear status | Warheads, deployment, delivery systems | SIPRI Yearbook. Jan 2024 inventory 12,121, of which 9,585 potentially available and 3,904 deployed; USA 5,044 inventory (1,770 deployed), Russia 5,580 (1,710), France 290, China 500, India 172, Pakistan 170, North Korea 50, Israel 90 [O: SIPRI YB24 table 7.1] | Years. China was in the middle of significant expansion in the same text [O] | A status enum plus count; a hard gate on conventional escalation, not a stock the player spends. Dataset: `arsenal.warheads`, `deliveryTriad`, `declared` |
| Doctrine, training, intelligence | Quality multipliers on everything above | No single public series; proxies only | Years | Indices 0..1. Dataset: `doctrineQuality`, `intelCapability`, `counterIntel`, `branchStrength.*` |

### 2.2 Implications for representation

- **Capability and availability are different numbers.** F-22 40% mission capable against a 75 to 80% benchmark says a fleet on the books is not a fleet in the air. The model should use available strength = count × readiness, and deployed units get a readiness premium.
- **Spending predicts nothing within a year.** SIPRI shows annual change; the capability it buys arrives over years. Use budget as the input to a slow stock update, never as an instant multiplier on a strike.
- **Munitions are a ledger.** CBO's cost split makes this concrete: of $38 bn through August 1, 2026, munitions replacement is $21.7 bn, plus $10.4 bn of added flying hours, $2.7 bn fuel, $1.9 bn lost equipment, $1.5 bn other, with $2 to $3 bn a month beyond [O-2: CNN via kioncentralcoast for the total, $21.7 bn and run rate; component split from search summary [S] for $10.4/2.7/1.9/1.5 and the $7.3/13.1/1.2 split]. The Pentagon told Congress $43.6 bn as of Sept 3, a different cutoff and method [S: Bloomberg Government].
- **Scale across 196 governments uses ordinal power tiers for the long tail.** The dataset already carries `militaryTier` (1 to 5) and `militaryMetrics.forceIndex`, `mobilizationCap`, `sustainability.warDuration` and `industrialMobilization`. Those can drive tail nations; authored order of battle detail exists only where the game moves formations.

## 3. How the outcome depends on inputs

### 3.1 Strike and operation types

For each type: what it does, what limits it, and the outputs it can produce.

| Type | Strength | Limit | Evidence |
|---|---|---|---|
| Cruise missile salvo | No pilot at risk; reaches defended airspace; fast | Small warhead, no loitering; stock-limited; cheap defenses may still stop some | 1998: Navy ships in the Arabian Sea fired at Khowst camps; most hit, no leader killed [O: 9/11 Commission]. 2017: 59 Tomahawks at 59 aim points, about 20 aircraft among them, runways spared, jet flying within a day [O: Defense One] |
| Air strike (manned, standoff or penetrating) | Mass, flexible munition choice, hard-target ordnance | Needs air superiority or suppression; crew risk; sortie cost | June 2025: B-2s with GBU-57s on three nuclear sites; CIA director said several facilities "destroyed", the IAEA director general said "very significant damage is expected", CRS said details "may remain unclear" [O: CRS IF13032] |
| Drone strike | Persistent surveillance, low risk, low cost per shot | Needs permissive air; low yield; target identification is the failure mode | Pakistan: TBIJ counted at least 2,500 killed, at least 400 civilians by Sept 2013 (about 16%); 295 of 568 named dead were civilians, 95 children [O: TBIJ]. A US official's own figure was about 2,000 militants and 50 civilians, quoted in a search summary [S] |
| Special operations raid | Precise, captures intelligence, small footprint | Execution risk, little margin | No raid case opened. Do not calibrate; model as a high-variance, low-collateral option [M] |
| Naval (blockade, interdiction, defense of shipping) | Persistent, escalation-controllable | Interceptor cost ratio; long duration | Red Sea: US strikes on Houthi targets Jan 11, Jan 22, Feb 3, Feb 24 (2024); 24-nation Operation Prosperity Guardian since Dec 2023; $2.4 bn in the FY2024 supplemental for operations; two US service members died in a January interdiction [O: CRS IN12301]. Navy Secretary said almost $1 bn of missiles in about six months [S] |
| Cyber | Deniable, no physical casualties | Attribution, reversibility, uncertain effect | No case opened. Represent as an effect on target readiness or infrastructure with a reveal delay [M] |
| Invasion and occupation | Decisive, regime-ending | Time, cost, insurgency | Section 4.3 |

### 3.2 Inputs that determine the result

Group by who owns the input.

**Attacker (actor and package)**
- Package: asset counts by domain, committed from the order of battle, not the whole force.
- Availability: readiness of the committed units.
- Munition type and stock: yield, penetration, accuracy, cost; the stock bounds how many can be used.
- Reach: distance from basing, tanker or sealift lift, overflight and basing permissions.
- Intelligence quality: whether the target is where the strike thinks it is.
- Rules of engagement: tolerance for collateral damage; targeting restraints. Airwars notes that its grading depends on what a belligerent publicly accepts [O: Airwars methodology].
- Commanders' and the President's traits (modulators, section 7.5).

**Defender (target state)**
- Air and missile defense: interceptor inventory and quality. Israel reportedly ran short of interceptors in the second week of the June 2025 conflict [O: CRS IF13032].
- Hardness and depth of the target: Fordow is deep; a runway is soft.
- Dispersal and mobility: launchers that move survive; 190+ ballistic missile launchers destroyed is a US/Israeli claim [O-2].
- Counterintelligence and deception: nuclear material "appears to have been moved in advance" in reporting on the June 2025 strike [S].
- Capacity to retaliate: missile arsenal, proxies, access to chokepoints.
- Regime need to respond: legitimacy and stability.

**Place**
- Population density and urban share around the aim point (collateral).
- Terrain and distance (reach).
- Proximity to a chokepoint or third-country assets (escalation, economic spillover).
- Third-party presence: Russian personnel at Shayrat were deliberately not targeted [O: Defense One].

### 3.3 Outputs and what history gives for each

| Output | Typical range from cases | Notes |
|---|---|---|
| Target destroyed (probability) | Immediate effect high on soft fixed targets (2017: aimed at 59 aim points); low confidence on hard, mobile or high-value individual targets (1998: leaders missed by hours; June 2025: "damaged") | Separate "hit" from "mission effect" from "recovery time" |
| Time to recover | Shayrat: jet flew next day, a defense official said repair "within a few days" [O: Defense One]. Iran's nuclear sites: years, per the CIA director [O: CRS IF13032] | A recovery clock is a better output than a destroyed flag |
| Friendly losses | Al asad 2020: 0 killed, 109 mild TBI by Feb 10. June 2025 retaliation: none reported. 2026 war: 20 to 24 killed, 861+ wounded, 98 aircraft lost or damaged, about 25% of Reapers [O-2] | Deaths are rare in standoff operations; injuries and equipment dominate |
| Enemy military casualties | Estimates are partisan. 2026 Iran: HRANA 1,249 military of 3,684 killed; US/Israeli claims 6,000+ military [O-2] | Report a band, not a count |
| Civilian casualties | See ratios below | Reporting bias matters as much as the value |
| Infrastructure damage | 138,000 civilian sites damaged in Iran by April 2026, reconstruction two to five years [O-2] | Distributed over time |
| Escalation and retaliation | Soleimani to al Asad: 5 days; Midnight Hammer to Al Udeid: 1 day, then ceasefire the next day [O] | Probability, delay, size, target class |
| Legal and political reaction | War Powers notification "consistent with" the Act; Senate rejected a discharge motion on S.J.Res. 59 in June 2025; resolutions H.Con.Res. 38 and S.J.Res. 104 in 2026 [O: CRS IF13032, IN12662] | Conditional on duration and casualties |

### 3.4 Civilian harm: ratios by context

No single ratio exists. The figures below are the ones I could open, with the counting body named.

| Context | Figure | Source |
|---|---|---|
| Iraq, first two years, all violence | 24,865 reported civilian deaths; 6,215 in year one, 11,351 in year two; about 30% before May 1, 2003 (invasion phase); explosives involved in 53%, air strikes 64% of explosive deaths; US-led forces 37%, anti-occupation forces 9%, post-invasion criminals 36%; women and children almost 20% | IBC dossier press release [O] |
| Iraq, cumulative | 200,065 to 226,628 documented civilian deaths from violence; about 300,000 including combatants | IBC [O] |
| Post-9/11 wars (Iraq, Afghanistan, Syria, Yemen, Pakistan) 2001 to 2023 | Over 940,000 direct deaths, over 432,000 civilians (about 46%); 3.6 to 3.8 million indirect deaths | Costs of War [O] |
| Mosul 2016 to 2017 | Coalition acknowledged 352; Airwars 1,066 to 1,579 from coalition air and artillery; Iraqi prime minister said at most 1,260 in the fighting; UN: at least 741 executed by ISIS; AP 9,000 to 11,000 total | Airwars [O] |
| Pakistan drone strikes | At least 2,500 killed, at least 400 civilians (Sept 2013) | TBIJ [O] |
| Iran 2026 | HRANA 3,684 killed: 1,249 military, 1,721 civilian, 714 unclassified (about 47% civilian of the total). OCHA 3,400+ civilians. A Minab school strike about 170 dead | [O-2] |

**Lesson.** The civilian share depends on target type, density and the tempo of the campaign; a single "civilian ratio" input will be wrong in most contexts. A cruise missile at a rural camp and a bombardment of a dense city differ by orders of magnitude. The model derives expected civilian deaths from local density, area of effect and discrimination (section 7).

### 3.5 Reporting and attribution

- Airwars grades incidents Confirmed, Fair, Weak, Contested, Discounted; a death toll is a provisional assessment, not a finding [O].
- Pentagon revised the 2026 war's fatalities to 21 and injuries to 865 in October [O-2].
- In the 2020 al Asad case the initial statement was no injuries; counts rose to 109 over weeks as symptoms emerged [O: Stripes].

The model should store the true outcome and expose an observed outcome that differs by a bias factor set by who is reporting (the President's own government, an adversary, an NGO) and a delay.

## 4. Casualty and attrition modeling for a game

### 4.1 Methods

| Method | Form | What history says | Use in the game |
|---|---|---|---|
| Lanchester linear and square laws | dA/dt = -k_B·B (square law with aimed fire) | Tests on Ardennes and Kursk data found no usable fit for ground combat; Lanchester himself said special conditions on land can mask the law; RAND's 1975 view quoted by Dupuy: no clear empirical verification [O-2: Dupuy Institute, an interested party] | Do not use for ground war. May shape a salvo-versus-defense saturation, calibrated per case |
| Loss-exchange ratio | Losses_B / Losses_A for a given type of encounter | Gulf War: 147 US hostile deaths [O: CRS RL32492 Table 8]; enemy losses not opened | Needs an opened series. Treat as a fitted parameter by domain, not a sourced constant |
| Rates per force size and intensity | casualties/week = engaged × rate(intensity) | OIF: about 0.00066 killed or wounded per US troop-week averaged over 2003 to 2011 [P: 36,412 casualties over about 457 weeks at an assumed 120,000 troops; the troop level is bracketed by CRS points 124,000 to 165,000 but the average is my assumption] | Use with the committed package. This is the form the engine already has; the error is the base |
| Insurgency casualty curve | Level grows after the regime falls, peaks, decays | IBC: 6,215 civilian deaths in year one, 11,351 in year two (almost double) [O]. Costs of War direct deaths dominated by the occupation years. Not opened: RAND MG965's duration findings | A phase curve with a state variable (grievance, sanctuary, outside support) |
| Cost scaling by forces and duration | Cost = troops × cost per troop-year + one-time | CRS RL33110: $1.6 trillion FY2001 to FY2014 enacted, peak $195.2 bn in FY2008; CBO alternative projection averaging about $1 million per troop [O]; the $18 bn for over 60,000 in-theater troops implies roughly $300,000 [P, CRS did not state it] | Component ledger (section 5.2) |

### 4.2 Historical record to calibrate against

US military casualties [O: CRS RL32492, as of July 16, 2020]:

| Operation | Total deaths | Hostile deaths | KIA | WIA | WIA / KIA [P] |
|---|---|---|---|---|---|
| Iraqi Freedom | 4,418 | 3,481 | 2,675 | 31,994 | 11.96 |
| New Dawn | 74 | 38 | 22 | 298 | 13.55 |
| Enduring Freedom | 2,349 | 1,845 | 1,370 | 20,149 | 14.71 |
| Inherent Resolve | 96 | 21 | 13 | 230 | 17.69 |
| Desert Storm | 1,947 (299 in Table 2) | 147 | 143 | 467 (non-mortal) | 3.27 |
| Vietnam | 58,220 | 47,434 | 40,934 | 153,303 (non-mortal) | 3.75 |

Troop levels and funding [O: CRS RL33110]: Iraq 149,000 (mid-2003), 124,000 (Dec 2003), 165,000 (Nov 2007), 141,000 (Mar 2009), zero by Dec 31, 2011. Afghanistan about 10,000 (2002), 20,000 (2005), 98,000 (Sept 2010), 100,000 (May 2011), 33,000 to 34,000 (Feb 2014). Total war funding $1,608.9 bn FY2001 to FY2014; Iraq $814.6 bn (51%), Afghanistan $685.6 bn (43%).

A recent series for calibration of short, intense wars with standoff weapons:

| Event | Fatalities (US) | Wounded (US) | Source |
|---|---|---|---|
| Al asad, Jan 2020 | 0 | 109 mild TBI (Feb 10) | [O: Stripes] |
| Iran war, Feb to Oct 2026 | 21 (revised from 20 to 24) | 865 (revised from 861+) | [O-2] |

Per week, the 2026 US figures are about 20 deaths over roughly 30 weeks of active fighting [P, using the ceasefire and resumption dates the page gives: ceasefire April 8, collapse July 8], far below the engine's weekly rate for a war of that scale.

### 4.3 Occupation as a different process

The Iraq record separates two regimes:
- **Invasion**: short, concentrated, mostly state-on-state. About 30% of the first two years' civilian deaths fell before May 1, 2003 [O: IBC].
- **Occupation**: slower and larger. Civilian deaths almost doubled in year two; US deaths ran on for eight more years; Costs of War puts displacement at no fewer than 37 million across eight post-9/11 war countries [O: Brown news page, total only].

Model the two as different state machines, as REGIME-CHANGE already proposes (section 4.8 there).

## 5. Costs of operations

### 5.1 Scaling

- **By forces committed.** CRS ties cost mainly to troop levels [O: RL33110].
- **By duration.** The 2026 war runs $2 to $3 bn a month beyond August 1 [O: CNN].
- **By stockpile draw.** Munitions replacement is the largest piece of the 2026 bill; interceptors alone take at least five years to rebuild [O: CBO via Roll Call].

### 5.2 Component ledger (for a strike or campaign)

| Component | Driver | Timing |
|---|---|---|
| Munitions expended | count × unit replacement cost | booked at use, paid over procurement years |
| Added flying hours and steaming | sorties × hours | immediate |
| Fuel | hours × price | immediate; price rises with the war |
| Lost and damaged equipment | friendly losses | at loss |
| Personnel and rotation | troops × cost per troop-year | continuous |
| Base repair | Iranian attacks on bases | excluded from CBO's $38 bn [O] |
| Veterans' care | wounded × lifetime | decades; excluded from CBO [O] |

The CBO estimate for the 2026 war is explicitly a floor: it excludes facility repairs, diplomacy, foreign assistance and veterans' care, and CBO says the Pentagon did not supply the data it requested [O: Roll Call].

I could not obtain an official cost per sortie or per munition type from an opened page. The only per-munition figures I saw are in a search summary ($1 million to $4.3 million per interceptor in the Red Sea [S]). Do not hard-code them.

## 6. Effects of military events

### 6.1 The engine's current casualty rule

REGIME-CHANGE R7 and `war-attrition.ts` set weekly casualties to engaged × 0.02 × intensity × (0.5 + pressure), with engaged equal to 50% of the principal's whole active headcount. For the US that is about 694,000 engaged. [P] Against OIF's roughly 0.00066 per troop-week, the engine's rate at intensity 0.5 and even pressure is 0.01 per engaged troop-week, about 15 times higher, on a base about 6 times larger, so about 90 times the observed average. The number is rough because of my troop-level assumption, but the order of magnitude is not in doubt. The fix is a base that is the committed package, which REGIME-CHANGE S0a already proposes.

### 6.2 Public opinion

| Effect | Evidence | Size and timing | Game representation |
|---|---|---|---|
| Rally | Gallup: 2003 Iraq +13 (58 to 71), 1991 +18 (64 to 82), 9/11 +35 (51 to 86); before 1991 no military action had lifted approval above +11 [O: Gallup] | Decays over weeks to months; Gallup shows approval still between 69% and 71% for several weeks after March 2003 | Pulse with half-life, scaled by consensus and threat salience |
| Non-rally | 2026 Iran strikes: "latest case of a non-bump", public opposed from the start [O: Morris excerpt]. By July 2026, 58% of Americans opposed the war (Wikipedia, [O-2]) | No rally when the war is seen as a choice and the public starts opposed | The rally is conditional, not constant |
| Casualty sensitivity | Public tolerance depends on beliefs about whether the war is right and whether it will succeed; expected success matters most [O: Feaver, Gelpi, Reifler, Belfer Center abstract] | Not a fixed per-body cost | Casualty drag scaled by (1 − expected success), with a just-cause modulator |

The repo's `RALLY_PEAK` 0.15 with a 6-week half-life sits inside the Gallup range for a clear shock; VERIFY item 11 already says a war the President starts should not get the full peak. Gallup's own table supports that: the largest historical rallies came from attacks or an international crisis, with the smallest among the three on Iraq 2003.

### 6.3 Economy

| Channel | Evidence | Size and speed | Game representation |
|---|---|---|---|
| Oil: supply lost | 1991: 3.7 mbd lost to world markets; 2003: Iraqi exports about 1.5 mbd, halted at war start [O: CRS RL31676] | The size of the disruption relative to spare capacity decides the price; OPEC held nearly all spare capacity, about three times Iraq's 2002 exports | Price shock = f(share of world supply at risk − spare capacity offset), conditional on a chokepoint closing |
| Oil: war premium | Analysts put the 2003 premium at $2 to $4 per barrel up to $6 to $9; the cited precedent is that Desert Storm's onset triggered history's biggest one-day oil price drop [O: CRS RL31676] | Builds before the war, collapses on a short decisive one | Pre-war premium, post-war collapse conditional on a quick end |
| Oil: chokepoint | 13 mbd shipped through Hormuz (2003 figure) [O: RL31676]; "A wider disruption could have caused price spikes as great as $53 per barrel and of indefinite duration" [O] | Orders of magnitude larger than the strike itself | The main economic effect should flow from Hormuz or Red Sea state, not from the strike |
| Inflation | 2026: energy drove over 40% of Q2 PCE inflation; CBO adds about 0.5 percentage points to PCE inflation in Q1 2027 vs pre-war [O: Roll Call, CNN] | Lag of one to three quarters | Energy price into CPI through the existing macro path |
| Defense spending and deficit | White House supplemental request $67.1 bn, of which CBO says nearly 37% is not directly war-related [O: Roll Call] | Appropriation cycle | Via the existing `warOutlayShare` path |
| Markets, shipping | Hormuz shipping slowed to a standstill by Mar 1; Houthi blockade took oil above $100 in July 2026 [O-2] | Days | Conditional events |

### 6.4 Alliances and legal reaction

- **Partners targeted by the adversary's retaliation.** Iran struck Kuwait, UAE, Qatar, Bahrain, Saudi Arabia and Oman in 2026; deaths are small per country (Kuwait 4 soldiers and 8 civilians; UAE 2 soldiers, 1 contractor, 13 civilians) but CRS says regional partners must weigh cooperation against the risk of retaliation [O: CRS R48887 summary via Bespacific; casualties O-2].
- **Great-power response.** Russia and China condemned the 2026 operations; neither directly involved itself in 2025 [O: CRS IN12662, IF13032]. China buys about 90% of Iran's oil exports (about 14% of China's imports) [O: CRS IF13032].
- **Congress.** War Powers notification, discharge motions and resolutions [O].

### 6.5 Population

- **Direct deaths** scale with duration and urban fighting (section 3.4).
- **Displacement.** At least 37 million across eight wars [O: Brown news page]. Lebanon stated over one million displaced (one-sixth of its population) in March 2026; UNICEF said hundreds of thousands in Iran by March 12 [O-2].
- **Indirect deaths** exceed direct ones by about 4:1 in Costs of War (3.6 to 3.8 million against over 940,000) [P] over two decades, via economy and health systems. A game stock with a slow flow.
- **Return flows**: over 70,000 Afghans returned in the first two weeks of March 2026, often forced [O-2].

## 7. Proposed strike and operation outcome model

No code. Equations are allowed. The model reads only fields the dataset carries or flags the gap.

### 7.1 Design principles

1. **Package, not nation.** Every outcome is computed from the committed package, not from `activeHeadcount`. The 90× gap in 6.1 is the cost of getting this wrong.
2. **Two layers of truth.** A true outcome (derived, seeded) and an observed outcome (lagged, with a bias by reporter).
3. **Staged pipeline.** Each stage has inputs and outputs, so a screen can show why a strike failed (intelligence, defense, hardness) rather than a single odds number.
4. **Derived, not drawn.** The central estimate of each stage is a function of state; a seeded draw adds variance, bounded. This matches the existing `war-attrition.ts` principle that two readers see the same band.
5. **Many small operations scale; large wars use the existing war tick.** Below a threshold of committed force, use the strike pipeline; above it, the war tick with a package-based base.

### 7.2 Inputs, by dataset field

Notation: A is the actor, T the target state, a subscript is a field read.

| Input | Symbol | Source field | Gap |
|---|---|---|---|
| Strike type | s | player choice (cruise, air, drone, raid, naval, cyber) | none |
| Target class | k | player choice (military fixed, mobile, leadership, infrastructure, dual-use, urban area, nuclear/WMD) | none |
| Aim point location | ℓ | city, site or zone in T | `city.ts` has population; `site.ts` and `zone.ts` exist and were not read; I did not verify a site carries hardness or depth |
| Population near aim point | ρ | `city.population`, `demography.urbanization` | land area or density per location not seen in the schemas I read; needed for ρ. Mark as a data gap |
| Package | N, mix | `orderOfBattle` units committed (`ForceUnit.count`) | only authored for tiered nations; tail nations use `branchStrength` and `militaryTier` |
| Availability | r_A | `military.readiness`, `ForceUnit.readiness` | none |
| Attacker quality | q_A | `doctrineQuality`, `branchStrength.*` | none |
| Munition class and stock | m, M | engine munitions stock (exists per VERIFY); class cost and yield [M] | per-class yield and accuracy are modeling parameters |
| Reach | d | distance from nearest base (`geo.lat/lon`, `basesAbroad`), `airliftCapacity`, `sealiftCapacity`, `geo.neighbors`, `geo.coastline` | basing locations by country not read in the schemas I examined |
| Defender air defense | D_T | `branchStrength.air`, `militaryTier`, `readiness`, air-defense batteries in `orderOfBattle` where authored | no explicit air-defense index or interceptor stock; derive from `branchStrength.air` and tier [M], mark as a gap |
| Defender intelligence | I_A, CI_T | `security.intelCapability` (A), `security.counterIntel` (T) | none |
| Target hardness | h | per target class, plus a per-site modifier | gap per site |
| Retaliation capacity | R_T | `branchStrength.*`, `arsenal`, `insurgencyPressure` (proxies), `geo.chokepoints` | proxy network not a field; use `insurgencyPressure` as a weak proxy [M] |
| Regime need to respond | L_T | `politics.legitimacy`, `regimeStability`, `factionalism` | none |
| Transparency of reporter | τ | `politics.pressFreedom` for the reporter's government | none |
| ROE | r | player choice (restrictive, standard, permissive) | none |
| Leader and commander traits | z | `leader.ts`, `leader-constraint.ts`, `person.ts` | traits are read there; the specific trait fields were not read in this pass |

### 7.3 Stages, equations, outputs

**Stage 1. Access and reach (gate).**
- Feasible if distance d ≤ range of the chosen delivery given basing, tanker or sealift, and any overflight limit. Otherwise the option is not offered or carries a delay and cost premium.
- Output: feasible (bool), lead time (days), premium cost multiplier.
- Speed: immediate for standoff weapons; weeks for sealift-dependent operations.

**Stage 2. Penetration (do weapons arrive).**
- Salvo N weapons against a defense with interceptors I and single-shot kill probability p_d: arrivals L = N · (1 − p_d · min(1, I / N)). This is the only place a saturation (Lanchester-like) shape is used. p_d scales with D_T and falls with salvo size and attacker electronic warfare.
- For manned aircraft: sortie loss probability per sortie = base_s · D_T · (1 − suppression), where suppression is the share of defenses already destroyed.
- Outputs: arrivals, aircraft lost, interceptors consumed on the defender's stock.
- Anchor: Shayrat 2017, 59 launched, 59 aim points, effective on soft targets; no attacker loss. Parameter p_d is [M] and should be fitted to 2025 and 2026 interception data when a primary source is opened.

**Stage 3. Intelligence (is the target where we think).**
- P_valid = clamp(a · I_A − b · CI_T + c · (target mobility penalty)). For a leadership or mobile target, P_valid also includes a presence term (is the person there in this window).
- Output: P_valid. An invalid strike still destroys what it hits, but the intended effect is lost, and collateral is produced.
- Anchors: 1998 Khowst missed bin Laden by a few hours; al Shifa intelligence uncorroborated [O: 9/11 Commission]. Nuclear material moved before the 2025 strike [S].

**Stage 4. Effect on target.**
- P_kill_target = 1 − exp(−w_m · L_eff / h_k), where L_eff = L · P_valid · yield-and-accuracy factor for munition m against target class k, and h_k is hardness (soft fixed, hardened, deeply buried, mobile).
- Output: damage fraction 0..1 on the target (not a bool), and a recovery time T_rec = T0_k · (damage fraction) / (repair capacity of T), with repair capacity from `economy` and `mobilizationCap`.
- Anchors: runway and jets at Shayrat, back in days; Iranian nuclear program, years. Recovery time is the better output.
- **Mission effect.** For a mission with a stated objective (stop an enrichment program, remove a leader), mission success is a separate function of damage and of what the target held (material moved, leader absent). Observed mission success lags (below).

**Stage 5. Collateral and civilian harm.**
- Expected civilian deaths E[C] = ρ_local · A_eff(m, L) · (1 − discrimination(s, I_A)) · ROE factor(r) + secondary effects (fire, utilities) when infrastructure is the target.
- ρ_local from `city.population` and urban share; A_eff is the area of effect of the munition class, an [M] parameter table.
- Outputs: true civilian deaths and injuries, civilian infrastructure damage index.
- Anchors for order of magnitude only: rural fixed camp with precision munitions, tens of deaths (1998: 20 to 30 total in the camps; a stray missile killed several people in a Pakistani village [O]); dense city campaigns, thousands (Mosul).
- Do not use a single civilian ratio. TBIJ's roughly 16% and HRANA's roughly 47% are outputs of different target mixes and densities.

**Stage 6. Friendly losses.**
- Aircrew and platforms: from Stage 2 (sortie losses × crew).
- Personnel on the ground: committed troops × exposure rate(s, intensity) × adversary effectiveness; for raids, a per-operation risk by target hardness.
- WIA are drawn as a multiple of KIA: 3.3 for a short high-intensity fight with good medical evacuation (Gulf War), 12 to 18 for counterinsurgency (OIF/OEF/OIR) [P from Table values above]; this is a parameter by operation type.
- Anchor: the 2026 war shows how a heavy standoff campaign yields few deaths and many injuries and equipment losses.

**Stage 7. Escalation and retaliation.**
- Retaliation probability P_ret = σ(α · provocation + β · L_T-need − γ · cost-of-retaliation + δ · R_T). Provocation = leadership killed, sovereign territory, civilian toll, symbolic site. L_T-need rises when legitimacy is low and falls when stability is high.
- Delay: drawn from 0 to 7 days with the mode at 1 to 5 days (Jun 23, 2025 after Jun 22; Jan 8, 2020 after Jan 3) [O].
- Size: proportionate and often chosen to be survivable. Both 2020 and 2025 retaliation killed no one on the US side [O]. When T's regime is existentially threatened (2026, supreme leader killed), the response is regional and sustained (strikes across the Gulf, shipping) [O: CRS IN12662, R48887].
- Output: retaliation event (target class, size, delay), and an escalation state for the pair.
- Nuclear states: a status gate. `arsenal.warheads > 0` caps the options and raises the political cost of certain target classes. This is a rule, not a probability.

**Stage 8. Political, legal and alliance reaction.**
- War Powers report within 48 hours (existing rule in the repo).
- Congress: vote pressure grows with duration, US casualties and polling.
- Allies: host-nation risk of retaliation; shifts alignment of partners that carry retaliation costs.
- Great powers: condemnation, aid to T, or restraint, from `alignment` with T.

**Stage 9. Opinion, economy, population.** Not a new writer. This model emits events and stocks; the existing systems read them.
- Opinion: via `warOpinionTerms` (rally, unease, casualties). Casualty drag uses (1 − expected success) per Feaver, Gelpi and Reifler; rally is conditioned on consensus and who started it (VERIFY item 11).
- Economy: oil price from chokepoint state, not from the strike; component ledger of costs into the war outlay path.
- Population: displacement and refugee stock for the target (and neighbors) driven by civilian harm and duration.

### 7.4 Outputs

| Output | Layer | Timing |
|---|---|---|
| Arrivals, aircraft lost | true | immediate |
| Target damage fraction and recovery time | true | immediate |
| Mission success (objective met) | true; observed lagged | observed 1 to 4 weeks later [M] with an uncertainty band |
| Enemy military casualties | true; observed band | immediate true; band widens with reporter distance |
| Civilian deaths and injuries | true; reported by actor | reported numbers differ by τ and by delay (Mosul: 352 vs 1,066 to 1,579 vs thousands) |
| Friendly KIA, WIA | true | WIA diagnoses can grow over weeks (34 to 109 in 18 days in 2020) |
| Munitions and interceptors drawn | true | immediate, replenished over years |
| Cost ledger | true | immediate, booked per component |
| Retaliation event | true | delay of days |
| Escalation state | true | persistent |
| Opinion, oil, inflation, displacement | via existing systems | per 6.2 to 6.5 |

### 7.5 Compression: immediate, lagged, distributed, conditional, modulated

| Effect | Form | Why |
|---|---|---|
| Penetration, damage, losses, munition draw | Immediate | Resolved the day of the strike |
| Mission-success assessment, casualty counts, civilian harm findings | Lagged and noisy | Bomb damage assessments and casualty counts take days to weeks and get revised (2020 TBI; 2025 nuclear sites; Pentagon 2026 revisions) |
| Retaliation | Lagged 0 to 7 days | Observed delays |
| Recovery of the target | Distributed | Days for runways, years for nuclear and missile industry |
| Insurgency, displacement, indirect deaths | Distributed | Years; Iraq year two roughly double year one |
| Munitions replenishment | Distributed | At least five years for interceptors (CBO) |
| Oil shock | Conditional | Only if a chokepoint or major supplier is hit; 2003 produced a brief spike, Hormuz 2026 a sustained one |
| Rally | Conditional | On who started it and whether the public starts opposed |
| Escalation to a regional war | Conditional | On provocation and the target's capacity and need |
| Hit probability, losses, civilian harm | Modulated by the President and commanders | A trait that changes ROE choice or planning quality shifts p_d, P_valid and discrimination by a bounded amount [M]; do not let a trait change a hard constraint (reach, stock) |

### 7.6 Scaling to 196 governments

- A **capability index** from existing 0..1 fields: C = w1·branchStrength (by domain) + w2·doctrineQuality + w3·readiness + w4·(log of budget scaled to the tier), with `militaryMetrics.forceIndex` as an existing aggregate where it is authored. The weights are [M].
- **Tier fallback:** nations without an authored order of battle use `militaryTier` and `branchStrength` to infer their defensive index D_T, retaliation capacity R_T and repair capacity. The dataset schema comment says only moved formations need the full depth.
- **Geography:** `geo.coastline`, `neighbors` and `chokepoints` set reach, and which neighbors are exposed to spillover.
- **Density:** `city.population` and `demography.urbanization` set ρ_local. A land-area field would complete it; I did not find one in the schemas read.
- **Rare nuclear status** is a boolean gate from `arsenal`.
- **Reporting transparency** from `pressFreedom` sets how far the observed outcome from that reporter differs from the truth.
- **Weak states** inherit generic defensive values from tier, so a strike on any of 196 governments resolves with the same code path.

### 7.7 Calibration series

| Quantity | Series | Source |
|---|---|---|
| US KIA, WIA by operation and ratios | Table in 4.2 | CRS RL32492 [O] |
| Troop levels and war cost by year | Iraq and Afghanistan | CRS RL33110 [O] |
| Civilian deaths by year | Iraq 2003 to 2005; cumulative 200,065 to 226,628 | IBC [O] |
| Civilian harm reporting gap | Mosul | Airwars [O] |
| Armed conflict thresholds | 25 battle-related deaths for conflict, 1,000 for war | UCDP [O: encyclopedia page, thresholds only] |
| Approval around events | 1991, 2003, 2001 | Gallup [O] |
| Oil and inflation | 1990 to 91 and 2003 supply loss; 2026 CBO | CRS RL31676, CBO via Roll Call [O] |
| Spending | 1949 to 2025 | SIPRI [O] |
| Readiness | USAF MC rates FY2022 to FY2024 | Air & Space Forces [O] |
| Nuclear forces | Jan 2024 | SIPRI YB24 [O] |
| Recent conflict series | UCDP GED v26.1, BRD v26.1 (BRD coverage stated 1989 to 2023 on the page) | UCDP downloads [O] |
| 2026 Iran war | Casualty, munition, cost series | Wikipedia [O-2], CBO via news [O] |

To open next (could not this pass): CBO's own report on the 2026 war, IISS Military Balance 2026, RAND MG965, NATO Libya fact sheets, DoD briefing transcripts for Midnight Hammer, Syria 2018 and Soleimani, Lancet 2006 and PLOS 2013 papers, and the Costs of War displacement paper. Until then, treat any figure tagged [S] as unverified.

## 8. Risks and what would change the recommendation

- **Failure mode of the proposal:** too many stages, each with fitted parameters, produce an outcome nobody can explain. Mitigation: each stage has one named input a screen can show; parameters live in one table.
- **Alternative:** a single odds table by (type, target class, defender tier). Cheaper, but it cannot answer the owner's requirement that location, population and state decide the result.
- **Verdict:** accepted with controls. Controls: package-based base before anything else (S0a), the observed-versus-true split from the first release, and every [M] parameter fitted to a case in section 7.7 before ship.
- **Data gaps that block full use:** land area or density per location; per-site hardness; air-defense and interceptor stock per nation; proxy network; per-class munition yield and cost.
