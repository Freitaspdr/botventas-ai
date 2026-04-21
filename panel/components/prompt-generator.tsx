'use client';

import { useState } from 'react';

// ── types ─────────────────────────────────────────────────────────────────────

interface Service {
  nombre: string;
  descripcion: string;
  precio: string;
}

interface HorarioDia {
  activo: boolean;
  desde: string;
  hasta: string;
}

interface FormData {
  // Step 1 — Negocio
  negocio_nombre: string;
  negocio_tipo: string;
  negocio_tipo_custom: string;
  negocio_ciudad: string;
  negocio_descripcion: string;
  negocio_diferencial: string;

  // Step 2 — Objetivo
  objetivos: string[];
  pre_precio: string;
  escalacion: string[];

  // Step 3 — Catálogo
  servicios: Service[];

  // Step 4 — Horarios
  horarios: Record<string, HorarioDia>;
  horarios_nota: string;

  // Step 5 — Extra
  pago: string[];
  pago_custom: string;
  politica_citas: string;
  tiempo_servicio: string;
  notas_extra: string;
}

interface Generated {
  bot_objetivo: string;
  bot_productos: string;
  bot_horarios: string;
  bot_extra: string;
}

interface Props {
  onApply: (values: Generated) => void;
  onClose: () => void;
}

// ── constants ─────────────────────────────────────────────────────────────────

const TIPOS_NEGOCIO = [
  'Car audio y electrónica',
  'Taller mecánico',
  'Detailing y estética',
  'Clínica dental',
  'Peluquería / barbería',
  'Centro de estética',
  'Inmobiliaria',
  'Academia / formación',
  'Restaurante',
  'Otro…',
];

const OBJETIVOS_OPCIONES = [
  { key: 'responder',   label: 'Responder preguntas sobre productos y servicios' },
  { key: 'cualificar',  label: 'Cualificar leads (preguntar datos antes de dar precio)' },
  { key: 'citas',       label: 'Agendar citas o visitas' },
  { key: 'nurturing',   label: 'Hacer seguimiento automático si no responden' },
  { key: 'catalogo',    label: 'Mostrar catálogo y precios orientativos' },
];

