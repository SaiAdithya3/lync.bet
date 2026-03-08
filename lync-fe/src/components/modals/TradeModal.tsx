import { Modal } from "../ui/Modal";
import { TradePanel } from "../trade/TradePanel";
import { useUIStore } from "../../stores/uiStore";
import { useMarketStore } from "../../stores/marketStore";

export function TradeModal() {
  const { openModal, setOpenModal, tradeOutcomeId, setTradeOutcomeId } = useUIStore();
  const { markets, selectedMarketId } = useMarketStore();

  const market = selectedMarketId
    ? markets.find((m) => m.id === selectedMarketId)
    : markets[0];

  const outcome = market?.outcomes?.find((o) => o.id === tradeOutcomeId);
  const yesProbability = outcome?.yesProbability ?? market?.yesProbability ?? 0;
  const noProbability = outcome?.noProbability ?? market?.noProbability ?? 0;

  const isOpen = openModal === "trade";

  const handleClose = () => {
    setOpenModal(null);
    setTradeOutcomeId(null);
  };

  if (!market) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={outcome ? `Trade · ${outcome.label}` : "Place trade"}
      size="md"
    >
      <TradePanel
        yesProbability={yesProbability}
        noProbability={noProbability}
      />
    </Modal>
  );
}
