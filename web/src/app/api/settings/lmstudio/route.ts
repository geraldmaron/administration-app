import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const LOCAL_LMSTUDIO_URL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';

async function testConnection(baseUrl: string): Promise<{ connected: boolean; models: string[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': 'Bearer lm-studio' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { connected: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models: string[] = (data.data || []).map((m: { id?: string }) => m.id).filter(Boolean);
    return { connected: true, models };
  } catch (error) {
    return {
      connected: false,
      models: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const [localResult, configSnap] = await Promise.all([
    testConnection(LOCAL_LMSTUDIO_URL),
    db.doc('world_state/generation_config').get(),
  ]);

  const tunnelUrl: string | undefined = configSnap.data()?.lmstudio_base_url || undefined;

  const result: Record<string, unknown> = {
    connected: localResult.connected,
    models: localResult.models,
    baseUrl: LOCAL_LMSTUDIO_URL,
    ...(localResult.error ? { error: localResult.error } : {}),
  };

  if (tunnelUrl) {
    const remoteResult = await testConnection(tunnelUrl);
    result.remoteStatus = {
      url: tunnelUrl,
      connected: remoteResult.connected,
      ...(remoteResult.error ? { error: remoteResult.error } : {}),
    };
  } else {
    result.remoteStatus = null;
  }

  return NextResponse.json(result);
}
