import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabase } from '@/lib/db';

const EMPRESA_FIELDS = [
  'nombre', 'bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos', 'bot_horarios',
  'bot_ciudad', 'bot_extra', 'encargado_tel', 'crm_api_token',
  'evolution_instance', 'evolution_api_url', 'evolution_api_key',
  'plan', 'conv_limite', 'conv_usadas',
  'notif_hot_leads', 'notif_transfers', 'notif_nuevos', 'notif_resumen',
];

const ALLOWED_PATCH = [
  'bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos',
  'bot_horarios', 'bot_ciudad', 'bot_extra',
  'encargado_tel', 'evolution_instance', 'evolution_api_url',
  'notif_hot_leads', 'notif_transfers', 'notif_nuevos', 'notif_resumen',
];

function safeEmpresaResponse(data: unknown) {
  const { evolution_api_key: secret, ...safeData } =
    data as { evolution_api_key?: string | null } & Record<string, unknown>;

  return {
    ...safeData,
    has_evolution_api_key: !!secret,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabase()
    .from('empresas')
    .select(EMPRESA_FIELDS.join(', '))
    .eq('id', session.user.empresaId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(safeEmpresaResponse(data));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.empresaId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED_PATCH.includes(k)),
  );
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 });

  const { data, error } = await getSupabase()
    .from('empresas')
    .update(update)
    .eq('id', session.user.empresaId)
    .select(EMPRESA_FIELDS.join(', '))
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(safeEmpresaResponse(data));
}
