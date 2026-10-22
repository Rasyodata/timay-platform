import { useMemo, useState } from "react";
import {
  Plus, Search, X, Trash2, StickyNote, Tag, Calendar, Bell, BellOff,
  Archive, ArchiveRestore, Flag, Save, MessageSquare,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import MesajGonderModal from "@/components/messaging/MesajGonderModal";
import MentionTextarea from "@/components/common/MentionTextarea";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0068";
const BUGUN = "2026-10-17";

// Yapışkan kağıt renkleri (mantar pano estetiği)
const RENK_SIRA = ["Sarı", "Yeşil", "Mavi", "Pembe", "Mor", "Gri"] as const;
const RENK: Record<string, { bg: string; kenar: string }> = {
  Sarı: { bg: "#FEF08A", kenar: "#FACC15" },
  Yeşil: { bg: "#BBF7D0", kenar: "#4ADE80" },
  Mavi: { bg: "#BFE3FF", kenar: "#60A5FA" },
  Pembe: { bg: "#FBCFE8", kenar: "#F472B6" },
  Mor: { bg: "#E9D5FF", kenar: "#A78BFA" },
  Gri: { bg: "#ECE7DE", kenar: "#CBB89D" },
};
// Önem seviyeleri
const ONEM = ["Düşük", "Normal", "Yüksek", "Kritik"] as const;
const ONEM_RENK: Record<string, string> = { Düşük: "#64748B", Normal: "#0A4EA2", Yüksek: "#B5731A", Kritik: "#C1292E" };
// Raptiye renkleri (dekoratif)
const RAPTIYE = ["#DC2626", "#2563EB", "#16A34A", "#D97706", "#7C3AED"];

const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");
const hashNum = (s: string, mod: number) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h % mod; };

