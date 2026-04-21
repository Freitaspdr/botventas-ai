import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BOTVENTAS_API_URL } from '@/lib/server-config';
import { isUUID } from '@/lib/utils';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.empresaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!isUUID(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-empresa-id': session.user.empresaId,
  };

  if (process.env.WEBHOOK_SECRET) {
    headers['x-botventas-secret'] = process.env.WEBHOOK_SECRET;
  }

  const res = await fetch(`${BOTVENTAS_API_URL}/crm/conversaciones/${id}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
    cache: 'no-store',
  });

  const payload = await res.json().catch(() => ({ error: 'Error interno' }));
  if (!res.ok) {
    return NextResponse.json({ error: payload.error ?? 'Error interno' }, { status: res.status });
  }

  return NextResponse.json(payload.data ?? payload);
}
