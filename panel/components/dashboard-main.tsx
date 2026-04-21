'use client';

import type { CSSProperties } from 'react';
import { useSidebar } from './sidebar-context';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();

  return (
    <main
      className="dashboard-main min-h-screen overflow-auto transition-[padding] duration-200"
      style={{
        '--dashboard-sidebar-width': open ? '312px' : '120px',
      } as CSSProperties}
    >
      <div className="mx-auto max-w-[1560px] px-4 pb-10 md:px-6">
        <div className="panel-shell min-h-[calc(100vh-132px)] rounded-[32px] p-4 md:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
