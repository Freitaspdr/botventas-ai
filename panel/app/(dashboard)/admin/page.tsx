import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { AdminForms } from '@/components/admin-forms';
import { AdminGuide } from '@/components/admin-guide';
import Link from 'next/link';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

async function getAdminData() {
  const [empresasRes, usuariosRes] = await Promise.all([
    getSupabase().from('empresas').select('id, nombre, plan, conv_usadas, conv_limite, evolution_instance, whatsapp_num').order('creado_en', { ascending: false }),
    getSupabase().from('usuarios').select('id, email, nombre, rol, activo, empresa_id').order('creado_en', { ascending: false }),
  ]);
  return {
    empresas: (empresasRes.data ?? []) as { id: string; nombre: string; plan: string; conv_usadas: number; conv_limite: number; evolution_instance: string | null; whatsapp_num: string }[],
    usuarios: (usuariosRes.data ?? []) as { id: string; email: string; nombre: string; rol: string; activo: boolean; empresa_id: string | null }[],
  };
}

export default async function AdminPage() {
  const session = await auth();
  const rol = (session?.user as { rol?: string })?.rol;

  if (rol !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-[13px]" style={{ color: '#71717a' }}>Acceso restringido a super-administradores.</p>
      </div>
    );
  }

  const { empresas, usuarios } = await getAdminData();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>Super Admin</h1>

      {/* Empresas table */}
      <section>
        <p className="text-[13px] font-medium mb-3" style={{ color: '#a1a1aa' }}>Empresas ({empresas.length})</p>
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {['Nombre', 'Plan', 'Conv', 'Instancia WA', 'Número WA', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: '#71717a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-3 py-2" style={{ color: '#fafafa' }}>{e.nombre}</td>
                  <td className="px-3 py-2 capitalize" style={{ color: '#a1a1aa' }}>{e.plan}</td>
                  <td className="px-3 py-2" style={{ color: '#a1a1aa' }}>{e.conv_usadas}/{e.conv_limite}</td>
                  <td className="px-3 py-2" style={{ color: '#a1a1aa' }}>{e.evolution_instance || '—'}</td>
                  <td className="px-3 py-2" style={{ color: '#a1a1aa' }}>{e.whatsapp_num || '—'}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/empresa/${e.id}`}
                      className="text-[11px] px-2.5 py-1 rounded-md transition-colors hover:bg-blue-500/20"
                      style={{ color: '#60a5fa', border: '0.5px solid rgba(96,165,250,0.2)' }}
                    >
                      Configurar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usuarios table */}
      <section>
        <p className="text-[13px] font-medium mb-3" style={{ color: '#a1a1aa' }}>Usuarios ({usuarios.length})</p>
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                {['Email', 'Nombre', 'Rol', 'Empresa ID', 'Activo'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: '#71717a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-3 py-2" style={{ color: '#fafafa' }}>{u.email}</td>
                  <td className="px-3 py-2" style={{ color: '#a1a1aa' }}>{u.nombre}</td>
                  <td className="px-3 py-2" style={{ color: '#a1a1aa' }}>{u.rol}</td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: '#52525b' }}>{u.empresa_id?.slice(0, 8) || '—'}</td>
                  <td className="px-3 py-2">
                    <span style={{ color: u.activo ? '#4ade80' : '#f87171' }}>{u.activo ? 'Sí' : 'No'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Forms */}
      <AdminForms empresas={empresas} />

      {/* Guía paso a paso */}
      <AdminGuide />
    </div>
  );
}
