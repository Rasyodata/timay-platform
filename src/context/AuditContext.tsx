import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuditCategory, AuditEntry } from "@/types/audit";

const STORAGE_KEY = "timay.audit.v1";
const ACTOR = "Şevket Kaan";

let counter = 0;
const uid = () => `a-${Date.now().toString(36)}-${(counter++).toString(36)}`;

interface LogInput {
  category: AuditCategory;
  action: string;
  target?: string;
  meta?: string;
}

interface AuditState {
  entries: AuditEntry[];
  log: (input: LogInput) => void;
  clear: () => void;
}

const Ctx = createContext<AuditState | null>(null);

function seed(): AuditEntry[] {
  return [
    { id: "a-seed-3", at: "2026-10-13T09:12:00", actor: ACTOR, category: "proje", action: "Proje oluşturuldu", target: "X Mobil Uygulaması (PRJ-2026-01)" },
    { id: "a-seed-2", at: "2026-10-13T09:15:00", actor: ACTOR, category: "yetki", action: "Üye erişimi güncellendi", target: "Ahmet Yılmaz · Finans", meta: "Tam Yetki → Erişim Yok" },
    { id: "a-seed-1", at: "2026-10-13T10:02:00", actor: ACTOR, category: "modul", action: "Modül oluşturuldu", target: "Şirket Araçları (CUSTOM_VEHICLES)" },
  ];
}

function load(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuditEntry[];
  } catch {
    /* seed */
  }
  return seed();
}

export function AuditProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 500)));
    } catch {
      /* yok say */
    }
  }, [entries]);

  const log = useCallback((input: LogInput) => {
    setEntries((prev) => [
      { id: uid(), at: new Date().toISOString(), actor: ACTOR, ...input },
      ...prev,
    ].slice(0, 500));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo<AuditState>(() => ({ entries, log, clear }), [entries, log, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudit(): AuditState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudit must be used within <AuditProvider>");
  return ctx;
}
