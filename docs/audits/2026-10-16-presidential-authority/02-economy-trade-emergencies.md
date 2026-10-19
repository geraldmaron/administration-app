# 02 · Economy, trade, sanctions, emergencies and spending: presidential authority review

Review date 2026-10-16. Read-only. No code, data or other doc was edited, and nothing was built or run. Every claim about the game cites the file and line it was read from on branch `codex/reconcile-worktrees-2026-10-14`. Every legal or historical claim cites a primary source I opened on 2026-10-16, listed at the end. Anything I could not open is marked UNCONFIRMED.

## Summary

I reviewed 45 player acts and decision options in this domain: tariffs and trade measures, the economic ladder (sanctions, freezes, embargoes), the IEEPA finding and blocked-asset order, the strategic reserve and fuel waiver, national-emergency and Stafford declarations, the state relief acts, the spending executive orders, the budget, the policy programs, the debt limit and stopgaps, and the Fed levers. Verdicts: **24 ACCURATE, 5 OVERSTATED, 8 MISFRAMED, 5 MISSING GATE, 3 UNDERSTATED.**

The fiscal side (shutdowns, the debt limit, revenue bills, price controls, the blocked-asset order, the §2808 construction order, Stafford major disasters) is careful and mostly right. The weak spots are where an act skips the statute it would really run on:

- **Tariffs.** The direct tariff is one rate on one category for one country, up to 100%, in force the same day. It has no statutory pathway: no §232 or §301 investigation, no §201 injury finding, no §122 15%/150-day cap, no §338 50% cap. It cites §301 whatever the goods are, and it books agencies with no tariff power (USDA, DOE, HHS, FDA) as the authority. Since the Supreme Court held on 2026-02-20 that IEEPA does not authorize tariffs, the real tariff power is exactly that set of statute-specific pathways.
- **The economic ladder.** Targeted sanctions, the asset freeze and the full embargo cite IEEPA but need no declared national emergency. The game's own blocked-asset order does need one, so the two paths disagree.
- **Emergencies.** A hazard-based "national emergency" does the work of a Stafford declaration. It even overrides a governor's consent, and its cost is framed as "International standing."
- **Missing powers.** Impoundment, rescission and deferral aren't modeled. A national-emergency declaration has no congressional termination path.
- **The Fed chair.** The game says the President cannot end the chair's term, as if that were settled. *Trump v. Cook* (2026-06-29), deciding a stay application rather than the merits, read the Federal Reserve Act to require cause and "notice and some opportunity to respond" before a governor is removed.

## How to read each entry

Every act below gives eight things:

1. **Act:** the id, where it's defined, and what the player can do.
2. **Law:** the legal basis.
3. **Procedure:** the real procedure and its limits.
4. **History:** notable precedents.
5. **Politics:** the political lens.
6. **Game:** what the engine and copy do today.
7. **Verdict.**
8. **Fix:** the change, labeled engine, copy, new act or new gate, with a severity.

Statute text was read from the GPO 2024 edition through the govinfo link service. Federal Register facts are from the federalregister.gov API. Supreme Court holdings are from the slip opinions and preliminary prints.

---

## A. Tariffs and trade

### T1 · Direct tariff ("Tariff on one kind of goods")

- **Act:** `imposeTariff(campaign, target, sector, rate)` at `packages/engine/src/trade.ts:373`. The option is labeled at `packages/player-core/src/act/catalogue.ts:134`. The player picks one partner, one of 24 tariffable categories and an additional whole-percent rate. The total on a pair is capped at 100% (`trade.ts:345,391-397`). The tariff is in force the week it's signed, with no end date. The only refusals are a non-tariff sector, no trade with that partner, and the 100% ceiling.
- **Law:** Art. I, §8 gives tariff power to Congress. The President acts only on a delegation:
  - Trade Expansion Act §232 (19 U.S.C. §1862): a Commerce investigation, a report within 270 days, a presidential decision within 90 days, action within 15 days, and a report to Congress within 30 days.
  - Trade Act §301 (19 U.S.C. §2411): a USTR investigation of one country's practices.
  - §201 (19 U.S.C. §2251): an ITC injury finding.
  - §122 (19 U.S.C. §2132): a balance-of-payments surcharge of at most 15% for at most 150 days unless Congress extends it.
  - Tariff Act §338 (19 U.S.C. §1338): up to 50% ad valorem against a country that discriminates against U.S. commerce, effective 30 days after the proclamation. §338(b) also allows exclusion from importation.

  **Settled, as of 2026-10-16:** *Learning Resources, Inc. v. Trump*, No. 24-1287, decided 2026-02-20 (6-3, opinion by the Chief Justice), holds that IEEPA does not authorize the President to impose tariffs.
- **Procedure:** Each pathway needs its own finding and fact record and carries its own caps and clocks. Challenges go to the Court of International Trade. Product scope is by HTSUS line, with exclusion processes. Only §122 and §338 apply by proclamation without an agency investigation, and each is capped.
- **History:**
  - 2018: §232 steel, Proclamation 9705, 83 FR 11625 (2018-03-15), then amended repeatedly. §301 China, USTR notice 83 FR 28710 (2018-06-20).
  - 2025: IEEPA tariffs, EO 14193, 14194 and 14195 (90 FR 9113-9121, 2025-02-07), and the reciprocal tariffs, EO 14257 (90 FR 15041, 2025-04-07). These were struck down in *Learning Resources*.
  - 2026-02-20: a §122 10% surcharge for 150 days from 2026-02-24, Proclamation 11012 (FR 2026-03824).
  - 2026: §232 actions on pharmaceuticals (Proc. 11020), metals (11021, 11032, 11045), aircraft (11040), polysilicon (11052) and drones (11055). A §201 safeguard on quartz surfaces (11051).
  - First modern §338 duties on Canada, announced 2026-07-23 and effective 2026-08-19. The proclamation numbers were not confirmed in the Federal Register (UNCONFIRMED).
  - USTR §301 actions on 60 economies, initiated 2026-03-12 with actions published 2026-07-28 (FR 2026-15274).
  - No further §122 document appears in the Federal Register after May 2026 (API search). Its statutory 150 days ran to 2026-07-24. Status after that: UNCONFIRMED.
- **Politics:** Tariffs are now routine for this office but legally exposed. The cost falls on importers, allies and the farm states hit by retaliation. Real process: USTR or Commerce investigations, comment periods, a proclamation, CIT litigation.
- **Game:**
  - The authority is the sector's agency, recorded only (`trade.ts:416`).
  - The help cites §301 for every tariff (`apps/player/src/world/law.ts:34,43`).
  - No investigation, clock, cap or court exposure. The control-plane audit found that trade measures have no court subject (`docs/audits/2026-10-16-control-plane/03-trade-and-economic-levers.md` §2.1).
  - The direct path also skips the `tariffCompetence` gate that ladder rung 2 applies (`instruments-economic.ts:132`).
