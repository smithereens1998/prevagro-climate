import { Brain, Droplets, Beaker, CloudRain, Sparkles } from "lucide-react";
import type { LlmPrediction } from "@/lib/api/types";
import type { UiRecommendation, UiStrategicInsight } from "@/lib/api/adapters";
import { cn } from "@/lib/utils";

const recIcons = {
  primary: Droplets,
  warning: Beaker,
  danger: CloudRain,
} as const;

const recBorderClass = {
  primary: "border-l-primary",
  warning: "border-l-amber-500",
  danger: "border-l-red-500",
} as const;

const tagSeverityClass = (tag: string) => {
  const lower = tag.toLowerCase();
  if (lower.includes("crítico") || lower.includes("critico") || lower.includes("alta")) {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (lower.includes("atenção") || lower.includes("atencao") || lower.includes("média") || lower.includes("media")) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted/50 text-muted-foreground";
};

type AiDiagnosisCardProps = {
  hasLlm: boolean;
  prediction?: LlmPrediction;
  insight: UiStrategicInsight | null;
  recommendations: UiRecommendation[];
  onGenerate?: () => void;
  isGenerating?: boolean;
};

export const AiDiagnosisCard = ({
  hasLlm,
  prediction,
  insight,
  recommendations,
  onGenerate,
  isGenerating,
}: AiDiagnosisCardProps) => (
  <div className="space-y-6">
    <section className="relative overflow-hidden rounded-xl border border-border">
      {!hasLlm ? (
        <div className="flex flex-col items-center gap-4 border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-dark/20 via-brand-light/10 to-transparent"
              aria-hidden
            />
            <Sparkles className="relative h-7 w-7 text-brand-dark" aria-hidden />
          </div>
          <div className="max-w-md space-y-1">
            <p className="text-sm font-medium text-foreground">Diagnóstico inteligente</p>
            <p className="text-sm text-muted-foreground">
              Gere uma análise com IA a partir dos dados monitorados da fazenda — calor, chuva e estresse hídrico.
            </p>
          </div>
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="rounded-lg border border-brand-dark/25 bg-brand-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
              aria-label="Gerar diagnóstico com IA"
            >
              {isGenerating ? "Gerando…" : "Gerar diagnóstico"}
            </button>
          )}
        </div>
      ) : (
        <div className="relative border-l-4 border-l-brand-dark bg-gradient-to-r from-brand-dark/10 via-transparent to-transparent p-5 md:p-6">
          <div className="absolute right-4 top-4 opacity-20" aria-hidden>
            <Brain className="h-16 w-16 text-brand-dark" />
          </div>
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                IA · Gemini
              </span>
              {prediction?.metadata?.prediction_id != null && (
                <span className="text-xs text-muted-foreground">
                  #{prediction.metadata.prediction_id}
                  {prediction.metadata.prompt_version ? ` · ${prediction.metadata.prompt_version}` : ""}
                </span>
              )}
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground md:text-base">{insight?.summary}</p>
            {insight?.action && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{insight.action}</p>
            )}
            {insight?.tags.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {insight.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      tagSeverityClass(tag),
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>

    <section>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ações sugeridas</h3>
          <p className="text-xs text-muted-foreground">
            {hasLlm && recommendations.length > 0
              ? "Prioridades operacionais para os próximos dias"
              : "Disponível após gerar diagnóstico"}
          </p>
        </div>
        {hasLlm && recommendations.length > 0 && (
          <span className="text-xs text-muted-foreground">{recommendations.length} itens</span>
        )}
      </header>

      {!hasLlm || recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 px-4 py-5 text-sm text-muted-foreground">
          Sem ações sugeridas até que exista um diagnóstico para esta fazenda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((rec) => {
            const Icon = recIcons[rec.tone];
            return (
              <div
                key={rec.title}
                className={cn(
                  "rounded-xl border border-border border-l-4 bg-surface/80 p-4",
                  recBorderClass[rec.tone],
                )}
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rec.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  </div>
);
