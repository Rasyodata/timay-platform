import { useState } from "react";
import { ChevronLeft, BookOpen, Plus, Pencil, Trash2, Save, X, Search, Tag } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import RichTextEditor from "@/components/common/RichTextEditor";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0064";
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const today = () => new Date().toISOString().slice(0, 10);
const DURUM_RENK: Record<string, string> = { "Yayında": "#1E7A46", "Taslak": "#8795A8", "Gözden Geçiriliyor": "#B5731A", "Arşiv": "#5A6B82" };

export default function PagesPage({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const mod = getModule(MOD);
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "new">("view");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [q, setQ] = useState("");

  if (!mod) return <div className="card p-5 text-sm text-muted">Doküman tablosu bulunamadı.</div>;
  const docs = mod.records as DynamicRecord[];
  const katOpts = (mod.fields.find((f) => f.code === "kategori")?.options ?? []) as string[];
  const durumOpts = (mod.fields.find((f) => f.code === "durum")?.options ?? []) as string[];
  const filtered = q ? docs.filter((d) => `${d.baslik} ${d.etiketler} ${d.kategori}`.toLowerCase().includes(q.toLowerCase())) : docs;
  const sel = docs.find((d) => d.id === selId) ?? docs[0];

  const set = (c: string, v: unknown) => setDraft((d) => ({ ...d, [c]: v }));
  const startEdit = () => { setDraft({ ...sel }); setMode("edit"); };
  const startNew = () => { setDraft({ baslik: "", kategori: katOpts[0] ?? "", icerik: "", sahibi: "", etiketler: "", durum: "Taslak" }); setMode("new"); };
  const save = () => {
    if (!String(draft.baslik ?? "").trim()) return;
    if (mode === "new") { addRecord(MOD, { ...draft, guncelleme: today() }); setSelId(null); }
    else if (sel) updateRecord(MOD, String(sel.id), { ...draft, guncelleme: today() });
    setMode("view");
  };
  const del = () => { if (sel) { deleteRecord(MOD, String(sel.id)); setSelId(null); setMode("view"); } };

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 md:p-6">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"><ChevronLeft size={14} /> Büro Yönetimi</button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><BookOpen size={22} className="text-neon-blue" /> Doküman / Wiki</h1>
          <p className="mt-1 text-sm text-muted">AppFlowy/Plane Pages tarzı · zengin-metin editörü ile kurumsal doküman ve wiki.</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Yeni Doküman</button>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sol liste */}
        <div className="card p-2">
          <div className="relative mb-2">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="w-full rounded-lg border border-line bg-base/60 py-2 pl-8 pr-2 text-sm text-ink outline-none focus:border-neon-blue/50" />
          </div>
          <div className="max-h-[560px] space-y-1 overflow-y-auto">
            {filtered.map((d) => {
              const active = sel && d.id === sel.id;
              return (
                <button key={d.id} onClick={() => { setSelId(String(d.id)); setMode("view"); }} className={`w-full rounded-lg border p-2.5 text-left transition ${active ? "border-neon-blue/50 bg-neon-blue/5" : "border-transparent hover:bg-elevated"}`}>
                  <p className="truncate text-sm font-semibold text-ink">{String(d.baslik || "(başlıksız)")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {d.kategori ? <span className="text-[10px] text-muted">{String(d.kategori)}</span> : null}
                    <span className="h-1 w-1 rounded-full bg-faint" />
                    <span className="text-[10px] font-medium" style={{ color: DURUM_RENK[String(d.durum)] ?? "#8795A8" }}>{String(d.durum || "")}</span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="p-4 text-center text-xs text-muted">Doküman yok.</p>}
          </div>
        </div>

        {/* Sağ görüntüle / düzenle */}
        <div className="card p-5">
          {mode === "view" && sel && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-ink">{String(sel.baslik)}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {sel.kategori ? <span className="rounded-full border border-line px-2 py-0.5">{String(sel.kategori)}</span> : null}
                    <span style={{ color: DURUM_RENK[String(sel.durum)] ?? "#8795A8" }}>● {String(sel.durum)}</span>
                    {sel.sahibi ? <span>Sahip: {String(sel.sahibi)}</span> : null}
                    {sel.guncelleme ? <span>Güncelleme: {dmy(String(sel.guncelleme))}</span> : null}
                  </div>
                  {sel.etiketler ? <p className="mt-1.5 flex items-center gap-1 text-[11px] text-faint"><Tag size={11} /> {String(sel.etiketler)}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={startEdit} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20"><Pencil size={13} /> Düzenle</button>
                  <button onClick={del} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-critical/10 hover:text-critical" title="Sil"><Trash2 size={14} /></button>
                </div>
              </div>
              <hr className="my-4 border-line" />
              <div className="rich-content max-w-none text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: String(sel.icerik || "<p class='text-muted'>İçerik yok.</p>") }} />
            </>
          )}

          {(mode === "edit" || mode === "new") && (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <input value={String(draft.baslik ?? "")} onChange={(e) => set("baslik", e.target.value)} placeholder="Doküman başlığı" className="flex-1 rounded-lg border border-line bg-base/60 px-3 py-2 text-base font-semibold text-ink outline-none focus:border-neon-blue/50" />
                <button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Save size={14} /> Kaydet</button>
                <button onClick={() => setMode("view")} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated"><X size={16} /></button>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <label className="block"><span className="mb-1 block text-xs text-muted">Kategori</span>
                  <select value={String(draft.kategori ?? "")} onChange={(e) => set("kategori", e.target.value)} className="w-full rounded-lg border border-line bg-base/60 px-2 py-1.5 text-sm text-ink outline-none"><option value="">—</option>{katOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Durum</span>
                  <select value={String(draft.durum ?? "")} onChange={(e) => set("durum", e.target.value)} className="w-full rounded-lg border border-line bg-base/60 px-2 py-1.5 text-sm text-ink outline-none"><option value="">—</option>{durumOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Sahibi</span>
                  <input value={String(draft.sahibi ?? "")} onChange={(e) => set("sahibi", e.target.value)} className="w-full rounded-lg border border-line bg-base/60 px-2 py-1.5 text-sm text-ink outline-none" /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Etiketler</span>
                  <input value={String(draft.etiketler ?? "")} onChange={(e) => set("etiketler", e.target.value)} placeholder="virgülle" className="w-full rounded-lg border border-line bg-base/60 px-2 py-1.5 text-sm text-ink outline-none" /></label>
              </div>
              <RichTextEditor key={mode === "new" ? "new" : String(sel?.id)} value={String(draft.icerik ?? "")} onChange={(html) => set("icerik", html)} />
            </>
          )}

          {mode === "view" && !sel && <p className="py-10 text-center text-sm text-muted">Soldan bir doküman seçin veya "Yeni Doküman" oluşturun.</p>}
        </div>
      </div>
    </div>
  );
}
