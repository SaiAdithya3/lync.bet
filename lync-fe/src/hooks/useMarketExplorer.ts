import { useEffect, useState, useCallback } from "react";
import { useMarketStore } from "../stores/marketStore";
import { marketService, type BackendCategory } from "../services/marketService";

export function useMarketExplorer(params: {
  searchQuery: string;
  activeFilter: string;
}) {
  const { setMarkets } = useMarketStore();
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    const cats = await marketService.getCategories();
    setCategories(cats);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (params.searchQuery.trim()) {
        const markets = await marketService.searchMarkets(params.searchQuery);
        if (!cancelled) setMarkets(markets);
      } else {
        const { markets } = await marketService.getMarkets({
          status: "open",
          category: params.activeFilter === "all" ? undefined : params.activeFilter,
          limit: 100,
        });
        if (!cancelled) setMarkets(markets);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [params.searchQuery, params.activeFilter, setMarkets]);

  return { categories, loading };
}
