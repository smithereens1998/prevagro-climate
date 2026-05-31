import { Link } from "@tanstack/react-router";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFarm } from "@/lib/farm/farm-context";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

export const FarmSelector = () => {
  const { farms, selectedFarm, farmDisplayName, selectFarm, isLoading } = useFarm();

  if (isLoading) {
    return (
      <div className="h-9 w-44 animate-pulse rounded-lg border border-border bg-card" aria-hidden />
    );
  }

  if (farms.length === 0) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/fazendas/nova">
          <Plus className="h-4 w-4" />
          Cadastrar fazenda
        </Link>
      </Button>
    );
  }

  const label = farmDisplayName || selectedFarm?.name || "Selecionar fazenda";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/40"
          aria-label="Selecionar fazenda"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Suas fazendas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {farms.map((farm) => {
          const itemLabel =
            selectedFarm?.id === farm.id ? farmDisplayName || farm.name : farm.name;
          return (
          <DropdownMenuItem
            key={farm.id}
            className={cn(
              "cursor-pointer",
              selectedFarm?.id === farm.id && "bg-primary/10 text-foreground",
            )}
            onSelect={() => selectFarm(farm)}
          >
            <Building2 className="mr-2 h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-medium">{itemLabel}</p>
              <p className="text-xs text-muted-foreground">
                {formatCoordinatePair(farm.latitude, farm.longitude)}
              </p>
            </div>
          </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/fazendas">
            <Building2 className="mr-2 h-4 w-4" />
            Gerenciar fazendas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/fazendas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova fazenda
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
