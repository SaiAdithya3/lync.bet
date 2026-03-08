import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useUIStore } from "../../stores/uiStore";

type OutcomeRow = { id: string; label: string; resolutionDate: string };

export function CreateMarketModal() {
  const { openModal, setOpenModal } = useUIStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionTime, setResolutionTime] = useState("23:59");
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);

  const isOpen = openModal === "createMarket";
  const isMultiOutcome = outcomes.length > 0;

  const addOutcome = () => {
    setOutcomes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", resolutionDate: "" },
    ]);
  };

  const updateOutcome = (id: string, field: keyof OutcomeRow, value: string) => {
    setOutcomes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const removeOutcome = (id: string) => {
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTitle("");
    setDescription("");
    setCategory("Other");
    setResolutionDate("");
    setResolutionTime("23:59");
    setOutcomes([]);
    setOpenModal(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setOpenModal(null)}
      title="Create market"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Question"
          placeholder="e.g. Will Bitcoin reach $100k by end of 2025? Or: US forces enter Iran by..?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Each outcome is a separate Yes/No market. Define when <strong>Yes</strong> wins for that outcome.
          </p>
          <Input
            label="Resolution criteria (when does Yes win?)"
            placeholder="e.g. Resolves YES if the event occurs on or before the outcome’s resolution date."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-muted-foreground">
              Outcomes (one question, multiple Yes/No dates)
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={addOutcome}>
              + Add outcome
            </Button>
          </div>
          {outcomes.length === 0 ? (
            <p className="rounded-lg border border-border/60 bg-white/5 p-3 text-xs text-muted-foreground">
              Single resolution: use the date & time below. Or add multiple outcomes (e.g. March 7, March 14) so one question has several Yes/No markets.
            </p>
          ) : (
            <div className="space-y-3">
              {outcomes.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 bg-white/5 p-3 sm:flex-row sm:items-center sm:gap-3"
                >
                  <Input
                    placeholder="Label (e.g. March 7)"
                    value={o.label}
                    onChange={(e) => updateOutcome(o.id, "label", e.target.value)}
                  />
                  <input
                    type="date"
                    value={o.resolutionDate}
                    onChange={(e) => updateOutcome(o.id, "resolutionDate", e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="rounded-lg border border-border bg-neutral-bg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOutcome(o.id)}
                    className="shrink-0 text-no-muted hover:bg-no/10 hover:text-no"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isMultiOutcome && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resolution-date" className="mb-1 block text-sm text-muted-foreground">
                Resolution date <span className="text-no-muted">*</span>
              </label>
              <input
                id="resolution-date"
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                required={!isMultiOutcome}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-border bg-neutral-bg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Date when the market is evaluated and resolved.
              </p>
            </div>
            <div>
              <label htmlFor="resolution-time" className="mb-1 block text-sm text-muted-foreground">
                Resolution time (UTC)
              </label>
              <input
                id="resolution-time"
                type="time"
                value={resolutionTime}
                onChange={(e) => setResolutionTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-neutral-bg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Time of day (UTC) when the outcome is determined.
              </p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="category" className="mb-1 block text-sm text-muted-foreground">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-neutral-bg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="Crypto">Crypto</option>
            <option value="Politics">Politics</option>
            <option value="Tech">Tech</option>
            <option value="Business">Business</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <Button type="submit" variant="primary" fullWidth>
          Create market
        </Button>
      </form>
    </Modal>
  );
}
