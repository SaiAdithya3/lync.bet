# Backend Spec — Prediction Market Platform

## Overview

The backend serves as the middleware between the frontend, smart contracts, and CRE workflow. It handles four core responsibilities:

1. **Quest Management** — create markets with AI-powered deduplication (owner only)
2. **Order Execution** — users sign EIP-712 orders; backend submits `fillOrder` / `batchFillOrders` on-chain
3. **Data Serving** — market data, prices, portfolios, and activity feeds
4. **Watcher Service** — separate process that listens to chain events and keeps the DB in sync

### Contract Model (PredictionMarket.sol)

- **Owner-only:** `createMarket`, `fillOrder`, `batchFillOrders`, `cancelMarket`
- **Signature-based fills:** Users sign orders (marketId, outcome, to, shares, cost, deadline, nonce); backend pulls USDC and mints tokens
- **1:1 redemption:** 1 winning share = 1 USDC; backend sets prices so liquidity is sufficient
- **Events:** `MarketCreated`, `OrderFilled`, `MarketResolved`, `MarketCancelled`, `WinningsRedeemed`

---

## Tech Stack

```
Runtime:       Bun
Framework:     Hono (lightweight, fast, TypeScript-native)
Database:      PostgreSQL + pgvector extension
AI:            Gemini 2.5 Flash Lite (free tier — dedup + embeddings)
Blockchain:    viem (contract reads/writes)
Auth:          Wallet signature (EIP-4361 / SIWE)
```

Why Hono over Express: faster startup, native TypeScript, runs on Bun, smaller bundle. For a hackathon it's the fastest path.

---

## Database Schema

```sql
-- Enable vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Markets (mirrors on-chain state + stores off-chain metadata)
CREATE TABLE markets (
    id                SERIAL PRIMARY KEY,
    market_id         INTEGER NOT NULL UNIQUE,          -- on-chain marketId
    question          TEXT NOT NULL,                      -- full question text
    question_hash     BYTEA NOT NULL,                    -- keccak256, matches on-chain
    embedding         VECTOR(768) NOT NULL,              -- for similarity search
    category          VARCHAR(50) NOT NULL DEFAULT 'general',
    creator_address   VARCHAR(42) NOT NULL,              -- ETH address
    yes_token_address VARCHAR(42),                       -- deployed OutcomeToken
    no_token_address  VARCHAR(42),                       -- deployed OutcomeToken
    resolution_date   TIMESTAMPTZ NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, resolved, cancelled
    outcome           VARCHAR(10),                       -- null, YES, NO
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    resolved_at       TIMESTAMPTZ,
    tx_hash           VARCHAR(66)                        -- creation tx
);

CREATE INDEX idx_markets_embedding ON markets
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);

-- Orders (signed orders awaiting on-chain fill)
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    market_id       INTEGER NOT NULL REFERENCES markets(market_id),
    user_address    VARCHAR(42) NOT NULL,
    token           VARCHAR(3) NOT NULL,                -- 'YES' or 'NO'
    shares          BIGINT NOT NULL,                    -- tokens to mint (6 decimals)
    cost            BIGINT NOT NULL,                    -- USDC to pull (6 decimals)
    price           INTEGER NOT NULL,                   -- cents (1-99), for display
    nonce           BIGINT NOT NULL,
    signature       BYTEA NOT NULL,                     -- EIP-712 sig (65 bytes)
    status          VARCHAR(15) NOT NULL DEFAULT 'pending', -- pending, filled, expired, cancelled
    tx_hash         VARCHAR(66),                        -- fill tx hash (set by watcher)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    filled_at       TIMESTAMPTZ
);

CREATE INDEX idx_orders_market ON orders(market_id, status);
CREATE INDEX idx_orders_user ON orders(user_address, status);

-- Trades (from OrderFilled events; watcher populates)
CREATE TABLE trades (
    id              SERIAL PRIMARY KEY,
    market_id       INTEGER NOT NULL REFERENCES markets(market_id),
    buyer_address   VARCHAR(42) NOT NULL,
    token           VARCHAR(3) NOT NULL,                -- YES or NO
    shares          BIGINT NOT NULL,
    cost            BIGINT NOT NULL,                   -- USDC paid
    tx_hash         VARCHAR(66) NOT NULL,
    block_number    BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_buyer ON trades(buyer_address);
CREATE INDEX idx_trades_tx ON trades(tx_hash);

-- Price history (for charts)
CREATE TABLE price_snapshots (
    id              SERIAL PRIMARY KEY,
    market_id       INTEGER NOT NULL REFERENCES markets(market_id),
    yes_price       INTEGER NOT NULL,                   -- cents
    volume_24h      BIGINT NOT NULL DEFAULT 0,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_market ON price_snapshots(market_id, timestamp);

-- Watcher sync state (tracks last processed block per chain)
CREATE TABLE watcher_cursor (
    id              SERIAL PRIMARY KEY,
    chain_id        INTEGER NOT NULL UNIQUE,
    contract_address VARCHAR(42) NOT NULL,
    last_block      BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Quest Management

#### `POST /api/markets/create`

Create a new prediction market with AI deduplication.

```
Request:
{
    "question": "Will Bitcoin hit $100k by December 31, 2025?",
    "category": "crypto",
    "resolutionDate": "2025-12-31T00:00:00Z",
    "creatorAddress": "0x742d...5f0bEb"
}

