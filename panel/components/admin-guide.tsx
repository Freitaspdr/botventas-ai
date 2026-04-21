'use client';

import { useState } from 'react';

interface Step {
  text: string;
  note?: string;
}

interface GuideSection {
  title: string;
  color: string;
  steps: Step[];
}

const sections: GuideSection[] = [
  {
    title: '1. Crear nueva empresa (cliente)',
    color: '#3f744d',
    steps: [
      { text: 'En el panel Admin, baja hasta el formulario "Nueva empresa".' },
      { text: 'Rellena: Nombre del negocio, Plan (starter/pro/enterprise), Número de WhatsApp del negocio (formato internacional sin +, ej: 34612345678), Número del encargado (para notificaciones).' },
      { text: 'Pulsa "Crear empresa". Se guardará en Supabase con un ID único.' },
      { text: 'Copia el ID de la empresa de la tabla (columna Empresa ID en la sección Usuarios, o desde Supabase).', note: 'Lo necesitarás para crear el usuario.' },
    ],
  },
  {
    title: '2. Crear cuenta de usuario para el cliente',
    color: '#8a5d1a',
    steps: [
      { text: 'En el formulario "Nuevo usuario", rellena el email del cliente (debe ser una cuenta Google).' },
      { text: 'Pon el nombre del cliente y selecciona el rol "admin" (para que vea su propio panel).' },
      { text: 'Pega el ID de empresa que copiaste en el paso anterior.' },
      { text: 'Pulsa "Crear usuario".' },
      { text: 'El cliente ya puede iniciar sesión en el panel con su cuenta de Google. Solo verá sus datos.', note: 'El cliente inicia sesión en la misma URL del panel con Google OAuth.' },
    ],
  },
  {
    title: '3. Crear instancia de WhatsApp (Evolution API)',
    color: '#3f744d',
    steps: [
      { text: 'Primero configura la URL y API key de Evolution API en la empresa: ve a "Configurar" en la fila de la empresa → sección WhatsApp → guarda la URL y clave.' },
      { text: 'Introduce un nombre de instancia único (sin espacios, ej: beleti-car-audio) y pulsa "Crear".', note: 'El nombre identifica el número en Evolution API. Una vez creado no se puede cambiar.' },
      { text: 'Una vez creada la instancia, pulsa "Conectar WhatsApp".' },
      { text: 'Aparecerá un código QR. Abre WhatsApp en el móvil del negocio → Dispositivos vinculados → Vincular dispositivo → escanea el QR.' },
      { text: 'El estado cambiará a "Conectado" y mostrará el número vinculado.' },
    ],
  },
  {
    title: '4. Configurar el bot',
    color: '#b8862f',
    steps: [
      { text: 'En la página "Configurar" de la empresa, rellena los campos del bot: nombre, tono, servicios/productos, horarios, ciudad.' },
      { text: 'Usa el Generador de Prompt para crear el campo "Instrucciones extra" de forma guiada.' },
      { text: 'Asegúrate de que el backend (VPS) tenga configuradas las variables de entorno correctas para esta empresa.', note: 'El backend es multi-tenant: resuelve la empresa por el número de instancia de Evolution API.' },
      { text: 'Envía un mensaje de prueba al número conectado y verifica que el bot responde correctamente.' },
    ],
  },
];

export function AdminGuide() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[13px] font-medium transition-colors"
        style={{ color: open ? '#2c2418' : '#8a785d' }}
      >
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] transition-transform"
          style={{
            background: '#fffdfa',
            border: '1px solid rgba(218,197,160,0.72)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
        Guía paso a paso
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {sections.map((sec, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(218,197,160,0.72)', background: '#fffdfa' }}
            >
              <button
                onClick={() => setActiveSection(activeSection === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#f4ead9]"
                style={{ background: '#fbf5ea' }}
              >
                <span className="text-[13px] font-medium" style={{ color: sec.color }}>
                  {sec.title}
                </span>
                <span
                  className="text-[10px] transition-transform"
                  style={{
                    color: '#8a785d',
                    transform: activeSection === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </button>

              {activeSection === i && (
                <div className="px-4 pb-4 pt-2 flex flex-col gap-3">
                  {sec.steps.map((step, j) => (
                    <div key={j} className="flex gap-3">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: `${sec.color}18`, color: sec.color }}
                      >
                        {j + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <p className="text-[12px] leading-relaxed" style={{ color: '#2c2418' }}>
                          {step.text}
                        </p>
                        {step.note && (
                          <p
                            className="text-[11px] px-2 py-1 rounded"
                            style={{ background: '#f4ead9', color: '#8a785d', borderLeft: `2px solid ${sec.color}40` }}
                          >
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
