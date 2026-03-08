import type { MarketOutcome } from "../../types/market";
import { formatCompactCurrency, formatPriceCents } from "../../utils/format";
import { formatPercentage } from "../../utils/probability";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

interface OutcomeRowProps {
  outcome: MarketOutcome;
  isSelected?: boolean;
  onSelect: () => void;
  onTradeYes: () => void;
  onTradeNo: () => void;
}

export function OutcomeRow({
  outcome,
  isSelected,
  onSelect,
  onTradeYes,
  onTradeNo,
}: OutcomeRowProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:gap-4",
        isSelected ? "border-primary-500/50 bg-white/[0.03]" : "border-border/60 bg-card hover:border-border"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="font-medium text-white/95">{outcome.label}</span>
        <span className="text-sm text-muted-foreground">
          {formatPercentage(outcome.yesProbability)} · {formatCompactCurrency(outcome.volume)} Vol.
        </span>
      </button>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="yesFilled"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTradeYes();
          }}
        >
          Buy Yes {formatPriceCents(outcome.yesProbability)}
        </Button>
        <Button
          variant="noFilled"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTradeNo();
          }}
        >
          Buy No {formatPriceCents(outcome.noProbability)}
        </Button>
      </div>
    </div>
  );
}
