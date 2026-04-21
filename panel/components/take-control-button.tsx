'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  convId: string;
  tel: string;
  variant?: 'icon' | 'full';
}

export function TakeControlButton({ convId, variant = 'icon' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleTransfer() {
    if (!confirm('¿Tomar control de esta conversación? El bot dejará de responder y el inbox quedará en modo humano.')) {
      return;
    }

    setLoading(true);
    try {
      await fetch(`/api/conversaciones/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'transferida' }),
      });

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
        className="w-full rounded-[16px] py-2.5 text-[12px] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ background: '#f8ded9', color: '#a33b36' }}
      >
        {loading ? 'Tomando control...' : 'Tomar control del chat'}
      </button>
    );
  }

  return (
    <button
      onClick={handleTransfer}
      disabled={loading}
      className="rounded-[14px] px-3 py-2 text-[11px] transition-colors hover:opacity-90 disabled:opacity-50"
      style={{ background: '#f8ded9', color: '#a33b36' }}
    >
      {loading ? '...' : 'Tomar control'}
    </button>
  );
}
