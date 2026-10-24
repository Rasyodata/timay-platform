import { useState, useEffect } from "react";
import {
  Plus, Trash2, X, ChevronLeft, ChevronRight, Printer, CheckCircle2, Lightbulb,
  AlertTriangle, Users, Banknote, Shield, Sparkles, AlertOctagon, ListChecks, FileText, Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useAudit } from "@/context/AuditContext";

// Fikir Defteri — startup fikir notları (Toplantı Defteri tarzı; kendi localStorage'ı).
const STORAGE = "timay.fikir-defteri.v1";
const uid = () => "fd" + Math.random().toString(36).slice(2, 9);
const dstr = (d: Date) => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };

type Bolum = { id: string; tur: string; satirlar: string[] };
type Sayfa = { id: string; baslik: string; tarih: string; sektor: string; durum: string; bolumler: Bolum[] };

const BOLUM_TUR: { tur: string; icon: LucideIcon; c: string }[] = [
  { tur: "Problem", icon: AlertTriangle, c: "#C1292E" },
  { tur: "Çözüm", icon: Lightbulb, c: "#CA8A04" },
  { tur: "Hedef Kitle", icon: Users, c: "#0E7490" },
  { tur: "Gelir Modeli", icon: Banknote, c: "#1E7A46" },
  { tur: "Rakipler", icon: Shield, c: "#B5731A" },
  { tur: "Farklılık / Avantaj", icon: Sparkles, c: "#7C3AED" },
  { tur: "Riskler", icon: AlertOctagon, c: "#DC2626" },
  { tur: "Sonraki Adımlar", icon: ListChecks, c: "#2563EB" },
  { tur: "Notlar", icon: FileText, c: "#C96A86" },
  { tur: "Kaynaklar", icon: Link2, c: "#64748B" },
];
const META = Object.fromEntries(BOLUM_TUR.map((b) => [b.tur, b]));
const SEKTORLER = ["Yapay Zeka", "SaaS", "Temiz Enerji", "Fintech", "Sağlık", "E-ticaret"];
const DURUMLAR = ["Fikir", "Analiz", "Araştırma", "Fonlandı"];
const DURUM_RENK: Record<string, string> = { "Fikir": "#2563EB", "Analiz": "#0d9488", "Araştırma": "#CA8A04", "Fonlandı": "#1E7A46" };

const yeniSayfa = (): Sayfa => ({ id: uid(), baslik: "Yeni Fikir", tarih: dstr(new Date()), sektor: SEKTORLER[0], durum: "Fikir", bolumler: [] });
const load = (): Sayfa[] => { try { const a = JSON.parse(localStorage.getItem(STORAGE) || "[]"); return Array.isArray(a) && a.length ? a : [yeniSayfa()]; } catch { return [yeniSayfa()]; } };

