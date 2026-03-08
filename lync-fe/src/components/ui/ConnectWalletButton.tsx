import { useWalletStore } from "../../stores/walletStore";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "./Button";
import { formatCompactCurrency } from "../../utils/format";

export function ConnectWalletButton() {
  const { isConnected, address, balance, connect } = useWalletStore();
  const { setOpenModal } = useUIStore();

  const handleClick = () => {
    if (isConnected) {
      setOpenModal("wallet");
    } else {
      connect();
    }
  };

  if (isConnected) {
    return (
      <Button variant="secondary" size="sm" onClick={handleClick}>
        <span className="truncate max-w-[120px]">{address}</span>
        <span className="ml-2 text-muted-foreground">|</span>
        <span className="ml-2 text-muted-foreground">{formatCompactCurrency(balance)}</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleClick}>
        Login
      </Button>
      <Button variant="primary" size="sm" onClick={() => connect()}>
        Sign up
      </Button>
    </div>
  );
}
