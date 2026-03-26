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
