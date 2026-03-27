import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { createClient } from '@supabase/supabase-js';

// Usa Supabase REST en vez de pg directo → funciona en Vercel (IPv4, sin SSL issues)
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google,
    Credentials({
      name: 'Email y contraseña',
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const { data, error } = await getSupabase()
            .from('usuarios')
            .select('id, empresa_id, rol, nombre, email, password_hash')
            .eq('email', credentials.email)
            .eq('activo', true)
            .limit(1)
            .single();

          if (error || !data?.password_hash) return null;

          const valid = await bcrypt.compare(credentials.password as string, data.password_hash);
          if (!valid) return null;

          return { id: data.id, email: data.email, name: data.nombre, empresaId: data.empresa_id, rol: data.rol };
        } catch (err) {
          console.error('Credentials error:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;
      try {
        const { data } = await getSupabase()
          .from('usuarios')
          .select('id')
          .eq('email', user.email!)
          .eq('activo', true)
          .limit(1)
          .single();
        return !!data;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.empresaId = (user as { empresaId?: string }).empresaId;
        token.rol       = (user as { rol?: string }).rol;
      }
      if (!token.id && token.email) {
        try {
          const { data } = await getSupabase()
            .from('usuarios')
            .select('id, empresa_id, rol')
            .eq('email', token.email)
            .limit(1)
            .single();
          if (data) {
            token.id        = data.id;
            token.empresaId = data.empresa_id;
            token.rol       = data.rol;
          }
        } catch (err) {
          console.error('JWT lookup error:', err);
        }
      }
      return token;
    },
  },
});
