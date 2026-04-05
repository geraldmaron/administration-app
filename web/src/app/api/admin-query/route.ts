import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { fetchOllamaModels } from '@/lib/generation-models';

export const dynamic = 'force-dynamic';

const QUERY_MODEL_PREFERENCE = [
  'ai-fast', 'qwen3:8b', 'gemma3:12b', 'phi4:14b', 'mistral-small:24b',
];

interface ParsedQuery {
  target: 'countries' | 'scenarios';
  keywords: string[];
  region?: string;
  bundle?: string;
  tags?: string[];
  active?: boolean;
  countryId?: string;
  severity?: string;
  limit: number;
}

interface CountryResult {
  id: string;
  name: string;
  region: string;
  matchedFields: string[];
  score: number;
}

interface ScenarioResult {
  id: string;
  title: string;
  description: string;
  bundle: string | null;
  severity: string | null;
  tags: string[];
  isActive: boolean;
  matchedFields: string[];
  score: number;
}

function selectModel(available: string[]): string | null {
  for (const pref of QUERY_MODEL_PREFERENCE) {
    const match = available.find(m => m === pref || m.startsWith(`${pref}:`));
    if (match) return match;
  }
  return available[0] ?? null;
}

async function getOllamaConfig(): Promise<{ baseUrl: string; model: string } | null> {
  const configSnap = await db.doc('world_state/generation_config').get();
  const baseUrl: string =
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_REMOTE_BASE_URL ||
    configSnap.data()?.ollama_base_url ||
    '';
  if (!baseUrl) return null;

  const models = await fetchOllamaModels(baseUrl);
  if (models.length === 0) return null;

  const model = selectModel(models);
  if (!model) return null;

  return { baseUrl, model };
}

