import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { formatCompactCurrency } from "../../utils/format";
import { marketService } from "../../services/marketService";

const SCALE = 1e6;

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function LeaderboardPage() {
  const [data, setData] = useState<{
    leaderboard: Array<{
      rank: number;
      address: string;
      tradeCount: number;
      totalVolume: number;
      marketsTraded: number;
      totalProfit: number;
    }>;
    sortedBy: string;
  }>({ leaderboard: [], sortedBy: "volume" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketService.getLeaderboard({ sort: "profit", limit: 20 }).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="mt-1 text-muted-foreground">
          Top traders by P/L
        </p>
      </header>
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Address</th>
                <th className="pb-3 pr-4">P/L</th>
                <th className="pb-3">Trades</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((row) => (
                <tr key={row.address} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium text-white">
                    {row.rank}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {truncateAddress(row.address)}
                  </td>
                  <td className={`py-3 pr-4 ${row.totalProfit >= 0 ? "text-yes" : "text-no"}`}>
                    {row.totalProfit >= 0 ? "+" : ""}
                    {formatCompactCurrency(row.totalProfit / SCALE)}
                  </td>
                  <td className="py-3 text-muted-foreground">{row.tradeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>
    </div>
  );
}
