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
  onTrade?: (side: TradeSide, amount: number, price: number) => void;
}

export function TradePanel({
  yesProbability,
  noProbability,
  onTrade,
}: TradePanelProps) {
  const [side, setSide] = useState<TradeSide>("YES");
  const [amount, setAmount] = useState("");
  const price = side === "YES" ? yesProbability : noProbability;
  const amountNum = parseFloat(amount) || 0;
  const potentialReturn = amountNum > 0 ? amountNum : undefined;

  const handleSubmit = () => {
    if (amountNum <= 0) return;
    onTrade?.(side, amountNum, price);
    setAmount("");
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
      <div className="mt-4">
        <SubmitTradeButton
          side={side}
          amount={amountNum}
          priceCents={formatPriceCents(price)}
          onClick={handleSubmit}
        />
      </div>
    </Card>
  );
}
