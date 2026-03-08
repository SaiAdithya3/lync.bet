# Smart Contracts — Process Specification

## Overview

The on-chain layer consists of four Solidity contracts deployed on Ethereum Sepolia. They manage prediction markets, outcome tokens, order execution via EIP-712 signatures, and resolution via the Chainlink CRE (Confidential Runtime Environment).

## Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PredictionMarket.sol                    │
│                                                         │
│  createMarket() ──┐                                     │
│                   ▼                                     │
│           ┌───────────────┐   ┌───────────────┐         │
│           │ OutcomeToken  │   │ OutcomeToken  │         │
│           │   YES-{id}    │   │   NO-{id}     │         │
│           └───────────────┘   └───────────────┘         │
│                                                         │
│  fillOrder() ── verifyEIP712 ── pullUSDC ── mintTokens  │
│                                                         │
│  onReport()  ── CRE Forwarder ── resolveMarket          │
│                                                         │
│  redeemWinning() ── burnTokens ── transferUSDC          │
│                                                         │
│  Collateral: MockUSDC (ERC-20, 6 decimals)              │
└─────────────────────────────────────────────────────────┘
```

## Contract Details

### PredictionMarket.sol

The main contract that combines market creation, order execution, resolution, and redemption.

**Roles:**
- `owner` — Backend wallet. Can create markets, fill orders, cancel markets, set forwarder.
- `forwarder` — Chainlink CRE Forwarder address. Can call `onReport()` to resolve markets.
- Users — Sign EIP-712 orders off-chain. Approve USDC once. Never pay gas.

### Market Creation Flow

```
owner calls createMarket(questionHash, resolutionTimestamp)
  │
  ├── Validate: resolutionTimestamp > block.timestamp
  ├── Validate: questionHash not already used
  ├── Deploy: new OutcomeToken("YES-{id}", "YES-{id}")
  ├── Deploy: new OutcomeToken("NO-{id}", "NO-{id}")
  ├── Store: markets[marketCount] = Market{...}
  ├── Increment: marketCount++
  └── Emit: MarketCreated(marketId, questionHash, creator, yesToken, noToken, resolutionTimestamp)
```

### Order Execution Flow

```
User signs EIP-712 typed data off-chain:
  Order { marketId, outcome, to, shares, cost, deadline, nonce }

Owner calls fillOrder(order, signature):
  │
  ├── Verify: deadline not passed
  ├── Verify: outcome is Yes(1) or No(2)
  ├── Verify: to, shares, cost are non-zero
  ├── Recover signer from EIP-712 digest + signature
  ├── Verify: signer is valid (non-zero)
  ├── Consume nonce (prevents replay)
  ├── Transfer: USDC from signer → contract (cost amount)
  ├── Mint outcome tokens to recipient:
  │     If outcome=Yes: mint YES tokens to `to`, mint NO tokens to contract
  │     If outcome=No:  mint NO tokens to `to`, mint YES tokens to contract
  ├── Increment: totalCollateral += cost
  └── Emit: OrderFilled(marketId, buyer, outcome, shares, cost)
```

**Key invariant:** Both `shares` and `cost` are committed in the signed order. The backend cannot alter either value — the user signs exactly what they will pay and receive.

### Resolution Flow (CRE)

```
CRE Workflow cron fires → LLM determines outcome → generates DON-signed report

CRE Forwarder calls onReport(metadata, report):
  │
  ├── Verify: msg.sender == forwarder
  ├── Decode: (marketId, outcome) = abi.decode(report)
  ├── Validate: market is Open
  ├── Validate: outcome is Yes or No
  ├── Update: market.status = Resolved, market.outcome = outcome
  └── Emit: MarketResolved(marketId, outcome)
```

### Redemption Flow

```
User calls redeemWinning(marketId, amount):
  │
  ├── Verify: market is Resolved
  ├── Determine: winningToken = (outcome == Yes) ? yesToken : noToken
  ├── Verify: user has >= amount of winning tokens
  ├── Burn: winningToken.burn(user, amount)
  ├── Decrease: totalCollateral -= amount
  ├── Transfer: USDC from contract → user (amount)
  │     (1 winning share = 1 USDC, regardless of purchase price)
  └── Emit: WinningsRedeemed(marketId, user, amount)
```

### OutcomeToken.sol

Standard ERC-20 with 6 decimals (matching USDC). Mint and burn are restricted to the factory (PredictionMarket contract). YES and NO tokens are always minted in pairs — for every share the user receives, the contract holds the counterside.

### MockUSDC.sol

Test ERC-20 with 6 decimals and EIP-2612 permit support. Has a `faucet()` function for obtaining test tokens. Used as collateral for the prediction market.

### IReceiver.sol

Interface for Chainlink CRE report reception:
```solidity
function onReport(bytes calldata metadata, bytes calldata report) external;
```

## Events Reference

| Event | Indexed | Data |
|-------|---------|------|
| `MarketCreated` | marketId | questionHash, creator, yesToken, noToken, resolutionTimestamp |
| `OrderFilled` | marketId, buyer | outcome, shares, cost |
| `MarketResolved` | marketId | outcome |
| `MarketCancelled` | marketId | — |
| `WinningsRedeemed` | marketId, user | amount |

## EIP-712 Domain

```
name:              "PredictionMarket"
version:           "1"
chainId:           11155111 (Sepolia)
verifyingContract: <deployed address>
```

## Deployment

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
```

Deploy order:
1. MockUSDC (collateral token)
2. PredictionMarket (with MockUSDC address, forwarder address, owner address)

## Key Design Decisions

- **Gasless for users**: Users only sign; the backend wallet pays gas for `fillOrder`.
- **Both sides minted**: Buying YES also mints NO to the contract. This ensures 1:1 USDC backing.
- **No AMM on-chain**: Pricing is done off-chain by the backend's CPMM engine. The contract just executes signed orders.
- **CRE resolution**: Markets are resolved by the Chainlink DON, not by any single party.
