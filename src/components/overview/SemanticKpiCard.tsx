import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricVisualBand } from "@/lib/overview/metric-visuals";

type SemanticKpiCardProps = {
  label: React.ReactNode;
  value: string;
  unit?: string;
  delta?: number;
  icon: LucideIcon;
  visual: MetricVisualBand;
  compact?: boolean;
};

export const SemanticKpiCard = ({
  label,
  value,
  unit,
  delta,
  icon: Icon,
  visual,
  compact = false,
}: SemanticKpiCardProps) => {
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 p-4 transition-colors",
        visual.borderClass,
        visual.bgClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            compact ? "h-8 w-8" : "h-9 w-9",
            visual.iconBgClass,
          )}
        >
          <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", visual.iconTextClass)} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {value !== "—" && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                visual.badgeClass,
              )}
            >
              {visual.label}
            </span>
          )}
          {delta !== undefined && delta !== 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {positive ? "+" : "−"}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>
      <div className={cn("mt-3", compact && "mt-2")}>
        <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-sm")}>{label}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span
            className={cn(
              "font-semibold tracking-tight",
              compact ? "text-lg" : "text-2xl",
              value === "—" ? "text-foreground" : visual.valueClass,
            )}
          >
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </p>
      </div>
    </div>
  );
};
