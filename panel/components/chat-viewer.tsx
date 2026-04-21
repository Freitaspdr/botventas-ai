'use client';

import { useEffect, useRef } from 'react';

interface Mensaje {
  rol: 'user' | 'assistant' | 'human';
  contenido: string;
  enviado_en: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Hoy';
  if (sameDay(date, yesterday)) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function groupByDay(mensajes: Mensaje[]) {
  const groups: { dateKey: string; label: string; items: Mensaje[] }[] = [];

  for (const mensaje of mensajes) {
    const key = mensaje.enviado_en.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.dateKey === key) {
      last.items.push(mensaje);
    } else {
      groups.push({ dateKey: key, label: formatDateLabel(mensaje.enviado_en), items: [mensaje] });
    }
  }

  return groups;
}

function bubbleStyles(role: Mensaje['rol']) {
  if (role === 'user') {
    return {
      justify: 'justify-end',
      background: 'linear-gradient(135deg, #d7ac55, #9b6a24)',
      border: '1px solid rgba(151,102,31,0.22)',
      radius: '22px 22px 6px 22px',
      label: null,
      labelStyle: null,
      timeColor: 'rgba(255,250,240,0.72)',
      metaJustify: 'justify-end',
      textColor: '#fffaf0',
    };
  }

  if (role === 'human') {
    return {
      justify: 'justify-start',
      background: 'linear-gradient(180deg, #fff7e8, #f3e3bf)',
      border: '1px solid rgba(218,197,160,0.72)',
      radius: '22px 22px 22px 6px',
      label: 'Humano',
      labelStyle: { background: '#ead5ad', color: '#704a14' },
      timeColor: '#9a8a72',
      metaJustify: 'justify-start',
      textColor: '#2c2418',
    };
  }

  return {
    justify: 'justify-start',
    background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.9))',
    border: '1px solid rgba(218,197,160,0.72)',
    radius: '22px 22px 22px 6px',
    label: 'IA',
    labelStyle: { background: '#dfeedd', color: '#3f744d' },
    timeColor: '#9a8a72',
    metaJustify: 'justify-start',
    textColor: '#2c2418',
  };
}

export function ChatViewer({ mensajes }: { mensajes: Mensaje[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes]);

  if (mensajes.length === 0) {
    return (
      <p className="py-16 text-center text-[13px]" style={{ color: '#8a785d' }}>
        Sin mensajes en esta conversación.
      </p>
    );
  }

  const groups = groupByDay(mensajes);

  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto px-5 py-5"
      style={{
        maxHeight: 'calc(100vh - 310px)',
        minHeight: 360,
        background:
          'radial-gradient(circle at top, rgba(255,253,248,0.9), transparent 32%), radial-gradient(circle at 85% 12%, rgba(216,172,85,0.12), transparent 24%), repeating-linear-gradient(180deg, rgba(184,134,47,0.04) 0 1px, transparent 1px 28px)',
      }}
    >
      {groups.map((group) => (
        <div key={group.dateKey}>
          <div className="my-4 flex items-center justify-center">
            <span
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]"
              style={{
                background: '#f4ead9',
                color: '#8a785d',
                border: '1px solid rgba(218,197,160,0.62)',
              }}
            >
              {group.label}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {group.items.map((msg, index) => {
              const bubble = bubbleStyles(msg.rol);

              return (
                <div key={`${group.dateKey}-${index}`} className={`flex ${bubble.justify}`}>
                  <div
                    className="max-w-[74%] px-4 py-3 text-[13px] leading-6"
                    style={{
                      background: bubble.background,
                      color: bubble.textColor,
                      borderRadius: bubble.radius,
                      border: bubble.border,
                      boxShadow: '0 10px 24px rgba(116,82,28,0.09)',
                    }}
                  >
                    <p className="whitespace-pre-wrap">{msg.contenido}</p>
                    <div className={`mt-2 flex items-center gap-1.5 ${bubble.metaJustify}`}>
                      {bubble.label && bubble.labelStyle && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]"
                          style={bubble.labelStyle}
                        >
                          {bubble.label}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: bubble.timeColor }}>
                        {formatTime(msg.enviado_en)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
