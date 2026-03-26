'use client';

import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BotConfigForm({ empresa }: { empresa: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any>(empresa);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: unknown) {
    setForm((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/empresa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_nombre:         form.bot_nombre,
        bot_tono:           form.bot_tono,
        bot_objetivo:       form.bot_objetivo,
        bot_productos:      form.bot_productos,
        bot_horarios:       form.bot_horarios,
        bot_ciudad:         form.bot_ciudad,
        bot_extra:          form.bot_extra,
        encargado_tel:      form.encargado_tel,
        evolution_instance: form.evolution_instance,
        evolution_api_url:  form.evolution_api_url  || null,
        evolution_api_key:  form.evolution_api_key  || null,
        notif_hot_leads:    form.notif_hot_leads,
        notif_transfers:    form.notif_transfers,
        notif_nuevos:       form.notif_nuevos,
        notif_resumen:      form.notif_resumen,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  const planPct = form.conv_limite > 0 ? Math.round((form.conv_usadas / form.conv_limite) * 100) : 0;
  const planColor = planPct > 90 ? '#ef4444' : planPct > 70 ? '#f59e0b' : '#22c55e';

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#fafafa',
    outline: 'none',
    width: '100%',
  };

  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: '#a1a1aa',
    marginBottom: 4,
  };

  const sectionTitle = (title: string) => (
    <p className="text-[12px] uppercase tracking-wider pb-2 mb-1" style={{ color: '#71717a', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
      {title}
    </p>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">

      {/* ── Sección 1: Identidad ── */}
      {sectionTitle('Identidad del bot')}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Nombre del bot</label>
          <input
            style={inputStyle}
            value={form.bot_nombre || ''}
            onChange={e => set('bot_nombre', e.target.value)}
            placeholder="Carlos"
          />
        </div>
        <div>
          <label style={labelStyle}>Tono</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.bot_tono || 'amigable'}
            onChange={e => set('bot_tono', e.target.value)}
          >
            <option value="amigable">Amigable</option>
            <option value="profesional">Profesional</option>
            <option value="formal">Formal</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Ciudad</label>
        <input style={inputStyle} value={form.bot_ciudad || ''} onChange={e => set('bot_ciudad', e.target.value)} placeholder="Madrid" />
      </div>

      {/* ── Sección 2: Catálogo ── */}
      {sectionTitle('Catálogo')}
      {[
        { key: 'bot_objetivo',  label: 'Objetivo del bot',               rows: 3,  placeholder: 'Cualificar leads de car audio…' },
        { key: 'bot_productos', label: 'Catálogo de productos/servicios', rows: 8,  placeholder: 'Sonido: instalación de altavoces y amplificadores…' },
        { key: 'bot_horarios',  label: 'Horarios de atención',            rows: 2,  placeholder: 'Lunes a viernes 9-18h, Sábados 10-14h' },
        { key: 'bot_extra',     label: 'Instrucciones especiales',        rows: 4,  placeholder: 'Siempre preguntar año y modelo antes de dar precio…' },
      ].map(({ key, label, rows, placeholder }) => (
        <div key={key}>
          <label style={labelStyle}>{label}</label>
          <textarea
            style={{ ...textareaStyle, minHeight: rows * 22 } as React.CSSProperties}
            value={form[key] || ''}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        </div>
      ))}

      {/* ── Sección 3: Notificaciones ── */}
      {sectionTitle('Notificaciones')}
      <div>
        <label style={labelStyle}>WhatsApp del encargado</label>
        <input
          style={inputStyle}
          value={form.encargado_tel || ''}
          onChange={e => set('encargado_tel', e.target.value)}
          placeholder="34612345678 (sin + ni espacios)"
        />
        <p className="mt-1 text-[11px]" style={{ color: '#71717a' }}>
          Si es distinto al número del bot. Aquí llegan los avisos.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { key: 'notif_hot_leads', label: 'Notificar hot leads',          desc: 'Aviso cuando el bot detecta un lead caliente' },
          { key: 'notif_transfers', label: 'Notificar transfers',           desc: 'Aviso cuando el bot transfiere a humano' },
          { key: 'notif_nuevos',    label: 'Notificar leads nuevos',        desc: 'Aviso cuando llega una nueva conversación' },
          { key: 'notif_resumen',   label: 'Resumen diario a las 20:00',   desc: 'Resumen del día con métricas de actividad' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-[10px]"
            style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p className="text-[13px]" style={{ color: '#e4e4e7' }}>{label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#a1a1aa' }}>{desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!form[key]}
              onClick={() => set(key, !form[key])}
              className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
              style={{ background: form[key] ? '#22c55e' : 'rgba(255,255,255,0.08)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: form[key] ? 'calc(100% - 18px)' : '2px',
                  background: form[key] ? '#fff' : 'rgba(255,255,255,0.3)',
                }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ── Sección 4: Plan (solo lectura) ── */}
      {sectionTitle('Plan')}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px]" style={{ color: '#a1a1aa' }}>
            Plan <span className="font-medium capitalize" style={{ color: '#fafafa' }}>{form.plan}</span>
          </span>
          <span className="text-[12px]" style={{ color: '#a1a1aa' }}>
            {form.conv_usadas?.toLocaleString('es-ES')} / {form.conv_limite?.toLocaleString('es-ES')} conversaciones
          </span>
        </div>
        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(planPct, 100)}%`, background: planColor }} />
        </div>
        <button
          type="button"
          disabled
          className="text-[12px] py-2 rounded-lg opacity-40 cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}
        >
          Cambiar plan (próximamente)
        </button>
      </div>

      {/* ── Evolution API ── */}
      {sectionTitle('WhatsApp / Evolution API')}
      <div className="flex flex-col gap-4">
        <div>
          <label style={labelStyle}>URL del servidor Evolution API</label>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            value={form.evolution_api_url || ''}
            onChange={e => set('evolution_api_url', e.target.value)}
            placeholder="http://localhost:8080  (vacío = usar servidor global)"
          />
          <p className="mt-1 text-[11px]" style={{ color: '#71717a' }}>
            Deja vacío para usar el servidor Evolution API compartido del sistema.
          </p>
        </div>
        <div>
          <label style={labelStyle}>API Key de Evolution API</label>
          <input
            type="password"
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            value={form.evolution_api_key || ''}
            onChange={e => set('evolution_api_key', e.target.value)}
            placeholder="(vacío = usar clave global)"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label style={labelStyle}>Nombre de instancia</label>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            value={form.evolution_instance || ''}
            onChange={e => set('evolution_instance', e.target.value)}
            placeholder="beleti-bot"
          />
          <p className="mt-1 text-[11px]" style={{ color: '#71717a' }}>
            Nombre exacto de la instancia en Evolution API. Debe coincidir con el nombre que aparece en el panel de Evolution.
          </p>
        </div>
      </div>

      {/* ── Save button ── */}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: saved ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)', color: '#4ade80' }}
      >
        {saving ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Guardando…
          </>
        ) : saved ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Guardado
          </>
        ) : (
          'Guardar cambios'
        )}
      </button>
    </form>
  );
}
