import { BotConfigForm } from '@/components/bot-config-form';
import { CrmIntegrationCard } from '@/components/crm-integration-card';
import { EvolutionConnector } from '@/components/evolution-connector';
import { getEmpresa } from '@/lib/data';
import { auth } from '@/lib/auth';
import { BOTVENTAS_API_URL } from '@/lib/server-config';

export default async function ConfiguracionPage() {
  const [empresa, session] = await Promise.all([getEmpresa(), auth()]);
  const isSuperAdmin = (session?.user as { rol?: string })?.rol === 'superadmin';

  return (
    <div className="flex flex-col gap-5">
      <div
        className="rounded-[28px] p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.36))',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 20px 52px rgba(116,82,28,0.1)',
        }}
      >
        <h1 className="text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
          Configuración
        </h1>
        <p className="text-[14px] mt-3" style={{ color: '#6f604a' }}>
          {empresa?.nombre ? `Configuración del bot de ${empresa.nombre}` : 'Personaliza tu asistente'}
        </p>
      </div>

      {empresa ? (
        <>
          <CrmIntegrationCard
            token={empresa.crm_api_token}
            apiBaseUrl={BOTVENTAS_API_URL}
          />
          <EvolutionConnector instance={empresa.evolution_instance} />
          <div className="mt-5" />
          <BotConfigForm empresa={empresa} isSuperAdmin={isSuperAdmin} />
        </>
      ) : (
        <p className="text-[13px]" style={{ color: '#8a785d' }}>No se pudo cargar la configuración.</p>
      )}
    </div>
  );
}
