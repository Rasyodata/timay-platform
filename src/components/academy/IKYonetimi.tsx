import { Users, UserPlus, Gauge, Wallet, CalendarDays, Clock, Timer, Building2, Package, GraduationCap, ChevronRight, Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import type { View } from "@/App";

const ASAMALAR = ["Başvuru", "Ön Eleme", "Mülakat", "Teknik Test", "Teklif", "İşe Alındı"];
const ASAMA_RENK: Record<string, string> = { "Başvuru": "#64748B", "Ön Eleme": "#0891B2", "Mülakat": "#0A4EA2", "Teknik Test": "#4B3FB0", "Teklif": "#B5731A", "İşe Alındı": "#1E7A46", "Reddedildi": "#C1292E" };

export default function IKYonetimi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const { users } = useUsers();
  const recs = (id: string) => (getModule(id)?.records ?? []) as Array<Record<string, unknown>>;

  const calisan = users.length;
  const adaylar = recs("mod-T-0069");
  const aktifAday = adaylar.filter((a) => !/İşe Alındı|Reddedildi/.test(String(a.asama))).length;
  const izinler = recs("mod-T-0053");
  const bekleyenIzin = izinler.filter((i) => /bekl/i.test(String(i.durum))).length;
  const bordro = recs("mod-T-0071");
  const netToplam = bordro.reduce((s, b) => s + (Number(b.net) || 0), 0);
  const perf = recs("mod-T-0070").filter((p) => Number(p.genel_puan) > 0);
  const ortPerf = perf.length ? Math.round(perf.reduce((s, p) => s + Number(p.genel_puan), 0) / perf.length) : 0;

  const KPIS = [
    { icon: Users, label: "Toplam Çalışan", value: String(calisan), accent: "#0A4EA2" },
    { icon: UserPlus, label: "Aktif Aday", value: String(aktifAday), accent: "#4B3FB0" },
    { icon: CalendarDays, label: "Bekleyen İzin", value: String(bekleyenIzin), accent: "#B5731A" },
    { icon: Wallet, label: "Aylık Net Bordro", value: netToplam.toLocaleString("tr-TR") + " ₺", accent: "#1E7A46" },
    { icon: Gauge, label: "Ort. Performans", value: ortPerf ? "%" + ortPerf : "—", accent: "#9C2A6B" },
  ];

  const MODULLER: { title: string; desc: string; icon: LucideIcon; accent: string; view: View }[] = [
    { title: "Çalışanlar", desc: "Personel kartları · özlük bilgileri", icon: Users, accent: "#0A4EA2", view: "mod:mod-T-0025" },
    { title: "İşe Alım", desc: "Aday takibi · mülakat · teklif", icon: UserPlus, accent: "#4B3FB0", view: "mod:mod-T-0069" },
    { title: "Performans", desc: "Değerlendirme · hedef & yetkinlik", icon: Gauge, accent: "#9C2A6B", view: "mod:mod-T-0070" },
    { title: "Bordro / Maaş", desc: "Brüt · kesinti · net · ödeme", icon: Wallet, accent: "#1E7A46", view: "mod:mod-T-0071" },
    { title: "İzin Yönetimi", desc: "İzin talepleri · onay", icon: CalendarDays, accent: "#B5731A", view: "mod:mod-T-0053" },
    { title: "Mesai / Devam", desc: "Giriş-çıkış · devam takibi", icon: Clock, accent: "#0891B2", view: "mod:mod-T-0050" },
    { title: "Zaman Çizelgesi", desc: "Timesheet · proje bazlı süre", icon: Timer, accent: "#0d9488", view: "mod:mod-T-0065" },
    { title: "Departmanlar", desc: "Organizasyon yapısı", icon: Building2, accent: "#5A6B82", view: "mod:mod-T-0004" },
    { title: "Zimmet / Demirbaş", desc: "Çalışan zimmetleri", icon: Package, accent: "#7C3AED", view: "mod:mod-T-0055" },
    { title: "Eğitimler", desc: "Timay Akademi · gelişim", icon: GraduationCap, accent: "#0A4EA2", view: "akademi" },
  ];

  return (
    <div className="max-w-[1280px] space-y-6 px-4 py-8 md:px-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-neon-blue/10 text-neon-blue"><Briefcase size={24} /></span>
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-ink md:text-3xl">İK Yönetimi <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">Personel T-0025 · Aday T-0069 · Perf. T-0070 · Bordro T-0071</span></h1>
          <p className="text-sm text-muted">Personel, işe alım, performans, bordro ve izin süreçleri tek panelde (Frappe HRMS / OrangeHRM / Ever Gauzy tarzı).</p>
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => (
          <div key={k.label} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${k.accent}18`, color: k.accent }}><k.icon size={18} /></span>
            <div className="min-w-0"><p className="truncate text-lg font-bold text-ink">{k.value}</p><p className="text-[11px] text-muted">{k.label}</p></div>
          </div>
        ))}
      </div>

      {/* İşe alım hattı */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><UserPlus size={15} className="text-neon-blue" /> İşe Alım Hattı</h2>
          <button onClick={() => onNavigate("mod:mod-T-0069")} className="text-[11px] text-neon-blue hover:underline">Tüm adaylar →</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ASAMALAR.map((a) => {
            const n = adaylar.filter((x) => String(x.asama) === a).length;
            return (
              <button key={a} onClick={() => onNavigate("mod:mod-T-0069")} className="rounded-xl border border-line bg-base/40 p-3 text-left transition hover:border-neon-blue/40">
                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: ASAMA_RENK[a] }}><span className="h-2 w-2 rounded-full" style={{ background: ASAMA_RENK[a] }} /> {a}</span>
                <p className="mt-1 text-xl font-bold text-ink">{n}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modüller */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">İK Modülleri</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {MODULLER.map((t) => (
            <button key={t.title} onClick={() => onNavigate(t.view)} className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-line bg-panel/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:shadow-glow-blue">
              <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: `${t.accent}55`, background: `${t.accent}1a`, color: t.accent }}><t.icon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{t.title}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{t.desc}</span>
              </span>
              <ChevronRight size={14} className="absolute right-3 top-3 text-faint opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
