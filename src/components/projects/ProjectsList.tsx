import { CalendarDays, FolderPlus, ShieldCheck, Users } from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { allowedProjectCodes } from "@/lib/projectAccess";
import { PRIORITY_META, STATUS_META, TYPE_LABELS, type Project } from "@/types/projects";

function budgetText(p: Project) {
  const sym = p.currency === "TRY" ? "₺" : p.currency === "USD" ? "$" : "€";
  return `${sym}${new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(p.budget)}`;
}

function Avatar({ name, i }: { name: string; i: number }) {
  const palette = ["bg-series-1/80", "bg-series-2/80", "bg-series-3/80", "bg-series-4/80"];
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr");
  return (
    <span className={`-ml-2 grid h-7 w-7 place-items-center rounded-full border border-panel text-[10px] font-semibold text-white first:ml-0 ${palette[i % palette.length]}`} title={name}>
      {initials}
    </span>
  );
}

export default function ProjectsList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const { projects } = useProjects();
  const { can, currentUser } = useUsers();
  const { modules } = useModules();

  // Yetki Kartlarına (T-0030) göre act-as kullanıcının görebileceği projeler.
  const allowed = allowedProjectCodes(currentUser, modules);
  const visible = allowed === "ALL" ? projects : projects.filter((p) => allowed.has(p.code));
  const restricted = allowed !== "ALL";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Projeler</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {visible.length} proje
            {restricted
              ? <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-warning"><ShieldCheck size={12} /> Yetki kartına göre kısıtlı — {currentUser.name} yalnız yetkili olduğu projeleri görüyor</span>
              : <span className="text-faint">· yönetici her projenin detayına girebilir</span>}
          </p>
        </div>
        {can("proje_olustur") && (
          <button onClick={onNew} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-blue transition hover:opacity-90">
            <FolderPlus size={16} /> Yeni Proje
          </button>
        )}
      </header>

      {visible.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-16 text-sm text-muted">
          {restricted ? "Bu kullanıcı için yetkili proje yok (Yetki Kartı tanımlı değil)." : "Henüz proje yok. \"Yeni Proje\" ile başlayın."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="card group flex flex-col gap-3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-blue/40 hover:shadow-glow-blue"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted nums">{p.code}</p>
                  <h4 className="truncate font-semibold text-ink">{p.name}</h4>
                </div>
                <span className={`chip shrink-0 ${STATUS_META[p.status].className}`}>{STATUS_META[p.status].label}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="chip border-line text-muted">{TYPE_LABELS[p.type]}</span>
                <span className={`chip ${PRIORITY_META[p.priority].className}`}>{PRIORITY_META[p.priority].label}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] p-2">
                  <p className="flex items-center gap-1 text-muted"><CalendarDays size={11} /> Süre</p>
                  <p className="mt-0.5 text-ink nums">{p.startDate} → {p.endDate}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2">
                  <p className="text-muted">Bütçe</p>
                  <p className="mt-0.5 font-semibold text-ink nums">
                    {p.budgetVisibility === "ONLY_MANAGERS" ? `${budgetText(p)} 🔒` : budgetText(p)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {p.team.slice(0, 4).map((m, i) => <Avatar key={m.id} name={m.name} i={i} />)}
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted"><Users size={12} /> {p.team.length} üye</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
