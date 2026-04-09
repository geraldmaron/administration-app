# Reflection Prompt — Fallback Version

> **NOTE**: This file is a local fallback. The active prompt is stored in
> Firestore under `prompt_templates` (name: `reflection`).
> Update the Firestore template to override this file in production.

---

## Self-Audit: 3-Pass Review

Run all three passes before outputting JSON. Fix anything that fails.

---

### Pass 1 — Structural Validity (binary checks)

Fail any of these → rewrite before submitting.

- [ ] Exactly 3 options
- [ ] `description`: 2–3 sentences, 50–150 words
- [ ] Each `options[].text`: 2–3 sentences, 40–90 words
- [ ] Each option has 2–4 effects with `probability: 1.0`, `duration: 1–20`, values using specific decimals (no whole numbers)
- [ ] `outcomeHeadline`: 3–15 words, no "you"/"your"
- [ ] `outcomeSummary`: ≥200 characters, 2–3 sentences, third-person
- [ ] `outcomeContext`: ≥350 characters, 4–6 sentences, third-person
- [ ] `title`: 4–8 words, no tokens, newspaper headline style
- [ ] 5–9 `advisorFeedback` entries per option, including `role_executive`
- [ ] All `roleId` values are from the canonical 13 (not metrics, not aliases)

### Effect Sign Check (critical — #1 failure cause)

For each effect, verify:
- `metric_corruption`: negative = anti-corruption (good), positive = more corruption (bad)
- `metric_crime`: negative = less crime (good), positive = more crime (bad)
- `metric_inflation`: negative = prices stabilizing (good), positive = inflation rising (bad)
- `metric_bureaucracy`: negative = streamlined (good), positive = more red tape (bad)
- All other metrics: positive = improvement, negative = worsening

If any sign is wrong, flip it now.

---

### Pass 2 — Quality Scoring (1–5 scale per dimension)

Score yourself honestly. If any dimension scores below 3, rewrite that aspect.

**Specificity (1–5):**
Does the description name a concrete trigger event, a specific institution, and a mechanism?
- 5 = Every sentence has a concrete noun (institution, number, population, mechanism)
- 1 = Generic policy language ("economic challenges require a response")

**Option Distinctiveness (1–5):**
Are the 3 options different in approach and instrument, not just in degree?
- 5 = Three genuinely different strategies
- 1 = Same approach at different intensities

**Token Compliance (1–5):**
- For minimal strategy: only approved tokens used, no invented tokens, no article form tokens
- For exclusive (none) strategy: no tokens at all, real names used correctly
- 5 = Perfect compliance with the token strategy
- 1 = Invented tokens, wrong strategy usage

**Voice Compliance (1–5):**
- 5 = Perfect: second person in briefing fields, third-person journalism in outcome fields
- 1 = Consistent voice violations

---

### Pass 3 — Fix or Flag

For each dimension scoring below 3:
- Rewrite the failing fields inline before outputting
- If the scenario references a legislature or elections: confirm `requires.democratic_regime: true` is set AND `conditions` contains `{ "metricId": "metric_democracy", "min": 40 }`
- If the scenario references an opposition party or opposition leader: confirm both `requires.democratic_regime: true` AND `requires.has_opposition_party: true` are set, and the text uses `{opposition_party}` / `{opposition_party_leader}` tokens (not plain text), AND `conditions` contains `{ "metricId": "metric_democracy", "min": 40 }`
- If the scenario sets `requires.authoritarian_regime: true`: confirm `conditions` contains `{ "metricId": "metric_democracy", "max": 40 }`
- If the scenario references foreign actors: confirm appropriate `requires` flags are set
- If `scopeTier` is `universal`: confirm zero foreign references of any kind
- If `scopeTier` is `universal`, `regional`, or `cluster`: confirm no hardcoded government vocabulary appears in any field — "Trade Ministry", "Health Ministry", "Parliament", "Federal Reserve", "Supreme Court", etc. must all be replaced with their token equivalents. Rewrite any failing fields.

**Requires → Condition checklist (fail = audit warns, −4 pts each):**
- [ ] `requires.democratic_regime: true` → `conditions` has `metric_democracy min 40`
- [ ] `requires.authoritarian_regime: true` → `conditions` has `metric_democracy max 40`
- [ ] `requires.has_legislature: true` (if set) → also set `requires.democratic_regime: true` + `metric_democracy min 40` condition

Output a brief `_selfAuditNotes` field (will be stripped before storage) summarizing what you checked, the requires→condition pairs you verified, and any fixes applied.
