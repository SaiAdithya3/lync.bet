import { useEffect, useState } from "react";
import { sepolia } from "wagmi/chains";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Modal } from "../ui/Modal";
import { useUIStore } from "../../stores/uiStore";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../utils/format";
import { marketService } from "../../services/marketService";

export function WalletModal() {
  const { openModal, setOpenModal } = useUIStore();
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [balance, setBalance] = useState<{ eth: number; usdc: number } | null>(null);

  const isOpen = openModal === "wallet";

  useEffect(() => {
    if (address && isOpen) {
      marketService.getBalance(address).then((b) =>
        setBalance(b ? { eth: b.ethFormatted, usdc: b.usdcFormatted } : null)
      );
    } else {
      setBalance(null);
    }
  }, [address, isOpen]);

  const handleDisconnect = () => {
    disconnect();
    setOpenModal(null);
  };

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    try {
      await connectAsync({ connector, chainId: sepolia.id });
      setOpenModal(null);
    } catch {
      // Keep modal open on error so user can retry or see error
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setOpenModal(null)}
      title="Connect Wallet"
      size="sm"
    >
      <div className="space-y-4">
        {isConnected && address ? (
          <>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-muted-foreground">Connected address</p>
              <p className="mt-1 font-mono text-sm text-white break-all">
                {address}
              </p>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">USDC balance</p>
                <p className="mt-1 text-lg font-semibold text-yes">
                  {balance ? formatCurrency(balance.usdc) : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">ETH (gas)</p>
                <p className="mt-1 text-sm text-white">
                  {balance ? formatCurrency(balance.eth) : "—"}
                </p>
              </div>
            </div>
            <Button variant="no" fullWidth onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Login or sign up by connecting your wallet. No email or password required.
            </p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="secondary"
                  fullWidth
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                >
                  {isPending ? "Connecting..." : connector.name}
                </Button>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-400">{error.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              If the wallet popup doesn&apos;t appear, check if your browser blocked it and allow popups for this site.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
