import { useEffect, useRef, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import {
  PRIORITY_META,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  type Priority,
  type Project,
  type Task,
  type TaskStatus,
} from "@/types/projects";

function OwnerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr") || "–";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-neon-blue to-neon-violet text-[10px] font-semibold text-white">
        {initials}
      </span>
      <span className="text-sm text-ink">{name || "—"}</span>
    </span>
  );
}

/** monday "battery" — durum dağılımını tek çubukta gösterir. */
function StatusBattery({ project }: { project: Project }) {
  const total = project.tasks.length || 1;
  const counts = TASK_STATUS_ORDER.map((s) => ({
    status: s,
    n: project.tasks.filter((t) => t.status === s).length,
  }));
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        {counts.map(({ status, n }) =>
          n > 0 ? (
            <div
              key={status}
              style={{ width: `${(n / total) * 100}%`, backgroundColor: TASK_STATUS_META[status].color }}
              className="h-full"
              title={`${TASK_STATUS_META[status].label}: ${n}`}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {counts.map(({ status, n }) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TASK_STATUS_META[status].color }} />
            {TASK_STATUS_META[status].label} <span className="text-ink nums">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const inputCls =
  "rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

// Serbest bağımlılık seçici — bir görevin bağımlı olduğu görevleri çoklu seçer.
function DependencyCell({ task, tasks, disabled, onChange }: { task: Task; tasks: Task[]; disabled: boolean; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const deps = task.dependsOn ?? [];
  const others = tasks.filter((t) => t.id !== task.id);
  const toggle = (id: string) => onChange(deps.includes(id) ? deps.filter((x) => x !== id) : [...deps, id]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`chip ${deps.length ? "border-neon-violet/40 bg-neon-violet/10 text-neon-violet" : "border-line text-muted"} ${disabled ? "cursor-default" : "hover:bg-elevated"}`}
      >
        <Link2 size={12} /> {deps.length ? `${deps.length} görev` : "Yok"}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-56 w-60 overflow-y-auto rounded-xl border border-line bg-panel p-1.5 shadow-card">
          {others.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted">Başka görev yok</p>
          ) : (
            others.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink transition hover:bg-elevated">
                <input type="checkbox" className="accent-neon-blue" checked={deps.includes(t.id)} onChange={() => toggle(t.id)} />
                <span className="truncate">{t.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskBoard({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const { addTask, updateTask, deleteTask } = useProjects();
  const [newName, setNewName] = useState("");

  const add = () => {
    if (!newName.trim()) return;
    addTask(project.id, {
      name: newName.trim(),
      owner: project.team[0]?.name ?? "—",
      status: "yapilacak",
      priority: "orta",
      start: project.startDate,
      end: project.endDate,
      progress: 0,
    });
    setNewName("");
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">Görev Tablosu</h3>
          <p className="text-xs text-muted"><span className="text-faint nums">GRV-GOREV</span> · monday.com tarzı board · durum · sahip · zaman · ilerleme</p>
        </div>
        <span className="chip border-line text-muted nums">{project.tasks.length} görev</span>
      </div>

      <div className="mb-5 rounded-xl border border-line/60 bg-white/[0.02] p-4">
        <StatusBattery project={project} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Görev</th>
              <th className="px-3 py-2 font-medium text-muted">Sahip</th>
              <th className="px-3 py-2 font-medium text-muted">Durum</th>
              <th className="px-3 py-2 font-medium text-muted">Öncelik</th>
              <th className="px-3 py-2 font-medium text-muted">Zaman</th>
              <th className="px-3 py-2 font-medium text-muted">İlerleme</th>
              <th className="px-3 py-2 font-medium text-muted">Bağımlılık</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {project.tasks.map((t) => (
              <tr key={t.id} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 font-medium text-ink">{t.name}</td>
                <td className="px-3 py-2.5"><OwnerAvatar name={t.owner} /></td>
                <td className="px-3 py-2.5">
                  {/* monday imzası: dolu renkli durum hücresi */}
                  <select
                    value={t.status}
                    disabled={!canEdit}
                    onChange={(e) => updateTask(project.id, t.id, { status: e.target.value as TaskStatus })}
                    style={{ backgroundColor: TASK_STATUS_META[t.status].color }}
                    className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold text-white outline-none disabled:cursor-default"
                  >
                    {TASK_STATUS_ORDER.map((s) => (
                      <option key={s} value={s} className="bg-panel text-ink">
                        {TASK_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={t.priority}
                    disabled={!canEdit}
                    onChange={(e) => updateTask(project.id, t.id, { priority: e.target.value as Priority })}
                    className={`chip bg-transparent ${PRIORITY_META[t.priority].className}`}
                  >
                    {Object.entries(PRIORITY_META).map(([k, v]) => (
                      <option key={k} value={k} className="bg-panel text-ink">{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted nums">{t.start} → {t.end}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-emeraldGlow" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-[11px] text-muted nums">{t.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <DependencyCell task={t} tasks={project.tasks} disabled={!canEdit} onChange={(ids) => updateTask(project.id, t.id, { dependsOn: ids })} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  {canEdit && (
                    <button onClick={() => deleteTask(project.id, t.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Görevi sil">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="mt-4 flex items-center gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="+ Yeni görev ekle…"
          />
          <button onClick={add} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">
            <Plus size={15} /> Ekle
          </button>
        </div>
      )}
    </section>
  );
}