- **Verdict:** **OVERSTATED.** One click imposes an unbounded, open-ended, country- and category-specific duty with no statutory predicate. After *Learning Resources*, no single authority grants that.
- **Fix (new gate, critical):** make the act "choose a tariff authority".
  - Each authority carries its own gate, clock and cap:
    - §232: Commerce investigation as a timed case (270 + 90 days), all countries, the national-security category only.
    - §301: a USTR investigation of one country (`Pursuit`/practice evidence), with consultations.
    - §201: an ITC finding, with relief lasting at most 4 years.
    - §122: all countries, at most 15%, at most 150 days unless Congress extends it.
    - §338: one country, at most 50%, effective 30 days after the proclamation, requiring a discrimination finding.
  - Each line shows its authority, and the CIT challenge is a court subject.
  - This also fixes the package design in control-plane 03 §5, which must carry the authority per line.

### T2 · The authority recorded on each tariff category

- **Act:** `TRADE_SECTORS[].authority` in `packages/engine/src/trade-sectors.ts:76-103`. Tariff categories name INST-USDA (crops, livestock), INST-DOE (crude, refined, gas), INST-HHS and INST-FDA (pharmaceuticals, devices), as well as USTR and Commerce.
- **Law:** Duties are proclaimed by the President under the statutes in T1. Investigations sit with Commerce (§232), USTR (§301), the ITC (§201), or nowhere (§122, §338). CBP collects them. USDA, DOE, HHS and FDA hold no tariff power.
- **Game:** The measure records the agency (`trade.ts:416`), and the Record and seals show it.
- **Verdict:** **MISFRAMED.** It teaches that agriculture or energy tariffs are set by those departments.
- **Fix (engine data, medium):** record the statutory pathway (§232 Commerce / §301 USTR / §201 ITC / §122 / §338 President) on the measure, not the sector's policy department. Keep the department as a "consulted" field if wanted.

### T3 · Tariff incidence, revenue, prices and retaliation

- **Act:** `tariffIncidence` (`trade.ts:245-297`): revenue net of volume lost, border and shelf pass-through, diversion, domestic gain, input-cost and employment effects, and a retaliation chance landing on a politically salient U.S. export four weeks later (`trade.ts:299-337,421-434,664-727`). Customs receipts are booked weekly (`trade.ts:349-360`). Household prices phase in over 26 weeks (`tariff-prices.ts`).
- **Law and history:** The importer pays the duty to CBP, so the revenue is real and federal. Partners have retaliated against U.S. tariffs, for example Canada after the 2025 actions; the 2026 §338 proclamations (2026-14997) recite Canada's 25% motor-vehicle tariff in force since 2025-04-09. The specific 2018 retaliation targets are UNCONFIRMED here because I didn't open a primary source for them.
- **Game:** The structure is faithful. Known defects, from control-plane 03 §4:
  - Booked receipts apply the volume fall twice and scale by collection share. The preview shows more revenue than gets booked, a DECISIONS §3.7 defect.
  - Expiry doesn't reverse the price move.
  - Employment and input-cost effects are computed but not shown.
- **Verdict:** **ACCURATE** in mechanism, with the bookkeeping defect already tracked.
- **Fix (engine, high, already proposed as control-plane P4/P5):** fix receipts and expiry. When T1 lands, add the statutory refund risk: *Learning Resources* left refunds open, and the dissent flags "refunds of billions of dollars".

### T4 · Lift a trade measure

- **Act:** `liftMeasure` (`trade.ts:609-652`). The player can lift any measure the administration imposed. It reverses the price move and thaws the relationship.
- **Law:** A President may terminate or modify his own proclamation actions under §232(c), §122 and §338. §301 actions are modified through USTR (19 U.S.C. §2417, not opened; UNCONFIRMED). IEEPA sanctions end by amending or revoking the executive order or by an OFAC license.
- **Verdict:** **ACCURATE**, with one exception. Congress-mandated sanctions can't be lifted by the President alone; see Missing capabilities 3.
- **Fix (new gate, low):** once statutory sanctions exist, mark them "lift needs certification or congressional review".

### T5 · Timed import suspension from a scenario reply

- **Act:** `temporaryImportSuspension` (`packages/engine/src/trade-effects.ts:116-123`), reached from a conversation commitment (`conversations.ts:589`). It bans all imports from one country for 1 to 365 days, as an "embargo" measure under INST-USTR.
- **Law:** A total import ban on a country runs on IEEPA §1702(a)(1)(B), "prevent or prohibit … importation", after a national emergency declared under §1701, or on Tariff Act §338(b) exclusion after a discrimination finding. USTR holds no such stand-alone power.
- **History:** IEEPA import bans include EO 14071's Russian investment and services bans (87 FR 20999, 2022-04-08). The 2026 §338(b) exclusions of Canadian products are Proc. 11061-11063 (2026-09-14).
- **Game:** No emergency or finding is required, and the authority is recorded as USTR.
- **Verdict:** **MISSING GATE.**
- **Fix (new gate, high):** require an active external emergency against that country (`activeExternalEmergency`, `external-emergency.ts:30`) or a §338 finding. Record OFAC/IEEPA or §338 as the authority. The scenario audit should refuse a reply that commits a suspension with no reachable predicate.

### T6 · Trade policy stance (continuity, open markets, managed trade, protective tariffs)

- **Act:** `STANCES` trade domain (`packages/engine/src/policy-catalog.ts:183-240`), enacted with `enactPolicy` (`policy-draft.ts:513`). It needs no statute: `REVENUE_STATUTES` lists only fiscal, and the comment at `policy-draft.ts:349-354` says tariffs are delegated to the President. The copy promises "Tariffs down, quotas gone" (open markets) and "A wall around domestic production" (protective).
- **Law:** The President can remove his own §232/§301/§122/§338 duties. He can't lower the statutory column-1 HTSUS rates or abolish statutory quotas without trade-agreement authority from Congress. The status of trade promotion authority after 2021 is UNCONFIRMED here (not opened). Raising a general "wall" requires the T1 pathways.
- **Game:** Each stance moves growth, inflation and diplomatic reach every week. None of them touches `TradeMeasure`s, and "Protective tariffs" exists alongside the tariff act without either reading the other.
- **Verdict:** **MISFRAMED.** The stance claims tariff outcomes the office can't produce by announcing a posture.
- **Fix (copy plus engine, medium):** reframe the stances as negotiating and enforcement postures, such as "Enforce and investigate" or "Negotiate sector deals". Derive any tariff effect only from measures actually in force. Retire "Tariffs down, quotas gone".

### T7 · Trade agreement offered as a Senate-ratified treaty

