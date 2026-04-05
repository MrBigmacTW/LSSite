"use client";

interface FilterBarProps {
  active: string;
  onChange: (filter: string) => void;
  styles?: { id: string; name: string }[];
}

export default function FilterBar({ active, onChange, styles }: FilterBarProps) {
  // "All" 永遠在最前面，其餘從 DB 來
  const filters = [
    { id: "all", label: "All" },
    ...(styles || []).map((s) => ({ id: s.id, label: s.name })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => {
        const isActive = active.toLowerCase() === f.id.toLowerCase();
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id.toLowerCase())}
            className={`
              px-4 py-2 font-mono text-[11px] uppercase tracking-[1px]
              border transition-all duration-300
              ${isActive
                ? "border-accent text-accent bg-accent/[0.08]"
                : "border-bg3 text-fg3 hover:border-fg3 hover:text-fg2"
              }
            `}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
