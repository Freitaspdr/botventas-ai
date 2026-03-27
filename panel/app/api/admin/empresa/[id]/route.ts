import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const PLAN_LIMITS: Record<string, number> = {
  starter:    500,
  pro:        2000,
  enterprise: 999999,
};

const ALLOWED_FIELDS = [
  'bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos',
  'bot_horarios', 'bot_ciudad', 'bot_extra',
  'encargado_tel', 'evolution_instance', 'evolution_api_url', 'evolution_api_key',
  'notif_hot_leads', 'notif_transfers', 'notif_nuevos', 'notif_resumen',
  'plan',
];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k)),
  );

  // Si cambia el plan, actualiza también conv_limite automáticamente
  if (update.plan && PLAN_LIMITS[update.plan as string]) {
    update.conv_limite = PLAN_LIMITS[update.plan as string];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('empresas')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
