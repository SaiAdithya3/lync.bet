import { Link } from "react-router-dom";
import type { Market } from "../../types/market";
import { formatCompactCurrency, formatPriceCents } from "../../utils/format";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ProbabilityBar } from "./ProbabilityBar";
import { useUIStore } from "../../stores/uiStore";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const { setOpenModal } = useUIStore();

  const handleTrade = (e: React.MouseEvent, _side: "YES" | "NO") => {
    e.preventDefault();
    e.stopPropagation();
    setOpenModal("trade");
  };

  return (
    <Link to={`/market/${market.id}`}>
      <Card className="flex h-full flex-col rounded-xl border-border/60 transition-colors hover:border-border hover:bg-white/[0.02]" padding="lg">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-white/95">
            {market.title}
          </h3>
          <Badge variant="muted" className="shrink-0 text-[11px]">{market.category}</Badge>
        </div>
        <ProbabilityBar
          yesProbability={market.yesProbability}
          noProbability={market.noProbability}
          className="mb-4"
        />
        <div className="flex gap-2">
          <Button
            variant="yes"
            size="sm"
            className="flex-1"
            onClick={(e) => handleTrade(e, "YES")}
          >
            Yes {formatPriceCents(market.yesProbability)}
          </Button>
          <Button
            variant="no"
            size="sm"
            className="flex-1"
            onClick={(e) => handleTrade(e, "NO")}
          >
            No {formatPriceCents(market.noProbability)}
          </Button>
        </div>
        <div className="mt-4 flex justify-between border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground">
          <span>Vol {formatCompactCurrency(market.volume)}</span>
          <span>{market.participants}</span>
        </div>
      </Card>
    </Link>
  );
}
