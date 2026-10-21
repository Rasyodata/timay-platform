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

const STORAGE_KEY = "timay.users.v9";
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
      { id: "u-1", kod: "K-0001", name: "Şevket Kaan", email: "sevketkaan00@gmail.com", phone: "0532 111 22 33", department: "Yönetim", userType: "Yönetici", adres: { sokak: "Barbaros Cad. No:12", mahalle: "Barbaros Mah.", ilce: "Ataşehir", il: "İstanbul" }, faturaAdresi: { sokak: "Barbaros Cad. No:12", mahalle: "Barbaros Mah.", ilce: "Ataşehir", il: "İstanbul" }, vergiDairesi: "Kozyatağı VD", vergiNo: "1234567890", tcNo: "11111111111", role: "owner", active: true },
      { id: "u-2", kod: "K-0002", name: "Ahmet Yılmaz", email: "ahmet@timay.co", phone: "0532 222 33 44", department: "Yazılım", userType: "Personel", adres: { sokak: "Tunalı Sok. No:5", mahalle: "Kızılay Mah.", ilce: "Çankaya", il: "Ankara" }, vergiDairesi: "", vergiNo: "", tcNo: "22222222222", role: "contributor", active: true },
      { id: "u-3", kod: "K-0003", name: "Ayşe Demir", email: "ayse@timay.co", phone: "0532 333 44 55", department: "Finans", userType: "Danışman", adres: { sokak: "Kordon Cad. No:30", mahalle: "Alsancak Mah.", ilce: "Konak", il: "İzmir" }, faturaAdresi: { sokak: "Kordon Cad. No:30", mahalle: "Alsancak Mah.", ilce: "Konak", il: "İzmir" }, vergiDairesi: "Konak VD", vergiNo: "9876543210", tcNo: "33333333333", role: "manager", active: true },
      { id: "u-4", kod: "K-0004", name: "Mehmet Kaya", email: "mehmet@dis.co", phone: "0532 444 55 66", department: "Dış Kaynak", userType: "Satıcı", adres: { sokak: "Fsm Blv. No:8", mahalle: "Görükle Mah.", ilce: "Nilüfer", il: "Bursa" }, faturaAdresi: { sokak: "Fsm Blv. No:8", mahalle: "Görükle Mah.", ilce: "Nilüfer", il: "Bursa" }, vergiDairesi: "Nilüfer VD", vergiNo: "4567891230", tcNo: "44444444444", role: "viewer", active: true },
      { id: "u-5", kod: "K-0005", name: "Acme A.Ş.", email: "info@acme.co", phone: "0212 100 00 00", department: "Dış Kaynak", userType: "Müşteri", adres: { sokak: "Büyükdere Cad. No:100", mahalle: "Mecidiyeköy Mah.", ilce: "Şişli", il: "İstanbul" }, faturaAdresi: { sokak: "Büyükdere Cad. No:100", mahalle: "Mecidiyeköy Mah.", ilce: "Şişli", il: "İstanbul" }, vergiDairesi: "Şişli VD", vergiNo: "1112223334", tcNo: "", role: "viewer", active: true },
      { id: "u-6", kod: "K-0006", name: "Beta Tedarik Ltd.", email: "satis@beta.co", phone: "0216 200 00 00", department: "Dış Kaynak", userType: "Satıcı", adres: { sokak: "Alemdağ Cad. No:45", mahalle: "Atatürk Mah.", ilce: "Ümraniye", il: "İstanbul" }, faturaAdresi: { sokak: "Alemdağ Cad. No:45", mahalle: "Atatürk Mah.", ilce: "Ümraniye", il: "İstanbul" }, vergiDairesi: "Ümraniye VD", vergiNo: "5556667778", tcNo: "", role: "viewer", active: true },
      { id: "u-7", kod: "K-0007", name: "Av. Can Yılmaz", email: "can@hukuk.co", phone: "0532 777 88 99", department: "Dış Kaynak", userType: "Avukat", adres: { sokak: "Barbaros Blv. No:22", mahalle: "Yıldız Mah.", ilce: "Beşiktaş", il: "İstanbul" }, vergiDairesi: "", vergiNo: "", tcNo: "55555555555", baro: "İstanbul Barosu", sicilNo: "48217", role: "viewer", active: true },
      { id: "u-8", kod: "K-0008", name: "Delta Danışmanlık", email: "info@delta.co", phone: "0312 300 00 00", department: "Dış Kaynak", userType: "Danışman", adres: { sokak: "Atatürk Blv. No:77", mahalle: "Kavaklıdere Mah.", ilce: "Çankaya", il: "Ankara" }, faturaAdresi: { sokak: "Atatürk Blv. No:77", mahalle: "Kavaklıdere Mah.", ilce: "Çankaya", il: "Ankara" }, vergiDairesi: "Çankaya VD", vergiNo: "9990001112", tcNo: "", role: "viewer", active: true },
      { id: "u-9", kod: "K-0009", name: "Rasyodata", email: "rasyodatagrup@gmail.com", phone: "", department: "Yönetim", userType: "Yönetici", adres: { sokak: "", mahalle: "", ilce: "", il: "" }, vergiDairesi: "", vergiNo: "", tcNo: "", role: "owner", active: true },
    ],
    caps: structuredCaps(),
    inheritance: [
      { id: "ir-1", department: "Pazarlama", role: "viewer", scope: "Tüm Pazarlama Projeleri" },
    ],
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
