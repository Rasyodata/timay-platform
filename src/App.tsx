import { useState } from "react";
import LoginScreen from "@/components/auth/LoginScreen";
import Dashboard from "@/components/dashboard/Dashboard";
import ModuleBuilder from "@/components/modules/ModuleBuilder";
import DynamicModulePage from "@/components/modules/DynamicModulePage";
import TablesList from "@/components/modules/TablesList";
import ProjectsList from "@/components/projects/ProjectsList";
import ProjectWizard from "@/components/projects/ProjectWizard";
import ProjectDetail from "@/components/projects/ProjectDetail";
import ProjectsBI from "@/components/projects/ProjectsBI";
import AuditLog from "@/components/audit/AuditLog";
import { UsersAdmin, RolesAdmin } from "@/components/admin/UsersRolesAdmin";
import TableRecordAdd from "@/components/admin/TableRecordAdd";
import EvrakKayitAdd from "@/components/admin/EvrakKayitAdd";
import FinansMerkezi from "@/components/hub/FinansMerkezi";
import FinansalRaporlar from "@/components/hub/FinansalRaporlar";
import KararMerkezi from "@/components/hub/KararMerkezi";
import BuroMerkezi from "@/components/hub/BuroMerkezi";
import AjandaPage from "@/components/agenda/AjandaPage";
import AjandaDashboard from "@/components/agenda/AjandaDashboard";
import PagesPage from "@/components/docs/PagesPage";
import DosyaKutuphanesi from "@/components/docs/DosyaKutuphanesi";
import GorevYonetimi from "@/components/tasks/GorevYonetimi";
import NotesPage from "@/components/notes/NotesPage";
import TutanakNotebook from "@/components/notes/TutanakNotebook";
import OnaylarPage from "@/components/approvals/OnaylarPage";
import TimayAkademi from "@/components/academy/TimayAkademi";
import IKYonetimi from "@/components/academy/IKYonetimi";
import GayrimenkulYonetimi from "@/components/realestate/GayrimenkulYonetimi";
import TaleplerMerkezi from "@/components/requests/TaleplerMerkezi";
import TimayPlanlayici from "@/components/agenda/TimayPlanlayici";
import TekrarlayanIslemler from "@/components/finance/TekrarlayanIslemler";
import PipelineBoard from "@/components/crm/PipelineBoard";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ToastHost from "@/components/ui/ToastHost";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DashboardProvider } from "@/context/DashboardContext";
import { AuditProvider } from "@/context/AuditContext";
import { ModulesProvider } from "@/context/ModulesContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import { UsersProvider } from "@/context/UsersContext";
import { WORKSPACES, workspaceForView } from "@/lib/nav";

/** Basit görünüm yönlendirmesi. */
export type View =
  | "finans-merkezi"
  | "karar-merkezi"
  | "buro-merkezi"
  | "ajanda"
  | "ajandam"
  | "dokumanlar"
  | "dosya-kutuphanesi"
  | "gorev-yonetimi"
  | "notlar"
  | "tutanak"
  | "onaylar"
  | "akademi"
  | "ik"
  | "emlak"
  | "talepler"
  | "planlayici"
  | "finansal-raporlar"
  | "tekrarlayan"
  | "pipeline"
  | "overview"
  | "projects"
  | "project-new"
  | "bi"
  | `project:${string}`
  | "builder"
  | `edit:${string}`
  | `mod:${string}`
  | "audit"
  | "users"
  | "roles"
  | "record-add"
  | "evraklar"
  | "evrak-new"
  | "tables";

