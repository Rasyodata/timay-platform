import { useMemo, useState } from "react";
import {
  Inbox, Search, X, Check, Clock, Eye, CheckCircle2, XCircle, Plus,
  Wallet, ShoppingCart, Target, TrendingUp, ListChecks, UserCheck, FileText, MessageSquare,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";
import type { LucideIcon } from "lucide-react";

const MOD = "mod-T-0045";

type Durum = "Bekliyor" | "İncelemede" | "Onaylandı" | "Reddedildi";
const DURUM_STYLE: Record<string, { text: string; bg: string; dot: string; icon: LucideIcon }> = {
  Bekliyor: { text: "#B5731A", bg: "#FEF3C7", dot: "#B5731A", icon: Clock },
  İncelemede: { text: "#0A4EA2", bg: "#DBEAFE", dot: "#0A4EA2", icon: Eye },
  Onaylandı: { text: "#1E7A46", bg: "#DCFCE7", dot: "#1E7A46", icon: CheckCircle2 },
  Reddedildi: { text: "#C1292E", bg: "#FEE2E2", dot: "#C1292E", icon: XCircle },
};
const TIP_ICON = (t: string): LucideIcon => {
  if (/ödeme|tahsilat|gider/i.test(t)) return Wallet;
  if (/satın/i.test(t)) return ShoppingCart;
  if (/hedef/i.test(t)) return Target;
  if (/kar|kâr/i.test(t)) return TrendingUp;
  if (/görev/i.test(t)) return ListChecks;
  if (/hak sahibi/i.test(t)) return UserCheck;
  return FileText;
};
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");
const tl = (n: unknown) => (Number(n) ? Number(n).toLocaleString("tr-TR") + " ₺" : "—");
const FILTRELER: ("Tümü" | Durum)[] = ["Tümü", "Bekliyor", "İncelemede", "Onaylandı", "Reddedildi"];

export default function OnaylarPage(_props: { onNavigate?: (v: View) => void }) {
  const { getModule, updateRecord } = useModules();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"Tümü" | Durum>("Tümü");
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [msgModal, setMsgModal] = useState<{ baslik: string; icerik: string } | null>(null);

  const mod = getModule(MOD);
  const records = (mod?.records ?? []) as DynamicRecord[];

  const sayac = useMemo(() => {
    const c: Record<string, number> = { Tümü: records.length, Bekliyor: 0, İncelemede: 0, Onaylandı: 0, Reddedildi: 0 };
    records.forEach((r) => { const d = String(r.durum); if (c[d] != null) c[d]++; });
    return c;
  }, [records]);

  const bekleyenTutar = useMemo(
    () => records.filter((r) => /Bekliyor|İncelemede/.test(String(r.durum))).reduce((s, r) => s + (Number(r.tutar) || 0), 0),
    [records],
  );

  const liste = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (filtre === "Tümü" ? true : String(r.durum) === filtre))
      .filter((r) => (qn ? [r.konu, r.istek_tipi, r.talep_eden, r.aciklama].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true))
      .sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? "")));
  }, [records, filtre, q]);

  const setDurum = (r: DynamicRecord, durum: Durum) => updateRecord(MOD, String(r.id), { durum });

  // Defter: tarihe göre grupla
  const byDate = useMemo(() => {
    const m = new Map<string, DynamicRecord[]>();
    for (const r of liste) { const d = String(r.tarih ?? ""); if (!m.has(d)) m.set(d, []); m.get(d)!.push(r); }
    return [...m.entries()];
  }, [liste]);
  const onayMetni = (r: DynamicRecord) => [
    `Konu: ${String(r.konu || "")}`, `Tür: ${String(r.istek_tipi || "")}`, `Durum: ${String(r.durum || "")}`,
    `Talep Eden: ${String(r.talep_eden || "—")}`, Number(r.tutar) ? `Tutar: ${tl(r.tutar)}` : "", `Tarih: ${dmy(String(r.tarih || ""))}`,
    r.onay_zinciri ? `Onay Zinciri: ${String(r.onay_zinciri)}` : "", r.aciklama ? `\n${String(r.aciklama)}` : "",
  ].filter(Boolean).join("\n");

  const KPI = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Inbox size={20} /></span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><Inbox size={22} className="text-neon-blue" /> Onaylar <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">T-0045</span></h1>
            <p className="mt-1 text-sm text-muted">{sayac.Bekliyor + sayac.İncelemede} bekleyen işlem</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Onay ara…" className="w-52 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-64 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"><Plus size={16} /> Yeni Talep</button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KPI label="Bekleyen" value={String(sayac.Bekliyor)} color="#B5731A" />
        <KPI label="İncelemede" value={String(sayac.İncelemede)} color="#0A4EA2" />
        <KPI label="Onaylanan" value={String(sayac.Onaylandı)} color="#1E7A46" />
        <KPI label="Bekleyen Tutar" value={bekleyenTutar.toLocaleString("tr-TR") + " ₺"} color="#0F2544" />
      </div>

      {/* Filtre sekmeleri */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTRELER.map((f) => (
          <button key={f} onClick={() => setFiltre(f)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${filtre === f ? "border-neon-blue bg-neon-blue text-white" : "border-line bg-panel text-muted hover:text-ink"}`}>
            {f}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${filtre === f ? "bg-white/25 text-white" : "bg-elevated text-muted"}`}>{sayac[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Onay defteri — tarihe göre gruplu */}
      {byDate.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-16 text-center">
          <Inbox size={34} className="text-faint" />
          <p className="text-sm text-muted">Bu filtrede onay yok.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byDate.map(([date, rows]) => (
            <div key={date}>
              <div className="mb-1.5 flex items-center gap-2"><span className="text-sm font-bold text-ink nums">{dmy(date) || "Tarihsiz"}</span><span className="h-px flex-1 bg-line" /><span className="text-[11px] text-muted">{rows.length} onay</span></div>
              <div className="space-y-1.5">
                {rows.map((r) => {
                  const durum = String(r.durum); const st = DURUM_STYLE[durum] ?? DURUM_STYLE.Bekliyor; const Tip = TIP_ICON(String(r.istek_tipi)); const StDot = st.icon; const bekliyor = durum === "Bekliyor" || durum === "İncelemede";
                  return (
                    <div key={r.id} className="group flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 transition hover:border-neon-blue/40 hover:shadow-sm">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: st.bg, color: st.text }}><Tip size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModal(r)} className="truncate text-left text-sm font-semibold text-ink hover:underline">{String(r.konu)}</button>
                          <span className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: st.bg, color: st.text }}><StDot size={10} /> {durum}</span>
                          {Number(r.tutar) ? <span className="ml-auto shrink-0 font-mono text-[12px] font-bold text-ink nums">{tl(r.tutar)}</span> : null}
                        </div>
                        <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                          {r.istek_tipi ? <span>{String(r.istek_tipi)}</span> : null}
                          <span>· Talep: <span className="text-ink">{String(r.talep_eden || "—")}</span></span>
                          {r.onay_zinciri ? <span className="truncate">· {String(r.onay_zinciri)}</span> : null}
                        </p>
                      </div>
                      {/* Sağ aksiyonlar: Onayla · İncele · Reddet · Mesaj Gönder */}
                      <div className="flex shrink-0 items-center gap-0.5">
                        {bekliyor && <button onClick={() => setDurum(r, "Onaylandı")} title="Onayla" className="grid h-7 w-7 place-items-center rounded-lg text-good transition hover:bg-good/15"><Check size={15} /></button>}
                        {bekliyor && durum !== "İncelemede" && <button onClick={() => setDurum(r, "İncelemede")} title="İncele" className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink"><Eye size={15} /></button>}
                        {bekliyor && <button onClick={() => setDurum(r, "Reddedildi")} title="Reddet" className="grid h-7 w-7 place-items-center rounded-lg text-critical transition hover:bg-critical/10"><X size={15} /></button>}
                        <button onClick={() => setMsgModal({ baslik: `Onay (PDF) — ${String(r.konu || "")}`, icerik: onayMetni(r) })} title="Mesaj olarak gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><MessageSquare size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ekle / Düzenle modal */}
      {modal && mod && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Onay Talebi" : String((modal as DynamicRecord).konu ?? "Onay")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              <RecordForm mod={mod} initial={modal === "new" ? undefined : (modal as DynamicRecord)} defaults={modal === "new" ? { durum: "Bekliyor" } : undefined} onClose={() => setModal(null)} />
            </div>
          </div>
        </div>
      )}

      {msgModal && <MesajGonderModal baslik={msgModal.baslik} icerik={msgModal.icerik} onClose={() => setMsgModal(null)} />}
    </div>
  );
}
