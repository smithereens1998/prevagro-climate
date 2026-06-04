import { CloudRain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekForecastCard } from "@/lib/api/clima-adapters";
import { WeatherIcon } from "@/components/clima/WeatherIcon";

type ClimaWeekForecastProps = {
  days: WeekForecastCard[];
  isLoading: boolean;
  emptyMessage: string;
};

export const ClimaWeekForecast = ({ days, isLoading, emptyMessage }: ClimaWeekForecastProps) => {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface/40">
        <Loader2 className="h-6 w-6 animate-spin text-brand-agri" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface/40 px-4 text-center">
        <WeatherIcon condition="rain" size="lg" className="opacity-40" />
        <p className="max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day, index) => (
        <WeekDayCard key={day.key} day={day} isToday={index === 0} />
      ))}
    </div>
  );
};

const WeekDayCard = ({ day, isToday }: { day: WeekForecastCard; isToday: boolean }) => (
  <div
    className={cn(
      "flex flex-col items-center rounded-xl border p-3 text-center transition-shadow",
      isToday
        ? "border-brand-dark/25 bg-gradient-to-b from-brand-dark/[0.06] to-white shadow-sm ring-1 ring-brand-dark/10"
        : "border-border bg-surface/80 hover:border-brand-agri/25 hover:shadow-sm",
    )}
  >
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wider",
        isToday ? "text-brand-dark" : "text-muted-foreground",
      )}
    >
      {day.label}
    </p>

    <div className="my-3">
      <WeatherIcon condition={day.condition} size="md" emphasized={isToday} />
    </div>

    <p className="text-lg font-semibold tabular-nums text-brand-dark">
      {day.tempMax != null ? Math.round(day.tempMax) : "—"}°
    </p>
    <p className="text-xs tabular-nums text-muted-foreground">
      mín {day.tempMin != null ? Math.round(day.tempMin) : "—"}°
    </p>
    <span
      className={cn(
        "mt-2 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        isToday
          ? "border-brand-agri/30 bg-brand-agri/10 text-brand-forest"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {day.conditionLabel}
    </span>
  </div>
);
