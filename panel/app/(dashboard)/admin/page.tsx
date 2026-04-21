import { auth } from '@/lib/auth';
import { getSupabase } from '@/lib/db';
import { AdminForms } from '@/components/admin-forms';
import { AdminGuide } from '@/components/admin-guide';
import Link from 'next/link';

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

const tableFrame: React.CSSProperties = {
  border: '1px solid rgba(218,197,160,0.72)',
  background: '#fffdfa',
};

const headRow: React.CSSProperties = {
  borderBottom: '1px solid rgba(218,197,160,0.62)',
  background: '#f8efe0',
};

const rowBorder: React.CSSProperties = {
  borderBottom: '1px solid rgba(218,197,160,0.44)',
};

export default async function AdminPage() {
  const session = await auth();
  const rol = (session?.user as { rol?: string })?.rol;

  if (rol !== 'superadmin') {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-[13px]" style={{ color: '#8a785d' }}>Acceso restringido a super-administradores.</p>
      </div>
    );
  }

  const { empresas, usuarios } = await getAdminData();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium tracking-tight" style={{ color: '#2c2418' }}>Super Admin</h1>

      <section>
        <p className="mb-3 text-[13px] font-medium" style={{ color: '#5f513e' }}>Empresas ({empresas.length})</p>
        <div className="overflow-hidden rounded-xl" style={tableFrame}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={headRow}>
                {['Nombre', 'Plan', 'Conv', 'Instancia WA', 'Numero WA', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: '#8a785d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.id} style={rowBorder}>
                  <td className="px-3 py-2" style={{ color: '#2c2418' }}>{e.nombre}</td>
                  <td className="px-3 py-2 capitalize" style={{ color: '#5f513e' }}>{e.plan}</td>
                  <td className="px-3 py-2" style={{ color: '#5f513e' }}>{e.conv_usadas}/{e.conv_limite}</td>
                  <td className="px-3 py-2" style={{ color: '#5f513e' }}>{e.evolution_instance || '-'}</td>
                  <td className="px-3 py-2" style={{ color: '#5f513e' }}>{e.whatsapp_num || '-'}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/empresa/${e.id}`}
                      className="rounded-md px-2.5 py-1 text-[11px] transition-colors hover:bg-[#f3e3bf]"
                      style={{ color: '#8a5d1a', border: '1px solid rgba(184,134,47,0.22)' }}
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

      <section>
        <p className="mb-3 text-[13px] font-medium" style={{ color: '#5f513e' }}>Usuarios ({usuarios.length})</p>
        <div className="overflow-hidden rounded-xl" style={tableFrame}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={headRow}>
                {['Email', 'Nombre', 'Rol', 'Empresa ID', 'Activo'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: '#8a785d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={rowBorder}>
                  <td className="px-3 py-2" style={{ color: '#2c2418' }}>{u.email}</td>
                  <td className="px-3 py-2" style={{ color: '#5f513e' }}>{u.nombre}</td>
                  <td className="px-3 py-2" style={{ color: '#5f513e' }}>{u.rol}</td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: '#8a785d' }}>{u.empresa_id?.slice(0, 8) || '-'}</td>
                  <td className="px-3 py-2">
                    <span style={{ color: u.activo ? '#3f744d' : '#c2413c' }}>{u.activo ? 'Si' : 'No'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminForms empresas={empresas} />
      <AdminGuide />
    </div>
  );
}
