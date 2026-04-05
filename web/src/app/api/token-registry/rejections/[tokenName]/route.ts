import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import type {
  ResolveRejectedTokenAction,
  TokenDefinition,
  TokenAliasDefinition,
  TokenRejectionDocument,
  TokenRegistryDocument,
} from '@shared/token-registry-contract';

export const dynamic = 'force-dynamic';

function buildResolution(note?: string, targetToken?: string) {
  const resolvedAt = new Date().toISOString();
  return {
    ...(targetToken ? { targetToken } : {}),
    ...(note ? { note } : {}),
    resolvedAt,
    resolvedBy: 'admin',
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tokenName: string }> }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { tokenName } = await params;

  try {
    const body = (await request.json()) as ResolveRejectedTokenAction;

    const rejectionRef = db.collection('token_rejections').doc(tokenName);
    const rejectionSnap = await rejectionRef.get();
    if (!rejectionSnap.exists) {
      return NextResponse.json({ error: 'Rejected token not found' }, { status: 404 });
    }

    const rejection = rejectionSnap.data() as TokenRejectionDocument;
    const registryRef = db.doc('world_state/token_registry');

    if (body.action === 'alias') {
      await db.runTransaction(async transaction => {
        const registrySnap = await transaction.get(registryRef);
        if (!registrySnap.exists) {
          throw new Error('token_registry not found');
        }

        const registry = registrySnap.data() as TokenRegistryDocument;
        const alias: TokenAliasDefinition = {
          alias: tokenName,
          targetToken: body.targetToken,
          source: 'rejection',
        };

        registry.aliasesByName[alias.alias] = alias;
        registry.version += 1;
        registry.updatedAt = new Date().toISOString();
        registry.updatedBy = 'admin';

        transaction.set(registryRef, registry);
        transaction.update(rejectionRef, {
          ...rejection,
          status: 'aliased',
          resolution: buildResolution(body.note, body.targetToken),
        } satisfies TokenRejectionDocument);
      });
    } else if (body.action === 'addToken') {
      await db.runTransaction(async transaction => {
        const registrySnap = await transaction.get(registryRef);
        if (!registrySnap.exists) {
          throw new Error('token_registry not found');
        }

        const registry = registrySnap.data() as TokenRegistryDocument;
        const token: TokenDefinition = body.token;

        registry.tokensByName[token.name] = token;
        registry.version += 1;
        registry.updatedAt = new Date().toISOString();
        registry.updatedBy = 'admin';

        transaction.set(registryRef, registry);
        transaction.update(rejectionRef, {
          ...rejection,
          status: 'added',
          resolution: buildResolution(body.note),
        } satisfies TokenRejectionDocument);
      });
    } else if (body.action === 'dismiss') {
      await rejectionRef.update({
        ...rejection,
        status: 'dismissed',
        resolution: buildResolution(body.note),
      } satisfies TokenRejectionDocument);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action: body.action, tokenName });
  } catch (err) {
    console.error(`PATCH /api/token-registry/rejections/${tokenName} error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
