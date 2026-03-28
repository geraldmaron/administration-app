# Reflection Prompt — Fallback Version

> **NOTE**: This file is a local fallback. The active prompt is stored in
> Firestore under `prompt_templates` (name: `reflection`).
> Update the Firestore template to override this file in production.

---

## Self-Audit Checklist

Before outputting your scenario JSON, verify every item below. Fix anything that fails before submitting.

### Structure
- [ ] Exactly 3 options
- [ ] description = 2–3 sentences **and 60–140 words** — count words; under 60 is a hard fail
- [ ] Each option text = 2–3 sentences **and 50–120 words** — count words; under 50 is too thin; over 120, consolidate sentences
- [ ] outcomeHeadline: 3–8 words
- [ ] outcomeSummary: ≥200 characters, 2–3 sentences
- [ ] outcomeContext: ≥400 characters, 4–6 sentences; names specific institution/group, mechanism, reaction, implication
- [ ] title: 4–8 words, no tokens

### Word Count Self-Check (run before submitting)
Count every word in `description`. If fewer than 60: do not submit — rewrite with:
  - Named trigger event or condition (drought index, bond yield, protest incident, border incident)
  - Named actor or institution (ministry, party faction, opposition party, central bank)
  - Concrete stakes (which population, which sector, which metric at risk, and by what mechanism)

Count every word in each option `text`. If fewer than 50: do not submit — rewrite with:
  - Named policy mechanism (emergency subsidy, Section 12 injunction, bilateral framework, rapid-deployment taskforce)
  - Named trade-off (who benefits, who bears the cost, what risk is accepted)
  - Named affected constituency (farmers in drought-affected regions, public-sector workers, coastal communities)

### Bundle Alignment
- [ ] Each option has ≥1 effect targeting a metric in the scenario's bundle domain
- [ ] If bundle = `dick_mode`: options reflect authoritarian/morally dark statecraft with realistic consequences; formal strategic language only (no slurs, dehumanizing language, or graphic violence)

### Tokens
- [ ] Country/relation tokens at subject/object/prepositional positions → always `{the_*}` form (`{the_player_country}`, `{the_adversary}`, `{the_ally}`, etc. — full list in Logic Parameters section)
- [ ] Bare forms (`{player_country}`, `{adversary}`, `{ally}`, etc.) valid ONLY as possessives (`{token}'s ...`) — replace all other bare occurrences with `{the_*}` form
- [ ] Bare role tokens must use `{the_*}` form when opening a sentence (e.g., `{the_finance_role}`)
- [ ] All token names lowercase; no invented tokens (rewrite the sentence if unsure)
- [ ] No hard-coded country names, capitals, currencies, or abbreviations (USA, UK, EU, NATO)
- [ ] Phase 10 domestic institution tokens used where appropriate:
  - `{opposition_party}` / `{the_opposition_party}` (not a specific party name)
  - `{regional_bloc}` / `{the_regional_bloc}` (not EU/ASEAN/NATO etc.)
  - `{major_industry}` / `{the_major_industry}` (not oil/tech/banking etc.)
  - Apply same `{the_*}` rules: subject/object positions → `{the_*}` form; possessives → bare form

### Voice
- [ ] description, option text, advisorFeedback → second person: "You face...", "Your administration..."
- [ ] outcomeHeadline, outcomeSummary, outcomeContext → third-person journalistic, NO "you"/"your"

### Content Quality
- [ ] No policy jargon or think-tank wording; avoid words like "bloc" or "gambit" in player-facing text unless they are part of an official proper name or direct quote
- [ ] Every sentence ≤25 words; ≤3 conjunction clauses; active voice preferred
- [ ] description ends with stakes/urgency — no option previews
- [ ] Each option has a distinct, named trade-off (who gains, who loses, what risk is accepted)
- [ ] Scenarios name the concrete trigger, affected institution, and mechanism — not generic policy moves
- [ ] No vague references: every mention of {major_industry}, {opposition_party}, {regional_bloc} is surrounded by sector-specific or role-specific detail (supply chains, workforce, policy positions) — never "an industry is struggling" or "a party objects"
- [ ] Stakes are concrete: named trigger event (not "recent developments"), named mechanism (not "economic pressure"), named affected group (not "workers" — which workers?)
- [ ] If scopeTier=universal: verify NO references to foreign countries, neighbors, allies, adversaries, rival nations, or bilateral disputes — not even as generic phrases like "a neighboring country". Universal scenarios must be entirely domestic.

### Conditions
- [ ] conditions: if the scenario describes a metric in crisis (recession, crime wave, unrest, inflation spike), include the matching canonical condition. If neutral/universal governance or diplomacy, output `"conditions": []` or omit. Maximum 2 conditions. Never use metric IDs in prose.

### Effects
- [ ] probability = 1.0; duration 1–20; values ±4.5 range; specific decimals
- [ ] Inverse metrics (corruption, crime, inflation, bureaucracy): NEGATIVE values to improve

### Advisor Feedback
- [ ] Every option has advisorFeedback[] with **ALL 13 canonical roles** — not only effect-relevant roles. Required: `role_executive`, `role_diplomacy`, `role_defense`, `role_economy`, `role_justice`, `role_health`, `role_commerce`, `role_labor`, `role_interior`, `role_energy`, `role_environment`, `role_transport`, `role_education`. Each missing role deducts 4 points from the audit score and will cause rejection.
- [ ] Each feedback names the SPECIFIC policy, affected constituency, and causal impact — not generic boilerplate
- [ ] No forbidden phrases: "aligns with our", "our department", "course of action", "careful monitoring", "no strong position"

### Labels
- [ ] Short direct actions; no "if"/"unless"/colons/parentheses
If any check fails, correct the scenario before outputting.