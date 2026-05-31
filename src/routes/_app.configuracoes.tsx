import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Camera, Bell, Shield, Plug, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Prevagro" }] }),
  component: ConfigPage,
});

const TABS = [
  { id: "perfil", label: "Perfil" },
  { id: "fazenda", label: "Fazenda" },
  { id: "notificacoes", label: "Notificações" },
  { id: "integracoes", label: "Integrações" },
  { id: "seguranca", label: "Segurança" },
];

function ConfigPage() {
  const [tab, setTab] = useState("perfil");

  return (
    <>
      <PageHeader title="Configurações" description="Personalize sua conta, fazenda e integrações." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-1.5 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg border px-4 py-2 text-left text-sm transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "perfil" && <ProfileTab />}
          {tab === "fazenda" && <FazendaTab />}
          {tab === "notificacoes" && <NotificationsTab />}
          {tab === "integracoes" && <IntegrationsTab />}
          {tab === "seguranca" && <SecurityTab />}
        </div>
      </div>
    </>
  );
}

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        {...p}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function ProfileTab() {
  return (
    <SectionCard title="Perfil" subtitle="Suas informações pessoais">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xl font-semibold text-foreground">
          JS
        </div>
        <Button variant="outline" size="sm"><Camera className="h-4 w-4" /> Trocar foto</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome" defaultValue="João Silva" />
        <Field label="Email" type="email" defaultValue="joao@fazendasaojoao.com.br" />
        <Field label="Telefone" defaultValue="+55 11 98765-4321" />
        <Field label="Cargo" defaultValue="Produtor Rural" />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar alterações</Button>
      </div>
    </SectionCard>
  );
}

function FazendaTab() {
  return (
    <SectionCard title="Fazenda" subtitle="Dados da propriedade">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da Fazenda" defaultValue="Fazenda São João" />
        <Field label="Área Total (ha)" defaultValue="1248" />
        <Field label="Estado" defaultValue="Mato Grosso" />
        <Field label="Município" defaultValue="Sorriso" />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" /> Coordenadas: -12.5454, -55.7212
      </div>
    </SectionCard>
  );
}

function NotificationsTab() {
  const items = [
    { l: "Alertas climáticos críticos", d: "Seca, geada, tempestades" },
    { l: "Recomendações da IA", d: "Sugestões diárias" },
    { l: "Relatórios semanais", d: "Resumo enviado às segundas" },
    { l: "Atualizações de produto", d: "Novos recursos Prevagro" },
  ];
  return (
    <SectionCard title="Notificações" subtitle="Como você quer ser avisado">
      <Bell className="hidden" />
      {items.map((it) => (
        <div key={it.l} className="flex items-center justify-between border-b border-border py-3 last:border-0">
          <div>
            <p className="text-sm font-medium text-foreground">{it.l}</p>
            <p className="text-xs text-muted-foreground">{it.d}</p>
          </div>
          <Toggle defaultOn />
        </div>
      ))}
    </SectionCard>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-md transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function IntegrationsTab() {
  const items = [
    { n: "Sentinel Hub", s: "Imagens satelitais", on: true },
    { n: "INMET", s: "Estações meteorológicas", on: true },
    { n: "John Deere Ops", s: "Maquinário", on: false },
    { n: "WhatsApp Business", s: "Alertas via WhatsApp", on: false },
  ];
  return (
    <SectionCard title="Integrações" subtitle="Conecte fontes de dados">
      {items.map((i) => (
        <div key={i.n} className="flex items-center justify-between border-b border-border py-4 last:border-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary">
              <Plug className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{i.n}</p>
              <p className="text-xs text-muted-foreground">{i.s}</p>
            </div>
          </div>
          <Button variant={i.on ? "outline" : "default"} size="sm">
            {i.on ? "Conectado" : "Conectar"}
          </Button>
        </div>
      ))}
    </SectionCard>
  );
}

function SecurityTab() {
  return (
    <SectionCard title="Segurança" subtitle="Proteção da conta">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Autenticação em 2 fatores</p>
              <p className="text-xs text-muted-foreground">Aumente a segurança da sua conta</p>
            </div>
          </div>
          <Button size="sm">Ativar</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Senha atual" type="password" placeholder="••••••••" />
          <Field label="Nova senha" type="password" placeholder="••••••••" />
        </div>
        <div className="flex justify-end">
          <Button>Atualizar senha</Button>
        </div>
      </div>
    </SectionCard>
  );
}
