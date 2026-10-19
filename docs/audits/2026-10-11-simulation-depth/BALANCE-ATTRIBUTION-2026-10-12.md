# Democrat investment-versus-careful approval gap: 12-seed attribution, 2026-10-12

Read-only diagnosis of the R1.1 balance failure (full harness: median gap 0.02603843048432669 against the 0.02 gate). No coefficient, threshold or engine source was changed.

## What ran

- Script: `scripts/dev/balance-attribution.mjs` (moved from a scratch copy under `/private/tmp`, paths made repo-relative, logic unchanged). It plays one seed under `careful-without-fiscal` and `investment-only` for 208 weeks as a Democrat, recording each week's approval, driver mood, salient weights, opinion targets and economic readings.
- Build: dist at commit `92ca751b5`. The theme commit touched no engine or world source, so the build is identical to the simulation that produced the harness failure.
- Command: `node scripts/dev/balance-attribution.mjs balance-N` for N = 0..11, four processes at once.
- Cost: 246 s wall for all 12 seeds on an 18-core machine; peak resident memory 0.85 to 1.09 GB per process. Raw per-seed JSON was kept in the session scratchpad only. Rerun the command to regenerate it; output is deterministic per seed and build.

## Result

| Seed | Careful ending | Final gap (investment − careful) | Gap at weeks 52 / 104 / 156 |
|---|---|---|---|
| 0 | in office | 0.005 | 0.005 / 0.001 / 0.013 |
| 1 | defeated, week 197 | 0.029 | 0.022 / 0.004 / 0.027 |
| 2 | defeated, week 197 | 0.097 | 0.020 / 0.035 / 0.088 |
| 3 | in office | 0.013 | 0.005 / 0.002 / 0.018 |
| 4 | in office | 0.022 | 0.010 / 0.009 / 0.008 |
| 5 | in office | 0.048 | 0.013 / 0.019 / 0.030 |
| 6 | in office | 0.012 | 0.019 / 0.012 / 0.035 |
| 7 | in office | 0.030 | 0.013 / 0.018 / 0.008 |
| 8 | in office | 0.005 | 0.017 / 0.002 / −0.004 |
| 9 | defeated, week 197 | 0.033 | 0.019 / 0.017 / 0.027 |
| 10 | defeated, week 197 | 0.047 | 0.023 / −0.000 / 0.006 |
| 11 | in office | 0.008 | 0.020 / 0.014 / 0.023 |

Median final gap: 0.0254 (the script's last-week comparison; the harness median is 0.0260). Investment leads careful in 34 of 36 yearly checkpoints, and the two exceptions are 0.000 and −0.004. Investment is never defeated, while careful loses re-election in 4 of 12 seeds.

Median final-week differences (investment − careful): growth +0.16 points, unemployment −0.47 points, inflation −0.25 points, debt-to-GDP +6.0 points, interest share of revenue +4.2 points. The weighted mood gap spreads across drivers: security 0.0056, prosperity 0.0056, integrity 0.0025, competence 0.0020, services 0.0010, unity 0.0001.

Largest median differences in final-week opinion causes:

| Driver, cause | Careful | Investment |
|---|---|---|
| services, conditions | −0.109 | 0.000 |
| competence, vacancies | −0.075 | 0.000 |
| competence, bounded | 0.037 | 0.000 |
| services, money | −0.080 | −0.107 |
| security, stability | 0.439 | 0.465 |
| integrity and competence, coverage | −0.045 | −0.027 |

## Reading (inference, not yet a decision)

1. No single defect explains the gap. It is a consistent advantage that accumulates over the term: investment keeps national conditions from decaying in the services driver, and its debt and interest cost does reach approval (the services money cause is worse) but by less than the conditions penalty it avoids.
2. Seed 2 is an outlier (0.097). Most of it is four vacancies in the careful run's competence driver at its defeat week, which is likely an end-of-term artifact rather than a fiscal effect. Excluding it does not bring the median under the gate.
3. Debt-to-GDP 6 points higher and interest share 4 points higher move approval very little. Whether that is the intended "debt is a slow, delayed cost" design, or an undercharged channel, is the question to settle before any retune.

## Next diagnostic, before any retune

- Trace the services conditions cause weekly for seeds 4, 5 and 9 (careful pays it, investment does not) to name the conditions involved and what investment funds that prevents them.
- Measure how much of the gap the debt and interest channel would need to carry to land at 0.02, then compare that against the documented intent in `docs/CONTENT_DOCTRINE.md` §2 and `docs/IMPACT_MODEL.md` before proposing a coefficient. A retune changes scoring constants under the doc-sync contract and needs the full balance harness on the final build.
