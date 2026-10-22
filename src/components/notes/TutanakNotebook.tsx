import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Users, MapPin, ClipboardList, Target, Gavel, AlertTriangle, CheckSquare, Square,
  CheckCircle2, Plus, Pencil, Check, ChevronLeft, ChevronRight, Search, X, Trash2,
  Printer, Mail, Save, FolderKanban, Scale, Briefcase,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useProjects } from "@/context/ProjectsContext";
import { useUsers } from "@/context/UsersContext";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0063";
const HAND = "'Patrick Hand', 'Comic Sans MS', ui-rounded, cursive";
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DURUM_SEC = ["Bekliyor", "Planlandı", "Devam Ediyor", "Tamamlandı", "İptal"];
const DURUM_RENK: Record<string, { bg: string; tx: string }> = {
  "Devam Ediyor": { bg: "#FEF08A", tx: "#92610A" },
  "Planlandı": { bg: "#BFDBFE", tx: "#1E40AF" },
  "Bekliyor": { bg: "#E5E7EB", tx: "#475569" },
  "Tamamlandı": { bg: "#BBF7D0", tx: "#166534" },
  "İptal": { bg: "#FECACA", tx: "#991B1B" },
};

const lines = (v: unknown) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const commas = (v: unknown) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
// Düzenleme için kayıpsız bölme (trim/filter YOK) — yazarken dizi yeniden indekslenmesin, harfler birleşmesin
const nlRaw = (v: unknown) => { const s = String(v ?? ""); return s.length ? s.split("\n") : []; };
const cmRaw = (v: unknown) => { const s = String(v ?? ""); return s.length ? s.split(", ") : []; };
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");

// Mention/otomatik tamamlama kaynağı — yazarken tetikleyici kelime (regex) eşleşince items() listesi önerilir.
type MSrc = { test: RegExp; label: string; items: () => string[] };
const MentionCtx = createContext<MSrc[]>([]);

// Metin içinde yazarken öneri gösteren akıllı input: "proje" yazınca projeler, "kullanıcı" yazınca kullanıcılar,
// "avukat" yazınca avukatlar, "müvekkil" yazınca müvekkiller açılır; seçince tetikleyici kelimenin yerine ad yazılır.
function MentionInput({ value, onChange, placeholder, className, style }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; style?: CSSProperties }) {
  const sources = useContext(MentionCtx);
  const [open, setOpen] = useState(false);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState("");
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const caretRef = useRef(0);
  const ref = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && popRef.current && !popRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openFor = (src: MSrc, caret: number) => {
    setAllItems(src.items()); setCat(src.label); setFilter(""); caretRef.current = caret;
    const r = ref.current?.getBoundingClientRect();
    if (r) setRect({ left: r.left, top: r.bottom, width: r.width });
    setOpen(true);
  };
  const handle = (v: string, caret: number) => {
    onChange(v);
    const m = v.slice(0, caret).match(/([\p{L}]{3,})$/u);
    const word = m ? m[1].toLocaleLowerCase("tr") : "";
    const src = word ? sources.find((s) => s.test.test(word)) : undefined;
    if (src) openFor(src, caret); else setOpen(false);
  };
  const pick = (label: string) => {
    const caret = caretRef.current;
    const before = value.slice(0, caret).replace(/[\p{L}]+$/u, label);
    const nv = before + value.slice(caret);
    onChange(nv); setOpen(false);
    requestAnimationFrame(() => { ref.current?.focus(); const p = before.length; ref.current?.setSelectionRange(p, p); });
  };
  const fq = filter.trim().toLocaleLowerCase("tr");
  const shown = (fq ? allItems.filter((it) => it.toLocaleLowerCase("tr").includes(fq)) : allItems).slice(0, 50);

  return (
    <div className="relative min-w-0 flex-1">
      <input ref={ref} value={value} placeholder={placeholder}
        onChange={(e) => handle(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className={className} style={style} />
      {open && rect && createPortal(
        <div ref={popRef} className="fixed z-[100] max-h-72 overflow-y-auto rounded-lg border border-line bg-panel p-1 font-sans shadow-card" style={{ left: rect.left, top: rect.top + 4, width: Math.max(rect.width, 250) }}>
          <div className="flex items-center gap-2 px-1.5 pb-1 pt-0.5"><span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{cat} — seç</span><span className="ml-auto text-[10px] text-faint">{shown.length}</span></div>
          {allItems.length > 6 && (
            <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ara…" className="mb-1 w-full rounded border border-line bg-base/60 px-2 py-1 text-[12px] text-ink outline-none focus:border-neon-blue" />
          )}
          {shown.map((it, i) => (
            <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); pick(it); }} className="block w-full truncate rounded px-2 py-1 text-left text-[13px] text-ink transition hover:bg-elevated">{it}</button>
          ))}
          {shown.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-faint">{allItems.length === 0 ? "Bu türde kayıt yok" : "Eşleşen yok"}</p>}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Satır-içi düzenlenebilir madde listesi — YEREL state tutar; yazarken storage'dan türetip
// yeniden indekslemez. Her satır akıllı (mention) input'tur.
function EditList({ value, onChange, ph, sep = "\n" }: { value: string; onChange: (v: string) => void; ph: string; sep?: string }) {
  const split = (s: string) => (s.length ? s.split(sep) : []);
  const [items, setItems] = useState<string[]>(() => split(value));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { setItems(split(value)); last.current = value; } }, [value]);
  const push = (next: string[]) => { setItems(next); const j = next.join(sep); last.current = j; onChange(j); };
  return (
    <div className="space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <MentionInput value={it} onChange={(nv) => push(items.map((x, j) => (j === i ? nv : x)))} placeholder={ph}
            className="w-full rounded border border-black/15 bg-white/80 px-2 py-0.5 text-[15px] text-ink outline-none focus:border-neon-blue" style={{ fontFamily: HAND }} />
          <button onClick={() => push(items.filter((_, j) => j !== i))} className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink/40 hover:bg-black/10 hover:text-critical"><X size={13} /></button>
        </div>
      ))}
      {items.length === 0 && <p className="text-[13px] text-ink/40">{ph} → yazarken "proje / kullanıcı / avukat" önerilir</p>}
    </div>
  );
}

