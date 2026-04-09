import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { exportScenarioBundles } from '@/lib/scenario-bundle-export';

export const dynamic = 'force-dynamic';

// GET /api/jobs/[id]/review — list pending scenarios for a dry-run job
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { id: jobId } = params;
  const jobRef = db.collection('generation_jobs').doc(jobId);

  const [jobSnap, pendingSnap] = await Promise.all([
    jobRef.get(),
    jobRef.collection('pending_scenarios').orderBy('__name__').get(),
  ]);

  if (!jobSnap.exists) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const job = jobSnap.data()!;
  if (!job.dryRun) {
    return NextResponse.json({ error: 'Not a dry-run job' }, { status: 400 });
  }

  const scenarios = pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ scenarios, total: scenarios.length, jobStatus: job.status });
}

// POST /api/jobs/[id]/review — accept or reject pending scenarios
// Body: { action: 'accept', scenarioIds: string[] }
//       { action: 'reject', scenarioIds: string[] }
//       { action: 'accept_all' }
//       { action: 'reject_all' }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { id: jobId } = params;
  const jobRef = db.collection('generation_jobs').doc(jobId);
  const pendingRef = jobRef.collection('pending_scenarios');

  const body = (await request.json()) as {
    action: 'accept' | 'reject' | 'accept_all' | 'reject_all';
    scenarioIds?: string[];
  };

  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobSnap.data()!;
  if (!job.dryRun) {
    return NextResponse.json({ error: 'Not a dry-run job' }, { status: 400 });
  }

  // Resolve which scenario docs to operate on
  let targetIds: string[];
  if (body.action === 'accept_all' || body.action === 'reject_all') {
    const allSnap = await pendingRef.get();
    targetIds = allSnap.docs.map((d) => d.id);
  } else {
    targetIds = body.scenarioIds ?? [];
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ accepted: 0, rejected: 0 });
  }

  const isAccept = body.action === 'accept' || body.action === 'accept_all';
  let accepted = 0;
  let rejected = 0;
  const acceptedBundleIds = new Set<string>();

  // Process in batches of 20 (docs can be large)
  for (let i = 0; i < targetIds.length; i += 20) {
    const batch = db.batch();
    const chunk = targetIds.slice(i, i + 20);

    if (isAccept) {
      // Fetch the scenario data and write to the main scenarios collection
      const docs = await Promise.all(chunk.map((id) => pendingRef.doc(id).get()));
      for (const doc of docs) {
        if (!doc.exists) continue;
        const data = doc.data()!;
        const bundleId = typeof data.metadata?.bundle === 'string' ? data.metadata.bundle : null;
        const scenarioRef = db.collection('scenarios').doc(doc.id);
        batch.set(scenarioRef, {
          ...data,
          is_active: true,
          created_at: FieldValue.serverTimestamp(),
          acceptedFromDryRun: jobId,
        });
        batch.delete(pendingRef.doc(doc.id));
        if (bundleId) {
          acceptedBundleIds.add(bundleId);
        }
        accepted++;
      }
    } else {
      for (const id of chunk) {
        batch.delete(pendingRef.doc(id));
        rejected++;
      }
    }

    await batch.commit();
  }

  // Check if any pending scenarios remain and update job status accordingly
  const remaining = await pendingRef.count().get();
  const remainingCount = remaining.data().count;

  if (remainingCount === 0) {
    await jobRef.update({
      status: accepted > 0 ? 'completed' : 'cancelled',
      completedAt: FieldValue.serverTimestamp(),
    });
  }

  let rebuiltBundles: Record<string, number> = {};
  if (acceptedBundleIds.size > 0) {
    rebuiltBundles = await exportScenarioBundles(acceptedBundleIds);
  }

  return NextResponse.json({ accepted, rejected, remaining: remainingCount, rebuiltBundles });
}
