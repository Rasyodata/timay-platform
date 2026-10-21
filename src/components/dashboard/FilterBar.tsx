import { Search } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { categoryMeta } from "@/data/mockData";
import type { Category } from "@/types";

const order: (Category | "all")[] = ["all", "proje", "yatirim", "ortaklik", "startup", "fona-acik"];

export default function FilterBar() {
  const { filter, setFilter, query, setQuery, projects, filteredProjects } = useDashboard();

  const countFor = (key: Category | "all") =>
    key === "all" ? projects.length : projects.filter((p) => p.category === key).length;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {order.map((key) => {
          const meta = categoryMeta[key];
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`chip transition-colors ${
                active
                  ? "border-neon-blue/50 bg-neon-blue/15 text-ink shadow-glow-blue"
                  : "border-line bg-panel text-muted hover:border-line hover:bg-elevated hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
              <span className="ml-0.5 rounded-full bg-white/5 px-1.5 text-[10px] text-muted nums">
                {countFor(key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative w-full lg:w-72">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Proje veya konum ara…"
          className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40"
        />
        {query && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted nums">
            {filteredProjects.length} sonuç
          </span>
        )}
      </div>
    </div>
  );
}
