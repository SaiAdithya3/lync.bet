import { useEffect } from "react";
import { useTradeStore } from "../stores/tradeStore";
import { marketService } from "../services/marketService";

export function usePositions() {
  const setPositions = useTradeStore((s) => s.setPositions);

  useEffect(() => {
    const positions = marketService.getPositions();
    setPositions(positions);
  }, [setPositions]);
}
