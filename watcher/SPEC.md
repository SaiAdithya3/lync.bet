# Watcher Service — Process Specification

## Overview

The watcher is a **standalone Rust service** that polls on-chain events from the PredictionMarket contract and keeps the PostgreSQL database in sync. It runs independently from the backend API and provides the source of truth for on-chain state.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Watcher (Rust/Tokio)                      │
│                                                              │
│   ┌──────────┐    ┌────────────┐    ┌─────────────────┐     │
│   │  Cursor  │    │  Event     │    │   DB Handlers   │     │
│   │  Tracker │───▶│  Poller    │───▶│                 │     │
│   │          │    │ (getLogs)  │    │  MarketCreated  │     │
│   └──────────┘    └────────────┘    │  OrderFilled    │     │
│                                     │  MarketResolved │     │
│   ┌──────────┐                      │  MarketCancelled│     │
│   │  HTTP    │                      │  WinningsRedeem │     │
│   │  /health │                      └────────┬────────┘     │
│   │  /status │                               │              │
│   └──────────┘                               ▼              │
│                                     ┌─────────────────┐     │
│                                     │   PostgreSQL    │     │
│                                     └─────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## Event Processing Pipeline

```
1. Load last_block from watcher_cursor table
2. If first run (last_block = 0): bootstrap from current_block - 1000
3. Poll loop:
   a. Fetch current block number from RPC
   b. Build filter: address=contract, from=last_block, to=min(last_block+BATCH_SIZE, current)
   c. Call eth_getLogs(filter)
   d. For each log:
      - Match topic0 to known event signatures
      - Decode indexed topics + data fields
      - Execute DB handler
   e. Update watcher_cursor with to_block
   f. Sleep POLL_INTERVAL_MS
```

## Event Handlers — Detailed

### MarketCreated

```
Triggered by: createMarket() on-chain call
Indexed:      topics[1] = marketId
Data fields:  questionHash(32) | creator(32) | yesToken(32) | noToken(32) | resolutionTimestamp(32)

Processing:
  1. Try UPDATE markets SET tx_hash, yes_token_address, no_token_address WHERE market_id = X
     (If backend pre-inserted the row via POST /api/markets)
  2. If rows_affected == 0 (market created externally / via script):
     INSERT INTO markets with placeholder question "Market #N"
     (Frontend can update the question text later)
```

### OrderFilled

```
Triggered by: fillOrder() on-chain call
Indexed:      topics[1] = marketId, topics[2] = buyer
Data fields:  outcome(32) | shares(32) | cost(32)

Processing:
  1. INSERT INTO trades (market_id, buyer, token, shares, cost, tx_hash, block_number)
     ON CONFLICT DO NOTHING (idempotent re-processing)
  2. UPDATE orders SET status='filled', tx_hash, filled_at
     WHERE market_id AND user_address AND shares AND cost AND status='pending'
  3. UPSERT user_positions: accumulate shares and cost for (user, market, token)
     avg_price recalculated as weighted average
  4. INSERT price_snapshot with derived yes/no prices
     price_cents = (cost * 100 / shares), clamped to [1, 99]
```

### MarketResolved

```
Triggered by: onReport() via CRE Forwarder
Indexed:      topics[1] = marketId
Data fields:  outcome(32) — 1=YES, 2=NO

Processing:
  UPDATE markets SET status='resolved', outcome='YES'|'NO', resolved_at=NOW()
```

### MarketCancelled

```
Triggered by: cancelMarket() owner call
Indexed:      topics[1] = marketId

Processing:
  UPDATE markets SET status='cancelled'
```

### WinningsRedeemed

```
Triggered by: redeemWinning() user call
Indexed:      topics[1] = marketId, topics[2] = user
Data fields:  amount(32)

Processing:
  INSERT INTO trades with token='REDEEM' (for analytics/history tracking)
```

## Idempotency

The watcher can safely re-process blocks because:
- `trades` has a UNIQUE constraint on `(tx_hash, market_id, buyer_address, token)` — uses `ON CONFLICT DO NOTHING`
- `orders` update matches on `(market_id, user_address, shares, cost, status='pending')` — already-filled orders won't match
- `user_positions` uses `ON CONFLICT ... DO UPDATE` with additive logic — but since trades are idempotent, this path only triggers once per unique fill
- `watcher_cursor` uses `ON CONFLICT (chain_id) DO UPDATE` — safe to re-set

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://localhost:5432/prediction_market` | PostgreSQL connection |
| `RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` | Ethereum RPC |
| `PREDICTION_MARKET_ADDRESS` | `0x45e7911...` | Contract to watch |
| `CHAIN_ID` | `11155111` | Sepolia chain ID |
| `BATCH_SIZE` | `2000` | Blocks per getLogs call |
| `POLL_INTERVAL_MS` | `1000` | Delay between polls (ms) |
| `PORT` | `3002` | Health/status HTTP port |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns "ok" — liveness probe |
| GET | `/status` | Returns `{ chain_id, last_block }` — sync progress |

## Running

```bash
cd watcher
cp .env.example .env   # fill in DATABASE_URL, RPC_URL, PREDICTION_MARKET_ADDRESS
cargo run
```

## Relationship to Backend

The backend and watcher both write to the same PostgreSQL database:

| Action | Backend writes | Watcher confirms |
|--------|---------------|-----------------|
| Market created | Insert with status='pending' → update to 'open' | Backfills token addresses, ensures status='open' |
| Order filled | Update order to 'filled', insert price_snapshot, upsert position | Insert trade, confirm order status, upsert position, insert snapshot |
| Market resolved | — | Update status='resolved', set outcome |
| Winnings redeemed | — | Insert REDEEM trade for history |

This dual-write pattern ensures the UI updates optimistically while the watcher provides ground-truth confirmation.
