import { formatCurrency } from "../../utils/format";

interface PricePreviewProps {
  /** Amount in USD (cost to spend) */
  amount: number;
  /** Price per share (0–1, e.g. 0.5 = 50¢) */
  price: number;
  side: "YES" | "NO"; // used for future fee/outcome display
  potentialReturn?: number;
}

export function PricePreview({
  amount,
  price,
  potentialReturn,
}: PricePreviewProps) {
  // amount = USD to spend, cost = same, shares = amount/price, potential return = shares (1 share = $1 if win)
  const cost = amount;
  const shares = price > 0 ? amount / price : 0;
  const displayReturn = potentialReturn ?? (shares > 0 ? shares : 0);

  return (
    <div className="space-y-1.5 rounded-lg bg-white/[0.04] p-3 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Avg price</span>
        <span className="text-white/95">{(price * 100).toFixed(1)}¢</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Cost</span>
        <span className="text-white/95">{formatCurrency(cost)}</span>
      </div>
      {amount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Shares</span>
          <span className="text-white/95">{shares.toFixed(2)}</span>
        </div>
      )}
      {potentialReturn !== undefined && (
        <div className="flex justify-between text-muted-foreground">
          <span>Potential return</span>
          <span className="text-yes-muted">{formatCurrency(displayReturn)}</span>
        </div>
      )}
    </div>
  );
}
