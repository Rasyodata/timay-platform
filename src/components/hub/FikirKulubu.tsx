import { useMemo, useState, useEffect } from "react";
import {
  Lightbulb, Rocket, FlaskConical, Banknote, Heart, Plus, X,
  TrendingUp, Vote, Sparkles, BarChart3, CheckCircle2,
} from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useAudit } from "@/context/AuditContext";

// Fikir Kulübü — startup fikir panosu (kendi localStorage'ı).
const STORAGE = "timay.fikir-kulubu.v1";
const uid = () => "f" + Math.random().toString(36).slice(2, 9);

type Durum = "Fikir" | "Analiz" | "Araştırma" | "Fonlandı";
type Idea = { id: string; baslik: string; aciklama: string; sektor: string; durum: Durum; likes: number; liked: boolean; yazar: string; tarih: string };
type Store = { ideas: Idea[]; poll: Record<string, number>; voted: string | null };

const SEKTORLER = ["Yapay Zeka", "SaaS", "Temiz Enerji", "Fintech", "Sağlık", "E-ticaret"];
const DURUMLAR: Durum[] = ["Fikir", "Analiz", "Araştırma", "Fonlandı"];
const DURUM_RENK: Record<Durum, string> = { "Fikir": "#2563EB", "Analiz": "#0d9488", "Araştırma": "#CA8A04", "Fonlandı": "#1E7A46" };
const SEK_RENK: Record<string, string> = { "Yapay Zeka": "#7C3AED", "SaaS": "#2563EB", "Temiz Enerji": "#1E7A46", "Fintech": "#0891B2", "Sağlık": "#C1292E", "E-ticaret": "#B5731A" };

// Trend grafiği — sektörlerin dönemsel popülerlik artışı (sabit, stabil seri)
const TREND = [
  { ad: "Yapay Zeka", renk: "#7C3AED", seri: [38, 46, 55, 68, 82, 95] },
  { ad: "SaaS", renk: "#2563EB", seri: [52, 56, 60, 63, 69, 74] },
  { ad: "Temiz Enerji", renk: "#1E7A46", seri: [28, 34, 45, 52, 58, 67] },
];
const DONEMLER = ["Oca", "Şub", "Mar", "Nis", "May", "Haz"];

const SEED: Store = {
  ideas: [
    { id: uid(), baslik: "AI Destekli Muhasebe Asistanı", aciklama: "Faturaları okuyup otomatik fiş kesen yapay zeka.", sektor: "Yapay Zeka", durum: "Analiz", likes: 24, liked: false, yazar: "Rasyodata", tarih: "2026-10-20" },
    { id: uid(), baslik: "KOBİ'ler için Abonelik SaaS", aciklama: "Küçük işletmeler için hepsi-bir-arada yönetim platformu.", sektor: "SaaS", durum: "Fonlandı", likes: 41, liked: false, yazar: "Tuğba Yörük", tarih: "2026-10-18" },
    { id: uid(), baslik: "Güneş Panelli Mikro Şebeke", aciklama: "Mahalle ölçeğinde enerji paylaşım ağı.", sektor: "Temiz Enerji", durum: "Araştırma", likes: 17, liked: false, yazar: "Kadir Fırat", tarih: "2026-10-15" },
    { id: uid(), baslik: "Anlık Esnaf Kredisi", aciklama: "Nakit akışına göre saniyeler içinde mikro kredi.", sektor: "Fintech", durum: "Fikir", likes: 9, liked: false, yazar: "Rasyodata", tarih: "2026-10-22" },
  ],
  poll: { "Yapay Zeka": 42, "SaaS": 28, "Temiz Enerji": 19, "Fintech": 23 },
  voted: null,
};

const load = (): Store => { try { const s = JSON.parse(localStorage.getItem(STORAGE) || "null"); return s && s.ideas ? s : SEED; } catch { return SEED; } };

