import type { OrderBookEntry } from "../../types/trade";
import { formatPercentage } from "../../utils/probability";

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  className?: string;
}

export function OrderBook({ bids, asks, className = "" }: OrderBookProps) {
  return (
    <div className={className}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Order Book</h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Price</span>
          <span>Size</span>
        </div>
        {asks.slice(0, 5).reverse().map((entry, i) => (
          <div key={`ask-${i}`} className="flex justify-between text-no-muted">
            <span>{formatPercentage(entry.price)}</span>
            <span>{entry.amount}</span>
          </div>
        ))}
        <div className="border-t border-white/[0.06] py-2 text-muted-foreground">
          Spread
        </div>
        {bids.slice(0, 5).map((entry, i) => (
          <div key={`bid-${i}`} className="flex justify-between text-yes-muted">
            <span>{formatPercentage(entry.price)}</span>
            <span>{entry.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
