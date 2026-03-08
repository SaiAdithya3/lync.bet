import { create } from "zustand";
import type { Trade, OrderBookEntry, Position } from "../types/trade";

interface TradeState {
  trades: Trade[];
  orderBook: OrderBookEntry[];
  positions: Position[];
  setTrades: (trades: Trade[]) => void;
  setOrderBook: (entries: OrderBookEntry[]) => void;
  setPositions: (positions: Position[]) => void;
  addTrade: (trade: Trade) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  orderBook: [],
  positions: [],
  setTrades: (trades) => set({ trades }),
  setOrderBook: (orderBook) => set({ orderBook }),
  setPositions: (positions) => set({ positions }),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
}));
