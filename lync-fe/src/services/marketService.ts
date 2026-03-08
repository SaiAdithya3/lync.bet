import type { Market } from "../types/market";
import type { OrderBookEntry } from "../types/trade";
import type { Position } from "../types/trade";
import type { ChartDataPoint } from "../stores/chartStore";

import marketsJson from "../data/mockMarkets.json";
import chartDataJson from "../data/mockChartData.json";
import orderBookJson from "../data/mockOrderBook.json";
import positionsJson from "../data/mockPositions.json";

const markets = marketsJson as Market[];
const defaultChartData = chartDataJson as ChartDataPoint[];
const defaultOrderBook = orderBookJson as {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
};
const defaultPositions = positionsJson as Position[];

export const marketService = {
  async getMarkets(): Promise<Market[]> {
    return Promise.resolve([...markets]);
  },

  async getMarketById(id: string): Promise<Market | null> {
    return Promise.resolve(markets.find((m) => m.id === id) ?? null);
  },

  async getChartData(_marketId: string): Promise<ChartDataPoint[]> {
    return Promise.resolve([...defaultChartData]);
  },

  getOrderBook(_marketId: string): OrderBookEntry[] {
    return [...defaultOrderBook.bids, ...defaultOrderBook.asks];
  },

  getPositions(): Position[] {
    return [...defaultPositions];
  },
};
