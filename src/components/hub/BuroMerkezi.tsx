import { ChevronRight, LayoutDashboard, BarChart3, Table2, Settings,
  FolderKanban, Building2, Wallet, Rocket, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { useAudit } from "@/context/AuditContext";
import { Showcase } from "@/components/auth/LoginScreen";
import type { View } from "@/App";
import { useAllowedWorkspaces } from "@/hooks/useAccess";

// Hızlı erişim — üst barda olmayan sayfalar. (ws = erişim için gereken alan)
const HIZLI: { label: string; icon: LucideIcon; view: View; ws: string }[] = [
  { label: "Dashboard", icon: LayoutDashboard, view: "overview", ws: "startup" },
  { label: "Raporlar", icon: BarChart3, view: "finansal-raporlar", ws: "finans" },
  { label: "Tüm Tablolar", icon: Table2, view: "tables", ws: "ayarlar" },
  { label: "Ayarlar", icon: Settings, view: "record-add", ws: "ayarlar" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function BuroMerkezi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const { currentUser } = useUsers();
  const allowed = useAllowedWorkspaces();
  const recs = (id: string) => (getModule(id)?.records ?? []) as Array<Record<string, unknown>>;
  const td = todayISO();
  const me = currentUser.name;

  const gorevlerim = recs("mod-T-0056").filter((r) => String(r.atanan) === me && String(r.durum) !== "Tamamlandı");
  const onayKutum = recs("mod-T-0045").filter((r) => /bekliyor|incelemede/i.test(String(r.durum)));
  const bugunRandevu = recs("mod-T-0049").filter((r) => String(r.tarih) === td);
  const yaklasanTermin = recs("mod-T-0056").filter((r) => r.termin && String(r.termin) >= td && String(r.durum) !== "Tamamlandı");

  const KPIS = [
    { label: "Görevlerim (açık)", value: gorevlerim.length, accent: "#1E7A46", view: "gorev-yonetimi" as View },
    { label: "Onay Kutum", value: onayKutum.length, accent: "#B5731A", view: "onaylar" as View },
    { label: "Bugünkü Randevu", value: bugunRandevu.length, accent: "#0d9488", view: "ajandam" as View },
    { label: "Yaklaşan Termin", value: yaklasanTermin.length, accent: "#C1292E", view: "gorev-yonetimi" as View },
  ];

  // Yönetim alanları (ana sayfa) — yalnızca erişimi olanlar gösterilir.
  const YONETIM_TUMU: { title: string; desc: string; icon: LucideIcon; accent: string; view: View; ws: string }[] = [
    { title: "Proje Yönetimi", desc: "Projeler · görevler · hedef & bütçe · onay süreçleri", icon: FolderKanban, accent: "#3b82f6", view: "projects", ws: "proje" },
    { title: "Gayrimenkul Yönetimi", desc: "İnşaat · satış/satın alma · m² & maliyet · proje künyesi", icon: Building2, accent: "#10b981", view: "bi", ws: "gayrimenkul" },
    { title: "Finans Yönetimi", desc: "CRM · ERP/Muhasebe · Bütçe · Nakit Akışı · raporlar", icon: Wallet, accent: "#0891b2", view: "finans-merkezi", ws: "finans" },
    { title: "Startup Yönetimi", desc: "Yatırım · ortaklık · startup portföyü · beklentiler", icon: Rocket, accent: "#f59e0b", view: "overview", ws: "startup" },
  ];
  const YONETIM_ALANLARI = YONETIM_TUMU.filter((t) => allowed.has(t.ws));

  // Canlı aksiyon akışı — gerçek audit kayıtları (kayan yazı)
  const { entries } = useAudit();
  const feed = entries.slice(0, 16);

  return (
    <div className="max-w-[1280px] space-y-7 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-blue">Platform</p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Merhaba {me.split(" ")[0]} 👋</h1>
        <p className="mt-2 text-sm text-muted">Çalışma alanına hoş geldin. Günün özeti ve yönetim alanların aşağıda.</p>
      </header>

      <style>{`@keyframes bmMarquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }`}</style>

      {/* Giriş paneli (canlı showcase) — piyasa, portföy, canlı istatistikler */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-base shadow-card lg:block">
        <Showcase />
      </div>

      {/* Canlı aksiyon akışı — kayan yazı */}
      {feed.length > 0 && (
        <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-panel px-3 py-2">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-good/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-good">
            <Radio size={12} className="animate-pulse" /> Canlı
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="flex w-max gap-8 whitespace-nowrap" style={{ animation: "bmMarquee 45s linear infinite" }}>
              {[...feed, ...feed].map((e, i) => (
                <span key={e.id + "-" + i} className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1 w-1 rounded-full bg-neon-blue" />
                  <span className="font-semibold text-ink">{e.actor}</span>
                  <span>{e.action}</span>
                  {e.target && <span className="text-faint">· {e.target}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI — tıklanabilir */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {KPIS.map((k) => (
          <button key={k.label} onClick={() => onNavigate(k.view)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40">
            <p className="text-3xl font-bold" style={{ color: k.accent }}>{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.label}</p>
          </button>
        ))}
      </div>

      {/* Yönetim Alanları */}
      {YONETIM_ALANLARI.length > 0 && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Yönetim Alanları</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {YONETIM_ALANLARI.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.title} onClick={() => onNavigate(t.view)} className="group relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-line bg-panel/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:shadow-glow-blue">
                <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition group-hover:opacity-20" style={{ background: t.accent }} />
                <span className="grid h-12 w-12 place-items-center rounded-2xl border" style={{ borderColor: `${t.accent}55`, background: `${t.accent}1a`, color: t.accent }}><Icon size={22} /></span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-ink">{t.title}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted">{t.desc}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neon-blue opacity-0 transition group-hover:opacity-100">Aç <ChevronRight size={13} /></span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* Hızlı Erişim */}
      {HIZLI.some((h) => allowed.has(h.ws)) && (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Hızlı Erişim</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HIZLI.filter((h) => allowed.has(h.ws)).map((h) => {
            const Icon = h.icon;
            return (
              <button key={h.label} onClick={() => onNavigate(h.view)} className="flex items-center gap-3 rounded-xl border border-line bg-panel/60 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-blue/10 text-neon-blue"><Icon size={17} /></span>
                <span className="text-sm font-semibold text-ink">{h.label}</span>
              </button>
            );
          })}
        </div>
      </section>
      )}
    </div>
  );
}
