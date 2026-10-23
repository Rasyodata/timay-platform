import { useMemo, useState } from "react";
import {
  Plus, Search, X, Trash2, StickyNote, Tag, Calendar, Bell, BellOff,
  Archive, ArchiveRestore, Flag, Save, MessageSquare,
  Users, CheckSquare, Lightbulb, ShoppingCart, Phone, CalendarClock, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";
import MentionTextarea from "@/components/common/MentionTextarea";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0068";
const BUGUN = "2026-10-17";

const RENK_SIRA = ["Sarı", "Yeşil", "Mavi", "Pembe", "Mor", "Gri"] as const;
const RENK: Record<string, { bg: string; kenar: string }> = {
  Sarı: { bg: "#FEF08A", kenar: "#FACC15" },
  Yeşil: { bg: "#BBF7D0", kenar: "#4ADE80" },
  Mavi: { bg: "#BFE3FF", kenar: "#60A5FA" },
  Pembe: { bg: "#FBCFE8", kenar: "#F472B6" },
  Mor: { bg: "#E9D5FF", kenar: "#A78BFA" },
  Gri: { bg: "#ECE7DE", kenar: "#CBB89D" },
};
const ONEM = ["Düşük", "Normal", "Yüksek", "Kritik"] as const;
const ONEM_RENK: Record<string, string> = { Düşük: "#64748B", Normal: "#0A4EA2", Yüksek: "#B5731A", Kritik: "#C1292E" };
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");

// Hızlı not türleri — tıklayınca o başlık + renkle not formu açılır
const NOT_TURLERI: { label: string; icon: LucideIcon; renk: string }[] = [
  { label: "Unutma", icon: Bell, renk: "Sarı" },
  { label: "Toplantı", icon: Users, renk: "Mavi" },
  { label: "Yapılacak", icon: CheckSquare, renk: "Yeşil" },
  { label: "Fikir", icon: Lightbulb, renk: "Mor" },
  { label: "Önemli", icon: Flag, renk: "Pembe" },
  { label: "Alışveriş", icon: ShoppingCart, renk: "Yeşil" },
  { label: "Telefon / Arama", icon: Phone, renk: "Mavi" },
  { label: "Randevu", icon: CalendarClock, renk: "Mor" },
  { label: "Diğer", icon: StickyNote, renk: "Gri" },
];

export default function NotesPage(_props: { onNavigate?: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const [q, setQ] = useState("");
  const [sekme, setSekme] = useState<"aktif" | "arsiv">("aktif");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<{ baslik: string; icerik: string } | null>(null);
  // Sol form durumu
  const [editRec, setEditRec] = useState<DynamicRecord | null>(null);
  const [preset, setPreset] = useState<{ baslik: string; renk: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const records = (getModule(MOD)?.records ?? []) as DynamicRecord[];

  const notes = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (sekme === "arsiv" ? r.arsiv === true : r.arsiv !== true))
      .filter((r) => (qn ? [r.baslik, r.icerik, r.etiket].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true))
      .sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? "")));
  }, [records, q, sekme]);

  // Defter: tarihe göre grupla
  const byDate = useMemo(() => {
    const m = new Map<string, DynamicRecord[]>();
    for (const r of notes) { const d = String(r.tarih ?? ""); if (!m.has(d)) m.set(d, []); m.get(d)!.push(r); }
    return [...m.entries()];
  }, [notes]);

  const aktifSayi = records.filter((r) => r.arsiv !== true).length;
  const arsivSayi = records.filter((r) => r.arsiv === true).length;
  const chips = (etiket: unknown) => String(etiket ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const toggleArsiv = (r: DynamicRecord) => updateRecord(MOD, String(r.id), { arsiv: !r.arsiv });
  const remove = (id: string) => { deleteRecord(MOD, id); setConfirmId(null); };

  const reset = () => { setEditRec(null); setPreset(null); setFormKey((k) => k + 1); };
  const yeniTur = (t: { label: string; renk: string }) => { setEditRec(null); setPreset({ baslik: t.label, renk: t.renk }); setFormKey((k) => k + 1); };
  const duzelt = (r: DynamicRecord) => { setEditRec(r); setPreset(null); setFormKey((k) => k + 1); };
  const kaydet = (data: Record<string, unknown>, id?: string) => { if (id) updateRecord(MOD, id, data); else addRecord(MOD, data); reset(); };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 md:p-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><StickyNote size={22} className="text-neon-blue" /> Notlar <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">T-0068</span></h1>
          <p className="mt-1 text-sm text-muted">solda hızlı not başlıkları · sağda defter (tarihe göre) · {aktifSayi} aktif · {arsivSayi} arşiv</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-base/50 p-0.5">
            <button onClick={() => setSekme("aktif")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${sekme === "aktif" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}>Aktif</button>
            <button onClick={() => setSekme("arsiv")} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${sekme === "arsiv" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}><Archive size={13} /> Arşiv</button>
          </div>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Not ara…" className="w-52 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-64 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* SOL — hızlı not türleri + form */}
        <div className="w-full shrink-0 lg:w-[400px]">
          <div className="sticky top-4 card max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={15} className="text-neon-blue" /> {editRec ? "Notu Düzenle" : "Yeni Not"}</h2>
            <p className="mb-2.5 text-[11px] text-muted">Hızlı başlık seç — form o başlık ve renkle açılır.</p>
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {NOT_TURLERI.map((t) => { const c = RENK[t.renk]?.kenar ?? "#64748B"; return (
                <button key={t.label} onClick={() => yeniTur(t)} className="flex items-center gap-2 rounded-xl border border-line bg-base/40 px-2.5 py-2 text-left text-xs font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-blue/40">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: c + "22", color: c }}><t.icon size={14} /></span> {t.label}
                </button>
              ); })}
            </div>
            <NoteEditor key={formKey} embedded initial={editRec} presetBaslik={preset?.baslik} presetRenk={preset?.renk}
              onClose={reset} onSave={kaydet} onDelete={editRec ? (id) => { deleteRecord(MOD, id); reset(); } : undefined} />
          </div>
        </div>

        {/* SAĞ — notlar defteri (tarihe göre) */}
        <div className="min-w-0 flex-1">
          {byDate.length === 0 ? (
            <div className="card grid place-items-center gap-2 p-16 text-center">
              <StickyNote size={34} className="text-faint" />
              <p className="text-sm text-muted">{q ? "Eşleşen not yok." : sekme === "arsiv" ? "Arşivde not yok." : "Henüz not yok. Soldan hızlı başlık seçin."}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {byDate.map(([date, rows]) => (
                <div key={date}>
                  <div className="mb-1.5 flex items-center gap-2"><span className="text-sm font-bold text-ink nums">{dmy(date) || "Tarihsiz"}</span><span className="h-px flex-1 bg-line" /><span className="text-[11px] text-muted">{rows.length} not</span></div>
                  <div className="space-y-1.5">
                    {rows.map((r) => { const c = RENK[String(r.renk)] ?? RENK.Sarı; const onem = String(r.onem || "Normal");
                      return (
                        <div key={r.id} className="group flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 transition hover:border-neon-blue/40 hover:shadow-sm" style={{ borderLeft: `4px solid ${c.kenar}` }}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Flag size={12} className="shrink-0" style={{ color: ONEM_RENK[onem] }} fill={onem === "Kritik" || onem === "Yüksek" ? ONEM_RENK[onem] : "transparent"} />
                              <button onClick={() => duzelt(r)} className="truncate text-left text-sm font-semibold text-ink hover:underline">{String(r.baslik)}</button>
                              {r.hatirlatma ? <Bell size={12} className="shrink-0 text-neon-blue" fill="currentColor" /> : null}
                              {chips(r.etiket).map((t) => <span key={t} className="hidden shrink-0 items-center gap-0.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] text-ink/60 sm:inline-flex"><Tag size={8} /> {t}</span>)}
                            </div>
                            {r.icerik ? <p className="truncate text-[11px] text-muted">{String(r.icerik)}</p> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                            <button onClick={() => duzelt(r)} title="Düzelt" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><Pencil size={14} /></button>
                            <button onClick={() => setMsgModal({ baslik: String(r.baslik), icerik: String(r.icerik ?? "") })} title="Mesaj olarak gönder" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-neon-blue/10 hover:text-neon-blue"><MessageSquare size={14} /></button>
                            <button onClick={() => toggleArsiv(r)} title={r.arsiv ? "Arşivden çıkar" : "Arşivle"} className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-elevated hover:text-ink">{r.arsiv ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
                            {confirmId === String(r.id)
                              ? <button onClick={() => remove(String(r.id))} className="rounded bg-critical px-1.5 py-0.5 text-[10px] font-bold text-white">Sil?</button>
                              : <button onClick={() => setConfirmId(String(r.id))} title="Sil" className="grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-critical/10 hover:text-critical"><Trash2 size={14} /></button>}
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

// ── Not editörü (modal ya da gömülü) ──────────────────────────────────
function NoteEditor({ initial, onClose, onSave, onDelete, embedded, presetBaslik, presetRenk }: {
  initial: DynamicRecord | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => void;
  onDelete?: (id: string) => void;
  embedded?: boolean;
  presetBaslik?: string;
  presetRenk?: string;
}) {
  const [baslik, setBaslik] = useState(String(initial?.baslik ?? presetBaslik ?? ""));
  const [icerik, setIcerik] = useState(String(initial?.icerik ?? ""));
  const [onem, setOnem] = useState(String(initial?.onem ?? "Normal"));
  const [renk, setRenk] = useState(String(initial?.renk ?? presetRenk ?? "Sarı"));
  const [etiket, setEtiket] = useState(String(initial?.etiket ?? ""));
  const [tarih, setTarih] = useState(String(initial?.tarih ?? BUGUN));
  const [hatirlatma, setHatirlatma] = useState(Boolean(initial?.hatirlatma));

  const kaydet = () => {
    if (!baslik.trim()) return;
    onSave({ baslik: baslik.trim(), icerik, onem, renk, etiket, tarih, hatirlatma, arsiv: initial?.arsiv === true }, initial ? String(initial.id) : undefined);
  };

  const card = (
    <>
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <h3 className="text-sm font-semibold text-ink">{initial ? "Notu Düzenle" : baslik ? baslik : "Yeni Not"}</h3>
        <button onClick={onClose} title={embedded ? "Temizle" : "Kapat"} className="grid h-8 w-8 place-items-center rounded-lg text-ink/60 transition hover:bg-black/10"><X size={16} /></button>
      </div>

      <div className="space-y-3 p-5">
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Başlık" className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-base font-bold text-ink outline-none focus:border-neon-blue" />
        <MentionTextarea value={icerik} onChange={setIcerik} placeholder="Notunuzu yazın… (proje, kişi, cari yazınca liste çıkar)" rows={7} className="w-full resize-y rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-neon-blue" />

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60">Önem</p>
          <div className="flex gap-1.5">
            {ONEM.map((o) => (
              <button key={o} onClick={() => setOnem(o)} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${onem === o ? "text-white" : "border-black/15 bg-white/60 text-ink/70"}`} style={onem === o ? { background: ONEM_RENK[o], borderColor: ONEM_RENK[o] } : undefined}>
                <Flag size={11} /> {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60">Renk</p>
          <div className="flex gap-2">
            {RENK_SIRA.map((rn) => (
              <button key={rn} onClick={() => setRenk(rn)} title={rn} className={`h-7 w-7 rounded-full border-2 transition ${renk === rn ? "ring-2 ring-ink/50 ring-offset-1" : "hover:scale-110"}`} style={{ background: RENK[rn].bg, borderColor: RENK[rn].kenar }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60"><Calendar size={11} /> Tarih</span>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="w-full rounded-lg border border-black/15 bg-white/70 px-2 py-1.5 text-sm text-ink outline-none focus:border-neon-blue" />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60"><Tag size={11} /> Etiket</span>
            <input value={etiket} onChange={(e) => setEtiket(e.target.value)} placeholder="virgülle ayır" className="w-full rounded-lg border border-black/15 bg-white/70 px-2 py-1.5 text-sm text-ink outline-none focus:border-neon-blue" />
          </label>
        </div>
        <button onClick={() => setHatirlatma((v) => !v)} className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${hatirlatma ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-black/15 bg-white/60 text-ink/70"}`}>
          {hatirlatma ? <Bell size={15} fill="currentColor" /> : <BellOff size={15} />} {hatirlatma ? "Hatırlatıcı açık — tarihinde ajandada hatırlatılır" : "Hatırlatıcı ekle"}
        </button>
      </div>

      <div className="flex items-center gap-2 border-t border-black/10 px-5 py-3">
        {initial && onDelete && (
          <button onClick={() => onDelete(String(initial.id))} className="flex items-center gap-1.5 rounded-lg border border-critical/40 px-3 py-2 text-sm font-medium text-critical transition hover:bg-critical/10"><Trash2 size={14} /> Sil</button>
        )}
        <button onClick={kaydet} disabled={!baslik.trim()} className="ml-auto flex items-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"><Save size={15} /> Kaydet</button>
      </div>
    </>
  );

  const bg = RENK[renk]?.bg ?? "#fff";
  if (embedded) return <div className="overflow-hidden rounded-2xl border border-line shadow-sm" style={{ background: bg }}>{card}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line shadow-card animate-fade-in" style={{ background: bg }} onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  );
}
