import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  subtitle?: string;
  variant?: "default" | "onDark";
  className?: string;
};

const sizeClass = {
  sm: { word: "text-sm", sub: "text-[10px]", icon: "h-7 w-7", leaf: "h-3.5 w-3.5" },
  md: { word: "text-base", sub: "text-[11px]", icon: "h-8 w-8", leaf: "h-4 w-4" },
  lg: { word: "text-lg", sub: "text-sm", icon: "h-11 w-11", leaf: "h-5 w-5" },
} as const;

export const BrandLogo = ({
  size = "md",
  showIcon = true,
  subtitle,
  variant = "default",
  className,
}: BrandLogoProps) => {
  const s = sizeClass[size];
  const onDark = variant === "onDark";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {showIcon && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            s.icon,
            onDark
              ? "border border-white/15 bg-white/10 text-brand-light"
              : "border border-brand-dark/20 bg-brand-dark/8 text-brand-dark",
          )}
        >
          <Leaf className={s.leaf} aria-hidden />
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <p className={cn("font-semibold tracking-tight", s.word)}>
          <span className={onDark ? "text-white" : "text-brand-dark"}>Prev</span>
          <span className="text-brand-light">agro</span>
        </p>
        {subtitle && (
          <p className={cn(onDark ? "text-white/65" : "text-muted-foreground", s.sub)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