Response (success):
{
    "marketId": 0,
    "questionHash": "0xabc123...",
    "yesTokenAddress": "0x...",
    "noTokenAddress": "0x...",
    "txHash": "0x...",
    "status": "open"
}

Response (duplicate detected):
{
    "error": "similar_market_exists",
    "similarMarket": {
        "marketId": 3,
        "question": "Will BTC reach $100,000 before 2026?",
        "similarity": 0.91
    },
    "message": "A similar market already exists. Please modify your question."
}
```

**Deduplication flow:**
```
1. Generate embedding of question text via Gemini embedding API
2. Query pgvector: SELECT * FROM markets WHERE embedding <=> $1 < 0.15
   (cosine distance < 0.15 = similarity > 0.85)
3. If similar market found:
   a. Call Gemini LLM as second check:
      "Are these two prediction market questions asking the same thing?
       Q1: {new_question}
       Q2: {existing_question}
       Answer only YES or NO."
   b. If LLM says YES → reject with similar market info
4. If no duplicate:
   a. Call PredictionMarket.createMarket(questionHash, resolutionTimestamp)
   b. Read MarketCreated event to get token addresses
   c. Store in database with embedding
   d. Return market info
```

#### `GET /api/markets`

List markets with filtering and sorting.

```
Query params:
  ?status=open|resolved|all        (default: open)
  ?category=crypto|politics|sports  (optional)
  ?sort=newest|volume|ending_soon   (default: newest)
  ?limit=20&offset=0

Response:
{
    "markets": [
        {
            "marketId": 0,
            "question": "Will Bitcoin hit $100k by December 31, 2025?",
            "category": "crypto",
            "yesPrice": 72,          // cents — from last trade
            "noPrice": 28,
            "volume24h": 2400000,    // in USDC smallest unit
            "resolutionDate": "2025-12-31T00:00:00Z",
            "status": "open",
            "creatorAddress": "0x742d..."
        }
    ],
    "total": 42
}
```

#### `GET /api/markets/:marketId`

Get full market details.

```
Response:
{
    "marketId": 0,
    "question": "Will Bitcoin hit $100k by December 31, 2025?",
    "category": "crypto",
    "creator": "0x742d...",
    "yesTokenAddress": "0x...",
    "noTokenAddress": "0x...",
    "yesPrice": 72,
    "noPrice": 28,
    "totalVolume": 15000000,
    "totalLiquidity": 5000000,
    "resolutionDate": "2025-12-31T00:00:00Z",
    "status": "open",
    "outcome": null,
    "createdAt": "2025-06-15T10:00:00Z",
    "priceHistory": [
        { "timestamp": "2025-06-15T10:00:00Z", "yesPrice": 50 },
        { "timestamp": "2025-06-15T11:00:00Z", "yesPrice": 55 },
        { "timestamp": "2025-06-15T12:00:00Z", "yesPrice": 72 }
    ],
    "recentTrades": [
        {
            "buyer": "0x3f2...",
            "token": "YES",
            "amount": 500000,
            "price": 72,
            "timestamp": "2025-06-15T12:30:00Z"
        }
    ]
}
```

#### `GET /api/markets/check-duplicate`

Real-time dedup check as user types (debounced from frontend).

```
Query params:
  ?question=Will Bitcoin hit 100k...

