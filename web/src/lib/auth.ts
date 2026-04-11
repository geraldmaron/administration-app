import { NextRequest, NextResponse } from 'next/server';

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  if (request.headers.get('x-admin-secret') === secret) return null;

  const host = request.headers.get('host') ?? '';
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return null;

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
