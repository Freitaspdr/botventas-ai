import { BotConfigForm } from '@/components/bot-config-form';
import { EvolutionConnector } from '@/components/evolution-connector';
import { getEmpresa } from '@/lib/data';
import { auth } from '@/lib/auth';

export default async function ConfiguracionPage() {
  const [empresa, session] = await Promise.all([getEmpresa(), auth()]);
  const isSuperAdmin = (session?.user as { rol?: string })?.rol === 'superadmin';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
          Configuración
        </h1>
        <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>
          {empresa?.nombre ? `Configuración del bot de ${empresa.nombre}` : 'Personaliza tu asistente'}
        </p>
      </div>

      {empresa ? (
        <>
          <EvolutionConnector instance={empresa.evolution_instance} />
          <div className="mt-5" />
          <BotConfigForm empresa={empresa} isSuperAdmin={isSuperAdmin} />
        </>
      ) : (
        <p className="text-[13px]" style={{ color: '#71717a' }}>No se pudo cargar la configuración.</p>
      )}
    </div>
  );
}
