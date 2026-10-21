import { useState } from "react";
import {
  Clock, CheckSquare, Square, Users, Phone, Utensils, AlertCircle, ArrowRight, Clock3,
  Heart, Search, Lightbulb, Droplet, Smile, Meh, Frown, CalendarCheck, ChevronLeft, ChevronRight,
  FileText, BarChart3, Scale, Plus,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import TalepForm from "@/components/requests/TalepForm";
import { X } from "lucide-react";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const HAND = "'Patrick Hand', 'Comic Sans MS', ui-rounded, cursive";
const TR_AY = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const TR_AY_K = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const AY_GUN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const ONE = 86400000;
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseH = (s: unknown) => { const m = String(s).match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) : NaN; };
const PASTEL: Record<string, string> = { Mavi: "#DBEAFE", Yeşil: "#DCFCE7", Turuncu: "#FEF3C7", Kırmızı: "#FEE2E2", Mor: "#EDE9FE", Gri: "#EEF2F6" };
// Kayıt tipi → renk + kısa etiket (ne olduğunu göster)
const TIP_META: Record<string, { renk: string; kisa: string }> = {
  "Ajanda": { renk: "#0A4EA2", kisa: "AJANDA" },
  "Etkinlik": { renk: "#0d9488", kisa: "ETKİNLİK" },
  "Görev": { renk: "#1E7A46", kisa: "GÖREV" },
  "Not": { renk: "#CA8A04", kisa: "NOT" },
  "Onay": { renk: "#B5731A", kisa: "ONAY" },
  "Talep": { renk: "#C1292E", kisa: "TALEP" },
  "Tutanak": { renk: "#7C3AED", kisa: "TUTANAK" },
};
const iconFor = (t: string): typeof Users => {
  const s = t.toLocaleLowerCase("tr");
  if (/toplant|ekip|sunum|görüşme/.test(s)) return Users;
  if (/telefon|çağrı|ara|zoom/.test(s)) return Phone;
  if (/öğle|yemek|mola/.test(s)) return Utensils;
  if (/teknik|kontrol|güvenlik|test/.test(s)) return AlertCircle;
  if (/rapor|analiz|değerlend/.test(s)) return BarChart3;
  if (/hukuk|sözleşme|dava/.test(s)) return Scale;
  return FileText;
};

// Sol kenar — hızlı ekleme kısayolları (addMod → yerinde modal; view → sayfaya git)
const SEKMELER: { label: string; renk: string; view?: View; addMod?: string }[] = [
  { label: "+ GÖREV", renk: "#2E8B74", addMod: "mod-T-0057" },
  { label: "+ ETKİNLİK", renk: "#0d9488", addMod: "mod-T-0060" },
  { label: "+ NOT", renk: "#C96A86", addMod: "mod-T-0068" },
  { label: "+ DOSYA", renk: "#D9B44A", addMod: "mod-T-0067" },
  { label: "+ TALEP", renk: "#B5731A", addMod: "TALEP" },
  { label: "+ TUTANAK", renk: "#5B8DB8", addMod: "mod-T-0063" },
];

