import { useMemo } from "react";
import { useMarketStore } from "../stores/marketStore";

export function useMarket(id: string | undefined) {
  const { markets } = useMarketStore();
  return useMemo(
    () => (id ? markets.find((m) => m.id === id) ?? null : null),
    [markets, id]
  );
}
