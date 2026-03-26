import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BotVentas AI · Panel',
  description: 'Panel de administración Beleti Car Audio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <body
        className={`${geist.className} min-h-full`}
        style={{ background: '#09090b', color: '#fafafa' }}
      >
        {children}
      </body>
    </html>
  );
}
