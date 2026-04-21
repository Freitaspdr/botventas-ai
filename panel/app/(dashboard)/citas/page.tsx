import { SemanaCitas } from '@/components/semana-citas';
import { getCitas } from '@/lib/data';

export default async function CitasPage() {
  const citas = await getCitas();
  const pendientes  = citas.filter((c: { estado: string }) => c.estado === 'pendiente').length;
  const confirmadas = citas.filter((c: { estado: string }) => c.estado === 'confirmada').length;

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
        <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-[-0.05em]" style={{ color: '#2c2418' }}>
          Citas
        </h1>
        {pendientes > 0 && (
          <span
            className="rounded-full px-3 py-1 text-[10px] font-medium"
            style={{ background: '#f3e3bf', color: '#704a14' }}
          >
            {pendientes} pendientes
          </span>
        )}
        {confirmadas > 0 && (
          <span
            className="rounded-full px-3 py-1 text-[10px] font-medium"
            style={{ background: '#dfeedd', color: '#3f744d' }}
          >
            {confirmadas} confirmadas
          </span>
        )}
        </div>
        <p className="mt-3 text-[14px]" style={{ color: '#6f604a' }}>
          Gestiona la semana completa, cambia estados y crea citas manuales sin salir del panel.
        </p>
      </div>

      <SemanaCitas initialCitas={citas} />
    </div>
  );
}
