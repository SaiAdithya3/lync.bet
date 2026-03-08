import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useTradeStore } from "../stores/tradeStore";
import { marketService } from "../services/marketService";

export function usePositions() {
  const setPositions = useTradeStore((s) => s.setPositions);
  const { address } = useAccount();

  useEffect(() => {
    marketService.getPositions(address ?? null).then(setPositions);
  }, [address, setPositions]);
}
