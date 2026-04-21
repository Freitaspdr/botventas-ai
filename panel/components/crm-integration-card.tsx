'use client';

import { useState } from 'react';

export function CrmIntegrationCard({
  token,
  apiBaseUrl,
}: {
  token?: string;
  apiBaseUrl: string;
}) {
  const [copied, setCopied] = useState<'token' | 'base' | ''>('');

  async function copy(kind: 'token' | 'base', value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(''), 1800);
  }

  return (
    <div
      className="rounded-[28px] p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,232,207,0.92) 56%, rgba(220,190,130,0.28))',
        border: '1px solid rgba(218,197,160,0.72)',
        boxShadow: '0 16px 42px rgba(116,82,28,0.09)',
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[720px]">
          <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#9a8153' }}>
            Integración
          </p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]" style={{ color: '#2c2418' }}>
            CRM API reusable
          </h2>
          <p className="mt-3 text-[13px]" style={{ color: '#6f604a' }}>
            Este token ya permite conectar otro proyecto al CRM vía <code>x-crm-token</code>. No hace falta copiar la lógica del bot ni leer la base de datos directamente.
          </p>
        </div>

        <div className="grid gap-3 lg:min-w-[420px]">
          <div
            className="rounded-[18px] p-3"
            style={{ background: 'rgba(255,253,248,0.72)', border: '1px solid rgba(218,197,160,0.62)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
              Base URL
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={apiBaseUrl}
                className="h-10 flex-1 rounded-[14px] px-3 text-[12px] outline-none"
                style={{
                  background: 'rgba(255,253,248,0.9)',
                  border: '1px solid rgba(218,197,160,0.68)',
                  color: '#2c2418',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => copy('base', apiBaseUrl)}
                className="rounded-[14px] px-3 py-2 text-[11px] font-medium"
                style={{ background: '#f3e5ce', color: '#79521d' }}
              >
                {copied === 'base' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div
            className="rounded-[18px] p-3"
            style={{ background: 'rgba(255,253,248,0.72)', border: '1px solid rgba(218,197,160,0.62)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#9a8153' }}>
              Token empresa
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={token || ''}
                className="h-10 flex-1 rounded-[14px] px-3 text-[12px] outline-none"
                style={{
                  background: 'rgba(255,253,248,0.9)',
                  border: '1px solid rgba(218,197,160,0.68)',
                  color: '#2c2418',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => copy('token', token)}
                className="rounded-[14px] px-3 py-2 text-[11px] font-medium"
                style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
              >
                {copied === 'token' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
