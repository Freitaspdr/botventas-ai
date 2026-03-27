import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BotConfigForm } from '@/components/bot-config-form';
import { EvolutionConnector } from '@/components/evolution-connector';
import Link from 'next/link';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export default async function AdminEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { rol?: string })?.rol !== 'superadmin') redirect('/');

  const { id } = await params;
  const { data: empresa, error } = await getSupabase()
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !empresa) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin" className="text-[12px]" style={{ color: '#71717a' }}>← Volver al admin</Link>
        <p className="text-[13px]" style={{ color: '#f87171' }}>Empresa no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-[12px] px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
          style={{ color: '#71717a', border: '0.5px solid rgba(255,255,255,0.07)' }}
        >
          ← Admin
        </Link>
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
            {empresa.nombre}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
            Configuración completa · Plan <span className="capitalize">{empresa.plan}</span>
          </p>
        </div>
      </div>

      <EvolutionConnector instance={empresa.evolution_instance} empresaId={id} />
      <div className="mt-3" />
      <BotConfigForm empresa={empresa} isSuperAdmin={true} empresaId={id} />
    </div>
  );
}