export default function TimayPlanlayici({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const { getModule, updateRecord } = useModules();
  const { users } = useUsers();
  const recs = (id: string) => (getModule(id)?.records ?? []) as DynamicRecord[];
  const [cur, setCur] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [su, setSu] = useState(4);
  const [ruh, setRuh] = useState(0);
  const [lchk, setLchk] = useState<Record<string, boolean>>({});
  const [addModal, setAddModal] = useState<{ modId: string; baslik: string; defaults: Record<string, unknown> } | null>(null);
  const [editModal, setEditModal] = useState<{ modId: string; rec: DynamicRecord } | null>(null);
  const lt = (id: string) => setLchk((p) => ({ ...p, [id]: !p[id] }));

  const curDate = new Date(cur);
  const curStr = dstr(curDate);
  const nextStr = dstr(new Date(cur + ONE));
  const td = dstr(new Date());
  const y = curDate.getFullYear(), mo = curDate.getMonth();
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
  const dim = new Date(y, mo + 1, 0).getDate();
  const miniCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  // Günlük plan: T-0060 etkinlikleri saat bazlı
  const ev = recs("mod-T-0060").filter((r) => String(r.tarih) === curStr && r.baslangic_saat);
  const evByHour = (h: number) => ev.find((e) => parseH(e.baslangic_saat) === h);
  // Bugünün görevleri: T-0057
  const gorevler = recs("mod-T-0057").filter((r) => String(r.tarih) === curStr).sort((a, b) => String(a.saat || "").localeCompare(String(b.saat || "")));
  const toggleGorev = (r: DynamicRecord) => updateRecord("mod-T-0057", String(r.id), { durum: String(r.durum) === "Tamamlandı" ? "Yapılacak" : "Tamamlandı" });
  // Öncelikli işler: T-0056 açık görevler, önceliğe göre
  const acikGorev = recs("mod-T-0056").filter((r) => String(r.durum) !== "Tamamlandı");
  const byOncelik = (re: RegExp) => acikGorev.filter((g) => re.test(String(g.oncelik))).slice(0, 4);
  const toggleT56 = (r: DynamicRecord) => updateRecord("mod-T-0056", String(r.id), { durum: String(r.durum) === "Tamamlandı" ? "Yapılacak" : "Tamamlandı" });
  // Tutanak: o güne ait
  const tutanak = recs("mod-T-0063").find((r) => String(r.tarih) === curStr);
  const kararlar = String(tutanak?.kararlar ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const aksiyonlar = String(tutanak?.aksiyonlar ?? "").split("\n").map((l) => l.split("|")[0].trim()).filter(Boolean).slice(0, 4);
  // Fikirler: T-0066
  const fikirler = recs("mod-T-0066").map((r) => String(r.fikir || r.baslik || "")).filter(Boolean).slice(0, 5);
  // Önemli notlar: T-0068
  const notlar = recs("mod-T-0068").filter((r) => r.arsiv !== true).sort((a, b) => String(b.tarih ?? "").localeCompare(String(a.tarih ?? ""))).slice(0, 4).map((r) => String(r.baslik || r.icerik || ""));
  // Arama listesi: kişiler
  const arama = users.slice(0, 6);
  // Yarının hedefleri: ertesi gün T-0057
  const yarin = recs("mod-T-0057").filter((r) => String(r.tarih) === nextStr).slice(0, 4).map((r) => String(r.baslik));

  // Günün Kayıtları — bu güne düşen Not/Görev/Onay/Talep/Etkinlik/Ajanda/Tutanak (tip etiketli)
  const dayEntries: { id: string; tip: string; title: string; time: string; modId: string; rec: DynamicRecord }[] = [
    ...recs("mod-T-0057").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "a" + r.id, tip: "Ajanda", title: String(r.baslik), time: String(r.saat || ""), modId: "mod-T-0057", rec: r })),
    ...recs("mod-T-0060").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "e" + r.id, tip: "Etkinlik", title: String(r.baslik), time: String(r.baslangic_saat || ""), modId: "mod-T-0060", rec: r })),
    ...recs("mod-T-0068").filter((r) => String(r.tarih) === curStr && r.arsiv !== true).map((r) => ({ id: "n" + r.id, tip: "Not", title: String(r.baslik), time: "", modId: "mod-T-0068", rec: r })),
    ...recs("mod-T-0056").filter((r) => String(r.termin || r.baslangic) === curStr).map((r) => ({ id: "g" + r.id, tip: "Görev", title: String(r.baslik), time: "", modId: "mod-T-0056", rec: r })),
    ...recs("mod-T-0045").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "o" + r.id, tip: "Onay", title: String(r.konu), time: "", modId: "mod-T-0045", rec: r })),
    ...recs("mod-T-0076").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "q" + r.id, tip: "Talep", title: String(r.konu), time: "", modId: "mod-T-0076", rec: r })),
    ...recs("mod-T-0063").filter((r) => String(r.tarih) === curStr).map((r) => ({ id: "t" + r.id, tip: "Tutanak", title: String(r.toplanti), time: "", modId: "mod-T-0063", rec: r })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const nav = (d: number) => setCur((c) => c + d * ONE);
  const bugun = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCur(d.getTime()); };

  const Card = ({ title, icon: Icon, renk, extra, children, className }: { title: string; icon: typeof Clock; renk: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={`overflow-hidden rounded-xl border border-black/10 bg-white/70 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5" style={{ background: renk }}>
        <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-ink"><Icon size={13} /> {title}</span>
        {extra}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
  const Chk = ({ checked, onToggle, label, strike }: { checked: boolean; onToggle: () => void; label: React.ReactNode; strike?: boolean }) => (
    <button onClick={onToggle} className="flex w-full items-center gap-2 py-0.5 text-left">
      {checked ? <CheckSquare size={15} className="shrink-0 text-good" /> : <Square size={15} className="shrink-0 text-ink/30" />}
      <span className={`text-[13px] ${checked && strike ? "text-ink/40 line-through" : "text-ink/85"}`}>{label}</span>
    </button>
  );
  const Bos = ({ msg }: { msg: string }) => <p className="py-2 text-center text-[12px] text-ink/40">{msg}</p>;

  const ONCELIK = [
    { key: "A", title: "ÖNCELİKLİ (A)", renk: "#FECACA", icon: AlertCircle, items: byOncelik(/kritik|yüksek/i) },
    { key: "B", title: "ORTA (B)", renk: "#FDE68A", icon: ArrowRight, items: byOncelik(/orta|normal/i) },
    { key: "C", title: "DAHA SONRA (C)", renk: "#BBF7D0", icon: Clock3, items: byOncelik(/düşük/i) },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-3 md:p-5" style={{ fontFamily: HAND }}>
      {/* Tarih seçici */}
      <div className="mb-3 flex flex-wrap items-center gap-2 md:ml-8">
        <button onClick={bugun} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-elevated" style={{ fontFamily: "inherit" }}>Bugün</button>
        <button onClick={() => nav(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronLeft size={16} /></button>
        <button onClick={() => nav(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-elevated"><ChevronRight size={16} /></button>
        <span className="ml-1 text-base font-bold text-ink">{curDate.getDate()} {TR_AY_K[mo]} {y} · {TR_GUN_UZUN[(curDate.getDay() + 6) % 7]}</span>
        <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] text-muted" title="Ajanda Hareketleri T-0078 · kaynak: T-0057, T-0060, T-0056, T-0063, T-0068, T-0076, T-0049, T-0053">T-0078 · Ajanda Hareketleri</span>
      </div>

      <div className="flex items-stretch">
        {/* Sol kenar sekmeleri */}
        <div className="flex flex-col gap-1.5 pt-6">
          {SEKMELER.map((s) => (
            <button key={s.label} title={s.label}
              onClick={() => {
                if (s.addMod) setAddModal({ modId: s.addMod, baslik: s.label.replace("+ ", ""), defaults: s.addMod === "mod-T-0068" ? { renk: "Sarı", tarih: curStr } : { tarih: curStr } });
                else if (s.view) onNavigate?.(s.view);
              }}
              className="flex min-h-[70px] w-8 items-center justify-center rounded-l-lg shadow-md transition hover:w-9" style={{ background: s.renk }}>
              <span className="whitespace-nowrap text-[11px] font-bold tracking-wider text-white" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Defter sayfaları */}
        <div className="grid min-w-0 flex-1 gap-0 rounded-r-xl rounded-bl-xl shadow-[0_12px_34px_rgba(0,0,0,0.2)] lg:grid-cols-2" style={{ background: "#FBF7EC", border: "1px solid #E7DFC9" }}>
          {/* ── SOL SAYFA ── */}
          <div className="space-y-3 border-b border-dashed border-[#E3DCC6] p-5 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="font-serif text-6xl font-bold leading-[0.8] text-ink">{curDate.getDate()}</span>
                <div className="font-serif leading-tight">
                  <p className="text-2xl font-bold text-ink">{TR_AY[mo]}</p>
                  <p className="text-xl text-ink/80">{y}</p>
                  <p className="text-sm text-ink/60">{TR_GUN_UZUN[(curDate.getDay() + 6) % 7]}</p>
                </div>
              </div>
              <div className="rounded-lg border border-black/10 bg-white/60 p-2">
                <p className="mb-1 text-center text-[11px] font-bold text-ink/80">{TR_AY_K[mo]} {y}</p>
                <div className="grid grid-cols-7 gap-x-1.5 gap-y-0.5 text-center text-[10px]">
                  {AY_GUN.map((g) => <span key={g} className="font-semibold text-ink/50">{g}</span>)}
                  {miniCells.map((d, i) => d === null ? <span key={i} /> : (
                    <button key={i} onClick={() => setCur(new Date(y, mo, d).getTime())} className={`${d === curDate.getDate() ? "mx-auto grid h-4 w-4 place-items-center rounded-full bg-neon-blue font-bold text-white" : dstr(new Date(y, mo, d)) === td ? "font-bold text-neon-blue" : "text-ink/70"}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="relative max-w-[140px] -rotate-2 rounded-sm bg-[#FBD5DE] px-3 py-2 shadow-[1px_2px_6px_rgba(0,0,0,0.15)]">
                <p className="leading-snug text-ink/80" style={{ fontFamily: "'Caveat', cursive", fontSize: 16 }}>“Her büyük iş, küçük bir adımla başlar.”</p>
              </div>
            </div>

            <Card title="GÜNLÜK PLAN" icon={Clock} renk="#CFE4F7" extra={onNavigate && <button onClick={() => onNavigate("ajandam")} className="flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-ink/70 transition hover:text-neon-blue" style={{ fontFamily: "inherit" }}><Plus size={11} /> Ekle</button>}>
              <div className="space-y-0.5">
                {Array.from({ length: 14 }, (_, i) => 7 + i).map((h) => {
                  const e = evByHour(h);
                  const g = !e ? gorevler.find((x) => x.saat && parseH(x.saat) === h) : undefined;
                  const Icon = e ? iconFor(String(e.baslik) + " " + String(e.tur || "")) : null;
                  return (
                    <div key={h} className="flex items-center gap-2 border-b border-black/5 py-0.5 last:border-0" style={{ minHeight: 28 }}>
                      <span className="w-10 shrink-0 text-[11px] font-semibold text-ink/50 nums">{pad(h)}:00</span>
                      {e ? (
                        <div className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1" style={{ background: PASTEL[String(e.renk)] ?? "#EEF2F6" }}>
                          {Icon ? <Icon size={13} className="shrink-0 text-ink/60" /> : null}
                          <span className="min-w-0"><span className="block truncate text-[13px] font-medium text-ink/85">{String(e.baslik)}</span>{e.konum || e.tur ? <span className="block truncate text-[10px] text-ink/50">{String(e.konum || e.tur)}</span> : null}</span>
                        </div>
                      ) : g ? (
                        <div className="flex flex-1 items-center justify-between gap-2 rounded-md bg-[#ECFCCB]/60 px-2 py-1">
                          <span className="min-w-0 truncate text-[13px] text-ink/85">{String(g.baslik)}</span>
                          <button onClick={() => toggleGorev(g)} className="shrink-0">{String(g.durum) === "Tamamlandı" ? <CheckSquare size={15} className="text-good" /> : <Square size={15} className="text-ink/30" />}</button>
                        </div>
                      ) : <div className="flex-1" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ── SAĞ SAYFA ── */}
          <div className="space-y-3 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {ONCELIK.map((col) => (
                <Card key={col.key} title={col.title} icon={col.icon} renk={col.renk}>
                  <div className="space-y-0.5">
                    {col.items.length ? col.items.map((g) => <Chk key={String(g.id)} checked={String(g.durum) === "Tamamlandı"} onToggle={() => toggleT56(g)} label={String(g.baslik)} strike />) : <Bos msg="—" />}
                  </div>
                </Card>
              ))}
            </div>

            <Card title="TOPLANTI NOTLARI" icon={Users} renk="#CFE4F7" extra={tutanak ? <span className="text-[10px] text-ink/60">{String(tutanak.saat || "")} · {String(tutanak.toplanti)}</span> : undefined}>
              {tutanak ? (
                <div className="flex flex-wrap gap-3">
                  <ul className="min-w-[180px] flex-1 space-y-0.5 text-[13px] text-ink/85">{kararlar.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/40">•</span>{x}</li>)}</ul>
                  {aksiyonlar.length > 0 && (
                    <div className="w-40 -rotate-1 rounded-sm bg-[#FBD5DE]/70 p-2">
                      <p className="mb-1 font-bold text-ink/80" style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>Aksiyonlar:</p>
                      {aksiyonlar.map((x, i) => <Chk key={i} checked={!!lchk["ak" + curStr + i]} onToggle={() => lt("ak" + curStr + i)} label={x} />)}
                    </div>
                  )}
                </div>
              ) : <Bos msg="Bu güne ait toplantı tutanağı yok." />}
            </Card>

            <Card title="FİKİRLER / NOTLAR" icon={Lightbulb} renk="#FDE9B5">
              <div className="flex flex-wrap items-center gap-3">
                <ul className="min-w-[200px] flex-1 space-y-0.5 text-[13px] text-ink/85">{fikirler.length ? fikirler.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/40">•</span>{x}</li>) : <Bos msg="Fikir havuzu boş." />}</ul>
                <svg viewBox="0 0 230 130" className="h-28 w-56 shrink-0">
                  {[["115,65", "55,26"], ["115,65", "190,33"], ["115,65", "38,102"], ["115,65", "178,107"]].map(([a, b], i) => { const [x1, y1] = a.split(",").map(Number); const [x2, y2] = b.split(",").map(Number); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" strokeWidth="1" />; })}
                  <g fontSize="8" textAnchor="middle" fontFamily="Patrick Hand">
                    <ellipse cx="115" cy="65" rx="34" ry="16" fill="#FDE68A" stroke="#CA8A04" /><text x="115" y="68" fontWeight="bold">Yeni Proje</text>
                    <ellipse cx="55" cy="26" rx="30" ry="13" fill="#fff" stroke="#9CA3AF" /><text x="55" y="29">Web Paneli</text>
                    <ellipse cx="190" cy="33" rx="30" ry="14" fill="#fff" stroke="#9CA3AF" /><text x="190" y="31">Mobil</text><text x="190" y="40">Uygulama</text>
                    <ellipse cx="38" cy="102" rx="28" ry="14" fill="#fff" stroke="#9CA3AF" /><text x="38" y="100">Veri</text><text x="38" y="109">Analizi</text>
                    <ellipse cx="178" cy="107" rx="32" ry="15" fill="#fff" stroke="#9CA3AF" /><text x="178" y="105">API</text><text x="178" y="114">Entegrasyonu</text>
                  </g>
                </svg>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card title="SU TAKİBİ" icon={Droplet} renk="#CFE4F7">
                <div className="flex gap-1">{Array.from({ length: 8 }).map((_, i) => <button key={i} onClick={() => setSu(i + 1)} className="h-6 w-4 rounded-b-md border border-blue-300" style={{ background: i < su ? "#60A5FA" : "transparent" }} />)}</div>
                <p className="mt-1 text-[12px] text-ink/70">{su} / 8 bardak</p>
              </Card>
              <Card title="RUH HALİ" icon={Smile} renk="#E7E1F3">
                <div className="flex items-center justify-center gap-3">{[Smile, Meh, Frown].map((Ic, i) => <button key={i} onClick={() => setRuh(i)} className={i === ruh ? "text-good" : "text-ink/30"}><Ic size={26} /></button>)}</div>
                <p className="mt-1 text-center text-ink/70" style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>{["Verimli bir gün", "Normal bir gün", "Zorlu bir gün"][ruh]}</p>
              </Card>
              <Card title="YARININ HEDEFLERİ" icon={CalendarCheck} renk="#CFE4F7">
                <div className="space-y-0.5">{yarin.length ? yarin.map((x, i) => <Chk key={i} checked={!!lchk["yr" + nextStr + i]} onToggle={() => lt("yr" + nextStr + i)} label={x} />) : <Bos msg="Yarına planlı iş yok." />}</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Alt: BUGÜN YAPILACAKLAR / ÖNEMLİ NOTLAR / ARAMA */}
      <div className="ml-8 mt-3 grid grid-cols-1 gap-3 rounded-xl border border-[#E7DFC9] bg-[#FBF7EC] p-5 shadow-sm md:grid-cols-3" style={{ fontFamily: HAND }}>
        <Card title="BUGÜN YAPILACAKLAR" icon={CheckSquare} renk="#CFE4F7">
          <div className="space-y-0.5">{gorevler.length ? gorevler.map((g) => <Chk key={String(g.id)} checked={String(g.durum) === "Tamamlandı"} onToggle={() => toggleGorev(g)} label={<span>{String(g.baslik)} {g.saat ? <span className="text-[10px] text-ink/45">· {String(g.saat)}</span> : null}</span>} strike />) : <Bos msg="Bu güne görev yok." />}</div>
        </Card>
        <Card title="ÖNEMLİ NOTLAR" icon={Heart} renk="#FBD5DE">
          {notlar.length ? <ul className="space-y-1 text-[13px] text-ink/85">{notlar.map((x, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/40">•</span>{x}</li>)}</ul> : <Bos msg="Not yok." />}
        </Card>
        <Card title="ARAMA / GÖRÜŞME LİSTESİ" icon={Search} renk="#CFE4F7">
          <div className="space-y-0.5">{arama.map((u) => (
            <button key={u.id} onClick={() => lt("c" + u.id)} className="flex w-full items-center gap-2 py-0.5 text-left">
              <Phone size={12} className="shrink-0 text-ink/50" />
              <span className="flex-1 text-[13px] text-ink/85">{u.name} <span className="text-[11px] text-ink/50">({u.department})</span></span>
              {lchk["c" + u.id] ? <CheckSquare size={14} className="text-good" /> : <Square size={14} className="text-ink/30" />}
            </button>
          ))}</div>
        </Card>
      </div>

      {/* GÜNÜN KAYITLARI — bu güne düşen tüm kayıtlar, tip etiketli (Not / Görev / Onay / Talep …) */}
      <div className="ml-8 mt-3 rounded-xl border border-[#E7DFC9] bg-[#FBF7EC] p-5 shadow-sm" style={{ fontFamily: HAND }}>
        <Card title="GÜNÜN KAYITLARI" icon={CalendarCheck} renk="#CFE4F7" extra={<span className="text-[10px] text-ink/60">{dayEntries.length} kayıt · tiplere göre</span>}>
          {dayEntries.length ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3" style={{ fontFamily: "ui-sans-serif, system-ui" }}>
              {dayEntries.map((e) => { const m = TIP_META[e.tip]; return (
                <button key={e.id} onClick={() => setEditModal({ modId: e.modId, rec: e.rec })} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-2.5 py-1.5 text-left transition hover:border-neon-blue/50">
                  <span className="w-14 shrink-0 rounded px-1 py-0.5 text-center text-[8px] font-bold tracking-wide text-white" style={{ background: m.renk }}>{m.kisa}</span>
                  {e.time ? <span className="shrink-0 text-[10px] text-ink/50 nums">{e.time}</span> : null}
                  <span className="flex-1 truncate text-[13px] text-ink/85">{e.title}</span>
                </button>
              ); })}
            </div>
          ) : <Bos msg="Bu güne düşen kayıt yok." />}
        </Card>
      </div>

      {/* Hızlı ekleme modalı — + GÖREV / + ETKİNLİK / + NOT / + DOSYA / + TALEP / + TUTANAK */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 font-sans backdrop-blur-sm" onClick={() => setAddModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{addModal.baslik} Ekle</h3>
              <button onClick={() => setAddModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              {addModal.modId === "TALEP"
                ? <TalepForm initial="new" onClose={() => setAddModal(null)} />
                : getModule(addModal.modId)
                  ? <RecordForm mod={getModule(addModal.modId)!} defaults={addModal.defaults} onClose={() => setAddModal(null)} />
                  : <p className="text-sm text-muted">Tablo bulunamadı.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Günün Kayıtları'ndan kayıt düzenleme modalı */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 font-sans backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{String(editModal.rec.baslik ?? editModal.rec.konu ?? editModal.rec.toplanti ?? "Kayıt")}</h3>
              <button onClick={() => setEditModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              {editModal.modId === "mod-T-0076"
                ? <TalepForm initial={editModal.rec} onClose={() => setEditModal(null)} />
                : getModule(editModal.modId)
                  ? <RecordForm mod={getModule(editModal.modId)!} initial={editModal.rec} onClose={() => setEditModal(null)} />
                  : <p className="text-sm text-muted">Tablo bulunamadı.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
