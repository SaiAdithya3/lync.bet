import { readContract, writeContract, getPublicClient } from "@wagmi/core";
import { config } from "../config/wagmi";
import { PREDICTION_MARKET_ADDRESS, hasPredictionMarketAddress } from "../config/api";

const PREDICTION_MARKET_ABI = [
  {
    type: "function",
    name: "collateralToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
] as const;

const COLLATERAL_TOKEN_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
] as const;

/**
 * Ensures the user has approved the PredictionMarket contract to spend at least `cost` USDC.
 * Calls collateralToken() on PredictionMarket, checks allowance, and approves if needed.
 * Call this before submitOrder.
 */
export async function ensureCollateralApproval(
  ownerAddress: `0x${string}`,
  cost: bigint
): Promise<void> {
  if (!hasPredictionMarketAddress || !PREDICTION_MARKET_ADDRESS) {
    throw new Error("VITE_PREDICTION_MARKET_ADDRESS is not configured");
  }

  const collateralToken = (await readContract(config, {
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: "collateralToken",
  })) as `0x${string}`;

  const allowance = (await readContract(config, {
    address: collateralToken,
    abi: COLLATERAL_TOKEN_ABI,
    functionName: "allowance",
    args: [ownerAddress, PREDICTION_MARKET_ADDRESS],
  })) as bigint;

  if (allowance >= cost) {
    return;
  }

  const hash = await writeContract(config, {
    address: collateralToken,
    abi: COLLATERAL_TOKEN_ABI,
    functionName: "approve",
    args: [PREDICTION_MARKET_ADDRESS, cost],
  });

  const publicClient = getPublicClient(config);
  if (publicClient) {
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
