import { SemanaCitas } from '@/components/semana-citas';

async function getCitas() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/citas`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CitasPage() {
  const citas = await getCitas();
  const pendientes  = citas.filter((c: { estado: string }) => c.estado === 'pendiente').length;
  const confirmadas = citas.filter((c: { estado: string }) => c.estado === 'confirmada').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight" style={{ color: '#fafafa' }}>
          Citas
        </h1>
        {pendientes > 0 && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}
          >
            {pendientes} pendientes
          </span>
        )}
        {confirmadas > 0 && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}
          >
            {confirmadas} confirmadas
          </span>
        )}
      </div>

      <SemanaCitas initialCitas={citas} />
    </div>
  );
}
