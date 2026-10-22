import { useState } from "react";
import { BookMarked, FolderKanban } from "lucide-react";
import { useProjects } from "@/context/ProjectsContext";
import ProjeDefteri from "@/components/projects/ProjeDefteri";

/** Üst seviye Proje Defteri — proje seç, o projenin bütün defter hareketlerini (toplantı/görev/not/masraf/iş hareket) tek defterde gör. */
export default function ProjeDefteriPage() {
  const { projects } = useProjects();
  const [sel, setSel] = useState(projects[0]?.id ?? "");
  const p = projects.find((x) => x.id === sel) ?? projects[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><BookMarked size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Proje Defteri</h1>
          <p className="text-xs text-muted">Projeye bağlı tüm hareketler tek defterde · toplantı · görev · not · masraf · iş hareket · kilometre taşı</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <FolderKanban size={16} className="text-muted" />
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium text-ink outline-none focus:border-neon-blue">
            {projects.length === 0 && <option value="">Proje yok</option>}
            {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.code} · {pr.name}</option>)}
          </select>
        </div>
      </div>

      {p ? (
        <ProjeDefteri projectName={p.name} projectCode={p.code} />
      ) : (
        <div className="card p-10 text-center text-sm text-muted">Henüz proje yok — önce bir proje oluşturun.</div>
      )}
    </div>
  );
}
