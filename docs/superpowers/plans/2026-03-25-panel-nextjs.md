# Panel Admin BotVentas AI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel web en Next.js para que Beleti Car Audio gestione conversaciones, leads y la configuración del bot IA.

**Architecture:** Proyecto Next.js independiente en `panel/` dentro del repo. Usa App Router con grupos de rutas para auth y dashboard. API Routes conectan directo a la misma base de datos PostgreSQL que el backend WhatsApp. NextAuth v5 mapea el email de Google contra la tabla `usuarios` para obtener el `empresa_id`.

**Tech Stack:** Next.js 15 · TypeScript · NextAuth v5 (Auth.js) · Tailwind CSS · shadcn/ui · pg (PostgreSQL) · Lucide Icons

---

## Estructura de archivos

```
panel/
├── app/
│   ├── layout.tsx                        ← Root layout (fuentes, providers)
│   ├── (auth)/login/page.tsx             ← Página login con Google
│   ├── (dashboard)/
│   │   ├── layout.tsx                    ← Sidebar + auth guard
│   │   ├── page.tsx                      ← Dashboard (stats)
│   │   ├── conversaciones/
│   │   │   ├── page.tsx                  ← Lista de conversaciones
│   │   │   └── [id]/page.tsx            ← Historial de chat
│   │   ├── leads/page.tsx               ← Pipeline de leads
│   │   └── configuracion/page.tsx       ← Configuración del bot
│   └── api/
│       ├── auth/[...nextauth]/route.ts  ← NextAuth handler
│       ├── dashboard/stats/route.ts     ← GET métricas
│       ├── conversaciones/
│       │   ├── route.ts                 ← GET lista
│       │   └── [id]/route.ts           ← GET detalle + PATCH
│       ├── leads/
│       │   ├── route.ts                 ← GET lista
│       │   └── [id]/route.ts           ← PATCH estado
│       └── empresa/route.ts            ← GET + PATCH config bot
├── components/
│   ├── sidebar.tsx                      ← Nav lateral
│   ├── stats-card.tsx                   ← Tarjeta de métrica
│   ├── conversation-table.tsx           ← Tabla de conversaciones
│   ├── chat-viewer.tsx                  ← Burbujas de chat
│   ├── lead-table.tsx                   ← Tabla + cambio de estado leads
│   └── bot-config-form.tsx             ← Formulario configuración bot
├── lib/
│   ├── db.ts                            ← Pool de pg reutilizable
│   └── auth.ts                          ← Config NextAuth
├── middleware.ts                         ← Protege rutas del dashboard
├── .env.local                           ← Variables de entorno
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Chunk 1: Scaffolding + Auth

### Task 1: Crear proyecto Next.js

**Files:**
- Create: `panel/` (directorio raíz del nuevo proyecto)
- Create: `panel/package.json`
- Create: `panel/.env.local`

- [ ] **Step 1:** Crear el proyecto Next.js con App Router en la carpeta `panel/`

```bash
cd /c/Users/freit/Desktop/BotWhatsapp
npx create-next-app@latest panel --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2:** Instalar dependencias adicionales

```bash
cd panel
npm install next-auth@beta @auth/core pg
npm install -D @types/pg
```

- [ ] **Step 3:** Instalar shadcn/ui

```bash
npx shadcn@latest init -d
# Responder: Default · Zinc · CSS variables: yes
```

- [ ] **Step 4:** Agregar componentes shadcn necesarios

```bash
npx shadcn@latest add button card badge table input textarea select label separator avatar dropdown-menu
```

- [ ] **Step 5:** Configurar `.env.local`

```env
# Base de datos (misma que el backend)
DATABASE_URL=postgresql://usuario:password@localhost:5432/botventas

# NextAuth
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=genera-con-openssl-rand-base64-32

# Google OAuth (crear en console.cloud.google.com)
AUTH_GOOGLE_ID=tu-google-client-id
AUTH_GOOGLE_SECRET=tu-google-client-secret
```

- [ ] **Step 6:** Commit inicial

```bash
git add panel/
git commit -m "feat: scaffold panel Next.js con Tailwind y shadcn/ui"
```

---

### Task 2: Configurar DB + NextAuth

