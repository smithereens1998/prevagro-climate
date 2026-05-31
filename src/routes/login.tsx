import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Coffee, Eye, EyeOff, Leaf, Loader2, Sprout, Wheat } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_20%_100%,oklch(0.42_0.12_138/0.55),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_90%_10%,oklch(0.38_0.08_75/0.35),transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(165deg,oklch(0.14_0.02_240)_0%,oklch(0.2_0.04_138)_45%,oklch(0.16_0.02_240)_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(105deg, transparent, transparent 48px, oklch(0.96 0.01 138) 48px, oklch(0.96 0.01 138) 49px)",
            }}
          />

          <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                <Leaf className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">Prevagro</p>
                <p className="text-sm text-muted-foreground">Inteligência climática no campo</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
                  Soja, café e clima em uma só visão
                </h1>
                <p className="mt-4 max-w-lg text-base text-muted-foreground">
                  Monitore risco, NDVI e previsões para tomar decisão na safra — do Cerrado ao sul
                  de Minas.
                </p>
              </div>

              <ul className="grid max-w-md gap-4 sm:grid-cols-3">
                {[
                  { icon: Wheat, label: "Soja", tone: "text-primary" },
                  { icon: Coffee, label: "Café", tone: "text-warning" },
                  { icon: Sprout, label: "Safra", tone: "text-secondary" },
                ].map(({ icon: Icon, label, tone }) => (
                  <li
                    key={label}
                    className="rounded-xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur-sm"
                  >
                    <Icon className={cn("h-5 w-5", tone)} aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium">{label}</p>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground/80">
              Dados agro integrados · Mapbox · APIs de monitoramento
            </p>
          </div>
        </aside>

        <main className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.72_0.17_138/0.12),transparent_60%)] lg:hidden" />

          <div className="relative mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Leaf className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">Prevagro</p>
                <p className="text-xs text-muted-foreground">Entrar na plataforma</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use o e-mail da sua conta para acessar o painel da fazenda.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
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
        </main>
      </div>
    </div>
  );
}
