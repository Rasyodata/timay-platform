import { useMemo, useState } from "react";
import {
  Inbox, Search, X, Check, Eye, Plus, Clock, CheckCircle2, XCircle, Flag, ArrowRight,
  Monitor, Package, ShoppingCart, CalendarDays, Wallet, GraduationCap, Wrench, Users, FileText, Zap,
  UserPlus, ListChecks, Gauge, LogOut, LayoutGrid, List,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import TalepForm from "@/components/requests/TalepForm";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0076";
type Durum = "Yeni" | "İncelemede" | "Onaylandı" | "Reddedildi" | "Tamamlandı";
const FILTRELER: ("Tümü" | Durum)[] = ["Tümü", "Yeni", "İncelemede", "Onaylandı", "Reddedildi", "Tamamlandı"];

const DURUM_STYLE: Record<string, { text: string; bg: string; icon: LucideIcon }> = {
  Yeni: { text: "#0A4EA2", bg: "#DBEAFE", icon: Inbox },
  İncelemede: { text: "#B5731A", bg: "#FEF3C7", icon: Eye },
  Onaylandı: { text: "#1E7A46", bg: "#DCFCE7", icon: CheckCircle2 },
  Reddedildi: { text: "#C1292E", bg: "#FEE2E2", icon: XCircle },
  Tamamlandı: { text: "#4B3FB0", bg: "#EDE9FE", icon: Check },
};
const ONEM_RENK: Record<string, string> = { Düşük: "#64748B", Normal: "#0A4EA2", Yüksek: "#B5731A", Acil: "#C1292E" };
const TUR_ICON = (t: string): LucideIcon => {
  if (/it|destek/i.test(t)) return Monitor;
  if (/malzeme|kırtasiye/i.test(t)) return Package;
  if (/satın/i.test(t)) return ShoppingCart;
  if (/izin/i.test(t)) return CalendarDays;
  if (/avans|masraf|harcama|ödeme|tedarik/i.test(t)) return Wallet;
  if (/işe giriş|başvuru/i.test(t)) return UserPlus;
  if (/görev/i.test(t)) return ListChecks;
  if (/mesai|vardiya/i.test(t)) return Clock;
  if (/transfer/i.test(t)) return Users;
  if (/performans/i.test(t)) return Gauge;
  if (/ayrılış|çıkış/i.test(t)) return LogOut;
  if (/eğitim/i.test(t)) return GraduationCap;
  if (/bakım|arıza/i.test(t)) return Wrench;
  if (/müşteri|kiracı/i.test(t)) return Users;
  return FileText;
};
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");
const tl = (n: unknown) => (Number(n) ? Number(n).toLocaleString("tr-TR") + " ₺" : "");

export default function TaleplerMerkezi(_props: { onNavigate?: (v: View) => void }) {
  const { getModule, updateRecord } = useModules();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"Tümü" | Durum>("Tümü");
  const [tur, setTur] = useState("Tümü");
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [view, setView] = useState<"liste" | "pano">("liste");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const mod = getModule(MOD);
  const records = (mod?.records ?? []) as DynamicRecord[];
  const turler = useMemo(() => ["Tümü", ...Array.from(new Set(records.map((r) => String(r.talep_turu)).filter(Boolean)))], [records]);

  const sayac = useMemo(() => {
    const c: Record<string, number> = { Tümü: records.length, Yeni: 0, İncelemede: 0, Onaylandı: 0, Reddedildi: 0, Tamamlandı: 0 };
    records.forEach((r) => { const d = String(r.durum); if (c[d] != null) c[d]++; });
    return c;
  }, [records]);
  const acil = records.filter((r) => String(r.oncelik) === "Acil" && !/Tamamlandı|Reddedildi/.test(String(r.durum))).length;

  const liste = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (filtre === "Tümü" ? true : String(r.durum) === filtre))
      .filter((r) => (tur === "Tümü" ? true : String(r.talep_turu) === tur))
      .filter((r) => (qn ? [r.talep_no, r.konu, r.talep_eden, r.aciklama, r.talep_turu].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true))
      .sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? "")));
  }, [records, filtre, tur, q]);

  const setDurum = (r: DynamicRecord, durum: Durum) => updateRecord(MOD, String(r.id), { durum });

  // Pano (Kanban) görünümü — durum kolonları, kartı sürükle-bırak ile durum değiştir
  const PANO_KOLON: Durum[] = ["Yeni", "İncelemede", "Onaylandı", "Reddedildi", "Tamamlandı"];
  const panoList = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (tur === "Tümü" ? true : String(r.talep_turu) === tur))
      .filter((r) => (qn ? [r.talep_no, r.konu, r.talep_eden, r.aciklama, r.talep_turu].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true));
  }, [records, tur, q]);
  const drop = (d: Durum) => { if (dragId) updateRecord(MOD, dragId, { durum: d }); setDragId(null); setOver(null); };

  const KPI = ({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) => (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${color}18`, color }}><Icon size={18} /></span>
      <div><p className="text-xl font-bold" style={{ color }}>{value}</p><p className="text-[11px] text-muted">{label}</p></div>
    </div>
  );

  return (
    <div className="max-w-[1280px] space-y-5 px-4 py-6 md:px-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Inbox size={20} /></span>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink">Talepler Merkezi <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted">T-0076</span></h1>
            <p className="text-xs text-muted">{sayac.Yeni + sayac.İncelemede} açık talep · tüm türler tek yerde</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Talep ara…" className="w-52 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-64 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setView("liste")} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "liste" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><List size={14} /> Liste</button>
            <button onClick={() => setView("pano")} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "pano" ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><LayoutGrid size={14} /> Pano</button>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"><Plus size={16} /> Yeni Talep</button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPI icon={Inbox} label="Toplam" value={String(sayac.Tümü)} color="#0F2544" />
        <KPI icon={Clock} label="Yeni" value={String(sayac.Yeni)} color="#0A4EA2" />
        <KPI icon={Eye} label="İncelemede" value={String(sayac.İncelemede)} color="#B5731A" />
        <KPI icon={Check} label="Tamamlanan" value={String(sayac.Tamamlandı)} color="#4B3FB0" />
        <KPI icon={Zap} label="Acil (açık)" value={String(acil)} color="#C1292E" />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-2">
        {view === "liste" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTRELER.map((f) => (
              <button key={f} onClick={() => setFiltre(f)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${filtre === f ? "border-neon-blue bg-neon-blue text-white" : "border-line bg-panel text-muted hover:text-ink"}`}>
                {f}<span className={`rounded-full px-1.5 text-[10px] font-bold ${filtre === f ? "bg-white/25 text-white" : "bg-elevated text-muted"}`}>{sayac[f] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
        {view === "pano" && <p className="text-xs text-muted">Kartı başka kolona <b className="text-ink">sürükleyip bırakarak</b> durumunu değiştir.</p>}
        <select value={tur} onChange={(e) => setTur(e.target.value)} className="ml-auto rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink outline-none focus:border-neon-blue">
          {turler.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Pano (Kanban) — kolonlar = durum, kart sürükle-bırak */}
      {view === "pano" ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {PANO_KOLON.map((d) => {
            const st = DURUM_STYLE[d]; const SI = st.icon;
            const cards = panoList.filter((r) => String(r.durum) === d);
            return (
              <div key={d} onDragOver={(e) => { e.preventDefault(); setOver(d); }} onDragLeave={() => setOver((s) => (s === d ? null : s))} onDrop={() => drop(d)}
                className={`flex w-[280px] shrink-0 flex-col rounded-xl border bg-base/60 transition ${over === d ? "border-neon-blue ring-2 ring-neon-blue/30" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2" style={{ borderTopColor: st.text, borderTopWidth: 3 }}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: st.text }}><SI size={13} /> {d}</span>
                  <span className="rounded-full bg-elevated px-1.5 text-[11px] font-medium text-muted">{cards.length}</span>
                </div>
                <div className="flex min-h-[100px] flex-1 flex-col gap-2 p-2">
                  {cards.map((r) => {
                    const Tur = TUR_ICON(String(r.talep_turu)); const onem = String(r.oncelik || "Normal");
                    return (
                      <div key={r.id} draggable onDragStart={() => setDragId(String(r.id))} onDragEnd={() => { setDragId(null); setOver(null); }}
                        className={`cursor-grab rounded-lg border border-line bg-panel p-3 shadow-sm transition hover:border-neon-blue/50 active:cursor-grabbing ${dragId === String(r.id) ? "opacity-40" : ""}`}>
                        <div className="flex items-start gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: st.bg, color: st.text }}><Tur size={14} /></span>
                          <button onClick={() => setModal(r)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold leading-tight text-ink hover:underline">{String(r.konu)}</button>
                        </div>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted">
                          <span className="font-mono text-faint">{String(r.talep_no || "")}</span>
                          <span>· {String(r.talep_turu)}</span>
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: ONEM_RENK[onem] }}><Flag size={9} /> {onem}</span>
                          {Number(r.tutar) ? <span className="font-mono text-[11px] font-bold text-ink nums">{tl(r.tutar)}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                  {cards.length === 0 && <p className="grid flex-1 place-items-center text-[11px] text-faint">Buraya sürükleyin</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : liste.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-16 text-center"><Inbox size={34} className="text-faint" /><p className="text-sm text-muted">Bu filtrede talep yok.</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {liste.map((r) => {
            const durum = String(r.durum);
            const st = DURUM_STYLE[durum] ?? DURUM_STYLE.Yeni;
            const Tur = TUR_ICON(String(r.talep_turu));
            const StIcon = st.icon;
            const onem = String(r.oncelik || "Normal");
            const acikMi = durum === "Yeni" || durum === "İncelemede";
            return (
              <div key={r.id} className="card flex flex-col gap-3 p-4 transition hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: st.bg, color: st.text }}><Tur size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setModal(r)} className="truncate text-left text-sm font-bold text-ink hover:underline">{String(r.konu)}</button>
                      <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: st.bg, color: st.text }}><StIcon size={11} /> {durum}</span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                      <span className="font-mono text-faint">{String(r.talep_no || "")}</span>
                      <span>· {String(r.talep_turu)}</span>
                      <span className="flex items-center gap-0.5" style={{ color: ONEM_RENK[onem] }}><Flag size={10} /> {onem}</span>
                      <span>· {dmy(String(r.tarih))}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5"><span className="text-faint">Talep:</span><span className="font-medium text-ink">{String(r.talep_eden || "—")}</span><ArrowRight size={11} className="text-faint" /><span className="font-medium text-ink">{String(r.atanan || "—")}</span></span>
                  {Number(r.tutar) ? <span className="ml-auto font-mono text-sm font-bold text-ink nums">{tl(r.tutar)}</span> : null}
                </div>

                {r.aciklama ? <p className="rounded-lg bg-base/60 px-3 py-2 text-[12px] text-ink/70">{String(r.aciklama)}</p> : null}

                {acikMi && (
                  <div className="flex items-center gap-2 border-t border-line pt-3">
                    <button onClick={() => setDurum(r, "Onaylandı")} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-good px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"><Check size={14} /> Onayla</button>
                    {durum !== "İncelemede" && <button onClick={() => setDurum(r, "İncelemede")} className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-ink"><Eye size={14} /> İncele</button>}
                    <button onClick={() => setDurum(r, "Reddedildi")} className="flex items-center justify-center gap-1.5 rounded-lg border border-critical/40 px-3 py-2 text-xs font-medium text-critical transition hover:bg-critical/10"><X size={14} /> Reddet</button>
                  </div>
                )}
                {durum === "Onaylandı" && (
                  <button onClick={() => setDurum(r, "Tamamlandı")} className="flex items-center justify-center gap-1.5 rounded-lg border border-neon-violet/40 bg-neon-violet/5 px-3 py-2 text-xs font-semibold text-neon-violet transition hover:bg-neon-violet/10"><CheckCircle2 size={14} /> Tamamlandı Olarak İşaretle</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ekle / Düzenle modal */}
      {modal && mod && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Talep / Form" : String((modal as DynamicRecord).konu ?? "Talep")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4"><TalepForm initial={modal === "new" ? "new" : (modal as DynamicRecord)} onClose={() => setModal(null)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