**Files:**
- Create: `panel/lib/db.ts`
- Create: `panel/lib/auth.ts`
- Create: `panel/app/api/auth/[...nextauth]/route.ts`
- Create: `panel/middleware.ts`

- [ ] **Step 1:** Crear pool de PostgreSQL reutilizable

```typescript
// panel/lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
```

- [ ] **Step 2:** Configurar NextAuth con Google

```typescript
// panel/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import pool from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      // Solo permite emails registrados en la tabla usuarios
      const { rows } = await pool.query(
        'SELECT id, empresa_id, rol FROM usuarios WHERE email = $1 AND activo = true',
        [user.email]
      );
      return rows.length > 0;
    },
    async session({ session }) {
      const { rows } = await pool.query(
        'SELECT id, empresa_id, rol FROM usuarios WHERE email = $1',
        [session.user.email]
      );
      if (rows[0]) {
        session.user.id = rows[0].id;
        session.user.empresaId = rows[0].empresa_id;
        session.user.rol = rows[0].rol;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

- [ ] **Step 3:** Crear el route handler de NextAuth

```typescript
// panel/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 4:** Crear middleware de protección de rutas

```typescript
// panel/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 5:** Extender tipos de NextAuth para empresa_id y rol

```typescript
// panel/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface User {
    empresaId?: string;
    rol?: string;
  }
  interface Session {
    user: User & {
      id?: string;
      empresaId?: string;
      rol?: string;
    };
  }
}
```

- [ ] **Step 6:** Commit

```bash
git add panel/lib/ panel/app/api/auth/ panel/middleware.ts panel/types/
git commit -m "feat: configurar NextAuth con Google y protección de rutas"
```

---

### Task 3: Página de Login

**Files:**
- Create: `panel/app/(auth)/login/page.tsx`

- [ ] **Step 1:** Crear página de login

```tsx
// panel/app/(auth)/login/page.tsx
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-2xl">🤖</div>
          <h1 className="text-white text-xl font-bold">BotVentas AI</h1>
          <p className="text-zinc-400 text-sm text-center">Panel de administración</p>
        </div>
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
          className="w-full"
        >
          <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>
        </form>
        <p className="text-zinc-600 text-xs">Beleti Car Audio · Acceso restringido</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Commit

```bash
git add panel/app/(auth)/
git commit -m "feat: página de login con Google OAuth"
```

---

## Chunk 2: Layout + Dashboard

### Task 4: Layout del Dashboard (Sidebar)

**Files:**
- Create: `panel/app/layout.tsx`
- Create: `panel/components/sidebar.tsx`
- Create: `panel/app/(dashboard)/layout.tsx`

- [ ] **Step 1:** Root layout

```tsx
// panel/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BotVentas AI · Panel',
  description: 'Panel de administración Beleti Car Audio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2:** Componente Sidebar

```tsx
// panel/components/sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Users, Settings, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/',               label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/conversaciones', label: 'Conversaciones',  icon: MessageSquare },
  { href: '/leads',          label: 'Leads',           icon: Users },
  { href: '/configuracion',  label: 'Configuración',   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-base">🤖</div>
        <div>
          <p className="text-sm font-semibold text-white">BotVentas AI</p>
          <p className="text-xs text-zinc-500">Beleti Car Audio</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3:** Dashboard layout con SessionProvider

```tsx
// panel/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/sidebar';
import { SessionProvider } from 'next-auth/react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </SessionProvider>
  );
}
```

- [ ] **Step 4:** Commit

```bash
git add panel/app/layout.tsx panel/components/sidebar.tsx panel/app/(dashboard)/layout.tsx
git commit -m "feat: layout del dashboard con sidebar de navegación"
```

---

### Task 5: API de estadísticas + Dashboard page

**Files:**
- Create: `panel/app/api/dashboard/stats/route.ts`
- Create: `panel/components/stats-card.tsx`
- Create: `panel/app/(dashboard)/page.tsx`

- [ ] **Step 1:** API route de estadísticas

```typescript
// panel/app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const empresaId = session.user.empresaId;

  const [convHoy, leadsNuevos, mensajesHoy, convActivas] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM conversaciones
       WHERE empresa_id = $1 AND DATE(iniciada_en) = CURRENT_DATE`,
      [empresaId]
    ),
    pool.query(
      `SELECT COUNT(*) FROM leads
       WHERE empresa_id = $1 AND estado = 'nuevo'`,
      [empresaId]
    ),
    pool.query(
      `SELECT COUNT(*) FROM mensajes m
       JOIN conversaciones c ON m.conv_id = c.id
       WHERE c.empresa_id = $1 AND DATE(m.enviado_en) = CURRENT_DATE`,
      [empresaId]
    ),
    pool.query(
      `SELECT COUNT(*) FROM conversaciones
       WHERE empresa_id = $1 AND estado = 'activa'`,
      [empresaId]
    ),
  ]);

  return NextResponse.json({
    conversacionesHoy: parseInt(convHoy.rows[0].count),
    leadsNuevos:       parseInt(leadsNuevos.rows[0].count),
    mensajesHoy:       parseInt(mensajesHoy.rows[0].count),
    conversacionesActivas: parseInt(convActivas.rows[0].count),
  });
}
```

- [ ] **Step 2:** Componente StatsCard

```tsx
// panel/components/stats-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: 'green' | 'blue' | 'yellow' | 'purple';
}

