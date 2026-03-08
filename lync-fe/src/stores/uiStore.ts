import { create } from "zustand";

type ModalType = "trade" | "wallet" | "createMarket" | null;

interface UIState {
  openModal: ModalType;
  searchQuery: string;
  activeFilter: string;
  /** When set, TradeModal uses this outcome (from a multi-outcome market) for Yes/No prices */
  tradeOutcomeId: string | null;
  setOpenModal: (modal: ModalType) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: string) => void;
  setTradeOutcomeId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  openModal: null,
  searchQuery: "",
  activeFilter: "all",
  tradeOutcomeId: null,
  setOpenModal: (openModal) => set({ openModal }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setTradeOutcomeId: (tradeOutcomeId) => set({ tradeOutcomeId }),
}));
