import { create } from "zustand";
import type { Market } from "../types/market";

interface MarketState {
  markets: Market[];
  selectedMarketId: string | null;
  setMarkets: (markets: Market[]) => void;
  addMarket: (market: Market) => void;
  setSelectedMarket: (id: string | null) => void;
  updateMarketProbability: (marketId: string, yesProbability: number, noProbability: number) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  selectedMarketId: null,
  setMarkets: (markets) => set({ markets }),
  addMarket: (market) =>
    set((state) => {
      const exists = state.markets.some((m) => m.id === market.id);
      if (exists) {
        return {
          markets: state.markets.map((m) => (m.id === market.id ? market : m)),
        };
      }
      return { markets: [...state.markets, market] };
    }),
  setSelectedMarket: (selectedMarketId) => set({ selectedMarketId }),
  updateMarketProbability: (marketId, yesProbability, noProbability) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.id === marketId ? { ...m, yesProbability, noProbability } : m
      ),
    })),
}));
