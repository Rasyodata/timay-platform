import { useMemo, useState } from "react";
import { History, Trash2 } from "lucide-react";
import { useAudit } from "@/context/AuditContext";
import { AUDIT_CATEGORY_META, type AuditCategory } from "@/types/audit";

const FILTERS: (AuditCategory | "all")[] = ["all", "proje", "modul", "yetki", "gorev", "kayit"];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AuditLog() {
  const { entries, clear } = useAudit();
  const [filter, setFilter] = useState<AuditCategory | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.category === filter)),
    [entries, filter],
  );

  const countFor = (f: AuditCategory | "all") =>
    f === "all" ? entries.length : entries.filter((e) => e.category === f).length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <History size={20} className="text-neon-blue" /> Denetim İzi (Audit Log)
          </h2>
          <p className="mt-1 text-sm text-muted">Kim, neyi, ne zaman değiştirdi — güvenlik ve izlenebilirlik için.</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clear}
            className="chip border-critical/40 bg-critical/10 text-critical transition hover:bg-critical/20"
          >
            <Trash2 size={14} /> Günlüğü Temizle
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          const label = f === "all" ? "Tümü" : AUDIT_CATEGORY_META[f].label;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip transition ${
                active ? "border-neon-blue/50 bg-neon-blue/15 text-ink" : "border-line bg-panel text-muted hover:text-ink"
              }`}
            >
              {f !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${AUDIT_CATEGORY_META[f].dot}`} />}
              {label}
              <span className="ml-0.5 rounded-full bg-white/5 px-1.5 text-[10px] nums">{countFor(f)}</span>
            </button>
          );
        })}
      </div>

      <section className="card p-0">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-sm text-muted">Kayıt yok.</div>
        ) : (
          <ul className="divide-y divide-line/60">
            {filtered.map((e) => {
              const cat = AUDIT_CATEGORY_META[e.category];
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cat.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip ${cat.className}`}>{cat.label}</span>
                      <span className="text-sm font-medium text-ink">{e.action}</span>
                      {e.target && <span className="text-sm text-muted">· {e.target}</span>}
                    </div>
                    {e.meta && <p className="mt-0.5 text-xs text-neon-amber nums">{e.meta}</p>}
                    <p className="mt-0.5 text-[11px] text-faint">
                      <span className="text-muted">{e.actor}</span> · {fmt(e.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
