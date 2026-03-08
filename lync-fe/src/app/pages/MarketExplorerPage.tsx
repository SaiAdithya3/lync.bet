import { useMarkets } from "../../hooks/useMarkets";
import { useUIStore } from "../../stores/uiStore";
import { MarketGrid } from "../../components/market/MarketGrid";
import { ActivityTicker } from "../../components/ui/ActivityTicker";
import { Input } from "../../components/ui/Input";

const CATEGORIES = ["all", "Crypto", "Politics", "Tech", "Business", "Other"];

export function MarketExplorerPage() {
  const markets = useMarkets();
  const { searchQuery, setSearchQuery, activeFilter, setActiveFilter } =
    useUIStore();

  const filtered = markets.filter((m) => {
    const matchSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory =
      activeFilter === "all" || m.category === activeFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-8">
      <header className="space-y-0.5">
        <h1 className="text-xl font-semibold text-white/95">
          Markets
        </h1>
        <p className="text-sm text-muted-foreground">
          Discover and trade on prediction markets
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <div className="min-w-0 flex-1 space-y-6">
          <section className="space-y-3">
            <Input
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    activeFilter === cat
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
          <section>
            <MarketGrid markets={filtered} />
          </section>
        </div>
        <aside className="w-full shrink-0 lg:w-72">
          <ActivityTicker />
        </aside>
      </div>
    </div>
  );
}
