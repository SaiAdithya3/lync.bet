import { useEffect } from "react";
import { useTradeStore } from "../stores/tradeStore";
import { marketService } from "../services/marketService";

export function useOrderBook(marketId: string | undefined) {
  const setOrderBook = useTradeStore((s) => s.setOrderBook);

  useEffect(() => {
    if (!marketId) return;
    const entries = marketService.getOrderBook(marketId);
    setOrderBook(entries);
  }, [marketId, setOrderBook]);
}
