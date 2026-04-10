import { NextRequest, NextResponse } from 'next/server';

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (secret && request.headers.get('x-admin-secret') === secret) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
