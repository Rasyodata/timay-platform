import { Clock, MapPin, TrendingUp } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { categoryMeta, statusMeta } from "@/data/mockData";
import { currency, deadlineLabel, percent } from "@/lib/format";
import type { Project } from "@/types";

function Avatar({ name, i }: { name: string; i: number }) {
  const palette = ["bg-series-1/80", "bg-series-2/80", "bg-series-3/80", "bg-series-4/80"];
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr");
  return (
    <span
      title={name}
      className={`-ml-2 grid h-7 w-7 place-items-center rounded-full border border-panel text-[10px] font-semibold text-white first:ml-0 ${palette[i % palette.length]}`}
    >
      {initials}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: Project["status"] }) {
  const tone =
    status === "tamamlandi"
      ? "from-muted to-muted"
      : status === "fon-topluyor"
        ? "from-neon-blue to-neon-violet"
        : "from-neon-emerald to-neon-emeraldGlow";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tone} transition-[width] duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { openProject } = useDashboard();
  const cat = categoryMeta[project.category];
  const st = statusMeta[project.status];
  const fundRatio = Math.round((project.raised / project.target) * 100);

  return (
    <button
      onClick={() => openProject(project.id)}
      className="card group relative flex flex-col gap-4 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-blue/40 hover:shadow-glow-blue"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${cat.dot}`} />
            <h4 className="truncate font-semibold text-ink">{project.name}</h4>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <MapPin size={12} /> {project.location}
          </p>
        </div>
        <span className={`chip shrink-0 ${st.className}`}>{st.label}</span>
      </div>

      {/* progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted">İlerleme</span>
          <span className="font-semibold text-ink nums">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} status={project.status} />
      </div>

      {/* funding + roi + deadline */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-muted">Fon</p>
          <p className="mt-0.5 font-semibold text-ink nums">
            {currency(project.raised)}
          </p>
          <p className="text-[10px] text-faint nums">/ {currency(project.target)} · %{fundRatio}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="flex items-center gap-1 text-muted">
            <TrendingUp size={11} /> Getiri
          </p>
          <p className="mt-0.5 font-semibold text-good nums">{percent(project.roi)}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="flex items-center gap-1 text-muted">
            <Clock size={11} /> Kalan
          </p>
          <p className="mt-0.5 font-semibold text-ink nums">
            {deadlineLabel(project.deadline)}
          </p>
        </div>
      </div>

      {/* partners */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {project.partners.map((p, i) => (
            <Avatar key={p.id} name={p.name} i={i} />
          ))}
        </div>
        <span className="text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
          Detaylar →
        </span>
      </div>
    </button>
  );
}

export default function ProjectPipeline() {
  const { filteredProjects } = useDashboard();

  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Canlı Proje Takip Akışı</h3>
          <p className="text-xs text-muted">Proje, yatırım ve startup'lar · ilerleme & fon durumu</p>
        </div>
        <span className="chip border-good/30 bg-good/10 text-good">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-good" />
          Canlı
        </span>
      </header>

      {filteredProjects.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-sm text-muted">
          Seçilen filtreye uygun proje bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
