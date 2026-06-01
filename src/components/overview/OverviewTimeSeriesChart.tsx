import { CloudRain, LineChart, Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricHint } from "@/components/overview/MetricHint";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chartColors, chartTooltip } from "@/lib/farm-insights";
import type { METRIC_HINTS } from "@/lib/overview/metric-hints";
import { cn } from "@/lib/utils";

type ClimatePoint = { m: string; temp: number; chuva: number };
type RiskPoint = { m: string; calor: number; agua: number };
type NdviPoint = { m: string; ndvi: number };

type OverviewTimeSeriesChartProps = {
  climateSeries: ClimatePoint[];
  riskSeries: RiskPoint[];
  ndviSeries: NdviPoint[];
  isClimateLoading: boolean;
  isRiskLoading: boolean;
  isNdviLoading: boolean;
  hints: {
    climate: (typeof METRIC_HINTS)[keyof typeof METRIC_HINTS];
    risk: (typeof METRIC_HINTS)[keyof typeof METRIC_HINTS];
    ndvi: (typeof METRIC_HINTS)[keyof typeof METRIC_HINTS];
  };
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
  <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface/40 px-4 text-center">
    <Icon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
    <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
  </div>
);

const LoadingChart = () => (
  <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-surface/40">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export const OverviewTimeSeriesChart = ({
  climateSeries,
  riskSeries,
  ndviSeries,
  isClimateLoading,
  isRiskLoading,
  isNdviLoading,
  hints,
}: OverviewTimeSeriesChartProps) => (
  <Tabs defaultValue="clima" className="w-full">
    <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/50 p-1">
      <TabsTrigger
        value="clima"
        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
      >
        Projeção climática
      </TabsTrigger>
      <TabsTrigger
        value="risco"
        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
      >
        Evolução de risco
      </TabsTrigger>
      <TabsTrigger
        value="ndvi"
        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
      >
        NDVI satelital
      </TabsTrigger>
    </TabsList>

    <TabsContent value="clima" className="mt-0">
      <div className="mb-3">
        <MetricHint
          hint={hints.climate}
          label={<span className="text-sm font-medium text-foreground">Próximos 30 dias</span>}
        />
      </div>
      {isClimateLoading ? (
        <LoadingChart />
      ) : climateSeries.length === 0 ? (
        <EmptyChart
          message="Sem previsão diária. Execute POST /pipeline/seasonal-forecast ou /pipeline/daily-full."
          icon={CloudRain}
        />
      ) : (
        <>
          <div className="h-72 rounded-xl border border-border bg-surface/40 p-2">
            <ResponsiveContainer>
              <AreaChart data={climateSeries}>
                <defs>
                  <linearGradient id="overview-temp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.temp} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.temp} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="overview-rain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.rain} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColors.rain} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="m" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="rain"
                  orientation="left"
                  stroke={chartColors.rain}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  stroke={chartColors.temp}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  {...chartTooltip}
                  contentStyle={{ ...chartTooltip.contentStyle, borderRadius: 12 }}
                />
                <Area
                  yAxisId="rain"
                  type="monotone"
                  dataKey="chuva"
                  stroke={chartColors.rain}
                  fill="url(#overview-rain)"
                  strokeWidth={2}
                  name="Chuva (mm)"
                />
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  stroke={chartColors.temp}
                  fill="url(#overview-temp)"
                  strokeWidth={2}
                  name="Temp (°C)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { color: chartColors.rain, label: "Chuva (mm) · eixo esquerdo" },
              { color: chartColors.temp, label: "Temperatura (°C) · eixo direito" },
            ]}
          />
        </>
      )}
    </TabsContent>

    <TabsContent value="risco" className="mt-0">
      <div className="mb-3">
        <MetricHint
          hint={hints.risk}
          label={<span className="text-sm font-medium text-foreground">Risco diário estimado</span>}
        />
      </div>
      {isRiskLoading ? (
        <LoadingChart />
      ) : riskSeries.length === 0 ? (
        <EmptyChart
          message="Sem série de risco. É necessária a previsão de 30 dias no pipeline."
          icon={LineChart}
        />
      ) : (
        <>
          <div className="h-72 rounded-xl border border-border bg-surface/40 p-2">
            <ResponsiveContainer>
              <ReLineChart data={riskSeries}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="m" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  {...chartTooltip}
                  contentStyle={{ ...chartTooltip.contentStyle, borderRadius: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="calor"
                  stroke={chartColors.riskHeat}
                  strokeWidth={2}
                  dot={{ fill: chartColors.riskHeat, r: 2 }}
                  name="Risco calor (/100)"
                />
                <Line
                  type="monotone"
                  dataKey="agua"
                  stroke={chartColors.riskWater}
                  strokeWidth={2}
                  dot={{ fill: chartColors.riskWater, r: 2 }}
                  name="Estresse hídrico (/100)"
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { color: chartColors.riskHeat, label: "Risco calor" },
              { color: chartColors.riskWater, label: "Estresse hídrico" },
            ]}
          />
        </>
      )}
    </TabsContent>

    <TabsContent value="ndvi" className="mt-0">
      <div className="mb-3">
        <MetricHint
          hint={hints.ndvi}
          label={<span className="text-sm font-medium text-foreground">Últimos 90 dias</span>}
        />
      </div>
      {isNdviLoading ? (
        <LoadingChart />
      ) : ndviSeries.length === 0 ? (
        <EmptyChart
          message="Sem histórico NDVI. Vincule um polígono AgroMonitoring à fazenda."
          icon={LineChart}
        />
      ) : (
        <>
          <div className="h-72 rounded-xl border border-border bg-surface/40 p-2">
            <ResponsiveContainer>
              <ReLineChart data={ndviSeries}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="m" stroke={chartColors.axis} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 1]}
                />
                <Tooltip
                  {...chartTooltip}
                  contentStyle={{ ...chartTooltip.contentStyle, borderRadius: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="ndvi"
                  stroke={chartColors.ndvi}
                  strokeWidth={2}
                  dot={{ fill: chartColors.ndvi, r: 2 }}
                  name="NDVI"
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend items={[{ color: chartColors.ndvi, label: "NDVI" }]} />
        </>
      )}
    </TabsContent>
  </Tabs>
);
