import { Bell, ChevronDown, Calendar, PanelLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarLayout } from "@/components/layout/sidebar-context";

export function Header() {
  const { isOpen, toggle, openMobile } = useSidebarLayout();

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
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-primary/40 transition-colors">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Fazenda São João
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors md:flex">
          <Calendar className="h-4 w-4" />
          Últimos 30 dias
          <ChevronDown className="h-4 w-4" />
        </button>
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          JS
        </div>
      </div>
    </header>
  );
}
