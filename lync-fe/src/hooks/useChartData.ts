import { useEffect, useRef } from "react";
import { useChartStore } from "../stores/chartStore";
import { marketService } from "../services/marketService";

const POLL_INTERVAL = 10_000; // 10 seconds

export function useChartData(marketId: string | undefined) {
  const { setData, appendPoint, data } = useChartStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!marketId) return;

    // Initial load
    const load = async () => {
      const initial = await marketService.getChartData(marketId);
      setData(initial);
    };
    load();

    // Poll for price updates
    intervalRef.current = setInterval(async () => {
      const price = await marketService.getMarketPrice(marketId);
      if (price) {
        appendPoint({
          time: String(Math.floor(Date.now() / 1000)),
          value: price.yesPrice / 100,
        });
      }
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [marketId, setData, appendPoint]);

  return data;
}
