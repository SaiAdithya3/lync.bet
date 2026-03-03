import {
  cre,
  Runner,
  HTTPClient,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type NodeRuntime,
  type HTTPSendRequester,
  type SecretsProvider,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// ── Config Schema ───────────────────────────────────────
const configSchema = z.object({
  schedule: z.string(),
  inputData: z.string(),
  apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

// ── Deterministic Hash ──────────────────────────────────
function deterministicHash(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return combined.toString(16).padStart(16, "0")
}

// ── Output Type ─────────────────────────────────────────
interface ConfidentialOutput {
  workflowId: string
  runId: string
  inputCommitment: string
  result: string
  decidedAt: string
  codeVersion: string
}

// ── Fetch Live Data (high-level pattern) ────────────────
const fetchMarketData = (sendRequester: HTTPSendRequester, config: Config): string => {
  const response = sendRequester.sendRequest({
    url: config.apiUrl,
    method: "GET" as const,
  }).result()

  return new TextDecoder().decode(response.body)
}

// ── Call LLM (low-level pattern) ────────────────────────
// apiKey is passed IN as an argument, not fetched inside
const callLLM = (nodeRuntime: NodeRuntime<Config>, apiKey: string): string => {
  const bodyObj = {
    contents: [
      {
        parts: [
          {
            text: `You are a prediction market resolver. Determine the outcome.\n\nQuestion: ${nodeRuntime.config.inputData}\n\nRespond ONLY with JSON: {"outcome": "YES", "confidence": 0.95, "reasoning": "one sentence"}`,
          },
        ],
      },
    ],
  }

  const bodyBytes = new TextEncoder().encode(JSON.stringify(bodyObj))
  const body = Buffer.from(bodyBytes).toString("base64")

  const httpClient = new HTTPClient()
  const resp = httpClient.sendRequest(nodeRuntime, {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    cacheSettings: {
      store: true,
      maxAge: "60s",
    },
  }).result()

  nodeRuntime.log(`[LLM] Status: ${resp.statusCode}`)
  const responseBody = new TextDecoder().decode(resp.body)
  nodeRuntime.log(`[LLM] Response: ${responseBody}`)

  if (!ok(resp)) {
    throw new Error(`LLM request failed: ${resp.statusCode}`)
  }

  const parsed = JSON.parse(responseBody)
  return parsed.candidates[0].content.parts[0].text
}

const computeConfidential = (
  input: string,
  marketData: string
): ConfidentialOutput => {
  const inputCommitment = deterministicHash(input)
  const evidenceHash = deterministicHash(marketData)
  const result = deterministicHash(input + "::" + marketData)

  return {
    workflowId: "hello-confidential-v1",
    runId: `run-${deterministicHash(input + "::" + evidenceHash)}`,
    inputCommitment,
    result,
    decidedAt: new Date().toISOString(),
    codeVersion: "0.3.0",
  }
}

// ── Trigger Callback ────────────────────────────────────
const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== Hello Confidential v3 — With LLM ===")

  // Step 1: Fetch live market data
  runtime.log("[STEP 1] Fetching market data...")
  const httpClient = new HTTPClient()
  const marketData = httpClient
    .sendRequest(
      runtime,
      fetchMarketData,
      consensusIdenticalAggregation<string>()
    )(runtime.config)
    .result()
  runtime.log(`[STEP 1] Done: ${marketData}`)

  // Step 2: Get secret at DON level, then pass to node mode
  runtime.log("[STEP 2] Calling LLM...")
  const secret = runtime.getSecret({ id: "GEMINI_API_KEY" }).result()

  const llmResponse = runtime.runInNodeMode(
    callLLM,
    consensusIdenticalAggregation<string>()
  )(secret.value).result()
  runtime.log(`[STEP 2] LLM says: ${llmResponse}`)

  // Step 3: Hash everything
  runtime.log("[STEP 3] Running confidential computation...")
  const result = computeConfidential(
    runtime.config.inputData,
    llmResponse
  )
  runtime.log(`Output: ${JSON.stringify(result)}`)

  return JSON.stringify(result)
}

// ── Init + Entry ────────────────────────────────────────
function initWorkflow(config: Config, secretsProvider: SecretsProvider) {
  const cron = new cre.capabilities.CronCapability()
  const trigger = cron.trigger({ schedule: config.schedule })
  return [cre.handler(trigger, onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()