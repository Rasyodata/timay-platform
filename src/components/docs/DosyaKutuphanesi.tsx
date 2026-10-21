import { useState, useRef } from "react";
import { ChevronLeft, FolderOpen, Plus, Pencil, Trash2, X, Search, Tag, FileText, ScanLine, PenTool, Send, Check, Ban, Lock, FileType2, UploadCloud } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0067";
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const TIP_RENK: Record<string, string> = { PDF: "#C1292E", DOCX: "#0A4EA2", XLSX: "#1E7A46", JPG: "#7858FF", PNG: "#7858FF", TXT: "#5A6B82" };
const ONAY_RENK: Record<string, string> = { "Taslak": "#8795A8", "Onay Bekliyor — Departman Müdürü": "#B5731A", "Onay Bekliyor — Genel Müdür": "#B5731A", "Onaylandı": "#1E7A46", "Reddedildi": "#C1292E" };
// Onay akışı adımları (Nextcloud approval tarzı)
const STAGES = ["Oluşturuldu", "Departman Müdürü", "Genel Müdür", "Onaylandı"];
const stageIdx = (d: string) => d === "Taslak" ? 0 : d === "Onay Bekliyor — Departman Müdürü" ? 1 : d === "Onay Bekliyor — Genel Müdür" ? 2 : d === "Onaylandı" ? 3 : -1;

