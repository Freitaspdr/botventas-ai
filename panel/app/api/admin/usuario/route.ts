import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET() {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await getSupabase()
    .from('usuarios')
    .select('id, email, nombre, rol, activo, empresa_id, empresas(nombre)')
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
  const { empresa_id, email, nombre, password, rol } = body;

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: 'email, nombre y password son obligatorios' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
  }

  const allowedRols = ['admin', 'agente'];
  if (rol && !allowedRols.includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido (admin | agente)' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await getSupabase()
    .from('usuarios')
    .insert({
      empresa_id: empresa_id || null,
      email,
      nombre,
      rol: rol || 'admin',
      password_hash,
      activo: true,
    })
    .select('id, email, nombre, rol, empresa_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, activo, password } = body;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof activo === 'boolean') update.activo = activo;
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Contraseña mínimo 8 caracteres' }, { status: 400 });
    update.password_hash = await bcrypt.hash(password, 12);
  }

  const { data, error } = await getSupabase()
    .from('usuarios')
    .update(update)
    .eq('id', id)
    .select('id, email, nombre, rol, activo')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
