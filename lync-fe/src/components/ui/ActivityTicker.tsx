import { useEffect, useState } from "react";
import { marketService } from "../../services/marketService";
import type { BackendActivityItem } from "../../services/marketService";

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

interface ActivityItem {
  id: string;
  marketTitle: string;
  side: string;
  amount: number;
  price: number;
  time: string;
}

export function ActivityTicker() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const marketTitles: Record<string, string> = {};

    const load = async () => {
      const trending = await marketService.getTrendingMarkets(5);
      if (cancelled) return;
      const all: Array<BackendActivityItem & { marketId: number }> = [];
      for (const m of trending) {
        marketTitles[m.id] = m.title;
        const activity = await marketService.getMarketActivity(m.id);
        if (cancelled) return;
        for (const a of activity) {
          all.push({ ...a, marketId: parseInt(m.id, 10) });
        }
      }
      const withTs = all.map((a) => ({
        ...a,
        sortTs: a.timestamp ? new Date(a.timestamp).getTime() : 0,
      }));
      const sorted = withTs.sort((a, b) => b.sortTs - a.sortTs).slice(0, 15);

      const mapped: ActivityItem[] = sorted.map((a, i) => ({
        id: `a-${a.marketId}-${a.txHash}-${i}`,
        marketTitle: marketTitles[String(a.marketId)] ?? "Market",
        side: a.token,
        amount: Math.round(a.cost / 1e6),
        price: a.priceCents,
        time: a.timestamp ? formatTime(a.timestamp) : "Just now",
      }));
      setItems(mapped);
    };

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <h3 className="border-b border-white/[0.06] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Recent activity
      </h3>
      <div className="flex max-h-64 flex-col overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No recent activity
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 text-xs last:border-0"
            >
              <span className="truncate text-muted-foreground">
                {item.marketTitle}
              </span>
              <span className={item.side === "YES" ? "text-yes-muted" : "text-no-muted"}>
                {item.side} ${item.amount} @ {item.price}¢
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
