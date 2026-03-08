# Frontend — Process Specification

## Overview

A Polymarket-style prediction market UI built with Next.js. Users browse markets, trade YES/NO shares, track their portfolio, and create new markets. All trading is gasless for the user (EIP-712 signature only; the backend submits on-chain transactions).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Wallet | RainbowKit + wagmi v2 |
| State | React Query (TanStack Query) for server state, Zustand for UI state |
| Charts | Lightweight Charts (TradingView) or Recharts |
| HTTP | Axios or native fetch with React Query |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Date | date-fns |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js App Router                          │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Pages   │  │   Hooks   │  │   Store   │  │  Wallet   │  │
│  │ /        │  │ useMarkets│  │ Zustand   │  │ wagmi     │  │
│  │ /market  │  │ useOrders │  │ (UI only) │  │ RainbowKit│  │
│  │ /create  │  │ usePortf. │  │           │  │           │  │
│  │ /profile │  │ useLeader │  │           │  │ EIP-712   │  │
│  └──────────┘  └─────┬─────┘  └───────────┘  └─────┬─────┘  │
│                      │                              │        │
│                      ▼                              ▼        │
│              ┌──────────────────────────────────────────┐    │
│              │          API Client (lib/api.ts)          │    │
│              │  GET /api/markets, POST /api/orders, ...  │    │
│              └─────────────────┬────────────────────────┘    │
└────────────────────────────────┼─────────────────────────────┘
                                 │ REST
                                 ▼
                    ┌─────────────────────────┐
                    │  Backend (Rust / Axum)   │
                    │  localhost:3001          │
                    └─────────────────────────┘
```

---

## Pages & Routes

### 1. Homepage — `/`

The landing page. Shows trending markets, category filters, and a search bar.

```
┌─────────────────────────────────────────────────────────────┐
│  Logo                            [Search]  [Connect Wallet] │
├─────────────────────────────────────────────────────────────┤
│  [All] [Crypto] [Politics] [Sports] [Tech] [Entertainment]  │
├─────────────────────────────────────────────────────────────┤
│  Trending                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Will BTC hit $100k by Dec 2026?                        │ │
│  │ YES 72¢  ███████████░░░░  NO 28¢                       │ │
│  │ $2.4M volume · 156 traders · Resolves Dec 31           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Will ETH reach $10k by June 2026?                      │ │
│  │ YES 35¢  █████░░░░░░░░░░  NO 65¢                       │ │
│  │ $890K volume · 42 traders · Resolves Jun 30             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ...                                                        │
│  [Load More]                                                │
├─────────────────────────────────────────────────────────────┤
│  Recently Resolved                                          │
│  ┌──────────────────────────────────────┐                   │
│  │ Did X launch feature Y?  ✓ YES won  │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:**

| What | Endpoint | Params |
|------|----------|--------|
| Trending markets | `GET /api/markets/trending` | `limit=10` |
| Open markets list | `GET /api/markets` | `status=open&limit=20&offset=0` |
| Resolved markets | `GET /api/markets` | `status=resolved&limit=5` |
| Category filter | `GET /api/markets/categories` | — |
| Search | `GET /api/markets/search` | `q=bitcoin&limit=10` |
| Category browse | `GET /api/markets` | `status=open&category=crypto` |

**Polling:** Price polling every 5s via `GET /api/markets/:id/price` for visible market cards, or re-fetch the list on a 15s interval.

---

### 2. Market Detail — `/market/[id]`

