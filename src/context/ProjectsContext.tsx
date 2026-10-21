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
  defaultAccessForRole,
  MODULE_LABELS,
  TASK_STATUS_META,
  type Project,
  type ProjectModuleKey,
  type Task,
  type TeamMember,
} from "@/types/projects";
import { ACCESS_LABELS, type AccessLevel } from "@/types/modules";
import { useAudit } from "@/context/AuditContext";

const STORAGE_KEY = "timay.projects.v7";

let counter = 500;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export type NewProjectInput = Omit<Project, "id" | "createdAt">;

interface ProjectsState {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  createProject: (input: NewProjectInput) => Project;
  /** Proje künyesini (meta/zaman/bütçe/kategorizasyon) güncelle. */
  updateProject: (projectId: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  /** Ekip üyesinin bir modüldeki erişimini değiştir (yetki matrisi düzenleme). */
  setMemberAccess: (projectId: string, memberId: string, mod: ProjectModuleKey, level: AccessLevel) => void;
  removeMember: (projectId: string, memberId: string) => void;
  // Görev süreç takibi (monday tarzı board)
  addTask: (projectId: string, task: Omit<Task, "id">) => void;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  setReport: (projectId: string, text: string) => void;
}

const Ctx = createContext<ProjectsState | null>(null);

function seed(): Project[] {
  const team = (): TeamMember[] => [
    { id: "t1", name: "Tuğba Yörük", title: "Timay Platform", role: "owner", access: { gorevler: "full", finans: "full", dokumanlar: "full", zaman: "full" } },
    { id: "t2", name: "Halim Bey", title: "Uygulama Üreticisi", role: "manager", access: { gorevler: "full", finans: "read", dokumanlar: "full", zaman: "full" } },
    { id: "t3", name: "Kadir Fırat", title: "Satış ve Pazarlama Yönetimi", role: "manager", access: { gorevler: "full", finans: "read", dokumanlar: "full", zaman: "full" } },
  ];
  return [
    {
      id: "prj-seed-1",
      code: "PRJ-2026-01",
      name: "X Mobil Uygulaması",
      description: "Müşteri için iOS/Android mobil uygulama geliştirme projesi.",
      type: "musteri",
      tags: ["mobil", "pazarlama", "öncelikli"],
      priority: "yuksek",
      status: "devam",
      startDate: "2026-10-07",
      endDate: "2027-03-31",
      effort: 2400,
      budget: 500000,
      currency: "TRY",
      budgetVisibility: "ONLY_MANAGERS",
      stakeholder: "Uygulama Üreticisi — Halim Bey",
      hedefKitle: "25-45 yaş bireysel ve KOBİ kullanıcılar",
      projeyiGetiren: "Kadir Fırat",
      onaylayanlar: ["Tuğba Yörük", "Şevket Kaan"],
      onayTarihi: "2026-10-07",
      gorevliler: ["Halim Bey", "Kadir Fırat", "Ayşe Demir"],
      hakSahipleri: [
        { id: "hs1", hakSahibi: "Tuğba Yörük", satisHedefi: 3000000, karHedefi: 1200000, pazarBeklentisi: "Mobil uygulama pazarında ilk yıl %5 pay hedefi", ortaklikTipi: "Kâr-Zarar Ortaklığı", iletisim: "tugba@timay.co · 0532 000 00 00", ortakSayisi: 3, aciklama: "Ana hak sahibi ve proje sahibi" },
      ],
      modules: ["gorevler", "finans", "dokumanlar", "zaman"],
      tableIds: ["mod-T-0046", "mod-T-0042", "mod-T-0043", "mod-T-0044", "mod-T-0045", "mod-T-0021", "mod-T-0077"],
      team: team(),
      tasks: [
        { id: "tk1", name: "Pazar araştırması ve detayı", owner: "Kadir Fırat", status: "tamamlandi", priority: "yuksek", start: "2026-10-08", end: "2026-10-09", progress: 100 },
        { id: "tk2", name: "Talep toplama (İstanbul · Kozan Bey)", owner: "Kadir Fırat", status: "tamamlandi", priority: "orta", start: "2026-10-11", end: "2026-10-11", progress: 100, dependsOn: ["tk1"] },
        { id: "tk3", name: "Uygulama geliştirme", owner: "Halim Bey", status: "calisiliyor", priority: "kritik", start: "2026-10-07", end: "2027-02-28", progress: 95, dependsOn: ["tk1", "tk2"] },
      ],
      activities: [
        { id: "ac1", date: "2026-10-07", actor: "Tuğba Yörük", description: "Tanışma ve proje hakkında bilgilendirme telekonferansı" },
        { id: "ac2", date: "2026-10-08", actor: "Kadir Fırat", description: "Pazar araştırması ve detayı" },
        { id: "ac3", date: "2026-10-09", actor: "Kadir Fırat", description: "Tuğba Yörük ile pazar araştırması hakkında sözlü brifing" },
        { id: "ac4", date: "2026-10-10", actor: "Kadir Fırat", description: "Proje hakkında bilgi verilmesi — Uğur Mertsöz'e" },
        { id: "ac5", date: "2026-10-11", actor: "Kadir Fırat", description: "Proje hakkında bilgi verilmesi ve talep toplama — Kozan Bey, İstanbul" },
        { id: "ac6", date: "2026-10-12", actor: "Kadir Fırat", description: "Halim Bey – Kadir Fırat telefon görüşmesi: proje ve süreç yönetimi" },
        { id: "ac7", date: "2026-10-14", actor: "Kadir Fırat", description: "Halim Bey WhatsApp mesajı (proje tamamlama oranı %95) ve Kadir Fırat teşekkür mesajı" },
      ],
      report: "Proje, tanıtım ve talep toplama aşamasını tamamladı. Halim Bey tarafından geliştirilen uygulamada tamamlanma oranı %95 seviyesine ulaştı. Pazar araştırması olumlu; İstanbul'da ilk talepler toplandı. Önümüzdeki hafta son testler ve teslim planlanıyor.",
      createdAt: "2026-10-07",
    },
  ];
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Project[];
  } catch {
    /* seed */
  }
  return seed();
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => load());
  const { log } = useAudit();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      /* yok say */
    }
  }, [projects]);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const createProject = useCallback((input: NewProjectInput) => {
    const p: Project = { ...input, id: uid("prj"), createdAt: new Date().toISOString().slice(0, 10) };
    setProjects((prev) => [p, ...prev]);
    log({ category: "proje", action: "Proje oluşturuldu", target: `${p.name} (${p.code})` });
    return p;
  }, [log]);

  const updateProject = useCallback((projectId: string, patch: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...patch } : p)));
    log({ category: "proje", action: "Proje künyesi güncellendi", target: projects.find((p) => p.id === projectId)?.name });
  }, [projects, log]);

  const deleteProject = useCallback((id: string) => {
    const p = projects.find((x) => x.id === id);
    setProjects((prev) => prev.filter((x) => x.id !== id));
    log({ category: "proje", action: "Proje silindi", target: p?.name });
  }, [projects, log]);

  const setMemberAccess = useCallback(
    (projectId: string, memberId: string, mod: ProjectModuleKey, level: AccessLevel) => {
      const member = projects.find((p) => p.id === projectId)?.team.find((m) => m.id === memberId);
      const old = member?.access[mod];
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                team: p.team.map((m) =>
                  m.id === memberId ? { ...m, access: { ...m.access, [mod]: level } } : m,
                ),
              },
        ),
      );
      log({
        category: "yetki",
        action: "Üye erişimi güncellendi",
        target: `${member?.name ?? "Üye"} · ${MODULE_LABELS[mod]}`,
        meta: `${old ? ACCESS_LABELS[old] : "—"} → ${ACCESS_LABELS[level]}`,
      });
    },
    [projects, log],
  );

  const removeMember = useCallback((projectId: string, memberId: string) => {
    const member = projects.find((p) => p.id === projectId)?.team.find((m) => m.id === memberId);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, team: p.team.filter((m) => m.id !== memberId) } : p)),
    );
    log({ category: "yetki", action: "Üye ekipten çıkarıldı", target: member?.name });
  }, [projects, log]);

  const addTask = useCallback((projectId: string, task: Omit<Task, "id">) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, tasks: [...p.tasks, { ...task, id: uid("tk") }] } : p)),
    );
    log({ category: "gorev", action: "Görev eklendi", target: task.name });
  }, [log]);

  const updateTask = useCallback((projectId: string, taskId: string, patch: Partial<Task>) => {
    const task = projects.find((p) => p.id === projectId)?.tasks.find((t) => t.id === taskId);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : p,
      ),
    );
    if (patch.status) {
      log({
        category: "gorev",
        action: "Görev durumu değişti",
        target: task?.name,
        meta: `→ ${TASK_STATUS_META[patch.status].label}`,
      });
    }
  }, [projects, log]);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    const task = projects.find((p) => p.id === projectId)?.tasks.find((t) => t.id === taskId);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p)),
    );
    log({ category: "gorev", action: "Görev silindi", target: task?.name });
  }, [projects, log]);

  const setReport = useCallback((projectId: string, text: string) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, report: text } : p)));
    log({ category: "proje", action: "Rapor güncellendi", target: projects.find((p) => p.id === projectId)?.name });
  }, [projects, log]);

  const value = useMemo<ProjectsState>(
    () => ({ projects, getProject, createProject, updateProject, deleteProject, setMemberAccess, removeMember, addTask, updateTask, deleteTask, setReport }),
    [projects, getProject, createProject, updateProject, deleteProject, setMemberAccess, removeMember, addTask, updateTask, deleteTask, setReport],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjects(): ProjectsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProjects must be used within <ProjectsProvider>");
  return ctx;
}

export { defaultAccessForRole, uid as newId };