const colorMap = {
  green:  'text-green-400',
  blue:   'text-blue-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
};

export function StatsCard({ title, value, icon: Icon, description, color = 'green' }: StatsCardProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${colorMap[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3:** Dashboard page

```tsx
// panel/app/(dashboard)/page.tsx
import { MessageSquare, Users, Zap, Activity } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';

async function getStats() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/stats`, { cache: 'no-store' });
  return res.json();
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Resumen de actividad de hoy</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Conversaciones hoy"
          value={stats.conversacionesHoy}
          icon={MessageSquare}
          color="green"
        />
        <StatsCard
          title="Leads nuevos"
          value={stats.leadsNuevos}
          icon={Users}
          color="yellow"
        />
        <StatsCard
          title="Mensajes hoy"
          value={stats.mensajesHoy}
          icon={Zap}
          color="blue"
        />
        <StatsCard
          title="Conversaciones activas"
          value={stats.conversacionesActivas}
          icon={Activity}
          color="purple"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** Commit

```bash
git add panel/app/api/dashboard/ panel/components/stats-card.tsx panel/app/(dashboard)/page.tsx
git commit -m "feat: dashboard con estadísticas en tiempo real"
```

---

## Chunk 3: Conversaciones + Leads

### Task 6: API + Página de Conversaciones

**Files:**
- Create: `panel/app/api/conversaciones/route.ts`
- Create: `panel/app/api/conversaciones/[id]/route.ts`
- Create: `panel/components/conversation-table.tsx`
- Create: `panel/app/(dashboard)/conversaciones/page.tsx`
- Create: `panel/components/chat-viewer.tsx`
- Create: `panel/app/(dashboard)/conversaciones/[id]/page.tsx`

- [ ] **Step 1:** API lista de conversaciones

```typescript
// panel/app/api/conversaciones/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT c.id, c.cliente_tel, c.cliente_nombre, c.estado, c.es_hot_lead,
            c.iniciada_en, c.actualizada_en,
            COUNT(m.id) AS total_mensajes
     FROM conversaciones c
     LEFT JOIN mensajes m ON m.conv_id = c.id
     WHERE c.empresa_id = $1
     GROUP BY c.id
     ORDER BY c.actualizada_en DESC
     LIMIT 100`,
    [session.user.empresaId]
  );

  return NextResponse.json(rows);
}
```

- [ ] **Step 2:** API detalle de conversación (mensajes)

```typescript
// panel/app/api/conversaciones/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [conv, mensajes] = await Promise.all([
    pool.query(
      `SELECT * FROM conversaciones WHERE id = $1 AND empresa_id = $2`,
      [params.id, session.user.empresaId]
    ),
    pool.query(
      `SELECT rol, contenido, enviado_en FROM mensajes
       WHERE conv_id = $1 ORDER BY enviado_en ASC`,
      [params.id]
    ),
  ]);

  if (conv.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ conversacion: conv.rows[0], mensajes: mensajes.rows });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { estado } = await req.json();
  const { rows } = await pool.query(
    `UPDATE conversaciones SET estado = $1, actualizada_en = NOW()
     WHERE id = $2 AND empresa_id = $3 RETURNING *`,
    [estado, params.id, session.user.empresaId]
  );

  return NextResponse.json(rows[0]);
}
```

- [ ] **Step 3:** Componente tabla de conversaciones

```tsx
// panel/components/conversation-table.tsx
'use client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Flame } from 'lucide-react';

