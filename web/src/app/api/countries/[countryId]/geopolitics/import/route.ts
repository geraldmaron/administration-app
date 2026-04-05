import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import type { GeopoliticalProfile, CountryRelationship, RelationshipType } from '@/types/geopolitical';

export const dynamic = 'force-dynamic';

const VALID_RELATIONSHIP_TYPES: RelationshipType[] = [
  'formal_ally', 'strategic_partner', 'neutral', 'rival', 'adversary', 'conflict',
];

const VALID_GOVERNMENT_CATEGORIES = [
  'liberal_democracy', 'illiberal_democracy', 'hybrid_regime',
  'authoritarian', 'totalitarian', 'theocracy',
  'constitutional_monarchy', 'absolute_monarchy',
];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

function buildProfileFromJson(data: any): Partial<GeopoliticalProfile> {
  const profile: Partial<GeopoliticalProfile> = {};
  if (data.allies) profile.allies = data.allies.map((r: any) => ({
    countryId: r.countryId,
    type: r.type,
    strength: Number(r.strength),
    treaty: r.treaty,
    sharedBorder: Boolean(r.sharedBorder),
  }));
  if (data.adversaries) profile.adversaries = data.adversaries.map((r: any) => ({
    countryId: r.countryId,
    type: r.type,
    strength: Number(r.strength),
    treaty: r.treaty,
    sharedBorder: Boolean(r.sharedBorder),
  }));
  if (data.neighbors) profile.neighbors = data.neighbors.map((r: any) => ({
    countryId: r.countryId,
    type: r.type,
    strength: Number(r.strength),
    treaty: r.treaty,
    sharedBorder: Boolean(r.sharedBorder),
  }));
  if (data.tags) profile.tags = Array.isArray(data.tags) ? data.tags : [];
  if (data.governmentCategory) profile.governmentCategory = data.governmentCategory;
  if (data.regimeStability !== undefined) profile.regimeStability = Number(data.regimeStability);
  return profile;
}

function buildProfileFromCsv(text: string, existing: Partial<GeopoliticalProfile>): Partial<GeopoliticalProfile> {
  const rows = parseCsv(text);
  const allies: CountryRelationship[] = existing.allies ?? [];
  const adversaries: CountryRelationship[] = existing.adversaries ?? [];
  const neighbors: CountryRelationship[] = existing.neighbors ?? [];

  for (const row of rows) {
    const rel: CountryRelationship = {
      countryId: row.countryId || row.targetCountryId || '',
      type: (row.type || row.relationType || 'neutral') as RelationshipType,
      strength: Number(row.strength) || 0,
      treaty: row.treaty || undefined,
      sharedBorder: row.sharedBorder === 'true' || row.sharedBorder === '1',
    };
    if (!rel.countryId) continue;
    if (!VALID_RELATIONSHIP_TYPES.includes(rel.type)) continue;

    const type = rel.type;
    if (type === 'formal_ally' || type === 'strategic_partner') {
      allies.push(rel);
    } else if (type === 'adversary' || type === 'rival' || type === 'conflict') {
      adversaries.push(rel);
    } else {
      neighbors.push(rel);
    }
  }

  return { allies, adversaries, neighbors };
}

async function validateAndMergeProfile(
  partial: Partial<GeopoliticalProfile>,
  existing: GeopoliticalProfile,
): Promise<GeopoliticalProfile> {
  if (partial.governmentCategory && !VALID_GOVERNMENT_CATEGORIES.includes(partial.governmentCategory)) {
    throw new Error(`Invalid governmentCategory: ${partial.governmentCategory}`);
  }
  if (partial.regimeStability !== undefined && (partial.regimeStability < 0 || partial.regimeStability > 100)) {
    throw new Error('regimeStability must be between 0 and 100');
  }

  const validateRels = (rels: CountryRelationship[] | undefined, label: string) => {
    if (!rels) return undefined;
    return rels.map((r, i) => {
      if (!r.countryId) throw new Error(`${label}[${i}]: countryId required`);
      if (!VALID_RELATIONSHIP_TYPES.includes(r.type)) {
        throw new Error(`${label}[${i}]: invalid type "${r.type}"`);
      }
      if (r.strength < -100 || r.strength > 100) {
        throw new Error(`${label}[${i}]: strength out of range`);
      }
      return r;
    });
  };

  return {
    allies: validateRels(partial.allies, 'allies') ?? existing.allies,
    adversaries: validateRels(partial.adversaries, 'adversaries') ?? existing.adversaries,
    neighbors: validateRels(partial.neighbors, 'neighbors') ?? existing.neighbors,
    tags: partial.tags ?? existing.tags,
    governmentCategory: partial.governmentCategory ?? existing.governmentCategory,
    regimeStability: partial.regimeStability ?? existing.regimeStability,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { countryId } = await params;

  try {
    const docRef = db.collection('countries').doc(countryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const existingData = snap.data() ?? {};
    const existingGeo = (existingData.geopolitical ?? {}) as GeopoliticalProfile;

    const contentType = request.headers.get('content-type') || '';
    const format = new URL(request.url).searchParams.get('format') || '';

    let partial: Partial<GeopoliticalProfile>;

    if (format === 'csv' || contentType.includes('text/csv')) {
      const text = await request.text();
      partial = buildProfileFromCsv(text, existingGeo);
    } else {
      const body = await request.json();
      if (body.csvText) {
        partial = buildProfileFromCsv(body.csvText, existingGeo);
      } else if (body.yamlText) {
        return NextResponse.json({ error: 'YAML import not yet supported via API — use JSON or CSV' }, { status: 400 });
      } else {
        partial = buildProfileFromJson(body);
      }
    }

    const mode = (new URL(request.url).searchParams.get('mode') || 'replace') as 'replace' | 'merge';

    let merged: GeopoliticalProfile;
    if (mode === 'merge') {
      merged = await validateAndMergeProfile(partial, existingGeo);
    } else {
      const defaults: GeopoliticalProfile = {
        allies: [], adversaries: [], neighbors: [], tags: [],
        governmentCategory: '', regimeStability: 0,
      };
      merged = await validateAndMergeProfile(partial, defaults);
    }

    await docRef.update({ geopolitical: merged });

    return NextResponse.json({ success: true, geopolitical: merged });
  } catch (err) {
    console.error(`POST /api/countries/${countryId}/geopolitical/import error:`, err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: err instanceof Error ? 400 : 500 });
  }
}
