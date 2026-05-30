import {
  LayoutDashboard,
  Map,
  LineChart,
  CloudSun,
  Sprout,
  Wheat,
  FileText,
  Bell,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Visão Geral", to: "/", icon: LayoutDashboard },
  { label: "Mapa", to: "/mapa", icon: Map },
  { label: "Análises", to: "/analises", icon: LineChart },
  { label: "Clima", to: "/clima", icon: CloudSun },
  { label: "Solo", to: "/solo", icon: Sprout },
  { label: "Culturas", to: "/culturas", icon: Wheat },
  { label: "Relatórios", to: "/relatorios", icon: FileText },
  { label: "Alertas", to: "/alertas", icon: Bell },
  { label: "Configurações", to: "/configuracoes", icon: Settings },
];
