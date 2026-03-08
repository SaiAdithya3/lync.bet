import { type ReactNode } from "react";
import { clsx } from "clsx";

interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div className={clsx("w-full", className)}>
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeId === tab.id
                ? "bg-primary-500 text-white"
                : "text-muted-foreground hover:bg-white/10 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === activeId)?.content}
    </div>
  );
}
