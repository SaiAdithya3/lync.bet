import { cre, Runner, type Runtime } from "@chainlink/cre-sdk"
import { z } from "zod"

// ── Piece 1: Config Schema ──────────────────────────────
// This defines what your workflow EXPECTS from config.staging.json
// Zod validates it at startup — if config is wrong, it fails fast

const configSchema = z.object({
  schedule: z.string(),   // cron expression like "* * * * *"
})

type Config = z.infer<typeof configSchema>

// ── Piece 2: The Callback ───────────────────────────────
// This is your actual logic. It runs every time the trigger fires.
// 
// runtime: gives you access to logging, time, secrets, and capabilities
// return: must be a string (CRE uses this as the workflow output)

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Hello from CRE!")
  runtime.log(`Current time: ${runtime.now().toISOString()}`)
  runtime.log(`My schedule is: ${runtime.config.schedule}`)
  return "Hello TEE - workflow complete"
}

// ── Piece 3: Init (wires trigger → callback) ────────────
// CRE calls this once at startup to register your handlers.
//
// CronCapability = fires on a schedule (like a cron job)
// Here similarly we will implement the HTTP and the EVM call capablilty
// cre.handler() = connects the trigger to your callback

function initWorkflow(config: Config) {
  const cron = new cre.capabilities.CronCapability()
  
  const trigger = cron.trigger({
    schedule: config.schedule,   // reads from config.staging.json
  })

  return [cre.handler(trigger, onCronTrigger)]
}

// ── Piece 4: Entry Point (boilerplate) ──────────────────
// Creates the WASM runner, validates config with your Zod schema,
// then hands off to initWorkflow. This is the same in every workflow.

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()