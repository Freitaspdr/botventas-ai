import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_EVOLUTION_API_URL } from '@/lib/server-config';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET() {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('id, nombre, plan, conv_usadas, conv_limite, evolution_instance, evolution_api_url, whatsapp_num')
    .order('creado_en', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { nombre, whatsapp_num, plan, email_contacto, evolution_instance, evolution_api_url, evolution_api_key } = body;

  if (!nombre || !whatsapp_num) {
    return NextResponse.json({ error: 'nombre y whatsapp_num son obligatorios' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('empresas')
    .insert({
      nombre,
      whatsapp_num: whatsapp_num || `PENDING-${Date.now()}`,
      plan: plan || 'starter',
      email_contacto: email_contacto || null,
      evolution_instance: evolution_instance || null,
      evolution_api_url: evolution_api_url || DEFAULT_EVOLUTION_API_URL,
      evolution_api_key: evolution_api_key || null,
      conv_limite: plan === 'pro' ? 2000 : plan === 'enterprise' ? 999999 : 500,
    })
    .select('id, nombre, plan, whatsapp_num')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
