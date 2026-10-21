import { useMemo } from "react";
import { BarChart3, Briefcase, CheckCircle2, Layers, Target, TrendingUp, Users, Wallet } from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { currency, fmtNum, fmtTL } from "@/lib/format";
import { hedefKarRows } from "@/lib/projectFinance";
import {
  PRIORITY_META,
  STATUS_META,
  TYPE_LABELS,
  type Priority,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/types/projects";

const STATUS_COLOR: Record<ProjectStatus, string> = {
  taslak: "#9699a6", baslamadi: "#9699a6", devam: "#10b981", askida: "#f59e0b", tamamlandi: "#3b82f6", iptal: "#ef4444",
};
const PRIORITY_COLOR: Record<Priority, string> = { dusuk: "#9699a6", orta: "#3b82f6", yuksek: "#f59e0b", kritik: "#ef4444" };
const TYPE_COLOR: Record<ProjectType, string> = { arge: "#3987e5", pazarlama: "#9085e9", musteri: "#199e70", ic: "#c98500" };

const progressOf = (p: Project) =>
  p.tasks.length ? Math.round(p.tasks.reduce((s, t) => s + t.progress, 0) / p.tasks.length)
  : p.status === "tamamlandi" ? 100 : p.status === "devam" ? 50 : 0;

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="card card-sheen relative overflow-hidden p-4">
      <span className="absolute inset-y-0 left-0 w-1 opacity-70" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
      <p className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</p>
      <p className="mt-1.5 text-2xl font-bold text-ink nums tabular-nums">{value}</p>
    </div>
  );
}