const ESCALACION_OPCIONES = [
  { key: 'precio_fijo',  label: 'El cliente pide precio exacto y definitivo' },
  { key: 'queja',        label: 'El cliente tiene una queja o problema grave' },
  { key: 'humano',       label: 'El cliente pide hablar con una persona' },
  { key: 'urgencia',     label: 'Situación urgente o de emergencia' },
  { key: 'negociacion',  label: 'Negociación o descuento importante' },
];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const PAGO_OPCIONES = [
  'Efectivo', 'Tarjeta', 'Transferencia', 'Bizum', 'Financiación', 'PayPal',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function defaultHorarios(): Record<string, HorarioDia> {
  return Object.fromEntries(DIAS.map(d => [
    d,
    {
      activo: d !== 'Domingo',
      desde: d === 'Sábado' ? '10:00' : '09:00',
      hasta: d === 'Sábado' ? '14:00' : '18:00',
    },
  ]));
}

function generateTexts(f: FormData): Generated {
  const tipo = f.negocio_tipo === 'Otro…' ? f.negocio_tipo_custom : f.negocio_tipo;

  // ── bot_objetivo ──
  const objetivosList = f.objetivos
    .map(k => OBJETIVOS_OPCIONES.find(o => o.key === k)?.label)
    .filter(Boolean);
  const escalacionList = f.escalacion
    .map(k => ESCALACION_OPCIONES.find(o => o.key === k)?.label)
    .filter(Boolean);

  const bot_objetivo = [
    `Eres el asistente virtual de ${f.negocio_nombre || 'la empresa'}, un negocio de ${tipo || 'servicios'} en ${f.negocio_ciudad || 'España'}.`,
    f.negocio_descripcion ? `\n${f.negocio_descripcion}.` : '',
    f.negocio_diferencial ? `\nNuestro diferencial: ${f.negocio_diferencial}.` : '',
    objetivosList.length > 0
      ? `\n\nTus objetivos principales:\n${objetivosList.map(o => `- ${o}`).join('\n')}`
      : '',
    f.pre_precio
      ? `\n\nAntes de dar cualquier precio, pregunta siempre: ${f.pre_precio}.`
      : '',
    escalacionList.length > 0
      ? `\n\nEscala la conversación a un humano cuando:\n${escalacionList.map(e => `- ${e}`).join('\n')}`
      : '',
  ].join('').trim();

  // ── bot_productos ──
  const lineas = f.servicios
    .filter(s => s.nombre.trim())
    .map(s => {
      const parts = [`${s.nombre.trim()}:`];
      if (s.descripcion.trim()) parts.push(`  ${s.descripcion.trim()}`);
      if (s.precio.trim()) parts.push(`  Precio desde: ${s.precio.trim()}`);
      return parts.join('\n');
    });

  const bot_productos = lineas.length > 0
    ? `SERVICIOS Y PRODUCTOS:\n\n${lineas.join('\n\n')}`
    : '';

  // ── bot_horarios ──
  const diasActivos = DIAS.filter(d => f.horarios[d]?.activo);
  const diasCerrados = DIAS.filter(d => !f.horarios[d]?.activo);

  // Agrupar días consecutivos con mismo horario
  type Grupo = { dias: string[]; desde: string; hasta: string };
  const grupos: Grupo[] = [];
  for (const dia of diasActivos) {
    const h = f.horarios[dia];
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.desde === h.desde && ultimo.hasta === h.hasta) {
      ultimo.dias.push(dia);
    } else {
      grupos.push({ dias: [dia], desde: h.desde, hasta: h.hasta });
    }
  }

  const lineasHorario = grupos.map(g => {
    const label = g.dias.length === 1
      ? g.dias[0]
      : `${g.dias[0]} a ${g.dias[g.dias.length - 1]}`;
    return `- ${label}: ${g.desde} – ${g.hasta}h`;
  });
  if (diasCerrados.length > 0) {
    lineasHorario.push(`- ${diasCerrados.join(', ')}: Cerrado`);
  }
  if (f.horarios_nota) lineasHorario.push(`\nNota: ${f.horarios_nota}`);

  const bot_horarios = `Horario de atención:\n${lineasHorario.join('\n')}`;

  // ── bot_extra ──
  const pagoList = [
    ...f.pago.filter(p => p !== 'otro'),
    ...(f.pago_custom ? [f.pago_custom] : []),
  ].filter(Boolean);

  const extraLines: string[] = [];
  if (pagoList.length > 0)   extraLines.push(`- Métodos de pago aceptados: ${pagoList.join(', ')}.`);
  if (f.tiempo_servicio)     extraLines.push(`- Tiempo estimado por servicio: ${f.tiempo_servicio}.`);
  if (f.politica_citas)      extraLines.push(`- Política de citas: ${f.politica_citas}.`);
  if (f.notas_extra)         extraLines.push(`\n${f.notas_extra}`);

  const bot_extra = extraLines.length > 0
    ? `INSTRUCCIONES ESPECIALES:\n${extraLines.join('\n')}`
    : '';

  return { bot_objetivo, bot_productos, bot_horarios, bot_extra };
}

// ── sub-components ────────────────────────────────────────────────────────────

