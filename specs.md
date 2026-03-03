# Prediction Market Platform — Project Spec

## Overview

A decentralized prediction market platform (similar to Polymarket) powered by Chainlink's Confidential Runtime Environment (CRE). Users create prediction market questions ("quests"), trade YES/NO outcome tokens, and markets are resolved by an AI oracle running inside CRE with confidential compute guarantees.

---

## What's Already Built (CRE Workflow — Phase 0) ✅

The core oracle workflow is complete and simulating successfully:

```
Cron trigger fires
  → Step 1: Fetch live BTC price from CoinGecko (all nodes, BFT consensus)
  → Step 2: Get API secret at DON level → pass to node mode
  → Step 3: Call Gemini 2.5 Flash Lite for market resolution (one node, cached for consensus)
  → Step 4: Hash everything deterministically (confidential output)
  → Return ConfidentialOutput (workflowId, inputCommitment, result hash, timestamp)
```

**Stack:** TypeScript, CRE SDK, WASM compilation, Gemini API, CoinGecko API

**Key patterns established:**
- High-level `HTTPClient.sendRequest()` for data fetching with consensus
- Low-level `runtime.runInNodeMode()` for LLM calls with secrets
- `cacheSettings` for single-execution across DON nodes
- Deterministic hashing for confidential output commitments
- `SecretsProvider` pattern for API key management

**Upgrade path to full confidential compute:**
```typescript
// Current
const httpClient = new HTTPClient()
// Future (when TEE support goes live)
const httpClient = new ConfidentialHTTPClient()
```

---

## What Needs to Be Built

### Phase 1: Smart Contracts (Solidity)

The on-chain layer that manages markets, outcome tokens, and settlement.

#### 1.1 MarketFactory.sol

Deploys new prediction markets. Acts as the registry for all markets.

```
Functions:
  - createMarket(questionHash, resolutionTimestamp, creatorAddress) → marketId
  - getMarket(marketId) → MarketInfo
  - getAllActiveMarkets() → MarketInfo[]
  - pauseMarket(marketId) — admin/governance only

Events:
  - MarketCreated(marketId, questionHash, creator, resolutionTimestamp)
  - MarketPaused(marketId)

Storage:
  - mapping(uint256 => MarketInfo) markets
  - uint256 marketCount
  - mapping(bytes32 => bool) questionHashExists  // prevents duplicate markets
```

**MarketInfo struct:**
```solidity
struct MarketInfo {
    uint256 marketId;
    bytes32 questionHash;        // keccak256 of the question text
    address creator;
    uint256 resolutionTimestamp;  // when the market can be resolved
    MarketStatus status;         // Open, Resolved, Cancelled
    Outcome outcome;             // Unresolved, Yes, No
    address yesToken;            // ERC-20 token address
    address noToken;             // ERC-20 token address
    uint256 totalLiquidity;
}
```

#### 1.2 OutcomeToken.sol

ERC-20 token representing a YES or NO position. Deployed in pairs by MarketFactory.

```
- Standard ERC-20 with mint/burn controlled by MarketFactory
- 1 YES token + 1 NO token are always minted together (costs 1 USDC)
- On resolution: winning tokens redeem for 1 USDC, losing tokens → 0
```

#### 1.3 MarketResolver.sol (CRE Consumer Contract)

Receives resolution reports from the CRE workflow and settles markets.

```
Functions:
  - receiveReport(reportData)  // called by CRE forwarder
  - settleMarket(marketId)     // distributes winnings
  - disputeResolution(marketId) — within dispute window

Security:
  - Only accepts reports from authorized CRE forwarder address
  - 24-hour dispute window before settlement is final
  - Report validation: checks workflowId, verifies signatures
```

#### 1.4 OrderBook.sol (or AMM)

Handles trading of outcome tokens. Two options:

**Option A — CLOB (Central Limit Order Book):**
```
- Limit orders: buy/sell YES or NO tokens at a specific price
- Matching engine on-chain (gas-intensive but transparent)
- Better price discovery for liquid markets
```

