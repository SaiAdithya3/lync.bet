import { useEffect } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useWalletStore } from "../stores/walletStore";

/** Syncs wagmi account/balance to walletStore for components that use it */
export function useWagmiSync() {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { setAddress, setBalance } = useWalletStore();

  useEffect(() => {
    if (isConnected && address) {
      setAddress(address);
      const bal = balanceData?.value
        ? Number(formatUnits(balanceData.value, balanceData.decimals))
        : 0;
      setBalance(bal);
    } else {
      setAddress(null);
      setBalance(0);
    }
  }, [address, isConnected, balanceData?.value, balanceData?.decimals, setAddress, setBalance]);
}
