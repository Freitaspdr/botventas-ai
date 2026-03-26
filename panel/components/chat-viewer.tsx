'use client';

import { useEffect, useRef } from 'react';

interface Mensaje {
  rol: 'user' | 'assistant';
  contenido: string;
  enviado_en: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today))     return 'Hoy';
  if (sameDay(d, yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function groupByDay(mensajes: Mensaje[]) {
  const groups: { dateKey: string; label: string; items: Mensaje[] }[] = [];
  for (const m of mensajes) {
    const key = m.enviado_en.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.dateKey === key) {
      last.items.push(m);
    } else {
      groups.push({ dateKey: key, label: formatDateLabel(m.enviado_en), items: [m] });
    }
  }
  return groups;
}

export function ChatViewer({ mensajes }: { mensajes: Mensaje[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [mensajes]);

  if (mensajes.length === 0) {
    return (
      <p className="text-center py-12 text-[13px]" style={{ color: '#71717a' }}>
        Sin mensajes en esta conversación.
      </p>
    );
  }

  const groups = groupByDay(mensajes);

  return (
    <div
      className="flex flex-col gap-1 overflow-y-auto px-4 py-3"
      style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 300 }}
    >
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-3">
            <span
              className="text-[10px] px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#a1a1aa' }}
            >
              {group.label}
            </span>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-1.5">
            {group.items.map((msg, i) => {
              const isUser = msg.rol === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[72%] px-3 py-2 text-[13px] leading-relaxed"
                    style={{
                      background: isUser ? '#065f46' : '#1c1c22',
                      color: '#fafafa',
                      borderRadius: isUser
                        ? '12px 12px 2px 12px'
                        : '12px 12px 12px 2px',
                    }}
                  >
                    <p className="whitespace-pre-wrap">{msg.contenido}</p>
                    <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span style={{ fontSize: 9, color: isUser ? 'rgba(255,255,255,0.4)' : '#71717a' }}>
                        {formatTime(msg.enviado_en)}
                      </span>
                      {!isUser && (
                        <span
                          className="px-1 py-0.5 rounded"
                          style={{ fontSize: 8, background: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}
                        >
                          IA
                        </span>
                      )}
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
