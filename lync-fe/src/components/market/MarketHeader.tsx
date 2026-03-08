import type { Market } from "../../types/market";
import { formatCompactCurrency, formatPriceCents } from "../../utils/format";
import { timeRemaining } from "../../utils/time";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProbabilityBar } from "./ProbabilityBar";
import { useUIStore } from "../../stores/uiStore";

interface MarketHeaderProps {
  market: Market;
  /** Hide the single probability bar (e.g. when showing multiple outcomes below) */
  hideBar?: boolean;
}

export function MarketHeader({ market, hideBar = false }: MarketHeaderProps) {
  const { setOpenModal } = useUIStore();
  const hasOutcomes = market.outcomes && market.outcomes.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="muted" className="mb-2">
            {market.category}
          </Badge>
          <h1 className="text-xl font-semibold text-white/95 md:text-2xl">
            {market.title}
          </h1>
          {market.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {market.description}
            </p>
          ) : null}
        </div>
        {!hasOutcomes && (
          <Button variant="primary" onClick={() => setOpenModal("trade")}>
            Trade
          </Button>
        )}
      </div>
      {!hideBar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <ProbabilityBar
              yesProbability={market.yesProbability}
              noProbability={market.noProbability}
              showLabels={false}
              compact
            />
          </div>
          <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
            <span className="text-yes-muted">Yes {formatPriceCents(market.yesProbability)}</span>
            <span className="text-no-muted">No {formatPriceCents(market.noProbability)}</span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{formatCompactCurrency(market.volume)} Vol.</span>
        {!hasOutcomes && (
          <>
            <span>{formatCompactCurrency(market.liquidity)} Liq.</span>
            <span>{market.participants} participants</span>
          </>
        )}
        <span>Ends {timeRemaining(market.endDate)}</span>
      </div>
    </div>
  );
}
