'use client';

import { useState } from 'react';

interface Empresa { id: string; nombre: string; }

interface Props {
  empresas: Empresa[];
}

function Field({ label, type = 'text', value, onChange, placeholder, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px]" style={{ color: '#71717a' }}>{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-lg px-3 py-1.5 text-[12px] outline-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#fafafa' }}
      />
    </div>
  );
}

export function AdminForms({ empresas }: Props) {
  // Create empresa form
  const [eName, setEName] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [ePlan, setEPlan] = useState('starter');
  const [eEvolution, setEEvolution] = useState('');
  const [eApiKey, setEApiKey] = useState('');
  const [eLoading, setELoading] = useState(false);
  const [eMsg, setEMsg] = useState('');

  // Create user form
  const [uEmail, setUEmail] = useState('');
  const [uNombre, setUNombre] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRol, setURol] = useState('admin');
  const [uEmpresa, setUEmpresa] = useState('');
  const [uLoading, setULoading] = useState(false);
  const [uMsg, setUMsg] = useState('');

  const selectStyle = {
    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
    color: '#fafafa', borderRadius: 8, padding: '6px 12px', fontSize: 12, width: '100%',
  };

  async function createEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setELoading(true); setEMsg('');
    const res = await fetch('/api/admin/empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: eName, whatsapp_num: ePhone || `PENDING-${Date.now()}`,
        plan: ePlan, evolution_instance: eEvolution || null,
        evolution_api_url: 'http://46.225.183.139:8080',
        evolution_api_key: eApiKey || null,
      }),
    });
    const data = await res.json();
    setELoading(false);
    if (res.ok) {
      setEMsg(`✓ Empresa creada: ${data.nombre} (${data.id.slice(0, 8)})`);
      setEName(''); setEPhone(''); setEEvolution(''); setEApiKey('');
    } else {
      setEMsg(`Error: ${data.error}`);
    }
  }

  async function createUsuario(e: React.FormEvent) {
    e.preventDefault();
    setULoading(true); setUMsg('');
    const res = await fetch('/api/admin/usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: uEmpresa || null, email: uEmail, nombre: uNombre, password: uPass, rol: uRol }),
    });
    const data = await res.json();
    setULoading(false);
    if (res.ok) {
      setUMsg(`✓ Usuario creado: ${data.email}`);
      setUEmail(''); setUNombre(''); setUPass(''); setUEmpresa('');
    } else {
      setUMsg(`Error: ${data.error}`);
    }
  }

  const formStyle = {
    background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: 16,
  };

  const btnStyle = {
    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
    border: '0.5px solid rgba(59,130,246,0.2)', borderRadius: 8,
    padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
    opacity: 1,
  };

  return (
    <div className="grid grid-cols-2 gap-4">

      {/* Create empresa */}
      <form onSubmit={createEmpresa} style={formStyle} className="flex flex-col gap-3">
        <p className="text-[13px] font-medium" style={{ color: '#fafafa' }}>Nueva empresa</p>
        <Field label="Nombre" value={eName} onChange={setEName} placeholder="Beleti Car Audio" required />
        <Field label="WhatsApp número" value={ePhone} onChange={setEPhone} placeholder="34600000000" />
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: '#71717a' }}>Plan</label>
          <select value={ePlan} onChange={e => setEPlan(e.target.value)} style={selectStyle}>
            <option value="starter">Starter (500 conv)</option>
            <option value="pro">Pro (2000 conv)</option>
            <option value="enterprise">Enterprise (ilimitado)</option>
          </select>
        </div>
        <Field label="Instancia Evolution (opcional)" value={eEvolution} onChange={setEEvolution} placeholder="mi-negocio" />
        <Field label="Evolution API Key (opcional)" value={eApiKey} onChange={setEApiKey} placeholder="mi-api-key" />
        <button type="submit" disabled={eLoading} style={{ ...btnStyle, opacity: eLoading ? 0.5 : 1 }}>
          {eLoading ? 'Creando...' : 'Crear empresa'}
        </button>
        {eMsg && <p className="text-[11px]" style={{ color: eMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{eMsg}</p>}
      </form>

      {/* Create user */}
      <form onSubmit={createUsuario} style={formStyle} className="flex flex-col gap-3">
        <p className="text-[13px] font-medium" style={{ color: '#fafafa' }}>Nuevo usuario</p>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: '#71717a' }}>Empresa</label>
          <select value={uEmpresa} onChange={e => setUEmpresa(e.target.value)} style={selectStyle}>
            <option value="">— Sin empresa —</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>
        <Field label="Email *" type="email" value={uEmail} onChange={setUEmail} placeholder="admin@negocio.com" required />
        <Field label="Nombre *" value={uNombre} onChange={setUNombre} placeholder="Carlos García" required />
        <Field label="Contraseña * (mín. 8 caracteres)" type="password" value={uPass} onChange={setUPass} required />
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: '#71717a' }}>Rol</label>
          <select value={uRol} onChange={e => setURol(e.target.value)} style={selectStyle}>
            <option value="admin">Admin</option>
            <option value="agente">Agente</option>
          </select>
        </div>
        <button type="submit" disabled={uLoading} style={{ ...btnStyle, opacity: uLoading ? 0.5 : 1 }}>
          {uLoading ? 'Creando...' : 'Crear usuario'}
        </button>
        {uMsg && <p className="text-[11px]" style={{ color: uMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{uMsg}</p>}
      </form>

    </div>
  );
}