function StepDot({ n, current, total }: { n: number; current: number; total: number }) {
  const done = n < current;
  const active = n === current;
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all"
        style={{
          background: done ? '#dfeedd' : active ? 'rgba(79,139,95,0.14)' : '#f4ead9',
          color: done || active ? '#3f744d' : '#8a785d',
          border: active ? '1px solid rgba(79,139,95,0.34)' : '1px solid transparent',
        }}
      >
        {done ? '✓' : n}
      </div>
      {n < total && (
        <div className="w-8 h-px" style={{ background: done ? 'rgba(79,139,95,0.34)' : 'rgba(218,197,160,0.62)' }} />
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[10px] px-2 py-1 rounded transition-colors"
      style={{
        background: copied ? '#dfeedd' : '#f4ead9',
        color: copied ? '#3f744d' : '#5f513e',
      }}
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

// ── input styles ──────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  background: 'rgba(255,253,248,0.96)',
  border: '1px solid rgba(218,197,160,0.72)',
  borderRadius: 8,
  padding: '7px 11px',
  fontSize: 12,
  color: '#2c2418',
  outline: 'none',
  width: '100%',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78)',
};

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#8a785d', marginBottom: 3 };

function CheckPill({
  checked, label, onChange,
}: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="px-2.5 py-1.5 rounded-lg text-[11px] transition-colors text-left"
      style={{
        background: checked ? '#dfeedd' : '#fffdfa',
        color: checked ? '#3f744d' : '#5f513e',
        border: checked ? '1px solid rgba(79,139,95,0.34)' : '1px solid rgba(218,197,160,0.62)',
      }}
    >
      {checked ? '✓ ' : ''}{label}
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

export function PromptGenerator({ onApply, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [form, setForm] = useState<FormData>({
    negocio_nombre: '',
    negocio_tipo: '',
    negocio_tipo_custom: '',
    negocio_ciudad: '',
    negocio_descripcion: '',
    negocio_diferencial: '',
    objetivos: ['responder', 'cualificar'],
    pre_precio: '',
    escalacion: ['humano', 'queja'],
    servicios: [{ nombre: '', descripcion: '', precio: '' }],
    horarios: defaultHorarios(),
    horarios_nota: '',
    pago: ['Efectivo', 'Tarjeta', 'Bizum'],
    pago_custom: '',
    politica_citas: '',
    tiempo_servicio: '',
    notas_extra: '',
  });

  function setF(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: keyof FormData, val: string) {
    const arr = form[key] as string[];
    setF(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function updateServicio(i: number, field: keyof Service, val: string) {
    const next = [...form.servicios];
    next[i] = { ...next[i], [field]: val };
    setF('servicios', next);
  }

  function addServicio() {
    setF('servicios', [...form.servicios, { nombre: '', descripcion: '', precio: '' }]);
  }

  function removeServicio(i: number) {
    setF('servicios', form.servicios.filter((_, idx) => idx !== i));
  }

  function updateHorario(dia: string, field: keyof HorarioDia, val: boolean | string) {
    setF('horarios', { ...form.horarios, [dia]: { ...form.horarios[dia], [field]: val } });
  }

  function handleGenerate() {
    const g = generateTexts(form);
    setGenerated(g);
    setStep(6);
  }

  const cardStyle: React.CSSProperties = {
    background: '#fffdfa',
    border: '1px solid rgba(218,197,160,0.72)',
    borderRadius: 12,
    padding: 16,
  };

  const previewStyle: React.CSSProperties = {
    background: '#fbf5ea',
    border: '1px solid rgba(218,197,160,0.62)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 11,
    color: '#2c2418',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    maxHeight: 140,
    overflowY: 'auto',
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Header + progress */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>
            Asistente de configuración
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#8a785d' }}>
            Responde las preguntas y genera los textos listos para el bot
          </p>
        </div>
        <button onClick={onClose} className="text-[11px] px-2.5 py-1 rounded-lg hover:bg-[#f4ead9]" style={{ color: '#8a785d' }}>
          Cerrar ✕
        </button>
      </div>

      {/* Step dots */}
      <div className="flex items-center">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <StepDot key={i} n={i + 1} current={step} total={TOTAL_STEPS} />
        ))}
      </div>

      {/* ── STEP 1: Negocio ── */}
      {step === 1 && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Paso 1 · Tu negocio</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Nombre del negocio *</label>
              <input style={inp} value={form.negocio_nombre} onChange={e => setF('negocio_nombre', e.target.value)} placeholder="Beleti Car Audio" />
            </div>
            <div>
              <label style={lbl}>Ciudad *</label>
              <input style={inp} value={form.negocio_ciudad} onChange={e => setF('negocio_ciudad', e.target.value)} placeholder="Madrid" />
            </div>
          </div>

          <div>
            <label style={lbl}>Sector / tipo de negocio *</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TIPOS_NEGOCIO.map(t => (
                <CheckPill
                  key={t} label={t}
                  checked={form.negocio_tipo === t}
                  onChange={() => setF('negocio_tipo', form.negocio_tipo === t ? '' : t)}
                />
              ))}
            </div>
            {form.negocio_tipo === 'Otro…' && (
              <input
                style={{ ...inp, marginTop: 6 }}
                value={form.negocio_tipo_custom}
                onChange={e => setF('negocio_tipo_custom', e.target.value)}
                placeholder="Describe tu tipo de negocio…"
              />
            )}
          </div>

          <div>
            <label style={lbl}>Descripción breve del negocio</label>
            <textarea
              style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
              rows={2}
              value={form.negocio_descripcion}
              onChange={e => setF('negocio_descripcion', e.target.value)}
              placeholder="Somos un taller especializado en instalación de sistemas de car audio en Madrid, con más de 10 años de experiencia…"
            />
          </div>

          <div>
            <label style={lbl}>¿Cuál es vuestro diferencial?</label>
            <input style={inp} value={form.negocio_diferencial} onChange={e => setF('negocio_diferencial', e.target.value)} placeholder="Instalación profesional con garantía, precios competitivos y asesoramiento personalizado" />
          </div>
        </div>
      )}

      {/* ── STEP 2: Objetivo ── */}
      {step === 2 && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Paso 2 · Objetivo del bot</p>

          <div>
            <label style={{ ...lbl, marginBottom: 6 }}>¿Qué debe hacer el bot? (selecciona todos los que apliquen)</label>
            <div className="flex flex-col gap-1.5">
              {OBJETIVOS_OPCIONES.map(o => (
                <CheckPill
                  key={o.key} label={o.label}
                  checked={form.objetivos.includes(o.key)}
                  onChange={() => toggleArray('objetivos', o.key)}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>¿Qué dato debe pedir siempre antes de dar precios?</label>
            <input style={inp} value={form.pre_precio} onChange={e => setF('pre_precio', e.target.value)} placeholder="El año y modelo del coche del cliente" />
            <p className="mt-1 text-[10px]" style={{ color: '#8a785d' }}>Dejar vacío si el bot puede dar precios directamente.</p>
          </div>

          <div>
            <label style={{ ...lbl, marginBottom: 6 }}>¿Cuándo debe escalar a un humano?</label>
            <div className="flex flex-col gap-1.5">
              {ESCALACION_OPCIONES.map(o => (
                <CheckPill
                  key={o.key} label={o.label}
                  checked={form.escalacion.includes(o.key)}
                  onChange={() => toggleArray('escalacion', o.key)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Catálogo ── */}
      {step === 3 && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Paso 3 · Catálogo de servicios</p>

          <div className="flex flex-col gap-3">
            {form.servicios.map((s, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: '#fbf5ea', border: '1px solid rgba(218,197,160,0.62)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: '#8a785d' }}>Servicio {i + 1}</span>
                  {form.servicios.length > 1 && (
                    <button type="button" onClick={() => removeServicio(i)} className="text-[10px]" style={{ color: '#8a785d' }}>✕ Eliminar</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label style={lbl}>Nombre *</label>
                    <input style={inp} value={s.nombre} onChange={e => updateServicio(i, 'nombre', e.target.value)} placeholder="Instalación de altavoces" />
                  </div>
                  <div>
                    <label style={lbl}>Precio orientativo</label>
                    <input style={inp} value={s.precio} onChange={e => updateServicio(i, 'precio', e.target.value)} placeholder="150€ – 400€" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Descripción</label>
                  <input style={inp} value={s.descripcion} onChange={e => updateServicio(i, 'descripcion', e.target.value)} placeholder="Instalación de altavoces componentes en puertas delanteras y traseras" />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addServicio}
            className="text-[12px] py-2 rounded-lg transition-colors"
            style={{ background: '#fffdfa', color: '#5f513e', border: '1px dashed rgba(218,197,160,0.86)' }}
          >
            + Añadir servicio
          </button>
        </div>
      )}

      {/* ── STEP 4: Horarios ── */}
      {step === 4 && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Paso 4 · Horarios de atención</p>

          <div className="flex flex-col gap-2">
            {DIAS.map(dia => {
              const h = form.horarios[dia];
              return (
                <div key={dia} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateHorario(dia, 'activo', !h.activo)}
                    className="w-16 text-[11px] py-1 rounded-lg transition-colors flex-shrink-0 text-center"
                    style={{
                      background: h.activo ? '#dfeedd' : '#fffdfa',
                      color: h.activo ? '#3f744d' : '#8a785d',
                      border: h.activo ? '1px solid rgba(79,139,95,0.28)' : '1px solid rgba(218,197,160,0.62)',
                    }}
                  >
                    {dia.slice(0, 3)}
                  </button>
                  {h.activo ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        style={{ ...inp, width: 110, padding: '5px 8px' }}
                        value={h.desde}
                        onChange={e => updateHorario(dia, 'desde', e.target.value)}
                      />
                      <span style={{ color: '#8a785d', fontSize: 11 }}>–</span>
                      <input
                        type="time"
                        style={{ ...inp, width: 110, padding: '5px 8px' }}
                        value={h.hasta}
                        onChange={e => updateHorario(dia, 'hasta', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px]" style={{ color: '#8a785d' }}>Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label style={lbl}>Nota adicional (vacaciones, festivos, etc.)</label>
            <input style={inp} value={form.horarios_nota} onChange={e => setF('horarios_nota', e.target.value)} placeholder="Cerrado en agosto y festivos nacionales" />
          </div>
        </div>
      )}

      {/* ── STEP 5: Extra ── */}
      {step === 5 && (
        <div style={cardStyle} className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Paso 5 · Instrucciones especiales</p>

          <div>
            <label style={{ ...lbl, marginBottom: 6 }}>Métodos de pago aceptados</label>
            <div className="flex flex-wrap gap-1.5">
              {PAGO_OPCIONES.map(p => (
                <CheckPill
                  key={p} label={p}
                  checked={form.pago.includes(p)}
                  onChange={() => toggleArray('pago', p)}
                />
              ))}
            </div>
            <input
              style={{ ...inp, marginTop: 8 }}
              value={form.pago_custom}
              onChange={e => setF('pago_custom', e.target.value)}
              placeholder="Otros métodos de pago…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Tiempo estimado por servicio</label>
              <input style={inp} value={form.tiempo_servicio} onChange={e => setF('tiempo_servicio', e.target.value)} placeholder="Entre 2h y 1 día según la instalación" />
            </div>
            <div>
              <label style={lbl}>Política de citas</label>
              <input style={inp} value={form.politica_citas} onChange={e => setF('politica_citas', e.target.value)} placeholder="Se requiere cita previa, se puede llamar o pedir por WhatsApp" />
            </div>
          </div>

          <div>
            <label style={lbl}>Notas adicionales (reglas específicas del negocio)</label>
            <textarea
              style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
              rows={3}
              value={form.notas_extra}
              onChange={e => setF('notas_extra', e.target.value)}
              placeholder="Siempre pedir año y modelo antes de dar precio. No dar precios de instalación de pantallas sin ver el coche…"
            />
          </div>
        </div>
      )}

      {/* ── STEP 6: Resultado ── */}
      {step === 6 && generated && (
        <div className="flex flex-col gap-4">
          <p className="text-[12px] uppercase tracking-wider" style={{ color: '#8a785d' }}>Resultado generado</p>

          {([
            { key: 'bot_objetivo',  label: 'Objetivo del bot' },
            { key: 'bot_productos', label: 'Catálogo de productos/servicios' },
            { key: 'bot_horarios',  label: 'Horarios de atención' },
            { key: 'bot_extra',     label: 'Instrucciones especiales' },
          ] as { key: keyof Generated; label: string }[]).map(({ key, label }) => (
            <div key={key} style={cardStyle} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium" style={{ color: '#5f513e' }}>{label}</p>
                <CopyButton text={generated[key]} />
              </div>
              <pre style={previewStyle}>{generated[key] || '(vacío)'}</pre>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onApply(generated)}
            className="py-2.5 rounded-[10px] text-[13px] font-medium transition-all hover:opacity-90"
            style={{ background: '#dfeedd', color: '#3f744d', border: '1px solid rgba(79,139,95,0.28)' }}
          >
            Aplicar todo a la configuración
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-[12px] py-1.5 rounded-lg hover:bg-[#f4ead9] transition-colors"
            style={{ color: '#8a785d' }}
          >
            ← Volver a editar
          </button>
        </div>
      )}

      {/* Navigation */}
      {step < 6 && (
        <div className="flex items-center justify-between mt-1">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="text-[12px] px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: '#f4ead9', color: '#5f513e' }}
          >
            ← Anterior
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!form.negocio_nombre || !form.negocio_tipo)}
              className="text-[12px] px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="text-[12px] px-5 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ background: '#dfeedd', color: '#3f744d' }}
            >
              Generar prompts ✨
            </button>
          )}
        </div>
      )}
    </div>
  );
}