export default function TutanakNotebook({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const { projects } = useProjects();
  const { users } = useUsers();
  const mod = getModule(MOD);
  const recs = (mod?.records ?? []) as DynamicRecord[];
  const avukatlar = (getModule("mod-T-0017")?.records ?? []) as DynamicRecord[];
  const muvekkiller = (getModule("mod-T-0083")?.records ?? []) as DynamicRecord[];
  const davalar = (getModule("mod-T-0016")?.records ?? []) as DynamicRecord[];
  const gorevler = (getModule("mod-T-0056")?.records ?? []) as DynamicRecord[];
  const urunler = (getModule("mod-T-0085")?.records ?? []) as DynamicRecord[];
  const kasalar = (getModule("mod-T-0006")?.records ?? []) as DynamicRecord[];
  const sozlesmeler = (getModule("mod-T-0073")?.records ?? []) as DynamicRecord[];
  const notlar = (getModule("mod-T-0068")?.records ?? []) as DynamicRecord[];
  const [saved, setSaved] = useState(false);
  // Metin içinde yazarken öneri kaynakları: yazılan kelimeye göre liste açılır. Yeni kaynak eklemek için diziye satır ekleyin.
  const mentionSources: MSrc[] = useMemo(() => [
    { test: /proje/, label: "Projeler", items: () => projects.map((p) => `${p.code} · ${p.name}`) },
    { test: /kullanıc|kişi|katılımc|personel|sorumlu/, label: "Kullanıcılar", items: () => users.filter((u) => u.active).map((u) => u.name) },
    { test: /cari|müşteri|musteri|tedarik|satıcı|satici/, label: "Cari / Kişiler", items: () => users.map((u) => u.name) },
    { test: /avukat|vekil/, label: "Avukatlar", items: () => avukatlar.map((a) => String(a.avukat)).filter(Boolean) },
    { test: /müvekkil|muvekkil/, label: "Müvekkiller", items: () => muvekkiller.map((m) => String(m.ad)).filter(Boolean) },
    { test: /dosya|dava|icra/, label: "Dava / Dosya", items: () => davalar.map((d) => `${d.dosya_no} · ${d.dosya_konusu}`) },
    { test: /görev|gorev/, label: "Görevler", items: () => gorevler.map((g) => String(g.baslik)).filter(Boolean) },
    { test: /ürün|urun|hizmet|mal\b/, label: "Ürün / Hizmet", items: () => urunler.map((u) => `${u.ad}${u.kod ? ` (${u.kod})` : ""}`) },
    { test: /kasa|banka|hesap/, label: "Kasa / Hesap", items: () => kasalar.map((k) => String(k.ad)).filter(Boolean) },
    { test: /sözleşme|sozlesme|kira/, label: "Sözleşmeler", items: () => sozlesmeler.map((s) => String(s.sozlesme_no || s.daire)).filter(Boolean) },
    { test: /^not/, label: "Notlar", items: () => notlar.map((n) => String(n.baslik)).filter(Boolean) },
  ], [projects, users, avukatlar, muvekkiller, davalar, gorevler, urunler, kasalar, sozlesmeler, notlar]);
  const [selId, setSelId] = useState<string | null>(recs[0] ? String(recs[0].id) : null);
  const [edit, setEdit] = useState(false);
  const [q, setQ] = useState("");
  const [pendingNo, setPendingNo] = useState<string | null>(null);
  // Hızlı Ekle — sürüklenen bölüm
  const [dragSec, setDragSec] = useState<string | null>(null);

  // Yeni oluşturulan tutanağı seç
  useEffect(() => {
    if (!pendingNo) return;
    const yeni = recs.find((r) => String(r.tutanak_no) === pendingNo);
    if (yeni) { setSelId(String(yeni.id)); setPendingNo(null); }
  }, [recs, pendingNo]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLocaleLowerCase("tr");
    if (!qn) return recs;
    return recs.filter((r) => [r.tutanak_no, r.toplanti, r.gorusulen, r.kararlar, r.gundem, r.katilimcilar].some((v) => String(v ?? "").toLocaleLowerCase("tr").includes(qn)));
  }, [recs, q]);

  const sel = useMemo(() => recs.find((r) => String(r.id) === selId) ?? filtered[0] ?? recs[0], [recs, selId, filtered]);

  const olustur = () => {
    const yil = new Date().getFullYear();
    const nums = recs.map((r) => { const m = String(r.tutanak_no ?? "").match(/(\d+)\s*$/); return m ? parseInt(m[1]) : 0; });
    const no = `TTN-${yil}-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    addRecord(MOD, { tutanak_no: no, toplanti: "Yeni Toplantı Notu", tarih: today, durum: "Açık" });
    setPendingNo(no);
    setEdit(true);
  };

  if (!sel) {
    return (
      <div className="mx-auto max-w-[1500px] p-6">
        <div className="card grid place-items-center gap-2 p-16 text-center">
          <ClipboardList size={34} className="text-faint" />
          <p className="text-sm text-muted">Henüz toplantı notu yok.</p>
          <button onClick={olustur} className="mt-1 flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-sm font-semibold text-white"><Plus size={15} /> Yeni Toplantı Tutanağı</button>
        </div>
      </div>
    );
  }

  const idx = recs.findIndex((r) => String(r.id) === String(sel.id));
  const goPrev = () => { if (idx > 0) setSelId(String(recs[idx - 1].id)); };
  const goNext = () => { if (idx < recs.length - 1) setSelId(String(recs[idx + 1].id)); };

  const UP = (patch: Record<string, unknown>) => updateRecord(MOD, String(sel.id), patch);
  const setL = (field: string, arr: string[]) => UP({ [field]: arr.join("\n") });
  const setC = (field: string, arr: string[]) => UP({ [field]: arr.join(", ") });

  const d = sel.tarih ? new Date(String(sel.tarih) + "T00:00:00") : null;
  const tarihStr = d ? `${d.getDate()} ${TR_AY[d.getMonth()]} ${d.getFullYear()}` : "";
  const gunStr = d ? TR_GUN[d.getDay()] : "";

  const katilimcilar = lines(sel.katilimcilar);
  const amac = lines(sel.amac);
  const gundem = lines(sel.gundem);
  const gorusulen = lines(sel.gorusulen);
  const onemli = lines(sel.onemli_notlar);
  const kararlar = lines(sel.kararlar);
  const hedefler = commas(sel.hedefler);
  const surecArr = commas(sel.surec).map((s) => { const [ad, sure] = s.split(":"); return { ad: (ad || "").trim(), sure: (sure || "").trim() }; });
  const sorumlular = lines(sel.sorumlular);
  const riskler = lines(sel.riskler);
  const aksArr = lines(sel.aksiyonlar).map((l) => { const [is, sor, trh, drm] = l.split("|").map((x) => (x || "").trim()); return { is, sor, trh, drm }; });

  const setAks = (rows: typeof aksArr) => UP({ aksiyonlar: rows.map((r) => `${r.is} | ${r.sor} | ${r.trh} | ${r.drm}`).join("\n") });
  const setSurec = (rows: typeof surecArr) => UP({ surec: rows.map((r) => `${r.ad}:${r.sure}`).join(", ") });

  // Hızlı Ekle bölümleri — her biri ilgili deftere boş bir madde ekler (düzenleme modunu açar)
  // Not: lines()/commas() boş satırları eler; bu yüzden Hızlı Ekle boş değil görünür placeholder ekler (kullanıcı üzerine yazar).
  const SECTIONS = [
    { key: "katilimcilar", label: "Katılımcı", icon: Users, c: "#93C5FD", add: () => setL("katilimcilar", [...nlRaw(sel.katilimcilar), "Yeni katılımcı"]) },
    { key: "amac", label: "Amaç", icon: Target, c: "#FDE68A", add: () => setL("amac", [...nlRaw(sel.amac), "Yeni amaç"]) },
    { key: "gundem", label: "Gündem", icon: ClipboardList, c: "#60A5FA", add: () => setL("gundem", [...nlRaw(sel.gundem), "Yeni gündem maddesi"]) },
    { key: "onemli", label: "Önemli Not", icon: AlertTriangle, c: "#F9A8D4", add: () => setL("onemli_notlar", [...nlRaw(sel.onemli_notlar), "Yeni not"]) },
    { key: "gorusulen", label: "Görüşülen", icon: ClipboardList, c: "#86EFAC", add: () => setL("gorusulen", [...nlRaw(sel.gorusulen), "Yeni görüşülen konu"]) },
    { key: "kararlar", label: "Karar", icon: Gavel, c: "#86EFAC", add: () => setL("kararlar", [...nlRaw(sel.kararlar), "Yeni karar"]) },
    { key: "hedefler", label: "Hedef", icon: Target, c: "#FCA5A5", add: () => setC("hedefler", [...cmRaw(sel.hedefler), "Yeni hedef"]) },
    { key: "surec", label: "Aşama", icon: ClipboardList, c: "#93C5FD", add: () => setSurec([...surecArr, { ad: "Yeni aşama", sure: "" }]) },
    { key: "sorumlular", label: "Sorumlu", icon: Users, c: "#F9A8D4", add: () => setL("sorumlular", [...nlRaw(sel.sorumlular), "Ad: Sorumluluk"]) },
    { key: "riskler", label: "Risk", icon: AlertTriangle, c: "#FDE68A", add: () => setL("riskler", [...nlRaw(sel.riskler), "Yeni risk"]) },
    { key: "aksiyonlar", label: "Aksiyon", icon: CheckCircle2, c: "#86EFAC", add: () => setAks([...aksArr, { is: "Yeni iş", sor: "", trh: "", drm: "Bekliyor" }]) },
  ];
  const quickAdd = (key: string) => { setEdit(true); SECTIONS.find((s) => s.key === key)?.add(); };

  // Tutanağın düz metin dökümü — yazdır ve mail için
  const tutanakText = () => {
    const list = (label: string, arr: string[]) => (arr.length ? `\n${label}:\n${arr.map((x, i) => `  ${i + 1}. ${x}`).join("\n")}` : "");
    return [
      `TOPLANTI TUTANAĞI — ${String(sel.tutanak_no || "")}`,
      sel.toplanti ? `Konu: ${String(sel.toplanti)}` : "",
      tarihStr ? `Tarih: ${tarihStr}${sel.saat ? ` / ${String(sel.saat)}` : ""}` : "",
      sel.yer ? `Yer: ${String(sel.yer)}` : "",
      sel.proje ? `Proje: ${String(sel.proje)}` : "",
      sel.is_gorev ? `İş / Görev: ${String(sel.is_gorev)}` : "",
      sel.avukat ? `Sorumlu Avukat: ${String(sel.avukat)}` : "",
      list("Katılımcılar", katilimcilar),
      list("Gündem", gundem),
      list("Görüşülen Konular", gorusulen),
      list("Kararlar", kararlar),
      list("Aksiyonlar", aksArr.filter((a) => a.is).map((a) => `${a.is} — ${a.sor}${a.trh ? ` (${dmy(a.trh)})` : ""} [${a.drm}]`)),
    ].filter(Boolean).join("\n");
  };
  const yazdir = () => {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(`<pre style="font-family:Georgia,'Times New Roman',serif;font-size:13pt;white-space:pre-wrap;line-height:1.6;padding:40px 50px">${tutanakText().replace(/</g, "&lt;")}</pre>`);
    w.document.close(); w.focus(); w.print();
  };
  const mailGonder = () => {
    const subj = encodeURIComponent(`Toplantı Tutanağı ${String(sel.tutanak_no || "")} — ${String(sel.toplanti || "")}`);
    const body = encodeURIComponent(tutanakText());
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  };
  const kaydet = () => { setEdit(false); setSaved(true); window.setTimeout(() => setSaved(false), 2000); };

  const inp = "rounded border border-black/15 bg-white/80 px-2 py-0.5 text-ink outline-none focus:border-neon-blue";
  const SectionTitle = ({ icon: Icon, children, c }: { icon: typeof Target; children: ReactNode; c: string }) => (
    <h3 className="mb-2 flex items-center gap-2 text-[22px] font-bold text-ink">
      <Icon size={18} style={{ color: c }} />
      <span className="rounded px-1.5" style={{ background: c + "55" }}>{children}</span>
    </h3>
  );

  return (
    <MentionCtx.Provider value={mentionSources}>
    <div className="mx-auto max-w-[1760px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button onClick={() => onNavigate("ajandam")} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><ChevronLeft size={15} /> Ajanda</button>
          )}
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink">Toplantı Defteri <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted">T-0063</span></h1>
          {/* Önceki / Sonraki toplantı tutanağı */}
          <div className="ml-1 flex items-center gap-1.5">
            <button onClick={goPrev} disabled={idx <= 0} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink disabled:opacity-40"><ChevronLeft size={15} /> Önceki Toplantı Tutanağı</button>
            <span className="min-w-[40px] text-center text-xs text-muted nums">{idx + 1} / {recs.length}</span>
            <button onClick={goNext} disabled={idx >= recs.length - 1} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink disabled:opacity-40">Sonraki <ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Ara çubuğu */}
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tutanak ara…" className="w-48 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-60 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
          {saved && <span className="flex items-center gap-1 rounded-lg border border-good/40 bg-good/10 px-2.5 py-1.5 text-xs font-medium text-good animate-fade-in"><Check size={13} /> Kaydedildi</span>}
          <button onClick={yazdir} title="Tutanağı yazdır / PDF" className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Printer size={15} /> Yazdır</button>
          <button onClick={mailGonder} title="E-posta ile gönder" className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"><Mail size={15} /> Mail Gönder</button>
          <button onClick={() => (edit ? kaydet() : setEdit(true))} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${edit ? "border-good bg-good/10 text-good" : "border-line text-muted hover:bg-elevated hover:text-ink"}`}>
            {edit ? <><Save size={14} /> Kaydet</> : <><Pencil size={14} /> Düzenle</>}
          </button>
          <button onClick={olustur} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"><Plus size={16} /> Yeni Toplantı Tutanağı</button>
        </div>
      </div>

      <div className="flex items-stretch">
        {/* Defter — düzenleme modunda değilken üzerine tıklayınca düzenlenebilir */}
        <div
          onClick={!edit ? () => setEdit(true) : undefined}
          title={!edit ? "Düzenlemek için üzerine tıklayın" : undefined}
          onDragOver={dragSec ? (e) => e.preventDefault() : undefined}
          onDrop={dragSec ? (e) => { e.preventDefault(); quickAdd(dragSec); setDragSec(null); } : undefined}
          className={`relative min-w-0 flex-1 overflow-hidden rounded-l-xl rounded-r-sm text-ink shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition ${dragSec ? "ring-4 ring-neon-blue/50" : ""} ${!edit ? "cursor-text" : ""}`}
          style={{ fontFamily: HAND, background: "#FFFDF4", backgroundImage: "repeating-linear-gradient(#FFFDF4 0 30px, #DCE6EF 30px 31px)", border: "1px solid #E7E0CC" }}>
          <div className="grid gap-0 lg:grid-cols-2">
            {/* ── SOL SAYFA ── */}
            <div className="relative border-b border-dashed border-[#E3DCC6] p-6 pl-10 lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute inset-y-0 left-7 w-px bg-[#F0A6A6]" />

              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-[34px] font-bold leading-none" style={{ fontFamily: "'Caveat', cursive" }}>
                  <span className="rounded px-1" style={{ background: "#FBCFE8", textDecoration: "underline", textDecorationColor: "#DB2777" }}>Toplantı Notları</span>
                </h2>
                <div className="text-right text-[16px] leading-tight text-ink/80">
                  <div className="font-bold text-neon-blue">{String(sel.tutanak_no || "")}</div>
                  {edit ? (
                    <div className="mt-1 flex flex-col items-end gap-1">
                      <input type="date" value={String(sel.tarih || "")} onChange={(e) => UP({ tarih: e.target.value })} className={`${inp} text-[13px]`} style={{ fontFamily: HAND }} />
                      <input value={String(sel.saat || "")} onChange={(e) => UP({ saat: e.target.value })} placeholder="Saat" className={`${inp} w-32 text-right text-[13px]`} style={{ fontFamily: HAND }} />
                    </div>
                  ) : (
                    <><div className="font-semibold">{tarihStr}</div><div className="text-ink/60">{gunStr}{sel.saat ? ` / ${sel.saat}` : ""}</div></>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-[18px]">
                <p className="flex items-center gap-2"><Users size={17} className="shrink-0 text-ink/70" /><b>Konu</b> :
                  {edit ? <MentionInput value={String(sel.toplanti || "")} onChange={(v) => UP({ toplanti: v })} className={`${inp} w-full text-[17px]`} style={{ fontFamily: HAND }} /> : <span>{String(sel.toplanti)}</span>}
                </p>
                <p className="flex items-center gap-2"><MapPin size={17} className="shrink-0 text-ink/70" /><b>Yer</b> :
                  {edit ? <input value={String(sel.yer || "")} onChange={(e) => UP({ yer: e.target.value })} placeholder="Toplantı yeri" className={`${inp} flex-1 text-[17px]`} style={{ fontFamily: HAND }} /> : <span>{String(sel.yer || "—")}</span>}
                </p>
                <p className="flex items-center gap-2"><FolderKanban size={17} className="shrink-0 text-ink/70" /><b>Proje</b> :
                  {edit ? <select value={String(sel.proje || "")} onChange={(e) => UP({ proje: e.target.value })} className={`${inp} flex-1 text-[16px]`} style={{ fontFamily: HAND }}><option value="">— Proje seç —</option>{projects.map((p) => <option key={p.id} value={`${p.code} · ${p.name}`}>{p.code} · {p.name}</option>)}</select> : <span>{String(sel.proje || "—")}</span>}
                </p>
                <p className="flex items-center gap-2"><Briefcase size={17} className="shrink-0 text-ink/70" /><b>İş / Görev</b> :
                  {edit ? <MentionInput value={String(sel.is_gorev || "")} onChange={(v) => UP({ is_gorev: v })} placeholder="İş / görev — yazarken proje/görev önerilir" className={`${inp} w-full text-[16px]`} style={{ fontFamily: HAND }} /> : <span>{String(sel.is_gorev || "—")}</span>}
                </p>
                <p className="flex items-center gap-2"><Scale size={17} className="shrink-0 text-ink/70" /><b>Sorumlu Avukat</b> :
                  {edit ? <select value={String(sel.avukat || "")} onChange={(e) => UP({ avukat: e.target.value })} className={`${inp} flex-1 text-[16px]`} style={{ fontFamily: HAND }}><option value="">— Avukat seç —</option>{avukatlar.map((a) => <option key={String(a.id)} value={String(a.avukat)}>{String(a.avukat)}</option>)}</select> : <span>{String(sel.avukat || "—")}</span>}
                </p>
                <div className="flex gap-2"><ClipboardList size={17} className="mt-1 shrink-0 text-ink/70" />
                  <div className="min-w-0 flex-1"><b>Katılımcılar :</b>
                    {edit ? <div className="mt-1"><EditList value={String(sel.katilimcilar ?? "")} onChange={(v) => UP({ katilimcilar: v })} ph="Katılımcı ekle" /></div>
                      : <ul className="ml-3 mt-0.5 list-disc space-y-0.5 marker:text-ink/40">{katilimcilar.map((k, i) => <li key={i}>{k}</li>)}</ul>}
                  </div>
                </div>
              </div>

              {/* Toplantı Amacı — sarı yapışkan */}
              <div className="relative float-right ml-4 mt-2 w-56 -rotate-2 rounded-sm bg-[#FEF08A] p-3 shadow-[2px_3px_8px_rgba(0,0,0,0.2)]">
                <span className="absolute -top-2 left-1/2 h-5 w-10 rounded-sm bg-[#EADFA8]/80" style={{ transform: "translateX(-50%) rotate(-4deg)" }} />
                <p className="mb-1 text-center text-[19px] font-bold" style={{ textDecoration: "underline", textDecorationColor: "#CA8A04" }}>Toplantı Amacı</p>
                {edit ? <EditList value={String(sel.amac ?? "")} onChange={(v) => UP({ amac: v })} ph="Amaç ekle" />
                  : <ul className="space-y-0.5 text-[15px]">{amac.map((a, i) => <li key={i} className="flex gap-1"><span>•</span>{a}</li>)}</ul>}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <SectionTitle icon={ClipboardList} c="#60A5FA">Gündem</SectionTitle>
                  {edit ? <EditList value={String(sel.gundem ?? "")} onChange={(v) => UP({ gundem: v })} ph="Gündem maddesi ekle" />
                    : <ol className="space-y-1 text-[17px]">{gundem.map((g, i) => (
                        <li key={i} className="flex items-center gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink/30 text-[12px]">{i + 1}</span><span className="flex-1">{g}</span>{i < 3 ? <CheckSquare size={16} className="text-good" /> : <Square size={16} className="text-ink/30" />}</li>
                      ))}</ol>}
                </div>
                <div>
                  <SectionTitle icon={AlertTriangle} c="#F9A8D4">Önemli Notlar</SectionTitle>
                  {edit ? <EditList value={String(sel.onemli_notlar ?? "")} onChange={(v) => UP({ onemli_notlar: v })} ph="Not ekle" />
                    : <ul className="space-y-1 text-[16px]">{onemli.map((n, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/50">•</span><span>{n}</span></li>)}</ul>}
                </div>
              </div>

              <div className="mt-5 clear-both">
                <SectionTitle icon={ClipboardList} c="#86EFAC">Görüşülen Konular</SectionTitle>
                {edit ? <EditList value={String(sel.gorusulen ?? "")} onChange={(v) => UP({ gorusulen: v })} ph="Görüşülen konu ekle" />
                  : <div className="space-y-1.5 text-[16px]">{gorusulen.map((g, i) => <p key={i}>{g}</p>)}</div>}
              </div>
            </div>

            {/* ── SAĞ SAYFA ── */}
            <div className="relative p-6 pl-8">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <SectionTitle icon={Gavel} c="#86EFAC">Kararlar</SectionTitle>
                  {edit ? <EditList value={String(sel.kararlar ?? "")} onChange={(v) => UP({ kararlar: v })} ph="Karar ekle" />
                    : <ol className="space-y-1 text-[17px]">{kararlar.map((k, i) => <li key={i} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink/30 text-[12px]">{i + 1}</span><span>{k}</span></li>)}</ol>}
                </div>
                <div className="h-fit rounded-lg border-2 border-[#F0A6A6] bg-[#FDECEC]/60 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[20px] font-bold"><Target size={17} className="text-[#DC2626]" /> Hedef</p>
                  {edit ? <EditList value={String(sel.hedefler ?? "")} onChange={(v) => UP({ hedefler: v })} ph="Hedef ekle" sep=", " />
                    : <ul className="space-y-1 text-[16px]">{hedefler.map((h, i) => <li key={i} className="flex items-center gap-1.5"><CheckSquare size={15} className="text-good" /> {h}</li>)}</ul>}
                </div>
              </div>

              <div className="mt-5">
                <SectionTitle icon={ClipboardList} c="#93C5FD">Süreç Akışı</SectionTitle>
                {edit ? (
                  <div className="space-y-1">
                    {surecArr.map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input value={s.ad} onChange={(e) => setSurec(surecArr.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))} placeholder="Aşama" className={`${inp} flex-1 text-[14px]`} style={{ fontFamily: HAND }} />
                        <input value={s.sure} onChange={(e) => setSurec(surecArr.map((x, j) => (j === i ? { ...x, sure: e.target.value } : x)))} placeholder="Süre" className={`${inp} w-24 text-[14px]`} style={{ fontFamily: HAND }} />
                        <button onClick={() => setSurec(surecArr.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded text-ink/40 hover:text-critical"><X size={13} /></button>
                      </div>
                    ))}
                    {surecArr.length === 0 && <p className="text-[13px] text-ink/40">Aşama → Hızlı Ekle'den</p>}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1.5">{surecArr.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <div className="text-center"><div className="rounded-md border border-ink/40 bg-white/60 px-2.5 py-1.5 text-[15px] font-semibold">{s.ad}</div>{s.sure ? <div className="mt-0.5 text-[13px] text-ink/60">{s.sure}</div> : null}</div>
                      {i < surecArr.length - 1 ? <span className="mt-2 text-[18px] text-ink/40">→</span> : null}
                    </div>
                  ))}</div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <SectionTitle icon={Users} c="#F9A8D4">Sorumlular</SectionTitle>
                  {edit ? <EditList value={String(sel.sorumlular ?? "")} onChange={(v) => UP({ sorumlular: v })} ph="Ad: Sorumluluk" />
                    : <ul className="space-y-1 text-[16px]">{sorumlular.map((s, i) => { const k = s.indexOf(":"); return <li key={i} className="flex gap-1.5"><Users size={14} className="mt-1 shrink-0 text-ink/50" /><span>{k >= 0 ? <><b>{s.slice(0, k)}</b>{s.slice(k)}</> : s}</span></li>; })}</ul>}
                </div>
                <div>
                  <SectionTitle icon={AlertTriangle} c="#FDE68A">Riskler</SectionTitle>
                  {edit ? <EditList value={String(sel.riskler ?? "")} onChange={(v) => UP({ riskler: v })} ph="Risk ekle" />
                    : <ul className="space-y-1 text-[16px]">{riskler.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/50">•</span>{r}</li>)}</ul>}
                </div>
              </div>

              <div className="mt-5">
                <SectionTitle icon={CheckCircle2} c="#86EFAC">Aksiyonlar</SectionTitle>
                {edit ? (
                  <div className="space-y-1">
                    {aksArr.map((a, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input value={a.is} onChange={(e) => setAks(aksArr.map((x, j) => (j === i ? { ...x, is: e.target.value } : x)))} placeholder="Yapılacak iş" className={`${inp} flex-1 text-[14px]`} style={{ fontFamily: HAND }} />
                        <input value={a.sor} onChange={(e) => setAks(aksArr.map((x, j) => (j === i ? { ...x, sor: e.target.value } : x)))} placeholder="Sorumlu" className={`${inp} w-28 text-[14px]`} style={{ fontFamily: HAND }} />
                        <input type="date" value={a.trh} onChange={(e) => setAks(aksArr.map((x, j) => (j === i ? { ...x, trh: e.target.value } : x)))} className={`${inp} w-32 text-[13px]`} style={{ fontFamily: HAND }} />
                        <select value={a.drm} onChange={(e) => setAks(aksArr.map((x, j) => (j === i ? { ...x, drm: e.target.value } : x)))} className={`${inp} text-[13px]`} style={{ fontFamily: HAND }}>{DURUM_SEC.map((d2) => <option key={d2}>{d2}</option>)}</select>
                        <button onClick={() => setAks(aksArr.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded text-ink/40 hover:text-critical"><X size={13} /></button>
                      </div>
                    ))}
                    {aksArr.length === 0 && <p className="text-[13px] text-ink/40">Aksiyon → Hızlı Ekle'den</p>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[15px]">
                      <thead><tr className="text-left text-ink/70">
                        <th className="border border-ink/20 px-2 py-1 font-semibold">No</th><th className="border border-ink/20 px-2 py-1 font-semibold">Yapılacak İş</th><th className="border border-ink/20 px-2 py-1 font-semibold">Sorumlu</th><th className="border border-ink/20 px-2 py-1 font-semibold">Bitiş</th><th className="border border-ink/20 px-2 py-1 font-semibold">Durum</th>
                      </tr></thead>
                      <tbody>{aksArr.map((a, i) => { const dr = DURUM_RENK[a.drm || ""] ?? DURUM_RENK["Bekliyor"]; return (
                        <tr key={i}><td className="border border-ink/20 px-2 py-1 text-center">{i + 1}</td><td className="border border-ink/20 px-2 py-1">{a.is}</td><td className="border border-ink/20 px-2 py-1">{a.sor}</td><td className="border border-ink/20 px-2 py-1 text-center">{dmy(a.trh)}</td><td className="border border-ink/20 px-2 py-1 text-center"><span className="rounded px-1.5 py-0.5 text-[13px] font-semibold" style={{ background: dr.bg, color: dr.tx }}>{a.drm}</span></td></tr>
                      ); })}</tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Hızlı Ekle — defterin sağ altı: tıkla ya da deftere sürükle bırak */}
              <div className="mt-6 rounded-xl border-2 border-dashed border-neon-blue/40 bg-neon-blue/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[16px] font-bold text-ink" style={{ fontFamily: HAND }}>
                  <Plus size={16} className="text-neon-blue" /> Hızlı Ekle
                  <span className="text-[12px] font-normal text-ink/50">— tıkla ya da deftere sürükle bırak</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTIONS.map((s) => (
                    <button key={s.key}
                      draggable onDragStart={() => setDragSec(s.key)} onDragEnd={() => setDragSec(null)}
                      onClick={() => quickAdd(s.key)}
                      className={`flex cursor-grab items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] font-semibold text-ink transition hover:-translate-y-0.5 active:cursor-grabbing ${dragSec === s.key ? "opacity-40" : ""}`}
                      style={{ background: s.c + "44", borderColor: s.c, fontFamily: HAND }}>
                      <s.icon size={13} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {edit && (
                <div className="mt-4 flex justify-end border-t border-dashed border-[#E3DCC6] pt-3">
                  <button onClick={() => { if (recs.length > 1) { deleteRecord(MOD, String(sel.id)); setSelId(null); setEdit(false); } }} className="flex items-center gap-1.5 rounded-lg border border-critical/40 px-3 py-1.5 text-sm font-medium text-critical transition hover:bg-critical/10"><Trash2 size={14} /> Bu Tutanağı Sil</button>
                </div>
              )}
            </div>
          </div>

          {/* Spiral cilt */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 flex-col justify-around py-4 lg:flex">
            {Array.from({ length: 16 }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full border-2 border-ink/30 bg-base shadow-inner" />)}
          </div>
        </div>

      </div>
    </div>
    </MentionCtx.Provider>
  );
}
