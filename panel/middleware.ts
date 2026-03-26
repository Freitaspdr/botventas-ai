import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Middleware Edge-compatible: solo verifica JWT, sin tocar la BD ni pg
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
