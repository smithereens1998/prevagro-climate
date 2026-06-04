import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Coffee, Eye, EyeOff, Loader2, Sprout, Wheat } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { redirectIfAuthenticated } from "@/lib/auth/guard";
import { useAuth } from "@/lib/auth/auth-context";
import { SEED_USER_EMAIL } from "@/lib/auth/credentials";
import { AuthError } from "@/lib/auth/types";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: () => {
    redirectIfAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "Entrar · Prevagro" },
      {
        name: "description",
        content: "Acesse a plataforma de inteligência climática para o agronegócio brasileiro.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const [email, setEmail] = useState(SEED_USER_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const target = redirect && redirect.startsWith("/") && redirect !== "/login" ? redirect : "/";
      navigate({ to: target });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Erro ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <aside
          className="brand-gradient-soft brand-field-pattern relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col"
          aria-hidden="true"
        >
          <div className="brand-sidebar-header px-10 py-8 xl:px-14">
            <BrandLogo size="lg" variant="onDark" subtitle="Inteligência climática no campo" />
          </div>

          <div className="absolute right-10 top-32 h-20 w-20 rounded-full bg-brand-sun/25 blur-2xl" />
          <div className="absolute bottom-24 left-8 h-32 w-32 rounded-full bg-brand-light/20 blur-3xl" />

          <div className="relative z-10 flex flex-1 flex-col justify-between p-10 pt-6 xl:p-14 xl:pt-8">
            <div className="space-y-8">
              <div>
                <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-brand-dark xl:text-4xl">
                  Soja, café e clima em uma só visão
                </h1>
                <p className="mt-4 max-w-lg text-base text-muted-foreground">
                  Monitore risco, NDVI e previsões para tomar decisão na safra — do Cerrado ao sul
                  de Minas.
                </p>
              </div>

              <ul className="grid max-w-md gap-4 sm:grid-cols-3">
                {[
                  { icon: Wheat, label: "Soja", tone: "text-brand-agri" },
                  { icon: Coffee, label: "Café", tone: "text-brand-sun" },
                  { icon: Sprout, label: "Safra", tone: "text-brand-forest" },
                ].map(({ icon: Icon, label, tone }) => (
                  <li
                    key={label}
                    className="rounded-xl border border-brand-agri/20 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm"
                  >
                    <Icon className={cn("h-5 w-5", tone)} aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-brand-dark">{label}</p>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              Dados agro integrados · Mapbox · APIs de monitoramento
            </p>
          </div>
        </aside>

        <main className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgb(119_168_59/0.12),transparent_60%)] lg:hidden" />

          <div className="relative mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <BrandLogo size="md" subtitle="Entrar na plataforma" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-brand-dark/8">
              <div className="brand-sidebar-header px-6 py-4 sm:px-8">
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Bem-vindo de volta
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Use o e-mail da sua conta para acessar o painel da fazenda.
                </p>
              </div>

              <div className="p-6 sm:p-8">
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                    aria-invalid={Boolean(error)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="pr-10"
                      aria-invalid={Boolean(error)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onClick={handleTogglePassword}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              {import.meta.env.DEV && (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Desenvolvimento: usuário do seed{" "}
                  <span className="font-mono text-foreground/80">{SEED_USER_EMAIL}</span>
                </p>
              )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