const estadoBadge: Record<string, string> = {
  activa:      'bg-green-500/10 text-green-400 border-green-500/20',
  cerrada:     'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  transferida: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function ConversationTable({ conversations }: { conversations: any[] }) {
  if (conversations.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-8">Sin conversaciones aún.</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900">
          <tr>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Mensajes</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Última actividad</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conv) => (
            <tr key={conv.id} className="border-t border-zinc-800 hover:bg-zinc-900/50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/conversaciones/${conv.id}`} className="flex items-center gap-2 hover:text-green-400">
                  {conv.es_hot_lead && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                  <div>
                    <p className="font-medium text-white">{conv.cliente_nombre || 'Sin nombre'}</p>
                    <p className="text-zinc-500 text-xs">{conv.cliente_tel}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={estadoBadge[conv.estado]}>
                  {conv.estado}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {conv.total_mensajes}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-400 text-xs">
                {new Date(conv.actualizada_en).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4:** Página lista de conversaciones

```tsx
// panel/app/(dashboard)/conversaciones/page.tsx
import { ConversationTable } from '@/components/conversation-table';

async function getConversaciones() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/conversaciones`, { cache: 'no-store' });
  return res.json();
}

export default async function ConversacionesPage() {
  const conversations = await getConversaciones();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Conversaciones</h1>
        <p className="text-zinc-400 text-sm mt-1">{conversations.length} conversaciones registradas</p>
      </div>
      <ConversationTable conversations={conversations} />
    </div>
  );
}
```

- [ ] **Step 5:** Componente chat viewer

```tsx
// panel/components/chat-viewer.tsx
import { cn } from '@/lib/utils';

interface Mensaje {
  rol: 'user' | 'assistant';
  contenido: string;
  enviado_en: string;
}

export function ChatViewer({ mensajes }: { mensajes: Mensaje[] }) {
  return (
    <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
      {mensajes.map((msg, i) => (
        <div key={i} className={cn('flex', msg.rol === 'user' ? 'justify-start' : 'justify-end')}>
          <div
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
              msg.rol === 'user'
                ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                : 'bg-green-600 text-white rounded-tr-sm'
            )}
          >
            <p className="whitespace-pre-wrap">{msg.contenido}</p>
            <p className={cn('text-xs mt-1', msg.rol === 'user' ? 'text-zinc-500' : 'text-green-200')}>
              {new Date(msg.enviado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6:** Página detalle de conversación

```tsx
// panel/app/(dashboard)/conversaciones/[id]/page.tsx
import { ChatViewer } from '@/components/chat-viewer';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';

async function getConversacion(id: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/conversaciones/${id}`, { cache: 'no-store' });
  return res.json();
}

export default async function ConversacionDetailPage({ params }: { params: { id: string } }) {
  const { conversacion, mensajes } = await getConversacion(params.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/conversaciones" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">
              {conversacion.cliente_nombre || 'Sin nombre'}
            </h1>
            {conversacion.es_hot_lead && <Flame className="w-4 h-4 text-orange-400" />}
          </div>
          <p className="text-zinc-400 text-sm">{conversacion.cliente_tel}</p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {conversacion.estado}
        </Badge>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <ChatViewer mensajes={mensajes} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7:** Commit

```bash
git add panel/app/api/conversaciones/ panel/components/conversation-table.tsx panel/components/chat-viewer.tsx panel/app/(dashboard)/conversaciones/
git commit -m "feat: páginas de conversaciones con historial de chat"
```

---

### Task 7: API + Página de Leads

**Files:**
- Create: `panel/app/api/leads/route.ts`
- Create: `panel/app/api/leads/[id]/route.ts`
- Create: `panel/components/lead-table.tsx`
- Create: `panel/app/(dashboard)/leads/page.tsx`

- [ ] **Step 1:** API leads

```typescript
// panel/app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT l.id, l.cliente_tel, l.cliente_nombre, l.nivel, l.interes, l.estado, l.creado_en
     FROM leads l
     WHERE l.empresa_id = $1
     ORDER BY l.creado_en DESC`,
    [session.user.empresaId]
  );

  return NextResponse.json(rows);
}
```

```typescript
// panel/app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const campos = Object.keys(body).filter(k => ['estado', 'notas', 'nivel'].includes(k));
  if (campos.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  const sets = campos.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = campos.map(k => body[k]);

  const { rows } = await pool.query(
    `UPDATE leads SET ${sets} WHERE id = $${vals.length + 1} AND empresa_id = $${vals.length + 2} RETURNING *`,
    [...vals, params.id, session.user.empresaId]
  );

  return NextResponse.json(rows[0]);
}
```

- [ ] **Step 2:** Componente tabla de leads con cambio de estado

```tsx
// panel/components/lead-table.tsx
'use client';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const nivelBadge: Record<string, string> = {
  alto:  'bg-red-500/10 text-red-400 border-red-500/20',
  medio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  bajo:  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function LeadTable({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);

  const updateEstado = async (id: string, estado: string) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setLeads(leads.map(l => l.id === id ? { ...l, estado } : l));
  };

  if (leads.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-8">Sin leads registrados aún.</p>;
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
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-zinc-800">
              <td className="px-4 py-3">
                <p className="font-medium text-white">{lead.cliente_nombre || 'Sin nombre'}</p>
                <p className="text-zinc-500 text-xs">{lead.cliente_tel}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={nivelBadge[lead.nivel]}>
                  {lead.nivel}
                </Badge>
              </td>
              <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{lead.interes || '—'}</td>
              <td className="px-4 py-3">
                <Select defaultValue={lead.estado} onValueChange={(v) => updateEstado(lead.id, v)}>
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {['nuevo', 'contactado', 'cerrado', 'perdido'].map(e => (
                      <SelectItem key={e} value={e} className="text-zinc-200 text-xs focus:bg-zinc-700">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3:** Página de leads

```tsx
// panel/app/(dashboard)/leads/page.tsx
import { LeadTable } from '@/components/lead-table';

async function getLeads() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/leads`, { cache: 'no-store' });
  return res.json();
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leads</h1>
        <p className="text-zinc-400 text-sm mt-1">{leads.length} prospectos registrados</p>
      </div>
      <LeadTable initialLeads={leads} />
    </div>
  );
}
```

- [ ] **Step 4:** Commit

```bash
git add panel/app/api/leads/ panel/components/lead-table.tsx panel/app/(dashboard)/leads/
git commit -m "feat: página de leads con cambio de estado inline"
```

---

## Chunk 4: Configuración del Bot

### Task 8: API + Formulario de configuración

**Files:**
- Create: `panel/app/api/empresa/route.ts`
- Create: `panel/components/bot-config-form.tsx`
- Create: `panel/app/(dashboard)/configuracion/page.tsx`

- [ ] **Step 1:** API de empresa (GET + PATCH)

```typescript
// panel/app/api/empresa/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT nombre, bot_nombre, bot_tono, bot_objetivo, bot_productos,
            bot_horarios, bot_ciudad, bot_extra, plan, conv_limite, conv_usadas
     FROM empresas WHERE id = $1`,
    [session.user.empresaId]
  );

  return NextResponse.json(rows[0]);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowed = ['bot_nombre', 'bot_tono', 'bot_objetivo', 'bot_productos', 'bot_horarios', 'bot_ciudad', 'bot_extra'];
  const campos = Object.keys(body).filter(k => allowed.includes(k));

  if (campos.length === 0) return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 });

  const sets = campos.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = campos.map(k => body[k]);

  const { rows } = await pool.query(
    `UPDATE empresas SET ${sets}, actualizado_en = NOW()
     WHERE id = $${vals.length + 1} RETURNING *`,
    [...vals, session.user.empresaId]
  );

  return NextResponse.json(rows[0]);
}
```

- [ ] **Step 2:** Formulario de configuración del bot

```tsx
// panel/components/bot-config-form.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';

export function BotConfigForm({ empresa }: { empresa: any }) {
  const [form, setForm] = useState(empresa);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/empresa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_nombre: form.bot_nombre,
        bot_tono: form.bot_tono,
        bot_objetivo: form.bot_objetivo,
        bot_productos: form.bot_productos,
        bot_horarios: form.bot_horarios,
        bot_ciudad: form.bot_ciudad,
        bot_extra: form.bot_extra,
      }),
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Nombre del bot</Label>
          <Input
            value={form.bot_nombre}
            onChange={e => handleChange('bot_nombre', e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
            placeholder="Carlos"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Tono</Label>
          <Select value={form.bot_tono} onValueChange={v => handleChange('bot_tono', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="amigable" className="text-zinc-200">Amigable</SelectItem>
              <SelectItem value="profesional" className="text-zinc-200">Profesional</SelectItem>
              <SelectItem value="formal" className="text-zinc-200">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-300">Ciudad</Label>
        <Input
          value={form.bot_ciudad || ''}
          onChange={e => handleChange('bot_ciudad', e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-white"
          placeholder="Madrid"
        />
      </div>

      {[
        { key: 'bot_objetivo', label: 'Objetivo del bot', placeholder: 'Ej: Asesorar clientes sobre instalaciones...' },
        { key: 'bot_productos', label: 'Catálogo de productos/servicios', placeholder: 'Lista los productos y servicios disponibles...' },
        { key: 'bot_horarios', label: 'Horarios de atención', placeholder: 'Lunes a Sábado 9am-7pm...' },
        { key: 'bot_extra', label: 'Instrucciones adicionales', placeholder: 'Flujo de ventas, preguntas frecuentes...' },
      ].map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-zinc-300">{label}</Label>
          <Textarea
            value={form[key] || ''}
            onChange={e => handleChange(key, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white min-h-[100px] resize-y"
            placeholder={placeholder}
          />
        </div>
      ))}

      <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3:** Página de configuración

```tsx
// panel/app/(dashboard)/configuracion/page.tsx
import { BotConfigForm } from '@/components/bot-config-form';

async function getEmpresa() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/empresa`, { cache: 'no-store' });
  return res.json();
}

export default async function ConfiguracionPage() {
  const empresa = await getEmpresa();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración del bot</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Personaliza cómo responde el asistente de <strong className="text-white">{empresa.nombre}</strong>
        </p>
      </div>

      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm">
        <span className="text-zinc-400">Plan:</span>
        <span className="text-white font-medium capitalize">{empresa.plan}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Conversaciones:</span>
        <span className="text-white font-medium">{empresa.conv_usadas} / {empresa.conv_limite}</span>
      </div>

      <BotConfigForm empresa={empresa} />
    </div>
  );
}
```

- [ ] **Step 4:** Commit final

```bash
git add panel/app/api/empresa/ panel/components/bot-config-form.tsx panel/app/(dashboard)/configuracion/
git commit -m "feat: página de configuración del bot con guardado en tiempo real"
```

---

## Setup final

### Task 9: Insertar usuario de prueba y levantar el panel

- [ ] **Step 1:** Insertar usuario admin de Beleti en la BD

```sql
INSERT INTO usuarios (empresa_id, email, nombre, rol)
SELECT id, 'tu-email@gmail.com', 'Admin Beleti', 'admin'
FROM empresas WHERE nombre = 'Beleti Car Audio'
ON CONFLICT (email) DO NOTHING;
```

- [ ] **Step 2:** Configurar puerto del panel para no chocar con el backend (puerto 3000)

```bash
# panel/package.json — modificar el script dev:
"dev": "next dev -p 3001"
```

- [ ] **Step 3:** Levantar el panel

```bash
cd panel && npm run dev
# Abre http://localhost:3001
```

- [ ] **Step 4:** Verificar flujo completo: login → dashboard → conversaciones → leads → configuración

---

## Variables de entorno necesarias

```env
# panel/.env.local
DATABASE_URL=postgresql://usuario:password@localhost:5432/botventas
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<Google Cloud Console>
AUTH_GOOGLE_SECRET=<Google Cloud Console>
```

**Cómo obtener credenciales Google:**
1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
