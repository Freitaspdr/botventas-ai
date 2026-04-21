import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/db';
import { BotConfigForm } from '@/components/bot-config-form';
import { EvolutionConnector } from '@/components/evolution-connector';
import Link from 'next/link';

export default async function AdminEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') redirect('/');

  const { id } = await params;
  const { data: empresa, error } = await getSupabase()
    .from('empresas')
    .select(`
      id, nombre, whatsapp_num, plan, conv_limite, conv_usadas,
      bot_nombre, bot_tono, bot_objetivo, bot_productos, bot_horarios, bot_ciudad, bot_extra,
      encargado_tel, evolution_instance, evolution_api_url, evolution_api_key,
      notif_hot_leads, notif_transfers, notif_nuevos, notif_resumen
    `)
    .eq('id', id)
    .single();

  if (error || !empresa) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin" className="text-[12px]" style={{ color: '#8a785d' }}>Volver al admin</Link>
        <p className="text-[13px]" style={{ color: '#c2413c' }}>Empresa no encontrada.</p>
      </div>
    );
  }

  const safeEmpresa = {
    ...empresa,
    has_evolution_api_key: !!empresa.evolution_api_key,
    evolution_api_key: '',
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-[#f3e3bf]"
          style={{ color: '#8a5d1a', border: '1px solid rgba(184,134,47,0.22)' }}
        >
          Admin
        </Link>
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: '#2c2418' }}>
            {empresa.nombre}
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: '#8a785d' }}>
            Configuracion completa · Plan <span className="capitalize">{empresa.plan}</span>
          </p>
        </div>
      </div>

      <EvolutionConnector instance={empresa.evolution_instance} empresaId={id} />
      <div className="mt-3" />
      <BotConfigForm empresa={safeEmpresa} isSuperAdmin={true} empresaId={id} />
    </div>
  );
}
