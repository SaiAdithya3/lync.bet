import { useEffect, useState } from "react";
import activityData from "../../data/mockActivity.json";

interface ActivityItem {
  id: string;
  marketTitle: string;
  side: string;
  amount: number;
  price: number;
  time: string;
}

const initialActivity = activityData as ActivityItem[];

export function ActivityTicker() {
  const [items, setItems] = useState<ActivityItem[]>(initialActivity);

  useEffect(() => {
    const interval = setInterval(() => {
      const sides = ["YES", "NO"];
      const markets = [
        "Bitcoin $100k by 2025",
        "Fed rate cut March 2025",
        "OpenAI GPT-5 in 2025",
      ];
      const newItem: ActivityItem = {
        id: `a-${Date.now()}`,
        marketTitle: markets[Math.floor(Math.random() * markets.length)],
        side: sides[Math.floor(Math.random() * 2)],
        amount: Math.floor(Math.random() * 200) + 10,
        price: Math.floor(Math.random() * 40) + 30,
        time: "Just now",
      };
      setItems((prev) => [newItem, ...prev].slice(0, 15));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <h3 className="border-b border-white/[0.06] px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Recent activity
      </h3>
      <div className="flex max-h-64 flex-col overflow-y-auto">
        {items.map((item) => (
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
        ))}
      </div>
    </div>
  );
}
