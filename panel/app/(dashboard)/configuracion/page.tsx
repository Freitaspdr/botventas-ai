import { BotConfigForm } from '@/components/bot-config-form';

async function getEmpresa() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/empresa`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ConfiguracionPage() {
  const empresa = await getEmpresa();

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
        <BotConfigForm empresa={empresa} />
      ) : (
        <p className="text-[13px]" style={{ color: '#71717a' }}>No se pudo cargar la configuración.</p>
      )}
    </div>
  );
}
