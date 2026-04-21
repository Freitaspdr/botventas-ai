'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Email o contraseÃ±a incorrectos.');
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-[30px] p-10"
        style={{
          background: 'rgba(255,253,248,0.92)',
          border: '1px solid rgba(218,197,160,0.72)',
          boxShadow: '0 28px 80px rgba(116,82,28,0.16)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #d7ac55, #9b6a24)', color: '#fffaf0' }}
          >
            AI
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#2c2418' }}>BotVentas AI</h1>
          <p className="text-sm" style={{ color: '#8a785d' }}>Panel de administraciÃ³n</p>
        </div>

        <form onSubmit={handleCredentials} className="flex w-full flex-col gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm" style={{ color: '#5f513e' }}>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="border-[#dac5a0] bg-[#fffdfa] text-[#2c2418] placeholder:text-[#9a8a72]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm" style={{ color: '#5f513e' }}>ContraseÃ±a</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              required
              className="border-[#dac5a0] bg-[#fffdfa] text-[#2c2418] placeholder:text-[#9a8a72]"
            />
          </div>

          {error && (
            <p className="text-center text-xs" style={{ color: '#a33b36' }}>{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="luxury-button mt-1 w-full hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Iniciar sesiÃ³n'}
          </Button>
        </form>

        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-[#eadcc6]" />
          <span className="text-xs" style={{ color: '#9a8a72' }}>o</span>
          <div className="h-px flex-1 bg-[#eadcc6]" />
        </div>

        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="w-full border border-[#dac5a0] bg-[#fffdfa] font-medium text-[#2c2418] hover:bg-[#f3e5ce]"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </Button>

        <p className="text-xs" style={{ color: '#9a8a72' }}>Beleti Car Audio Â· Acceso restringido</p>
      </div>
    </div>
  );
}