The full market page with price chart, trade panel, orderbook, and activity feed.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back   Will Bitcoin hit $100k by December 31, 2026?      │
│  Created by 0x7a2...  ·  Resolves Dec 31, 2026              │
│  Category: Crypto  ·  Status: Open                          │
├──────────────────────────────┬──────────────────────────────┤
│  Price Chart                 │  Trade Panel                 │
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │    /\    /\            │  │  │  [YES 72¢]   [NO 28¢]  │  │
│  │   /  \  /  \    /\    │  │  │                        │  │
│  │  /    \/    \  /  \   │  │  │  Amount                │  │
│  │ /            \/    \  │  │  │  ┌──────────────┐      │  │
│  │/                    \ │  │  │  │ $10.00       │ USDC  │  │
│  └────────────────────────┘  │  │  └──────────────┘      │  │
│                              │  │                        │  │
│  YES: 72¢ (+2.1% 24h)       │  │  You'll receive:       │  │
│  Volume: $2.4M               │  │  13.88 YES shares      │  │
│  Traders: 156                │  │  @ 72¢ per share       │  │
│                              │  │                        │  │
│  ┌────────────────────────┐  │  │  Potential payout:     │  │
│  │  Orderbook             │  │  │  $13.88 if YES wins    │  │
│  │  YES bids   NO bids    │  │  │  Profit: +$3.88       │  │
│  │  72¢ 500   28¢ 300     │  │  │                        │  │
│  │  70¢ 200   30¢ 150     │  │  │  [Buy YES for $10.00]  │  │
│  │  68¢ 100   32¢ 80      │  │  │                        │  │
│  └────────────────────────┘  │  │  ─────────────────     │  │
│                              │  │  Your Position          │  │
│  ┌────────────────────────┐  │  │  10 YES @ avg 68¢      │  │
│  │  Market Stats          │  │  │  Current: $7.20        │  │
│  │  Total volume: $2.4M   │  │  │  P&L: +$0.40 (+5.9%)  │  │
│  │  YES holders: 89       │  │  │                        │  │
│  │  NO holders: 67        │  │  │  [Redeem] (if resolved)│  │
│  └────────────────────────┘  │  └────────────────────────┘  │
├──────────────────────────────┴──────────────────────────────┤
│  Activity Feed                                              │
│  0x3f2... bought 500 YES @ 72¢           · 2 min ago        │
│  0xab1... bought 200 NO  @ 28¢           · 5 min ago        │
│  0xc44... bought 1000 YES @ 71¢          · 12 min ago       │
│  0x9e3... bought 300 NO  @ 30¢           · 1 hour ago       │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:**

| What | Endpoint | Params |
|------|----------|--------|
| Market detail + chart + trades | `GET /api/markets/:id` | — |
| Live price (polling) | `GET /api/markets/:id/price` | — |
| Orderbook depth | `GET /api/orders/:market_id` | — |
| Activity feed | `GET /api/markets/:id/activity` | — |
| Market positions stats | `GET /api/markets/:id/positions` | — |
| User's position (if connected) | `GET /api/portfolio/:address` | — |
| User's orders in this market | `GET /api/orders/user/:address` | `market_id=X` |

**Trade flow (user interaction):**

```
1. User enters USDC amount (e.g. $10)
2. Frontend calls POST /api/orders/quote
   → Backend returns: shares, price, EIP-712 signing payload
3. Frontend shows: "13.88 YES shares @ 72¢, potential payout $13.88"
4. User clicks "Buy YES for $10.00"
5. Frontend calls wallet.signTypedData(signingPayload)
   → MetaMask popup: user signs (no gas!)
6. Frontend calls POST /api/orders with signature
   → Backend: stores order → calls fillOrder on-chain
   → Returns: { orderId, status: "filled", txHash }
7. Frontend shows success toast with Etherscan link
8. UI re-fetches portfolio and price
```

**Chart data:** The `priceHistory` array from `GET /api/markets/:id` contains `{ yesPrice, noPrice, volume24h, timestamp }` objects. Feed these to TradingView Lightweight Charts as a line/area chart.

---

### 3. Create Market — `/create`

Form for creating a new prediction market. Anyone with a connected wallet can create.