- **Act:** `TREATY_TERMS.trade` (`packages/engine/src/treaties.ts:83-91`): "Tariff schedules bound at their current levels", binding on Senate ratification.
- **Law and history:** Modern U.S. free-trade agreements are approved and implemented by an implementing statute passed by both chambers, not by two-thirds of the Senate. The USMCA Implementation Act is an example (not opened; UNCONFIRMED here). The registry has no record for this route.
- **Game:** Only the Senate count is forecast. Control-plane 03 §4.3 found that no tariff path reads the bound schedule.
- **Verdict:** **MISFRAMED.** The ratification route and the binding effect are both wrong.
- **Fix (engine plus copy, medium):** add a congressional-executive agreement route (an implementing bill on the legislative path). Make tariff lines against an agreement partner show a breach. This belongs with the treaties reviewer: flag it there.

---

## B. Sanctions, embargoes, export controls

### S1 · Economic rung 1, Trade Advisory

- **Act:** `economicRungs[0]` (`packages/engine/src/instruments-economic.ts:116-125`): a small trade-dependence nudge. It cites Art. II §1 (`law.ts`).
- **Law and politics:** Business advisories and public warnings are routine executive speech (State, Commerce, Treasury).
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### S2 · Economic rung 3, Targeted Sanctions / export control

- **Act:** `instruments-economic.ts:135-161`. The engine picks the kind: an export control if the partner buys licensed goods, sanctions otherwise (`trade.ts:494-505`). Gates are a trade channel and reserves of at least 2000. The help cites IEEPA and the NEA (`apps/player/src/world/law.ts:16`).
- **Law:**
  - IEEPA powers "may only" be exercised against an "unusual and extraordinary threat" with its source abroad, "if the President declares a national emergency with respect to such threat" (50 U.S.C. §1701(a)).
  - §1702(b) exempts personal communications, donations of humanitarian articles and informational materials.
  - Export controls run on the Export Control Reform Act (50 U.S.C. §4811 et seq.; §4813 opened), administered by Commerce and BIS. They need no emergency.
  - Many country programs are now also congressionally mandated. A recent example is Pub. L. 119-111 (2026-09-18), "to impose sanctions and other measures with respect to the Russian Federation".
- **History:** EO 13224 (terrorism, 66 FR 49079, 2001), EO 13660 (Ukraine, 79 FR 13493, 2014), EO 14071 (Russia, 2022). Each is a declared emergency.
- **Politics:** Routine and bipartisan. OFAC designates, issues general licenses, and carries enforcement and allied-coordination costs.
- **Game:** No declaration is required, and the export-control branch is labeled as IEEPA.
- **Verdict:** **MISSING GATE.**
- **Fix (new gate, high):**
  - Sanctions need an active external emergency over the target (reuse `activeExternalEmergency`).
  - Split export control into its own act under ECRA. Add an `export-control-reform-act` registry record and change `law.ts` for this rung.
  - Fix the per-turn id collision for non-rate measures (`trade.ts:537`, control-plane 03).

### S3 · Economic rung 4, Asset Freeze

- **Act:** `instruments-economic.ts:162-179`. Gates are a trade channel and GDP of at least 20,000. It cuts target reserves by 15% and writes an asset-restriction measure.
- **Law:** The same law as S2: blocking under §1702(a)(1)(B) requires the declared emergency.
- **Game:** The engine already has the correct version. `order-asset-seizure` (`packages/engine/src/orders.ts:267-287`) requires an active external emergency over the named owner (`order-subjects.ts:155-157`; `blocked-assets.ts:38-45`). It's released when the order or the emergency ends (`blocked-assets.ts:55-71`). The ladder rung does the same thing with no emergency.
- **Verdict:** **MISSING GATE.** Two paths do the same blocking, one lawful and one not.
- **Fix (engine, high):** retire rung 4 for the player and route it to `order-asset-seizure`, or gate it identically. Keep the rung for other governments.

### S4 · Economic rung 5, Full Embargo

- **Act:** `instruments-economic.ts:180-229`. It cuts trade both ways, writes the `embargo:` flag, opens a standing enforcement program, and hits the actor's own exports. Gates are reserves and exports of at least 5000, and no embargo already standing.
- **Law:** A comprehensive embargo runs on IEEPA (after a declaration) or on a specific statute, and comprehensive programs are often later codified by Congress. Humanitarian exceptions apply under §1702(b)(2).
- **Verdict:** **MISSING GATE.** The emergency predicate is absent, and the humanitarian exceptions aren't shown.
- **Fix (new gate plus copy, high):** require the external emergency. Show in the review that food, medicine and informational materials keep moving under §1702(b) by law.

### S5 · Block a hostile government's assets (order)

- **Act:** `orders.ts:267-287`, with subject and refusal logic at `order-subjects.ts:137-140,155-157`. It needs an active IEEPA external emergency against the owner and a modeled U.S.-custodied account. Ownership doesn't change. It's released when the order or the emergency ends.
- **Law:** IEEPA §1702(a)(1)(B) and §1701(a), as quoted in the order's own `limit`.
- **Verdict:** **ACCURATE.** This is the model the ladder should copy.
- **Fix:** none.

### S6 · Declare an external-threat emergency (the IEEPA finding)

- **Act:** `declareExternalEmergency` (`packages/engine/src/external-emergency.ts:41-71`), reached from `apps/player/src/nation/policy/OrderFollowups.tsx`. It's allowed only over an overt foreign "pursuit" against the United States: at least rung 2, commitment of at least 0.4, active within 2 weeks (`:17-28`). It expires after 52 turns (`:7`), and nothing renews it.
- **Law:** §1701(a) threat findings cover national security, foreign policy or the economy, and can rest on non-state actors and conduct, not only a government's campaign. The emergency continues under NEA §1622(d) by annual notice. Many programs have run for decades.
- **History:** EO 13224 targets persons, not a government. COVID was declared under the NEA (Proclamation 9994, 85 FR 15337).
- **Game:** It's narrower than the law in two ways: it can only be declared against a government, and it can't be continued.
- **Verdict:** **UNDERSTATED.** These are lawful and routine powers the game withholds.
- **Fix (engine, medium):**
  - Add `continueExternalEmergency` using the same 90-day pre-anniversary window as `renewEmergency` (`emergency.ts:226-247`).
  - Allow findings over threats tied to non-state networks once the world models them; keep it refused until then.
  - Add the §1703 report to Congress as a recorded obligation.

---

## C. Commodity and reserve acts

### C1 · Release the Strategic Petroleum Reserve

- **Act:** `releaseStrategicReserve` (`packages/engine/src/commodity-levers.ts:70-99`), priced by `projectReserveRelease` (`:50-63`). It always sells 45% of the opening fill over 26 weeks. It's refused if a release is already flowing, the fill is below 0.45, or there's no "severe interruption" (crude at least 1.1 times its norm, or a supply shock). The label is "Release the Strategic Petroleum Reserve" (`packages/player-core/src/economy/market-levers.ts:38-44`), with no citation.
- **Law:** EPCA §161 (42 U.S.C. §6241).
  - A full drawdown requires a presidential finding of a "severe energy supply interruption" or international energy program obligations, §6241(d). The finding is deemed met where an emergency produces a significant supply reduction, a severe price increase, and a likely major adverse impact on the economy.
  - A limited drawdown needs no such finding: at most 30,000,000 barrels, at most 60 days, and not below 252,400,000 barrels stored, §6241(h).