Response:
{
    "isDuplicate": true,
    "similarity": 0.91,
    "similarMarket": {
        "marketId": 3,
        "question": "Will BTC reach $100,000 before 2026?"
    }
}
```

---

### Trading (Signed Orders → On-Chain Fill)

The contract uses **signature-based order execution**: users sign EIP-712 orders off-chain; the backend (owner) submits `fillOrder` or `batchFillOrders` on-chain. Users only need a one-time USDC approval.

#### Contract Flow Summary

```
1. Backend quotes price (e.g. YES at 72¢)
2. User signs Order: { marketId, outcome, to, shares, cost, deadline, nonce }
   - shares = floor(cost / (price/100))  e.g. $5 at 72¢ → 6,944,444 shares
   - cost = USDC amount user pays (6 decimals)
3. User approves PredictionMarket for USDC (one-time)
4. Backend calls fillOrder(order, signature) or batchFillOrders(orders, signatures)
5. Contract pulls USDC, mints YES/NO tokens to user
```

#### `POST /api/orders/quote`

Get a signed order payload for the frontend to sign (no DB write yet).

```
Request:
{
    "marketId": 0,
    "token": "YES",
    "cost": 5000000,          // $5 USDC (6 decimals)
    "userAddress": "0x742d...",
    "recipientAddress": "0x742d..."  // optional, defaults to userAddress
}

Response:
{
    "order": {
        "marketId": 0,
        "outcome": 1,             // 1 = Yes, 2 = No
        "to": "0x742d...",
        "shares": 6944444,        // floor(cost / (price/100)) × 1e6
        "cost": 5000000,
        "deadline": 1734567890,
        "nonce": 0                // from contract.nonces(userAddress)
    },
    "orderDigest": "0x...",       // from contract.orderDigest(order)
    "signingPayload": { ... }     // EIP-712 typed data for signTypedData_v4
}
```

**Backend:** Fetch `nonce` from `contract.nonces(userAddress)`, compute `shares` from `cost` and current `price`, set `deadline` (e.g. +1 hour).

#### `POST /api/orders`

Submit a signed order. Backend stores it and either fills immediately or queues for batch.

```
Request:
{
    "marketId": 0,
    "token": "YES",
    "shares": 6944444,
    "cost": 5000000,
    "price": 72,
    "nonce": 0,
    "deadline": 1734567890,
    "signature": "0x...",         // 65 bytes: r (32) + s (32) + v (1)
    "userAddress": "0x742d...",
    "recipientAddress": "0x742d..."
}

Response:
{
    "orderId": 15,
    "status": "filled",           // or "pending" if queued
    "txHash": "0x...",            // if filled immediately
    "shares": 6944444,
    "cost": 5000000
}
```

**Backend logic:**
```
1. Reconstruct Order struct, verify signature matches orderDigest
2. Check user has enough USDC allowance for cost
3. Check market is open, order not expired
4. Option A: fillOrder immediately (single order)
5. Option B: add to batch queue, run batchFillOrders periodically
6. Store order in DB with status pending/filled
7. Watcher will update tx_hash and filled_at when OrderFilled is seen
```

#### `POST /api/orders/batch-fill`

Backend endpoint to trigger batch fill (for queued orders).

```
Request:
{
    "orderIds": [15, 16, 17]     // pending orders to batch
}

