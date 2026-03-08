export const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** PredictionMarket contract address (from env) */
export const PREDICTION_MARKET_ADDRESS = (import.meta.env.VITE_PREDICTION_MARKET_ADDRESS ?? "") as `0x${string}`;
export const hasPredictionMarketAddress = Boolean(import.meta.env.VITE_PREDICTION_MARKET_ADDRESS);
