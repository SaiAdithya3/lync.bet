import { useEffect, useRef } from "react";
import { createChart, LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { useChartStore } from "../../stores/chartStore";

interface ProbabilityChartProps {
  height?: number;
  className?: string;
}

/** lightweight-charts requires strictly ascending time. Sort and dedupe by keeping last value per time. */
function normalizeChartData(
  data: { time: string; value: number }[]
): { time: string; value: number }[] {
  const valid = data.filter((d) => d.time != null && d.time !== "");
  if (valid.length === 0) return [];
  const toSortKey = (t: string) => {
    const n = Number(t);
    if (!Number.isNaN(n) && String(n) === t) return n;
    return new Date(t).getTime();
  };
  const sorted = [...valid].sort((a, b) => toSortKey(a.time) - toSortKey(b.time));
  const deduped: { time: string; value: number }[] = [];
  for (const d of sorted) {
    const last = deduped[deduped.length - 1];
    const sameTime = last && toSortKey(last.time) === toSortKey(d.time);
    if (sameTime) {
      last.value = d.value;
    } else {
      deduped.push({ time: d.time, value: d.value });
    }
  }
  return deduped;
}

export function ProbabilityChart({ height = 300, className = "" }: ProbabilityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { data } = useChartStore();

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      height,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#0048ff",
      lineWidth: 2,
      priceFormat: {
        type: "percent",
        precision: 0,
        minMove: 0.01,
      },
    }) as ISeriesApi<"Line">;

    const chartData = normalizeChartData(data).map((d) => ({
      time: d.time as string,
      value: d.value * 100,
    }));

    lineSeries.setData(chartData);
    chartRef.current = chart;
    seriesRef.current = lineSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, data]);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    const chartData = normalizeChartData(data).map((d) => ({
      time: d.time as string,
      value: d.value * 100,
    }));
    seriesRef.current.setData(chartData);
  }, [data]);

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground ${className}`}
        style={{ height }}
      >
        No chart data yet
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ height }} />
  );
}