- **History** (DOE release history): 17.3 MMbbl (1991), 11.0 (2005 Katrina), 30.6 (2011 IEA), 180.0 (2022 IEA, announced 2022-03-01). Exchanges and loans include 2017 Harvey (5.2) and 2021 Ida (3.3).
- **Politics:** Common for both parties in supply shocks. The costs are depletion and refill criticism.
- **Game:** The finding gate is faithful. Missing: the limited drawdown, exchanges or loans, IEA coordination, a size choice, and the citation DECISIONS §8.12 requires.
- **Verdict:** **UNDERSTATED.**
- **Fix (engine plus copy, medium):**
  - Add size (a limited drawdown up to 30 MMbbl/60 days without the finding; a full drawdown with it) and an exchange option.
  - Add an `epca-spr` registry record (42 U.S.C. §6241) and cite it in `market-levers.ts`.
  - The "refill takes an appropriation" copy (`commodity-levers.ts:52`) is partly true. DOE's acquisition rules exist (EPAct 2005 §301(e), per the DOE page), but buying needs funds. Keep the copy and add that a refill is possible with funds.

### C2 · Issue an emergency fuel waiver

- **Act:** `issueFuelWaiver` (`commodity-levers.ts:116-145`). It's allowed when the pump is at least 1.1 times the oath price or crude is in "severe interruption". It lasts 20 **weeks**, costs standing of -0.005, and the narration reads "The administration issues". It cites nothing.
- **Law:** Clean Air Act §211(c)(4)(C)(ii)-(iii) (42 U.S.C. §7545):
  - The EPA **Administrator**, after consultation with and concurrence by the Secretary of Energy, finds "extreme and unusual fuel or fuel additive supply circumstances". These must stem from a natural disaster, an act of God, a pipeline or refinery failure, or another unforeseeable event.
  - The waiver must cover the smallest area necessary and is effective for "20 calendar days". Repeated waivers are possible (history not opened; UNCONFIRMED).
- **Game:** A price level alone triggers it, at national scope, for 20 weeks, as the President's act.
- **Verdict:** **MISFRAMED.** The lever is real but its trigger, duration, scope and actor are wrong.
- **Fix (engine plus copy, medium):**
  - Trigger on a supply shock, not on price.
  - Make it 20 days with renewal, as an EPA act the President directs.
  - Add a registry record for 42 U.S.C. §7545(c)(4)(C).

---

## D. National emergencies, disasters and their acts

### E1 · Declare an emergency over a running condition (nation or one state)

- **Act:** `declareEmergency` (`packages/engine/src/emergency.ts:152-184`), on the board at `packages/player-core/src/emergency/emergency-choices.ts:61-86`. It's refused without a live condition there or if one is already declared. It costs standing that compounds weekly (`emergency.ts:25-37,265-268`). It lapses after 52 weeks unrenewed.
  - What it does: it makes states "consent" to a federal response and sets the federal posture to "surge" (`packages/engine/src/response.ts:257-277`).
  - The glossary says declaring "lifts it to full effort" (`packages/player-core/src/glossary/world.ts:357`).
  - The board prices it as "International standing … a week" (`emergency-choices.ts:59`).
- **Law:**
  - The NEA (50 U.S.C. §1621-1622) is a procedure for activating standby statutory powers. It must name each power used (§1631, per the registry), and Congress may end a declaration by joint resolution (§1622(a)).
  - It gives no power over a state's government and no disaster money. Federal disaster response to a hazard runs on Stafford: a governor's request for a major disaster (42 U.S.C. §5170) or an emergency (§5191(a)), or a presidential emergency declaration where the emergency is a primary federal responsibility (§5191(b)).
  - A "state-scoped national emergency" is not an instrument the NEA describes. The state-level instrument is a Stafford declaration.
- **History:**
  - COVID-19 was declared both under the NEA (Proclamation 9994, 2020-03-18) and under Stafford.
  - The 2019 southern-border emergency (Proclamation 9844, 84 FR 4949) was terminated in 2021 (Proclamation 10142, 86 FR 7225).
  - The Supreme Court stayed an injunction against its funding transfers (*Trump v. Sierra Club*, No. 19A60, 2019-07-26) because the plaintiffs likely lacked a cause of action under §8005.
- **Politics:** NEA declarations are common: dozens stand at once, most of them sanctions programs. The domestic cost is Congress, the courts and the press, not foreign standing.
- **Game:** The NEA is used as a disaster-response switch that overrides state consent.
- **Verdict:** **MISFRAMED.** The mechanics conflate two statutes, and the cost is labeled as a foreign-relations cost.
- **Fix (engine plus copy, high):**
  - A hazard declaration at state scope becomes a Stafford §501 emergency or §401 major disaster: request-driven, with §501(b) as the only unrequested path.
  - Keep the NEA for activating named standby powers (§2808, IEEPA, and so on), with the powers listed on the proclamation.
  - Remove the "states consent" effect: a declaration never conscripts a state's agencies.
  - Relabel the cost as standing with Congress and the public, not "International standing".

### E2 · Renew (continue) a declaration

- **Act:** `renewEmergency` (`emergency.ts:226-247`). It's open in the 13 weeks before the anniversary and published as a notice.
- **Law:** §1622(d) ends an emergency on its anniversary unless the President publishes a continuation notice in the Federal Register and transmits it to Congress within the 90 days before. That's as the registry states it; the opened §1622 text covers (a)-(c), and (d) is inferred from the registry. Its wording wasn't re-read and it is UNCONFIRMED here.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### E3 · End a declaration

- **Act:** `endEmergency` (`emergency.ts:204-218`).
- **Law:** §1622(a)(2), termination by proclamation. Actions taken and pending proceedings survive termination (§1622(a)(A)-(C)).
- **Game:** It ends the declaration. The congressional termination path in §1622(a)(1), and the six-month review under §1622(b) ("each House … shall meet to consider a vote"), are not modeled. The only congressional check is a general limitation act (`legislative-acts.ts:335-345`).
- **Verdict:** **ACCURATE** for the President's act. Congress's path is listed under Missing capabilities 7.
- **Fix:** see Missing capabilities 7.

### E4 · Declare an armed-forces national emergency

