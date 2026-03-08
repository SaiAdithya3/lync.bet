import type { TradeSide } from "../../types/trade";
import { clsx } from "clsx";

interface SideSelectorProps {
  value: TradeSide;
  onChange: (side: TradeSide) => void;
  yesPriceCents?: string;
  noPriceCents?: string;
  /** Use full-filled green/red on detail/order page */
  filled?: boolean;
}

export function SideSelector({
  value,
  onChange,
  yesPriceCents,
  noPriceCents,
  filled = false,
}: SideSelectorProps) {
  const yesLabel = yesPriceCents != null ? `Yes ${yesPriceCents}` : "Yes";
  const noLabel = noPriceCents != null ? `No ${noPriceCents}` : "No";

  if (filled) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("YES")}
          className={clsx(
            "rounded-lg py-2.5 text-sm font-medium text-white transition-colors",
            value === "YES"
              ? "bg-yes hover:bg-yes-muted"
              : "bg-white/10 text-muted-foreground hover:bg-yes/20 hover:text-yes"
          )}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange("NO")}
          className={clsx(
            "rounded-lg py-2.5 text-sm font-medium text-white transition-colors",
            value === "NO"
              ? "bg-no hover:bg-no-muted"
              : "bg-white/10 text-muted-foreground hover:bg-no/20 hover:text-no"
          )}
        >
          {noLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange("YES")}
        className={clsx(
          "rounded-lg border-2 py-2.5 text-sm font-medium transition-colors",
          value === "YES"
            ? "border-yes/50 bg-yes/15 text-yes"
            : "border-white/10 bg-white/5 text-muted-foreground hover:border-yes/30 hover:text-yes-muted"
        )}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("NO")}
        className={clsx(
          "rounded-lg border-2 py-2.5 text-sm font-medium transition-colors",
          value === "NO"
            ? "border-no/50 bg-no/15 text-no"
            : "border-white/10 bg-white/5 text-muted-foreground hover:border-no/30 hover:text-no-muted"
        )}
      >
        {noLabel}
      </button>
    </div>
  );
}
