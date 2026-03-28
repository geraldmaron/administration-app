import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configSnap = await db.doc('world_state/generation_config').get();
    const ollamaBaseUrl: string = configSnap.data()?.ollama_base_url || '';

    if (!ollamaBaseUrl) {
      return NextResponse.json({ connected: false, models: [], baseUrl: '', error: 'No ollama_base_url configured in generation_config' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ollamaBaseUrl}/models`, {
      headers: { 'Authorization': 'Bearer ollama' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ connected: false, models: [], baseUrl: ollamaBaseUrl, error: `HTTP ${response.status}` });
    }

    const data = await response.json();
    const models: string[] = (data.data || []).map((m: { id?: string }) => m.id).filter(Boolean);

    return NextResponse.json({ connected: true, models, baseUrl: ollamaBaseUrl });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      models: [],
      baseUrl: '',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
