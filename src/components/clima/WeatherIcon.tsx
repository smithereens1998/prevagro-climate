import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
  ThermometerSnowflake,
} from "lucide-react";
import type { WeatherCondition } from "@/lib/clima/weather-conditions";
import { cn } from "@/lib/utils";

type WeatherIconProps = {
  condition: WeatherCondition;
  size?: "sm" | "md" | "lg";
  emphasized?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4", sun: "h-3 w-3" },
  md: { box: "h-11 w-11", icon: "h-5 w-5", sun: "h-3.5 w-3.5" },
  lg: { box: "h-14 w-14", icon: "h-7 w-7", sun: "h-4 w-4" },
} as const;

const conditionStyles: Record<
  WeatherCondition,
  { bg: string; ring: string; primary: string; secondary?: string }
> = {
  sunny: {
    bg: "bg-gradient-to-br from-brand-sun/25 to-brand-sun/5",
    ring: "ring-brand-sun/30",
    primary: "text-brand-sun",
  },
  partly_cloudy: {
    bg: "bg-gradient-to-br from-brand-sun/15 to-brand-light/10",
    ring: "ring-brand-light/25",
    primary: "text-brand-sun",
    secondary: "text-brand-forest/70",
  },
  cloudy: {
    bg: "bg-gradient-to-br from-muted to-brand-dark/5",
    ring: "ring-border",
    primary: "text-brand-forest/80",
  },
  light_rain: {
    bg: "bg-gradient-to-br from-brand-light/20 to-brand-agri/10",
    ring: "ring-brand-agri/25",
    primary: "text-brand-agri",
  },
  rain: {
    bg: "bg-gradient-to-br from-brand-agri/20 to-brand-forest/10",
    ring: "ring-brand-forest/25",
    primary: "text-brand-forest",
  },
  storm: {
    bg: "bg-gradient-to-br from-brand-dark/15 to-brand-forest/10",
    ring: "ring-brand-dark/20",
    primary: "text-brand-dark",
    secondary: "text-brand-sun",
  },
  cold: {
    bg: "bg-gradient-to-br from-sky-100 to-brand-light/10",
    ring: "ring-sky-200",
    primary: "text-sky-600",
  },
};

export { weatherConditionLabel } from "@/lib/clima/weather-conditions";

export const WeatherIcon = ({
  condition,
  size = "md",
  emphasized = false,
  className,
}: WeatherIconProps) => {
  const s = sizeMap[size];
  const style = conditionStyles[condition];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full ring-1 ring-inset",
        s.box,
        style.bg,
        style.ring,
        emphasized && "shadow-sm",
        className,
      )}
      aria-hidden
    >
      {condition === "sunny" && (
        <>
          <Sun className={cn(s.icon, style.primary, "fill-brand-sun/25")} strokeWidth={2} />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(228_181_58/0.35)_0%,transparent_68%)]" />
        </>
      )}

      {condition === "partly_cloudy" && (
        <>
          <Sun
            className={cn(s.sun, style.primary, "absolute -right-0.5 -top-0.5 fill-brand-sun/30")}
            strokeWidth={2}
          />
          <CloudSun className={cn(s.icon, style.secondary ?? style.primary)} strokeWidth={2} />
        </>
      )}

      {condition === "cloudy" && <Cloud className={cn(s.icon, style.primary)} strokeWidth={2} />}

      {condition === "light_rain" && (
        <CloudDrizzle className={cn(s.icon, style.primary)} strokeWidth={2} />
      )}

      {condition === "rain" && <CloudRain className={cn(s.icon, style.primary)} strokeWidth={2} />}

      {condition === "storm" && (
        <>
          <CloudLightning className={cn(s.icon, style.primary)} strokeWidth={2} />
          <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand-sun" />
        </>
      )}

      {condition === "cold" && (
        <ThermometerSnowflake className={cn(s.icon, style.primary)} strokeWidth={2} />
      )}
    </div>
  );
};
