import { create } from "zustand";

interface WalletState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  setBalance: (balance: number) => void;
  setAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  balance: 0,
  isConnected: false,
  setBalance: (balance) => set({ balance }),
  setAddress: (address) => set({ address, isConnected: !!address }),
}));
