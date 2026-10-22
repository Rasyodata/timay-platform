import { useEffect, useMemo, useRef, useState } from "react";
import { Table2, Plus, Search, ChevronDown, X, Database } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import ProjectTableCard from "@/components/projects/ProjectTableCard";
import { UsersAdminBody } from "@/components/admin/UsersRolesAdmin";
import AdresKartiEditor from "@/components/admin/AdresKartiEditor";
import YetkiKartiEditor from "@/components/admin/YetkiKartiEditor";
import type { View } from "@/App";

/**
 * Tablo Kayıt Ekle — aranabilir "Tablo Seç" kutusundan bir tablo seçilir,
 * seçilen tabloya göre kayıt eklenir/düzenlenir (ProjectTableCard).
 */
export default function TableRecordAdd({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { modules } = useModules();
  const sorted = useMemo(
    () => modules.filter((m) => (m.kind ?? "tablo") !== "evrak").sort((a, b) => a.code.localeCompare(b.code, "tr")),
    [modules],
  );
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const selected = sorted.find((m) => m.id === selectedId);
  const qn = q.trim().toLocaleLowerCase("tr");
  const filtered = qn ? sorted.filter((m) => `${m.code} ${m.name}`.toLocaleLowerCase("tr").includes(qn)) : sorted;

  const pick = (id: string) => { setSelectedId(id); setOpen(false); setQ(""); };

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <Table2 size={20} className="text-neon-blue" /> Tablo Kayıt Ekle
          </h2>
          <p className="mt-1 text-sm text-muted">Bir tablo arayıp seçin; seçilen tabloya göre kayıt ekleyin veya düzenleyin.</p>
          <button onClick={() => onNavigate("db-schema")} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-3 py-1.5 text-sm font-medium text-neon-blue transition hover:bg-neon-blue/20"><Database size={15} /> Veritabanı Şeması (tablolar · ilişkiler)</button>
        </div>
        <div className="flex items-end gap-2">
          {/* Aranabilir tablo seçici */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Tablo Ara / Seç</span>
            <div className="relative" ref={ref}>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={open ? q : (selected ? `${selected.code} · ${selected.name}` : "")}
                onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                onFocus={() => { setOpen(true); setQ(""); }}
                placeholder="Tablo adı veya kodu ara… (örn. Dava, T-0016)"
                className="w-[320px] max-w-[80vw] rounded-lg border border-line bg-base/60 py-2 pl-9 pr-14 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40"
              />
              {open && q ? (
                <button onClick={() => setQ("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-faint transition hover:text-ink"><X size={14} /></button>
              ) : null}
              <ChevronDown size={15} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint transition ${open ? "rotate-180" : ""}`} />
              {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-card animate-fade-in">
                  <p className="px-2 py-1.5 text-[11px] text-faint">{filtered.length} tablo</p>
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => pick(m.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-elevated ${m.id === selectedId ? "bg-elevated" : ""}`}
                    >
                      <span className="w-16 shrink-0 rounded border border-line bg-base/60 px-1 py-0.5 text-center font-mono text-[10px] text-muted">{m.code}</span>
                      <span className="flex-1 truncate text-sm text-ink">{m.name}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-faint">Eşleşen tablo yok.</p>}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate("builder")}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted transition hover:border-neon-blue/40 hover:text-ink"
          >
            <Plus size={15} /> Tablo Oluştur
          </button>
        </div>
      </header>

      {!selectedId ? (
        <div className="card grid place-items-center p-10 text-sm text-muted">Tablo bulunamadı.</div>
      ) : selectedId === "mod-T-0001" ? (
        // Kullanıcı Cari Kart = Kullanıcılar yönetimi (aynı veri, aynı alanlar)
        <UsersAdminBody />
      ) : selectedId === "mod-T-0003" ? (
        // Adres Kartı = kullanıcı kodu seç → ad otomatik
        <AdresKartiEditor />
      ) : selectedId === "mod-T-0030" ? (
        // Yetki Kartı = yetki tipi (kullanıcı/departman) cascading
        <YetkiKartiEditor />
      ) : (
        <ProjectTableCard moduleId={selectedId} />
      )}
    </div>
  );
}
