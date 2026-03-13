import admin from 'firebase-admin';
import { processScenario, validateResolvedScenario } from '../src/lib/core/scenarioUtils';
import type { Scenario } from '../src/data/schemas/scenarios';
import type { Country } from '../src/data/schemas/diplomacy';

const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

function extractCountries(payload: any): Country[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as Country[];
  const entries = Object.entries(payload);
  return entries.map(([id, value]) => {
    const c = (value || {}) as any;
    return {
      id: c.id || id,
      name: c.name || id,
      ...(c as object),
    } as Country;
  });
}

function collectPlayerText(s: Scenario): string[] {
  const out: string[] = [];
  if (s.title) out.push(s.title);
  if (s.description) out.push(s.description);
  if (s.actor) out.push(s.actor);
  for (const o of s.options || []) {
    if (o.text) out.push(o.text);
    if (o.outcomeHeadline) out.push(o.outcomeHeadline);
    if (o.outcomeSummary) out.push(o.outcomeSummary);
    if (o.outcomeContext) out.push(o.outcomeContext);
    if (o.outcome?.headline) out.push(o.outcome.headline);
    if (o.outcome?.summary) out.push(o.outcome.summary);
    if (o.outcome?.context) out.push(o.outcome.context);
    if (Array.isArray(o.advisorFeedback)) {
      for (const fb of o.advisorFeedback) {
        if ((fb as any)?.feedback) out.push((fb as any).feedback);
      }
    } else if (typeof o.advisorFeedback === 'string') {
      out.push(o.advisorFeedback);
    }
  }
  return out;
}

async function main() {
  const countriesDoc = await db.doc('world_state/countries').get();
  const countries = extractCountries(countriesDoc.data());
  if (!countries.length) throw new Error('No countries available in world_state/countries');

  const scenariosSnap = await db.collection('scenarios').get();
  const scenarios = scenariosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Scenario[];

  const unresolvedPattern = /\{[a-z_]+\}/g;
  let checked = 0;
  const unresolvedCases: Array<{ scenarioId: string; countryId: string; tokens: string[] }> = [];
  const validationErrors: Array<{ scenarioId: string; countryId: string; rule: string; message: string }> = [];

  for (const country of countries) {
    for (const scenario of scenarios) {
      checked += 1;
      const processed = processScenario(scenario, country.id, countries);
      const texts = collectPlayerText(processed);
      const tokens = Array.from(new Set(texts.flatMap((t) => t.match(unresolvedPattern) || [])));
      if (tokens.length) {
        unresolvedCases.push({ scenarioId: scenario.id, countryId: country.id, tokens });
      }

      const issues = validateResolvedScenario(processed, country.id, countries);
      for (const issue of issues) {
        if (issue.severity === 'error') {
          validationErrors.push({
            scenarioId: scenario.id,
            countryId: country.id,
            rule: issue.rule,
            message: issue.message,
          });
        }
      }
    }
  }

  const unresolvedByToken = unresolvedCases
    .flatMap((c) => c.tokens)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

  const rules = validationErrors.reduce<Record<string, number>>((acc, e) => {
    acc[e.rule] = (acc[e.rule] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    countries: countries.length,
    scenarios: scenarios.length,
    combinationsChecked: checked,
    unresolvedCases: unresolvedCases.length,
    unresolvedTopTokens: Object.entries(unresolvedByToken).sort((a, b) => b[1] - a[1]).slice(0, 20),
    resolvedValidationErrorCount: validationErrors.length,
    resolvedValidationTopRules: Object.entries(rules).sort((a, b) => b[1] - a[1]).slice(0, 20),
    unresolvedSamples: unresolvedCases.slice(0, 20),
    resolvedValidationSamples: validationErrors.slice(0, 20),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
