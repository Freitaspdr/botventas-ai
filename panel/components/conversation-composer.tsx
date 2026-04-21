'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowUpRight, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ConversationComposer({
  convId,
  disabled = false,
}: {
  convId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    startTransition(async () => {
      setError('');

      const res = await fetch(`/api/conversaciones/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'No se pudo enviar el mensaje' }));
        setError(payload.error ?? 'No se pudo enviar el mensaje');
        return;
      }

      setText('');
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[22px] p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(255,253,248,0.98), rgba(249,239,224,0.9))',
        border: '1px solid rgba(218,197,160,0.72)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium" style={{ color: '#2c2418' }}>
            Respuesta humana
          </p>
          <p className="mt-1 text-[11px]" style={{ color: '#8a785d' }}>
            El mensaje se envía desde el CRM y deja la conversación en control humano.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium"
          style={{ background: '#dfeedd', color: '#3f744d' }}
        >
          <LifeBuoy size={12} />
          Inbox humano
        </span>
      </div>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Escribe una respuesta manual para el cliente..."
        disabled={disabled || isPending}
        className="min-h-24 resize-none rounded-[18px] border-[#dac5a0] bg-[#fffdfa] px-4 py-3 text-[13px] text-[#2c2418] placeholder:text-[#9a8a72]"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px]" style={{ color: error ? '#a33b36' : '#8a785d' }}>
          {error || 'Consejo: úsalo cuando necesites cerrar, negociar o resolver dudas sensibles.'}
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={disabled || isPending || !text.trim()}
          className="rounded-[16px] px-4"
        >
          <ArrowUpRight data-icon="inline-end" />
          {isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </div>
  );
}
