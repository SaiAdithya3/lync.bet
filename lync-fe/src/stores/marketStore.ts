import { create } from "zustand";
import type { Market } from "../types/market";

interface MarketState {
  markets: Market[];
  selectedMarketId: string | null;
  setMarkets: (markets: Market[]) => void;
  setSelectedMarket: (id: string | null) => void;
  updateMarketProbability: (marketId: string, yesProbability: number, noProbability: number) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  selectedMarketId: null,
  setMarkets: (markets) => set({ markets }),
  setSelectedMarket: (selectedMarketId) => set({ selectedMarketId }),
  updateMarketProbability: (marketId, yesProbability, noProbability) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.id === marketId ? { ...m, yesProbability, noProbability } : m
      ),
    })),
}));
