import { cn } from "@/lib/utils";
import type { LegendItem } from "@/lib/geo/map-layers";

type MapLegendProps = {
  items: LegendItem[];
  className?: string;
};

const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r}, ${g}, ${b})`;

export const MapLegend = ({ items, className }: MapLegendProps) => {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        Nenhuma camada de dados ativa
      </div>
    );
  }

  return (
    <div className={cn("flex max-w-[min(100%,420px)] flex-col gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.layerId}
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
        >
          <p className="mb-1.5 font-medium text-foreground">
            {item.title}
            {item.unit ? <span className="text-muted-foreground"> ({item.unit})</span> : null}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{item.minLabel}</span>
            <span
              className="h-2 min-w-[72px] flex-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${item.stops.map(rgb).join(", ")})`,
              }}
              aria-hidden
            />
            <span className="text-muted-foreground">{item.maxLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