export default function DosyaKutuphanesi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const { currentUser } = useUsers();
  const mod = getModule(MOD);
  const [selId, setSelId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fSinif, setFSinif] = useState("");
  const [fDurum, setFDurum] = useState("");
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!mod) return <div className="card p-5 text-sm text-muted">Dosya Kütüphanesi tablosu bulunamadı.</div>;
  const docs = mod.records as DynamicRecord[];
  const sinifOpts = (mod.fields.find((f) => f.code === "sinif")?.options ?? []) as string[];
  const durumOpts = (mod.fields.find((f) => f.code === "onay_durumu")?.options ?? []) as string[];
  const filtered = docs.filter((d) =>
    (!q || `${d.ad} ${d.etiketler} ${d.tur} ${d.ocr_metni}`.toLowerCase().includes(q.toLowerCase())) &&
    (!fSinif || String(d.sinif) === fSinif) && (!fDurum || String(d.onay_durumu) === fDurum));
  const sel = docs.find((d) => d.id === selId) ?? docs[0];

  const patch = (p: Record<string, unknown>, msg?: string) => { if (sel) { updateRecord(MOD, String(sel.id), p); if (msg) setNote(msg); } };
  const onayaGonder = () => patch({ onay_durumu: "Onay Bekliyor — Departman Müdürü" }, "Belge Departman Müdürü onayına gönderildi.");
  const onayla = () => {
    const d = String(sel?.onay_durumu);
    if (d === "Onay Bekliyor — Departman Müdürü") patch({ onay_durumu: "Onay Bekliyor — Genel Müdür", onaylayan: currentUser.name }, "Departman Müdürü onayladı → Genel Müdür onayına iletildi.");
    else if (d === "Onay Bekliyor — Genel Müdür") patch({ onay_durumu: "Onaylandı", onaylayan: currentUser.name }, "Belge onaylandı ✓");
  };
  const reddet = () => patch({ onay_durumu: "Reddedildi", onaylayan: currentUser.name }, "Belge reddedildi.");
  const ocrCalistir = () => patch({ ocr_metni: `[OCR] ${String(sel?.ad)} — taranan metin otomatik çıkarıldı ve aranabilir hâle getirildi. (simülasyon)` }, "OCR tamamlandı — belge artık aranabilir.");
  const eImza = () => patch({ e_imza: true, onaylayan: currentUser.name }, "E-imza atıldı ✓ (simülasyon).");

  // Sürükle-bırak dosya yükleme — her dosya taslak belge olarak eklenir (prototip: içerik saklanmaz)
  const humanSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
  const handleFiles = (files: FileList) => {
    const today = new Date().toISOString().slice(0, 10);
    const list = Array.from(files);
    list.forEach((f) => {
      const dot = f.name.lastIndexOf(".");
      const ad = dot > 0 ? f.name.slice(0, dot) : f.name;
      const tip = (dot > 0 ? f.name.slice(dot + 1) : "DOC").toUpperCase();
      addRecord(MOD, {
        ad, dosya_tipi: tip, boyut: humanSize(f.size), tur: "Yüklenen Belge",
        sinif: sinifOpts[0] || "Genel", onay_durumu: "Taslak", erisim: "Herkes",
        versiyon: "v1.0", sahibi: currentUser.name, yuklenme: today, etiketler: "",
      });
    });
    setNote(`${list.length} dosya yüklendi — taslak belge olarak eklendi (prototip: içerik canlıda saklanır).`);
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 md:p-6">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"><ChevronLeft size={14} /> Çalışma Alanım</button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><FolderOpen size={22} className="text-neon-blue" /> Dosya Kütüphanesi (EDMS)</h1>
          <p className="mt-1 text-sm text-muted">Mayan EDMS + Nextcloud tarzı · sınıflandırma · OCR arama · rol bazlı erişim · çok aşamalı onay · e-imza.</p>
        </div>
        <button onClick={() => setModal("new")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Belge Ekle</button>
      </header>

      {note && <div className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{note}</div>}

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara… (ad, etiket, OCR metni)" className="w-full rounded-lg border border-line bg-base/60 py-2 pl-8 pr-2 text-sm text-ink outline-none focus:border-neon-blue/50" />
        </div>
        <select value={fSinif} onChange={(e) => setFSinif(e.target.value)} className="rounded-lg border border-line bg-base/60 px-2 py-2 text-sm text-ink outline-none"><option value="">Tüm sınıflar</option>{sinifOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        <select value={fDurum} onChange={(e) => setFDurum(e.target.value)} className="rounded-lg border border-line bg-base/60 px-2 py-2 text-sm text-ink outline-none"><option value="">Tüm durumlar</option>{durumOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      </div>

      {/* Sürükle-bırak dosya yükleme alanı */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition ${dragOver ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-line bg-base/40 text-muted hover:border-neon-blue/40 hover:text-ink"}`}
      >
        <UploadCloud size={22} className={dragOver ? "text-neon-blue" : "text-faint"} />
        <span>Dosyaları buraya <b className="text-ink">sürükleyip bırakın</b> ya da tıklayıp seçin — otomatik taslak belge olarak eklenir.</span>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Sol liste */}
        <div className="card max-h-[640px] space-y-1 overflow-y-auto p-2">
          {filtered.map((d) => {
            const active = sel && d.id === sel.id;
            return (
              <button key={d.id} onClick={() => setSelId(String(d.id))} className={`w-full rounded-lg border p-2.5 text-left transition ${active ? "border-neon-blue/50 bg-neon-blue/5" : "border-transparent hover:bg-elevated"}`}>
                <div className="flex items-start gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded text-[8px] font-bold text-white" style={{ background: TIP_RENK[String(d.dosya_tipi)] || "#5A6B82" }}>{String(d.dosya_tipi || "DOC")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{String(d.ad)}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[10px] text-muted">{String(d.tur || "")}</span>
                      <span className="h-1 w-1 rounded-full bg-faint" />
                      <span className="text-[10px] font-medium" style={{ color: ONAY_RENK[String(d.onay_durumu)] ?? "#8795A8" }}>{String(d.onay_durumu).replace("Onay Bekliyor — ", "Bekliyor: ")}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="p-4 text-center text-xs text-muted">Belge bulunamadı.</p>}
        </div>

        {/* Sağ detay */}
        <div className="card p-5">
          {sel ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-14 w-12 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: TIP_RENK[String(sel.dosya_tipi)] || "#5A6B82" }}>{String(sel.dosya_tipi || "DOC")}</span>
                  <div>
                    <h2 className="text-lg font-bold text-ink">{String(sel.ad)}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="rounded-full border border-line px-2 py-0.5">{String(sel.tur)}</span>
                      <span>{String(sel.sinif)}</span>
                      <span>{String(sel.boyut)} · {String(sel.versiyon)}</span>
                      <span className="inline-flex items-center gap-1"><Lock size={11} /> {String(sel.erisim)}</span>
                      {sel.e_imza === true && <span className="inline-flex items-center gap-1 text-good"><PenTool size={11} /> E-İmzalı</span>}
                    </div>
                    {sel.etiketler ? <p className="mt-1 flex items-center gap-1 text-[11px] text-faint"><Tag size={11} /> {String(sel.etiketler)}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setModal(sel)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated hover:text-neon-blue" title="Düzenle"><Pencil size={14} /></button>
                  <button onClick={() => { deleteRecord(MOD, String(sel.id)); setSelId(null); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-critical/10 hover:text-critical" title="Sil"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Önizleme */}
              <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-line bg-base/40 py-10">
                <FileText size={42} className="text-faint" />
                <p className="mt-2 text-xs text-muted">Önizleme — {String(sel.dosya_tipi)} · {String(sel.boyut)}</p>
                <p className="text-[10px] text-faint">(Prototip: dosya içeriği canlı sürümde gösterilir)</p>
              </div>

              {/* Onay akışı */}
              <div className="mt-4 rounded-xl border border-line p-4">
                <h3 className="mb-3 text-sm font-semibold text-ink">Onay Akışı</h3>
                {String(sel.onay_durumu) === "Reddedildi" ? (
                  <p className="rounded-lg bg-critical/10 px-3 py-2 text-xs font-medium text-critical">✕ Belge reddedildi{sel.onaylayan ? ` · ${String(sel.onaylayan)}` : ""}</p>
                ) : (
                  <div className="flex items-center">
                    {STAGES.map((s, i) => {
                      const cur = stageIdx(String(sel.onay_durumu));
                      const st = i < cur ? "done" : i === cur ? "cur" : "wait";
                      return (
                        <div key={s} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center">
                            <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${st === "done" ? "bg-good text-white" : st === "cur" ? "bg-neon-blue text-white" : "border border-line text-faint"}`}>{st === "done" ? <Check size={13} /> : i + 1}</span>
                            <span className={`mt-1 whitespace-nowrap text-[9px] ${st === "wait" ? "text-faint" : "text-ink"}`}>{s}</span>
                          </div>
                          {i < STAGES.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < cur ? "bg-good" : "bg-line"}`} />}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {String(sel.onay_durumu) === "Taslak" && <button onClick={onayaGonder} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"><Send size={13} /> Onaya Gönder</button>}
                  {(String(sel.onay_durumu) === "Onay Bekliyor — Departman Müdürü" || String(sel.onay_durumu) === "Onay Bekliyor — Genel Müdür") && (<>
                    <button onClick={onayla} className="flex items-center gap-1.5 rounded-lg bg-good px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"><Check size={13} /> Onayla</button>
                    <button onClick={reddet} className="flex items-center gap-1.5 rounded-lg border border-critical/40 bg-critical/10 px-3 py-1.5 text-xs font-semibold text-critical transition hover:bg-critical/20"><Ban size={13} /> Reddet</button>
                  </>)}
                  {(String(sel.onay_durumu) === "Onaylandı" || String(sel.onay_durumu) === "Reddedildi") && <button onClick={() => patch({ onay_durumu: "Taslak", onaylayan: "" }, "Belge taslağa alındı.")} className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-elevated">Taslağa Al</button>}
                </div>
              </div>

              {/* EDMS işlemleri */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={ocrCalistir} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-elevated hover:text-ink"><ScanLine size={13} /> OCR Çalıştır</button>
                <button onClick={eImza} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-elevated hover:text-ink"><PenTool size={13} /> E-İmza At</button>
                <button onClick={() => onNavigate("dokumanlar")} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:bg-elevated hover:text-ink"><FileType2 size={13} /> Doküman/Wiki</button>
              </div>

              {sel.ocr_metni ? <div className="mt-3 rounded-lg bg-base/40 p-3"><p className="mb-1 text-[11px] font-semibold text-muted">OCR Metni (aranabilir)</p><p className="text-xs text-ink">{String(sel.ocr_metni)}</p></div> : null}
              <p className="mt-3 text-[11px] text-faint">Sahip: {String(sel.sahibi || "—")} · Yüklenme: {dmy(String(sel.yuklenme))} · Son işlem: {String(sel.onaylayan || "—")}</p>
            </>
          ) : <p className="py-10 text-center text-sm text-muted">Soldan bir belge seçin veya "Belge Ekle".</p>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Belge" : String((modal as DynamicRecord).ad ?? "Belge")}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4"><RecordForm mod={mod} initial={modal === "new" ? undefined : (modal as DynamicRecord)} onClose={() => setModal(null)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
