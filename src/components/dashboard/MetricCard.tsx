import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";
import { compact, currency, percent } from "@/lib/format";
import type { Metric } from "@/types";

const accentMap = {
  emerald: { color: "#10b981", glow: "shadow-glow-emerald", text: "text-neon-emerald" },
  blue: { color: "#3b82f6", glow: "shadow-glow-blue", text: "text-neon-blue" },
  violet: { color: "#8b5cf6", glow: "shadow-glow-violet", text: "text-neon-violet" },
  amber: { color: "#f59e0b", glow: "shadow-glow-emerald", text: "text-neon-amber" },
} as const;

export default function MetricCard({ metric }: { metric: Metric }) {
  const a = accentMap[metric.accent];
  const up = metric.delta >= 0;
  const display =
    metric.format === "currency"
      ? currency(metric.value)
      : metric.format === "percent"
        ? percent(metric.value, false)
        : compact(metric.value);

  return (
    <article className="card card-sheen group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-card">
      {/* accent rail */}
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl opacity-70"
        style={{ background: `linear-gradient(180deg, ${a.color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink nums md:text-3xl">
            {display}
          </p>
        </div>
        <span
          className={`chip ${
            up
              ? "border-good/30 bg-good/10 text-good"
              : "border-critical/30 bg-critical/10 text-critical"
          }`}
        >
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {percent(metric.delta)}
        </span>
      </div>

      <div className="mt-3 -mb-1">
        <Sparkline
          data={metric.spark}
          color={a.color}
          gradientId={`spark-${metric.id}`}
        />
      </div>
    </article>
  );
}
