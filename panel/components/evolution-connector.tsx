'use client';

import { useEffect, useState } from 'react';

export function EvolutionConnector({ instance }: { instance?: string }) {
  const [status, setStatus] = useState<string>('desconocido');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastJson, setLastJson] = useState<any>(null);

  const effectiveInstance = instance || 'beleti';

  async function loadStatus() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evolution?instance=${encodeURIComponent(effectiveInstance)}`);
      const data = await res.json();
      setLastJson(data);
      if (!res.ok) {
        setStatus('error');
        setError(data?.error ?? `HTTP ${res.status}`);
      } else {
        setStatus(data?.connectionStatus || 'desconocido');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Error al obtener estado');
    } finally {
      setIsLoading(false);
    }
  }

  async function connect() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evolution?instance=${encodeURIComponent(effectiveInstance)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setLastJson(data);
      if (!res.ok) {
        setStatus('error');
        setError(data?.error ?? `HTTP ${res.status}`);
      } else {
        setStatus('connecting');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Error al conectar');
    } finally {
      setIsLoading(false);
      setTimeout(loadStatus, 1500);
    }
  }

  useEffect(() => {
    loadStatus();
  }, [effectiveInstance]);

  return (
    <div className="rounded-xl p-4 border border-zinc-700 bg-zinc-950/40">
      <h2 className="text-sm font-semibold">Conexión Evolution API</h2>
      <p className="text-xs text-zinc-400">Instancia: <strong>{effectiveInstance}</strong></p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs">Estado:</span>
        <span className="rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ background: status === 'connected' ? '#166534' : status === 'connecting' ? '#a855f7' : status === 'error' ? '#b91c1c' : '#525252' }}>
          {isLoading ? 'cargando...' : status}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={loadStatus}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-zinc-800"
          disabled={isLoading}
        >
          Refrescar estado
        </button>
        <button
          type="button"
          onClick={connect}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
          disabled={isLoading}
        >
          Conectar / Generar QR
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">Error: {error}</p>}

      {lastJson && (
        <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-zinc-300 bg-zinc-900 p-2 rounded">{JSON.stringify(lastJson, null, 2)}</pre>
      )}
    </div>
  );
}
