import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSidebarLayout } from "@/components/layout/sidebar-context";
import { useAuth } from "@/lib/auth/auth-context";
import { getSessionInitials } from "@/lib/auth/session";
import { BrandLogo } from "@/components/brand/BrandLogo";

type SidebarNavProps = {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
};

const SidebarNav = ({ onNavigate, showClose, onClose }: SidebarNavProps) => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, logout } = useAuth();
  const initials = getSessionInitials(session);
  const displayName = session?.email?.split("@")[0] ?? "Usuário";

  return (
    <>
      <div className="brand-sidebar-header flex h-[4.25rem] items-center gap-2 px-4 lg:px-6">
        <BrandLogo size="sm" subtitle="Climate" variant="onDark" className="min-w-0 flex-1" />
        {showClose && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fechar menu lateral"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-dark/55">
          Plataforma
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-brand-dark text-white shadow-sm"
                      : "text-brand-dark/75 hover:bg-brand-dark/8 hover:text-brand-dark",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-brand-light" />
                  )}
                  <Icon className={cn("h-4 w-4", active ? "text-brand-light" : "text-brand-forest")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-xl border border-brand-dark/15 bg-brand-dark/[0.03] p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-dark text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize text-brand-dark">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.email ?? "—"}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );
};

export function Sidebar() {
  const { isOpen, close, isMobileOpen, openMobile, closeMobile } = useSidebarLayout();

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out lg:flex",
          !isOpen && "-translate-x-full",
        )}
        aria-hidden={!isOpen}
      >
        <SidebarNav showClose onClose={close} />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={(open) => (open ? openMobile() : closeMobile())}>
        <SheetContent
          side="left"
          className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarNav showClose onClose={closeMobile} onNavigate={closeMobile} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