Response:
{
    "txHash": "0x...",
    "filledCount": 3
}
```

#### `GET /api/orders/:marketId`

Get current orderbook (aggregated by price for display).

```
Response:
{
    "marketId": 0,
    "bids": [                          // buy YES orders
        { "price": 72, "shares": 5000000, "orders": 3 },
        { "price": 70, "shares": 2000000, "orders": 1 }
    ],
    "noBids": [                        // buy NO orders (equivalent to sell YES)
        { "price": 28, "shares": 5000000, "orders": 2 }
    ],
    "lastPrice": 72,
    "yesPrice": 72,
    "noPrice": 28
}
```

#### `DELETE /api/orders/:orderId`

Cancel a pending order (soft cancel in DB; on-chain nonce already used if filled).

```
Response:
{
    "orderId": 15,
    "status": "cancelled"
}
```

---

### Portfolio

#### `GET /api/portfolio/:address`

Get user's positions across all markets.

```
Response:
{
    "address": "0x742d...",
    "positions": [
        {
            "marketId": 0,
            "question": "Will Bitcoin hit $100k by December 31, 2025?",
            "yesBalance": 5000000,
            "noBalance": 0,
            "avgBuyPrice": 68,           // cents
            "currentPrice": 72,          // cents
            "unrealizedPnl": 200000,     // in USDC units
            "status": "open"
        }
    ],
    "openOrders": [
        {
            "orderId": 22,
            "marketId": 1,
            "side": "buy",
            "token": "YES",
            "amount": 2000000,
            "price": 55
        }
    ],
    "totalPnl": 350000
}
```

#### `GET /api/portfolio/:address/history`

Trade history for a user.

```
Response:
{
    "trades": [
        {
            "tradeId": 8,
            "marketId": 0,
            "side": "buy",
            "token": "YES",
            "amount": 1000000,
            "price": 72,
            "timestamp": "2025-06-15T12:30:00Z",
            "txHash": "0x..."
        }
    ]
}
```

---

### Resolution

#### `GET /api/resolution/:marketId`

Get resolution details (from CRE workflow output).

```
Response:
{
    "marketId": 0,
    "status": "resolved",
    "outcome": "NO",
    "confidence": 0.7,
    "reasoning": "Based on current market trajectory...",
    "evidenceHash": "00049813dba41648",
    "resolvedAt": "2025-12-31T00:05:00Z",
    "txHash": "0x967cd340..."
}
```

---

## AI Deduplication — Detail

### Embedding Generation

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text }] },
            }),
        }
    );
    const data = await response.json();
    return data.embedding.values; // 768-dim vector
}
```

### Similarity Check

```typescript
async function findSimilarMarket(question: string): Promise<SimilarMarket | null> {
    const embedding = await generateEmbedding(question);

    // pgvector cosine distance: lower = more similar
    // <=> operator returns cosine distance (0 = identical, 2 = opposite)
    const result = await db.query(`
        SELECT market_id, question, (embedding <=> $1::vector) as distance
        FROM markets
        WHERE status = 'open'
        ORDER BY embedding <=> $1::vector
        LIMIT 1
    `, [JSON.stringify(embedding)]);

    if (result.rows.length === 0) return null;

    const similarity = 1 - result.rows[0].distance; // convert distance to similarity
    if (similarity < 0.85) return null;

    // Double-check with LLM
    const llmConfirm = await confirmDuplicateWithLLM(
        question,
        result.rows[0].question
    );

    if (!llmConfirm) return null;

    return {
        marketId: result.rows[0].market_id,
        question: result.rows[0].question,
        similarity: Math.round(similarity * 100),
    };
}
```

### LLM Confirmation

```typescript
async function confirmDuplicateWithLLM(q1: string, q2: string): Promise<boolean> {
    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Are these two prediction market questions asking essentially the same thing? Consider if a user betting on Q1 would also be satisfied betting on Q2.

Q1: ${q1}
Q2: ${q2}

Answer only YES or NO.`
                    }]
                }]
            }),
        }
    );
    const data = await response.json();
    const answer = data.candidates[0].content.parts[0].text.trim().toUpperCase();
    return answer.includes("YES");
}
```

---

## On-Chain Integration

### Contract Reads (viem)

```typescript
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const client = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

// Read market data from contract
async function getOnChainMarket(marketId: number) {
    return await client.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "getMarket",
        args: [BigInt(marketId)],
    });
}

// Read user's token balances
async function getTokenBalance(tokenAddress: string, userAddress: string) {
    return await client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [userAddress],
    });
}
```

### Contract Writes (owner-only)

```typescript
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(BACKEND_PRIVATE_KEY);
const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
});

// Order struct (matches contract)
type Order = {
    marketId: bigint;
    outcome: number;   // 1 = Yes, 2 = No
    to: `0x${string}`;
    shares: bigint;
    cost: bigint;
    deadline: bigint;
    nonce: bigint;
};

// Fill a single signed order (signature = 65 bytes: r + s + v)
async function fillOrder(order: Order, signature: `0x${string}`) {
    return walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "fillOrder",
        args: [order, signature],
    });
}

// Batch fill multiple orders
async function batchFillOrders(orders: Order[], signatures: `0x${string}`[]) {
    return walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "batchFillOrders",
        args: [orders, signatures],
    });
}