- **Act:** `declareArmedForcesEmergency` (`emergency.ts:187-201`). National scope only, and only over an active conflict involving the United States.
- **Law:** 10 U.S.C. §2808(a) applies "in the event of a declaration of war or the declaration by the President of a national emergency in accordance with the National Emergencies Act … that requires use of the armed forces". The 2019 border declaration invoked it without a war. Whether that qualified was litigated, and the merits were not decided by the Supreme Court; the stay order above addresses only §8005.
- **Verdict:** **ACCURATE.** It's narrower than the statute, defensibly so for a game, since the contested non-war use is the extraordinary case.
- **Fix (copy, low):** say in help that a non-war declaration "requiring the armed forces" is legally possible but contested, and cite the 2019 episode.

### E5 · Build under the emergency construction authority (§2808)

- **Act:** `order-emergency-construction` (`packages/engine/src/order-families.ts:206-226`). It requires an armed-forces declaration tied to an active conflict, plus unobligated money from a named military-construction project (`order-subjects.ts:62-72,175-177`). It records a notice (`order-subjects.ts:28`). Its overreach of 0.55 is the highest in the catalog.
- **Law:** §2808(a)-(b) as quoted, including funds limited to unobligated military-construction money.
- **History:** 2019 border projects; terminated and redirected by Proclamation 10142 (2021).
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### E6 · Declare a Stafford major disaster

- **Act:** `declareStaffordDisaster` (`packages/engine/src/stafford.ts:18-38`). It needs a governor's request on file over a live acute condition in the state, with a beyond-capacity finding, a response plan, committed state resources and accepted cost sharing.
- **Law:** 42 U.S.C. §5170: the governor's request rests on a finding that "effective response is beyond the capabilities of the State" and requires the state's emergency plan to be executed.
- **Politics:** Routine. Approvals and denials are both common, and denials are politically noticed.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### E7 · Direct relief to the affected regions (order)

- **Act:** `order-relief-program` (`orders.ts:288-314`). It needs a Stafford declaration **and** an enacted `act-disaster-recovery` with unallocated authority (`order-subjects.ts:94-125,168-171`).
- **Law:** Once a major disaster is declared, FEMA obligates from the Disaster Relief Fund, a standing no-year appropriation. The game's own `locale-acts.ts:84-86` comment says so. A supplemental is needed only when the fund runs short.
- **Game:** No relief flows from a declaration until Congress passes a recovery act.
- **Verdict:** **UNDERSTATED.**
- **Fix (engine, medium):**
  - Model a Disaster Relief Fund balance that a declaration draws on immediately.
  - Make `act-disaster-recovery` the refill (a supplemental request), not the precondition.
  - Price per DECISIONS §6.16.

### E8 · State act "Direct federal relief"

- **Act:** `LOCALE_ACTS.relief` (`packages/engine/src/locale-acts.ts:73-87`): about $6.9B to one state "ahead of the ordinary appropriation". It needs **no declaration** (`needsDeclaration: false`). It's allowed **without a request**, at a standing cost (`:245-262`).
- **Law:** Stafford assistance flows only under a declaration (§5170 or §5191). The only unrequested path is §5191(b), a primary federal responsibility. Obligating billions outside an appropriation's purpose or a declaration runs into the Antideficiency Act and the purpose statute (registry `antideficiency-act`).
- **Verdict:** **OVERSTATED.**
- **Fix (new gate, high):** require a Stafford declaration reaching the state, or a §5191(b) federal-responsibility finding. Draw on the fund from E7. Keep "unrequested" only through §5191(b), with its narrow predicate shown.

### E9 · State act "Grant a regulatory waiver"

- **Act:** `LOCALE_ACTS.waiver` (`locale-acts.ts:159-169`). Generic, with no predicate and no citation.
- **Law:** Real disaster waivers each have their own statute and predicate: the CAA fuel waiver (C2), HHS §1135 waivers, and FMCSA hours-of-service and Jones Act waivers. The predicates of the last three were not opened; UNCONFIRMED.
- **Verdict:** **MISSING GATE.** It also fails DECISIONS §8.12's citation rule.
- **Fix (copy plus new gate, low):** name the waiver family per condition kind, with its citation, and require the predicate that statute names.

### E10 · State act "Order a federal review"

- **Act:** `LOCALE_ACTS.review` (`locale-acts.ts:170-180`). It defers relief claims by 3 weeks.
- **Law and politics:** An internal executive review is within the office (Art. II §3, take care).
- **Verdict:** **ACCURATE.**
- **Fix:** none.

Out of scope here and flagged for the security reviewer: Guard request and federalization, "Surge federal agents", "Send in active-duty troops" (refused at `locale-acts.ts:213-218`), and the `civil-emergency-powers` stance (`policy-catalog.ts:292-296`).

---

## E. Executive orders with spending effects

### O1 · Freeze prices and wages

- **Act:** `order-price-controls` (`orders.ts:233-266`). Closed until Congress enacts authority (`needsCongress`).
- **Law:** The Economic Stabilization Act of 1970 lapsed in 1974, per the registry (`records-security.ts:269-281`). The PDF was not re-opened; BL-166 lists it.
- **Verdict:** **ACCURATE.** The game refuses honestly.
- **Fix:** none.

### O2 · Put defense contracts first (DPA)

- **Act:** `order-defense-production` (`order-families.ts:180-205`). It's gated on an outstanding precision-fires order, a live defense appropriation, and no existing priority contract (`orders.ts:403-411`).
- **Law:** DPA §101(a) (50 U.S.C. §4511) covers priority and allocation; seizure is not included. **Sunset, as of 2026-10-16:** §4564(a) as printed in the 2024 Code reads 2025-09-30. P.L. 119-37 moved it to 2026-01-30, and P.L. 119-60 (FY2026 NDAA) moved it to 2026-09-30 (CRS IN12484, 2026-02-12). Pub. L. 119-103 §2004 moved it to **2026-12-11**. The priorities authority falls under the sunset.
- **Verdict:** **ACCURATE.**
- **Fix (new gate plus registry, low):** carry the sunset as a dated law fact. If the game's calendar passes a lapse with no extension, refuse with "the Defense Production Act's priorities authority has lapsed". Update the registry `limits` text (BL-166 item).

### O3 · Tighten border controls (spending side)

- **Act:** `orders.ts:204-232`. About $5.5B, checked against `obligationAvailability` (`orders.ts:432-436`). Done through rulemaking.
- **Verdict:** **ACCURATE** as a spending matter. The immigration substance is the borders reviewer's.
- **Fix:** none.

### O4 · Condition a federal grant

- **Act:** `order-grant-conditions` (`order-families.ts:117-139`). Only for an enacted program's statutory conditions (`order-subjects.ts:52-60`). Overreach is 0.4.
- **Law:** 2 C.F.R. §200.211, plus the spending-clause rule that conditions must trace to the statute (the registry record).
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### O5 · Federal purchasing to clean power, and the purchase follow-up

- **Act:** `order-clean-energy` (`order-families.ts:160-179`, 40 U.S.C. §121(a)); `buyFederalCleanPower` (`clean-power-purchasing.ts:54`), which is appropriation-gated per the order copy.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### O6 · Plan an offshore lease sale, and the sale follow-ups

