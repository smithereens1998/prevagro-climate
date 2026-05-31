import { useDailyFullLatest } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const statusClass: Record<string, string> = {
  success: "border-primary/40 bg-primary/10 text-primary",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  partial: "border-warning/40 bg-warning/10 text-warning",
};

export const PipelineStatusBadge = () => {
  const { data, isError, isLoading } = useDailyFullLatest();

  if (isLoading) {
    return (
      <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        Pipeline…
      </span>
    );
  }

  if (isError || !data?.status) {
    return (
      <span
        className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
        title="Backend indisponível — exibindo dados locais"
      >
        API offline
      </span>
    );
  }

  const status = data.status.toLowerCase();
  const finished = data.finished_at
    ? new Date(data.finished_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <span
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium",
        statusClass[status] ?? "border-border bg-muted text-muted-foreground",
      )}
      title={finished ? `Última execução: ${finished}` : undefined}
    >
      Pipeline {data.status}
      {data.run_date ? ` · ${data.run_date}` : ""}
    </span>
  );
};