// Create market (owner only)
async function createMarket(questionHash: `0x${string}`, resolutionTimestamp: bigint) {
    return walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "createMarket",
        args: [questionHash, resolutionTimestamp],
    });
}

// Cancel market (owner only)
async function cancelMarket(marketId: number) {
    return walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: predictionMarketAbi,
        functionName: "cancelMarket",
        args: [BigInt(marketId)],
    });
}
```

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                  -- Hono API entry point
│   ├── watcher/
│   │   ├── index.ts              -- Watcher entry (event loop)
│   │   ├── events.ts             -- Event handlers (MarketCreated, OrderFilled, etc.)
│   │   └── cursor.ts             -- Block cursor (watcher_cursor table)
│   ├── routes/
│   │   ├── markets.ts            -- /api/markets/* endpoints
│   │   ├── orders.ts             -- /api/orders/* endpoints
│   │   ├── portfolio.ts          -- /api/portfolio/* endpoints
│   │   └── resolution.ts         -- /api/resolution/* endpoints
│   ├── services/
│   │   ├── dedup.ts              -- AI deduplication logic
│   │   ├── orders.ts             -- Order signing, fillOrder, batchFillOrders
│   │   ├── blockchain.ts         -- viem contract reads/writes
│   │   └── pricing.ts            -- Price calculation + snapshots
│   ├── db/
│   │   ├── client.ts             -- PostgreSQL connection
│   │   ├── schema.sql            -- Table definitions
│   │   └── queries.ts            -- Prepared queries
│   └── types/
│       └── index.ts              -- Shared TypeScript types
├── package.json
├── tsconfig.json
└── .env
```

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/prediction_market

# Blockchain
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PREDICTION_MARKET_ADDRESS=0x45e7911Af8c31bDeDf8A586BeEd8efEcACEb9c37
MOCK_USDC_ADDRESS=0x7817a9C826F5D3F237F4577cbF422EE84dDF212d
BACKEND_PRIVATE_KEY=0x...   # wallet that executes trades on-chain

# AI
GEMINI_API_KEY=your-key

# Server
PORT=3001
```

---

---

## Watcher Service

A **separate service** that listens to on-chain events and updates the database. Runs independently from the API server (e.g. `bun run watcher` or separate deployment).

### Responsibilities

| Event | Action |
|-------|--------|
| `MarketCreated` | Insert or update market in DB (if not from our API) |
| `OrderFilled` | Insert trade, update order status + tx_hash |
| `MarketResolved` | Update market status + outcome |
| `MarketCancelled` | Update market status |
| `WinningsRedeemed` | Optional: record redemption for analytics |

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │     │   Watcher   │     │  PostgreSQL │
│   (Hono)    │     │   Service   │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  fillOrder()       │  getLogs()        │
       │ ──────────────────►│                   │
       │                   │  INSERT/UPDATE    │
       │                   │ ─────────────────►│
       │                   │                   │
       │  read from DB     │                   │
       │ ◄─────────────────────────────────────│
```

### Implementation

```typescript
// watcher/src/index.ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { db } from "./db";

const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.RPC_URL),
});

const CONTRACT = process.env.PREDICTION_MARKET_ADDRESS!;
const BATCH_SIZE = 2000;

async function getLastBlock(chainId: number): Promise<bigint> {
    const row = await db.query(
        "SELECT last_block FROM watcher_cursor WHERE chain_id = $1",
        [chainId]
    );
    return row.rows[0]?.last_block ?? 0n;
}

async function setLastBlock(chainId: number, block: bigint) {
    await db.query(
        `INSERT INTO watcher_cursor (chain_id, contract_address, last_block, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (chain_id) DO UPDATE SET last_block = $3, updated_at = NOW()`,
        [chainId, CONTRACT, block.toString()]
    );
}

async function processMarketCreated(log: any) {
    const { marketId, yesToken, noToken } = log.args;
    // Markets are created by API first; watcher updates tx_hash and token addresses
    await db.query(
        `UPDATE markets SET tx_hash = $1, yes_token_address = $2, no_token_address = $3 WHERE market_id = $4`,
        [log.transactionHash, yesToken, noToken, Number(marketId)]
    );
}

async function processOrderFilled(log: any) {
    const { marketId, buyer, outcome, shares, cost } = log.args;
    const token = outcome === 1 ? "YES" : "NO";
    await db.query(
        `INSERT INTO trades (market_id, buyer_address, token, shares, cost, tx_hash, block_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [Number(marketId), buyer, token, shares.toString(), cost.toString(), log.transactionHash, log.blockNumber]
    );
    // Update matching order status if we have it (match by user, market, shares, cost)
    await db.query(
        `UPDATE orders SET status = 'filled', tx_hash = $1, filled_at = NOW()
         WHERE market_id = $2 AND user_address = $3 AND shares = $4 AND cost = $5 AND status = 'pending'`,
        [log.transactionHash, Number(marketId), buyer, shares.toString(), cost.toString()]
    );
}