export default function ProjectsBI({ onOpen }: { onOpen: (id: string) => void }) {
  const { projects } = useProjects();
  const { modules } = useModules();

  // Hedef & bütçe T-0043'ten, gerçekleşen Satış Tablosu'ndan (T-0036) — dönem bazlı
  const hk = useMemo(() => {
    const { rows, totals, kalan } = hedefKarRows(modules);
    const max = Math.max(1, ...rows.flatMap((r) => [r.hedef, r.butce, r.gerceklesen]));
    return { rows, hedef: totals.hedef, butce: totals.butce, gerc: totals.gerceklesen, kalan, max };
  }, [modules]);

  const { users } = useUsers();
  // Cari tür + bölge (il) dağılımı + hak sahibi/ortaklık beklentileri
  const ext = useMemo(() => {
    const aktif = users.filter((u) => u.active);
    const turMap = new Map<string, number>();
    aktif.forEach((u) => { const t = u.userType || "—"; turMap.set(t, (turMap.get(t) ?? 0) + 1); });
    const adrRecs = (modules.find((m) => m.id === "mod-T-0003")?.records ?? []) as Array<Record<string, unknown>>;
    const ilMap = new Map<string, number>();
    adrRecs.forEach((r) => { const il = String(r.il || "").trim(); if (il) ilMap.set(il, (ilMap.get(il) ?? 0) + 1); });
    const haklar = projects.flatMap((p) => p.hakSahipleri ?? []);
    const ortMap = new Map<string, number>();
    haklar.forEach((h) => { const o = h.ortaklikTipi || "—"; ortMap.set(o, (ortMap.get(o) ?? 0) + 1); });
    const satisHedef = haklar.reduce((a, h) => a + (h.satisHedefi || 0), 0);
    const karHedef = haklar.reduce((a, h) => a + (h.karHedefi || 0), 0);
    const ortakToplam = haklar.reduce((a, h) => a + (h.ortakSayisi || 0), 0);
    const tur = [...turMap.entries()].sort((a, b) => b[1] - a[1]);
    const il = [...ilMap.entries()].sort((a, b) => b[1] - a[1]);
    const ort = [...ortMap.entries()].sort((a, b) => b[1] - a[1]);
    return { tur, il, ort, satisHedef, karHedef, ortakToplam, hakSayisi: haklar.length,
      maxTur: Math.max(1, ...turMap.values()), maxIl: Math.max(1, ...ilMap.values()), maxOrt: Math.max(1, ...ortMap.values()) };
  }, [users, modules, projects]);

  const s = useMemo(() => {
    const total = projects.length;
    const aktif = projects.filter((p) => p.status === "devam").length;
    const tamam = projects.filter((p) => p.status === "tamamlandi").length;
    const totalBudget = projects.reduce((a, p) => a + (p.currency === "TRY" ? p.budget : 0), 0);
    const team = new Set(projects.flatMap((p) => p.team.map((m) => m.name))).size;
    const avgProg = total ? Math.round(projects.reduce((a, p) => a + progressOf(p), 0) / total) : 0;
    const kritik = projects.filter((p) => p.priority === "kritik").length;
    const byStatus = (Object.keys(STATUS_META) as ProjectStatus[]).map((k) => ({ k, n: projects.filter((p) => p.status === k).length })).filter((x) => x.n > 0);
    const byType = (Object.keys(TYPE_LABELS) as ProjectType[]).map((k) => ({ k, n: projects.filter((p) => p.type === k).length })).filter((x) => x.n > 0);
    const byPriority = (Object.keys(PRIORITY_META) as Priority[]).map((k) => ({ k, n: projects.filter((p) => p.priority === k).length })).filter((x) => x.n > 0);
    const maxBudget = Math.max(1, ...projects.map((p) => p.budget));
    return { total, aktif, tamam, totalBudget, team, avgProg, kritik, byStatus, byType, byPriority, maxBudget };
  }, [projects]);

  // Sola kayan bant öğeleri (projelerden)
  const band = [
    `${s.total} Proje`, `${s.aktif} Aktif`, `${s.tamam} Tamamlandı`,
    `Toplam Bütçe ${currency(s.totalBudget)}`, `${s.team} Ekip Üyesi`,
    `Ort. İlerleme %${s.avgProg}`, `${s.kritik} Kritik Öncelik`,
    ...projects.map((p) => `${p.code} · %${progressOf(p)}`),
  ];
  const bandLoop = [...band, ...band];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 size={20} className="text-neon-blue" /> İş Zekası — Proje Panosu</h2>
        <p className="mt-1 text-sm text-muted">Tüm projelerden canlı metrikler ve dağılımlar.</p>
      </header>

      {/* Sola kayan yatay bant */}
      <div className="group relative overflow-hidden rounded-xl border border-line bg-white/[0.02] py-2.5">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-base to-transparent" />
        <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-base to-transparent" />
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {bandLoop.map((txt, i) => (
            <span key={i} className="mx-5 inline-flex items-center gap-2 whitespace-nowrap text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-blue" />
              <span className="text-ink">{txt}</span>
            </span>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Tile icon={<Layers size={13} />} label="Toplam Proje" value={String(s.total)} accent="#3b82f6" />
        <Tile icon={<TrendingUp size={13} />} label="Aktif" value={String(s.aktif)} accent="#10b981" />
        <Tile icon={<CheckCircle2 size={13} />} label="Tamamlanan" value={String(s.tamam)} accent="#3987e5" />
        <Tile icon={<Wallet size={13} />} label="Toplam Bütçe" value={currency(s.totalBudget)} accent="#8b5cf6" />
        <Tile icon={<Users size={13} />} label="Ekip Üyesi" value={String(s.team)} accent="#f59e0b" />
        <Tile icon={<Briefcase size={13} />} label="Ort. İlerleme" value={`%${s.avgProg}`} accent="#199e70" />
      </div>

      {/* Hedef · Bütçe · Gerçekleşen (dönem bazlı) — T-0043 */}
      {hk.rows.length > 0 && (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
              <Target size={15} className="text-neon-emerald" /> Hedef · Bütçe · Gerçekleşen
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-emeraldGlow" /> Hedeflenen Kar</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon-blue" /> Bütçe</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Gerçekleşen</span>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-xl border border-neon-emerald/25 bg-neon-emerald/5 p-3">
              <p className="text-xs text-muted">Hedeflenen Kar</p>
              <p className="mt-1 text-xl font-bold text-neon-emeraldGlow nums">{fmtNum(hk.hedef)} TL</p>
            </div>
            <div className="rounded-xl border border-neon-blue/25 bg-neon-blue/5 p-3">
              <p className="text-xs text-muted">Bütçe Hedefi</p>
              <p className="mt-1 text-xl font-bold text-neon-blue nums">{fmtNum(hk.butce)} TL</p>
            </div>
            <div className="rounded-xl border border-line/60 bg-white/[0.02] p-3">
              <p className="text-xs text-muted">Gerçekleşen (Satış)</p>
              <p className="mt-1 text-xl font-bold text-ink nums">{fmtNum(hk.gerc)} TL</p>
            </div>
            <div className={`rounded-xl border p-3 ${hk.kalan >= 0 ? "border-good/25 bg-good/5" : "border-critical/30 bg-critical/10"}`}>
              <p className="text-xs text-muted">{hk.kalan >= 0 ? "Kalan Bütçe" : "Bütçe Aşımı"}</p>
              <p className={`mt-1 text-xl font-bold nums ${hk.kalan >= 0 ? "text-good" : "text-critical"}`}>{fmtNum(Math.abs(hk.kalan))} TL</p>
            </div>
          </div>

          <div className="space-y-4">
            {hk.rows.map((r) => (
              <div key={r.donem}>
                <p className="mb-1.5 text-xs font-medium text-ink">{r.donem}</p>
                <div className="space-y-1.5">
                  {([
                    ["Hedeflenen Kar", r.hedef, "bg-neon-emeraldGlow"],
                    ["Bütçe", r.butce, "bg-neon-blue"],
                    ["Gerçekleşen", r.gerceklesen, "bg-muted"],
                  ] as [string, number, string][]).map(([lbl, val, cls]) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-[11px] text-muted">{lbl}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className={`h-full rounded-full ${cls}`} style={{ width: `${(val / hk.max) * 100}%` }} />
                      </div>
                      <span className="w-32 shrink-0 text-right text-[11px] text-ink nums">{fmtNum(val)} TL</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Durum dağılımı */}
        <section className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Durum Dağılımı</h3>
          <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
            {s.byStatus.map(({ k, n }) => (
              <div key={k} style={{ width: `${(n / s.total) * 100}%`, backgroundColor: STATUS_COLOR[k] }} title={`${STATUS_META[k].label}: ${n}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {s.byStatus.map(({ k, n }) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[k] }} />
                {STATUS_META[k].label} <span className="text-ink nums">{n}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Öncelik dağılımı */}
        <section className="card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Öncelik Dağılımı</h3>
          <div className="space-y-2">
            {s.byPriority.map(({ k, n }) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">{PRIORITY_META[k].label}</span>
                  <span className="text-ink nums">{n}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(n / s.total) * 100}%`, backgroundColor: PRIORITY_COLOR[k] }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tür dağılımı */}
        <section className="card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Proje Türü Dağılımı</h3>
          <div className="space-y-2">
            {s.byType.map(({ k, n }) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">{TYPE_LABELS[k]}</span>
                  <span className="text-ink nums">{n}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(n / s.total) * 100}%`, backgroundColor: TYPE_COLOR[k] }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bütçe / proje */}
        <section className="card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Bütçe / Proje</h3>
          <div className="space-y-2.5">
            {projects.map((p) => (
              <button key={p.id} onClick={() => onOpen(p.id)} className="group block w-full text-left">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-ink group-hover:text-neon-blue">{p.name}</span>
                  <span className="shrink-0 text-muted nums">{fmtTL(p.budget)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-violet" style={{ width: `${(p.budget / s.maxBudget) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Proje ilerleme listesi */}
      <section className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Projeler — İlerleme</h3>
        <div className="space-y-3">
          {projects.map((p) => {
            const prog = progressOf(p);
            return (
              <button key={p.id} onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted nums">{p.code}</span>
                    <span className="truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className={`chip ${STATUS_META[p.status].className}`}>{STATUS_META[p.status].label}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${prog}%`, backgroundColor: STATUS_COLOR[p.status] }} />
                  </div>
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink nums">%{prog}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Cari Tür & Bölge (İl) dağılımı */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><Users size={15} /> Cari Tür Dağılımı <span className="text-faint">(T-0001 · T-0002)</span></h3>
          <div className="space-y-2">
            {ext.tur.map(([t, n]) => (
              <div key={t}>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted">{t}</span><span className="text-ink nums">{n}</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-neon-violet to-neon-blue" style={{ width: `${(n / ext.maxTur) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><BarChart3 size={15} /> Bölge (İl) Dağılımı <span className="text-faint">(T-0003 adresler)</span></h3>
          {ext.il.length === 0 ? <p className="text-sm text-muted">Adres kaydı yok.</p> : (
            <div className="space-y-2">
              {ext.il.map(([il, n]) => (
                <div key={il}>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted">{il}</span><span className="text-ink nums">{n}</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-neon-emerald to-neon-emeraldGlow" style={{ width: `${(n / ext.maxIl) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hak Sahibi & Ortaklık Beklentileri */}
      <section className="card p-5">
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted"><Target size={15} className="text-neon-emerald" /> Hak Sahibi & Ortaklık Beklentileri <span className="text-faint">(T-0049)</span></h3>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl border border-neon-emerald/25 bg-neon-emerald/5 p-3"><p className="text-xs text-muted">Toplam Satış Hedefi</p><p className="mt-1 text-xl font-bold text-neon-emeraldGlow nums">{fmtNum(ext.satisHedef)} TL</p></div>
          <div className="rounded-xl border border-neon-blue/25 bg-neon-blue/5 p-3"><p className="text-xs text-muted">Toplam Kâr Hedefi</p><p className="mt-1 text-xl font-bold text-neon-blue nums">{fmtNum(ext.karHedef)} TL</p></div>
          <div className="rounded-xl border border-line/60 bg-white/[0.02] p-3"><p className="text-xs text-muted">Hak Sahibi</p><p className="mt-1 text-xl font-bold text-ink nums">{ext.hakSayisi}</p></div>
          <div className="rounded-xl border border-line/60 bg-white/[0.02] p-3"><p className="text-xs text-muted">Toplam Ortak</p><p className="mt-1 text-xl font-bold text-ink nums">{ext.ortakToplam}</p></div>
        </div>
        <p className="mb-2 text-xs font-medium text-muted">Ortaklık Tipi Dağılımı</p>
        {ext.ort.length === 0 ? <p className="text-sm text-muted">Hak sahibi kaydı yok.</p> : (
          <div className="space-y-2">
            {ext.ort.map(([o, n]) => (
              <div key={o}>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted">{o}</span><span className="text-ink nums">{n}</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-neon-amber to-neon-rose" style={{ width: `${(n / ext.maxOrt) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
