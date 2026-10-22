import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAudit } from "@/context/AuditContext";
import { ROLE_LABELS, type RoleKey } from "@/types/modules";
import {
  CAPABILITY_LABELS,
  DEFAULT_CAPS,
  type Capability,
  type Department,
  type InheritanceRule,
  type User,
} from "@/types/users";
import type { Visibility } from "@/types/modules";

const STORAGE_KEY = "timay.users.v13";
let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

type RoleCaps = Record<RoleKey, Record<Capability, boolean>>;

interface Persisted {
  users: User[];
  caps: RoleCaps;
  inheritance: InheritanceRule[];
  currentUserId: string;
}

interface UsersState extends Persisted {
  addUser: (u: Omit<User, "id">) => void;
  removeUser: (id: string) => void;
  toggleActive: (id: string) => void;
  toggleCap: (role: RoleKey, cap: Capability) => void;
  addRule: (r: Omit<InheritanceRule, "id">) => void;
  removeRule: (id: string) => void;
  // Aktif (act as) kullanıcı + yetki politikası
  currentUser: User;
  setCurrentUser: (id: string) => void;
  can: (cap: Capability) => boolean;
  canViewField: (visibility: Visibility) => boolean;
}

const Ctx = createContext<UsersState | null>(null);

function seed(): Persisted {
  return {
    users: [
      { id: "u-9", kod: "K-0001", name: "Rasyodata", email: "rasyodatagrup@gmail.com", phone: "", department: "Yönetim", userType: "Yönetici", adres: { sokak: "", mahalle: "", ilce: "", il: "" }, vergiDairesi: "", vergiNo: "", tcNo: "", role: "owner", active: true, password: "15045904" },
      { id: "u-10", kod: "K-0002", name: "Tuğba Yörük", email: "", phone: "", department: "Yönetim", userType: "Yönetici", adres: { sokak: "", mahalle: "", ilce: "", il: "" }, vergiDairesi: "", vergiNo: "", tcNo: "", role: "manager", active: true, password: "" },
      { id: "u-11", kod: "K-0003", name: "Kadir Fırat", email: "", phone: "", department: "Pazarlama", userType: "Personel", adres: { sokak: "", mahalle: "", ilce: "", il: "" }, vergiDairesi: "", vergiNo: "", tcNo: "", role: "contributor", active: true, password: "" },
    ],
    caps: structuredCaps(),
    inheritance: [],
    currentUserId: "u-9",
  };
}

function structuredCaps(): RoleCaps {
  // DEFAULT_CAPS'ın derin kopyası.
  return JSON.parse(JSON.stringify(DEFAULT_CAPS));
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* seed */
  }
  return seed();
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load());
  const { log } = useAudit();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* yok say */
    }
  }, [state]);

  const addUser = useCallback((u: Omit<User, "id">) => {
    setState((s) => {
      const maxKod = s.users.reduce((mx, x) => {
        const n = Number(String(x.kod ?? "").match(/(\d+)/)?.[1] ?? 0);
        return Math.max(mx, n);
      }, 0);
      const kod = u.kod?.trim() || `K-${String(maxKod + 1).padStart(4, "0")}`;
      return { ...s, users: [...s.users, { ...u, kod, id: uid("u") }] };
    });
    log({ category: "yetki", action: "Kullanıcı eklendi", target: `${u.name} (${ROLE_LABELS[u.role]})`, meta: u.department });
  }, [log]);

  const removeUser = useCallback((id: string) => {
    setState((s) => {
      const user = s.users.find((x) => x.id === id);
      if (user) log({ category: "yetki", action: "Kullanıcı kaldırıldı", target: user.name });
      return { ...s, users: s.users.filter((x) => x.id !== id) };
    });
  }, [log]);

  const toggleActive = useCallback((id: string) => {
    setState((s) => ({ ...s, users: s.users.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));
  }, []);

  const toggleCap = useCallback((role: RoleKey, cap: Capability) => {
    setState((s) => {
      const next = !s.caps[role][cap];
      log({
        category: "yetki",
        action: "Rol yetkisi değişti",
        target: `${ROLE_LABELS[role]} · ${CAPABILITY_LABELS[cap]}`,
        meta: next ? "Açıldı" : "Kapatıldı",
      });
      return { ...s, caps: { ...s.caps, [role]: { ...s.caps[role], [cap]: next } } };
    });
  }, [log]);

  const addRule = useCallback((r: Omit<InheritanceRule, "id">) => {
    setState((s) => ({ ...s, inheritance: [...s.inheritance, { ...r, id: uid("ir") }] }));
    log({ category: "yetki", action: "Departman mirası eklendi", target: `${r.department} → ${ROLE_LABELS[r.role]}`, meta: r.scope });
  }, [log]);

  const removeRule = useCallback((id: string) => {
    setState((s) => ({ ...s, inheritance: s.inheritance.filter((x) => x.id !== id) }));
  }, []);

  const setCurrentUser = useCallback((id: string) => {
    setState((s) => {
      const u = s.users.find((x) => x.id === id);
      if (u) log({ category: "yetki", action: "Aktif kullanıcı değişti (act as)", target: `${u.name} (${ROLE_LABELS[u.role]})` });
      return { ...s, currentUserId: id };
    });
  }, [log]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? state.users[0],
    [state.users, state.currentUserId],
  );

  const can = useCallback(
    (cap: Capability) => Boolean(state.caps[currentUser.role]?.[cap]),
    [state.caps, currentUser.role],
  );

  // Alan görünürlüğü: EVERYONE herkese; ONLY_MANAGERS owner/manager'a; ONLY_ADMINS owner'a.
  const canViewField = useCallback(
    (visibility: Visibility) => {
      if (visibility === "EVERYONE") return true;
      if (visibility === "ONLY_MANAGERS") return currentUser.role === "owner" || currentUser.role === "manager";
      return currentUser.role === "owner";
    },
    [currentUser.role],
  );

  const value = useMemo<UsersState>(
    () => ({ ...state, addUser, removeUser, toggleActive, toggleCap, addRule, removeRule, currentUser, setCurrentUser, can, canViewField }),
    [state, addUser, removeUser, toggleActive, toggleCap, addRule, removeRule, currentUser, setCurrentUser, can, canViewField],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUsers(): UsersState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUsers must be used within <UsersProvider>");
  return ctx;
}

/** Bir departmana kaç kişi mirasla rol alır — görsel özet için. */
export function usersInDepartment(users: User[], dep: Department): number {
  return users.filter((u) => u.department === dep).length;
}
