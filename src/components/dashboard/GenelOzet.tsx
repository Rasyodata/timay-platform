import { useMemo } from "react";
import { Briefcase, Users, Handshake, Target, TrendingUp, Wallet } from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { hedefKarRows } from "@/lib/projectFinance";
import { fmtNum } from "@/lib/format";
import { STATUS_META, type ProjectStatus } from "@/types/projects";

const INCOME = ["Tahsilat", "Satış"];
const EXPENSE = ["Ödeme", "Alış", "Satın Alma"];

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="card relative overflow-hidden p-4">
      <span className="absolute inset-y-0 left-0 w-1 opacity-70" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
      <p className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</p>
      <p className="mt-1.5 text-2xl font-bold text-ink nums tabular-nums">{value}</p>
    </div>
  );
}

export default function GenelOzet() {
  const { projects } = useProjects();
  const { users } = useUsers();
  const { modules } = useModules();

  const s = useMemo(() => {
    const aktifCari = users.filter((u) => u.active);
    const cariTur = new Map<string, number>();
    aktifCari.forEach((u) => { const t = u.userType || "—"; cariTur.set(t, (cariTur.get(t) ?? 0) + 1); });
    const hakSahibi = projects.reduce((a, p) => a + (p.hakSahipleri?.length ?? 0), 0);
    const hk = hedefKarRows(modules);
    const ledger = (modules.find((m) => m.id === "mod-T-0046")?.records ?? []) as Array<Record<string, unknown>>;
    let giren = 0, cikan = 0;
    ledger.forEach((r) => { const t = Number(r.tutar) || 0; if (INCOME.includes(String(r.hareket_tipi))) giren += t; else if (EXPENSE.includes(String(r.hareket_tipi))) cikan += t; });
    const byStatus = (Object.keys(STATUS_META) as ProjectStatus[]).map((k) => ({ k, n: projects.filter((p) => p.status === k).length })).filter((x) => x.n > 0);
    return {
      toplamProje: projects.length, aktifCari: aktifCari.length,
      cariTur: [...cariTur.entries()].sort((a, b) => b[1] - a[1]),
      hakSahibi, hedef: hk.totals.hedef, gerceklesen: hk.totals.gerceklesen,
      kasa: giren - cikan, byStatus, maxCari: Math.max(1, ...[...cariTur.values()]),
    };
  }, [projects, users, modules]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Genel Özet <span className="text-xs font-normal text-faint">· canlı veriler</span></h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Tile icon={<Briefcase size={13} />} label="Toplam Proje" value={String(s.toplamProje)} accent="#3b82f6" />
        <Tile icon={<Users size={13} />} label="Aktif Cari/Kullanıcı" value={String(s.aktifCari)} accent="#8b5cf6" />
        <Tile icon={<Handshake size={13} />} label="Hak Sahibi" value={String(s.hakSahibi)} accent="#10b981" />
        <Tile icon={<Target size={13} />} label="Hedeflenen Kâr" value={`${fmtNum(s.hedef)} TL`} accent="#34d399" />
        <Tile icon={<TrendingUp size={13} />} label="Gerçekleşen (Satış)" value={`${fmtNum(s.gerceklesen)} TL`} accent="#f59e0b" />
        <Tile icon={<Wallet size={13} />} label="Proje Kasa Bakiyesi" value={`${fmtNum(s.kasa)} TL`} accent={s.kasa >= 0 ? "#199e70" : "#ef4444"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cari tür dağılımı */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Cari Tür Dağılımı <span className="text-faint">(T-0001 · T-0002)</span></h3>
          <div className="space-y-2">
            {s.cariTur.map(([tur, n]) => (
              <div key={tur}>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted">{tur}</span><span className="text-ink nums">{n}</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-blue" style={{ width: `${(n / s.maxCari) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Proje durum dağılımı */}
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Proje Durumları</h3>
          {s.byStatus.length === 0 ? <p className="text-sm text-muted">Proje yok.</p> : (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {s.byStatus.map(({ k, n }) => (
                <span key={k} className="flex items-center gap-1.5 text-sm">
                  <span className={`chip ${STATUS_META[k].className}`}>{STATUS_META[k].label}</span>
                  <span className="text-ink nums">{n}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