**Option B — AMM (Automated Market Maker) — Recommended for MVP:**
```
- Constant product formula adapted for binary outcomes
- Price of YES token = probability estimate (0.01 to 0.99)
- Liquidity providers earn fees
- Simpler implementation, works with low liquidity
```

#### Contract Deployment Plan

```
Network: Ethereum Sepolia (testnet) → Arbitrum/Base (mainnet)
Token:   USDC (testnet mock for MVP)

Deploy order:
  1. MockUSDC (test token)
  2. OutcomeToken (implementation)
  3. MarketFactory (deploys OutcomeToken pairs)
  4. MarketResolver (CRE consumer)
  5. AMM or OrderBook
```

---

### Phase 2: Backend (Quest Creation + AI Deduplication)

The backend handles market creation, question validation, and serves data to the frontend.

#### 2.1 Tech Stack

```
Runtime:      Node.js / Bun
Framework:    FastAPI (Python) or Express/Hono (TypeScript)
Database:     PostgreSQL
AI:           Gemini 2.5 Flash Lite (free tier)
Blockchain:   ethers.js / viem for contract interaction
```

#### 2.2 Quest Creation Flow

```
User submits question
  → Backend validates format (non-empty, ends with ?, has resolution date)
  → AI deduplication check (see 2.3)
  → If unique: deploy market via MarketFactory contract
  → Store question text + metadata in PostgreSQL
  → Return marketId to frontend
```

#### 2.3 AI-Powered Deduplication

The core innovation: prevent duplicate/similar markets from being created.

```
Endpoint: POST /api/quests/create

Input:
  {
    "question": "Will Bitcoin hit $100k by December 31, 2025?",
    "resolutionDate": "2025-12-31T00:00:00Z",
    "category": "crypto"
  }

Deduplication process:
  1. Generate embedding of the question text (Gemini embedding API)
  2. Query PostgreSQL for cosine similarity against existing questions
  3. If similarity > 0.85 threshold:
       → Reject with "Similar market already exists: {existingMarketId}"
  4. As a second check, call Gemini LLM:
       Prompt: "Are these two prediction market questions asking
                essentially the same thing? Answer YES or NO.
                Q1: {new_question}
                Q2: {most_similar_existing_question}"
  5. If LLM says YES → reject
  6. If both checks pass → create market
```

**Database schema for deduplication:**
```sql
CREATE TABLE quests (
    id            SERIAL PRIMARY KEY,
    market_id     INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_hash BYTEA NOT NULL,           -- keccak256, matches on-chain
    embedding     VECTOR(768) NOT NULL,     -- pgvector for similarity search
    category      VARCHAR(50),
    creator       VARCHAR(42),              -- ETH address
    resolution_date TIMESTAMPTZ NOT NULL,
    status        VARCHAR(20) DEFAULT 'active',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quests_embedding ON quests USING ivfflat (embedding vector_cosine_ops);
```

#### 2.4 API Endpoints

```
Quest Management:
  POST   /api/quests/create          — create new market (with dedup)
  GET    /api/quests                  — list all active markets
  GET    /api/quests/:id              — get market details
  GET    /api/quests/trending         — markets by volume/activity
  GET    /api/quests/categories       — list categories

Trading:
  POST   /api/trade/buy               — buy YES/NO tokens
  POST   /api/trade/sell              — sell YES/NO tokens
  GET    /api/trade/orderbook/:id     — current prices/depth
  GET    /api/trade/portfolio/:address — user's positions

Resolution:
  GET    /api/resolution/:id          — resolution status + CRE output
  POST   /api/resolution/trigger/:id  — manually trigger CRE resolution

User:
  GET    /api/user/:address/history   — trade history
  GET    /api/user/:address/pnl       — profit/loss summary
```

---

### Phase 3: Frontend (Polymarket-style UI)

#### 3.1 Tech Stack

```
Framework:    Next.js 14+ (App Router)
Styling:      Tailwind CSS
Wallet:       RainbowKit + wagmi
State:        Zustand or React Query
Charts:       Lightweight-charts (TradingView) or Recharts
```

