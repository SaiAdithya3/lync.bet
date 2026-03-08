export type TradeSide = "YES" | "NO";

export interface Trade {
  id: string;
  marketId: string;
  side: TradeSide;
  amount: number;
  price: number;
  outcome: "YES" | "NO";
  timestamp: string;
  userId?: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  side: TradeSide;
}

export interface Position {
  id: string;
  marketId: string;
  marketTitle: string;
  side: TradeSide;
  shares: number;
  avgPrice: number;
  currentValue: number;
  pnl: number;
}
