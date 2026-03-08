import { useEffect } from "react";
import { useMarketStore } from "../stores/marketStore";
import { marketService } from "../services/marketService";

export function useMarkets() {
  const { markets, setMarkets } = useMarketStore();

  useEffect(() => {
    const load = async () => {
      const data = await marketService.getMarkets();
      setMarkets(data);
    };
    load();
  }, [setMarkets]);

  return markets;
}
