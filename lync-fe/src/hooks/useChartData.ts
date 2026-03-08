import { useEffect } from "react";
import { useChartStore } from "../stores/chartStore";
import { marketService } from "../services/marketService";

export function useChartData(marketId: string | undefined) {
  const { setData, data } = useChartStore();

  useEffect(() => {
    if (!marketId) return;

    const load = async () => {
      const initial = await marketService.getChartData(marketId);
      setData(initial);
    };
    load();
  }, [marketId, setData]);

  return data;
}
