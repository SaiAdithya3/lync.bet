import { Card } from "../../components/ui/Card";
import { formatCompactCurrency } from "../../utils/format";

const MOCK_LEADERS = [
  { rank: 1, address: "0xabc...123", pnl: 45200, trades: 89 },
  { rank: 2, address: "0xdef...456", pnl: 38100, trades: 124 },
  { rank: 3, address: "0x789...abc", pnl: 29500, trades: 67 },
  { rank: 4, address: "0x111...222", pnl: 22100, trades: 156 },
  { rank: 5, address: "0x333...444", pnl: 18700, trades: 92 },
];

export function LeaderboardPage() {
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
              {MOCK_LEADERS.map((row) => (
                <tr key={row.rank} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium text-white">
                    {row.rank}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {row.address}
                  </td>
                  <td className={`py-3 pr-4 ${row.pnl >= 0 ? "text-yes" : "text-no"}`}>
                    {row.pnl >= 0 ? "+" : ""}
                    {formatCompactCurrency(row.pnl)}
                  </td>
                  <td className="py-3 text-muted-foreground">{row.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
