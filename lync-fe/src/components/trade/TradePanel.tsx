import { useState } from "react";
import type { TradeSide } from "../../types/trade";
import { formatPriceCents } from "../../utils/format";
import { SideSelector } from "./SideSelector";
import { AmountInput } from "./AmountInput";
import { PricePreview } from "./PricePreview";
import { SubmitTradeButton } from "./SubmitTradeButton";
import { Card } from "../ui/Card";

interface TradePanelProps {
  yesProbability: number;
  noProbability: number;
  onTrade?: (side: TradeSide, amount: number) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function TradePanel({
  yesProbability,
  noProbability,
  onTrade,
  loading = false,
  error,
}: TradePanelProps) {
  const [side, setSide] = useState<TradeSide>("YES");
  const [amount, setAmount] = useState("");
  const price = side === "YES" ? yesProbability : noProbability;
  const amountNum = parseFloat(amount) || 0;
  // amountNum = USD to spend; potential return = shares (1 winning share = $1)
  const potentialReturn = amountNum > 0 && price > 0 ? amountNum / price : undefined;

  const handleSubmit = async () => {
    if (amountNum <= 0) return;
    try {
      await onTrade?.(side, amountNum);
      setAmount("");
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Place order</h3>
      <SideSelector
        value={side}
        onChange={setSide}
        yesPriceCents={formatPriceCents(yesProbability)}
        noPriceCents={formatPriceCents(noProbability)}
        filled
      />
      <div className="mt-4">
        <AmountInput value={amount} onChange={setAmount} />
      </div>
      <div className="mt-4">
        <PricePreview
          amount={amountNum}
          price={price}
          side={side}
          potentialReturn={potentialReturn}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Orders use USDC. Ensure you have USDC on Sepolia and have approved the market contract to spend it.
      </p>
      <div className="mt-4">
        <SubmitTradeButton
          side={side}
          amount={amountNum}
          priceCents={formatPriceCents(price)}
          onClick={handleSubmit}
          loading={loading}
        />
      </div>
    </Card>
  );
}
