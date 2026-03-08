# CRE Workflow — Process Specification

## Overview

The CRE (Confidential Runtime Environment) workflow is a TypeScript program that runs on the Chainlink Decentralized Oracle Network (DON). It resolves prediction markets by fetching live data, calling an LLM for judgment, and writing the outcome on-chain through a DON-signed report.

## Workflow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 Chainlink DON (4/5 BFT nodes)                 │
│                                                              │
│  ┌────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐  │
│  │  Cron  │───▶│  Fetch   │───▶│   LLM    │───▶│ Report  │  │
│  │Trigger │    │  Data    │    │  Gemini  │    │ + Write │  │
│  └────────┘    └──────────┘    └──────────┘    └────┬────┘  │
│                                                      │       │
└──────────────────────────────────────────────────────┼───────┘
                                                       │
                                                       ▼ onReport()
                                              ┌─────────────────┐
                                              │ PredictionMarket │
                                              │    (on-chain)    │
                                              └─────────────────┘
```

## Execution Steps — Detailed

### Step 1: Cron Trigger

The workflow fires on a configurable schedule (default: every minute).

```typescript
const cron = new cre.capabilities.CronCapability()
const trigger = cron.trigger({ schedule: config.schedule })
```

### Step 2: Fetch Market Data

HTTP request to an external API (e.g., CoinGecko) for live price data. Runs on all DON nodes with BFT consensus — ensures all nodes agree on the same data.

```typescript
const httpClient = new HTTPClient()
const marketData = httpClient.sendRequest(runtime, fetchMarketData, consensusIdenticalAggregation())
```

### Step 3: Call LLM for Resolution

Calls Google Gemini 2.5 Flash Lite with the market question and live data. Runs in **node mode** (single execution) with response caching for consensus.

```
Prompt: "You are a prediction market resolver. Determine the outcome.
         Question: {config.inputData}
         Respond ONLY with JSON: {"outcome": "YES", "confidence": 0.95, "reasoning": "one sentence"}"
```

The API key is fetched from the DON's encrypted secrets store:
```typescript
const secret = runtime.getSecret({ id: "GEMINI_API_KEY" })
```

### Step 4: Parse Outcome

The LLM response is parsed to extract YES (1) or NO (2). Handles both JSON and raw text responses. If the outcome cannot be determined, the workflow exits without writing on-chain.

### Step 5: Encode Report

ABI-encode the resolution data for the EVM:
```typescript
encodeAbiParameters(
  parseAbiParameters("uint256 marketId, uint8 outcome"),
  [marketId, outcome]
)
```

### Step 6: Generate DON-Signed Report

The encoded payload is signed by the DON using ECDSA + keccak256. This creates a report that the on-chain forwarder contract can verify.

```typescript
runtime.report({
  encodedPayload: hexToBase64(encodedPayload),
  encoderName: "evm",
  signingAlgo: "ecdsa",
  hashingAlgo: "keccak256",
})
```

### Step 7: Write to Chain

The signed report is sent to the PredictionMarket contract via the CRE Forwarder. The forwarder calls `onReport(metadata, report)` which decodes the marketId and outcome, then resolves the market.

```typescript
const evmClient = new EVMClient(network.chainSelector.selector)
evmClient.writeReport(runtime, {
  receiver: config.predictionMarketAddress,
  report: reportResponse,
  gasConfig: { gasLimit: "500000" },
})
```

## Configuration

### Workflow Config (config.staging.json)

```json
{
  "schedule": "* * * * *",
  "inputData": "Polymarket:Will-BTC-hit-100k-by-2025-12-31",
  "apiUrl": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
  "predictionMarketAddress": "0x45e7911Af8c31bDeDf8A586BeEd8efEcACEb9c37",
  "marketId": "0",
  "chainSelectorName": "ethereum-testnet-sepolia"
}
```

| Field | Description |
|-------|-------------|
| `schedule` | Cron expression (e.g., `* * * * *` = every minute) |
| `inputData` | The prediction market question for the LLM |
| `apiUrl` | External data source URL |
| `predictionMarketAddress` | On-chain contract address |
| `marketId` | Which market to resolve (numeric string) |
| `chainSelectorName` | Target chain (e.g., `ethereum-testnet-sepolia`) |

### Secrets (secrets.yaml)

```yaml
secretsNames:
  GEMINI_API_KEY:
    - GEMINI_API_KEY_ALL
