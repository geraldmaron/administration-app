import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CLASSIFICATION_SYSTEM_PROMPT = `You are the scenario design lead for "The Administration", a geo-political strategy game where players govern a country and face realistic crises. Classify real-world news articles for their game design value.

GAME BUNDLES:
- economy: supply chains, debt, inflation, trade, fiscal crises, currency
- politics: elections, scandals, constitutional crises, protests, coups
- military: conflicts, arms deals, nuclear threats, peacekeeping, invasions
- tech: AI regulation, cybersecurity, space, digital infrastructure, data
- environment: climate disasters, pollution, carbon policy, natural disasters
- social: inequality, education, healthcare access, strikes, demographics
- health: pandemics, epidemics, healthcare collapse, drug shortages
- diplomacy: sanctions, alliances, hostages, international agreements, trade wars
- justice: crime waves, judicial independence, corruption prosecutions, human rights
- corruption: bribery, embezzlement, government fraud, oligarchs
- culture: media censorship, national identity, cultural conflicts, free speech
- infrastructure: power grids, transport networks, water systems, telecoms
- resources: energy crises, water scarcity, rare earth minerals, food security

SCOPE:
- global: affects or could apply to any country
- regional: primarily affects a geographic region (e.g. "Southeast Asia", "Sub-Saharan Africa", "Middle East")
- country: specific to one or a few countries — provide ISO 3166-1 alpha-2 codes, max 5

Return ONLY a JSON object: { "classifications": [...] }`;

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          articleIndex: { type: 'number' },
          bundle: { type: 'string' },
          scope: { type: 'string', enum: ['global', 'regional', 'country'] },
          region: { type: 'string' },
          applicable_countries: { type: 'array', items: { type: 'string' } },
          relevance_score: { type: 'number' },
          rationale: { type: 'string' },
          skip: { type: 'boolean' },
        },
        required: ['articleIndex', 'bundle', 'scope', 'relevance_score', 'skip'],
      },
    },
  },
  required: ['classifications'],
};

const VALID_BUNDLES = new Set([
  'economy', 'politics', 'military', 'tech', 'environment', 'social',
  'health', 'diplomacy', 'justice', 'corruption', 'culture', 'infrastructure', 'resources',
]);

function buildUserPrompt(articles: Array<{ title: string; source: string; snippet?: string }>): string {
  const list = articles
    .map((a, i) => `${i}. "${a.title}" [${a.source}]${a.snippet ? ` — ${a.snippet.slice(0, 180)}` : ''}`)
    .join('\n');

  return `Classify each article. Return { "classifications": [...] } where each item has:
- articleIndex: 0-based index from the list
- bundle: one of the 13 bundle names
- scope: "global" | "regional" | "country"
- region: region name only if scope=regional
- applicable_countries: ISO-2 codes only if scope=country (max 5)
- relevance_score: 0–10 integer (10 = perfect geopolitical crisis fit)
- rationale: one sentence explaining the classification
- skip: true only if sports, celebrity gossip, entertainment, or completely irrelevant to governance/geopolitics

Articles:
${list}`;
}

function parseJsonResponse(text: string): any {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('No JSON found in response');
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { articles } = body;

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: 'articles array is required' }, { status: 400 });
  }

  const userPrompt = buildUserPrompt(articles);
  let rawData: any;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'No AI provider available. Ensure OPENAI_API_KEY is set.' },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    return NextResponse.json({ error: `OpenAI unreachable: ${err.message}` }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `OpenAI error ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim() ?? '';
  try {
    rawData = parseJsonResponse(text);
  } catch {
    return NextResponse.json({ error: 'Failed to parse OpenAI response as JSON' }, { status: 502 });
  }

  const rawItems: any[] = rawData?.classifications ?? [];
  const classifications = rawItems
    .filter((c) => !c.skip && typeof c.articleIndex === 'number' && c.articleIndex >= 0 && c.articleIndex < articles.length)
    .filter((c) => typeof c.relevance_score === 'number' && c.relevance_score >= 5)
    .filter((c) => VALID_BUNDLES.has(c.bundle))
    .map((c) => ({
      articleIndex: c.articleIndex,
      bundle: c.bundle as string,
      scope: (c.scope || 'global') as 'global' | 'regional' | 'country',
      ...(c.region ? { region: c.region as string } : {}),
      ...(Array.isArray(c.applicable_countries) && c.applicable_countries.length > 0
        ? { applicable_countries: c.applicable_countries as string[] }
        : {}),
      relevance_score: c.relevance_score as number,
      rationale: (c.rationale || '') as string,
    }));

  return NextResponse.json({ classifications });
}
