import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  activity as seedActivity,
  metrics as seedMetrics,
  performance,
  projects as seedProjects,
} from "@/data/mockData";
import type { ActivityItem, Category, Metric, Project } from "@/types";

type CategoryFilter = Category | "all";

export interface Toast {
  id: string;
  message: string;
  tone: "success" | "info" | "warning";
}

interface DashboardState {
  // Data
  metrics: Metric[];
  projects: Project[];
  filteredProjects: Project[];
  activity: ActivityItem[];
  performance: typeof performance;

  // Filter / segmentation
  filter: CategoryFilter;
  setFilter: (f: CategoryFilter) => void;
  query: string;
  setQuery: (q: string) => void;

  // Detail drawer
  selected: Project | null;
  openProject: (id: string) => void;
  closeProject: () => void;

  // Actions
  joinProject: (id: string, amount?: number) => void;
  requestReport: (id: string) => void;

  // Toasts
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  // Live simulation
  live: boolean;
  toggleLive: () => void;
  lastTick: number;
}

const Ctx = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>(seedMetrics);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [activity, setActivity] = useState<ActivityItem[]>(seedActivity);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [lastTick, setLastTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Live data simulation ────────────────────────────────────────────────
  // Nudges metric values, sparklines and funding progress on an interval so
  // the dashboard feels like a real-time feed. Toggle off with the Navbar pill.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => {
          const jitter = (Math.random() - 0.45) * 0.006;
          const nextVal = Math.max(0, m.value * (1 + jitter));
          const last = m.spark[m.spark.length - 1]?.v ?? 100;
          const spark = [
            ...m.spark.slice(1),
            { i: (m.spark[m.spark.length - 1]?.i ?? 0) + 1, v: Math.max(1, Math.round(last * (1 + jitter * 2))) },
          ];
          return { ...m, value: nextVal, delta: m.delta + jitter, spark };
        }),
      );
      let funded: Project | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.status === "tamamlandi") return p;
          const bump = Math.random() < 0.3 ? Math.random() * 400_000 : 0;
          const raised = Math.min(p.target, p.raised + bump);
          const progress = p.status === "fon-topluyor"
            ? Math.round((raised / p.target) * 100)
            : Math.min(100, p.progress + (Math.random() < 0.15 ? 1 : 0));
          if (bump > 250_000 && !funded) funded = { ...p, raised, progress };
          return { ...p, raised, progress };
        }),
      );
      // Occasionally surface a live funding event at the top of the feed.
      if (funded) {
        const f = funded as Project;
        setActivity((prev) => [
          {
            id: `live-${Date.now()}`,
            actor: f.partners[0]?.name ?? "Yatırımcı",
            action: "yeni fon katkısı işledi",
            project: f.name,
            at: new Date().toISOString(),
            kind: "fon" as const,
          },
          ...prev,
        ].slice(0, 14));
      }
      setLastTick((t) => t + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [live]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return projects.filter((p) => {
      const byCat = filter === "all" || p.category === filter;
      const byQuery =
        !q ||
        p.name.toLocaleLowerCase("tr").includes(q) ||
        p.location.toLocaleLowerCase("tr").includes(q);
      return byCat && byQuery;
    });
  }, [projects, filter, query]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId],
  );

  const openProject = useCallback((id: string) => setSelectedId(id), []);
  const closeProject = useCallback(() => setSelectedId(null), []);
  const toggleLive = useCallback(() => setLive((v) => !v), []);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const dismissToast = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = `t-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  // ── Project actions ─────────────────────────────────────────────────────────
  // Commits a participation tranche: raises the fund, logs an activity entry
  // and confirms via toast. Keeps the prototype's interactions end-to-end.
  const joinProject = useCallback(
    (id: string, amount = 5_000_000) => {
      let joined: Project | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const raised = Math.min(p.target, p.raised + amount);
          const progress =
            p.status === "fon-topluyor"
              ? Math.round((raised / p.target) * 100)
              : p.progress;
          joined = { ...p, raised, progress };
          return joined;
        }),
      );
      if (joined) {
        const j = joined as Project;
        setActivity((prev) =>
          [
            {
              id: `join-${Date.now()}`,
              actor: "Şevket Kaan",
              action: `${new Intl.NumberFormat("tr-TR").format(amount)} ₺ katılım taahhüdü ekledi`,
              project: j.name,
              at: new Date().toISOString(),
              kind: "fon" as const,
            },
            ...prev,
          ].slice(0, 14),
        );
        notify(`“${j.name}” projesine katılım talebin alındı.`, "success");
      }
    },
    [notify],
  );

  const requestReport = useCallback(
    (id: string) => {
      const p = projects.find((x) => x.id === id);
      notify(`“${p?.name ?? "Proje"}” için rapor oluşturuluyor…`, "info");
    },
    [projects, notify],
  );

  const value: DashboardState = {
    metrics,
    projects,
    filteredProjects,
    activity,
    performance,
    filter,
    setFilter,
    query,
    setQuery,
    selected,
    openProject,
    closeProject,
    joinProject,
    requestReport,
    toasts,
    notify,
    dismissToast,
    live,
    toggleLive,
    lastTick,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within <DashboardProvider>");
  return ctx;
}
