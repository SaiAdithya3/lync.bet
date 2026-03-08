import { useUIStore } from "../../stores/uiStore";
import { Button } from "../../components/ui/Button";

export function CreateMarketPage() {
  const { setOpenModal } = useUIStore();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Create a market</h1>
        <p className="mt-1 text-muted-foreground">
          Add a new prediction market for others to trade on
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground">
          Define your question, resolution criteria, and end date.
        </p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => setOpenModal("createMarket")}
        >
          Create market
        </Button>
      </div>
    </div>
  );
}
