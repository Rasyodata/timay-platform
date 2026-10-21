import { useState } from "react";
import {
  BookMarked, Plus, X, Trash2, StickyNote, ListChecks, CalendarDays, Gavel, Users, FileText, Wallet, ArrowLeftRight, Flag, ShieldAlert,
  Search, LayoutGrid, List as ListIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord } from "@/types/modules";

const MOD = "mod-T-0079";
const TIP_META: Record<string, { renk: string; icon: LucideIcon }> = {
  "Not": { renk: "#64748B", icon: StickyNote },
  "Görev": { renk: "#1E7A46", icon: ListChecks },
  "Etkinlik": { renk: "#0d9488", icon: CalendarDays },
  "Karar": { renk: "#0A4EA2", icon: Gavel },
  "Toplantı": { renk: "#4B3FB0", icon: Users },
  "Belge": { renk: "#B5731A", icon: FileText },
  "Gider": { renk: "#C1292E", icon: Wallet },
  "Hareket": { renk: "#0891B2", icon: ArrowLeftRight },
  "Kilometre Taşı": { renk: "#7C3AED", icon: Flag },
  "Risk": { renk: "#C1292E", icon: ShieldAlert },
};
const DURUM_RENK: Record<string, string> = { "Açık": "#64748B", "Devam Ediyor": "#B5731A", "Tamamlandı": "#1E7A46", "İptal": "#C1292E", "Yapılacak": "#64748B" };
const TIP_SIRA = ["Not", "Görev", "Etkinlik", "Toplantı", "Karar", "Belge", "Gider", "Kilometre Taşı", "Risk", "Hareket"];
// İş Hareket türü → defter tipi eşlemesi
const HAR_TIP: Record<string, string> = { "Toplantı": "Toplantı", "Gider": "Gider", "Ödeme": "Gider", "Tahsilat": "Hareket", "Sözleşme": "Belge", "Teklif": "Belge", "E-posta": "Not" };
const low = (s: unknown) => String(s ?? "").toLocaleLowerCase("tr");
const dmy = (iso: string) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "—");

type Satir = { key: string; tarih: string; tip: string; baslik: string; durum: string; sorumlu: string; ilgili: string; kaynak: string; editable?: boolean; rec?: DynamicRecord };

