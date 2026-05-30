import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Leaf, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSidebarLayout } from "@/components/layout/sidebar-context";

type SidebarNavProps = {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
};

const SidebarNav = ({ onNavigate, showClose, onClose }: SidebarNavProps) => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4 lg:px-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <Leaf className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">Prevagro</span>
          <span className="text-[11px] text-muted-foreground">Climate</span>
        </div>
        {showClose && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar menu lateral"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-medium text-muted-foreground">
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
                      ? "bg-sidebar-accent text-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-primary" />
                  )}
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            JS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">João Silva</p>
            <p className="truncate text-xs text-muted-foreground">Produtor Rural</p>
          </div>
        </div>
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