```
┌─────────────────────────────────────────────────────────────┐
│  Create a New Market                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Question *                                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Will Bitcoin hit $100k by December 31, 2026?          │  │
│  └───────────────────────────────────────────────────────┘  │
│  Must be a yes/no question with a clear resolution date     │
│                                                             │
│  Category                                                   │
│  ┌──────────────────┐                                       │
│  │ Crypto        ▼  │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  Resolution Date *                                          │
│  ┌──────────────────┐                                       │
│  │ 2026-12-31       │                                       │
│  └──────────────────┘                                       │
│  Must be in the future                                      │
│                                                             │
│  Preview                                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Will Bitcoin hit $100k by December 31, 2026?          │  │
│  │ YES 50¢  ████████░░░░░░░░  NO 50¢                     │  │
│  │ Category: Crypto · Resolves Dec 31, 2026              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Create Market]  (Requires wallet connection)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:**

| What | Endpoint | Params |
|------|----------|--------|
| Category list | `GET /api/markets/categories` | — |
| Create market | `POST /api/markets` | `{ question, category, resolution_date, creator_address }` |

**Create flow:**

```
1. User fills in question, category, resolution date
2. Frontend validates: non-empty question, future date
3. User clicks "Create Market"
4. Frontend requires wallet connection (for creator_address)
5. Frontend calls POST /api/markets
   → Backend: hashes question, inserts DB, calls createMarket on-chain
   → Returns: { marketId, question, questionHash, txHash, status }
6. Frontend shows success + redirects to /market/[marketId]
```

---

### 4. Portfolio — `/portfolio`

Requires wallet connection. Shows the user's positions, PnL, trade history, and redeemable winnings.

```
┌─────────────────────────────────────────────────────────────┐
│  Portfolio                              Connected: 0x7a2... │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Summary                                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ Invested  │  │ Current   │  │ Total P&L │               │
│  │ $150.00   │  │ $172.50   │  │ +$22.50   │               │
│  │           │  │           │  │ +15.0%    │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│                                                             │
│  Active Positions                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Will BTC hit $100k?                                    │ │
│  │ 10 YES shares · avg 68¢ · now 72¢                      │ │
│  │ Cost: $6.80 · Value: $7.20 · P&L: +$0.40 (+5.9%)      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Will ETH reach $10k?                                   │ │
│  │ 20 NO shares · avg 60¢ · now 65¢                       │ │
│  │ Cost: $12.00 · Value: $13.00 · P&L: +$1.00 (+8.3%)    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Redeemable Winnings                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Did X happen? → YES won!                               │ │
│  │ 50 shares → $50.00 USDC · Profit: $15.00               │ │
│  │ [Redeem Winnings]                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Open Orders                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Market #3 · 100 YES @ 55¢ · pending · [Cancel]         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Trade History                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Mar 7 · Bought 10 YES @ 68¢ · BTC $100k? · $6.80      │ │
│  │ Mar 5 · Bought 20 NO  @ 60¢ · ETH $10k?  · $12.00     │ │
│  │ Mar 3 · Bought 50 YES @ 70¢ · Did X?     · $35.00     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:**

| What | Endpoint | Params |
|------|----------|--------|
| Positions + PnL + open orders | `GET /api/portfolio/:address` | — |
| Trade history | `GET /api/portfolio/:address/history` | — |
| Redeemable winnings | `GET /api/portfolio/:address/redemption-status` | — |
| Cancel order | `DELETE /api/orders/:id/cancel` | — |

**Redeem flow:**

```
1. Frontend shows redeemable markets from /redemption-status
2. User clicks "Redeem Winnings"
3. Frontend calls redeemWinning(marketId, shares) directly on contract via wagmi
   (This is a user-initiated on-chain tx — user pays gas for redemption)
4. User confirms in MetaMask
5. Frontend waits for tx confirmation
6. Re-fetch portfolio
```

---

### 5. Leaderboard — `/leaderboard`

Top traders ranked by volume, profit, or number of trades.

