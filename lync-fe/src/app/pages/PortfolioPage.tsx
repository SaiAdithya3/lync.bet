import { useWalletStore } from "../../stores/walletStore";
import { useTradeStore } from "../../stores/tradeStore";
import { usePositions } from "../../hooks/usePositions";
import { formatCurrency } from "../../utils/format";
import { PositionTable } from "../../components/trade/PositionTable";
import { Card } from "../../components/ui/Card";
import { ConnectWalletButton } from "../../components/ui/ConnectWalletButton";

export function PortfolioPage() {
  usePositions();
  const { isConnected, balance } = useWalletStore();
  const { positions } = useTradeStore();

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-muted-foreground">
          Connect your wallet to view positions and balance.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="mt-1 text-muted-foreground">
          Your balance and open positions
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-sm font-medium text-muted-foreground">
            Available balance
          </h3>
          <p className="mt-2 text-3xl font-bold text-yes">
            {formatCurrency(balance)}
          </p>
        </Card>
      </div>
      <PositionTable positions={positions} />
    </div>
  );
}
