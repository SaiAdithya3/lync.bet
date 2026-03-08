import { useState, useCallback } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { orderService } from "../services/orderService";
import { marketService } from "../services/marketService";
import { useTradeStore } from "../stores/tradeStore";

export function useTrade(marketId: string | undefined) {
  const { address } = useAccount();
  const { mutateAsync: signTypedDataAsync } = useSignTypedData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setOrderBook = useTradeStore((s) => s.setOrderBook);
  const setPositions = useTradeStore((s) => s.setPositions);

  const executeTrade = useCallback(
    async (side: "YES" | "NO", amountUsd: number) => {
      if (!marketId || !address) {
        setError("Connect wallet to trade");
        return;
      }
      const id = parseInt(marketId, 10);
      if (Number.isNaN(id)) return;

      setLoading(true);
      setError(null);
      try {
        const cost = orderService.usdToMicroUnits(amountUsd);
        const quote = await orderService.getQuote({
          market_id: id,
          token: side,
          cost,
          user_address: address,
        });

        const domain = quote.signing_payload.domain as {
          name: string;
          version: string;
          chain_id?: number;
          chainId?: number;
          verifying_contract?: string;
          verifyingContract?: string;
        };
        const signature = await signTypedDataAsync({
          domain: {
            name: domain.name,
            version: domain.version,
            chainId: domain.chainId ?? domain.chain_id ?? 0,
            verifyingContract: (domain.verifyingContract ?? domain.verifying_contract ?? "") as `0x${string}`,
          },
          types: quote.signing_payload.types as Record<
            string,
            Array<{ name: string; type: string }>
          >,
          primaryType: quote.signing_payload.primary_type,
          message: quote.signing_payload.message as Record<string, unknown>,
        });

        await orderService.submitOrder({
          market_id: id,
          token: side,
          shares: quote.order.shares,
          cost: quote.order.cost,
          price: quote.order.price_cents,
          nonce: quote.order.nonce,
          deadline: quote.order.deadline,
          signature,
          user_address: address,
        });

        // Refresh orderbook and positions
        const [ob, positions] = await Promise.all([
          marketService.getOrderBook(marketId),
          marketService.getPositions(address),
        ]);
        setOrderBook(ob);
        setPositions(positions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Trade failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [
      marketId,
      address,
      signTypedDataAsync,
      setOrderBook,
      setPositions,
    ]
  );

  return { executeTrade, loading, error, setError };
}