#### 3.2 Pages & Components

```
/                         — Homepage: trending markets, categories, search
/market/[id]              — Market detail page (chart, order book, trade panel)
/create                   — Create new quest (form + AI dedup feedback)
/portfolio                — User's positions, P&L, trade history
/leaderboard              — Top traders by profit
```

#### 3.3 Homepage

```
┌─────────────────────────────────────────────────────────┐
│  🔮 PredictCRE                    [Search]  [Connect]   │
├─────────────────────────────────────────────────────────┤
│  Categories: [All] [Crypto] [Politics] [Sports] [Tech]  │
├─────────────────────────────────────────────────────────┤
│  Trending Markets                                       │
│  ┌──────────────────────────────────────────┐          │
│  │ Will BTC hit $100k by Dec 2025?         │          │
│  │ YES 75¢  ████████████░░░░  NO 25¢       │          │
│  │ $2.4M volume · Resolves Dec 31          │          │
│  └──────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────┐          │
│  │ Will ETH flip BTC by 2026?              │          │
│  │ YES 12¢  ██░░░░░░░░░░░░░░  NO 88¢       │          │
│  │ $890K volume · Resolves Dec 31          │          │
│  └──────────────────────────────────────────┘          │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

#### 3.4 Market Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  Will Bitcoin hit $100k by December 31, 2025?           │
│  Created by 0x7a2...  ·  Resolves Dec 31, 2025         │
├──────────────────────────────┬──────────────────────────┤
│  Price Chart                 │  Trade Panel             │
│  ┌────────────────────────┐  │  ┌────────────────────┐  │
│  │    /\    /\            │  │  │ [YES]    [NO]      │  │
│  │   /  \  /  \    /\    │  │  │                    │  │
│  │  /    \/    \  /  \   │  │  │ Amount: [____] USDC│  │
│  │ /            \/    \  │  │  │ Shares: 13.3 YES   │  │
│  │/                    \ │  │  │ Avg Price: 0.75    │  │
│  └────────────────────────┘  │  │ Potential: $13.30  │  │
│  YES: 75¢ (+2.1%)           │  │                    │  │
│                              │  │ [Buy YES for 75¢]  │  │
│  Resolution Source: CRE      │  └────────────────────┘  │
│  Oracle: Gemini 2.5 Flash   │                          │
│  Consensus: BFT (4/5 nodes) │  Your Position           │
│                              │  10 YES tokens @ 0.68   │
│  Volume: $2.4M              │  P&L: +$0.70 (+10.3%)   │
│  Liquidity: $150K           │                          │
├──────────────────────────────┴──────────────────────────┤
│  Activity Feed                                          │
│  0x3f2... bought 500 YES @ 0.74  ·  2 min ago         │
│  0x8a1... sold 200 NO @ 0.26     ·  5 min ago         │
│  0xc44... bought 1000 YES @ 0.73 ·  12 min ago        │
└─────────────────────────────────────────────────────────┘
```

#### 3.5 Create Quest Page

