import { useEffect } from "react";
import { useChartStore } from "../stores/chartStore";
import { marketService } from "../services/marketService";

export function useChartData(marketId: string | undefined) {
  const { setData, appendPoint, data } = useChartStore();

  useEffect(() => {
    if (!marketId) return;

    const load = async () => {
      const initial = await marketService.getChartData(marketId);
      setData(initial);
    };
    load();
  }, [marketId, setData]);

  useEffect(() => {
    if (!marketId || !data.length) return;

    const interval = setInterval(() => {
      const last = data[data.length - 1];
      const jitter = (Math.random() - 0.5) * 0.04;
      const newVal = Math.max(0.1, Math.min(0.9, last.value + jitter));
      const now = new Date();
      const timeStr = now.toISOString().slice(0, 10);
      appendPoint({ time: timeStr, value: newVal });
    }, 2000);

    return () => clearInterval(interval);
  }, [marketId, data, appendPoint]);

  return data;
}
