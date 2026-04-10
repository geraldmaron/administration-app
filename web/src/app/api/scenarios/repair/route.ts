import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { analyzeScenario, applyPatchesToScenario, applyRelationshipConditionRepair } from '@shared/scenario-repair';
import { toScenarioDetail } from '@/lib/scenario-normalization';
import type { ScenarioDetail, ApprovedRepair } from '@/lib/types';

let _countryNameToId: Map<string, string> | null = null;
let _knownCountryIds: Set<string> | null = null;

async function loadCountryLookup(): Promise<{ nameToId: Map<string, string>; knownIds: Set<string> }> {
  if (_countryNameToId && _knownCountryIds) {
    return { nameToId: _countryNameToId, knownIds: _knownCountryIds };
  }
  const snap = await db.collection('countries').get();
  const nameToId = new Map<string, string>();
  const knownIds = new Set<string>();
  snap.forEach((doc) => {
    knownIds.add(doc.id);
    const data = doc.data();
    const name: unknown = data.name;
    if (typeof name === 'string') nameToId.set(name.toLowerCase(), doc.id);
  });
  _countryNameToId = nameToId;
  _knownCountryIds = knownIds;
  return { nameToId, knownIds };
}

function repairApplicableCountries(
  ids: unknown,
  nameToId: Map<string, string>,
  knownIds: Set<string>
): string[] | null {
  if (!Array.isArray(ids)) return null;
  let changed = false;
  const fixed = (ids as unknown[]).map((entry) => {
    if (typeof entry !== 'string') return entry;
    if (knownIds.has(entry)) return entry;
    const mapped = nameToId.get(entry.toLowerCase());
    if (mapped) { changed = true; return mapped; }
    return entry;
  });
  return changed ? (fixed as string[]) : null;
}

export const dynamic = 'force-dynamic';

const MAX_IDS = 50;

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { mode: string; ids?: unknown; approved?: unknown };

    if (body.mode === 'analyze') {
      if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
      }
      if (body.ids.length > MAX_IDS) {
        return NextResponse.json({ error: `Cannot analyze more than ${MAX_IDS} scenarios at once` }, { status: 400 });
      }

      const ids = body.ids as string[];
      const [snaps, { nameToId, knownIds }] = await Promise.all([
        Promise.all(ids.map((id) => db.collection('scenarios').doc(id).get())),
        loadCountryLookup(),
      ]);

      const results = snaps.map((snap) => {
        if (!snap.exists) {
          return {
            id: snap.id,
            title: '',
            bundle: null,
            auditScore: null,
            auditIssues: ['Scenario not found'],
            changes: [],
            hasChanges: false,
          };
        }
        const scenario = toScenarioDetail(snap.id, snap.data()!);
        const analysis = analyzeScenario(scenario);
        const { updated: relFixed, changed: relChanged } = applyRelationshipConditionRepair(scenario);
        if (relChanged && relFixed.relationship_conditions) {
          analysis.changes.push({
            path: 'relationship_conditions',
            before: JSON.stringify(scenario.relationship_conditions ?? []),
            after: JSON.stringify(relFixed.relationship_conditions),
          });
          analysis.hasChanges = true;
        }
        const fixedCountries = repairApplicableCountries(
          scenario.metadata?.applicable_countries,
          nameToId,
          knownIds
        );
        if (fixedCountries) {
          analysis.changes.push({
            path: 'metadata.applicable_countries',
            before: JSON.stringify(scenario.metadata?.applicable_countries),
            after: JSON.stringify(fixedCountries),
          });
          analysis.hasChanges = true;
        }
        return analysis;
      });

      return NextResponse.json({ results });
    }

    if (body.mode === 'apply') {
      if (!Array.isArray(body.approved) || body.approved.length === 0) {
        return NextResponse.json({ error: 'approved must be a non-empty array' }, { status: 400 });
      }
      if (body.approved.length > MAX_IDS) {
        return NextResponse.json({ error: `Cannot apply more than ${MAX_IDS} repairs at once` }, { status: 400 });
      }

      const approved = body.approved as ApprovedRepair[];
      let applied = 0;
      let skipped = 0;

      for (const repair of approved) {
        if (!repair.id || !Array.isArray(repair.patches) || repair.patches.length === 0) {
          skipped++;
          continue;
        }

        const docRef = db.collection('scenarios').doc(repair.id);
        const snap = await docRef.get();
        if (!snap.exists) { skipped++; continue; }

        const scenario = toScenarioDetail(snap.id, snap.data()!);

        const relConditionPatch = repair.patches.find(p => p.path === 'relationship_conditions');
        const countriesPatch = repair.patches.find(p => p.path === 'metadata.applicable_countries');
        const textPatches = repair.patches.filter(
          p => p.path !== 'relationship_conditions' && p.path !== 'metadata.applicable_countries'
        );
        const patched = applyPatchesToScenario(scenario, textPatches);

        const prevRepairCount = snap.data()?.metadata?.repairMetadata?.repairCount ?? 0;
        const repairMetadata = {
          lastRepairedAt: new Date().toISOString(),
          repairCount: prevRepairCount + 1,
        };

        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = patched;
        const extraFields: Record<string, unknown> = {};
        if (relConditionPatch) {
          try { extraFields.relationship_conditions = JSON.parse(relConditionPatch.value); } catch { /* ignore */ }
        }
        let fixedApplicableCountries: string[] | undefined;
        if (countriesPatch) {
          try {
            const parsed: unknown = JSON.parse(countriesPatch.value);
            if (Array.isArray(parsed)) fixedApplicableCountries = parsed as string[];
          } catch { /* ignore */ }
        }
        await docRef.set(
          {
            ...rest,
            ...extraFields,
            metadata: {
              ...rest.metadata,
              ...(fixedApplicableCountries !== undefined ? { applicable_countries: fixedApplicableCountries } : {}),
              repairMetadata,
            },
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        applied++;
      }

      return NextResponse.json({ applied, skipped });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/scenarios/repair error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
