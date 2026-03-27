'use client';

import { useEffect, useRef, useState } from 'react';

type ConnState = 'loading' | 'no_instance' | 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';

interface Props {
  instance?:  string;
  empresaId?: string; // superadmin: gestionar empresa específica
}

function StatusBadge({ state }: { state: ConnState }) {
  const map: Record<ConnState, { bg: string; color: string; label: string }> = {
    loading:       { bg: 'rgba(255,255,255,0.06)', color: '#a1a1aa', label: 'Cargando...' },
    no_instance:   { bg: 'rgba(255,255,255,0.06)', color: '#a1a1aa', label: 'Sin configurar' },
    disconnected:  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', label: 'Desconectado' },
    connecting:    { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa', label: 'Conectando...' },
    qr_ready:      { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', label: 'Escanea el QR' },
    connected:     { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', label: 'Conectado' },
    error:         { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', label: 'Error' },
  };
  const s = map[state];
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function EvolutionConnector({ instance, empresaId }: Props) {
  const qs = empresaId ? `&empresaId=${empresaId}` : '';
  const apiBase = `/api/evolution`;
  const [state, setState] = useState<ConnState>('loading');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newInstance, setNewInstance] = useState('');
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }

  async function checkStatus() {
    try {
      const res = await fetch(`${apiBase}?action=status${qs}`);
      if (res.status === 400) { setState('no_instance'); return; }
      const data = await res.json();
      if (!res.ok) { setError(data?.error || `HTTP ${res.status}`); setState('error'); return; }
      const s = data?.instance?.state || data?.state || '';
      if (s === 'open') {
        const owner = data?.instance?.ownerJid || data?.ownerJid || '';
        setPhoneNumber(owner ? owner.replace('@s.whatsapp.net', '') : null);
        setState('connected');
        clearTimers();
      } else if (s === 'connecting' || s === 'qr') {
        setState('disconnected');
      } else {
        setState('disconnected');
      }
    } catch {
      setState('error');
      setError('No se pudo conectar con la API');
    }
  }

  async function fetchQr() {
    try {
      const res = await fetch(`${apiBase}?action=qr${qs}`);
      const data = await res.json();
      const b64 = data?.base64 || data?.qrcode?.base64 || data?.code;
      if (b64) {
        const src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
        setQrBase64(src);
        setState('qr_ready');
        setCountdown(30);
      }
      // Check if connected while polling
      const connRes = await fetch(`${apiBase}?action=status${qs}`);
      const connData = await connRes.json();
      const s = connData?.instance?.state || connData?.state || '';
      if (s === 'open') {
        const owner = connData?.instance?.ownerJid || connData?.ownerJid || '';
        setPhoneNumber(owner ? owner.replace('@s.whatsapp.net', '') : null);
        setState('connected');
        clearTimers();
      }
    } catch {
      // Keep trying
    }
  }

  function startPolling() {
    clearTimers();
    fetchQr();
    intervalRef.current = setInterval(fetchQr, 5000);
    countdownRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 30), 1000);
  }

  async function handleConnect() {
    setState('connecting');
    setError(null);
    setQrBase64(null);
    try {
      const res = await fetch(`${apiBase}${empresaId ? `?empresaId=${empresaId}` : ''}`, { method: 'POST' });
      const data = await res.json();
      const b64 = data?.base64 || data?.qrcode?.base64 || data?.code;
      if (b64) {
        const src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
        setQrBase64(src);
        setState('qr_ready');
        setCountdown(30);
      }
      startPolling();
    } catch {
      setError('Error al generar QR');
      setState('error');
    }
  }

  async function handleCreate() {
    if (!newInstance.trim()) return;
    setState('loading');
    setError(null);
    try {
      const res = await fetch(`${apiBase}${empresaId ? `?empresaId=${empresaId}` : ''}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: newInstance.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Error al crear instancia'); setState('error'); return; }
      setState('disconnected');
    } catch {
      setError('Error al crear instancia');
      setState('error');
    }
  }

  async function handleDisconnect() {
    setState('loading');
    clearTimers();
    try {
      await fetch(`${apiBase}${empresaId ? `?empresaId=${empresaId}` : ''}`, { method: 'DELETE' });
      setState('disconnected');
      setPhoneNumber(null);
      setQrBase64(null);
    } catch {
      setState('error');
      setError('Error al desconectar');
    }
  }

  useEffect(() => {
    if (instance) {
      checkStatus();
    } else {
      setState('no_instance');
    }
    return clearTimers;
  }, [instance]);

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium" style={{ color: '#fafafa' }}>WhatsApp</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#71717a' }}>
            {instance ? `Instancia: ${instance}` : 'Sin instancia asignada'}
          </p>
        </div>
        <StatusBadge state={state} />
      </div>

      {/* Connected state */}
      {state === 'connected' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-[12px]" style={{ color: '#a1a1aa' }}>
              {phoneNumber ? `+${phoneNumber}` : 'Conectado'}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ border: '0.5px solid rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            Desconectar
          </button>
        </div>
      )}

      {/* QR code */}
      {(state === 'qr_ready' || state === 'connecting') && (
        <div className="flex flex-col items-center gap-3">
          {qrBase64 ? (
            <>
              <img src={qrBase64} alt="QR WhatsApp" className="rounded-lg" style={{ width: 200, height: 200 }} />
              <p className="text-[11px] text-center" style={{ color: '#a1a1aa' }}>
                Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo
              </p>
              <p className="text-[10px]" style={{ color: '#71717a' }}>
                Actualizando en {countdown}s
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }} />
              <span className="text-[12px]" style={{ color: '#a1a1aa' }}>Generando QR...</span>
            </div>
          )}
        </div>
      )}

      {/* Disconnected — connect button */}
      {state === 'disconnected' && (
        <button
          onClick={handleConnect}
          className="w-full rounded-lg py-2.5 text-[13px] font-medium transition-colors"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '0.5px solid rgba(34,197,94,0.2)' }}
        >
          Conectar WhatsApp
        </button>
      )}

      {/* No instance — create flow */}
      {state === 'no_instance' && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: '#a1a1aa' }}>
            Introduce un nombre único para tu instancia (sin espacios):
          </p>
          <div className="flex gap-2">
            <input
              value={newInstance}
              onChange={e => setNewInstance(e.target.value.replace(/\s/g, '-').toLowerCase())}
              placeholder="mi-negocio"
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#fafafa' }}
            />
            <button
              onClick={handleCreate}
              disabled={!newInstance.trim()}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40 transition-colors"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '0.5px solid rgba(59,130,246,0.2)' }}
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: '#f87171' }}>{error || 'Error desconocido'}</p>
          <button
            onClick={() => { setState('loading'); checkStatus(); }}
            className="text-[11px] px-2.5 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Refresh button when loading or disconnected */}
      {(state === 'loading' || state === 'disconnected') && (
        <button
          onClick={() => { setState('loading'); checkStatus(); }}
          className="text-[11px]"
          style={{ color: '#52525b' }}
        >
          Refrescar estado
        </button>
      )}
    </div>
  );
}
