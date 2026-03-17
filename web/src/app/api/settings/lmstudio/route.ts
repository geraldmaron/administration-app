import { NextResponse } from 'next/server';
import { isEmulatorMode } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';

export async function GET() {
  if (!isEmulatorMode) {
    return NextResponse.json({
      connected: false,
      models: [],
      baseUrl: '',
      emulatorMode: false,
      error: 'LM Studio requires emulator mode (USE_FIREBASE_EMULATOR=true)',
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${LMSTUDIO_BASE_URL}/models`, {
      headers: { 'Authorization': 'Bearer lm-studio' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        models: [],
        baseUrl: LMSTUDIO_BASE_URL,
        emulatorMode: true,
        error: `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    const models: string[] = (data.data || []).map((m: any) => m.id).filter(Boolean);

    return NextResponse.json({
      connected: true,
      models,
      baseUrl: LMSTUDIO_BASE_URL,
      emulatorMode: true,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      models: [],
      baseUrl: LMSTUDIO_BASE_URL,
      emulatorMode: true,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
