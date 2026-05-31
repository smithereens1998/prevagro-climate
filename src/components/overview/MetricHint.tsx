import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricHint as MetricHintType } from "@/lib/overview/metric-hints";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MetricHintProps = {
  hint: MetricHintType;
  label: React.ReactNode;
  className?: string;
  iconClassName?: string;
};

export const MetricHint = ({ hint, label, className, iconClassName }: MetricHintProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          aria-label={`Ajuda: ${hint.title}`}
        >
          {label}
          <HelpCircle className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[280px] border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md"
      >
        <p className="text-xs font-semibold text-foreground">{hint.title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint.description}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-foreground">{hint.interpretation}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">Fonte: {hint.source}</p>
      </TooltipContent>
    </Tooltip>
);
