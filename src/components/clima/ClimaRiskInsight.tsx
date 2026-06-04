import { Brain, CloudRain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRiskScoreVisual } from "@/lib/overview/metric-visuals";

type ClimaRiskInsightProps = {
  hasLlm: boolean;
  llmSummary?: string | null;
  llmAction?: string | null;
  modelLabel?: string;
  horizonText?: string | null;
  heatScore: number | null;
  waterScore: number | null;
  projectedRainMm?: number | null;
  dryDays?: number | null;
};

const ScoreChip = ({ label, score }: { label: string; score: number | null }) => {
  if (score == null) return null;
  const visual = getRiskScoreVisual(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
        visual.badgeClass,
      )}
    >
      {label}: {score}/100
    </span>
  );
};

export const ClimaRiskInsight = ({
  hasLlm,
  llmSummary,
  llmAction,
  modelLabel,
  horizonText,
  heatScore,
  waterScore,
  projectedRainMm,
  dryDays,
}: ClimaRiskInsightProps) => {
  if (hasLlm && llmSummary) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border border-l-4 border-l-brand-dark bg-gradient-to-r from-brand-dark/10 via-transparent to-transparent p-5 md:p-6">
        <div className="absolute right-4 top-4 opacity-15" aria-hidden>
          <Brain className="h-14 w-14 text-brand-dark" />
        </div>
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              IA · {modelLabel ?? "Gemini"}
            </span>
            <ScoreChip label="Calor" score={heatScore} />
            <ScoreChip label="Água" score={waterScore} />
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground md:text-base">{llmSummary}</p>
          {llmAction && <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{llmAction}</p>}
        </div>
      </div>
    );
  }

  if (horizonText) {
    const avgScore =
      heatScore != null && waterScore != null
        ? Math.round((heatScore + waterScore) / 2)
        : heatScore ?? waterScore;
    const visual = getRiskScoreVisual(avgScore);

    return (
      <div
        className={cn(
          "rounded-xl border border-l-4 p-5 md:p-6",
          visual.borderClass,
          visual.bgClass,
        )}
      >
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              visual.iconBgClass,
            )}
          >
            <CloudRain className={cn("h-5 w-5", visual.iconTextClass)} aria-hidden />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  visual.badgeClass,
                )}
              >
                Horizonte 30 dias · {visual.label}
              </span>
              <ScoreChip label="Calor" score={heatScore} />
              <ScoreChip label="Água" score={waterScore} />
            </div>
            <p className="text-sm leading-relaxed text-foreground md:text-base">{horizonText}</p>
            {(projectedRainMm != null || dryDays != null) && (
              <p className="text-sm text-muted-foreground">
                {projectedRainMm != null && (
                  <span>Chuva projetada: {Math.round(projectedRainMm)} mm</span>
                )}
                {projectedRainMm != null && dryDays != null && " · "}
                {dryDays != null && <span>Dias secos: {dryDays}</span>}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-dark/15 via-brand-light/10 to-transparent"
          aria-hidden
        />
        <Sparkles className="relative h-6 w-6 text-brand-agri" aria-hidden />
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Sem análise de risco disponível. Execute o pipeline ou clique em Atualizar agora.
      </p>
    </div>
  );
};
