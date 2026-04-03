"use client";

const STYLE_FILTERS = [
  "All",
  "Japanese",
  "Street",
  "Minimal",
  "Nature",
  "Retro",
  "Abstract",
  "Typography",
];

interface FilterBarProps {
  active: string;
  onChange: (filter: string) => void;
}

export default function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STYLE_FILTERS.map((filter) => {
        const isActive = active.toLowerCase() === filter.toLowerCase();
        return (
          <button
            key={filter}
            onClick={() => onChange(filter.toLowerCase())}
            className={`
              px-4 py-2 font-mono text-[11px] uppercase tracking-[1px]
              border transition-all duration-300
              ${isActive
                ? "border-accent text-accent bg-accent/[0.08]"
                : "border-bg3 text-fg3 hover:border-fg3 hover:text-fg2"
              }
            `}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
