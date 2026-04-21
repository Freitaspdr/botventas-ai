'use client';

import { useState } from 'react';
import { PromptGenerator } from './prompt-generator';

type EmpresaFormValue = string | number | boolean | null | undefined;

type EmpresaFormData = Record<string, EmpresaFormValue> & {
  plan?: string;
  conv_limite?: number;
  conv_usadas?: number;
  has_evolution_api_key?: boolean;
};

function textValue(value: EmpresaFormValue) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function BotConfigForm({
  empresa,
  isSuperAdmin = false,
  empresaId,
}: {
  empresa: EmpresaFormData;
  isSuperAdmin?: boolean;
  empresaId?: string;
}) {
  const [form, setForm] = useState<EmpresaFormData>(empresa);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [newEvolutionApiKey, setNewEvolutionApiKey] = useState('');

  function set(key: string, value: EmpresaFormValue) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      bot_nombre:      form.bot_nombre,
      bot_tono:        form.bot_tono,
      bot_ciudad:      form.bot_ciudad,
      encargado_tel:   form.encargado_tel,
      notif_hot_leads: form.notif_hot_leads,
      notif_transfers: form.notif_transfers,
      notif_nuevos:    form.notif_nuevos,
      notif_resumen:   form.notif_resumen,
    };
    if (isSuperAdmin) {
      payload.bot_objetivo       = form.bot_objetivo;
      payload.bot_productos      = form.bot_productos;
      payload.bot_horarios       = form.bot_horarios;
      payload.bot_extra          = form.bot_extra;
      payload.evolution_instance = form.evolution_instance;
      payload.evolution_api_url  = form.evolution_api_url  || null;
      payload.plan               = form.plan;
      if (newEvolutionApiKey.trim()) {
        payload.evolution_api_key = newEvolutionApiKey.trim();
      }
    }
    const url = isSuperAdmin && empresaId
      ? `/api/admin/empresa/${empresaId}`
      : '/api/empresa';
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok && newEvolutionApiKey.trim()) {
      setForm((prev) => ({ ...prev, has_evolution_api_key: true }));
      setNewEvolutionApiKey('');
    }
    setSaving(false);
    setSaved(res.ok);
  }

  const convLimite = Number(form.conv_limite ?? 0);
  const convUsadas = Number(form.conv_usadas ?? 0);
  const planPct = convLimite > 0 ? Math.round((convUsadas / convLimite) * 100) : 0;
  const planColor = planPct > 90 ? '#c2413c' : planPct > 70 ? '#b8862f' : '#4f8b5f';

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,253,248,0.9)',
    border: '1px solid rgba(218,197,160,0.68)',
    borderRadius: 14,
    padding: '10px 14px',
    fontSize: 13,
    color: '#2c2418',
    outline: 'none',
    width: '100%',
  };

  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: '#8a785d',
    marginBottom: 4,
  };

  const sectionTitle = (title: string) => (
    <p className="text-[12px] uppercase tracking-wider pb-2 mb-1" style={{ color: '#9a8153', borderBottom: '1px solid rgba(218,197,160,0.62)' }}>
      {title}
    </p>
  );

  return (
    <form onSubmit={handleSubmit} className="luxury-card flex max-w-2xl flex-col gap-6 rounded-[28px] p-5">

      {/* ── Generador de prompts (solo superadmin) ── */}
      {isSuperAdmin && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(79,139,95,0.18)', background: '#f5fbf2' }}
        >
          <button
            type="button"
            onClick={() => setShowGenerator(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#edf5e9]"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[14px]">✨</span>
              <div className="text-left">
                <p className="text-[13px] font-medium" style={{ color: '#3f744d' }}>Asistente de configuración</p>
                <p className="text-[11px]" style={{ color: '#8a785d' }}>Genera los textos del bot respondiendo preguntas paso a paso</p>
              </div>
            </div>
            <span className="text-[11px]" style={{ color: '#8a785d' }}>
              {showGenerator ? '▲ Cerrar' : '▼ Abrir'}
            </span>
          </button>

          {showGenerator && (
            <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid rgba(79,139,95,0.16)' }}>
              <PromptGenerator
                onApply={(values) => {
                  set('bot_objetivo',  values.bot_objetivo);
                  set('bot_productos', values.bot_productos);
                  set('bot_horarios',  values.bot_horarios);
                  set('bot_extra',     values.bot_extra);
                  setShowGenerator(false);
                  setSaved(false);
                }}
                onClose={() => setShowGenerator(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Sección 1: Identidad ── */}
      {sectionTitle('Identidad del bot')}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Nombre del bot</label>
          <input
            style={inputStyle}
            value={textValue(form.bot_nombre)}
            onChange={e => set('bot_nombre', e.target.value)}
            placeholder="Carlos"
          />
        </div>
        <div>
          <label style={labelStyle}>Tono</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={textValue(form.bot_tono) || 'amigable'}
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
        <input style={inputStyle} value={textValue(form.bot_ciudad)} onChange={e => set('bot_ciudad', e.target.value)} placeholder="Madrid" />
      </div>

      {/* ── Sección 2: Catálogo (solo superadmin) ── */}
      {isSuperAdmin && (
        <>
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
                value={textValue(form[key])}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                rows={rows}
              />
            </div>
          ))}
        </>
      )}

      {/* ── Sección 3: Notificaciones ── */}
      {sectionTitle('Notificaciones')}
      <div>
        <label style={labelStyle}>WhatsApp del encargado</label>
        <input
          style={inputStyle}
          value={textValue(form.encargado_tel)}
          onChange={e => set('encargado_tel', e.target.value)}
          placeholder="34612345678 (sin + ni espacios)"
        />
        <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
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
            style={{ background: '#fffdfa', border: '1px solid rgba(218,197,160,0.62)' }}>
            <div>
              <p className="text-[13px]" style={{ color: '#2c2418' }}>{label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8a785d' }}>{desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(form[key])}
              onClick={() => set(key, !form[key])}
              className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
              style={{ background: form[key] ? '#4f8b5f' : '#eadcc6' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  left: form[key] ? 'calc(100% - 18px)' : '2px',
                  background: form[key] ? '#fff' : '#fffaf0',
                }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ── Sección 4: Plan ── */}
      {sectionTitle('Plan')}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: '#fffdfa', border: '1px solid rgba(218,197,160,0.62)' }}
      >
        <div className="flex items-center justify-between">
          {isSuperAdmin ? (
            <select
              style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              value={textValue(form.plan) || 'starter'}
              onChange={e => set('plan', e.target.value)}
            >
              <option value="starter">Starter — 500 conv</option>
              <option value="pro">Pro — 2.000 conv</option>
              <option value="enterprise">Enterprise — Ilimitado</option>
            </select>
          ) : (
            <span className="text-[13px]" style={{ color: '#8a785d' }}>
              Plan <span className="font-medium capitalize" style={{ color: '#2c2418' }}>{textValue(form.plan)}</span>
            </span>
          )}
          <span className="text-[12px]" style={{ color: '#8a785d' }}>
            {form.conv_usadas?.toLocaleString('es-ES')} / {form.conv_limite?.toLocaleString('es-ES')} conversaciones
          </span>
        </div>
        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#eadcc6' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(planPct, 100)}%`, background: planColor }} />
        </div>
        {!isSuperAdmin && (
          <p className="text-[11px]" style={{ color: '#8a785d' }}>Contacta con tu administrador para cambiar de plan.</p>
        )}
      </div>

      {/* ── Evolution API (solo superadmin) ── */}
      {isSuperAdmin && (
        <>
          {sectionTitle('WhatsApp / Evolution API')}
          <div className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>URL del servidor Evolution API</label>
              <input
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                value={textValue(form.evolution_api_url)}
                onChange={e => set('evolution_api_url', e.target.value)}
                placeholder="http://localhost:8080  (vacío = usar servidor global)"
              />
              <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
                Deja vacío para usar el servidor Evolution API compartido del sistema.
              </p>
            </div>
            <div>
              <label style={labelStyle}>API Key de Evolution API</label>
              <input
                type="password"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                value={newEvolutionApiKey}
                onChange={e => setNewEvolutionApiKey(e.target.value)}
                placeholder={form.has_evolution_api_key ? 'Nueva clave para reemplazar la actual' : '(vacío = usar clave global)'}
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
                {form.has_evolution_api_key
                  ? 'Hay una clave guardada. Déjalo vacío si no quieres cambiarla.'
                  : 'La clave se guarda como secreto y no se vuelve a mostrar en pantalla.'}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Nombre de instancia</label>
              <input
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                value={textValue(form.evolution_instance)}
                onChange={e => set('evolution_instance', e.target.value)}
                placeholder="beleti-bot"
              />
              <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
                Nombre exacto de la instancia en Evolution API.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Save button ── */}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: saved ? '#dfeedd' : 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: saved ? '#3f744d' : '#fffaf0' }}
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
