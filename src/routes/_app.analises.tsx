import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Brain, Sparkles, TrendingUp, AlertTriangle, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/analises")({
  head: () => ({ meta: [{ title: "Análises · Prevagro" }] }),
  component: AnalisesPage,
});

const TABS = ["Geral", "Clima", "Solo", "Vegetação", "Produtividade"];

function AnalisesPage() {
  const [tab, setTab] = useState("Geral");

  return (
    <>
      <PageHeader
        title="Central de Análises IA"
        description="Insights gerados por modelos preditivos sobre sua operação."
      />

      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface/60 p-1.5 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <RiskCard />
        <ProductivityCard />
        <SuitabilityCard />
      </div>

      <SectionCard
        title="Recomendação Estratégica IA"
        subtitle="Síntese das análises atuais"
        action={
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Sparkles className="h-4 w-4" /> Regenerar
          </Button>
        }
      >
        <div className="flex gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
            <p>
              Com base nos últimos 30 dias, a <strong>Fazenda São João</strong> apresenta risco
              climático <span className="text-warning font-medium">moderado</span>, com tendência
              de queda na umidade do solo nos talhões sul.
            </p>
            <p className="text-muted-foreground">
              Recomendamos antecipar a irrigação suplementar no Talhão 04, aplicar correção de
              potássio na área leste e monitorar previsão de geada para os próximos 7 dias. O
              modelo projeta um ganho de <strong className="text-primary">+8,2 sc/ha</strong> com
              estas intervenções.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {["Aumentar irrigação", "Aplicar K", "Plano anti-geada", "Replantio parcial"].map((t) => (
                <span key={t} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function RiskCard() {
  const score = 34;
  return (
    <SectionCard title="Análise de Risco IA" subtitle="Risco climático agregado">
      <div className="flex items-center gap-5">
        <RiskRing score={score} />
        <div>
          <p className="text-3xl font-semibold text-foreground">{score}<span className="text-sm text-muted-foreground">/100</span></p>
          <p className="text-sm text-warning font-medium">Risco moderado</p>
          <p className="mt-2 text-xs text-muted-foreground">Seca leve nos próximos 14 dias</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex justify-between"><span>Hídrico</span><span className="text-warning">Médio</span></li>
        <li className="flex justify-between"><span>Térmico</span><span className="text-primary">Baixo</span></li>
        <li className="flex justify-between"><span>Pragas</span><span className="text-primary">Baixo</span></li>
      </ul>
    </SectionCard>
  );
}

function ProductivityCard() {
  return (
    <SectionCard title="Análise de Produtividade IA" subtitle="Projeção da safra atual">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <p className="text-3xl font-semibold text-foreground">78,4 <span className="text-sm text-muted-foreground">sc/ha</span></p>
          <p className="text-sm text-primary font-medium">+8% vs safra anterior</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[72%] bg-gradient-to-r from-secondary to-primary" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Confiança do modelo: 92%</p>
    </SectionCard>
  );
}

function SuitabilityCard() {
  return (
    <SectionCard title="Aptidão de Cultura IA" subtitle="Top recomendações para Safra 25/26">
      {[
        { c: "Soja", v: 94, icon: "🌱" },
        { c: "Milho", v: 81, icon: "🌽" },
        { c: "Sorgo", v: 67, icon: "🌾" },
      ].map((r) => (
        <div key={r.c} className="mb-3 last:mb-0">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">{r.icon} {r.c}</span>
            <span className="text-primary font-medium">{r.v}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${r.v}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Sprout className="h-3.5 w-3.5 text-primary" /> Baseado em solo, clima e histórico
      </div>
    </SectionCard>
  );
}

function RiskRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} stroke="#ffffff14" strokeWidth="8" fill="none" />
      <circle
        cx="50" cy="50" r={r}
        stroke="#F4B400" strokeWidth="8" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
      />
    </svg>
  );
}
