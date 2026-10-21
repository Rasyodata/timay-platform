import { useMemo } from "react";
import { Scale, FileText, Gavel, CalendarClock, Users, Wallet, AlertTriangle, ArrowRight, ShieldCheck, Calculator } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { DynamicRecord } from "@/types/modules";
import type { View } from "@/App";

const pad = (n: number) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dmy = (iso: string) => (iso ? String(iso).split("-").reverse().join(".") : "");
const tl = (n: number) => n.toLocaleString("tr-TR") + " ₺";

export default function HukukPaneli({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const recs = (id: string) => (getModule(id)?.records ?? []) as DynamicRecord[];
  const davalar = recs("mod-T-0016");
  const durusmalar = recs("mod-T-0082");
  const muvekkiller = recs("mod-T-0083");
  const avukatlar = recs("mod-T-0017");

  const td = todayStr();
  const stats = useMemo(() => {
    const dava = davalar.filter((d) => String(d.islem_tipi) === "Dava").length;
    const icra = davalar.filter((d) => String(d.islem_tipi) === "İcra").length;
    const aktif = davalar.filter((d) => ["Devam Ediyor", "Onaylandı"].includes(String(d.durum))).length;
    const onayBekleyen = davalar.filter((d) => String(d.durum) === "Onay Bekliyor").length;
    const tahsilat = davalar
      .filter((d) => String(d.taraf) === "Lehine" && String(d.durum) !== "Sonuçlandı" && String(d.durum) !== "Reddedildi")
      .reduce((s, d) => s + (Number(d.anlasma_butce) || 0), 0);
    return { dava, icra, aktif, onayBekleyen, tahsilat };
  }, [davalar]);

  // Yaklaşan işlemler (bugün ve sonrası), tarihe göre
  const yaklasan = useMemo(() =>
    durusmalar
      .filter((r) => String(r.tarih) >= td && String(r.durum) !== "İptal" && String(r.durum) !== "Yapıldı")
      .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)))
      .slice(0, 8),
  [durusmalar, td]);

  const gunFark = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(td + "T00:00:00").getTime()) / 86400000);

  const Metric = ({ icon: Icon, label, value, sub, color, onClick }: { icon: typeof Scale; label: string; value: string; sub?: string; color: string; onClick?: () => void }) => (
    <button onClick={onClick} className="card flex items-center gap-3 p-4 text-left transition hover:border-neon-blue/40 hover:shadow-card">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold text-ink nums">{value}</p>
        <p className="truncate text-xs text-muted">{label}{sub ? ` · ${sub}` : ""}</p>
      </div>
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Scale size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Hukuk Yönetimi Paneli</h1>
          <p className="text-xs text-muted">Dava & icra takibi · duruşma takvimi · müvekkil · tahsilat · dilekçe ve faiz/harç araçları</p>
        </div>
      </div>

      {/* Metrikler */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={FileText} label="Toplam Dosya" value={String(davalar.length)} sub={`${stats.dava} dava · ${stats.icra} icra`} color="#0A4EA2" onClick={() => onNavigate("mod:mod-T-0016")} />
        <Metric icon={Gavel} label="Aktif / Devam Eden" value={String(stats.aktif)} sub={stats.onayBekleyen ? `${stats.onayBekleyen} onay bekliyor` : undefined} color="#1E7A46" onClick={() => onNavigate("mod:mod-T-0016")} />
        <Metric icon={Wallet} label="Bekleyen Tahsilat" value={tl(stats.tahsilat)} color="#B5731A" onClick={() => onNavigate("mod:mod-T-0016")} />
        <Metric icon={Users} label="Müvekkil" value={String(muvekkiller.length)} sub={`${avukatlar.length} avukat`} color="#7C3AED" onClick={() => onNavigate("mod:mod-T-0083")} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Yaklaşan duruşma & işlemler */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><CalendarClock size={15} className="text-neon-blue" /> Yaklaşan Duruşma & İşlemler</h2>
            <button onClick={() => onNavigate("mod:mod-T-0082")} className="flex items-center gap-1 text-xs font-medium text-neon-blue hover:underline">Tümü <ArrowRight size={12} /></button>
          </div>
          <div className="space-y-1.5">
            {yaklasan.map((r) => { const gf = gunFark(String(r.tarih)); const acil = gf <= 7; return (
              <div key={String(r.id)} className="flex items-center gap-3 rounded-lg border border-line bg-base/40 px-3 py-2">
                <div className="w-14 shrink-0 text-center">
                  <p className={`text-sm font-bold nums ${acil ? "text-critical" : "text-ink"}`}>{gf === 0 ? "Bugün" : `${gf}g`}</p>
                  <p className="text-[10px] text-faint nums">{dmy(String(r.tarih))}</p>
                </div>
                <span className="w-24 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold tracking-wide" style={{ background: acil ? "#C1292E1a" : "#0A4EA21a", color: acil ? "#C1292E" : "#0A4EA2" }}>{String(r.islem_turu)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{String(r.dosya_no)} {r.saat ? <span className="text-xs text-faint nums">· {String(r.saat)}</span> : null}</p>
                  <p className="truncate text-[11px] text-muted">{String(r.mahkeme || "")}{r.sonraki_islem ? ` — ${String(r.sonraki_islem)}` : ""}</p>
                </div>
              </div>
            ); })}
            {yaklasan.length === 0 && <p className="py-6 text-center text-xs text-faint">Yaklaşan duruşma/işlem yok.</p>}
          </div>
        </section>

        {/* Hızlı erişim */}
        <section className="space-y-3">
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-bold text-ink">Hızlı Erişim</h2>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Yeni Dava / İcra", icon: FileText, v: "mod:mod-T-0016" as View, c: "#0A4EA2" },
                { label: "Duruşma / İşlem Ekle", icon: CalendarClock, v: "mod:mod-T-0082" as View, c: "#1E7A46" },
                { label: "Müvekkil Ekle", icon: Users, v: "mod:mod-T-0083" as View, c: "#7C3AED" },
                { label: "Avukat Tanımla", icon: ShieldCheck, v: "mod:mod-T-0017" as View, c: "#0d9488" },
                { label: "Dilekçe Oluştur (AI)", icon: Gavel, v: "hukuk-dilekce" as View, c: "#B5731A" },
                { label: "Faiz & Harç Hesabı", icon: Calculator, v: "hukuk-hesap" as View, c: "#4B3FB0" },
              ].map((a) => (
                <button key={a.label} onClick={() => onNavigate(a.v)} className="flex items-center gap-2.5 rounded-xl border border-line bg-base/40 px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:text-neon-blue">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${a.c}1a`, color: a.c }}><a.icon size={15} /></span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {stats.onayBekleyen > 0 && (
            <div className="card flex items-center gap-2 border-warning/40 bg-warning/5 p-3">
              <AlertTriangle size={16} className="shrink-0 text-warning" />
              <p className="text-xs text-ink">{stats.onayBekleyen} dosya <b>onay bekliyor</b>.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
