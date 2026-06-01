import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, Shield, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { getSessionInitials } from "@/lib/auth/session";
import { useFarm } from "@/lib/farm/farm-context";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { useUpdateCoordinateMutation } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";

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
  const { session, logout } = useAuth();
  const initials = getSessionInitials(session);
  const displayName = session?.email?.split("@")[0] ?? "Usuário";

  return (
    <SectionCard title="Conta" subtitle="Sessão ativa e informações de acesso">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xl font-semibold text-foreground">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium capitalize text-foreground">{displayName}</p>
          <p className="text-sm text-muted-foreground">{session?.email ?? "—"}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email" type="email" value={session?.email ?? ""} readOnly />
        <Field label="Nome" defaultValue={displayName} placeholder="Nome de exibição" />
        <Field label="Telefone" placeholder="+55 11 98765-4321" />
        <Field label="Cargo" placeholder="Produtor Rural" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">Cancelar</Button>
          <Button>Salvar alterações</Button>
        </div>
      </div>
    </SectionCard>
  );
}

function FazendaTab() {
  const { farms, selectedFarm, selectFarm, refetchFarms } = useFarm();
  const updateFarm = useUpdateCoordinateMutation();
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!selectedFarm) return;
    setName(selectedFarm.name);
    setLatitude(String(selectedFarm.latitude));
    setLongitude(String(selectedFarm.longitude));
    setError(null);
    setSaved(false);
  }, [selectedFarm]);

  if (farms.length === 0) {
    return (
      <SectionCard title="Fazenda" subtitle="Nenhuma propriedade cadastrada">
        <p className="mb-4 text-sm text-muted-foreground">
          Cadastre uma fazenda para vincular coordenadas e polígonos ao monitoramento.
        </p>
        <Button asChild>
          <Link to="/fazendas/nova">Cadastrar fazenda</Link>
        </Button>
      </SectionCard>
    );
  }

  const handleSaveFarm = async () => {
    if (!selectedFarm) return;
    setError(null);
    setSaved(false);

    const lat = Number(latitude.replace(",", "."));
    const lon = Number(longitude.replace(",", "."));

    if (!name.trim()) {
      setError("Informe o nome da fazenda.");
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Latitude e longitude devem ser números válidos.");
      return;
    }

    try {
      const result = await updateFarm.mutateAsync({
        coordinateId: selectedFarm.id,
        payload: { name: name.trim(), latitude: lat, longitude: lon },
      });
      selectFarm(result.coordinate);
      refetchFarms();
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Não foi possível salvar a fazenda.",
      );
    }
  };

  return (
    <SectionCard title="Fazenda ativa" subtitle="Tenant selecionado no header">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da Fazenda" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="ID interno" defaultValue={selectedFarm ? String(selectedFarm.id) : ""} readOnly />
        <Field label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" />
        <Field
          label="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          inputMode="decimal"
        />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
        Coordenadas atuais:{" "}
        {selectedFarm
          ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude, 6)
          : "—"}
      </div>
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-3 text-sm text-primary" role="status">
          Fazenda atualizada com sucesso.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={handleSaveFarm} disabled={updateFarm.isPending}>
          {updateFarm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar fazenda
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/fazendas">Gerenciar fazendas</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/fazendas/nova">Nova fazenda</Link>
        </Button>
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
  const { session, logout } = useAuth();

  return (
    <SectionCard title="Segurança" subtitle="Proteção da conta">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Conta conectada</p>
          <p className="mt-1 text-sm font-medium text-foreground">{session?.email ?? "—"}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
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
