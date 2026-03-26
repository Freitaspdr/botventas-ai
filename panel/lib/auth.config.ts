import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Config Edge-compatible (sin imports de Node.js)
// Usada por el middleware para verificar JWT sin tocar la BD
export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith('/login');

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/', nextUrl));
      }
      if (!isLoggedIn && !isLoginPage) {
        return false; // redirige a /login automáticamente
      }
      return true;
    },
    session({ session, token }) {
      // Lee del JWT — sin consulta a BD
      if (token.id)        session.user.id        = token.id as string;
      if (token.empresaId) session.user.empresaId = token.empresaId as string;
      if (token.rol)       session.user.rol       = token.rol as string;
      return session;
    },
  },
};
