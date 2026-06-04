import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { FarmGuard } from "@/components/farm/FarmGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider, useSidebarLayout } from "@/components/layout/sidebar-context";
import { FarmProvider } from "@/lib/farm/farm-context";
import { requireAuth } from "@/lib/auth/guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    requireAuth();
  },
  component: AppLayout,
});

function AppLayoutContent() {
  const { isOpen } = useSidebarLayout();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out",
          isOpen ? "lg:pl-64" : "lg:pl-0",
        )}
      >
        <Header />
        <main className="px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <AuthGuard>
      <FarmProvider>
        <FarmGuard>
          <SidebarProvider>
            <AppLayoutContent />
          </SidebarProvider>
        </FarmGuard>
      </FarmProvider>
    </AuthGuard>
  );
}
