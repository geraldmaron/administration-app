# War losses, decisive outcomes and reach: measured, 2026-10-13

Measures the change that makes a war's losses follow the forces committed and the enemy they meet, lets a clearly superior expeditionary force win decisively, and measures reach from bases and treaty allies (`war-forces.ts`, `war-attrition.ts`, `war-tick.ts`, `staging.ts`; DECISIONS §6.11 and §6.12).

**Status of these numbers.** The tables below were taken on branch `feat/war-losses` from a local engine build of the working tree before the owner's 2026-10-13 direction to stop separate builds. They were not re-taken on the committed source. Two later source edits do not change a real campaign: installations are keyed on `US_ID` rather than on the founding nation (the same government in every real campaign), and a comment. The integration pass must re-run the commands below on the merged build and replace these tables if anything moved.

## Commands

From the repository root, after `pnpm run build`:

```bash
# The base commit's engine, for the "before" columns: extract 0fd543de5's engine and world dist
# into a scratch directory with node_modules/@admin/world and node_modules/zod linked, then:
ENGINE_ROOT=<scratch>/ node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-us-war.mjs VEN 104 12
ENGINE_ROOT=<scratch>/ node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-us-war.mjs IRN 104 12
ENGINE_ROOT=<scratch>/ node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-npc-wars.mjs 208 12

# This branch:
node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-us-war.mjs VEN 104 12
node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-us-war.mjs IRN 104 12
node docs/audits/2026-10-12-coercion-geography/probes/war-losses/probe-npc-wars.mjs 208 12
```

`probe-us-war.mjs` orders military rung 5 against the target at week 0 on seeds `war-0`, `war-1`, ... and keeps going until 12 invasions have landed (an invasion is a contest that can fail before any war opens; the odds against Venezuela are about 0.5). Each landed seed is paired with a control run of the same seed in which the President does nothing. Losses are band midpoints. "Successor" means the war's last week filed a `succession` change for the loser.

## US invasion of Venezuela, 12 landed wars

| | Before (base) | After |
|---|---|---|
| Seeds tried / invasions failed | 21 / 9 | 20 / 8 |
| Outcomes | 2 aggressor victories, 1 defender victory, 6 settled, 3 still active at week 104 | 10 aggressor victories, 2 settled |
| Successor seated | 0 of 12 | 10 of 12 |
| Median duration (weeks) | 68.5 | 3.5 (2.5 among the decisive) |
| US losses, median | 173,312 "killed and wounded" (one band; the opinion model read it as dead) | 26.5 killed, 161 wounded |
| US killed, range | 121,575 to 296,305 (combined band) | 7 to 192 |
| US losses a week, median | 2,755 | 6.9 killed, 49.6 killed and wounded |
| Approval vs control at war's end, median | -0.085 | -0.003 |
| Approval vs control at week 52, median | -0.094 | -0.023 |

Per seed, after:

| Seed | Outcome | Weeks | Successor | US killed | US wounded | Killed/week | Venezuelan killed | Approval at end vs control | At week 52 |
|---|---|---|---|---|---|---|---|---|---|
| war-4 | aggressor victory | 4 | yes | 31 | 191 | 7.6 | 1,560 | -0.005 | -0.032 |
| war-6 | aggressor victory | 2 | yes | 22 | 131 | 10.8 | 1,100 | -0.002 | -0.020 |
| war-7 | aggressor victory | 6 | yes | 42 | 263 | 6.9 | 2,171 | -0.004 | -0.018 |
| war-10 | aggressor victory | 3 | yes | 19 | 116 | 6.3 | 939 | -0.002 | -0.028 |
| war-11 | aggressor victory | 2 | yes | 22 | 125 | 10.8 | 1,091 | -0.002 | -0.019 |
| war-12 | aggressor victory | 14 | yes | 96 | 581 | 6.9 | 4,513 | -0.014 | -0.023 |
| war-14 | aggressor victory | 8 | yes | 72 | 384 | 9.0 | 3,747 | -0.007 | -0.023 |
| war-15 | settled | 76 | no | 192 | 1,262 | 2.5 | 6,597 | -0.041 | -0.039 |
| war-16 | settled | 82 | no | 157 | 951 | 1.9 | 3,850 | -0.019 | -0.028 |
| war-17 | aggressor victory | 2 | yes | 20 | 122 | 10.0 | 1,043 | -0.002 | -0.021 |
| war-18 | aggressor victory | 0 | yes | 7 | 41 | 6.5 | 303 | -0.001 | -0.022 |
| war-19 | aggressor victory | 2 | yes | 14 | 82 | 6.8 | 691 | -0.001 | -0.008 |

The two settled wars cooled below the held-front line before Venezuela's defense broke and were written down as armistices; the passive proxy never re-escalates. Record anchors (CRS RL32492, via the research note): Just Cause (Panama) 23 deaths, Urgent Fury (Grenada) 19.

## US invasion of Iran, 12 landed wars