async function parseQueryWithOllama(
  query: string,
  baseUrl: string,
  model: string,
  targetOverride?: string,
): Promise<ParsedQuery> {
  const systemPrompt = `You are a query parser for a geopolitical simulation admin tool. Parse the user's natural-language query into a structured JSON search intent.

Respond with ONLY valid JSON matching this exact schema:
{
  "target": "countries" or "scenarios",
  "keywords": ["array", "of", "search", "terms"],
  "region": "optional region name like Europe, Asia, Africa, Americas, Middle East, Oceania",
  "bundle": "optional bundle id like default, campaign, tutorial",
  "tags": ["optional", "scenario", "tags"],
  "active": true/false or null,
  "countryId": "optional specific country id like united_states, germany",
  "severity": "optional: low, medium, high, critical",
  "limit": number between 1 and 50
}

Rules:
- "target" must be "countries" if the query is about countries, nations, states, regions, or country properties/tokens. Use "scenarios" if about scenarios, events, decisions, options, or outcomes.
- "keywords" should contain the core search terms extracted from the query, lowercased. Remove filler words.
- Only include optional fields if the query explicitly mentions them. Omit fields that are not relevant.
- "limit" defaults to 20 if not specified.
- Do not hallucinate data. Only extract structure from the query.`;

  const userContent = targetOverride
    ? `Parse this query (target override: ${targetOverride}): ${query}`
    : `Parse this query: ${query}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ollama',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama HTTP ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) throw new Error('Empty response from Ollama');

    const cleaned = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in Ollama response');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      target: parsed.target === 'scenarios' ? 'scenarios' : 'countries',
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k: unknown) => String(k).toLowerCase())
        : [],
      region: typeof parsed.region === 'string' ? parsed.region : undefined,
      bundle: typeof parsed.bundle === 'string' ? parsed.bundle : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t: unknown) => String(t).toLowerCase())
        : undefined,
      active: typeof parsed.active === 'boolean' ? parsed.active : undefined,
      countryId: typeof parsed.countryId === 'string' ? parsed.countryId : undefined,
      severity: typeof parsed.severity === 'string' ? parsed.severity : undefined,
      limit: Math.min(Math.max(typeof parsed.limit === 'number' ? parsed.limit : 20, 1), 50),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function matchesKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword);
}

function scoreCountry(
  id: string,
  data: FirebaseFirestore.DocumentData,
  parsed: ParsedQuery,
): { result: CountryResult; score: number } | null {
  const name: string = data.name ?? id.replace(/_/g, ' ');
  const region: string = data.region ?? '';
  const tokens: Record<string, string | null> = data.tokens ?? {};

  if (parsed.region && !matchesKeyword(region, parsed.region)) {
    return null;
  }

  if (parsed.countryId && id !== parsed.countryId) {
    return null;
  }

  let score = 0;
  const matchedFields: string[] = [];

  const searchableText = [
    id,
    name,
    region,
    ...Object.values(tokens).filter((v): v is string => typeof v === 'string'),
  ].join(' ');

  for (const kw of parsed.keywords) {
    if (matchesKeyword(id, kw)) {
      score += 10;
      matchedFields.push('id');
    }
    if (matchesKeyword(name, kw)) {
      score += 8;
      matchedFields.push('name');
    }
    if (matchesKeyword(region, kw)) {
      score += 5;
      matchedFields.push('region');
    }
    const tokenHits = Object.entries(tokens).filter(
      ([, v]) => typeof v === 'string' && matchesKeyword(v, kw),
    );
    if (tokenHits.length > 0) {
      score += 3 * tokenHits.length;
      matchedFields.push(...tokenHits.map(([k]) => `tokens.${k}`));
    }
  }

  if (parsed.keywords.length === 0 && !parsed.region && !parsed.countryId) {
    score = 1;
  }

  if (score === 0 && parsed.keywords.length > 0) {
    const fullLower = searchableText.toLowerCase();
    for (const kw of parsed.keywords) {
      if (fullLower.includes(kw)) {
        score += 1;
        matchedFields.push('tokens');
      }
    }
  }

  if (score === 0 && parsed.keywords.length > 0) return null;

  return {
    result: {
      id,
      name,
      region,
      matchedFields: [...new Set(matchedFields)],
      score,
    },
    score,
  };
}

function scoreScenario(
  id: string,
  data: FirebaseFirestore.DocumentData,
  parsed: ParsedQuery,
): { result: ScenarioResult; score: number } | null {
  const title: string = data.title ?? '';
  const description: string = data.description ?? '';
  const bundle: string | null = data.metadata?.bundle ?? null;
  const severity: string | null = data.metadata?.severity ?? null;
  const tags: string[] = data.metadata?.tags ?? [];
  const isActive: boolean = data.is_active ?? false;
  const scopeTier: string | null = data.metadata?.scopeTier ?? null;
  const scopeKey: string | null = data.metadata?.scopeKey ?? null;
  const options: Array<{
    text?: string;
    outcomeHeadline?: string;
    outcomeSummary?: string;
  }> = data.options ?? [];

  if (parsed.bundle && bundle !== parsed.bundle) return null;
  if (parsed.severity && severity !== parsed.severity) return null;
  if (parsed.active !== undefined && isActive !== parsed.active) return null;

  if (parsed.countryId) {
    const applicable = data.metadata?.applicable_countries;
    if (Array.isArray(applicable) && !applicable.includes(parsed.countryId)) return null;
    if (typeof applicable === 'string' && applicable !== parsed.countryId) return null;
  }

  let score = 0;
  const matchedFields: string[] = [];

  for (const kw of parsed.keywords) {
    if (matchesKeyword(id, kw)) {
      score += 6;
      matchedFields.push('id');
    }
    if (matchesKeyword(title, kw)) {
      score += 10;
      matchedFields.push('title');
    }
    if (matchesKeyword(description, kw)) {
      score += 7;
      matchedFields.push('description');
    }
    if (scopeTier && matchesKeyword(scopeTier, kw)) {
      score += 3;
      matchedFields.push('scopeTier');
    }
    if (scopeKey && matchesKeyword(scopeKey, kw)) {
      score += 4;
      matchedFields.push('scopeKey');
    }
    for (const tag of tags) {
      if (matchesKeyword(tag, kw)) {
        score += 5;
        matchedFields.push('tags');
        break;
      }
    }
    if (parsed.tags) {
      for (const queryTag of parsed.tags) {
        for (const tag of tags) {
          if (matchesKeyword(tag, queryTag)) {
            score += 5;
            matchedFields.push('tags');
          }
        }
      }
    }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.text && matchesKeyword(opt.text, kw)) {
        score += 4;
        matchedFields.push(`options[${i}].text`);
      }
      if (opt.outcomeHeadline && matchesKeyword(opt.outcomeHeadline, kw)) {
        score += 3;
        matchedFields.push(`options[${i}].outcomeHeadline`);
      }
      if (opt.outcomeSummary && matchesKeyword(opt.outcomeSummary, kw)) {
        score += 2;
        matchedFields.push(`options[${i}].outcomeSummary`);
      }
    }
  }

  if (parsed.keywords.length === 0 && (parsed.bundle || parsed.severity || parsed.active !== undefined || parsed.tags)) {
    score = 1;
  }

  if (score === 0 && parsed.keywords.length > 0) return null;

  return {
    result: {
      id,
      title,
      description: description.length > 200 ? description.substring(0, 200) + '…' : description,
      bundle,
      severity,
      tags,
      isActive,
      matchedFields: [...new Set(matchedFields)],
      score,
    },
    score,
  };
}

async function searchCountries(parsed: ParsedQuery): Promise<CountryResult[]> {
  const snap = await db.collection('countries').get();
  const scored: { result: CountryResult; score: number }[] = [];

  for (const doc of snap.docs) {
    const hit = scoreCountry(doc.id, doc.data(), parsed);
    if (hit) scored.push(hit);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, parsed.limit).map(s => s.result);
}

async function searchScenarios(parsed: ParsedQuery): Promise<ScenarioResult[]> {
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');

  if (parsed.bundle) {
    query = query.where('metadata.bundle', '==', parsed.bundle);
  }
  if (parsed.active !== undefined) {
    query = query.where('is_active', '==', parsed.active);
  }

  const fetchLimit = Math.min(parsed.limit * 20, 1000);
  query = query.orderBy('created_at', 'desc').limit(fetchLimit);

  const snap = await query.get();
  const scored: { result: ScenarioResult; score: number }[] = [];

  for (const doc of snap.docs) {
    const hit = scoreScenario(doc.id, doc.data(), parsed);
    if (hit) scored.push(hit);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, parsed.limit).map(s => s.result);
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const targetOverride = typeof body.target === 'string' ? body.target : undefined;

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'query must be 500 characters or fewer' }, { status: 400 });
    }

    const ollamaConfig = await getOllamaConfig();
    if (!ollamaConfig) {
      return NextResponse.json(
        { error: 'Ollama is not configured. Set ollama_base_url in world_state/generation_config.' },
        { status: 502 },
      );
    }

    let parsed: ParsedQuery;
    try {
      parsed = await parseQueryWithOllama(query, ollamaConfig.baseUrl, ollamaConfig.model, targetOverride);
    } catch (err) {
      console.error('[admin-query] Ollama parse error:', err);
      return NextResponse.json(
        { error: `Failed to parse query via Ollama: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 },
      );
    }

    let countries: CountryResult[] | undefined;
    let scenarios: ScenarioResult[] | undefined;

    if (parsed.target === 'countries') {
      countries = await searchCountries(parsed);
    } else {
      scenarios = await searchScenarios(parsed);
    }

    return NextResponse.json({
      query,
      parsed: {
        target: parsed.target,
        keywords: parsed.keywords,
        region: parsed.region,
        bundle: parsed.bundle,
        tags: parsed.tags,
        active: parsed.active,
        countryId: parsed.countryId,
        severity: parsed.severity,
        limit: parsed.limit,
      },
      model: ollamaConfig.model,
      results: {
        countries: countries ?? [],
        scenarios: scenarios ?? [],
      },
      totalResults: (countries?.length ?? 0) + (scenarios?.length ?? 0),
    });
  } catch (err) {
    console.error('POST /api/admin-query error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
