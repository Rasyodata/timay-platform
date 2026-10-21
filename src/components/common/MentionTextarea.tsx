import { useMemo, useRef, useState } from "react";
import { FolderKanban, Users, Table2, Building2, ListChecks, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { useProjects } from "@/context/ProjectsContext";

// Metin alanlarında @mention / otomatik tamamlama:
// "proje" yazınca projeler, "kişi"/ad yazınca kişiler, "cari/daire/görev" → ilgili kayıtlar.
interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

type Kategori = { label: string; icon: LucideIcon; keywords: string[]; items: string[] };

function useMentionPool(): Kategori[] {
  const { getModule } = useModules();
  const { users } = useUsers();
  const { projects } = useProjects();
  const take = (id: string, key: string) => (getModule(id)?.records ?? []).map((r) => String((r as Record<string, unknown>)[key] ?? "")).filter(Boolean);

  return useMemo(() => [
    { label: "Proje", icon: FolderKanban, keywords: ["proje", "projeler", "projede"], items: projects.map((p) => p.name) },
    { label: "Kişi", icon: Users, keywords: ["kişi", "kisi", "kişiler", "personel", "çalışan", "sorumlu", "danışman"], items: users.map((u) => u.name) },
    { label: "Cari", icon: Table2, keywords: ["cari", "müşteri", "firma", "tedarikçi"], items: take("mod-T-0077", "ad") },
    { label: "Daire", icon: Building2, keywords: ["daire", "portföy", "gayrimenkul", "emlak"], items: take("mod-T-0072", "baslik") },
    { label: "Görev", icon: ListChecks, keywords: ["görev", "gorev", "görevi"], items: take("mod-T-0056", "baslik") },
    { label: "Toplantı", icon: ClipboardList, keywords: ["toplantı", "toplanti", "tutanak"], items: take("mod-T-0063", "toplanti") },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projects, users, getModule]);
}

const low = (s: string) => s.toLocaleLowerCase("tr");

export default function MentionTextarea({ value, onChange, placeholder, rows = 4, className }: Props) {
  const pool = useMentionPool();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState<{ name: string; kat: string; icon: LucideIcon }[]>([]);
  const [range, setRange] = useState<[number, number]>([0, 0]);

  const recompute = (v: string, pos: number) => {
    const before = v.slice(0, pos);
    const m = before.match(/([\p{L}][\p{L}çğıöşüÇĞİÖŞÜ.\- ]{1,30})$/u);
    if (!m) { setOpen(false); return; }
    // son 1-3 kelimeyi dene
    const raw = m[1];
    const token = raw.trim();
    const t = low(token);
    if (t.length < 3) { setOpen(false); return; }
    const results: { name: string; kat: string; icon: LucideIcon }[] = [];
    const seen = new Set<string>();
    const push = (name: string, kat: string, icon: LucideIcon) => { const k = kat + "|" + name; if (name && !seen.has(k)) { seen.add(k); results.push({ name, kat, icon }); } };
    // kategori anahtar kelimesi → o kategorinin kayıtları
    for (const c of pool) {
      if (c.keywords.some((kw) => kw.startsWith(t) || t.startsWith(kw))) {
        c.items.slice(0, 8).forEach((n) => push(n, c.label, c.icon));
      }
    }
    // isim içinde arama
    const lastWord = low(token.split(/\s+/).pop() || "");
    if (lastWord.length >= 3) {
      for (const c of pool) for (const n of c.items) if (low(n).includes(lastWord)) push(n, c.label, c.icon);
    }
    if (results.length) {
      const start = pos - raw.length + (raw.length - raw.trimStart().length);
      setRange([start, pos]);
      setSugg(results.slice(0, 8));
      setOpen(true);
    } else setOpen(false);
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    recompute(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const pick = (name: string) => {
    const [s, e] = range;
    const nv = value.slice(0, s) + name + " " + value.slice(e);
    onChange(nv);
    setOpen(false);
    const caret = s + name.length + 1;
    requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(caret, caret); } });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onInput}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {open && sugg.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-card animate-fade-in">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">Ekle — seç</p>
          {sugg.map((s, i) => (
            <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); pick(s.name); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-elevated">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-neon-blue/10 text-neon-blue"><s.icon size={13} /></span>
              <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
              <span className="shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{s.kat}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
