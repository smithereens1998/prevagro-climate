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
          <p className="mb-1 text-[11px] leading-snug text-muted-foreground">{item.description}</p>
          <div className="mb-1.5 flex items-start justify-between gap-2 border-t border-border/60 pt-1.5">
            <p className="font-medium text-foreground">
              {item.title}
              {item.unit ? <span className="text-muted-foreground"> ({item.unit})</span> : null}
            </p>
            {item.currentValue ? (
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  item.fromApi
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.currentValue}
              </span>
            ) : null}
          </div>
          {item.valueHint ? (
            <p className="mb-1.5 text-[11px] text-muted-foreground">{item.valueHint}</p>
          ) : null}
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
