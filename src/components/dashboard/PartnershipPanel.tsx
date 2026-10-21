import {
  Activity,
  FileText,
  TrendingUp,
  UserPlus,
  Wallet,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/types";

const kindMeta: Record<ActivityItem["kind"], { icon: LucideIcon; tone: string }> = {
  fon: { icon: Wallet, tone: "text-neon-emerald bg-neon-emerald/10" },
  ortak: { icon: UserPlus, tone: "text-neon-violet bg-neon-violet/10" },
  belge: { icon: FileText, tone: "text-neon-blue bg-neon-blue/10" },
  durum: { icon: Workflow, tone: "text-neon-amber bg-neon-amber/10" },
  getiri: { icon: TrendingUp, tone: "text-good bg-good/10" },
};

export default function PartnershipPanel() {
  const { projects, activity } = useDashboard();

  // Aggregate unique partners and their active project count.
  const partnerMap = new Map<string, { name: string; role: string; projects: number; share: number }>();
  for (const p of projects) {
    for (const partner of p.partners) {
      const cur = partnerMap.get(partner.name);
      if (cur) {
        cur.projects += 1;
        cur.share = Math.max(cur.share, partner.share);
      } else {
        partnerMap.set(partner.name, {
          name: partner.name,
          role: partner.role,
          projects: 1,
          share: partner.share,
        });
      }
    }
  }
  const partners = [...partnerMap.values()].sort((a, b) => b.projects - a.projects).slice(0, 5);

  return (
    <section className="card flex flex-col p-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Ortaklık & İş Birliği</h3>
          <p className="text-xs text-muted">Ortaklar ve anlık aktivite akışı</p>
        </div>
        <Activity size={16} className="text-neon-violet" />
      </header>

      {/* Partners */}
      <ul className="mb-4 space-y-2">
        {partners.map((p, i) => {
          const palette = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4", "bg-neon-violet"];
          return (
            <li
              key={p.name}
              className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${palette[i % palette.length]}`}
              >
                {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <p className="truncate text-xs text-muted">{p.role}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-ink nums">{p.projects}</p>
                <p className="text-[10px] text-muted">proje</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Activity log */}
      <div className="mt-auto">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Aktivite Akışı
        </p>
        <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-1 before:h-[calc(100%-1rem)] before:w-px before:bg-line">
          {activity.slice(0, 6).map((a) => {
            const m = kindMeta[a.kind];
            const Icon = m.icon;
            return (
              <li key={a.id} className="relative flex gap-3 animate-fade-in">
                <span className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.tone}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm leading-snug text-ink">
                    <span className="font-medium">{a.actor}</span>{" "}
                    <span className="text-muted">{a.action}</span>
                  </p>
                  <p className="text-[11px] text-faint">
                    {a.project ? <span className="text-muted">{a.project} · </span> : null}
                    {timeAgo(a.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
