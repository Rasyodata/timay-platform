import { useMemo, useState } from "react";
import {
  Inbox, Search, X, Check, Eye, Plus, Clock, CheckCircle2, XCircle, Flag,
  Monitor, Package, ShoppingCart, CalendarDays, Wallet, GraduationCap, Wrench, Users, FileText,
  UserPlus, ListChecks, Gauge, LogOut, MessageSquare, Pencil, Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import TalepForm from "@/components/requests/TalepForm";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";
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
const now = () => new Date().toISOString().slice(0, 10);

export default function TaleplerMerkezi(_props: { onNavigate?: (v: View) => void }) {
  const { getModule, updateRecord, addRecord } = useModules();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"Tümü" | Durum>("Tümü");
  const [editRec, setEditRec] = useState<DynamicRecord | "new">("new");
  const [formKey, setFormKey] = useState(0);
  const [msgModal, setMsgModal] = useState<{ baslik: string; icerik: string } | null>(null);

  const records = (getModule(MOD)?.records ?? []) as DynamicRecord[];
  const sayac = useMemo(() => {
    const c: Record<string, number> = { Tümü: records.length, Yeni: 0, İncelemede: 0, Onaylandı: 0, Reddedildi: 0, Tamamlandı: 0 };
    records.forEach((r) => { const d = String(r.durum); if (c[d] != null) c[d]++; });
    return c;
  }, [records]);

  const liste = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (filtre === "Tümü" ? true : String(r.durum) === filtre))
      .filter((r) => (qn ? [r.talep_no, r.konu, r.talep_eden, r.aciklama, r.talep_turu].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true))
      .sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? "")));
  }, [records, filtre, q]);

  // Defter: tarihe göre grupla
  const byDate = useMemo(() => {
    const m = new Map<string, DynamicRecord[]>();
    for (const r of liste) { const d = String(r.tarih ?? ""); if (!m.has(d)) m.set(d, []); m.get(d)!.push(r); }
    return [...m.entries()];
  }, [liste]);

  const reset = () => { setEditRec("new"); setFormKey((k) => k + 1); };
  const duzelt = (r: DynamicRecord) => { setEditRec(r); setFormKey((k) => k + 1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const onayaGonder = (r: DynamicRecord) => {
    addRecord("mod-T-0045", {
      konu: String(r.konu), tarih: String(r.tarih || now()), durum: "Bekliyor",
      istek_tipi: String(r.talep_turu || ""), talep_eden: String(r.talep_eden || ""),
      ...(Number(r.tutar) ? { tutar: Number(r.tutar) } : {}),
      onay_zinciri: String(r.onay_zinciri || ""),
      aciklama: `İstek ${String(r.talep_no || "")} · ${String(r.talep_turu || "")}${Number(r.tutar) ? " · " + tl(r.tutar) : ""}${r.aciklama ? " · " + String(r.aciklama) : ""}`,
    });
    updateRecord(MOD, String(r.id), { durum: "İncelemede" });
  };
  const istekMetni = (r: DynamicRecord) => [
    `İstek No: ${String(r.talep_no || "")}`, `Tür: ${String(r.talep_turu || "")}`, `Konu: ${String(r.konu || "")}`,
    `Talep Eden: ${String(r.talep_eden || "—")}`, `Durum: ${String(r.durum || "")}`, `Öncelik: ${String(r.oncelik || "Normal")}`,
    r.tutar ? `Tutar: ${tl(r.tutar)}` : "", `Tarih: ${dmy(String(r.tarih || ""))}`, r.onay_zinciri ? `Onay Zinciri: ${String(r.onay_zinciri)}` : "",
    r.aciklama ? `\n${String(r.aciklama)}` : "",
  ].filter(Boolean).join("\n");

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><Inbox size={22} className="text-neon-blue" /> İstekler <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">T-0076</span></h1>
          <p className="mt-1 text-sm text-muted">{sayac.Yeni + sayac.İncelemede} açık istek · solda yeni istek formu · sağda defter (tarihe göre)</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İstek ara…" className="w-56 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
          {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* SOL — Yeni / Düzenle istek formu (tür seçici + iki sütunlu form) */}
        <div className="w-full shrink-0 lg:w-[440px]">
          <div className="sticky top-4 card max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={15} className="text-neon-blue" /> {editRec === "new" ? "Yeni İstek" : "İsteği Düzenle"}</h2>
              {editRec !== "new" && <button onClick={reset} className="rounded-lg border border-line px-2 py-1 text-xs text-muted transition hover:text-ink">+ Yeni</button>}
            </div>
            <TalepForm key={formKey} initial={editRec} onClose={reset} />
          </div>
        </div>

        {/* SAĞ — İstekler defteri (tarihe göre sıralı) */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {FILTRELER.map((f) => (
              <button key={f} onClick={() => setFiltre(f)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${filtre === f ? "border-neon-blue bg-neon-blue text-white" : "border-line bg-panel text-muted hover:text-ink"}`}>
                {f}<span className={`rounded-full px-1.5 text-[10px] font-bold ${filtre === f ? "bg-white/25 text-white" : "bg-elevated text-muted"}`}>{sayac[f] ?? 0}</span>
              </button>
            ))}
          </div>

          {byDate.length === 0 ? (
            <div className="card grid place-items-center gap-2 p-16 text-center"><Inbox size={34} className="text-faint" /><p className="text-sm text-muted">Bu filtrede istek yok. Soldan yeni istek oluşturun.</p></div>
          ) : (
            <div className="space-y-5">
              {byDate.map(([date, rows]) => (
                <div key={date}>
                  <div className="mb-1.5 flex items-center gap-2"><span className="text-sm font-bold text-ink nums">{dmy(date) || "Tarihsiz"}</span><span className="h-px flex-1 bg-line" /><span className="text-[11px] text-muted">{rows.length} istek</span></div>
                  <div className="space-y-1.5">
                    {rows.map((r) => {
                      const durum = String(r.durum); const st = DURUM_STYLE[durum] ?? DURUM_STYLE.Yeni; const Tur = TUR_ICON(String(r.talep_turu)); const StIcon = st.icon; const onem = String(r.oncelik || "Normal"); const acik = durum === "Yeni" || durum === "İncelemede";
                      return (
                        <div key={r.id} className="group flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 transition hover:border-neon-blue/40 hover:shadow-sm">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: st.bg, color: st.text }}><Tur size={16} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <button onClick={() => duzelt(r)} className="truncate text-left text-sm font-semibold text-ink hover:underline">{String(r.konu)}</button>
                              <span className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: st.bg, color: st.text }}><StIcon size={10} /> {durum}</span>
                              {Number(r.tutar) ? <span className="ml-auto shrink-0 font-mono text-[12px] font-bold text-ink nums">{tl(r.tutar)}</span> : null}
                            </div>
                            <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                              <span className="font-mono text-faint">{String(r.talep_no || "")}</span>
                              <span>· {String(r.talep_turu)}</span>
                              <span>· {String(r.talep_eden || "—")}</span>
                              <span className="flex items-center gap-0.5" style={{ color: ONEM_RENK[onem] }}><Flag size={9} /> {onem}</span>
                            </p>
                          </div>
                          {/* Sağ aksiyonlar: Düzelt · Onaya Gönder · Mesaj Gönder */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                            <button onClick={() => duzelt(r)} title="Düzelt" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><Pencil size={14} /></button>
                            {acik && <button onClick={() => onayaGonder(r)} title="Onaya gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-good/10 hover:text-good"><Send size={14} /></button>}
                            <button onClick={() => setMsgModal({ baslik: `İstek (PDF) — ${String(r.talep_no || "")}`, icerik: istekMetni(r) })} title="Mesaj olarak gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><MessageSquare size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {msgModal && <MesajGonderModal baslik={msgModal.baslik} icerik={msgModal.icerik} onClose={() => setMsgModal(null)} />}
    </div>
  );
}
