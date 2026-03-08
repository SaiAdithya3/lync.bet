import { Modal } from "../ui/Modal";
import { useUIStore } from "../../stores/uiStore";
import { useWalletStore } from "../../stores/walletStore";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../utils/format";

export function WalletModal() {
  const { openModal, setOpenModal } = useUIStore();
  const { address, balance, disconnect, connect } = useWalletStore();

  const isOpen = openModal === "wallet";

  const handleDisconnect = () => {
    disconnect();
    setOpenModal(null);
  };

  const handleConnect = () => {
    connect();
    setOpenModal(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setOpenModal(null)}
      title="Wallet"
      size="sm"
    >
      <div className="space-y-4">
        {address ? (
          <>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-muted-foreground">Connected address</p>
              <p className="mt-1 font-mono text-sm text-white break-all">
                {address}
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="mt-1 text-lg font-semibold text-yes">
                {formatCurrency(balance)}
              </p>
            </div>
            <Button variant="no" fullWidth onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to trade and view your portfolio.
            </p>
            <Button variant="primary" fullWidth onClick={handleConnect}>
              Connect wallet
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
