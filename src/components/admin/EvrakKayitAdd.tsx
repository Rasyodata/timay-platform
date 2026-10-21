import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import ProjectTableCard from "@/components/projects/ProjectTableCard";
import type { View } from "@/App";

/**
 * Evrak Kayıt Ekle — "Evrak Seç" ile bir evrak türü seçilir, seçilen evraka göre kayıt eklenir.
 * "+ Evrak Oluştur" ile yeni evrak türü tanımlanır (EVR-00NN). Cari alanları T-0001'den gelir.
 */
export default function EvrakKayitAdd({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { modules } = useModules();
  const evraklar = modules.filter((m) => m.kind === "evrak").sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const [selectedId, setSelectedId] = useState<string>(evraklar[0]?.id ?? "");

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <FileText size={20} className="text-neon-blue" /> Evrak Kayıt Ekle
          </h2>
          <p className="mt-1 text-sm text-muted">Bir evrak seçin; seçilen evraka göre kayıt ekleyin. Cari alanları T-0001'den gelir.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted">Evrak Seç</span>
            <select
              className="min-w-[260px] rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-neon-blue/60 focus:ring-2 focus:ring-neon-blue/40"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {evraklar.length === 0 && <option value="">Evrak yok</option>}
              {evraklar.map((m) => <option key={m.id} value={m.id} className="text-slate-900">{m.code} · {m.name}</option>)}
            </select>
          </label>
          <button
            onClick={() => onNavigate("evrak-new")}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted transition hover:border-neon-blue/40 hover:text-ink"
          >
            <Plus size={15} /> Evrak Oluştur
          </button>
        </div>
      </header>

      {selectedId
        ? <ProjectTableCard moduleId={selectedId} />
        : <div className="card grid place-items-center p-10 text-sm text-muted">Henüz evrak yok. "Evrak Oluştur" ile başlayın (ör. Tahsilat/Ödeme Evrağı).</div>}
    </div>
  );
}
