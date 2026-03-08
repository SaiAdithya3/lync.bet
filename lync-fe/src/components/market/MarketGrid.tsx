import type { Market } from "../../types/market";
import { MarketCard } from "./MarketCard";
import { motion } from "framer-motion";

interface MarketGridProps {
  markets: Market[];
}

export function MarketGrid({ markets }: MarketGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {markets.map((market, i) => (
        <motion.div
          key={market.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <MarketCard market={market} />
        </motion.div>
      ))}
    </div>
  );
}
