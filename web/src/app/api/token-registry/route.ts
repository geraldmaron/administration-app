import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { getCached, setCache, clearCache } from '@/lib/cache';
import type {
  TokenRegistryDocument,
  TokenRegistryOperation,
  PatchTokenRegistryRequest,
  TokenRegistrySummary,
} from '@shared/token-registry-contract';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cached = getCached<{ summary: TokenRegistrySummary; registry: TokenRegistryDocument }>('token-registry');
  if (cached) return NextResponse.json(cached);

  try {
    const snap = await db.doc('world_state/token_registry').get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'token_registry not found' }, { status: 404 });
    }

    const registry = snap.data() as TokenRegistryDocument;
    const summary: TokenRegistrySummary = {
      version: registry.version,
      tokenCount: Object.keys(registry.tokensByName).length,
      aliasCount: Object.keys(registry.aliasesByName).length,
      conceptCount: Object.keys(registry.conceptsById).length,
      derivedArticleFormCount: Object.values(registry.tokensByName).filter(token => token.articleForm?.enabled).length,
      updatedAt: registry.updatedAt,
      updatedBy: registry.updatedBy,
    };

    const result = { summary, registry };
    setCache('token-registry', result, 30_000);
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/token-registry error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as PatchTokenRegistryRequest;
    if (!Array.isArray(body.operations)) {
      return NextResponse.json({ error: 'Invalid operations payload' }, { status: 400 });
    }

    const docRef = db.doc('world_state/token_registry');
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'token_registry not found' }, { status: 404 });
    }

    const doc = snap.data() as TokenRegistryDocument;

    if (body.expectedVersion !== undefined && body.expectedVersion !== doc.version) {
      return NextResponse.json(
        {
          error: 'Version conflict',
          currentVersion: doc.version,
          expectedVersion: body.expectedVersion,
        },
        { status: 409 }
      );
    }

    for (const op of body.operations as TokenRegistryOperation[]) {
      switch (op.op) {
        case 'upsertToken':
          doc.tokensByName[op.token.name] = op.token;
          break;
        case 'deleteToken':
          delete doc.tokensByName[op.tokenName];
          break;
        case 'upsertAlias':
          doc.aliasesByName[op.alias.alias] = op.alias;
          break;
        case 'deleteAlias':
          delete doc.aliasesByName[op.aliasName];
          break;
        case 'upsertConcept':
          doc.conceptsById[op.concept.id] = op.concept;
          break;
        case 'deleteConcept':
          delete doc.conceptsById[op.conceptId];
          break;
        default:
          return NextResponse.json({ error: `Unsupported operation: ${(op as { op: string }).op}` }, { status: 400 });
      }
    }

    doc.version += 1;
    doc.updatedAt = new Date().toISOString();
    doc.updatedBy = 'admin';

    await docRef.set(doc);
    clearCache('token-registry');

    return NextResponse.json({ success: true, version: doc.version, applied: body.operations.length });
  } catch (err) {
    console.error('PATCH /api/token-registry error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
