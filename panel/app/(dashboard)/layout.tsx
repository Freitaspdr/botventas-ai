import { TopBar } from '@/components/top-bar';
import { SidebarWrapper } from '@/components/sidebar-wrapper';
import { SidebarProvider } from '@/components/sidebar-context';
import { DashboardMain } from '@/components/dashboard-main';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[4%] top-[8%] h-72 w-72 rounded-full bg-[#fff8e8]/80 blur-3xl" />
          <div className="absolute right-[10%] top-[12%] h-80 w-80 rounded-full bg-[#d9a441]/18 blur-3xl" />
          <div className="absolute bottom-[8%] left-[22%] h-96 w-96 rounded-full bg-[#c9ad7b]/18 blur-3xl" />
        </div>
        <TopBar />
        <SidebarWrapper />
        <DashboardMain>{children}</DashboardMain>
      </div>
    </SidebarProvider>
  );
}
