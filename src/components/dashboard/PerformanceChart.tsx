import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { currency, currencyFull } from "@/lib/format";

// Validated categorical series colors (CVD + contrast safe on the dark surface).
const SERIES = {
  getiri: { key: "getiri", label: "Aylık Yatırım Getirisi", color: "#3987e5" },
  degerleme: { key: "degerleme", label: "Proje Değerleme Trendi", color: "#199e70" },
} as const;

const RANGES = [
  { key: "6", label: "6A" },
  { key: "12", label: "12A" },
] as const;

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-elevated/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}:{" "}
          <span className="font-semibold text-ink nums">{currencyFull(p.value as number)}</span>
        </p>
      ))}
    </div>
  );
}

export default function PerformanceChart() {
  const { performance } = useDashboard();
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("12");

  const data = range === "6" ? performance.slice(-6) : performance;

  return (
    <section className="card p-5">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Performans Grafikleri</h3>
          <p className="text-xs text-muted">Aylık getiri & proje değerleme trendi</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend — always present for ≥2 series, identity never color-alone */}
          <div className="flex items-center gap-3 text-xs text-muted">
            {Object.values(SERIES).map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
          {/* Time-range filter (one row above the chart) */}
          <div className="flex rounded-lg border border-line bg-panel p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  range === r.key ? "bg-elevated text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            {Object.values(SERIES).map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="#2c2c2a" strokeDasharray="0" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={{ stroke: "#243049" }}
            tick={{ fill: "#8b98b0", fontSize: 11 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#8b98b0", fontSize: 11 }}
            width={56}
            tickFormatter={(v) => currency(v as number)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey={SERIES.degerleme.key}
            name={SERIES.degerleme.label}
            stroke={SERIES.degerleme.color}
            strokeWidth={2}
            fill={`url(#fill-${SERIES.degerleme.key})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#111827" }}
          />
          <Area
            type="monotone"
            dataKey={SERIES.getiri.key}
            name={SERIES.getiri.label}
            stroke={SERIES.getiri.color}
            strokeWidth={2}
            fill={`url(#fill-${SERIES.getiri.key})`}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#111827" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
