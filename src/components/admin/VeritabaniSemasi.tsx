import { useMemo, useState } from "react";
import { Database, Search, ChevronDown, ChevronRight, KeyRound, Link2, Table2, Hash } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { DynamicModule, DynamicField } from "@/types/modules";

const TYPE_LABEL: Record<string, string> = {
  TEXT: "metin", TEXTAREA: "uzun metin", NUMBER: "sayı", DATE: "tarih", TIME: "saat", DROPDOWN: "liste", BOOLEAN: "evet/hayır",
};
const TYPE_COLOR: Record<string, string> = {
  TEXT: "#64748B", TEXTAREA: "#64748B", NUMBER: "#0A4EA2", DATE: "#1E7A46", TIME: "#1E7A46", DROPDOWN: "#B5731A", BOOLEAN: "#7C3AED",
};

export default function VeritabaniSemasi() {
  const { modules } = useModules();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Kod → ad çözümü (referans etiketleri için)
  const nameByCode = useMemo(() => {
    const m: Record<string, string> = { "T-0001": "Kullanıcılar / Cari" };
    modules.forEach((mod) => { m[mod.code] = mod.name; });
    return m;
  }, [modules]);

  const refOf = (f: DynamicField): { code: string; label: string } | null => {
    const src = (f as unknown as { optionsSource?: string }).optionsSource;
    if (!src) return null;
    if (src === "users") return { code: "T-0001", label: "Kullanıcılar / Cari (T-0001)" };
    if (src.startsWith("mod-")) { const code = src.replace("mod-", ""); return { code, label: `${nameByCode[code] ?? code} (${code})` }; }
    return null;
  };

  const sorted = useMemo(() => [...modules].sort((a, b) => a.code.localeCompare(b.code)), [modules]);
  const qn = q.trim().toLocaleLowerCase("tr");
  const list = qn
    ? sorted.filter((m) => `${m.code} ${m.name} ${m.description}`.toLocaleLowerCase("tr").includes(qn) || m.fields.some((f) => f.name.toLocaleLowerCase("tr").includes(qn)))
    : sorted;

  const totalFields = modules.reduce((s, m) => s + m.fields.length, 0);
  const totalRefs = modules.reduce((s, m) => s + m.fields.filter((f) => refOf(f)).length, 0);
  const totalRecords = modules.reduce((s, m) => s + m.records.length, 0);

  const th = "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted";

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Database size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Veritabanı Şeması</h1>
          <p className="text-xs text-muted">Tüm tablolar · sütunlar · tipler · tablolar arası ilişkiler (yabancı anahtarlar)</p>
        </div>
        <div className="relative ml-auto">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tablo / sütun ara…" className="w-64 rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-neon-blue/50" />
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Table2, label: "Tablo", value: modules.length },
          { icon: Hash, label: "Toplam Sütun", value: totalFields },
          { icon: Link2, label: "İlişki (FK)", value: totalRefs },
          { icon: KeyRound, label: "Kayıt", value: totalRecords },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-line bg-panel px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon-blue/10 text-neon-blue"><s.icon size={16} /></span>
            <span><span className="block text-lg font-bold text-ink nums">{s.value}</span><span className="block text-[11px] text-muted">{s.label}</span></span>
          </div>
        ))}
      </div>

      {/* Tablolar */}
      <div className="space-y-2">
        {list.map((m: DynamicModule) => {
          const open = openId === m.id;
          const refs = m.fields.map((f) => ({ f, ref: refOf(f) })).filter((x) => x.ref);
          return (
            <div key={m.id} className="overflow-hidden rounded-xl border border-line bg-panel">
              <button onClick={() => setOpenId(open ? null : m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-elevated">
                {open ? <ChevronDown size={16} className="shrink-0 text-muted" /> : <ChevronRight size={16} className="shrink-0 text-muted" />}
                <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] text-muted">{m.code}</span>
                <span className="font-semibold text-ink">{m.name}</span>
                <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted">
                  <span className="rounded-full bg-base/60 px-2 py-0.5">{m.fields.length} sütun</span>
                  {refs.length > 0 && <span className="flex items-center gap-1 rounded-full bg-neon-blue/10 px-2 py-0.5 text-neon-blue"><Link2 size={10} /> {refs.length} ilişki</span>}
                  <span className="rounded-full bg-base/60 px-2 py-0.5">{m.records.length} kayıt</span>
                </span>
              </button>
              {open && (
                <div className="border-t border-line">
                  {m.description && <p className="px-4 py-2 text-[12px] text-muted">{m.description}</p>}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead><tr className="border-y border-line bg-base/40">
                        <th className={th}>Sütun (kod)</th><th className={th}>Ad</th><th className={th}>Tip</th><th className={th}>Zorunlu</th><th className={th}>Referans (→ tablo)</th>
                      </tr></thead>
                      <tbody>
                        {m.fields.map((f) => { const r = refOf(f); return (
                          <tr key={f.code} className="border-b border-line/50">
                            <td className="px-3 py-1.5 font-mono text-[12px] text-ink/70">{f.code}</td>
                            <td className="px-3 py-1.5 text-[13px] text-ink">{f.name}</td>
                            <td className="px-3 py-1.5"><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${TYPE_COLOR[f.type] ?? "#64748B"}1f`, color: TYPE_COLOR[f.type] ?? "#64748B" }}>{TYPE_LABEL[f.type] ?? f.type}</span></td>
                            <td className="px-3 py-1.5 text-[12px]">{f.required ? <span className="font-semibold text-critical">zorunlu</span> : <span className="text-faint">—</span>}</td>
                            <td className="px-3 py-1.5 text-[12px]">{r ? <span className="flex items-center gap-1 text-neon-blue"><Link2 size={11} /> {r.label}</span> : <span className="text-faint">—</span>}</td>
                          </tr>
                        ); })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted">Eşleşen tablo yok.</p>}
      </div>
    </div>
  );
}
