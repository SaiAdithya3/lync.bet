import { API_BASE } from "../config/api";

// USDC/shares use 6 decimals
const SCALE = 1e6;

export interface QuoteOrder {
  market_id: number;
  outcome: number;
  to: string;
  shares: number;
  cost: number;
  deadline: number;
  nonce: number;
  price_cents: number;
}

export interface Eip712Domain {
  name: string;
  version: string;
  chain_id: number;
  verifying_contract: string;
}

export interface Eip712TypedData {
  types: Record<string, unknown>;
  primary_type: string;
  domain: Eip712Domain;
  message: Record<string, unknown>;
}

export interface QuoteResponse {
  order: QuoteOrder;
  order_digest: string;
  signing_payload: Eip712TypedData;
}

export interface SubmitOrderRequest {
  market_id: number;
  token: "YES" | "NO";
  shares: number;
  cost: number;
  price: number;
  nonce: number;
  deadline: number;
  signature: string;
  user_address: string;
  recipient_address?: string;
}

export interface SubmitOrderResponse {
  orderId: number;
  status: string;
  txHash?: string;
  shares: number;
  cost: number;
  price: number;
}

export interface UserOrder {
  id: number;
  market_id: number;
  token: string;
  shares: number;
  cost: number;
  price: number;
  status: string;
  created_at: string | null;
}

export const orderService = {
  async getQuote(params: {
    market_id: number;
    token: "YES" | "NO";
    cost: number;
    user_address: string;
    recipient_address?: string;
  }): Promise<QuoteResponse> {
    const res = await fetch(`${API_BASE}/api/orders/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        market_id: params.market_id,
        token: params.token,
        cost: params.cost,
        user_address: params.user_address,
        recipient_address: params.recipient_address,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Quote failed: ${res.status}`);
    }
    return res.json();
  },

  async submitOrder(req: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Order failed: ${res.status}`);
    }
    return res.json();
  },

  async getUserOrders(
    address: string,
    marketId?: number
  ): Promise<{ orders: UserOrder[]; totalCost: number; totalShares: number }> {
    const url = marketId
      ? `${API_BASE}/api/orders/user/${encodeURIComponent(address)}?market_id=${marketId}`
      : `${API_BASE}/api/orders/user/${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) return { orders: [], totalCost: 0, totalShares: 0 };
    const data = (await res.json()) as {
      orders: UserOrder[];
      totalCost: number;
      totalShares: number;
    };
    return {
      orders: data.orders ?? [],
      totalCost: data.totalCost ?? 0,
      totalShares: data.totalShares ?? 0,
    };
  },

  async cancelOrder(orderId: number): Promise<{ orderId: number; status: string }> {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Cancel failed: ${res.status}`);
    }
    return res.json();
  },

  /** Convert USD amount to USDC 6-decimal units */
  usdToMicroUnits(usd: number): number {
    return Math.floor(usd * SCALE);
  },

  /** Convert USDC 6-decimal units to USD */
  microUnitsToUsd(units: number): number {
    return units / SCALE;
  },
};