Before: the reach gate refused the invasion on all 36 seeds tried (multiplier 1.47 against a cap of 1.3), so there is no "before" war. After (20 seeds tried, 8 invasions failed their contest):

| Outcome | Count |
|---|---|
| Aggressor victory, not decisive (no successor) | 3 |
| Defender victory | 2 |
| Settled | 6 |
| Still active at week 104 | 1 |
| Successor seated | 0 of 12 |

Median duration 21 weeks. US killed 344 to 885 (median 597), wounded median 4,034; median 16.7 killed and 139 killed-and-wounded a week. Approval vs control at the war's end median -0.029, at week 52 median -0.037.

## Other governments' wars over a passive term (208 weeks, 12 seeds)

| | Before | After |
|---|---|---|
| Wars fought | 18 | 18 |
| Ended | 18 | 18 |
| Victories | 6 | 5 |
| Successors seated | 4 | 5 |
| Median weeks to end | 55 | 42 |

The same wars occur on the same seeds. Changes in outcome: China-Russia (seed 1) ends settled at week 17 rather than a defender victory at 13; Pakistan's attack on India (seed 4) is now thrown back decisively in 6 weeks with a successor seated in Pakistan (before: a non-decisive defender victory in 13); the carried India-Pakistan war on seed 6 settles at week 10 rather than 109. Myanmar's two attacks on China were already decisive before. Loss magnitudes fall by about an order of magnitude and are now split: India-Pakistan (seed 0, 96 weeks) 58,820 killed and 515,382 wounded, against 430,852 in one band before; China-Russia (seed 5, 97 weeks) 127,154 killed and 1,054,351 wounded, against 651,274.

## Calibration tests (`packages/engine/src/war-calibration.test.ts`, 12 seeds each)

| Case | Source | Tolerance | Result (local run before the stop) |
|---|---|---|---|
| Iraq 2003 to 2011, 30 brigades (120,000) at intensity 0.3 for 456 weeks | CRS RL32492: 4,492 deaths, 32,292 wounded (Iraqi Freedom and New Dawn); troop level an assumption bracketed by CRS RL33110 | ±15% each, every seed | passed; seed `cal-0` gave 4,742 killed (+5.6%) and 31,843 wounded (-1.4%). Fitted case: passes by construction |
| Gulf War 1991 (held out): sized corps against Iraq, war-only weeks | CRS RL32492: Desert Storm 147 hostile deaths, 467 wounded; Just Cause 23, Urgent Fury 19 | decisive with a successor on at least 9 of 12, each within 17 weeks; US killed 5 to 300 on every seed | passed: 10 of 12 decisive, 1 to 16 weeks, US killed 6.5 to 73.5 |
| Peer wars stay indecisive: Russia-Ukraine and India-Pakistan, 52 weeks | design acceptance, no source | no successor on any seed | passed |
| US largest corps (12 brigades) against Iran, 26 weeks | design acceptance, no source | no successor on any seed | passed |

## Found while measuring, not fixed here

1. **The pacing invariant already fails at base.** `week-play.test.ts` pins office-day layout against a flat week for one seed. On this branch the reckless proxy reaches targets it could not before (12 acts landed in 52 weeks become 28 on `living-clock-a`), and the run trips a layout-dependent impact event: a cyber crew's `impactEvent` opens on the calendar day its phase runs (`impact-adapters.ts#cyberImpactEvent` → `openImpactEvent(spec, campaign.calendar)`), which differs between the two layouts. The base engine already diverges the same way on `living-clock-b` (hawk) and `living-clock-e` (reckless). The test is left as it is: it asserts DECISIONS §2.3, and the fix belongs to the impact-event clock.
2. **Held fronts between large armies still lose hundreds a week.** The hostile rate is fitted to a fought occupation at intensity 0.3 and scales linearly below the held-front line, so the carried India-Pakistan war loses 230 to 610 killed a week while held. A held line in the record loses far fewer; the research note opens no held-front series, so no rate was invented.
3. **A war's money may be billed twice.** For the President's government, a war is charged as `WAR_OUTLAYS` (2% of potential output a year as aggressor, times intensity, `fiscal-impulse.ts`, read by `national-books.ts#usForcedOutlays`), as the corps' sustainment commitment priced from sourced unit costs (DECISIONS §6.8), and as a weekly treasury drain in `war-tick.ts#attritionEffects`. This change bills nothing new; reconciling the three is a budget question left open.
4. **Invasion odds are separate.** An invasion of Venezuela lands about half the time (0.50 to 0.54); a failed contest opens no war. Not changed.
5. **The US reach gate now refuses no government.** From its installations and 35 treaty allies the United States' invasion multiplier is at or under 1.3 everywhere on the founding board. Force, readiness, war-powers and deterrence gates still apply.
6. **Not built, by instruction:** ship and hull losses, named crews (open owner question), and any change to the rally rule for self-started wars. Civilian deaths in a war week are not modeled; the wounded-per-killed ratio is the US record applied to every government.
