import { Bell, Calendar, LogOut, PanelLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarLayout } from "@/components/layout/sidebar-context";
import { FarmSelector } from "@/components/farm/FarmSelector";
import { useAuth } from "@/lib/auth/auth-context";
import { getSessionInitials } from "@/lib/auth/session";

export function Header() {
  const { isOpen, toggle, openMobile } = useSidebarLayout();
  const { session, logout } = useAuth();
  const initials = getSessionInitials(session);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      toggle();
      return;
    }
    openMobile();
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleToggleSidebar}
        aria-label={isOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <FarmSelector />
        <div
          className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground md:flex"
          title="Janela operacional da previsão climática exibida no painel"
          aria-label="Previsão climática de 30 dias"
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          <span>Previsão 30 dias</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground w-64">
          <Search className="h-4 w-4" />
          <input
            placeholder="Buscar área, cultura, relatório…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Menu da conta"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">Minha conta</p>
              <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