export default function NotesPage(_props: { onNavigate?: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const [q, setQ] = useState("");
  const [sekme, setSekme] = useState<"aktif" | "arsiv">("aktif");
  const [editor, setEditor] = useState<DynamicRecord | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dateEditId, setDateEditId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<{ baslik: string; icerik: string } | null>(null);

  const mod = getModule(MOD);
  const records = (mod?.records ?? []) as DynamicRecord[];

  const notes = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    return records
      .filter((r) => (sekme === "arsiv" ? r.arsiv === true : r.arsiv !== true))
      .filter((r) => (qn ? [r.baslik, r.icerik, r.etiket].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)) : true))
      .sort((a, b) => {
        // Serbest sıra (sürükle-bırak); sıra yoksa sona, eşitlikte tarihe göre
        const sa = Number.isFinite(Number(a.sira)) && a.sira != null && a.sira !== "" ? Number(a.sira) : 1e9;
        const sb = Number.isFinite(Number(b.sira)) && b.sira != null && b.sira !== "" ? Number(b.sira) : 1e9;
        if (sa !== sb) return sa - sb;
        return String(b.tarih ?? "").localeCompare(String(a.tarih ?? ""));
      });
  }, [records, q, sekme]);

  const aktifSayi = records.filter((r) => r.arsiv !== true).length;
  const arsivSayi = records.filter((r) => r.arsiv === true).length;
  const chips = (etiket: unknown) => String(etiket ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const setRenk = (r: DynamicRecord, renk: string) => updateRecord(MOD, String(r.id), { renk });
  const toggleHatirlatma = (r: DynamicRecord) => updateRecord(MOD, String(r.id), { hatirlatma: !r.hatirlatma });
  const toggleArsiv = (r: DynamicRecord) => updateRecord(MOD, String(r.id), { arsiv: !r.arsiv });
  const setTarih = (r: DynamicRecord, tarih: string) => { updateRecord(MOD, String(r.id), { tarih }); setDateEditId(null); };
  const remove = (id: string) => { deleteRecord(MOD, id); setConfirmId(null); };

  // Sürükle-bırak ile elle sıralama — görünen notlar yeniden dizilir ve sira güncellenir
  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = notes.map((n) => String(n.id));
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    if (from < 0 || to < 0) { setDragId(null); setOverId(null); return; }
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    ids.forEach((id, i) => updateRecord(MOD, id, { sira: i + 1 }));
    setDragId(null); setOverId(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><StickyNote size={20} /></span>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-ink">Notlar <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted">T-0068</span></h1>
            <p className="text-xs text-muted">{aktifSayi} aktif · {arsivSayi} arşiv</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Aktif / Arşiv */}
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-base/50 p-0.5">
            <button onClick={() => setSekme("aktif")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${sekme === "aktif" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}>Aktif</button>
            <button onClick={() => setSekme("arsiv")} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${sekme === "arsiv" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}><Archive size={13} /> Arşiv</button>
          </div>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Not ara…" className="w-52 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-64 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
          <button onClick={() => setEditor("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"><Plus size={16} /> Yeni Not</button>
        </div>
      </div>

      {/* Not panosu (düz zemin) */}
      <div className="pt-2">
        {notes.length === 0 ? (
          <div className="card grid place-items-center gap-2 py-16 text-center">
            <StickyNote size={34} className="text-faint" />
            <p className="text-sm font-medium text-muted">{q ? "Eşleşen not yok." : sekme === "arsiv" ? "Arşivde not yok." : "Henüz not yok."}</p>
            {!q && sekme === "aktif" && <button onClick={() => setEditor("new")} className="mt-1 rounded-lg bg-neon-blue px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">İlk notu ekle →</button>}
          </div>
        ) : (
          <div className="gap-5 [column-fill:_balance] sm:columns-2 lg:columns-3 xl:columns-4">
            {notes.map((r) => {
              const c = RENK[String(r.renk)] ?? RENK.Sarı;
              const rot = hashNum(String(r.id), 7) - 3; // -3..3 derece
              const pin = RAPTIYE[hashNum(String(r.id) + "p", RAPTIYE.length)];
              const onem = String(r.onem || "Normal");
              const bugunMu = String(r.tarih) === BUGUN;
              return (
                <div key={r.id}
                  draggable
                  onDragStart={() => setDragId(String(r.id))}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (overId !== String(r.id)) setOverId(String(r.id)); }}
                  onDrop={(e) => { e.preventDefault(); reorder(String(r.id)); }}
                  className={`group relative mb-5 cursor-grab break-inside-avoid transition active:cursor-grabbing ${dragId === String(r.id) ? "opacity-40" : ""} ${overId === String(r.id) && dragId && dragId !== String(r.id) ? "ring-2 ring-neon-blue ring-offset-2 rounded-sm" : ""}`}
                  style={{ transform: `rotate(${rot}deg)` }}>
                  {/* Raptiye */}
                  <span className="absolute left-1/2 top-0 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: pin, boxShadow: "0 2px 3px rgba(0,0,0,0.45), inset -1px -1px 2px rgba(0,0,0,0.3)" }}>
                    <span className="absolute left-1 top-0.5 h-1 w-1 rounded-full bg-white/70" />
                  </span>

                  <div className="overflow-hidden rounded-sm pt-3 shadow-[2px_4px_10px_rgba(0,0,0,0.28)]" style={{ background: c.bg }}>
                    <div className="px-4 pb-3">
                      {/* Başlık + önem + aksiyon ikonları */}
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-1.5">
                          <Flag size={13} className="mt-0.5 shrink-0" style={{ color: ONEM_RENK[onem] }} fill={onem === "Kritik" || onem === "Yüksek" ? ONEM_RENK[onem] : "transparent"} />
                          <button onClick={() => setEditor(r)} className="text-left text-[15px] font-bold leading-tight text-ink">{String(r.baslik)}</button>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => setMsgModal({ baslik: String(r.baslik), icerik: String(r.icerik ?? "") })} title="Mesaj olarak gönder" className="grid h-6 w-6 place-items-center rounded text-ink/50 hover:bg-black/10 hover:text-neon-blue"><MessageSquare size={13} /></button>
                          <button onClick={() => toggleArsiv(r)} title={r.arsiv ? "Arşivden çıkar" : "Arşivle"} className="grid h-6 w-6 place-items-center rounded text-ink/50 hover:bg-black/10 hover:text-ink">
                            {r.arsiv ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                          </button>
                          {confirmId === String(r.id) ? (
                            <button onClick={() => remove(String(r.id))} className="rounded bg-critical px-1.5 py-0.5 text-[10px] font-bold text-white">Sil?</button>
                          ) : (
                            <button onClick={() => setConfirmId(String(r.id))} title="Sil" className="grid h-6 w-6 place-items-center rounded text-ink/50 hover:bg-black/10 hover:text-critical"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </div>

                      {/* Büyük not alanı */}
                      <button onClick={() => setEditor(r)} className="block w-full text-left">
                        <p className="min-h-[72px] whitespace-pre-wrap text-[14px] leading-relaxed text-ink/85">{String(r.icerik ?? "")}</p>
                      </button>

                      {/* Etiketler */}
                      {chips(r.etiket).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips(r.etiket).map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-ink/70"><Tag size={9} /> {t}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alt bar: renk · tarih · hatırlatıcı (ikonlarla değiştir) */}
                    <div className="flex items-center gap-2 border-t border-black/10 bg-black/[0.04] px-3 py-2">
                      {/* Renk değiştir */}
                      <div className="flex items-center gap-1">
                        {RENK_SIRA.map((rn) => (
                          <button key={rn} onClick={() => setRenk(r, rn)} title={rn} className={`h-3.5 w-3.5 rounded-full border transition ${String(r.renk) === rn ? "ring-2 ring-ink/40 ring-offset-1" : "hover:scale-110"}`} style={{ background: RENK[rn].bg, borderColor: RENK[rn].kenar }} />
                        ))}
                      </div>
                      <span className="mx-0.5 h-4 w-px bg-black/10" />
                      {/* Tarih (ikonla) */}
                      {dateEditId === String(r.id) ? (
                        <input type="date" autoFocus defaultValue={String(r.tarih || "")} onBlur={(e) => setTarih(r, e.target.value)} onChange={(e) => setTarih(r, e.target.value)} className="rounded border border-black/20 bg-white/70 px-1 py-0.5 text-[11px] text-ink" />
                      ) : (
                        <button onClick={() => setDateEditId(String(r.id))} className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition hover:bg-black/10 ${bugunMu ? "font-bold text-neon-blue" : "text-ink/70"}`} title="Tarihi değiştir">
                          <Calendar size={12} /> {r.tarih ? dmy(String(r.tarih)) : "Tarih"}
                        </button>
                      )}
                      {/* Hatırlatıcı */}
                      <button onClick={() => toggleHatirlatma(r)} title={r.hatirlatma ? "Hatırlatıcı açık" : "Hatırlatıcı ekle"} className={`ml-auto grid h-6 w-6 place-items-center rounded transition hover:bg-black/10 ${r.hatirlatma ? "text-neon-blue" : "text-ink/40"}`}>
                        {r.hatirlatma ? <Bell size={13} fill="currentColor" /> : <BellOff size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editor && <NoteEditor initial={editor === "new" ? null : editor} onClose={() => setEditor(null)}
        onSave={(data, id) => { if (id) updateRecord(MOD, id, data); else addRecord(MOD, data); setEditor(null); }}
        onDelete={editor !== "new" ? (id) => { deleteRecord(MOD, id); setEditor(null); } : undefined} />}
      {msgModal && <MesajGonderModal baslik={msgModal.baslik} icerik={msgModal.icerik} onClose={() => setMsgModal(null)} />}
    </div>
  );
}

// ── Özel not editörü (büyük içerik alanı) ──────────────────────────────────
function NoteEditor({ initial, onClose, onSave, onDelete }: {
  initial: DynamicRecord | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [baslik, setBaslik] = useState(String(initial?.baslik ?? ""));
  const [icerik, setIcerik] = useState(String(initial?.icerik ?? ""));
  const [onem, setOnem] = useState(String(initial?.onem ?? "Normal"));
  const [renk, setRenk] = useState(String(initial?.renk ?? "Sarı"));
  const [etiket, setEtiket] = useState(String(initial?.etiket ?? ""));
  const [tarih, setTarih] = useState(String(initial?.tarih ?? BUGUN));
  const [hatirlatma, setHatirlatma] = useState(Boolean(initial?.hatirlatma));

  const kaydet = () => {
    if (!baslik.trim()) return;
    onSave({ baslik: baslik.trim(), icerik, onem, renk, etiket, tarih, hatirlatma, arsiv: initial?.arsiv === true }, initial ? String(initial.id) : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line shadow-card animate-fade-in" style={{ background: RENK[renk]?.bg ?? "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">{initial ? "Notu Düzenle" : "Yeni Not"}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink/60 transition hover:bg-black/10"><X size={16} /></button>
        </div>

        <div className="space-y-3 p-5">
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Başlık" className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-base font-bold text-ink outline-none focus:border-neon-blue" />
          {/* Büyük not alanı — proje/kişi/cari/daire/görev otomatik tamamlama */}
          <MentionTextarea value={icerik} onChange={setIcerik} placeholder="Notunuzu yazın… (proje, kişi, cari yazınca liste çıkar)" rows={9} className="w-full resize-y rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-neon-blue" />

          {/* Önem */}
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

          {/* Renk */}
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60">Renk</p>
            <div className="flex gap-2">
              {RENK_SIRA.map((rn) => (
                <button key={rn} onClick={() => setRenk(rn)} title={rn} className={`h-7 w-7 rounded-full border-2 transition ${renk === rn ? "ring-2 ring-ink/50 ring-offset-1" : "hover:scale-110"}`} style={{ background: RENK[rn].bg, borderColor: RENK[rn].kenar }} />
              ))}
            </div>
          </div>

          {/* Tarih + Etiket + Hatırlatıcı */}
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
      </div>
    </div>
  );
}