```
┌─────────────────────────────────────────────────────────┐
│  Create a New Market                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Question:                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Will Ethereum transition to...                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ Similar market found:                              │
│  "Will ETH complete the Pectra upgrade by Q2 2025?"    │
│  Similarity: 87% — Please modify your question          │
│                                                         │
│  Category: [Crypto ▼]                                   │
│  Resolution Date: [2025-12-31]                          │
│  Initial Liquidity: [1000] USDC                         │
│                                                         │
│  [Create Market]                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Key UX features:
- Real-time dedup feedback as user types (debounced API call)
- Shows similar existing markets with links
- Category auto-suggestion
- Resolution date validation (must be in the future)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  Homepage · Market Detail · Create Quest · Portfolio              │
│  RainbowKit wallet · TradingView charts · Real-time updates      │
└────────────┬──────────────────────────────────┬──────────────────┘
             │ REST API                         │ wagmi/viem
             ▼                                  ▼
┌────────────────────────┐        ┌──────────────────────────────┐
│     BACKEND (API)      │        │      SMART CONTRACTS         │
│                        │        │                              │
│  Quest CRUD            │───────▶│  MarketFactory.sol           │
│  AI Deduplication      │        │  OutcomeToken.sol (ERC-20)   │
│  Trade routing         │        │  MarketResolver.sol (CRE)    │
│  Portfolio tracking    │        │  AMM.sol                     │
│                        │        │                              │
│  PostgreSQL + pgvector │        │  Sepolia → Arbitrum/Base     │
│  Gemini (dedup)        │        └──────────────┬───────────────┘
└────────────────────────┘                       │
                                                 │ CRE Forwarder
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     CRE WORKFLOW (WASM)      │
                                  │                              │
                                  │  1. Fetch market data        │
                                  │  2. Call Gemini LLM          │
                                  │  3. Hash confidentially      │
                                  │  4. Generate signed report   │
                                  │  5. Write to MarketResolver  │
                                  │                              │
                                  │  Runs on Chainlink DON       │
                                  │  BFT consensus (4/5 nodes)   │
                                  │  Future: TEE confidential    │
                                  └──────────────────────────────┘
```

---

## CRE Workflow Upgrade (Phase 1 Additions)

To connect the workflow to on-chain contracts, add these capabilities:

```typescript
// After Step 3 (confidential computation), add:

// Step 4: Generate a signed report
const reportPayload = encodeAbiParameters(
  [{ type: 'uint256' }, { type: 'uint8' }, { type: 'uint256' }],
  [marketId, outcome, confidence]
)

const report = runtime.report({
  encodedPayload: reportPayload,
  encoderName: "evm",
  signingAlgo: "ecdsa",
  hashingAlgo: "keccak256",
}).result()

// Step 5: Write to MarketResolver contract
const evmClient = new EVMClient(chainSelector)
evmClient.writeReport(runtime, {
  report: report,
  contractAddress: config.resolverAddress,
  gasLimit: "500000",
}).result()
```

---

## Development Phases & Timeline

```
Phase 0: CRE Workflow (DONE)                          ✅ Complete
  - Cron trigger, data fetch, LLM call, hashing

Phase 1: Smart Contracts                               ~1 week
  - MarketFactory + OutcomeToken + Resolver + AMM
  - Deploy to Sepolia
  - Connect CRE workflow → on-chain write

Phase 2: Backend                                       ~1 week
  - API server with quest CRUD
  - AI deduplication with embeddings + LLM check
  - PostgreSQL + pgvector setup
  - Trade execution endpoints

Phase 3: Frontend                                      ~1-2 weeks
  - Market listing + detail pages
  - Wallet connect + trading UI
  - Create quest with live dedup feedback
  - Portfolio + P&L tracking

Phase 4: Integration & Testing                         ~1 week
  - End-to-end: create → trade → resolve → settle
  - CRE workflow deployment to DON
  - Testnet demo with real transactions
```

---

## Team Handoff Checklist

```
Repo structure:
  /hello-tee
    /hello-confidential          ← CRE workflow (done)
      main.ts
      config.staging.json
      workflow.yaml
    secrets.yaml
    .env
  /contracts                     ← Solidity (Phase 1)
    /src
    /test
    /script
    foundry.toml
  /backend                       ← API server (Phase 2)
    /src
    /prisma
    package.json
  /frontend                      ← Next.js (Phase 3)
    /app
    /components
    /lib
    package.json
  SPEC.md                        ← This file
```

**To run the CRE workflow:**
```bash
cd hello-tee
# Add your Gemini key to .env
echo 'GEMINI_API_KEY_ALL=your-key' > .env
# Simulate
cre workflow simulate hello-confidential --target staging-settings
```

**Key decisions for team:**
1. AMM vs CLOB for trading (recommend AMM for MVP)
2. Sepolia vs Base Sepolia for deployment
3. Dispute mechanism: simple time-lock vs token-weighted voting
4. Frontend auth: wallet-only vs social login + embedded wallet