export default function ProjeDefteri({ projectName, projectCode }: { projectName: string; projectCode: string }) {
  const { getModule, deleteRecord } = useModules();
  const recs = (id: string) => (getModule(id)?.records ?? []) as DynamicRecord[];
  const mod = getModule(MOD);
  const [modal, setModal] = useState<DynamicRecord | "new" | null>(null);
  const [yeniTip, setYeniTip] = useState<string>("");
  const [q, setQ] = useState("");
  const [tipFilter, setTipFilter] = useState<string>("");

  const pn = low(projectName);
  const byName = (r: DynamicRecord) => [r.baslik, r.ad, r.konu, r.toplanti, r.aciklama, r.icerik, r.risk, r.proje].some((v) => low(v).includes(pn));
  const byCode = (r: DynamicRecord) => String(r.proje_kodu) === projectCode;
  const g = (r: DynamicRecord, keys: string[]) => { for (const k of keys) if (r[k]) return String(r[k]); return ""; };

  // Birleşik defter: manuel kayıtlar (T-0079) + projeye bağlı tüm hareketler (T-0078 tarzı günlük/defter)
  const SRC: { mod: string; match: (r: DynamicRecord) => boolean; tip: (r: DynamicRecord) => string; tarih: (r: DynamicRecord) => string; baslik: (r: DynamicRecord) => string; kaynak: string; editable?: boolean }[] = [
    { mod: "mod-T-0079", match: byCode, tip: (r) => String(r.tip || "Not"), tarih: (r) => g(r, ["tarih"]), baslik: (r) => String(r.baslik), kaynak: "Defter", editable: true },
    { mod: "mod-T-0056", match: byName, tip: () => "Görev", tarih: (r) => g(r, ["termin", "baslangic", "_eklenme"]), baslik: (r) => String(r.baslik), kaynak: "Görev · T-0056" },
    { mod: "mod-T-0057", match: byName, tip: () => "Etkinlik", tarih: (r) => g(r, ["tarih"]), baslik: (r) => String(r.baslik), kaynak: "Ajanda · T-0057" },
    { mod: "mod-T-0060", match: byName, tip: () => "Etkinlik", tarih: (r) => g(r, ["tarih"]), baslik: (r) => String(r.baslik), kaynak: "Takvim · T-0060" },
    { mod: "mod-T-0068", match: byName, tip: () => "Not", tarih: (r) => g(r, ["tarih", "_eklenme"]), baslik: (r) => String(r.baslik), kaynak: "Not · T-0068" },
    { mod: "mod-T-0063", match: byName, tip: () => "Toplantı", tarih: (r) => g(r, ["tarih"]), baslik: (r) => String(r.toplanti), kaynak: "Tutanak · T-0063" },
    { mod: "mod-T-0021", match: byCode, tip: () => "Risk", tarih: (r) => g(r, ["_eklenme"]), baslik: (r) => String(r.risk), kaynak: "Risk · T-0021" },
    { mod: "mod-T-0010", match: byName, tip: () => "Gider", tarih: (r) => g(r, ["tarih", "_eklenme"]), baslik: (r) => g(r, ["aciklama", "masraf", "masraf_no"]), kaynak: "Masraf · T-0010" },
    // İş Hareket (T-0042) — projenin tüm hareketleri deftere işlenir
    { mod: "mod-T-0042", match: () => true, tip: (r) => HAR_TIP[String(r.hareket_turu)] ?? "Hareket", tarih: (r) => g(r, ["tarih", "_eklenme"]), baslik: (r) => (g(r, ["aciklama"]) || String(r.hareket_turu || "Hareket")), kaynak: "İş Hareket · T-0042" },
    // Kilometre Taşları (T-0047) — proje takip
    { mod: "mod-T-0047", match: () => true, tip: () => "Kilometre Taşı", tarih: (r) => g(r, ["tarih", "hedef_tarih", "termin", "_eklenme"]), baslik: (r) => g(r, ["ad", "baslik", "kilometre_tasi", "aciklama"]), kaynak: "Kilometre Taşı · T-0047" },
  ];
  const satirlar: Satir[] = [];
  for (const s of SRC) for (const r of recs(s.mod).filter(s.match)) {
    const baslik = s.baslik(r);
    if (baslik) satirlar.push({ key: s.mod + String(r.id), tarih: s.tarih(r), tip: s.tip(r), baslik, durum: String(r.durum ?? ""), sorumlu: g(r, ["sorumlu", "atanan", "kullanici"]), ilgili: g(r, ["ilgili", "tutar", "konum", "il"]), kaynak: s.kaynak, editable: s.editable, rec: s.editable ? r : undefined });
  }
  const ql = low(q);
  const aranan = ql ? satirlar.filter((s) => [s.baslik, s.tip, s.sorumlu, s.ilgili].some((v) => low(v).includes(ql))) : satirlar;
  const sayac: Record<string, number> = {};
  for (const s of aranan) sayac[s.tip] = (sayac[s.tip] || 0) + 1;
  const hepsi = (tipFilter ? aranan.filter((s) => s.tip === tipFilter) : aranan).slice().sort((a, b) => (b.tarih || "").localeCompare(a.tarih || ""));

  const all = recs(MOD);
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextNo = () => { const nums = all.map((r) => { const m = String(r.defter_no ?? "").match(/(\d+)\s*$/); return m ? parseInt(m[1]) : 0; }); return `PD-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
  const openNew = (tip?: string) => { setYeniTip(tip ?? tipFilter); setModal("new"); };
  const gunSayisi = new Set(satirlar.map((s) => (s.tarih || "").slice(0, 10)).filter(Boolean)).size;

  // tarihe göre grupla (defter: her tarih bir sayfa)
  const gruplar: { tarih: string; list: Satir[] }[] = [];
  for (const s of hepsi) { const k = (s.tarih || "").slice(0, 10) || "—"; let gr = gruplar.find((x) => x.tarih === k); if (!gr) { gr = { tarih: k, list: [] }; gruplar.push(gr); } gr.list.push(s); }

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink"><BookMarked size={15} className="text-neon-blue" /> Proje Defteri <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted">T-0079</span> <span className="text-xs font-normal text-muted">· projeye bağlı tüm hareketler tarihli</span></h3>
        <div className="relative ml-auto">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Defterde ara…" className="w-56 rounded-lg border border-line bg-base/50 py-1.5 pl-7 pr-2 text-xs text-ink outline-none focus:border-neon-blue/40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px]">
        {/* Sol/Ana: defter (tarih sıralı günlük kayıt) */}
        <div className="lg:col-start-1 lg:row-start-1">
          {hepsi.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line py-16 text-center">
              <BookMarked size={30} className="text-faint" />
              <p className="text-sm text-muted">{tipFilter ? `Bu projede "${tipFilter}" türünde kayıt yok.` : "Bu projeye bağlı hareket yok."}</p>
              <button onClick={() => openNew()} className="mt-1 rounded-lg bg-neon-blue px-3 py-1.5 text-xs font-semibold text-white">İlk kaydı ekle →</button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              {gruplar.map((gr) => (
                <div key={gr.tarih}>
                  <div className="flex items-center gap-2 border-b border-line bg-base/50 px-3 py-1.5">
                    <CalendarDays size={12} className="text-neon-blue" />
                    <span className="text-[11px] font-bold text-ink nums">{dmy(gr.tarih)}</span>
                    {gr.tarih === todayStr ? <span className="rounded-full bg-neon-blue/10 px-1.5 text-[9px] font-semibold text-neon-blue">Bugün</span> : null}
                    <span className="text-[10px] text-faint">· {gr.list.length} kayıt</span>
                  </div>
                  {gr.list.map((s) => {
                    const tm = TIP_META[s.tip] ?? TIP_META["Not"]; const Icon = tm.icon;
                    const dr = DURUM_RENK[s.durum] ?? "#64748B";
                    return (
                      <div key={s.key} className="group flex items-center gap-3 border-b border-line/70 px-3 py-2 transition last:border-0 hover:bg-neon-blue/5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${tm.renk}18`, color: tm.renk }}><Icon size={14} /></span>
                        <span className="w-20 shrink-0 text-[10px] font-semibold" style={{ color: tm.renk }}>{s.tip}</span>
                        <div className="min-w-0 flex-1">
                          {s.editable && s.rec ? <button onClick={() => setModal(s.rec!)} className="block w-full truncate text-left text-sm font-medium text-ink hover:underline">{s.baslik}</button> : <span className="block truncate text-sm font-medium text-ink">{s.baslik}</span>}
                          <p className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted">
                            <span className="rounded border border-line bg-base/60 px-1 font-mono text-[9px] text-faint">{s.kaynak}</span>
                            {s.sorumlu ? <span>· {s.sorumlu}</span> : null}
                            {s.ilgili ? <span>· {s.ilgili}</span> : null}
                          </p>
                        </div>
                        {s.durum ? <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${dr}18`, color: dr }}>{s.durum}</span> : null}
                        {s.editable && s.rec ? <button onClick={() => deleteRecord(MOD, String(s.rec!.id))} title="Sil" className="grid h-6 w-6 shrink-0 place-items-center rounded text-faint opacity-0 transition hover:text-critical group-hover:opacity-100"><Trash2 size={13} /></button> : <span className="w-6 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sağ: Hızlı İşlemler + hareket türleri (filtre) */}
        <div className="h-fit rounded-xl border border-line bg-base/40 p-3 lg:col-start-2 lg:row-start-1">
          <button onClick={() => openNew()} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-neon-blue px-2.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"><Plus size={14} /> Yeni Kayıt{tipFilter ? ` · ${tipFilter}` : ""}</button>
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><ListIcon size={12} /> Hareketler</p>
          <div className="space-y-1">
            <button onClick={() => setTipFilter("")} className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition ${tipFilter === "" ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue" : "border-line bg-panel text-ink hover:border-neon-blue/40"}`}>
              <span className="flex items-center gap-2"><LayoutGrid size={13} /> Tümü</span>
              <span className="rounded-full bg-base/70 px-1.5 text-[10px] text-muted">{aranan.length}</span>
            </button>
            {TIP_SIRA.map((t) => {
              const m = TIP_META[t]; const Icon = m.icon; const c = sayac[t] || 0; const aktif = tipFilter === t;
              return (
                <button key={t} onClick={() => setTipFilter(aktif ? "" : t)} className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition ${aktif ? "border-neon-blue/50 bg-neon-blue/10" : "border-line bg-panel hover:border-neon-blue/40"} ${c === 0 && !aktif ? "opacity-45" : ""}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: `${m.renk}18`, color: m.renk }}><Icon size={12} /></span>
                    <span className="truncate" style={{ color: aktif ? m.renk : undefined }}>{t}</span>
                  </span>
                  {c > 0 ? <span className="rounded-full px-1.5 text-[10px] font-semibold" style={{ background: `${m.renk}18`, color: m.renk }}>{c}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-line pt-2 text-[10px] leading-relaxed text-faint">{projectCode}<br />{satirlar.length} hareket · {gunSayisi} gün</div>
        </div>
      </div>

      {modal && mod && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal === "new" ? "Yeni Defter Kaydı" : "Defter Kaydını Düzenle"}</h3>
              <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
            </div>
            <div className="p-4">
              <RecordForm mod={mod} initial={modal === "new" ? undefined : (modal as never)}
                defaults={modal === "new" ? { defter_no: nextNo(), proje_kodu: projectCode, tarih: todayStr, durum: "Açık", ...(yeniTip ? { tip: yeniTip } : {}) } : undefined}
                onClose={() => setModal(null)} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