- **Act:** `order-energy-leasing` (`order-families.ts:140-159`, 43 U.S.C. §1344); `offshore-leasing.ts:113`.
- **Verdict:** **ACCURATE.** The source link still points at boem.gov (BL-165).
- **Fix:** none beyond BL-165.

---

## F. Budget, policy programs and fiscal legislation

### B1 · Request an appropriation (the budget draft)

- **Act:** `requestAppropriation` (`packages/engine/src/appropriation.ts:185-247`). The President sets every account's share. Congress votes each **changed** account up or down. Carried lines enact at exactly the President's number; refused lines stay at the prior year's.
- **Law:** The President submits a budget no later than the first Monday in February (31 U.S.C. §1105(a)). Congress writes and passes appropriations bills (Art. I §9 cl. 7), usually at its own numbers, and presents them for signature or veto.
- **Game:** Congress can only accept or reject the President's figure. It never writes its own number, and there's no signature or veto step.
- **Verdict:** **OVERSTATED.** The President effectively sets appropriation amounts.
- **Fix (engine, medium):**
  - Congress counter-proposes per account toward its own preference (party control and committee chairs).
  - The enacted book is that counter-offer, presented to the President to sign or veto (reuse `legislation.ts` sign and veto).
  - Show the §1105 deadline as a clock.

### B2 · Ask Congress for a budget resolution (reconciliation instruction)

- **Act:** `requestBudgetResolution` (`packages/engine/src/reconciliation.ts:44`).
- **Law:** Congressional Budget Act §310 (2 U.S.C. §641), as in the registry. The resolution is concurrent and never presented to the President, so the President asks and Congress adopts.
- **History:** The debt-limit increase in the 2025 reconciliation act (Pub. L. 119-21 raised the limit by $5,000,000,000,000 through reconciliation).
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### B3 · Fiscal policy programs (consolidation, public investment, redistribution)

- **Act:** `policy-catalog.ts:62-120`. Gated by `revenueStatuteRequired` (`policy-draft.ts:361-410,421-433`), which routes a left-leaning stance to `act-tax-fairness-and-revenue` and a right-leaning one to `act-tax-relief-and-growth`.
- **Law:** Revenue bills originate in the House (Art. I §7). Spending programs need appropriation or authorization, and austerity needs appropriations cuts or caps.
- **Game:** The gate is right in kind but maps to the wrong statute. "Public investment" waits on a tax bill, and "Consolidation" (departmental cuts) waits on a tax-cut bill.
- **Verdict:** **MISFRAMED.**
- **Fix (engine data, medium):** route investment to an appropriation or authorization act and consolidation to a caps act (`act-fiscal-responsibility` exists, at `legislative-acts-fiscal.ts:137`). Keep the revenue bills only for the tax stances.

### B4 · Industry program "Energy transition"

- **Act:** `policy-catalog.ts:155-163`. Spends 0.9% of output a year (`perTurn.treasuryOfGdp: -0.009`, prorated weekly per `policy.ts:316-330`), about $250B a year at U.S. scale. The industry domain has no statute gate (`REVENUE_STATUTES` is fiscal only, `policy-draft.ts:361-363`).
- **Law:** Spending at this scale needs appropriations (Art. I §9 cl. 7). Executive purchasing and grant direction (O4, O5) can only spend what Congress has provided.
- **Verdict:** **OVERSTATED.**
- **Fix (new gate, high):** require an enacted authorization or appropriation act for any stance with a recurring `treasuryOfGdp` outlay. Otherwise limit the stance to the executive levers already modeled (purchasing, leasing).

### B5 · Industry program "Strategic nationalization"

- **Act:** `policy-catalog.ts:165-180`: "The commanding heights taken into public hands." No statute gate.
- **Law:** No statute lets a President take private industry. *Youngstown Sheet & Tube Co. v. Sawyer*, 343 U.S. 579 (1952) (registry record) struck down a presidential seizure of steel mills. The DPA record says it "gives no power to seize or run a private plant". The Takings Clause would require compensation.
- **Verdict:** **OVERSTATED.** It's a plain button for an act the Supreme Court has held unlawful for the President alone.
- **Fix (new gate, critical):** make it `needs-act` like price controls: closed until Congress enacts a nationalization statute, with the card citing *Youngstown*. Alternatively, recast it as a negotiated government equity stake in a firm that agrees, which would need its own legal basis and is UNCONFIRMED here, or remove it.

### B6 · Industry program "Extractive expansion"

- **Act:** `policy-catalog.ts:138-153`: licenses issued and output raised.
- **Law:** Federal leasing and permitting are executive levers within OCSLA and the Mineral Leasing Act (the OCSLA record). Private output responds to markets.
- **Verdict:** **ACCURATE** as a posture. It already pairs with O6.
- **Fix:** none.

### B7 · Debt limit increase and debt-limit deal; the binding limit

- **Act:** `act-debt-limit-increase` (`legislative-acts-fiscal.ts:211-245`, reconciliation track) and `act-debt-limit-deal` (`:246-272`); the limit's record in `packages/engine/src/debt-limit.ts`.
- **Law:** 31 U.S.C. §3101 (registry). Only Congress raises the limit.
- **History:** Pub. L. 118-5 (2023) raised it, as referenced in the 2025 act's text. Pub. L. 119-21 (2025-07-04) raised the limit by $5 trillion through reconciliation.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### B8 · X-date: "pays the interest first and withholds everything else"

- **Act:** `debt-limit.ts:9-20,278-281`.
- **Law and practice:** No statute authorizes the Treasury to prioritize payments. Whether it may is contested, and Treasury officials have described prioritization as unworkable. I did not open the Treasury and GAO sources for this: UNCONFIRMED.
- **Verdict:** **MISFRAMED.** It presents a contested choice as the settled default.
- **Fix (copy plus new act, low):** make prioritization a presidential decision at the X-date, against delaying all payments. Show counsel's caution, and the legal risk under the Fourteenth Amendment §4 debate (flagged contested; not opened).

### B9 · Continuing resolutions, full-year CRs, shutdowns

- **Act:** `legislative-acts-fiscal.ts:162-210`; `funding.ts` (`inShutdown`, excepted work).
- **Law:** The Antideficiency Act, 31 U.S.C. §1341-1342 (registry). A CR is an appropriation and needs a Senate cloture majority.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

### B10 · Revenue bills and the Fiscal Responsibility Act

- **Act:** `legislative-acts-fiscal.ts:137-161,274-330`.
- **Law:** Art. I §7 origination; caps by statute.
- **Verdict:** **ACCURATE.**
- **Fix:** none.

---

## G. Monetary acts

### M1 · Press the Fed to cut / to hold

