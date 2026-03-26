import { TopBar } from '@/components/top-bar';
import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Top bar fija, z-40 */}
      <TopBar />

      {/* Sidebar fija, empieza debajo del top bar (top: 44px) */}
      <Sidebar />

      {/* Contenido principal: margen top 44px + margen left 56px */}
      <main
        className="min-h-screen overflow-auto"
        style={{
          paddingTop: 44,
          paddingLeft: 56,
          background: '#09090b',
        }}
      >
        <div className="px-8 py-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </>
  );
}
