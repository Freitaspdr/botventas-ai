'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type ConnState = 'loading' | 'no_instance' | 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';

interface Props {
  instance?:  string;
  empresaId?: string; // superadmin: gestionar empresa específica
}

function StatusBadge({ state }: { state: ConnState }) {
  const map: Record<ConnState, { bg: string; color: string; label: string }> = {
    loading:       { bg: '#f4ead9', color: '#8a785d', label: 'Cargando...' },
    no_instance:   { bg: '#f4ead9', color: '#8a785d', label: 'Sin configurar' },
    disconnected:  { bg: '#f3e3bf', color: '#704a14', label: 'Desconectado' },
    connecting:    { bg: '#eadcc6', color: '#6f5632', label: 'Conectando...' },
    qr_ready:      { bg: '#f3e3bf', color: '#704a14', label: 'Escanea el QR' },
    connected:     { bg: '#dfeedd', color: '#3f744d', label: 'Conectado' },
    error:         { bg: '#f8ded9', color: '#a33b36', label: 'Error' },
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
  const [state, setState] = useState<ConnState>(instance ? 'loading' : 'no_instance');
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

  const checkStatus = useCallback(async () => {
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
  }, [apiBase, qs]);

  const fetchQr = useCallback(async () => {
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
  }, [apiBase, qs]);

  function startPolling() {
    clearTimers();
    void fetchQr();
    intervalRef.current = setInterval(() => { void fetchQr(); }, 5000);
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
      const timer = setTimeout(() => {
        void checkStatus();
      }, 0);
      return () => {
        clearTimeout(timer);
        clearTimers();
      };
    } else {
      clearTimers();
    }
    return clearTimers;
  }, [instance, checkStatus]);

  const effectiveState: ConnState = instance ? state : 'no_instance';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.92))', border: '1px solid rgba(218,197,160,0.72)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>WhatsApp</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8a785d' }}>
            {instance ? `Instancia: ${instance}` : 'Sin instancia asignada'}
          </p>
        </div>
        <StatusBadge state={effectiveState} />
      </div>

      {/* Connected state */}
      {effectiveState === 'connected' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-[12px]" style={{ color: '#8a785d' }}>
              {phoneNumber ? `+${phoneNumber}` : 'Conectado'}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:bg-[#f8ded9]"
            style={{ border: '1px solid rgba(194,65,60,0.22)', color: '#a33b36' }}
          >
            Desconectar
          </button>
        </div>
      )}

      {/* QR code */}
      {(effectiveState === 'qr_ready' || effectiveState === 'connecting') && (
        <div className="flex flex-col items-center gap-3">
            {qrBase64 ? (
              <>
                <Image
                  src={qrBase64}
                  alt="QR WhatsApp"
                  className="rounded-lg"
                  width={200}
                  height={200}
                  unoptimized
                />
              <p className="text-[11px] text-center" style={{ color: '#8a785d' }}>
                Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo
              </p>
              <p className="text-[10px]" style={{ color: '#9a8a72' }}>
                Actualizando en {countdown}s
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#b8862f', borderTopColor: 'transparent' }} />
              <span className="text-[12px]" style={{ color: '#8a785d' }}>Generando QR...</span>
            </div>
          )}
        </div>
      )}

      {/* Disconnected — connect button */}
      {effectiveState === 'disconnected' && (
        <button
          onClick={handleConnect}
          className="w-full rounded-lg py-2.5 text-[13px] font-medium transition-colors"
          style={{ background: '#dfeedd', color: '#3f744d', border: '1px solid rgba(79,139,95,0.18)' }}
        >
          Conectar WhatsApp
        </button>
      )}

      {/* No instance — create flow */}
      {effectiveState === 'no_instance' && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: '#8a785d' }}>
            Introduce un nombre único para tu instancia (sin espacios):
          </p>
          <div className="flex gap-2">
            <input
              value={newInstance}
              onChange={e => setNewInstance(e.target.value.replace(/\s/g, '-').toLowerCase())}
              placeholder="mi-negocio"
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{ background: '#fffdfa', border: '1px solid rgba(218,197,160,0.68)', color: '#2c2418' }}
            />
            <button
              onClick={handleCreate}
              disabled={!newInstance.trim()}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40 transition-colors"
              style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0', border: '1px solid rgba(151,102,31,0.22)' }}
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {effectiveState === 'error' && (
        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: '#a33b36' }}>{error || 'Error desconocido'}</p>
          <button
            onClick={() => { setState('loading'); void checkStatus(); }}
            className="text-[11px] px-2.5 py-1 rounded-lg"
            style={{ background: '#f4ead9', color: '#8a785d' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Refresh button when loading or disconnected */}
      {(effectiveState === 'loading' || effectiveState === 'disconnected') && (
        <button
          onClick={() => { setState('loading'); void checkStatus(); }}
          className="text-[11px]"
          style={{ color: '#9a8a72' }}
        >
          Refrescar estado
        </button>
      )}
    </div>
  );
}
