# Backend API — Process Specification

## Overview

The backend is a **Rust/Axum** REST API that serves as the central coordination layer between the frontend, the on-chain PredictionMarket contract, and the PostgreSQL database. It handles market creation, EIP-712 order quoting/signing, on-chain order filling, portfolio tracking, and off-chain pricing.

## Architecture

```
Frontend (Next.js)
    │
    ▼  REST API (JSON)
┌──────────────────────────────────────────────────┐
│  Backend (Rust / Axum)                           │
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Routes  │──│ Services │──│ BlockchainSvc │   │
│  │ markets │  │ orders   │  │ EIP-712       │   │
│  │ orders  │  │ orderbook│  │ fillOrder     │   │
│  │ portfolio│ │          │  │ createMarket  │   │
│  │ actions │  │          │  │ nonces        │   │
│  └─────────┘  └──────────┘  └───────────────┘   │
│       │                                          │
│       ▼                                          │
│  ┌──────────────────────┐                        │
│  │     PostgreSQL       │                        │
│  │  markets, orders,    │                        │
│  │  trades, positions,  │                        │
│  │  price_snapshots     │                        │
│  └──────────────────────┘                        │
└──────────────────────────────────────────────────┘
```

## Request Flow — Market Creation

```
POST /api/markets
  ├── 1. Validate question (non-empty, resolution in future)
  ├── 2. Compute questionHash = keccak256(question)
  ├── 3. Check DB: question_hash not already used
  ├── 4. Insert market row (status='pending', question stored as plaintext)
  ├── 5. Call createMarket(questionHash, resolutionTimestamp) on-chain
  │      └── Deploys YES + NO ERC-20 tokens on-chain
  ├── 6. Update DB row: status='open', tx_hash set
  └── 7. Return: marketId, question, questionHash, txHash
```

The UI sends the human-readable question. The backend hashes it and passes the hash to the contract. The DB stores both the plaintext question (for display) and the hash (for on-chain verification). The watcher later backfills `yes_token_address` and `no_token_address` from the `MarketCreated` event.

## Request Flow — Order (Buy Shares)

```
Step 1: POST /api/orders/quote
  ├── Frontend sends: { market_id, token: "YES"|"NO", cost (USDC), user_address }
  ├── Backend looks up current price from CPMM pricing engine
  ├── Computes: shares = floor(cost * 100 / price_cents)
  ├── Fetches on-chain nonce for user
  ├── Builds EIP-712 typed data payload
  └── Returns: { order, orderDigest, signingPayload }

Step 2: Frontend calls eth_signTypedData_v4(signingPayload) → signature

Step 3: POST /api/orders
  ├── Frontend sends: { ...order fields, signature }
  ├── Backend validates signature, deadline, stores in orders table (status='pending')
  ├── Calls fillOrder(order, signature) on-chain as backend wallet
  │     └── Contract: pulls USDC from user, mints YES/NO tokens
  ├── On success: updates order to 'filled', inserts price snapshot, upserts user_positions
  └── Returns: { orderId, status, txHash, shares, cost }
```

## Off-Chain Pricing Model — Virtual Liquidity CPMM

Prices are derived from a constant-product market maker with virtual liquidity:

```
yes_price_cents = round((yes_volume + K) / (yes_volume + no_volume + 2K) * 100)
no_price_cents  = 100 - yes_price_cents
```

Where:
- `yes_volume` / `no_volume` = cumulative USDC spent on each side (from `trades` table)
- `K` = virtual liquidity parameter ($100 USDC = 100,000,000 micro-units)

**Behavior:**
- New market (no trades): 50¢ YES / 50¢ NO
- $100 spent on YES, $0 on NO: ~66.7¢ YES / ~33.3¢ NO
- $200 YES, $100 NO: ~60¢ YES / ~40¢ NO
- Larger K → more stable prices (harder to move)

After actual fills, the CPMM price is blended with the last fill price (70/30) for smoother transitions.

## Database Tables

| Table | Written by | Purpose |
|-------|-----------|---------|
| `markets` | Backend (create), Watcher (confirm) | Market metadata + on-chain state |
| `orders` | Backend (submit), Watcher (confirm fill) | EIP-712 signed orders |
| `trades` | Watcher (OrderFilled events) | Confirmed on-chain fills |
| `user_positions` | Backend (optimistic), Watcher (confirm) | Per-user per-market share balances |
| `price_snapshots` | Backend + Watcher (on fill) | Historical price data for charts |
| `action_mapper` | Backend (UX tracking) | Pending user actions |
| `watcher_cursor` | Watcher only | Block sync progress |

## API Endpoints

### Markets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/api/markets` | Create a new market (anyone) |
| GET | `/api/markets` | List markets (filter by status, category, paginated) |
| GET | `/api/markets/trending` | Markets ranked by volume (homepage) |
| GET | `/api/markets/categories` | Distinct categories with counts |
| GET | `/api/markets/search?q=` | Full-text search on market questions |
| GET | `/api/markets/:id` | Full market detail + orderbook + chart data + trades |
| GET | `/api/markets/:id/price` | Lightweight current price (for polling) |
| GET | `/api/markets/:id/activity` | Activity feed (recent trades) |
| GET | `/api/markets/:id/positions` | Position distribution (YES/NO holders) |

### Trading

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orders/quote` | Get EIP-712 payload to sign |
| POST | `/api/orders` | Submit signed order → on-chain fill |
| GET | `/api/orders/:market_id` | Orderbook for a market |
| GET | `/api/orders/user/:address` | User's orders (optionally filter by market_id) |
| DELETE | `/api/orders/:id/cancel` | Cancel pending order |

### Portfolio

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolio/:address` | Positions + PnL + open orders |
| GET | `/api/portfolio/:address/history` | Trade history with price + tx links |
| GET | `/api/portfolio/:address/redemption-status` | Redeemable winnings from resolved markets |

### Leaderboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard` | Top traders by volume/profit/trades |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/actions/user/:address` | Pending user actions |
| GET | `/api/actions` | All actions (admin) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RPC_URL` | Yes | Ethereum RPC endpoint (Sepolia) |
| `PREDICTION_MARKET_ADDRESS` | Yes | Deployed contract address |
| `MOCK_USDC_ADDRESS` | No | USDC token address |
| `BACKEND_PRIVATE_KEY` | Yes | Owner wallet private key (for fillOrder/createMarket) |
| `PORT` | No | HTTP port (default: 3001) |
| `RUST_LOG` | No | Log level (default: info) |

## Running

```bash
cd backend
cp .env.example .env   # fill in values
cargo run
```

The server runs migrations on startup (`sqlx::migrate!`), creating all tables if they don't exist.

## Dual-Write Pattern

Both the backend (on POST) and the watcher (on event) write to the same tables. This provides:
- **Optimistic updates**: UI reflects changes immediately after the backend submits the tx
- **Confirmation**: Watcher confirms the on-chain state matches, using `ON CONFLICT` to handle duplicates
- **Consistency**: If the backend tx fails, the watcher never sees the event, so the pending order stays pending
