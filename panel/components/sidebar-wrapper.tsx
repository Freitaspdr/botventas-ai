import { auth } from '@/lib/auth';
import { Sidebar } from './sidebar';

export async function SidebarWrapper() {
  const session = await auth();
  const isSuperAdmin = (session?.user as { rol?: string })?.rol === 'superadmin';
  return <Sidebar isSuperAdmin={isSuperAdmin} />;
}
