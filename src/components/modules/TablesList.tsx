import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Table2 } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";

export default function TablesList({
  onOpen,
  onEdit,
  onNew,
}: {
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onNew: () => void;
}) {
  const { modules } = useModules();
  const { can } = useUsers();
  const [q, setQ] = useState("");
  const canManage = can("modul_olustur");

  const rows = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr");
    return [...modules]
      .filter((m) =>
        !query ||
        m.name.toLocaleLowerCase("tr").includes(query) ||
        m.code.toLocaleLowerCase("tr").includes(query) ||
        m.description.toLocaleLowerCase("tr").includes(query),
      )
      .sort((a, b) => a.code.localeCompare(b.code, "tr"));
  }, [modules, q]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <Table2 size={20} className="text-neon-violet" /> Sistem Tabloları
          </h2>
          <p className="mt-1 text-sm text-muted">{modules.length} tablo · kod · düzenle · sonradan eklenebilir</p>
        </div>
        {canManage && (
          <button onClick={onNew} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-blue transition hover:opacity-90">
            <Plus size={16} /> Tablo Oluştur
          </button>
        )}
      </header>

      <div className="relative w-full sm:max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tablo / kod / açıklama ara…"
          className="w-full rounded-xl border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40"
        />
      </div>

      <section className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-3 font-medium text-muted">Kod</th>
                <th className="px-4 py-3 font-medium text-muted">Tablo Adı</th>
                <th className="px-4 py-3 font-medium text-muted">Açıklama</th>
                <th className="px-4 py-3 text-center font-medium text-muted">Kayıt</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Düzenle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onOpen(m.id)}
                  className="cursor-pointer border-b border-line/60 transition hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-neon-violet nums">{m.code}</td>
                  <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-4 py-3 text-muted">{m.description || "—"}</td>
                  <td className="px-4 py-3 text-center text-ink nums">{m.records.length}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(m.id); }}
                        className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20"
                      >
                        <Pencil size={13} /> Düzenle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">Tablo bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
