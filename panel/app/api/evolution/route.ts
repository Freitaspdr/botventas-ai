import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const BACKEND_URL = process.env.BOTVENTAS_API_URL || 'http://localhost:3000';

async function getEmpresaConfig(empresaId: string) {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('evolution_instance, evolution_api_url, evolution_api_key')
    .eq('id', empresaId)
    .single();

  if (error || !data) {
    throw new Error('No se encontró empresa');
  }

  return data;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.empresaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const empresa = await getEmpresaConfig(session.user.empresaId);
    const requestUrl = new URL(req.url);
    const instance = empresa.evolution_instance || requestUrl.searchParams.get('instance');
    if (!instance) return NextResponse.json({ error: 'instance obligatorio' }, { status: 400 });

    const url = `${empresa.evolution_api_url || BACKEND_URL}/instance/status/${instance}`;
    const headers: Record<string, string> = {};
    if (empresa.evolution_api_key) headers.apikey = empresa.evolution_api_key;

    const res = await fetch(url, { headers });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (err: any) {
    console.error('Error GET /api/evolution:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.empresaId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const empresa = await getEmpresaConfig(session.user.empresaId);
    const requestUrl = new URL(req.url);
    const instance = empresa.evolution_instance || requestUrl.searchParams.get('instance');
    if (!instance) return NextResponse.json({ error: 'instance obligatorio' }, { status: 400 });

    const url = `${empresa.evolution_api_url || BACKEND_URL}/instance/connect/${instance}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (empresa.evolution_api_key) headers.apikey = empresa.evolution_api_key;

    const res = await fetch(url, { method: 'POST', headers });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (err: any) {
    console.error('Error POST /api/evolution:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 });
  }
}