export default function FikirKulubu() {
  const { currentUser } = useUsers();
  const { log } = useAudit();
  const [store, setStore] = useState<Store>(load);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ baslik: "", aciklama: "", sektor: SEKTORLER[0], durum: "Fikir" as Durum });

  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(store)); }, [store]);

  const metrikler = useMemo(() => ({
    fikir: store.ideas.filter((i) => i.durum === "Fikir").length,
    analiz: store.ideas.filter((i) => i.durum === "Analiz").length,
    arastirma: store.ideas.filter((i) => i.durum === "Araştırma").length,
    fonlanan: store.ideas.filter((i) => i.durum === "Fonlandı").length,
    begeni: store.ideas.reduce((s, i) => s + i.likes, 0),
  }), [store.ideas]);

  const toggleLike = (id: string) => setStore((s) => ({ ...s, ideas: s.ideas.map((i) => i.id === id ? { ...i, liked: !i.liked, likes: i.likes + (i.liked ? -1 : 1) } : i) }));
  const vote = (opt: string) => setStore((s) => s.voted ? s : { ...s, voted: opt, poll: { ...s.poll, [opt]: (s.poll[opt] || 0) + 1 } });
  const ekle = () => {
    const b = form.baslik.trim(); if (!b) return;
    const idea: Idea = { id: uid(), baslik: b, aciklama: form.aciklama.trim(), sektor: form.sektor, durum: form.durum, likes: 0, liked: false, yazar: currentUser.name, tarih: new Date().toISOString().slice(0, 10) };
    setStore((s) => ({ ...s, ideas: [idea, ...s.ideas] }));
    log({ category: "modul", action: "Yeni startup fikri eklendi", target: b, meta: form.sektor });
    setForm({ baslik: "", aciklama: "", sektor: SEKTORLER[0], durum: "Fikir" }); setAddOpen(false);
  };

  const pollTop = Math.max(1, ...Object.values(store.poll));
  const pollTotal = Object.values(store.poll).reduce((a, b) => a + b, 0);

  // SVG çizgi grafik geometrisi
  const W = 560, H = 190, PADX = 8, PADY = 14;
  const x = (i: number) => PADX + (i * (W - 2 * PADX)) / (DONEMLER.length - 1);
  const yv = (v: number) => H - PADY - (v / 100) * (H - 2 * PADY);
  const pathOf = (seri: number[]) => seri.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yv(v).toFixed(1)}`).join(" ");

  const KART = ({ icon: Icon, deger, etiket, renk }: { icon: typeof Lightbulb; deger: number | string; etiket: string; renk: string }) => (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: renk + "22", color: renk }}><Icon size={20} /></span>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> canlı</span>
      </div>
      <p className="mt-3 text-3xl font-black text-white nums">{deger}</p>
      <p className="mt-0.5 text-xs font-medium text-white/70">{etiket}</p>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1020]">
      {/* arka plan parıltıları */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#7C3AED]/30 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[#2563EB]/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#10B981]/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
        {/* Başlık */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-white shadow-[0_0_30px_rgba(124,58,237,.5)]"><Lightbulb size={24} /></span>
            <div>
              <h1 className="text-2xl font-black text-white">Fikir Kulübü</h1>
              <p className="text-xs text-white/60">Startup fikirleri · analiz · araştırma · fonlama · topluluk</p>
            </div>
          </div>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,.45)] transition hover:scale-105">
            <Plus size={16} /> Yeni Fikir Ekle
          </button>
        </div>

        {/* Metrik kartları */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KART icon={Lightbulb} deger={metrikler.fikir} etiket="Aktif Fikir" renk="#A78BFA" />
          <KART icon={BarChart3} deger={metrikler.analiz} etiket="Yayınlanan Analiz" renk="#2DD4BF" />
          <KART icon={FlaskConical} deger={metrikler.arastirma} etiket="Araştırma" renk="#FACC15" />
          <KART icon={Banknote} deger={metrikler.fonlanan} etiket="Fonlanan Startup" renk="#34D399" />
          <KART icon={Heart} deger={metrikler.begeni} etiket="Toplam Beğeni" renk="#FB7185" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Canlı grafik */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-xl lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white"><TrendingUp size={16} className="text-[#A78BFA]" /> Sektör Popülerlik Trendi</h2>
              <div className="flex flex-wrap gap-3">{TREND.map((t) => <span key={t.ad} className="flex items-center gap-1.5 text-[11px] text-white/70"><span className="h-2 w-2 rounded-full" style={{ background: t.renk }} /> {t.ad}</span>)}</div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 200 }}>
              {[0, 25, 50, 75, 100].map((g) => <line key={g} x1={PADX} x2={W - PADX} y1={yv(g)} y2={yv(g)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)}
              {TREND.map((t) => (
                <g key={t.ad}>
                  <path d={pathOf(t.seri)} fill="none" stroke={t.renk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  {t.seri.map((v, i) => <circle key={i} cx={x(i)} cy={yv(v)} r={3} fill={t.renk} />)}
                </g>
              ))}
            </svg>
            <div className="mt-1 flex justify-between px-1 text-[10px] text-white/40">{DONEMLER.map((d) => <span key={d}>{d}</span>)}</div>
          </div>

          {/* Anket */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-xl lg:col-span-2">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><Vote size={16} className="text-[#2DD4BF]" /> Hangi sektör patlar?</h2>
            <p className="mb-3 text-[11px] text-white/50">{store.voted ? `Oyun kaydedildi: ${store.voted} · ${pollTotal} oy` : "Oyunu ver — anlık güncellenir"}</p>
            <div className="space-y-2">
              {Object.entries(store.poll).map(([opt, n]) => { const pct = Math.round((n / pollTop) * 100); const secili = store.voted === opt; return (
                <button key={opt} onClick={() => vote(opt)} disabled={!!store.voted} className={`group w-full text-left ${store.voted ? "cursor-default" : "cursor-pointer"}`}>
                  <div className="mb-0.5 flex items-center justify-between text-[12px]"><span className={`font-medium ${secili ? "text-white" : "text-white/80"}`}>{opt}{secili && <CheckCircle2 size={12} className="ml-1 inline text-emerald-300" />}</span><span className="text-white/50 nums">{n}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: secili ? "linear-gradient(90deg,#34D399,#2DD4BF)" : "linear-gradient(90deg,#7C3AED,#2563EB)" }} />
                  </div>
                </button>
              ); })}
            </div>
          </div>
        </div>

        {/* Fikir kartları akışı */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Sparkles size={16} className="text-[#FACC15]" /> Fikir Akışı <span className="text-white/40">({store.ideas.length})</span></h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {store.ideas.map((i) => (
              <div key={i.id} className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-xl transition hover:border-white/30">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: (SEK_RENK[i.sektor] || "#64748B") + "33", color: "#fff" }}>{i.sektor}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: DURUM_RENK[i.durum] + "33", color: "#fff" }}>{i.durum}</span>
                </div>
                <div>
                  <p className="font-bold text-white">{i.baslik}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/60">{i.aciklama || "—"}</p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-2.5">
                  <span className="text-[10px] text-white/40">👤 {i.yazar}</span>
                  <button onClick={() => toggleLike(i.id)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:bg-white/10" style={{ color: i.liked ? "#FB7185" : "rgba(255,255,255,0.6)" }}>
                    <Heart size={15} fill={i.liked ? "#FB7185" : "none"} className="transition-transform active:scale-125" /> {i.likes}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Yeni Fikir modalı */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121A2E] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Lightbulb size={18} className="text-[#A78BFA]" /> Yeni Startup Fikri</h3>
              <button onClick={() => setAddOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input autoFocus value={form.baslik} onChange={(e) => setForm((f) => ({ ...f, baslik: e.target.value }))} placeholder="Fikir başlığı…" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7C3AED]" />
              <textarea value={form.aciklama} onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))} placeholder="Kısa açıklama…" rows={3} className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7C3AED]" />
              <div className="flex gap-2">
                <select value={form.sektor} onChange={(e) => setForm((f) => ({ ...f, sektor: e.target.value }))} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]">{SEKTORLER.map((s) => <option key={s} value={s} className="bg-[#121A2E]">{s}</option>)}</select>
                <select value={form.durum} onChange={(e) => setForm((f) => ({ ...f, durum: e.target.value as Durum }))} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#7C3AED]">{DURUMLAR.map((d) => <option key={d} value={d} className="bg-[#121A2E]">{d}</option>)}</select>
              </div>
            </div>
            <button onClick={ekle} disabled={!form.baslik.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-40"><Rocket size={16} /> Platforma Ekle</button>
          </div>
        </div>
      )}
    </div>
  );
}
