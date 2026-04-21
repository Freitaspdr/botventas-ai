import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { BOTVENTAS_API_URL, DEFAULT_EVOLUTION_API_URL } from '@/lib/server-config';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const WEBHOOK_URL = `${BOTVENTAS_API_URL}/webhook`;

async function getEmpresaConfig(empresaId: string) {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('evolution_instance, evolution_api_url, evolution_api_key')
    .eq('id', empresaId)
    .single();
  if (error || !data) throw new Error('Empresa no encontrada');
  return data;
}

// Resuelve el empresaId correcto: superadmin puede pasar ?empresaId=xxx
async function resolveEmpresaId(req: Request, session: { user?: { empresaId?: string; rol?: string } } | null): Promise<string | null> {
  const { searchParams } = new URL(req.url);
  const paramId = searchParams.get('empresaId');
  const rol = (session?.user as { rol?: string })?.rol;
  if (paramId && rol === 'superadmin') return paramId;
  return session?.user?.empresaId ?? null;
}

function evoHeaders(apiKey: string): Record<string, string> {
  return { 'Content-Type': 'application/json', apikey: apiKey };
}

// GET ?action=status  →  GET /instance/status/:instance
// GET ?action=qr      →  GET /instance/qrcode/:instance
export async function GET(req: Request) {
  const session = await auth();
  const empresaId = await resolveEmpresaId(req, session);
  if (!empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const empresa = await getEmpresaConfig(empresaId);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';
    const instance = empresa.evolution_instance;
    if (!instance) return NextResponse.json({ error: 'Sin instancia configurada' }, { status: 400 });

    const base = empresa.evolution_api_url || DEFAULT_EVOLUTION_API_URL;
    const headers = evoHeaders(empresa.evolution_api_key || '');

    let url: string;
    if (action === 'qr') {
      url = `${base}/instance/connect/${instance}`;
    } else {
      url = `${base}/instance/connectionState/${instance}`;
    }

    const res = await fetch(url, { headers });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST → POST /instance/connect/:instance  (genera QR)
export async function POST(req: Request) {
  const session = await auth();
  const empresaId = await resolveEmpresaId(req, session);
  if (!empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const empresa = await getEmpresaConfig(empresaId);
    const instance = empresa.evolution_instance;
    if (!instance) return NextResponse.json({ error: 'Sin instancia configurada' }, { status: 400 });

    const base = empresa.evolution_api_url || DEFAULT_EVOLUTION_API_URL;
    const headers = evoHeaders(empresa.evolution_api_key || '');

    const res = await fetch(`${base}/instance/connect/${instance}`, { method: 'GET', headers });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.ok ? 200 : res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT → Crear instancia nueva en Evolution API + guardar en DB
export async function PUT(req: Request) {
  const session = await auth();
  const empresaId = await resolveEmpresaId(req, session);
  if (!empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const empresa = await getEmpresaConfig(empresaId);
    const base = empresa.evolution_api_url || DEFAULT_EVOLUTION_API_URL;
    const apiKey = empresa.evolution_api_key || '';
    const headers = evoHeaders(apiKey);

    // Use existing instance name or derive from the request body
    const instanceName = empresa.evolution_instance || body.instanceName;
    if (!instanceName) return NextResponse.json({ error: 'instanceName requerido' }, { status: 400 });

    const createBody: Record<string, unknown> = {
      instanceName,
      qrcode: true,
      webhook: {
        url: WEBHOOK_URL,
        enabled: true,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
      },
    };

    if (process.env.WEBHOOK_SECRET) {
      createBody.webhook = {
        ...(createBody.webhook as Record<string, unknown>),
        headers: { 'x-webhook-secret': process.env.WEBHOOK_SECRET },
      };
    }

    const res = await fetch(`${base}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody),
    });

    // 409 = already exists → treat as success
    if (!res.ok && res.status !== 409) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err?.message || `HTTP ${res.status}` }, { status: res.status });
    }

    // Save instanceName in DB if not already stored
    if (!empresa.evolution_instance) {
      await getSupabase()
        .from('empresas')
        .update({ evolution_instance: instanceName })
        .eq('id', empresaId);
    }

    const payload = res.status === 409 ? { instanceName, alreadyExists: true } : await res.json();
    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE → Logout instancia (desconectar WhatsApp)
export async function DELETE(req: Request) {
  const session = await auth();
  const empresaId = await resolveEmpresaId(req, session);
  if (!empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const empresa = await getEmpresaConfig(empresaId);
    const instance = empresa.evolution_instance;
    if (!instance) return NextResponse.json({ error: 'Sin instancia configurada' }, { status: 400 });

    const base = empresa.evolution_api_url || DEFAULT_EVOLUTION_API_URL;
    const headers = evoHeaders(empresa.evolution_api_key || '');

    const res = await fetch(`${base}/instance/logout/${instance}`, { method: 'DELETE', headers });
    const payload = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(payload, { status: res.ok ? 200 : res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