```
┌─────────────────────────────────────────────────────────────┐
│  Leaderboard                                                │
│  [Volume] [Profit] [Trades]                                 │
├─────────────────────────────────────────────────────────────┤
│  #  Address         Volume      Profit     Trades  Markets  │
│  1  0x7a2...efb4    $52,400     +$8,200    142     12       │
│  2  0x3f2...a021    $41,800     +$5,100    98      9        │
│  3  0xab1...c309    $38,200     +$4,800    87      11       │
│  4  0x9e3...2a17    $29,500     +$3,200    65      8        │
│  5  0xc44...f912    $22,100     +$2,900    51      7        │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

**Data needed:**

| What | Endpoint | Params |
|------|----------|--------|
| Leaderboard data | `GET /api/leaderboard` | `sort=volume&limit=20` |

---

## Complete API Endpoint Reference

All endpoints the frontend calls, grouped by page:

### Markets

| Method | Endpoint | Used on | Description |
|--------|----------|---------|-------------|
| GET | `/api/markets` | Homepage | List markets (paginated, filterable by status + category) |
| GET | `/api/markets/trending` | Homepage | Markets ranked by volume |
| GET | `/api/markets/categories` | Homepage, Create | Distinct categories with counts |
| GET | `/api/markets/search?q=` | Homepage (search) | Full-text search on questions |
| POST | `/api/markets` | Create page | Create a new market |
| GET | `/api/markets/:id` | Market detail | Full detail: meta + orderbook + chart data + recent trades |
| GET | `/api/markets/:id/price` | Market detail (poll) | Lightweight price for polling (every 5s) |
| GET | `/api/markets/:id/activity` | Market detail | Activity feed (recent trades) |
| GET | `/api/markets/:id/positions` | Market detail | Position distribution (YES/NO holders, share counts) |

### Trading

| Method | Endpoint | Used on | Description |
|--------|----------|---------|-------------|
| POST | `/api/orders/quote` | Market detail (trade panel) | Get EIP-712 payload: price, shares, signing data |
| POST | `/api/orders` | Market detail (trade panel) | Submit signed order → backend fills on-chain |
| GET | `/api/orders/:market_id` | Market detail (orderbook) | Aggregated orderbook for a market |
| GET | `/api/orders/user/:address` | Portfolio | All user orders (optionally filtered by market) |
| DELETE | `/api/orders/:id/cancel` | Portfolio | Cancel a pending order |

### Portfolio

| Method | Endpoint | Used on | Description |
|--------|----------|---------|-------------|
| GET | `/api/portfolio/:address` | Portfolio | Positions + PnL + open orders |
| GET | `/api/portfolio/:address/history` | Portfolio | Trade history with price + tx links |
| GET | `/api/portfolio/:address/redemption-status` | Portfolio | Redeemable winnings from resolved markets |

### Leaderboard

| Method | Endpoint | Used on | Description |
|--------|----------|---------|-------------|
| GET | `/api/leaderboard` | Leaderboard | Top traders by volume/profit/trades |

### System

| Method | Endpoint | Used on | Description |
|--------|----------|---------|-------------|
| GET | `/health` | — | Backend liveness check |
| GET | `/api/actions/user/:address` | (internal) | Pending actions for a user |

---

## API Response Shapes

### Market Card (list / trending)

```json
{
  "marketId": 0,
  "question": "Will BTC hit $100k by Dec 2026?",
  "category": "crypto",
  "yesPrice": 72,
  "noPrice": 28,
  "totalVolume": 2400000000,
  "tradeCount": 156,
  "resolutionDate": "2026-12-31T00:00:00Z",
  "status": "open",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

### Market Detail

```json
{
  "marketId": 0,
  "question": "Will BTC hit $100k by Dec 2026?",
  "category": "crypto",
  "creator": "0x7a2...",
  "yesTokenAddress": "0xabc...",
  "noTokenAddress": "0xdef...",
  "yesPrice": 72,
  "noPrice": 28,
  "lastPrice": 71,
  "totalVolume": 2400000000,
  "resolutionDate": "2026-12-31T00:00:00Z",
  "status": "open",
  "outcome": null,
  "createdAt": "2026-01-15T10:00:00Z",
  "orderbook": {
    "marketId": 0,
    "bids": [{ "price": 72, "shares": 500000000, "orders": 3 }],
    "noBids": [{ "price": 28, "shares": 300000000, "orders": 2 }],
    "lastPrice": 71,
    "yesPrice": 72,
    "noPrice": 28
  },
  "priceHistory": [
    { "yesPrice": 50, "noPrice": 50, "volume24h": 0, "timestamp": "2026-01-15T10:00:00Z" },
    { "yesPrice": 55, "noPrice": 45, "volume24h": 100000, "timestamp": "2026-01-16T10:00:00Z" }
  ],
  "recentTrades": [
    { "buyerAddress": "0x3f2...", "token": "YES", "shares": 500000000, "cost": 360000000, "createdAt": "...", "txHash": "0x..." }
  ]
}
```

### Quote Response

```json
{
  "order": {
    "marketId": 0,
    "outcome": 1,
    "to": "0x7a2...",
    "shares": 13888888,
    "cost": 10000000,
    "deadline": 1741500000,
    "nonce": 0,
    "priceCents": 72
  },
  "orderDigest": "0xabc123...",
  "signingPayload": {
    "types": { "EIP712Domain": [...], "Order": [...] },
    "primaryType": "Order",
    "domain": { "name": "PredictionMarket", "version": "1", "chainId": 11155111, "verifyingContract": "0x..." },
    "message": { "marketId": "0", "outcome": "1", "to": "0x...", "shares": "13888888", "cost": "10000000", "deadline": "1741500000", "nonce": "0" }
  }
}
```

### Portfolio

```json
{
  "address": "0x7a2...",
  "positions": [
    {
      "marketId": 0,
      "question": "Will BTC hit $100k?",
      "token": "YES",
      "shares": 10000000,
      "totalCost": 6800000,
      "avgBuyPrice": 68,
      "currentPrice": 72,
      "currentValue": 7200000,
      "unrealizedPnl": 400000,
      "marketStatus": "open",
      "marketOutcome": null,
      "canRedeem": false,
      "winningToken": null
    }
  ],
  "openOrders": [],
  "totalCost": 6800000,
  "totalPnl": 400000
}
```

---

## Key UI Components

### MarketCard
Reusable card component showing: question, YES/NO price bar, volume, resolution date. Used on homepage and search results.

### PriceBar
Visual bar showing YES probability as filled portion (green) and NO as unfilled (red). Width is proportional to price (e.g., 72% filled for 72¢ YES).

### TradePanel
Right sidebar on market detail. Contains: token selector (YES/NO), amount input, quote display (shares, price, potential payout), and the "Buy" button that triggers the EIP-712 signing flow.

### PriceChart
TradingView Lightweight Charts area chart showing YES price over time. Data from `priceHistory` array.

### OrderbookDisplay
Two-column display of aggregated YES and NO bids at each price level. Data from the `orderbook` response.

### PositionCard
Shows a user's position in a market: shares, avg buy price, current price, PnL (absolute and percentage), and a redeem button for resolved markets.

---

## Wallet Integration

### Connection
RainbowKit provides the connect button and wallet modal. wagmi hooks provide:
- `useAccount()` — connected address
- `useSignTypedData()` — EIP-712 signing for orders
- `useWriteContract()` — for `redeemWinning()` calls
- `useWaitForTransactionReceipt()` — tx confirmations

### USDC Approval
Before the first trade, the user must approve the PredictionMarket contract to spend their USDC. The frontend should:
1. Check allowance via `useReadContract(USDC, 'allowance', [user, contract])`
2. If insufficient, prompt: "Approve USDC spending"
3. Call `useWriteContract(USDC, 'approve', [contract, maxUint256])`
4. Wait for confirmation, then proceed with the trade

### EIP-712 Signing
The backend returns a `signingPayload` from `/api/orders/quote`. The frontend passes it directly to `signTypedData`:

```typescript
const signature = await signTypedDataAsync({
  types: quote.signingPayload.types,
  primaryType: quote.signingPayload.primaryType,
  domain: quote.signingPayload.domain,
  message: quote.signingPayload.message,
})
```

---

## Data Formatting

All monetary values from the backend are in **USDC micro-units** (6 decimals):
- `1_000_000` = $1.00
- `5_000_000` = $5.00
- `72` (price) = 72¢ = $0.72

Frontend formatting helpers:

```typescript
function formatUSDC(microUnits: number): string {
  return `$${(microUnits / 1_000_000).toFixed(2)}`
}

function formatShares(microShares: number): string {
  return (microShares / 1_000_000).toFixed(2)
}

function formatPrice(cents: number): string {
  return `${cents}¢`
}

function formatProbability(cents: number): string {
  return `${cents}%`
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x45e7911Af8c31bDeDf8A586BeEd8efEcACEb9c37
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

---

## Suggested Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (providers, nav, footer)
│   ├── page.tsx                # Homepage
│   ├── market/
│   │   └── [id]/
│   │       └── page.tsx        # Market detail
│   ├── create/
│   │   └── page.tsx            # Create market form
│   ├── portfolio/
│   │   └── page.tsx            # Portfolio (requires wallet)
│   └── leaderboard/
│       └── page.tsx            # Leaderboard
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── market/
│   │   ├── MarketCard.tsx
│   │   ├── PriceBar.tsx
│   │   ├── PriceChart.tsx
│   │   ├── TradePanel.tsx
│   │   ├── OrderbookDisplay.tsx
│   │   └── ActivityFeed.tsx
│   ├── portfolio/
│   │   ├── PositionCard.tsx
│   │   ├── TradeHistory.tsx
│   │   └── RedeemCard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Toast.tsx
│       └── Skeleton.tsx
├── hooks/
│   ├── useMarkets.ts           # React Query hooks for market endpoints
│   ├── useOrders.ts            # Quote + submit order hooks
│   ├── usePortfolio.ts         # Portfolio data hooks
│   └── useLeaderboard.ts       # Leaderboard hook
├── lib/
│   ├── api.ts                  # API client (axios/fetch wrapper)
│   ├── constants.ts            # Contract addresses, chain config
│   ├── format.ts               # formatUSDC, formatShares, etc.
│   └── wagmi.ts                # wagmi + RainbowKit config
├── providers/
│   └── Providers.tsx           # QueryClientProvider + WagmiProvider + RainbowKit
├── public/
│   └── ...
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Polling & Real-Time Updates

| Data | Strategy | Interval |
|------|----------|----------|
| Market price (detail page) | `refetchInterval` on React Query | 5 seconds |
| Market list (homepage) | `refetchInterval` | 15 seconds |
| Portfolio positions | `refetchInterval` when page visible | 10 seconds |
| Activity feed | `refetchInterval` | 10 seconds |
| After trade submission | Immediate `invalidateQueries` | — |

---

## Error Handling

| Backend Error | Frontend Display |
|---------------|-----------------|
| `Market not found` | 404 page / "Market does not exist" |
| `Order expired` | Toast: "Quote expired. Please try again." + auto-refresh quote |
| `Invalid signature` | Toast: "Signature invalid. Please sign again." |
| `Similar market exists` | Inline error on create form: "A similar market already exists" |
| `Blockchain error` | Toast: "Transaction failed. Please try again later." |
| `Insufficient allowance` | Prompt USDC approval flow |
| Network error | Toast: "Cannot reach server. Check your connection." |

---

## Mobile Responsiveness

- Market cards stack vertically on mobile
- Trade panel slides up as a bottom sheet on market detail
- Price chart fills full width
- Orderbook collapses into a tab with the activity feed
- Navigation becomes a bottom tab bar
