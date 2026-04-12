'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { analyzeScenario, applyPatchesToScenario, applyRelationshipConditionRepair } from '@shared/scenario-repair';
import { toScenarioDetail } from '@/lib/scenario-normalization';
import type { RepairAnalysis, ApprovedRepair } from '@/lib/types';

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

const MAX_IDS = 50;

export async function analyzeRepairAction(
  ids: string[],
  force = false,
): Promise<{ results: RepairAnalysis[]; confirmedSkippedCount: number }> {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('ids must be a non-empty array');
  if (ids.length > MAX_IDS) throw new Error(`Cannot analyze more than ${MAX_IDS} scenarios at once`);

  const [snaps, { nameToId, knownIds }] = await Promise.all([
    Promise.all(ids.map((id) => db.collection('scenarios').doc(id).get())),
    loadCountryLookup(),
  ]);

  let confirmedSkippedCount = 0;

  const results = snaps
    .map((snap): RepairAnalysis | null => {
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

      const isConfirmed = snap.data()?.metadata?.repairMetadata?.confirmedClean === true;
      if (isConfirmed && !force) {
        confirmedSkippedCount++;
        return null;
      }

      const scenario = toScenarioDetail(snap.id, snap.data()!);
      const analysis = analyzeScenario(scenario);

      if (isConfirmed) {
        analysis.confirmedClean = true;
      }

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
    })
    .filter((r): r is RepairAnalysis => r !== null);

  return { results, confirmedSkippedCount };
}

export async function applyRepairsAction(approved: ApprovedRepair[]): Promise<{ applied: number; skipped: number }> {
  if (!Array.isArray(approved) || approved.length === 0) throw new Error('approved must be a non-empty array');
  if (approved.length > MAX_IDS) throw new Error(`Cannot apply more than ${MAX_IDS} repairs at once`);

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

  return { applied, skipped };
}
