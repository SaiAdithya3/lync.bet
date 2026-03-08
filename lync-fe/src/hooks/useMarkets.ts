import { useEffect } from "react";
import { useMarketStore } from "../stores/marketStore";
import { marketService } from "../services/marketService";

export function useMarkets(params?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { markets, setMarkets } = useMarketStore();

  useEffect(() => {
    const load = async () => {
      const { markets: data } = await marketService.getMarkets(params);
      setMarkets(data);
    };
    load();
  }, [setMarkets, params?.status, params?.category, params?.limit, params?.offset]);

  return markets;
}
