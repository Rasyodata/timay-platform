import { useEffect } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Download, FileText, MapPin, Users, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { categoryMeta, statusMeta } from "@/data/mockData";
import { currency, currencyFull, deadlineLabel, percent } from "@/lib/format";

export default function ProjectDrawer() {
  const { selected, closeProject, joinProject, requestReport } = useDashboard();

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeProject();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, closeProject]);

  const open = Boolean(selected);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeProject}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Slide-over panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-panel shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        {selected && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${categoryMeta[selected.category].dot}`} />
                  <span className="text-xs text-muted">{selected.id}</span>
                  <span className={`chip ${statusMeta[selected.status].className}`}>
                    {statusMeta[selected.status].label}
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-semibold text-ink">{selected.name}</h2>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <MapPin size={12} /> {selected.location}
                </p>
              </div>
              <button
                onClick={closeProject}
                className="rounded-lg border border-line p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Toplanan Fon", value: currencyFull(selected.raised), tone: "text-neon-emerald" },
                  { label: "Hedef Fon", value: currencyFull(selected.target), tone: "text-ink" },
                  { label: "Yıllık Getiri", value: percent(selected.roi), tone: "text-good" },
                  { label: "Kalan Süre", value: deadlineLabel(selected.deadline), tone: "text-ink" },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-line/60 bg-white/[0.02] p-3">
                    <p className="text-xs text-muted">{k.label}</p>
                    <p className={`mt-1 text-sm font-semibold nums ${k.tone}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Funding progress */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted">Fon Doluluk Oranı</span>
                  <span className="font-semibold text-ink nums">
                    %{Math.round((selected.raised / selected.target) * 100)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-violet"
                    style={{ width: `${Math.min(100, (selected.raised / selected.target) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Valuation trend */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Değerleme Trendi
                </p>
                <div className="rounded-xl border border-line/60 bg-white/[0.02] p-2">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={selected.trend} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                      <defs>
                        <linearGradient id="drawer-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#199e70" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#199e70" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="i" hide />
                      <Tooltip
                        cursor={{ stroke: "#199e70", strokeDasharray: "4 4" }}
                        contentStyle={{
                          background: "#1a2335",
                          border: "1px solid #243049",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#8b98b0" }}
                        formatter={(v: number) => [currency(v * 1000), "Değer"]}
                        labelFormatter={() => "Dönem"}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="#199e70"
                        strokeWidth={2}
                        fill="url(#drawer-trend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Partners */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  <Users size={13} /> Ortaklar
                </p>
                <ul className="space-y-2">
                  {selected.partners.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-muted">{p.role}</p>
                      </div>
                      <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet nums">
                        %{Math.round(p.share * 100)} pay
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Documents */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  <FileText size={13} /> Dokümanlar
                </p>
                <ul className="space-y-2">
                  {selected.docs.map((d) => (
                    <li
                      key={d.id}
                      className="group flex items-center gap-3 rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neon-blue/10 text-neon-blue">
                        <FileText size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                        <p className="text-xs text-muted">
                          {d.type} · {(d.sizeKb / 1024).toFixed(1)} MB · {d.updatedAt}
                        </p>
                      </div>
                      <button
                        className="rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-elevated hover:text-ink group-hover:opacity-100"
                        aria-label="İndir"
                      >
                        <Download size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 border-t border-line p-4">
              <button
                onClick={() => joinProject(selected.id)}
                disabled={selected.status === "tamamlandi"}
                className="flex-1 rounded-xl bg-neon-blue py-2.5 text-sm font-semibold text-white transition hover:bg-neon-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selected.status === "tamamlandi" ? "Proje Tamamlandı" : "Projeye Katıl"}
              </button>
              <button
                onClick={() => requestReport(selected.id)}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-elevated"
              >
                Rapor Al
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
