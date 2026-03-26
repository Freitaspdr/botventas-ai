// ============================================
// BOTVENTAS AI - Servicio Google Calendar
// Consulta disponibilidad y crea citas
// ============================================

import { google } from 'googleapis';
import { env } from '../config/env';

function getCalendarClient() {
  const auth = new google.auth.JWT({
    email:  env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key:    env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

export interface TimeSlot {
  start: Date;
  end:   Date;
}

/**
 * Devuelve los próximos N slots libres de 1 hora dentro del horario laboral (9-18h, L-S)
 * buscando en los próximos 7 días. Devuelve [] si Calendar no está configurado.
 */
export async function getAvailableSlots(n = 3): Promise<TimeSlot[]> {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return [];

  const calendar = getCalendarClient();
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const { data } = await calendar.events.list({
    calendarId:   env.GOOGLE_CALENDAR_ID,
    timeMin:      now.toISOString(),
    timeMax:      weekLater.toISOString(),
    singleEvents: true,
    orderBy:      'startTime',
  });

  const busyTimes = (data.items ?? [])
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      start: new Date(e.start!.dateTime!),
      end:   new Date(e.end!.dateTime!),
    }));

  // Genera candidatos: cada hora en punto, 9-18h, L-S
  const slots: TimeSlot[] = [];
  const cursor = new Date(now);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1); // empieza en la siguiente hora completa

  while (slots.length < n && cursor < weekLater) {
    const day  = cursor.getDay(); // 0=Dom, 6=Sáb
    const hour = cursor.getHours();

    if (day !== 0 && hour >= 9 && hour < 18) {
      const slotEnd = new Date(cursor.getTime() + 3600 * 1000);
      const isFree  = !busyTimes.some(b => cursor < b.end && slotEnd > b.start);
      if (isFree) {
        slots.push({ start: new Date(cursor), end: slotEnd });
      }
    }

    cursor.setHours(cursor.getHours() + 1);
  }

  return slots;
}

export interface AppointmentData {
  clienteNombre: string;
  clienteTel:    string;
  servicio:      string;
  vehiculo?:     string;
  slot:          TimeSlot;
  direccion?:    string;
}

/**
 * Crea un evento en Google Calendar y devuelve el enlace web, o null si no hay credenciales.
 */
export async function createCalendarEvent(data: AppointmentData): Promise<string | null> {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return null;

  const calendar = getCalendarClient();

  const description =
    `Cliente: ${data.clienteNombre} (${data.clienteTel})\n` +
    `Servicio: ${data.servicio}\n` +
    (data.vehiculo ? `Vehículo: ${data.vehiculo}\n` : '');

  const { data: event } = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary:     `Cita: ${data.clienteNombre} — ${data.servicio}`,
      description,
      location:    data.direccion,
      start: { dateTime: data.slot.start.toISOString() },
      end:   { dateTime: data.slot.end.toISOString()   },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  });

  return event.htmlLink ?? null;
}

/**
 * Formatea un slot para mostrar al cliente.
 * Ej: "martes 25 de marzo a las 11:00"
 */
export function formatSlot(slot: TimeSlot): string {
  const dias   = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses  = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d    = slot.start;
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} a las ${hora}`;
}
