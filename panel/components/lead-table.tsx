'use client';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const nivelBadge: Record<string, string> = {
  alto:  'bg-red-500/10 text-red-400 border-red-500/20',
  medio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  bajo:  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LeadTable({ initialLeads }: { initialLeads: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leads, setLeads] = useState<any[]>(initialLeads);

  const updateEstado = async (id: string, estado: string) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
  };

  if (leads.length === 0) {
    return (
      <p className="text-zinc-500 text-sm text-center py-12">
        Sin leads registrados aún.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900">
          <tr>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Nivel</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Interés</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Registrado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-white">{lead.cliente_nombre || 'Sin nombre'}</p>
                <p className="text-zinc-500 text-xs">{lead.cliente_tel}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={nivelBadge[lead.nivel]}>
                  {lead.nivel}
                </Badge>
              </td>
              <td className="px-4 py-3 text-zinc-400 max-w-xs">
                <p className="truncate">{lead.interes || '—'}</p>
              </td>
              <td className="px-4 py-3">
                <Select
                  defaultValue={lead.estado}
                  onValueChange={(v) => updateEstado(lead.id, v)}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {['nuevo', 'contactado', 'cerrado', 'perdido'].map((e) => (
                      <SelectItem
                        key={e}
                        value={e}
                        className="text-zinc-200 text-xs focus:bg-zinc-700"
                      >
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-3 text-zinc-500 text-xs">
                {new Date(lead.creado_en).toLocaleDateString('es-ES', { dateStyle: 'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