- **Act:** `leanOnTheFed` (`packages/engine/src/monetary-acts.ts:36-91`). Once per meeting. It tilts the next meeting's weights by at most 0.05, costs 0.02 standing, and adds a credibility premium to the rate. The copy says the size of the nudge is the game's estimate (`market-levers.ts:52`).
- **Law:** Public comment is lawful. The Board sets policy independently (12 U.S.C. §§241-242, registry).
- **Politics:** It breaks a norm. Every President in the record has commented, but public pressure campaigns are notable. The market reaction is a planning value. No citation is shown.
- **Verdict:** **ACCURATE.**
- **Fix (copy, low):** cite `federal-reserve-board` on the lever per DECISIONS §8.12.

### M2 · Issue a monetary directive to the Fed

- **Act:** The directive kinds include `monetary` (`packages/engine/src/directives.ts:55,161`). The Fed answers with a refusal memorandum citing §§241-242 (`directives.ts:226-233`).
- **Verdict:** **ACCURATE.** It's shown honestly as a refused instruction.
- **Fix:** none.

### M3 · Remove the Fed chair or a governor

- **Act:** `removeOfficer` (`packages/engine/src/career-incumbents.ts:276-300`) reads `offices[0]`, which for INST-FED is the chair, marked `term-protected` (`packages/engine/src/institution-catalog.ts:599-608`). The result is "held for a fixed term. The President cannot end it." The governor seat (for-cause) is unreachable because only the leader is modeled.
- **Law, as of 2026-10-16:**
  - §242: governors serve 14-year terms "unless sooner removed for cause by the President". The chair is designated for 4 years, and the statute is silent on removal from the chair.
  - *Trump v. Cook*, 609 U.S. 528 (2026-06-29), denied the stay 5-4 (Roberts, C.J.; Thomas, Alito with Gorsuch, and Barrett dissenting). It rests on the statute, not the Constitution, and it is a stay ruling, so the merits can still move. It reasons:
    - A cause determination is judicially reviewable.
    - "Cause" requires a substantial threshold tied to the seriousness of the misconduct and its nexus to duties.
    - The statute required "notice and some opportunity to respond" before removal. It does not require a formal hearing.
  - *Trump v. Slaughter*, 609 U.S. 422 (2026-06-29), held the FTC's for-cause protection unconstitutional. It expressly left the Federal Reserve as a possible exception.
- **Game:** It presents chair tenure as absolute and settled, and offers no governor removal at all.
- **Verdict:** **MISFRAMED.**
- **Fix (new act plus copy, medium):**
  - Add "Remove a governor for cause" as a gated act: a stated cause, then notice and a chance for the governor to respond as a timed step, then removal.
  - Show counsel's objection and certain litigation, with the outcome reading the *Cook* standard (serious misconduct with a nexus to duties). It should never be a plain button.
  - Copy for the chair: "The statute says nothing about removing a chair; the question is unsettled."

### M4 · Nominate Fed governors and designate the chair

- **Act:** Fixed-term seats on the seat calendar (`packages/engine/src/seat-calendar.ts:23-50`), filled through the nomination desk.
- **Law:** §241-242, Senate confirmation (registry).
- **Verdict:** **ACCURATE**, UNCONFIRMED in a run.
- **Fix:** none.

---

## Critical capabilities missing

1. **Statutory tariff pathways as distinct acts** (critical).
   - Basis: §232, §301, §201, §122, §338 (19 U.S.C. §§1862, 2411, 2251, 2132, 1338).
   - Precedent: every 2018-2026 action in T1. After *Learning Resources* these are the President's only tariff powers.
   - Why the player needs it: the choice among them (speed, caps, scope, legal risk) is the real decision.
2. **Tariff relief and exemptions** (medium).
   - Basis: 19 U.S.C. §1318(a), duty-free import of relief supplies in a proclaimed emergency.
   - Precedent: Proc. 11038 (2026-07-02), duty-free phosphate fertilizer from Morocco under §318(a). Product exclusions under §232 and §301.
   - Why: lowering costs during a shock is a lever presidents use.
3. **Sanctions programs with designations, licenses and statutory mandates** (high).
   - Basis: IEEPA §1702 and NEA, and congressionally mandated sanctions such as Pub. L. 119-111 (2026-09-18).
   - What the act needs: designate persons, sectors or a government under a declared emergency; issue a general license (humanitarian carve-outs); and meet statutory mandates that limit the President's ability to lift them.
4. **Export controls under ECRA** (high).
   - Basis: 50 U.S.C. §4811 et seq.
   - Why: it's a separate act from sanctions, needs no emergency, and covers entity listings and technology denial. Today it hides inside rung 3.
5. **Rescission and deferral under the Impoundment Control Act** (high).
   - Basis: 2 U.S.C. §§683-684, quoted:
     - A rescission special message lets the President withhold funds, but they "shall be made available … unless, within the prescribed 45-day period, the Congress has completed action".
     - A deferral is allowed only for contingencies or efficiency, or as provided by law, and never to carry out a policy.
   - Precedent, as of 2026-10-16:
     - Rescissions Act of 2025, Pub. L. 119-28 (2025-07-24), the first successful ICA rescission since 1992 (CRS LSB11374).
     - August 28, 2025 special message of about $4.9B, sent too late for Congress to act before the funds expired (a "pocket rescission"). GAO (B-337805, 2025-09-12) found pocket rescissions unlawful; OMB disagreed.
     - The Supreme Court stayed the order to obligate the funds on 2025-09-26 (25A269, 6-3). Its preliminary view is that the ICA likely precludes the plaintiffs' APA suit, and it is not a merits ruling.
     - GAO found ICA violations at NIH (B-337203) and FEMA (B-337204.2) in 2025, and at EPA and AHRQ in October 2026.
     - A further special message is dated 2026-09-25 (B-338788). Its content is UNCONFIRMED.
   - Recommendation:
     - A lawful "propose rescission" act with the 45-day clock and Congress's vote.
     - A "deferral" act limited to §684 grounds.
     - Withholding outside those, or a late-year pocket rescission, shown honestly as contested: counsel's objection, a GAO finding, possible litigation, appropriators' retaliation. Never a plain button.
6. **Stafford emergency declaration and the Disaster Relief Fund** (high).
   - Basis: 42 U.S.C. §5191(a) on a governor's request, and §5191(b) federal primary responsibility.
   - Precedent: COVID-19 in 2020.
   - Why: the registry already holds `stafford-emergency`, but no act uses it. E1, E7 and E8 depend on it.
7. **Congress terminates a national emergency** (medium).
   - Basis: §1622(a)(1) joint resolution (vetoable) and §1622(b) six-month review.
   - Precedent: the 2019 border emergency, whose termination resolutions were vetoed. The veto record was not opened; UNCONFIRMED.
   - Why: it's the main political check on a standing declaration.
8. **SPR limited drawdown, exchange and IEA-coordinated release** (medium).
   - Basis: §6241(h), plus the exchanges in DOE's history.
   - Precedent: 2011 and 2022 IEA releases, and exchanges after hurricanes.
