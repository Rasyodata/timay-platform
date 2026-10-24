import { useMemo, useState, useEffect, useRef } from "react";
import {
  Calendar, ClipboardList, Presentation, ChevronLeft, ChevronRight, Plus, Trash2,
  Users, MapPin, Send, ThumbsUp, Lightbulb, Gavel, Sparkles, FileDown, CheckSquare, X, Radio,
  Target, AlertTriangle, HelpCircle, FileText, ListChecks, Clock,
  Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2,
  ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Eye,
  MonitorUp, Link2, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { useAudit } from "@/context/AuditContext";
import CanliYayin from "@/components/hub/CanliYayin";
import { yayinAktif } from "@/lib/useYayin";

// Toplantı Odası — aylık toplantı takvimi + kayıt + akıllı toplantı defteri (canvas).
const STORAGE = "timay.toplanti-odasi.v1";
const uid = () => "t" + Math.random().toString(36).slice(2, 9);
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

// Toplantı sırasında hızlı erişimle eklenebilecek katkı kategorileri
const KATEGORI: { ad: string; icon: LucideIcon; c: string }[] = [
  { ad: "Gündem", icon: ClipboardList, c: "#0A4EA2" },
  { ad: "Fikir", icon: Lightbulb, c: "#CA8A04" },
  { ad: "Karar", icon: Gavel, c: "#7C3AED" },
  { ad: "Aksiyon", icon: Target, c: "#B5731A" },
  { ad: "Risk", icon: AlertTriangle, c: "#C1292E" },
  { ad: "Soru", icon: HelpCircle, c: "#0E7490" },
  { ad: "Görev", icon: CheckSquare, c: "#1E7A46" },
  { ad: "Not", icon: FileText, c: "#C96A86" },
];
const KMETA: Record<string, { icon: LucideIcon; c: string }> = Object.fromEntries(KATEGORI.map((k) => [k.ad, { icon: k.icon, c: k.c }]));

type Note = { id: string; metin: string; yazar: string; sehir: string; zaman: string; kategori: string; oy: number; gorev?: boolean };
type Meeting = { id: string; baslik: string; tarih: string; saat: string; proje: string; gundem: string; katilimcilar: string[]; olusturan: string };
type Store = { toplantilar: Meeting[]; notlar: Record<string, Note[]> };

// Örnek toplantı tohumu — Proje 1 ortaklık toplantısı (hiç toplantı yoksa gösterilir)
const seedStore = (): Store => {
  const mid = "seed-proje1", bugun = dstr(new Date());
  return {
    toplantilar: [{ id: mid, baslik: "Proje 1 — Ortaklık & Yol Haritası", tarih: bugun, saat: "10:00", proje: "Proje 1", gundem: "Ortaklık yapısı, görev dağılımı ve Q4 yol haritasının netleştirilmesi.", katilimcilar: ["Rasyodata", "Tuğba Yörük", "Kadir Fırat"], olusturan: "Rasyodata" }],
    notlar: { [mid]: [
      { id: "seed-n1", metin: "Ortaklık payları ve roller netleştirilsin", yazar: "Rasyodata", sehir: "—", zaman: "10:05", kategori: "Gündem", oy: 0 },
      { id: "seed-n2", metin: "MVP'yi 6 haftada çıkaralım", yazar: "Tuğba Yörük", sehir: "—", zaman: "10:12", kategori: "Fikir", oy: 3 },
      { id: "seed-n3", metin: "Proje 1 için ortak banka hesabı açılacak", yazar: "Rasyodata", sehir: "—", zaman: "10:20", kategori: "Karar", oy: 2 },
      { id: "seed-n4", metin: "Kadir pazarlama planını hazırlayacak", yazar: "Kadir Fırat", sehir: "—", zaman: "10:26", kategori: "Aksiyon", oy: 1 },
    ] },
  };
};
const load = (): Store => { try { const s = JSON.parse(localStorage.getItem(STORAGE) || "null"); return s && Array.isArray(s.toplantilar) && s.toplantilar.length ? s : seedStore(); } catch { return seedStore(); } };
// Ajanda/Takvim için — tarihli toplantılar (katılıma göre filtre çağıranda yapılır)
export type ToplantiKaydi = Meeting;
export const loadToplantilar = (): Meeting[] => load().toplantilar;
const saat = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function ToplantiOdasi() {
  const { users, currentUser } = useUsers();
  const { addRecord } = useModules();
  const { log } = useAudit();
  const [store, setStore] = useState<Store>(load);
  const [tab, setTab] = useState<"takvim" | "kayit" | "oda" | "liste">("takvim");
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d.getTime(); });
  const [selDay, setSelDay] = useState<string | null>(null);
  const [selMeet, setSelMeet] = useState<string | null>(null);
  const [form, setForm] = useState({ baslik: "", tarih: dstr(new Date()), saat: "10:00", proje: "", gundem: "", katilimcilar: [] as string[] });
  const [note, setNote] = useState("");
  const [kategori, setKategori] = useState("Fikir");
  const [ozet, setOzet] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Canlı yayın — kendi kameran gerçek (getUserMedia); çok-kullanıcı için WebRTC/Socket.io gerekir
  const [yayinda, setYayinda] = useState(false);
  const [mic, setMic] = useState(true);
  const [kamera, setKamera] = useState(true);
  const [kameraHata, setKameraHata] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Yayına katılınca kendi kamera+mikrofon akışını al
  useEffect(() => {
    let active = true;
    if (yayinda && !streamRef.current) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((s) => { if (!active) { s.getTracks().forEach((t) => t.stop()); return; } streamRef.current = s; if (localVideoRef.current) localVideoRef.current.srcObject = s; s.getVideoTracks().forEach((t) => (t.enabled = kamera)); s.getAudioTracks().forEach((t) => (t.enabled = mic)); setKameraHata(null); })
        .catch(() => { if (active) setKameraHata("Kamera/mikrofon erişimi yok — izin verilmedi ya da cihaz bulunamadı."); });
    }
    if (!yayinda && streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    return () => { active = false; };
  }, [yayinda]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = kamera)); }, [kamera]);
  useEffect(() => { streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = mic)); }, [mic]);
  const kameraReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Ekran paylaşımı (gerçek — getDisplayMedia)
  const [ekranPaylasim, setEkranPaylasim] = useState(false);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const ekranPaylas = async () => {
    if (ekranPaylasim) { screenStreamRef.current?.getTracks().forEach((t) => t.stop()); screenStreamRef.current = null; setEkranPaylasim(false); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = s; if (screenVideoRef.current) screenVideoRef.current.srcObject = s;
      s.getVideoTracks()[0]?.addEventListener("ended", () => { screenStreamRef.current = null; setEkranPaylasim(false); });
      setEkranPaylasim(true);
    } catch { /* kullanıcı iptal etti */ }
  };
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); screenStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Davet linki (yabancı izleyici — view-only) + izleyici modu
  const [linkKopya, setLinkKopya] = useState(false);
  const [izleyici, setIzleyici] = useState(false);
  useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get("izleyici") === "1") { setIzleyici(true); setTab("oda"); const t = p.get("toplanti"); if (t) setSelMeet(t); } }, []);
  const davetLinki = () => {
    if (!aktif) return;
    const url = `${window.location.origin}${window.location.pathname}?toplanti=${aktif.id}&izleyici=1`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setLinkKopya(true); setTimeout(() => setLinkKopya(false), 2000);
  };

  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(store)); }, [store]);

  const isYetkili = currentUser.role === "owner" || currentUser.role === "manager";
  const sehirOf = (name: string) => { const u = users.find((x) => x.name === name); return u?.adres?.il || "—"; };
  // Yetki: owner/manager tümünü; diğerleri katılımcısı olduğu ya da oluşturduğu toplantıları görür
  const gorunurToplantilar = useMemo(() => store.toplantilar.filter((m) => isYetkili || m.olusturan === currentUser.name || m.katilimcilar.includes(currentUser.name)), [store.toplantilar, isYetkili, currentUser.name]);

  const curDate = new Date(cur);
  const y = curDate.getFullYear(), mo = curDate.getMonth();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const dim = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  const meetsOn = (iso: string) => gorunurToplantilar.filter((m) => m.tarih === iso);
  const td = dstr(new Date());

  const kaydet = () => {
    const b = form.baslik.trim(); if (!b) return;
    const m: Meeting = { id: uid(), baslik: b, tarih: form.tarih, saat: form.saat, proje: form.proje.trim(), gundem: form.gundem.trim(), katilimcilar: form.katilimcilar, olusturan: currentUser.name };
    setStore((s) => ({ ...s, toplantilar: [m, ...s.toplantilar] }));
    log({ category: "proje", action: "Toplantı kaydedildi", target: b, meta: `${dmy(form.tarih)} ${form.saat}` });
    setForm({ baslik: "", tarih: dstr(new Date()), saat: "10:00", proje: "", gundem: "", katilimcilar: [] });
    setSelMeet(m.id); setTab("takvim");
  };
  const silMeet = (id: string) => setStore((s) => { const n = { ...s.notlar }; delete n[id]; return { toplantilar: s.toplantilar.filter((m) => m.id !== id), notlar: n }; });
  const toggleKat = (name: string) => setForm((f) => ({ ...f, katilimcilar: f.katilimcilar.includes(name) ? f.katilimcilar.filter((x) => x !== name) : [...f.katilimcilar, name] }));

  const aktif = gorunurToplantilar.find((m) => m.id === selMeet) || gorunurToplantilar[0];
  const notlar = (aktif && store.notlar[aktif.id]) || [];
  const addNote = (kat = kategori) => {
    const t = note.trim(); if (!t || !aktif) return;
    const n: Note = { id: uid(), metin: t, yazar: currentUser.name, sehir: sehirOf(currentUser.name), zaman: saat(), kategori: kat, oy: 0 };
    setStore((s) => ({ ...s, notlar: { ...s.notlar, [aktif.id]: [...(s.notlar[aktif.id] || []), n] } }));
    setNote("");
  };
  // Hızlı Ekle — kategori seç: metin varsa anında ekle, yoksa kategoriyi seç + inputa odaklan
  const quickAdd = (kat: string) => { setKategori(kat); if (note.trim()) addNote(kat); else inputRef.current?.focus(); };
  const voteNote = (nid: string) => aktif && setStore((s) => ({ ...s, notlar: { ...s.notlar, [aktif.id]: (s.notlar[aktif.id] || []).map((n) => n.id === nid ? { ...n, oy: n.oy + 1 } : n) } }));
  const delNote = (nid: string) => aktif && setStore((s) => ({ ...s, notlar: { ...s.notlar, [aktif.id]: (s.notlar[aktif.id] || []).filter((n) => n.id !== nid) } }));
  const toGorev = (n: Note) => { if (!aktif) return; addRecord("mod-T-0056", { baslik: n.metin, atanan: n.yazar, durum: "Açık", tarih: aktif.tarih }); setStore((s) => ({ ...s, notlar: { ...s.notlar, [aktif.id]: (s.notlar[aktif.id] || []).map((x) => x.id === n.id ? { ...x, gorev: true } : x) } })); };

  const aiOzet = () => {
    if (!aktif) return;
    const kararlar = notlar.filter((n) => n.kategori === "Karar");
    const enCokOy = [...notlar].sort((a, b) => b.oy - a.oy)[0];
    const katSayac = KATEGORI.map((k) => ({ ad: k.ad, n: notlar.filter((x) => x.kategori === k.ad).length })).filter((x) => x.n > 0);
    const lines = [`"${aktif.baslik}" toplantısında ${notlar.length} katkı üzerinden özet:`,
      `• Dağılım: ${katSayac.map((x) => `${x.ad} (${x.n})`).join(", ") || "—"}.`,
      kararlar.length ? `• Öne çıkan kararlar: ${kararlar.slice(0, 3).map((k) => k.metin).join("; ")}.` : "• Henüz net karar alınmadı.",
      enCokOy && enCokOy.oy > 0 ? `• En çok oy alan madde: "${enCokOy.metin}" (${enCokOy.oy} oy).` : "",
      `• Katkı veren şehirler: ${[...new Set(notlar.map((n) => n.sehir).filter((c) => c !== "—"))].join(", ") || "—"}.`].filter(Boolean);
    setOzet(lines.join("\n"));
  };
  const indirMd = () => {
    if (!aktif) return;
    const kats = KATEGORI.filter((k) => notlar.some((n) => n.kategori === k.ad));
    const md = [`# ${aktif.baslik}`, `**Tarih:** ${dmy(aktif.tarih)} ${aktif.saat}  `, aktif.proje ? `**Proje:** ${aktif.proje}  ` : "", aktif.gundem ? `**Gündem:** ${aktif.gundem}  ` : "", `**Katılımcılar:** ${aktif.katilimcilar.join(", ") || "—"}`, "",
      ...kats.flatMap((k) => [`## ${k.ad}`, ...notlar.filter((n) => n.kategori === k.ad).map((n) => `- ${n.metin} _(${n.yazar}${n.oy ? " · " + n.oy + " oy" : ""})_`), ""])].filter((x) => x !== undefined).join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${aktif.baslik}.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  const TabBtn = ({ id, icon: Icon, label }: { id: typeof tab; icon: typeof Calendar; label: string }) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${tab === id ? "bg-neon-blue text-white shadow-sm" : "text-ink hover:bg-elevated"}`}><Icon size={15} /> {label}</button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      {/* Üst bar — Toplantılar Takvimi (başta) · Toplantı Kayıt (sağ) · Toplantı Odası */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Presentation size={18} /></span>
          <h1 className="text-xl font-bold text-ink">Toplantı Odası</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-panel p-1">
          <TabBtn id="takvim" icon={Calendar} label="Toplantılar Takvimi" />
          <TabBtn id="kayit" icon={ClipboardList} label="Toplantı Kayıt" />
          <TabBtn id="oda" icon={Presentation} label="Toplantı Odası" />
          <TabBtn id="liste" icon={ListChecks} label="Toplantılar Listesi" />
        </div>
      </div>

      {/* ───── TAKVİM ───── */}
      {tab === "takvim" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">{AY[mo]} {y}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCur(new Date(y, mo - 1, 1).getTime())} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>
                <button onClick={() => { const d = new Date(); d.setDate(1); setCur(d.getTime()); }} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-elevated">Bu Ay</button>
                <button onClick={() => setCur(new Date(y, mo + 1, 1).getTime())} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {GUN.map((g) => <div key={g} className="pb-1 text-center text-[11px] font-semibold text-muted">{g}</div>)}
              {cells.map((d, i) => { if (!d) return <div key={i} />; const iso = dstr(new Date(y, mo, d)); const ms = meetsOn(iso); const bugun = iso === td; const secili = iso === selDay; return (
                <button key={i} onClick={() => setSelDay(iso)} className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition ${secili ? "border-neon-blue bg-neon-blue/5" : "border-line hover:bg-elevated"}`}>
                  <span className={`text-xs font-semibold ${bugun ? "grid h-5 w-5 place-items-center rounded-full bg-neon-blue text-white" : "text-ink"}`}>{d}</span>
                  <div className="mt-1 space-y-0.5">{ms.slice(0, 2).map((m) => <span key={m.id} className="block truncate rounded bg-neon-blue/15 px-1 text-[9px] font-medium text-neon-blue">{m.saat} {m.baslik}</span>)}{ms.length > 2 && <span className="text-[9px] text-muted">+{ms.length - 2}</span>}</div>
                </button>
              ); })}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel p-4">
            <h3 className="mb-2 text-sm font-bold text-ink">{selDay ? dmy(selDay) + " toplantıları" : "Yaklaşan toplantılar"}</h3>
            <div className="space-y-2">
              {(selDay ? meetsOn(selDay) : [...gorunurToplantilar].sort((a, b) => a.tarih.localeCompare(b.tarih)).filter((m) => m.tarih >= td).slice(0, 8)).map((m) => (
                <button key={m.id} onClick={() => { setSelMeet(m.id); setTab("oda"); }} className="w-full rounded-lg border border-line bg-base/40 p-2.5 text-left transition hover:border-neon-blue/40">
                  <p className="text-sm font-semibold text-ink">{m.baslik}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted"><Calendar size={11} /> {dmy(m.tarih)} {m.saat} · <Users size={11} /> {m.katilimcilar.length} kişi</p>
                </button>
              ))}
              {(selDay ? meetsOn(selDay) : gorunurToplantilar.filter((m) => m.tarih >= td)).length === 0 && <p className="py-6 text-center text-xs text-faint">Toplantı yok.</p>}
            </div>
            <button onClick={() => setTab("kayit")} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90"><Plus size={15} /> Yeni Toplantı</button>
          </div>
        </div>
      )}

      {/* ───── KAYIT ───── */}
      {tab === "kayit" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><ClipboardList size={16} className="text-neon-blue" /> Toplantı Kayıt</h2>
            <div className="space-y-3">
              <input value={form.baslik} onChange={(e) => setForm((f) => ({ ...f, baslik: e.target.value }))} placeholder="Toplantı başlığı…" className="w-full rounded-lg border border-line bg-base/40 px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue" />
              <div className="flex gap-2">
                <label className="flex flex-1 items-center gap-1 text-[11px] text-muted">Tarih <input type="date" value={form.tarih} onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))} className="w-full rounded-lg border border-line bg-base/40 px-2 py-1.5 text-sm text-ink outline-none focus:border-neon-blue" /></label>
                <label className="flex items-center gap-1 text-[11px] text-muted">Saat <input type="time" value={form.saat} onChange={(e) => setForm((f) => ({ ...f, saat: e.target.value }))} className="rounded-lg border border-line bg-base/40 px-2 py-1.5 text-sm text-ink outline-none focus:border-neon-blue" /></label>
              </div>
              <input value={form.proje} onChange={(e) => setForm((f) => ({ ...f, proje: e.target.value }))} placeholder="Proje / oda (opsiyonel)…" className="w-full rounded-lg border border-line bg-base/40 px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue" />
              <textarea value={form.gundem} onChange={(e) => setForm((f) => ({ ...f, gundem: e.target.value }))} placeholder="Gündem…" rows={2} className="w-full resize-none rounded-lg border border-line bg-base/40 px-3 py-2 text-sm text-ink outline-none focus:border-neon-blue" />
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-muted">Katılımcılar (kimler katılacak)</p>
                <div className="flex flex-wrap gap-1.5">
                  {users.filter((u) => u.active).map((u) => { const on = form.katilimcilar.includes(u.name); return (
                    <button key={u.id} onClick={() => toggleKat(u.name)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${on ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-line text-muted hover:bg-elevated"}`}>
                      {on ? <CheckSquare size={12} /> : <Users size={12} />} {u.name} <span className="text-[10px] opacity-70">· {u.adres?.il || "—"}</span>
                    </button>
                  ); })}
                </div>
              </div>
              <button onClick={kaydet} disabled={!form.baslik.trim()} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Plus size={15} /> Toplantıyı Kaydet</button>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Kayıtlı Toplantılar ({gorunurToplantilar.length})</h2>
            <div className="space-y-2">
              {gorunurToplantilar.map((m) => (
                <div key={m.id} className="group rounded-lg border border-line bg-base/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => { setSelMeet(m.id); setTab("oda"); }} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-ink">{m.baslik}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{dmy(m.tarih)} {m.saat}{m.proje ? " · " + m.proje : ""}</p>
                    </button>
                    <button onClick={() => silMeet(m.id)} className="shrink-0 text-faint opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{m.katilimcilar.map((k) => <span key={k} className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted"><MapPin size={9} className="mr-0.5 inline" />{k} · {sehirOf(k)}</span>)}</div>
                </div>
              ))}
              {gorunurToplantilar.length === 0 && <p className="py-6 text-center text-xs text-faint">Henüz toplantı yok.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ───── TOPLANTI ODASI (CANVAS) ───── */}
      {tab === "oda" && (
        !aktif ? (
          <div className="rounded-xl border border-line bg-panel p-10 text-center">
            <Presentation size={36} className="mx-auto text-faint" />
            <p className="mt-3 text-sm text-muted">Önce bir toplantı seçin ya da <button onClick={() => setTab("kayit")} className="font-semibold text-neon-blue">kaydedin</button>.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Sol — toplantı seçimi · Hızlı Ekle · canlı katılımcılar */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-line bg-panel p-4">
              <select value={aktif.id} onChange={(e) => setSelMeet(e.target.value)} className="w-full rounded-lg border border-line bg-base/40 px-2 py-1.5 text-sm font-semibold text-ink outline-none focus:border-neon-blue">{gorunurToplantilar.map((m) => <option key={m.id} value={m.id}>{m.baslik}</option>)}</select>
            </div>
            {/* Hızlı Ekle — toplantı sırasında hızlı erişim (izleyicide gizli) */}
            {!izleyici && (
            <div className="rounded-xl border border-line bg-panel p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink"><Plus size={14} className="text-neon-violet" /> Hızlı Ekle</h3>
              <p className="mb-2.5 text-[11px] text-muted">Kategori seç, yukarıdan yaz — deftere anında düşer.</p>
              <div className="space-y-1.5">
                {KATEGORI.map((k) => { const on = kategori === k.ad; return (
                  <button key={k.ad} onClick={() => quickAdd(k.ad)} className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition hover:-translate-y-0.5 ${on ? "border-neon-violet/50 bg-neon-violet/5 text-ink" : "border-line bg-base/40 text-ink hover:border-neon-violet/40"}`}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: k.c + "22", color: k.c }}><k.icon size={14} /></span> {k.ad}
                    {on && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: k.c }} />}
                  </button>
                ); })}
              </div>
            </div>
            )}
            <div className="rounded-xl border border-line bg-panel p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><Radio size={12} className="animate-pulse text-good" /> Canlı Katılımcılar</h3>
              <div className="space-y-1.5">
                {aktif.katilimcilar.length === 0 && <p className="text-[11px] text-faint">Katılımcı eklenmemiş.</p>}
                {aktif.katilimcilar.map((k) => (
                  <div key={k} className="flex items-center gap-2 rounded-lg bg-base/40 px-2 py-1.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-blue to-neon-violet text-[10px] font-bold text-white">{k.charAt(0)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-ink">{k}</span><span className="flex items-center gap-0.5 text-[10px] text-muted"><MapPin size={9} /> {sehirOf(k)}</span></span>
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-good" title="çevrimiçi" />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-faint">Şehirlerarası senkron (WebSocket'e hazır arayüz)</p>
            </div>
          </div>

          {/* Sağ — akıllı toplantı defteri (canvas) */}
          <div className="lg:col-span-3">
            {/* Toplantı konusu başlığı — hangi konuda toplantı yapılıyor */}
            <div className="mb-3 rounded-xl border p-4" style={{ borderColor: "#0A4EA255", background: "#0A4EA20d" }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neon-blue">Toplantı Konusu</p>
                  <h2 className="mt-0.5 text-lg font-bold text-ink">{aktif.baslik}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted"><Calendar size={11} /> {dmy(aktif.tarih)} {aktif.saat} · <Users size={11} /> {aktif.katilimcilar.length} katılımcı{aktif.proje ? " · " + aktif.proje : ""}</p>
                </div>
                <span className="shrink-0 rounded-full bg-good/10 px-2.5 py-1 text-[10px] font-bold text-good"><Radio size={10} className="mr-1 inline animate-pulse" />CANLI</span>
              </div>
              {aktif.gundem && <p className="mt-2 rounded-lg bg-panel/60 p-2 text-[12px] text-ink/80"><b className="text-ink">Gündem:</b> {aktif.gundem}</p>}
            </div>

            {yayinAktif() ? (
              <CanliYayin meetingId={aktif.id} benAd={currentUser.name} sehirOf={sehirOf} izleyici={izleyici} davetLinki={davetLinki} linkKopya={linkKopya} katilimciSayi={aktif.katilimcilar.length} />
            ) : (<>
            {/* Canlı Yayın — video konferans (simülasyon; backend yoksa) */}
            <div className="mb-3 overflow-hidden rounded-xl border border-line bg-[#0B1020] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-white"><Video size={14} className="text-neon-blue" /> Canlı Yayın{izleyici && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">İZLEYİCİ MODU</span>}</h3>
                <div className="flex items-center gap-1.5">
                  {!izleyici && <button onClick={davetLinki} title="Dışarıdan izleyici için davet linki kopyala" className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-white/20">{linkKopya ? <><Check size={11} /> Kopyalandı</> : <><Link2 size={11} /> Davet Linki</>}</button>}
                  <span className="flex items-center gap-1 rounded-full bg-critical/20 px-2 py-0.5 text-[10px] font-bold text-critical"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-critical" /> CANLI</span>
                </div>
              </div>
              {yayinda ? (<>
                {/* Ekran paylaşımı — gerçek getDisplayMedia */}
                {ekranPaylasim && (
                  <div className="relative mb-2 aspect-video overflow-hidden rounded-lg bg-black">
                    <video ref={screenVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-neon-blue/80 px-2 py-0.5 text-[10px] font-bold text-white"><MonitorUp size={11} /> EKRAN PAYLAŞIMI · {currentUser.name}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {aktif.katilimcilar.map((k) => { const ben = k === currentUser.name; const avatarGoster = ben ? (!kamera || !!kameraHata) : true; return (
                    <div key={k} className={`relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-[#1E2540] to-[#0B1020] ${ben ? "ring-2 ring-neon-blue/60" : ""}`}>
                      {ben && <video ref={localVideoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, display: kamera && !kameraHata ? "block" : "none" }} />}
                      {avatarGoster ? (
                        <div className="flex h-full items-center justify-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-neon-blue to-neon-violet text-lg font-bold text-white">{k.charAt(0)}</span></div>
                      ) : (!ben && (<>
                        <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white/15">{k.charAt(0)}</span>
                        <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      </>))}
                      {ben && kameraHata && <span className="absolute inset-x-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] leading-tight text-amber-300">{kameraHata}</span>}
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                        <span className="truncate rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white">{ben ? "Siz" : k}{sehirOf(k) !== "—" ? " · " + sehirOf(k) : ""}</span>
                        {ben ? (mic ? <Mic size={11} className="shrink-0 text-white" /> : <MicOff size={11} className="shrink-0 text-critical" />) : <Mic size={11} className="shrink-0 text-white/50" />}
                      </div>
                    </div>
                  ); })}
                </div>

                {/* Kamera ayarı — dijital pan/zoom (kendi görüntün) · izleyicide gizli */}
                {!izleyici && (<>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[10px] font-semibold text-white/50">Kamera ayarı</span>
                  <button onClick={() => setPan((p) => ({ ...p, x: p.x + 20 }))} title="Sola" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowLeft size={13} /></button>
                  <button onClick={() => setPan((p) => ({ ...p, x: p.x - 20 }))} title="Sağa" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowRight size={13} /></button>
                  <button onClick={() => setPan((p) => ({ ...p, y: p.y + 20 }))} title="Yukarı" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowUp size={13} /></button>
                  <button onClick={() => setPan((p) => ({ ...p, y: p.y - 20 }))} title="Aşağı" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ArrowDown size={13} /></button>
                  <span className="mx-0.5 h-4 w-px bg-white/15" />
                  <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))} title="Yakınlaş" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ZoomIn size={13} /></button>
                  <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))} title="Uzaklaş" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><ZoomOut size={13} /></button>
                  <span className="w-9 text-center text-[10px] text-white/50 nums">{Math.round(zoom * 100)}%</span>
                  <button onClick={kameraReset} title="Sıfırla" className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"><RotateCcw size={13} /></button>
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <button onClick={() => setMic((v) => !v)} title="Mikrofon" className={`grid h-9 w-9 place-items-center rounded-full transition ${mic ? "bg-white/10 text-white hover:bg-white/20" : "bg-critical/20 text-critical"}`}>{mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
                  <button onClick={() => setKamera((v) => !v)} title="Kamera" className={`grid h-9 w-9 place-items-center rounded-full transition ${kamera ? "bg-white/10 text-white hover:bg-white/20" : "bg-critical/20 text-critical"}`}>{kamera ? <Video size={16} /> : <VideoOff size={16} />}</button>
                  <button onClick={ekranPaylas} title="Ekran paylaş" className={`grid h-9 w-9 place-items-center rounded-full transition ${ekranPaylasim ? "bg-neon-blue text-white" : "bg-white/10 text-white hover:bg-white/20"}`}><MonitorUp size={16} /></button>
                  <button onClick={() => setYayinda(false)} title="Yayından ayrıl" className="grid h-9 w-9 place-items-center rounded-full bg-critical text-white transition hover:opacity-90"><PhoneOff size={16} /></button>
                  <button title="Tam ekran" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><Maximize2 size={16} /></button>
                </div>
                </>)}
                <p className="mt-1.5 text-center text-[10px] text-white/40">{izleyici ? "İzleyici modu — yalnızca görüntülersiniz." : "Kendi kameran gerçek (bu cihaz)."} · <Eye size={10} className="inline" /> {aktif.katilimcilar.length} bağlı — çok-kullanıcılı canlı görüntü için WebRTC/Socket.io sunucusu gerekir.</p>
              </>) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3">
                  <span className="text-xs text-white/60">Yayın kapalı — kameranı aç ve toplantıya katıl.</span>
                  <button onClick={() => setYayinda(true)} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neon-blue/90"><Video size={13} /> Yayına Katıl</button>
                </div>
              )}
            </div>
            </>)}

            <div className="rounded-xl border border-line bg-panel p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Sparkles size={16} className="text-neon-violet" /> Akıllı Toplantı Defteri</h2>
                <div className="flex items-center gap-1.5">
                  <button onClick={aiOzet} className="flex items-center gap-1.5 rounded-lg border border-neon-violet/40 bg-neon-violet/10 px-2.5 py-1.5 text-xs font-medium text-neon-violet transition hover:bg-neon-violet/20"><Sparkles size={13} /> AI Özet</button>
                  <button onClick={indirMd} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-elevated hover:text-ink"><FileDown size={13} /> Rapor (MD)</button>
                </div>
              </div>

              {ozet && (
                <div className="mb-3 rounded-lg border border-neon-violet/30 bg-neon-violet/5 p-3">
                  <div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-bold text-neon-violet"><Sparkles size={12} /> AI Özet (simülasyon)</span><button onClick={() => setOzet(null)} className="text-faint hover:text-ink"><X size={13} /></button></div>
                  <p className="whitespace-pre-line text-[12px] leading-relaxed text-ink/80">{ozet}</p>
                </div>
              )}

              {/* not ekleme — aktif kategori + metin (izleyicide gizli) */}
              {!izleyici && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-base/40 p-2">
                {(() => { const km = KMETA[kategori] ?? { icon: FileText, c: "#64748B" }; return (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold" style={{ background: km.c + "1f", color: km.c }}><km.icon size={13} /> {kategori}</span>
                ); })()}
                <input ref={inputRef} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder={`${kategori} karala — anında düşer (soldan kategori değiştir)…`} className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-ink outline-none placeholder:text-faint" />
                <button onClick={() => addNote()} disabled={!note.trim()} className="flex shrink-0 items-center gap-1 rounded-lg bg-neon-blue px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Send size={14} /> Ekle</button>
              </div>
              )}

              {/* canlı not akışı */}
              <div className="space-y-2">
                {notlar.length === 0 && <p className="py-8 text-center text-sm text-faint">Defter boş — soldan kategori seçip yukarıdan ilk katkıyı ekleyin.</p>}
                {[...notlar].reverse().map((n) => { const km = KMETA[n.kategori] ?? { icon: FileText, c: "#64748B" }; return (
                  <div key={n.id} className="group flex items-start gap-2.5 rounded-xl border border-line bg-base/30 p-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: km.c + "22", color: km.c }}><km.icon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm text-ink ${n.gorev ? "line-through opacity-60" : ""}`}>{n.metin}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted"><span className="rounded px-1 font-bold" style={{ background: km.c + "1f", color: km.c }}>{n.kategori}</span><span className="font-semibold text-ink/70">{n.yazar}</span><MapPin size={9} /> {n.sehir} · {n.zaman}{n.gorev && <span className="rounded bg-good/15 px-1 font-semibold text-good">göreve dönüştü</span>}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => !izleyici && voteNote(n.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-neon-blue/10 hover:text-neon-blue"><ThumbsUp size={13} /> {n.oy}</button>
                      {!izleyici && !n.gorev && <button onClick={() => toGorev(n)} title="Göreve dönüştür" className="grid h-7 w-7 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-good/10 hover:text-good group-hover:opacity-100"><CheckSquare size={14} /></button>}
                      {!izleyici && <button onClick={() => delNote(n.id)} className="grid h-7 w-7 place-items-center rounded-lg text-faint opacity-0 transition hover:text-critical group-hover:opacity-100"><X size={13} /></button>}
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* ───── TOPLANTILAR LİSTESİ ───── */}
      {tab === "liste" && (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><ListChecks size={16} className="text-neon-blue" /> Toplantılar Listesi ({gorunurToplantilar.length})</h2>
            <button onClick={() => setTab("kayit")} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neon-blue/90"><Plus size={14} /> Yeni Toplantı</button>
          </div>
          {gorunurToplantilar.length === 0 ? (
            <p className="py-12 text-center text-sm text-faint">Henüz toplantı yok.</p>
          ) : (
            <div className="divide-y divide-line">
              {[...gorunurToplantilar].sort((a, b) => b.tarih.localeCompare(a.tarih) || b.saat.localeCompare(a.saat)).map((m) => { const gecmis = m.tarih < td; const notSay = (store.notlar[m.id] || []).length; return (
                <div key={m.id} className="group flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-elevated/50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Presentation size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{m.baslik}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {dmy(m.tarih)}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {m.saat}</span>
                      {m.proje && <span>· {m.proje}</span>}
                      {notSay > 0 && <span className="rounded bg-neon-violet/10 px-1.5 font-medium text-neon-violet">{notSay} katkı</span>}
                      <span className={`rounded-full px-1.5 font-semibold ${gecmis ? "bg-elevated text-muted" : "bg-good/10 text-good"}`}>{gecmis ? "Geçmiş" : "Yaklaşan"}</span>
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1 lg:max-w-[40%]">
                    {m.katilimcilar.slice(0, 4).map((k) => <span key={k} className="rounded-full bg-base/60 px-2 py-0.5 text-[10px] text-muted"><MapPin size={9} className="mr-0.5 inline" />{k} · {sehirOf(k)}</span>)}
                    {m.katilimcilar.length > 4 && <span className="text-[10px] text-faint">+{m.katilimcilar.length - 4}</span>}
                    {m.katilimcilar.length === 0 && <span className="text-[10px] text-faint">katılımcı yok</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => { setSelMeet(m.id); setTab("oda"); }} className="rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-2.5 py-1.5 text-xs font-medium text-neon-blue transition hover:bg-neon-blue/20">Odaya Gir</button>
                    <button onClick={() => silMeet(m.id)} className="grid h-8 w-8 place-items-center rounded-lg text-faint opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                </div>
              ); })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
