import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudRain, LineChart as LineChartIcon, Loader2 } from "lucide-react";
import { chartColors, chartTooltip } from "@/lib/farm-insights";

type RainPoint = { d: string; mm: number };
type TempPoint = { d: string; max: number; min: number };

type ClimaChartsProps = {
  rainData: RainPoint[];
  tempData: TempPoint[];
  isLoading: boolean;
};

const ChartLegend = ({ items }: { items: { color: string; label: string }[] }) => (
  <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

const EmptyChart = ({ message, icon: Icon }: { message: string; icon: typeof CloudRain }) => (
  <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 px-4 text-center">
    <Icon className="h-7 w-7 text-muted-foreground/40" aria-hidden />
    <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
  </div>
);

export const ClimaRainChart = ({ rainData, isLoading }: { rainData: RainPoint[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface/40">
        <Loader2 className="h-6 w-6 animate-spin text-brand-agri" />
      </div>
    );
  }

  if (rainData.length === 0) {
    return <EmptyChart message="Sem série de chuva prevista para esta coordenada." icon={CloudRain} />;
  }

  return (
    <>
      <div className="h-72 rounded-xl border border-border bg-surface/40 p-2">
        <ResponsiveContainer>
          <BarChart data={rainData}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="d" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              {...chartTooltip}
              contentStyle={{ ...chartTooltip.contentStyle, borderRadius: 12 }}
            />
            <Bar
              dataKey="mm"
              fill={chartColors.rain}
              radius={[4, 4, 0, 0]}
              name="Chuva (mm)"
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ color: chartColors.rain, label: "Precipitação diária (mm)" }]} />
    </>
  );
};

export const ClimaTempChart = ({ tempData, isLoading }: { tempData: TempPoint[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface/40">
        <Loader2 className="h-6 w-6 animate-spin text-brand-agri" />
      </div>
    );
  }

  if (tempData.length === 0) {
    return (
      <EmptyChart message="Sem série de temperatura prevista para esta coordenada." icon={LineChartIcon} />
    );
  }

  return (
    <>
      <div className="h-72 rounded-xl border border-border bg-surface/40 p-2">
        <ResponsiveContainer>
          <LineChart data={tempData}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="d" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              {...chartTooltip}
              contentStyle={{ ...chartTooltip.contentStyle, borderRadius: 12 }}
            />
            <Line
              type="monotone"
              dataKey="max"
              stroke={chartColors.temp}
              strokeWidth={2}
              dot={false}
              name="Máx (°C)"
            />
            <Line
              type="monotone"
              dataKey="min"
              stroke={chartColors.rain}
              strokeWidth={2}
              dot={false}
              name="Mín (°C)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { color: chartColors.temp, label: "Temperatura máxima" },
          { color: chartColors.rain, label: "Temperatura mínima" },
        ]}
      />
    </>
  );
};

export const ClimaCharts = ({ rainData, tempData, isLoading }: ClimaChartsProps) => (
  <div className="grid gap-4 lg:grid-cols-2">
    <ClimaRainChart rainData={rainData} isLoading={isLoading} />
    <ClimaTempChart tempData={tempData} isLoading={isLoading} />
  </div>
);