9. **Supplemental appropriations request with an emergency designation** (medium).
   - Basis: Art. I §9 cl. 7. The emergency-designation statute was not opened: UNCONFIRMED.
   - Why: the real route for disaster and war money beyond the fund (DECISIONS §6.16 already prices it).
10. **Fed governor removal for cause, with process** (medium). See M3.
11. **Trade agreements by implementing statute, and executive trade "frameworks"** (medium). Basis UNCONFIRMED here. See T7.

## Highest-priority fixes (severity-ranked)

1. **Critical (new gate):** replace the direct tariff with statute-specific authorities (§232, §301, §201, §122 at most 15% for 150 days, §338 at most 50%), each with its finding, clock, cap and CIT exposure (T1). Fold this into the trade package design before it's built.
2. **Critical (new gate):** close "Strategic nationalization" behind an act of Congress and cite *Youngstown* (B5).
3. **High (new gate):** require a declared IEEPA emergency for sanctions, asset freezes and embargoes on the ladder. Reuse `activeExternalEmergency` (S2-S4).
4. **High (engine plus copy):** separate NEA declarations from Stafford declarations. A hazard at a state is a Stafford §401 or §501 act, a declaration never makes a state consent, and the cost is not "International standing" (E1).
5. **High (new gate):** "Direct federal relief" needs a Stafford declaration, or a §5191(b) finding, and draws on the Disaster Relief Fund (E8, E7).
6. **High (new act):** rescission and deferral under the ICA, with pocket rescission shown as contested (Missing capabilities 5).
7. **High (new gate):** recurring program spending (Energy transition) needs an appropriation (B4).
8. **High (new gate):** a scenario reply's import suspension needs an IEEPA emergency or a §338 finding (T5).
9. **Medium (new act plus copy):** Fed governor removal for cause with notice and a chance to respond, as *Trump v. Cook* read the statute at the stay stage. The chair copy should say the question is unsettled (M3).
10. **Medium (engine):** Congress counter-proposes the appropriation and the President signs or vetoes it (B1). Record the statutory pathway rather than USDA, DOE, HHS or FDA on tariff categories (T2).

Also note for BL-166: on 2026-10-16, uscode.house.gov showed "currently operating in a temporary format" and returned "Page Not Found" for section pages built by the registry's `uscode()` helper. The govinfo link service (`https://www.govinfo.gov/link/uscode/<title>/<section>`) resolved every section I tried. The registry's DPA `limits` line should state the current sunset (2026-12-11, Pub. L. 119-103 §2004).

## Sources (all opened 2026-10-16)

Supreme Court:
- *Learning Resources, Inc. v. Trump*, No. 24-1287 (2026-02-20), preliminary print: https://www.supremecourt.gov/opinions/25pdf/607us2r12_8nj9.pdf
- *Trump v. Cook*, No. 25A312, 609 U.S. 528 (2026-06-29): https://www.supremecourt.gov/opinions/25pdf/609us2r63_e2pg.pdf
- *Trump v. Slaughter*, No. 25-332, 609 U.S. 422 (2026-06-29): https://www.supremecourt.gov/opinions/25pdf/609us2r62_g314.pdf
- Slip opinion list, OT2025: https://www.supremecourt.gov/opinions/slipopinion/25
- *Department of State v. AIDS Vaccine Advocacy Coalition*, No. 25A269, docket and 2025-09-26 disposition: https://www.supremecourt.gov/docket/docketfiles/html/public/25A269.html
- *Trump v. Sierra Club*, No. 19A60 (2019-07-26): https://www.supremecourt.gov/opinions/18pdf/19a60_o75p.pdf

U.S. Code, GPO 2024 edition via the govinfo link service (`https://www.govinfo.gov/link/uscode/<title>/<section>?link-type=html`): 50 U.S.C. §§1622, 1701, 1702, 4511, 4564, 4813; 10 U.S.C. §2808; 42 U.S.C. §§5122, 5170, 5191, 6241, 7545; 19 U.S.C. §§1318, 1338, 1862, 2132; 2 U.S.C. §§683, 684; 12 U.S.C. §242; 31 U.S.C. §1105. Also uscode.house.gov section pages (returned "Page Not Found", temporary format).

Public laws (govinfo API, `https://api.govinfo.gov/packages/<id>/summary` and `/htm`):
- PLAW-119publ21 (2025-07-04, debt limit +$5T)
- PLAW-119publ28 (2025-07-24, Rescissions Act of 2025)
- PLAW-119publ103 (Continuing Appropriations and Extensions Act, 2027, §2004 DPA extension)
- PLAW-119publ111 (2026-09-18, Russia sanctions)
- The PLAW collection listing since 2025-07-01

Federal Register, via the API at https://www.federalregister.gov/api/v1/documents (metadata, plus the govinfo PDFs for 2026-03824, 2026-14997, 2026-15274 and 2026-13588):
- Proc. 9705 (83 FR 11625)
- USTR §301 notice (83 FR 28710)
- Proc. 9844 (84 FR 4949)
- Proc. 9994 (85 FR 15337)
- Proc. 10142 (86 FR 7225)
- EO 13224 (66 FR 49079)
- EO 13660 (79 FR 13493)
- EO 14071 (87 FR 20999)
- EO 14193, 14194, 14195 (90 FR 9113-9121)
- EO 14257 (90 FR 15041)
- Proc. 11012 (FR 2026-03824; PDF https://www.govinfo.gov/content/pkg/FR-2026-02-25/pdf/2026-03824.pdf)
- Presidential documents with the term "tariff" since 2026-03-01: Procs. 11020, 11021, 11032, 11038, 11040, 11045-11048, 11051, 11052, 11055, 11061-11065, and FR 2026-15274 and 2026-14654

GAO:
- Impoundment Control Act decisions list (B-337805, B-337203, B-337204.1/.2, B-337208, B-337485, B-337872, B-338788 and others): https://www.gao.gov/legal/appropriations-law/impoundment-control-act

CRS:
- LSB11374, "Pocket Rescissions and the Impoundment Control Act" (2025-09-25): https://www.everycrsreport.com/files/2025-09-25_LSB11374_1e4dfb015fd572b255f5f79dad08f163f6b489fd.html
- IN12484, "Reauthorizing the Defense Production Act" (2026-02-12): https://www.everycrsreport.com/files/2026-02-12_IN12484_9826aa0a51bac9e807aa8db4bb4dd54c8c1a031f.html

Department of Energy:
- History of SPR releases: https://www.energy.gov/ceser/history-spr-releases
- SPR acquisition procedures: https://www.energy.gov/ceser/strategic-petroleum-reserve-0

Searched, not cited as authority: search-engine result pages for the *Learning Resources* decision, Section 122, the pocket-rescission GAO decision, 25A269 and the DPA reauthorization. They were used only to locate the primary documents above.
