import { useMarketStore } from "../../stores/marketStore";
import { useMarketExplorer } from "../../hooks/useMarketExplorer";
import { useUIStore } from "../../stores/uiStore";
import { MarketGrid } from "../../components/market/MarketGrid";
import { ActivityTicker } from "../../components/ui/ActivityTicker";
import { Input } from "../../components/ui/Input";

export function MarketExplorerPage() {
  const markets = useMarketStore((s) => s.markets);
  const { searchQuery, setSearchQuery, activeFilter, setActiveFilter } =
    useUIStore();
  const { categories, loading } = useMarketExplorer({
    searchQuery,
    activeFilter,
  });

  const categoryList = [
    { id: "all", label: "All" },
    ...categories.map((c) => ({ id: c.category, label: c.category })),
  ];
  if (categoryList.length === 1) {
    categoryList.push(
      { id: "general", label: "General" },
      { id: "crypto", label: "Crypto" },
      { id: "politics", label: "Politics" },
    );
  }

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
              {categoryList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveFilter(cat.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    activeFilter === cat.id
                      ? "bg-white/10 text-white"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading markets...</p>
            ) : (
              <MarketGrid markets={markets} />
            )}
          </section>
        </div>
        <aside className="w-full shrink-0 lg:w-72">
          <ActivityTicker />
        </aside>
      </div>
    </div>
  );
}
