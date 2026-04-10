import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;
  try {
    const configSnap = await db.doc('world_state/generation_config').get();
    const ollamaBaseUrl: string = configSnap.data()?.ollama_base_url || '';

    if (!ollamaBaseUrl) {
      return NextResponse.json({ connected: false, models: [], baseUrl: '', error: 'No ollama_base_url configured in generation_config' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(ollamaBaseUrl);
    } catch {
      return NextResponse.json({ connected: false, models: [], baseUrl: '', error: 'Invalid ollama_base_url' });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ connected: false, models: [], baseUrl: '', error: 'ollama_base_url must use http or https' });
    }
    const hostname = parsedUrl.hostname;
    const isPrivate = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
      || /^169\.254\./.test(hostname) || /^10\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)
      || hostname === 'metadata.google.internal' || hostname.endsWith('.internal');
    if (isPrivate && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ connected: false, models: [], baseUrl: '', error: 'ollama_base_url must not target internal addresses in production' });
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
