import { useState } from "react";
import { Table2, Plus } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import ProjectTableCard from "@/components/projects/ProjectTableCard";
import { UsersAdminBody } from "@/components/admin/UsersRolesAdmin";
import AdresKartiEditor from "@/components/admin/AdresKartiEditor";
import YetkiKartiEditor from "@/components/admin/YetkiKartiEditor";
import type { View } from "@/App";

/**
 * Tablo Kayıt Ekle — sağdaki "Tablo Seç" ile bir tablo seçilir,
 * seçilen tabloya göre kayıt eklenir/düzenlenir (ProjectTableCard).
 */
export default function TableRecordAdd({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { modules } = useModules();
  const sorted = modules.filter((m) => (m.kind ?? "tablo") !== "evrak").sort((a, b) => a.code.localeCompare(b.code, "tr"));
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <Table2 size={20} className="text-neon-blue" /> Tablo Kayıt Ekle
          </h2>
          <p className="mt-1 text-sm text-muted">Bir tablo seçin; seçilen tabloya göre kayıt ekleyin veya düzenleyin.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted">Tablo Seç</span>
            <select
              className="min-w-[260px] rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {sorted.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
            </select>
          </label>
          <button
            onClick={() => onNavigate("builder")}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted transition hover:border-neon-blue/40 hover:text-ink"
          >
            <Plus size={15} /> Tablo Oluştur
          </button>
        </div>
      </header>

      {!selectedId ? (
        <div className="card grid place-items-center p-10 text-sm text-muted">Tablo bulunamadı.</div>
      ) : selectedId === "mod-T-0001" ? (
        // Kullanıcı Cari Kart = Kullanıcılar yönetimi (aynı veri, aynı alanlar)
        <UsersAdminBody />
      ) : selectedId === "mod-T-0003" ? (
        // Adres Kartı = kullanıcı kodu seç → ad otomatik
        <AdresKartiEditor />
      ) : selectedId === "mod-T-0030" ? (
        // Yetki Kartı = yetki tipi (kullanıcı/departman) cascading
        <YetkiKartiEditor />
      ) : (
        <ProjectTableCard moduleId={selectedId} />
      )}
    </div>
  );
}
