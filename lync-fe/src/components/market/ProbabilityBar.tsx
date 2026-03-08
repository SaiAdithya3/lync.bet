import { formatPercentage } from "../../utils/probability";

interface ProbabilityBarProps {
  yesProbability: number;
  noProbability: number;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProbabilityBar({
  yesProbability,
  noProbability,
  showLabels = true,
  compact = false,
  className = "",
}: ProbabilityBarProps) {
  const yesPct = Math.round(yesProbability * 100);
  const noPct = Math.round(noProbability * 100);

  return (
    <div className={className}>
      <div className={`flex w-full overflow-hidden rounded-full bg-white/5 ${compact ? "h-1" : "h-1.5"}`}>
        <div
          className="bg-yes/70 transition-all duration-300"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-no/70 transition-all duration-300"
          style={{ width: `${noPct}%` }}
        />
      </div>
      {showLabels && (
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span className="text-yes-muted">Yes {formatPercentage(yesProbability)}</span>
          <span className="text-no-muted">No {formatPercentage(noProbability)}</span>
        </div>
      )}
    </div>
  );
}
