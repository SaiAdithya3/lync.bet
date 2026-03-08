import { useEffect } from "react";
import { formatUnits } from "viem";
import { useWalletClient, useBalance } from "wagmi";
import { useWalletStore } from "../stores/walletStore";

/** Syncs wagmi account/balance to walletStore for components that use it */
export function useWagmiSync() {
  const { data: walletClient } = useWalletClient();
  const { data: balanceData } = useBalance({ address: walletClient?.account.address });
  const { setAddress, setBalance } = useWalletStore();

  useEffect(() => { 
    if (walletClient) {
      setAddress(walletClient.account.address);
      setBalance(balanceData?.value ? Number(formatUnits(balanceData.value, balanceData.decimals)) : 0);
    } else {
      setAddress(null);
      setBalance(0);
    }
  }, [walletClient, balanceData?.value, balanceData?.decimals, setAddress, setBalance]);
}
