import { Button } from "../ui/Button";

interface SubmitTradeButtonProps {
  side: "YES" | "NO";
  amount: number;
  priceCents?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

export function SubmitTradeButton({
  side,
  amount,
  priceCents,
  disabled,
  loading,
  onClick,
}: SubmitTradeButtonProps) {
  const label = priceCents ? `Buy ${side} ${priceCents}` : `Buy ${side}`;
  return (
    <Button
      variant={side === "YES" ? "yesFilled" : "noFilled"}
      fullWidth
      disabled={disabled || amount <= 0 || loading}
      onClick={onClick}
    >
      {loading ? "Processing..." : label}
    </Button>
  );
}
