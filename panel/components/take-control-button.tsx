'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  convId: string;
  tel: string;
  variant?: 'icon' | 'full';
}

export function TakeControlButton({ convId, tel, variant = 'icon' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleTransfer() {
    if (!confirm('¿Transferir esta conversación a humano? El bot dejará de responder.')) return;

    setLoading(true);
    try {
      await fetch(`/api/conversaciones/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'transferida' }),
      });

      // Open WhatsApp Web in new tab
      const phone = tel.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleTransfer}
        disabled={loading}
        className="w-full rounded-lg py-2 text-[12px] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
      >
        {loading ? 'Transfiriendo…' : 'Transferir a humano'}
      </button>
    );
  }

  return (
    <button
      onClick={handleTransfer}
      disabled={loading}
      className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
      style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
    >
      {loading ? '…' : 'Tomar control'}
    </button>
  );
}