```

The actual secret value is stored in the `.env` file and uploaded to the DON's encrypted secrets store during deployment.

### Project Config (project.yaml)

Defines RPC endpoints for each target environment:
```yaml
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com
```

## Setup & Deployment — Step by Step

### Prerequisites

1. Install the CRE CLI:
   ```bash
   npm install -g @chainlink/cre-cli
   # or
   curl -sSL https://raw.githubusercontent.com/smartcontractkit/cre-cli/main/install.sh | bash
   ```

2. Install Bun (required for TypeScript compilation):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

### Step 1: Install Dependencies

```bash
cd hello-tee/my-workflow
bun install
```

This runs `cre-setup` as a postinstall hook, which generates TypeScript type definitions.

### Step 2: Configure Environment

```bash
cd hello-tee
cp .env.example .env
# Edit .env with your values:
#   CRE_ETH_PRIVATE_KEY=<your-deployer-private-key>
#   CRE_TARGET=staging-settings
#   GEMINI_API_KEY_ALL=<your-gemini-api-key>
```

### Step 3: Configure the Workflow

Edit `my-workflow/config/config.staging.json`:
- Set `predictionMarketAddress` to your deployed contract
- Set `marketId` to the market you want to resolve
- Set `inputData` to the market question
- Adjust `schedule` as needed (production: less frequent, e.g., `0 * * * *` for hourly)

### Step 4: Simulate Locally

```bash
cd hello-tee
cre workflow simulate my-workflow --target staging-settings
```

This runs the workflow locally, making real HTTP/LLM calls but skipping the on-chain write. Check the logs for:
- `[STEP 1]` — Data fetch result
- `[STEP 2]` — LLM response
- `[STEP 3]` — Parsed outcome
- `[STEP 4]` — Encoded payload
- `[STEP 5]` — Report signed
- `[STEP 6]` — TX hash (will be zeroed in simulation)

### Step 5: Build for Deployment

```bash
cre workflow build my-workflow --target staging-settings
```

This compiles the TypeScript to a WASM binary that runs on the DON.

### Step 6: Deploy to DON

```bash
cre workflow deploy my-workflow --target staging-settings
```

This:
1. Uploads the WASM binary to the DON
2. Registers the workflow in the Workflow Registry
3. Uploads encrypted secrets
4. Starts the cron trigger

### Step 7: Monitor

```bash
cre workflow logs my-workflow --target staging-settings --follow
```

### Updating a Deployed Workflow

```bash
# Edit config or code, then:
cre workflow update my-workflow --target staging-settings
```

### Pausing / Removing

```bash
cre workflow pause my-workflow --target staging-settings
cre workflow remove my-workflow --target staging-settings
```

## Adding a New Market for Resolution

To resolve a new market, you need a new workflow config (or update the existing one):

1. Create a new config file (e.g., `config/config.market-1.json`):
   ```json
   {
     "schedule": "0 */6 * * *",
     "inputData": "Will ETH reach $10k by June 2026?",
     "apiUrl": "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
     "predictionMarketAddress": "0x45e7911Af8c31bDeDf8A586BeEd8efEcACEb9c37",
     "marketId": "1",
     "chainSelectorName": "ethereum-testnet-sepolia"
   }
   ```

2. Add a target in `workflow.yaml`:
   ```yaml
   market-1-settings:
     user-workflow:
       workflow-name: "workflow-market-1"
     workflow-artifacts:
       workflow-path: "./main.ts"
       config-path: "./config/config.market-1.json"
       secrets-path: "../secrets.yaml"
   ```

3. Add RPC config in `project.yaml`:
   ```yaml
   market-1-settings:
     rpcs:
       - chain-name: ethereum-testnet-sepolia
         url: https://ethereum-sepolia-rpc.publicnode.com
   ```

4. Deploy: `cre workflow deploy my-workflow --target market-1-settings`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Network not found` | Check `chainSelectorName` matches a valid CRE chain name |
| `LLM request failed: 429` | Rate limited — increase `cacheSettings.maxAge` or reduce schedule frequency |
| `Report signed but TX failed` | Check forwarder address is set correctly on the contract (`setForwarder`) |
| `Outcome = 0 (unresolved)` | LLM couldn't determine outcome — check the question phrasing |
| `GEMINI_API_KEY not found` | Ensure the secret name in code matches `secrets.yaml` |
