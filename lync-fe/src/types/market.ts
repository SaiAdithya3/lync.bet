/** A single Yes/No outcome within a multi-outcome market (e.g. "March 7", "March 14") */
export interface MarketOutcome {
  id: string;
  label: string;
  yesProbability: number;
  noProbability: number;
  volume: number;
  endDate: string;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  yesProbability: number;
  noProbability: number;
  volume: number;
  liquidity: number;
  participants: number;
  endDate: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
  /** If set, this market has multiple Yes/No outcomes (e.g. different resolution dates) */
  outcomes?: MarketOutcome[];
}

export interface MarketSummary {
  id: string;
  title: string;
  yesProbability: number;
  volume: number;
  participants: number;
  category: string;
}
