import { cn } from "@/lib/utils";

/** Stylized satellite + heatmap visual built with SVG. */
export function SatelliteMap({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <svg viewBox="0 0 800 450" className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="hot" cx="0.7" cy="0.35" r="0.4">
            <stop offset="0%" stopColor="#FF4D4F" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#F4B400" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6BE234" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="warm" cx="0.3" cy="0.6" r="0.45">
            <stop offset="0%" stopColor="#F4B400" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6BE234" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cool" cx="0.15" cy="0.25" r="0.4">
            <stop offset="0%" stopColor="#6BE234" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3FAE2A" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="#FFFFFF" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
          <linearGradient id="terrain" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a2418" />
            <stop offset="50%" stopColor="#0e3a24" />
            <stop offset="100%" stopColor="#082017" />
          </linearGradient>
        </defs>

        <rect width="800" height="450" fill="url(#terrain)" />
        <rect width="800" height="450" fill="url(#grid)" />

        {/* river */}
        <path
          d="M0,260 C120,240 180,310 280,290 C390,268 460,330 560,310 C660,292 720,340 800,320"
          stroke="#3a8fd1"
          strokeOpacity="0.5"
          strokeWidth="6"
          fill="none"
        />

        {/* field polygons */}
        <g stroke="#6BE234" strokeOpacity="0.6" strokeWidth="1.5" fill="none">
          <polygon points="80,80 280,70 320,200 100,220" />
          <polygon points="320,200 540,180 560,330 340,340" />
          <polygon points="560,180 740,170 740,310 580,320" />
          <polygon points="100,250 320,260 300,400 110,380" />
        </g>

        {/* heatmap blobs */}
        <rect width="800" height="450" fill="url(#hot)" />
        <rect width="800" height="450" fill="url(#warm)" />
        <rect width="800" height="450" fill="url(#cool)" />

        {/* markers */}
        {!compact && (
          <g>
            {[
              { x: 220, y: 150, c: "#6BE234" },
              { x: 470, y: 240, c: "#F4B400" },
              { x: 640, y: 230, c: "#FF4D4F" },
              { x: 200, y: 340, c: "#6BE234" },
            ].map((m, i) => (
              <g key={i}>
                <circle cx={m.x} cy={m.y} r="14" fill={m.c} fillOpacity="0.2" />
                <circle cx={m.x} cy={m.y} r="6" fill={m.c} />
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Risco</span>
        <span className="h-2 w-16 rounded-full bg-gradient-to-r from-primary via-warning to-destructive" />
        <span className="text-muted-foreground">Baixo</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-muted-foreground">Alto</span>
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1 rounded-md border border-border bg-background p-1">
        {["+", "−", "3D"].map((s) => (
          <button
            key={s}
            className="h-7 w-7 rounded text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
