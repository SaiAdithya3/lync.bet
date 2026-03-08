import { create } from "zustand";

interface WalletState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  connect: (address?: string) => void;
  disconnect: () => void;
  setBalance: (balance: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  balance: 1000,
  isConnected: false,
  connect: (address) =>
    set({
      isConnected: true,
      address: address ?? "0x1234...5678",
      balance: 1000,
    }),
  disconnect: () =>
    set({ isConnected: false, address: null }),
  setBalance: (balance) => set({ balance }),
}));
