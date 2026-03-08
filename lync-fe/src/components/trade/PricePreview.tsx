import { formatCurrency } from "../../utils/format";

interface PricePreviewProps {
  amount: number;
  price: number;
  side: "YES" | "NO"; // used for future fee/outcome display
  potentialReturn?: number;
}

export function PricePreview({
  amount,
  price,
  potentialReturn,
}: PricePreviewProps) {
  const cost = amount * price;
  const displayReturn = potentialReturn ?? (amount > 0 ? amount : 0);

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
      {potentialReturn !== undefined && (
        <div className="flex justify-between text-muted-foreground">
          <span>Potential return</span>
          <span className="text-yes-muted">{formatCurrency(displayReturn)}</span>
        </div>
      )}
    </div>
  );
}
