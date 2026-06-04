import { Calendar, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarLayout } from "@/components/layout/sidebar-context";
import { FarmSelector } from "@/components/farm/FarmSelector";

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
    <header className="brand-top-bar sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-brand-dark hover:bg-brand-dark/8"
        onClick={handleToggleSidebar}
        aria-label={isOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <FarmSelector />
        <div
          className="hidden items-center gap-2 rounded-lg bg-brand-dark px-3 py-1.5 text-sm text-white md:flex"
          title="Janela operacional da previsão climática exibida no painel"
          aria-label="Previsão climática de 30 dias"
        >
          <Calendar className="h-4 w-4 shrink-0 text-brand-sun" aria-hidden />
          <span>Previsão 30 dias</span>
        </div>
      </div>
    </header>
  );
}