export default function FikirDefteri() {
  const { currentUser } = useUsers();
  const { log } = useAudit();
  const [sayfalar, setSayfalar] = useState<Sayfa[]>(load);
  const [curId, setCurId] = useState<string>(() => load()[0].id);

  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(sayfalar)); }, [sayfalar]);

  const idx = Math.max(0, sayfalar.findIndex((s) => s.id === curId));
  const cur = sayfalar[idx] ?? sayfalar[0];

  const patch = (p: Partial<Sayfa>) => setSayfalar((ss) => ss.map((s) => (s.id === cur.id ? { ...s, ...p } : s)));
  const addBolum = (tur: string) => patch({ bolumler: [...cur.bolumler, { id: uid(), tur, satirlar: [""] }] });
  const setBolum = (bid: string, b: Partial<Bolum>) => patch({ bolumler: cur.bolumler.map((x) => (x.id === bid ? { ...x, ...b } : x)) });
  const delBolum = (bid: string) => patch({ bolumler: cur.bolumler.filter((x) => x.id !== bid) });

  const yeni = () => { const s = yeniSayfa(); setSayfalar((ss) => [s, ...ss]); setCurId(s.id); };
  const sil = () => { if (sayfalar.length <= 1) { const s = yeniSayfa(); setSayfalar([s]); setCurId(s.id); return; } setSayfalar((ss) => ss.filter((x) => x.id !== cur.id)); setCurId(sayfalar.find((x) => x.id !== cur.id)!.id); };
  const nav = (d: number) => { const n = sayfalar[idx + d]; if (n) setCurId(n.id); };
  const kaydet = () => log({ category: "modul", action: "Fikir notu kaydedildi", target: cur.baslik, meta: `${cur.sektor} · ${cur.durum}` });

  const inp = "rounded border border-line bg-base/40 px-2 py-1 text-sm text-ink outline-none focus:border-neon-blue";

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-violet/10 text-neon-violet"><Lightbulb size={18} /></span>
          <div>
            <h1 className="text-xl font-bold text-ink">Fikir Defteri</h1>
            <p className="text-[11px] text-muted">Startup fikir notların · problem · çözüm · gelir modeli · riskler</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => nav(-1)} disabled={idx <= 0} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-xs font-medium text-muted">{idx + 1} / {sayfalar.length}</span>
          <button onClick={() => nav(1)} disabled={idx >= sayfalar.length - 1} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated disabled:opacity-40"><ChevronRight size={16} /></button>
          <button onClick={kaydet} className="no-print flex items-center gap-1.5 rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-3 py-1.5 text-sm font-medium text-neon-blue transition hover:bg-neon-blue/20"><CheckCircle2 size={15} /> Kaydet</button>
          <button onClick={() => window.print()} className="no-print grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated hover:text-ink" title="Yazdır"><Printer size={16} /></button>
          <button onClick={sil} className="no-print grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-critical/10 hover:text-critical" title="Sayfayı sil"><Trash2 size={16} /></button>
          <button onClick={yeni} className="no-print flex items-center gap-1.5 rounded-lg bg-neon-violet px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Yeni Fikir</button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* SOL — Hızlı Ekle (Toplantı Defteri gibi, fikre özel) */}
        <div className="w-full shrink-0 lg:order-first lg:w-56">
          <div className="card p-4">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={14} className="text-neon-violet" /> Hızlı Ekle</h2>
            <p className="mb-2.5 text-[11px] text-muted">Tıkla — fikir sayfana bölüm eklenir.</p>
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-faint">Bölümler</p>
            <div className="space-y-1.5">
              {BOLUM_TUR.map((b) => (
                <button key={b.tur} onClick={() => addBolum(b.tur)} className="flex w-full items-center gap-2 rounded-xl border border-line bg-base/40 px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-violet/40">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: b.c + "22", color: b.c }}><b.icon size={14} /></span> {b.tur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SAĞ — fikir sayfası */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-panel shadow-card">
          {/* Künye */}
          <div className="border-b border-line p-5">
            <input value={cur.baslik} onChange={(e) => patch({ baslik: e.target.value })} placeholder="Fikir başlığı…" className="w-full border-0 bg-transparent text-xl font-bold text-ink outline-none placeholder:text-faint" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-muted">Tarih <input type="date" value={cur.tarih} onChange={(e) => patch({ tarih: e.target.value })} className={inp} /></label>
              <select value={cur.sektor} onChange={(e) => patch({ sektor: e.target.value })} className={inp}>{SEKTORLER.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={cur.durum} onChange={(e) => patch({ durum: e.target.value })} className={`${inp} font-semibold`} style={{ color: DURUM_RENK[cur.durum] }}>{DURUMLAR.map((d) => <option key={d} value={d}>{d}</option>)}</select>
              <span className="ml-auto text-[11px] text-faint">👤 {currentUser.name}</span>
            </div>
          </div>

          {/* Bölümler */}
          <div className="space-y-3 p-5">
            {cur.bolumler.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">Boş sayfa — soldaki <b className="text-muted">Hızlı Ekle</b>'den bölüm ekleyin (Problem, Çözüm, Gelir Modeli…).</p>
            )}
            {cur.bolumler.map((b) => { const m = META[b.tur] ?? { icon: FileText, c: "#64748B" }; return (
              <div key={b.id} className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: m.c + "14" }}>
                  <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: m.c }}><m.icon size={13} /> {b.tur}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setBolum(b.id, { satirlar: [...b.satirlar, ""] })} className="grid h-6 w-6 place-items-center rounded text-ink/40 transition hover:bg-black/5 hover:text-neon-violet" title="Satır ekle"><Plus size={13} /></button>
                    <button onClick={() => delBolum(b.id)} className="grid h-6 w-6 place-items-center rounded text-ink/40 transition hover:bg-critical/10 hover:text-critical" title="Bölümü sil"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="space-y-1 p-2.5">
                  {b.satirlar.map((s, i) => (
                    <div key={i} className="group flex items-center gap-2">
                      <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: m.c }} />
                      <input value={s} onChange={(e) => setBolum(b.id, { satirlar: b.satirlar.map((x, j) => (j === i ? e.target.value : x)) })}
                        placeholder={`${b.tur}…`} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
                      <button onClick={() => setBolum(b.id, { satirlar: b.satirlar.filter((_, j) => j !== i) })} className="shrink-0 text-faint opacity-0 transition hover:text-critical group-hover:opacity-100"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}
