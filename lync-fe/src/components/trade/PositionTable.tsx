import type { Position } from "../../types/trade";
import { formatCurrency } from "../../utils/format";
import { formatPercentage } from "../../utils/probability";

interface PositionTableProps {
  positions: Position[];
  className?: string;
}

export function PositionTable({ positions, className = "" }: PositionTableProps) {
  if (positions.length === 0) {
    return (
      <div className={className}>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Positions</h3>
        <p className="text-sm text-muted-foreground">No open positions.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Positions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-muted-foreground">
              <th className="pb-2 pr-2">Market</th>
              <th className="pb-2 pr-2">Side</th>
              <th className="pb-2 pr-2">Shares</th>
              <th className="pb-2 pr-2">Avg Price</th>
              <th className="pb-2 pr-2">Value</th>
              <th className="pb-2">P/L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.id} className="border-b border-white/[0.06]">
                <td className="py-2 pr-2 text-white/95">{pos.marketTitle}</td>
                <td className={`py-2 pr-2 ${pos.side === "YES" ? "text-yes-muted" : "text-no-muted"}`}>
                  {pos.side}
                </td>
                <td className="py-2 pr-2 text-muted-foreground">{pos.shares}</td>
                <td className="py-2 pr-2 text-muted-foreground">
                  {formatPercentage(pos.avgPrice)}
                </td>
                <td className="py-2 pr-2 text-white/95">
                  {formatCurrency(pos.currentValue)}
                </td>
                <td
                  className={`py-2 ${pos.pnl >= 0 ? "text-yes-muted" : "text-no-muted"}`}
                >
                  {pos.pnl >= 0 ? "+" : ""}
                  {formatCurrency(pos.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
