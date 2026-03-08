/**
 * Turns raw thrown errors (e.g. from viem/wagmi) into short, user-friendly messages
 * for toasts and inline UI. Avoids dumping "Request Arguments", full stack, or long docs.
 */
export function consolidateErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (!raw || typeof raw !== "string") return fallback;

  const s = raw.trim();

  // User cancelled in wallet
  if (
    /user\s+rejected|user\s+denied|denied\s+transaction|rejected\s+the\s+request/i.test(
      s
    )
  ) {
    return "Transaction was cancelled.";
  }
  if (/MetaMask.*User denied|User denied transaction signature/i.test(s)) {
    return "Transaction was cancelled.";
  }

  // Take only the first line if the rest is technical (Request Arguments, etc.)
  const firstLine = s.split(/\n/)[0]?.trim() ?? "";
  if (firstLine.length > 0 && firstLine.length < 120) {
    // If first line is already a short, readable message, use it
    if (!/Request Arguments|contract call|0x[a-fA-F0-9]{40}/i.test(firstLine)) {
      return firstLine;
    }
  }

  // Known short phrases we can pass through
  if (/insufficient\s+funds/i.test(s)) return "Insufficient funds.";
  if (/network|connection|timeout/i.test(s)) return "Network error. Try again.";
  if (/revert|execution reverted/i.test(s)) return "Transaction failed.";
  if (/unauthorized|denied/i.test(s)) return "Action was denied.";

  return fallback;
}
