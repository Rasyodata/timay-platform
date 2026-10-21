import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Users, MapPin, ClipboardList, Target, Gavel, AlertTriangle, CheckSquare, Square,
  CheckCircle2, Plus, Pencil, Check, ChevronLeft, ChevronRight, Search, X, Trash2,
} from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0063";
const HAND = "'Patrick Hand', 'Comic Sans MS', ui-rounded, cursive";
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TAB_RENK = ["#FACC15", "#EF4444", "#3B82F6", "#22C55E", "#9CA3AF", "#A855F7"];
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
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");

// Satır-içi düzenlenebilir madde listesi (\n ile saklanır)
function EditList({ items, onChange, ph }: { items: string[]; onChange: (a: string[]) => void; ph: string }) {
  return (
    <div className="space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} placeholder={ph}
            className="min-w-0 flex-1 rounded border border-black/15 bg-white/80 px-2 py-0.5 text-[15px] text-ink outline-none focus:border-neon-blue" style={{ fontFamily: HAND }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink/40 hover:bg-black/10 hover:text-critical"><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="flex items-center gap-1 rounded-md border border-dashed border-ink/30 px-2 py-0.5 text-[13px] text-ink/60 transition hover:border-neon-blue hover:text-neon-blue"><Plus size={12} /> {ph}</button>
    </div>
  );
}

export default function TutanakNotebook({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const { getModule, addRecord, updateRecord, deleteRecord } = useModules();
  const mod = getModule(MOD);
  const recs = (mod?.records ?? []) as DynamicRecord[];
  const [selId, setSelId] = useState<string | null>(recs[0] ? String(recs[0].id) : null);
  const [edit, setEdit] = useState(false);
  const [q, setQ] = useState("");
  const [pendingNo, setPendingNo] = useState<string | null>(null);

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
          <button onClick={olustur} className="mt-1 flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-1.5 text-sm font-semibold text-white"><Plus size={15} /> Toplantı Notu Oluştur</button>
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

  const inp = "rounded border border-black/15 bg-white/80 px-2 py-0.5 text-ink outline-none focus:border-neon-blue";
  const SectionTitle = ({ icon: Icon, children, c }: { icon: typeof Target; children: ReactNode; c: string }) => (
    <h3 className="mb-2 flex items-center gap-2 text-[22px] font-bold text-ink">
      <Icon size={18} style={{ color: c }} />
      <span className="rounded px-1.5" style={{ background: c + "55" }}>{children}</span>
    </h3>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
      {/* Üst bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button onClick={() => onNavigate("ajandam")} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><ChevronLeft size={15} /> Ajanda</button>
          )}
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink">Toplantı Tutanakları <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted">T-0063</span></h1>
          {/* İleri / geri — tutanaklar arası */}
          <div className="ml-1 flex items-center gap-1">
            <button onClick={goPrev} disabled={idx <= 0} title="Önceki tutanak" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="min-w-[48px] text-center text-xs text-muted nums">{idx + 1} / {recs.length}</span>
            <button onClick={goNext} disabled={idx >= recs.length - 1} title="Sonraki tutanak" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Ara çubuğu */}
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tutanak ara…" className="w-48 rounded-lg border border-line bg-panel py-2 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-60 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
            {q && <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
          </div>
          <button onClick={() => setEdit((v) => !v)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${edit ? "border-good bg-good/10 text-good" : "border-line text-muted hover:bg-elevated hover:text-ink"}`}>
            {edit ? <><Check size={14} /> Bitir</> : <><Pencil size={14} /> Düzenle</>}
          </button>
          <button onClick={olustur} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"><Plus size={16} /> Toplantı Notu Oluştur</button>
        </div>
      </div>

      <div className="flex items-stretch">
        {/* Defter */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-l-xl rounded-r-sm text-ink shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
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
                  {edit ? <input value={String(sel.toplanti || "")} onChange={(e) => UP({ toplanti: e.target.value })} className={`${inp} flex-1 text-[17px]`} style={{ fontFamily: HAND }} /> : <span>{String(sel.toplanti)}</span>}
                </p>
                <p className="flex items-center gap-2"><MapPin size={17} className="shrink-0 text-ink/70" /><b>Yer</b> :
                  {edit ? <input value={String(sel.yer || "")} onChange={(e) => UP({ yer: e.target.value })} placeholder="Toplantı yeri" className={`${inp} flex-1 text-[17px]`} style={{ fontFamily: HAND }} /> : <span>{String(sel.yer || "—")}</span>}
                </p>
                <div className="flex gap-2"><ClipboardList size={17} className="mt-1 shrink-0 text-ink/70" />
                  <div className="min-w-0 flex-1"><b>Katılımcılar :</b>
                    {edit ? <div className="mt-1"><EditList items={katilimcilar} onChange={(a) => setL("katilimcilar", a)} ph="Katılımcı ekle" /></div>
                      : <ul className="ml-3 mt-0.5 list-disc space-y-0.5 marker:text-ink/40">{katilimcilar.map((k, i) => <li key={i}>{k}</li>)}</ul>}
                  </div>
                </div>
              </div>

              {/* Toplantı Amacı — sarı yapışkan */}
              <div className="relative float-right ml-4 mt-2 w-56 -rotate-2 rounded-sm bg-[#FEF08A] p-3 shadow-[2px_3px_8px_rgba(0,0,0,0.2)]">
                <span className="absolute -top-2 left-1/2 h-5 w-10 rounded-sm bg-[#EADFA8]/80" style={{ transform: "translateX(-50%) rotate(-4deg)" }} />
                <p className="mb-1 text-center text-[19px] font-bold" style={{ textDecoration: "underline", textDecorationColor: "#CA8A04" }}>Toplantı Amacı</p>
                {edit ? <EditList items={amac} onChange={(a) => setL("amac", a)} ph="Amaç ekle" />
                  : <ul className="space-y-0.5 text-[15px]">{amac.map((a, i) => <li key={i} className="flex gap-1"><span>•</span>{a}</li>)}</ul>}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <SectionTitle icon={ClipboardList} c="#60A5FA">Gündem</SectionTitle>
                  {edit ? <EditList items={gundem} onChange={(a) => setL("gundem", a)} ph="Gündem maddesi ekle" />
                    : <ol className="space-y-1 text-[17px]">{gundem.map((g, i) => (
                        <li key={i} className="flex items-center gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink/30 text-[12px]">{i + 1}</span><span className="flex-1">{g}</span>{i < 3 ? <CheckSquare size={16} className="text-good" /> : <Square size={16} className="text-ink/30" />}</li>
                      ))}</ol>}
                </div>
                <div>
                  <SectionTitle icon={AlertTriangle} c="#F9A8D4">Önemli Notlar</SectionTitle>
                  {edit ? <EditList items={onemli} onChange={(a) => setL("onemli_notlar", a)} ph="Not ekle" />
                    : <ul className="space-y-1 text-[16px]">{onemli.map((n, i) => <li key={i} className="flex gap-1.5"><span className="text-ink/50">•</span><span>{n}</span></li>)}</ul>}
                </div>
              </div>

              <div className="mt-5 clear-both">
                <SectionTitle icon={ClipboardList} c="#86EFAC">Görüşülen Konular</SectionTitle>
                {edit ? <EditList items={gorusulen} onChange={(a) => setL("gorusulen", a)} ph="Görüşülen konu ekle" />
                  : <div className="space-y-1.5 text-[16px]">{gorusulen.map((g, i) => <p key={i}>{g}</p>)}</div>}
              </div>
            </div>

            {/* ── SAĞ SAYFA ── */}
            <div className="relative p-6 pl-8">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <SectionTitle icon={Gavel} c="#86EFAC">Kararlar</SectionTitle>
                  {edit ? <EditList items={kararlar} onChange={(a) => setL("kararlar", a)} ph="Karar ekle" />
                    : <ol className="space-y-1 text-[17px]">{kararlar.map((k, i) => <li key={i} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink/30 text-[12px]">{i + 1}</span><span>{k}</span></li>)}</ol>}
                </div>
                <div className="h-fit rounded-lg border-2 border-[#F0A6A6] bg-[#FDECEC]/60 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[20px] font-bold"><Target size={17} className="text-[#DC2626]" /> Hedef</p>
                  {edit ? <EditList items={hedefler} onChange={(a) => setC("hedefler", a)} ph="Hedef ekle" />
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
                    <button onClick={() => setSurec([...surecArr, { ad: "", sure: "" }])} className="flex items-center gap-1 rounded-md border border-dashed border-ink/30 px-2 py-0.5 text-[13px] text-ink/60 hover:border-neon-blue hover:text-neon-blue"><Plus size={12} /> Aşama ekle</button>
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
                  {edit ? <EditList items={sorumlular} onChange={(a) => setL("sorumlular", a)} ph="Ad: Sorumluluk" />
                    : <ul className="space-y-1 text-[16px]">{sorumlular.map((s, i) => { const k = s.indexOf(":"); return <li key={i} className="flex gap-1.5"><Users size={14} className="mt-1 shrink-0 text-ink/50" /><span>{k >= 0 ? <><b>{s.slice(0, k)}</b>{s.slice(k)}</> : s}</span></li>; })}</ul>}
                </div>
                <div>
                  <SectionTitle icon={AlertTriangle} c="#FDE68A">Riskler</SectionTitle>
                  {edit ? <EditList items={riskler} onChange={(a) => setL("riskler", a)} ph="Risk ekle" />
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
                    <button onClick={() => setAks([...aksArr, { is: "", sor: "", trh: "", drm: "Bekliyor" }])} className="flex items-center gap-1 rounded-md border border-dashed border-ink/30 px-2 py-0.5 text-[13px] text-ink/60 hover:border-neon-blue hover:text-neon-blue"><Plus size={12} /> Aksiyon ekle</button>
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

              {edit && (
                <div className="mt-6 flex justify-end border-t border-dashed border-[#E3DCC6] pt-3">
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

        {/* Sağ renkli sekmeler — tutanak listesi */}
        <div className="flex flex-col gap-2 py-6">
          {filtered.map((r, i) => {
            const aktif = String(r.id) === String(sel.id);
            const c = TAB_RENK[i % TAB_RENK.length];
            const kisa = String(r.toplanti).length > 16 ? String(r.toplanti).slice(0, 15) + "…" : String(r.toplanti);
            return (
              <button key={r.id} onClick={() => setSelId(String(r.id))} title={`${r.tutanak_no} · ${r.toplanti}`}
                className={`group relative -ml-1 flex min-h-[54px] w-10 items-center justify-center rounded-r-lg shadow-md transition-all hover:w-12 ${aktif ? "w-12" : ""}`}
                style={{ background: c, opacity: aktif ? 1 : 0.8 }}>
                <span className="whitespace-nowrap text-[12px] font-bold text-white drop-shadow" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: HAND }}>{kisa}</span>
                {aktif && <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-white shadow" />}
              </button>
            );
          })}
          {filtered.length === 0 && <span className="w-10 text-center text-[10px] text-muted" style={{ writingMode: "vertical-rl" }}>sonuç yok</span>}
        </div>
      </div>
    </div>
  );
}
