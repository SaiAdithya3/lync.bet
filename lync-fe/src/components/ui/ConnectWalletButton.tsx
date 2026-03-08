import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "./Button";
import { formatCompactCurrency } from "../../utils/format";
import { marketService } from "../../services/marketService";

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const { setOpenModal } = useUIStore();

  useEffect(() => {
    if (address) {
      marketService.getBalance(address).then((b) =>
        setUsdcBalance(b ? b.usdcFormatted : null)
      );
    } else {
      setUsdcBalance(null);
    }
  }, [address]);

  const handleClick = () => {
    setOpenModal("wallet");
  };

  if (isConnected && address) {
    return (
      <Button variant="secondary" size="sm" onClick={handleClick}>
        <span className="truncate max-w-[120px]">{address.slice(0, 6)}...{address.slice(-4)}</span>
        <span className="ml-2 text-muted-foreground">|</span>
        <span className="ml-2 text-muted-foreground">
          {usdcBalance !== null ? formatCompactCurrency(usdcBalance) : "—"}
        </span>
      </Button>
    );
  }

  return (
    <Button variant="primary" size="sm" onClick={handleClick}>
      Connect Wallet
    </Button>
  );
}