async function processMarketResolved(log: any) {
    const { marketId, outcome } = log.args;
    const outcomeStr = outcome === 1 ? "YES" : "NO";
    await db.query(
        `UPDATE markets SET status = 'resolved', outcome = $1, resolved_at = NOW()
         WHERE market_id = $2`,
        [outcomeStr, Number(marketId)]
    );
}

async function processMarketCancelled(log: any) {
    const { marketId } = log.args;
    await db.query(
        `UPDATE markets SET status = 'cancelled' WHERE market_id = $1`,
        [Number(marketId)]
    );
}

async function run() {
    const chainId = sepolia.id;
    let fromBlock = await getLastBlock(chainId);
    if (fromBlock === 0n) fromBlock = BigInt(await client.getBlockNumber()) - 1000n; // bootstrap

    while (true) {
        const toBlock = fromBlock + BigInt(BATCH_SIZE);
        const logs = await client.getLogs({
            address: CONTRACT,
            fromBlock,
            toBlock,
            events: [
                parseAbiItem("event MarketCreated(uint256 indexed marketId, bytes32 questionHash, address creator, address yesToken, address noToken, uint256 resolutionTimestamp)"),
                parseAbiItem("event OrderFilled(uint256 indexed marketId, address indexed buyer, uint8 outcome, uint256 shares, uint256 cost)"),
                parseAbiItem("event MarketResolved(uint256 indexed marketId, uint8 outcome)"),
                parseAbiItem("event MarketCancelled(uint256 indexed marketId)"),
            ],
        });

        for (const log of logs) {
            try {
                if (log.eventName === "MarketCreated") await processMarketCreated(log);
                else if (log.eventName === "OrderFilled") await processOrderFilled(log);
                else if (log.eventName === "MarketResolved") await processMarketResolved(log);
                else if (log.eventName === "MarketCancelled") await processMarketCancelled(log);
            } catch (e) {
                console.error("Watcher error:", e);
            }
        }

        await setLastBlock(chainId, toBlock);
        fromBlock = toBlock + 1n;
        await new Promise((r) => setTimeout(r, 1000)); // rate limit
    }
}

run();
```

### Project Structure (with Watcher)

```
backend/
├── src/
│   ├── index.ts                  -- Hono API
│   ├── watcher/
│   │   ├── index.ts              -- Watcher entry point
│   │   ├── events.ts             -- Event handlers
│   │   └── cursor.ts             -- Block cursor management
│   ├── routes/
│   ├── services/
│   └── db/
├── package.json
└── .env
```

### Running the Watcher

```bash
# In package.json
"scripts": {
    "start": "bun run src/index.ts",
    "watcher": "bun run src/watcher/index.ts"
}

# Run both (e.g. in Docker Compose or PM2)
bun run start &    # API server
bun run watcher   # Event watcher
```

---

## Hackathon MVP Scope

For the demo, prioritize these endpoints:

```
Must have:
  POST /api/markets/create         -- with AI dedup (owner only)
  GET  /api/markets                -- list markets
  GET  /api/markets/:id            -- market detail
  POST /api/orders/quote           -- get order payload for signing
  POST /api/orders                 -- submit signed order, fill on-chain
  GET  /api/orders/:marketId       -- orderbook
  GET  /api/portfolio/:address    -- user positions (read from chain or DB)
  Watcher service                  -- event listener, keeps DB in sync

Nice to have:
  GET  /api/markets/check-duplicate -- live dedup as user types
  POST /api/orders/batch-fill      -- batch fill queued orders
  DELETE /api/orders/:id           -- cancel pending order
  GET  /api/portfolio/:address/history -- trade history
  GET  /api/resolution/:marketId   -- resolution details

Skip for MVP:
  WebSocket price updates (use polling)
  Rate limiting / auth middleware
```