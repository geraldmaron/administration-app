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

function validateRelationships(rels: unknown[], label: string): CountryRelationship[] {
  if (!Array.isArray(rels)) throw new Error(`${label} must be an array`);
  return rels.map((r: any, i) => {
    if (!r.countryId) throw new Error(`${label}[${i}]: countryId is required`);
    if (!VALID_RELATIONSHIP_TYPES.includes(r.type)) {
      throw new Error(`${label}[${i}]: type must be one of ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
    }
    if (typeof r.strength !== 'number' || r.strength < -100 || r.strength > 100) {
      throw new Error(`${label}[${i}]: strength must be a number between -100 and 100`);
    }
    return {
      countryId: r.countryId,
      type: r.type,
      strength: r.strength,
      treaty: r.treaty,
      sharedBorder: Boolean(r.sharedBorder),
    };
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const { countryId } = await params;

  try {
    const snap = await db.collection('countries').doc(countryId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const name: string = data.name ?? snap.id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    return NextResponse.json({
      country: {
        id: snap.id,
        name,
        region: data.region ?? '',
        geopolitical: (data.geopolitical as GeopoliticalProfile | null) ?? null,
      },
    });
  } catch (err) {
    console.error(`GET /api/countries/${countryId}/geopolitical error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { countryId } = await params;

  try {
    const body = await request.json();
    const docRef = db.collection('countries').doc(countryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const existing: any = snap.data() ?? {};
    const existingGeo = (existing.geopolitical ?? {}) as Partial<GeopoliticalProfile>;

    const updates: Partial<GeopoliticalProfile> = {};

    if (body.allies !== undefined) updates.allies = validateRelationships(body.allies, 'allies');
    if (body.adversaries !== undefined) updates.adversaries = validateRelationships(body.adversaries, 'adversaries');
    if (body.neighbors !== undefined) updates.neighbors = validateRelationships(body.neighbors, 'neighbors');

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || !body.tags.every((t: unknown) => typeof t === 'string')) {
        return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 });
      }
      updates.tags = body.tags;
    }

    if (body.governmentCategory !== undefined) {
      if (!VALID_GOVERNMENT_CATEGORIES.includes(body.governmentCategory)) {
        return NextResponse.json(
          { error: `governmentCategory must be one of ${VALID_GOVERNMENT_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.governmentCategory = body.governmentCategory;
    }

    if (body.regimeStability !== undefined) {
      if (typeof body.regimeStability !== 'number' || body.regimeStability < 0 || body.regimeStability > 100) {
        return NextResponse.json({ error: 'regimeStability must be a number between 0 and 100' }, { status: 400 });
      }
      updates.regimeStability = body.regimeStability;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const merged: GeopoliticalProfile = {
      allies: updates.allies ?? existingGeo.allies ?? [],
      adversaries: updates.adversaries ?? existingGeo.adversaries ?? [],
      neighbors: updates.neighbors ?? existingGeo.neighbors ?? [],
      tags: updates.tags ?? existingGeo.tags ?? [],
      governmentCategory: updates.governmentCategory ?? existingGeo.governmentCategory ?? '',
      regimeStability: updates.regimeStability ?? existingGeo.regimeStability ?? 0,
    };

    await docRef.update({ geopolitical: merged });

    return NextResponse.json({ success: true, geopolitical: merged });
  } catch (err) {
    console.error(`PATCH /api/countries/${countryId}/geopolitical error:`, err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: err instanceof Error ? 400 : 500 });
  }
}