function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<View>("ajandam");
  const [activeWs, setActiveWs] = useState("buro");

  // İçerik navigasyonu — görünümün ait olduğu çalışma alanını türetir (belirsizse korur).
  const navigate = (v: View) => {
    setView(v);
    const ws = workspaceForView(v);
    if (ws) setActiveWs(ws);
    setMobileOpen(false);
  };

  // Sol bar çalışma alanı seçimi → varsayılan görünümüne git.
  const selectWorkspace = (key: string) => {
    const ws = WORKSPACES.find((w) => w.key === key);
    setActiveWs(key);
    if (ws) setView(ws.defaultView);
    setMobileOpen(false);
  };

  return (
    <>
          <div className="flex min-h-screen bg-base text-ink">
            <Sidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed((v) => !v)}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
              activeWs={activeWs}
              onSelectWorkspace={selectWorkspace}
              onNavigate={navigate}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Navbar onMenu={() => setMobileOpen(true)} onNavigate={navigate} view={view} activeWs={activeWs} />
              <main
                className={`flex-1 overflow-x-hidden${["ajandam", "ajanda", "gorev-yonetimi", "onaylar", "users", "roles", "notlar", "tutanak", "dosya-kutuphanesi"].includes(view) ? " dense-zoom" : ""}`}
              >
                {view === "finans-merkezi" && <FinansMerkezi onNavigate={navigate} />}
                {view === "karar-merkezi" && <KararMerkezi onNavigate={navigate} />}
                {view === "buro-merkezi" && <BuroMerkezi onNavigate={navigate} />}
                {view === "ajanda" && <AjandaPage onNavigate={navigate} />}
                {view === "ajandam" && <AjandaDashboard onNavigate={navigate} />}
                {view === "planlayici" && <TimayPlanlayici onNavigate={navigate} />}
                {view === "dokumanlar" && <PagesPage onNavigate={navigate} />}
                {view === "dosya-kutuphanesi" && <DosyaKutuphanesi onNavigate={navigate} />}
                {view === "gorev-yonetimi" && <GorevYonetimi onNavigate={navigate} />}
                {view === "notlar" && <NotesPage onNavigate={navigate} />}
                {view === "tutanak" && <TutanakNotebook onNavigate={navigate} />}
                {view === "onaylar" && <OnaylarPage onNavigate={navigate} />}
                {view === "akademi" && <TimayAkademi onNavigate={navigate} />}
                {view === "ik" && <IKYonetimi onNavigate={navigate} />}
                {view === "emlak" && <GayrimenkulYonetimi onNavigate={navigate} />}
                {view === "talepler" && <TaleplerMerkezi onNavigate={navigate} />}
                {view === "finansal-raporlar" && <FinansalRaporlar onNavigate={navigate} />}
                {view === "tekrarlayan" && <TekrarlayanIslemler onNavigate={navigate} />}
                {view === "pipeline" && <PipelineBoard />}
                {view === "overview" && <Dashboard />}

                {view === "bi" && <ProjectsBI onOpen={(id) => navigate(`project:${id}`)} />}
                {view === "projects" && (
                  <ProjectsList onOpen={(id) => navigate(`project:${id}`)} onNew={() => navigate("project-new")} />
                )}
                {view === "project-new" && (
                  <ProjectWizard onCreated={(id) => navigate(`project:${id}`)} />
                )}
                {view.startsWith("project:") && (
                  <ProjectDetail projectId={view.slice(8)} onDeleted={() => navigate("projects")} />
                )}

                {view === "builder" && <ModuleBuilder onDone={(id) => navigate(`mod:${id}`)} />}
                {view.startsWith("edit:") && (
                  <ModuleBuilder editModuleId={view.slice(5)} onDone={(id) => navigate(`mod:${id}`)} />
                )}
                {view.startsWith("mod:") && (
                  <DynamicModulePage
                    moduleId={view.slice(4)}
                    onDeleted={() => navigate("builder")}
                    onEdit={(id) => navigate(`edit:${id}`)}
                  />
                )}

                {view === "audit" && <AuditLog />}
                {view === "users" && <UsersAdmin />}
                {view === "roles" && <RolesAdmin />}
                {view === "record-add" && <TableRecordAdd onNavigate={navigate} />}
                {view === "evraklar" && <EvrakKayitAdd onNavigate={navigate} />}
                {view === "evrak-new" && <ModuleBuilder kind="evrak" onDone={() => navigate("evraklar")} />}
                {view === "tables" && (
                  <TablesList
                    onOpen={(id) => navigate(`mod:${id}`)}
                    onEdit={(id) => navigate(`edit:${id}`)}
                    onNew={() => navigate("builder")}
                  />
                )}
              </main>
            </div>
          </div>
          <ToastHost />
    </>
  );
}

function Gate() {
  const { authed } = useAuth();
  return authed ? <DashboardShell /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
      <AuditProvider>
      <UsersProvider>
      <ModulesProvider>
        <ProjectsProvider>
          <Gate />
        </ProjectsProvider>
      </ModulesProvider>
      </UsersProvider>
      </AuditProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}
