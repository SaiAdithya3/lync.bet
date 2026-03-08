import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useMarket } from "../../hooks/useMarket";
import { useMarketStore } from "../../stores/marketStore";
import { marketService } from "../../services/marketService";
import { useChartData } from "../../hooks/useChartData";
import { useOrderBook } from "../../hooks/useOrderBook";
import { usePositions } from "../../hooks/usePositions";
import { useTrade } from "../../hooks/useTrade";
import { useTradeStore } from "../../stores/tradeStore";
import { useUIStore } from "../../stores/uiStore";
import { MarketHeader } from "../../components/market/MarketHeader";
import { ProbabilityChart } from "../../components/charts/ProbabilityChart";
import { TradePanel } from "../../components/trade/TradePanel";
import { OrderBook } from "../../components/trade/OrderBook";
import { PositionTable } from "../../components/trade/PositionTable";
import { OutcomeRow } from "../../components/market/OutcomeRow";
import { Card } from "../../components/ui/Card";
import type { MarketOutcome } from "../../types/market";

export function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const market = useMarket(id);
  const { addMarket, setSelectedMarket } = useMarketStore();

  useEffect(() => {
    if (!id || market) return;
    marketService.getMarketById(id).then((m) => m && addMarket(m));
  }, [id, market, addMarket]);

  useChartData(id);
  useOrderBook(id);
  usePositions();
  const { executeTrade, loading: tradeLoading, error: tradeError } = useTrade(id);
  const { orderBook, positions } = useTradeStore();
  const { setOpenModal, setTradeOutcomeId } = useUIStore();

  const outcomes = market?.outcomes ?? [];
  const isMultiOutcome = outcomes.length > 0;
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(
    outcomes[0]?.id ?? null
  );
  const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId) ?? outcomes[0];

  const bids = orderBook.filter((e) => e.side === "YES");
  const asks = orderBook.filter((e) => e.side === "NO");
  const marketPositions = positions.filter((p) => p.marketId === id);

  const yesProbability = selectedOutcome?.yesProbability ?? market?.yesProbability ?? 0;
  const noProbability = selectedOutcome?.noProbability ?? market?.noProbability ?? 0;

  const handleTradeOutcome = (outcome: MarketOutcome) => {
    setSelectedMarket(market?.id ?? null);
    setSelectedOutcomeId(outcome.id);
    setTradeOutcomeId(outcome.id);
    setOpenModal("trade");
  };

  if (!market) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Market not found.
      </div>
    );
  }

  if (isMultiOutcome) {
    return (
      <div className="space-y-8">
        <MarketHeader market={market} hideBar />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Outcomes
            </h2>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <OutcomeRow
                  key={outcome.id}
                  outcome={outcome}
                  isSelected={selectedOutcomeId === outcome.id}
                  onSelect={() => setSelectedOutcomeId(outcome.id)}
                  onTradeYes={() => handleTradeOutcome(outcome)}
                  onTradeNo={() => handleTradeOutcome(outcome)}
                />
              ))}
            </div>
            <Card className="border-border/60 bg-card" padding="lg">
              <PositionTable positions={marketPositions} />
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="border-border/60 bg-card" padding="lg">
              {selectedOutcome && (
                <>
                  <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Trade · {selectedOutcome.label}
                  </p>
                  <TradePanel
                    yesProbability={selectedOutcome.yesProbability}
                    noProbability={selectedOutcome.noProbability}
                    onTrade={executeTrade}
                    loading={tradeLoading}
                    error={tradeError}
                  />
                </>
              )}
            </Card>
            <Card className="border-border/60 bg-card" padding="lg">
              <OrderBook bids={bids} asks={asks} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MarketHeader market={market} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 bg-card" padding="none">
            <ProbabilityChart
              height={320}
              className="px-5 py-4"
              yesProbability={yesProbability}
              noProbability={noProbability}
            />
          </Card>
          <div className="block lg:hidden">
            <TradePanel
              yesProbability={yesProbability}
              noProbability={noProbability}
              onTrade={executeTrade}
              loading={tradeLoading}
              error={tradeError}
            />
          </div>
          <Card className="border-border/60 bg-card" padding="lg">
            <PositionTable positions={marketPositions} />
          </Card>
        </div>
        <div className="space-y-6">
          <div className="hidden lg:block">
            <TradePanel
              yesProbability={yesProbability}
              noProbability={noProbability}
              onTrade={executeTrade}
              loading={tradeLoading}
              error={tradeError}
            />
          </div>
          <Card className="border-border/60 bg-card" padding="lg">
            <OrderBook bids={bids} asks={asks} />
          </Card>
        </div>
      </div>
    </div>
  );
}
