import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  label,
  value,
  unit,
  delta,
  icon: Icon,
  tone = "primary",
}: {
  label: React.ReactNode;
  value: string;
  unit?: string;
  delta?: number;
  icon: LucideIcon;
  tone?: "primary" | "warning" | "danger" | "muted";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted",
  }[tone];

  const positive = (delta ?? 0) >= 0;

  return (
    <div className="panel rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium",
              positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel rounded-lg p-4 md:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {title && (
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h1>
        )}
        {description && (
          <p className={cn(!title && "text-base text-foreground/90", title && "mt-1", "max-w-3xl text-sm text-muted-foreground")}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
