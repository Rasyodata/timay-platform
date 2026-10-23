import { useMemo } from "react";
import { WORKSPACES } from "@/lib/nav";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import type { User } from "@/types/users";

const YETKI_MOD = "mod-T-0030";
// Tüm çalışma alanı anahtarları + Ayarlar
export const ALL_WS_KEYS = [...WORKSPACES.map((w) => w.key), "ayarlar"];
const LABEL_TO_KEY: Record<string, string> = {
  ...Object.fromEntries(WORKSPACES.map((w) => [w.label, w.key])),
  "Ayarlar": "ayarlar",
};
// Yetki kartı olmayan roller için varsayılan erişim
const DEFAULT_BY_ROLE: Record<string, string[]> = {
  owner: ALL_WS_KEYS,
  manager: ALL_WS_KEYS,
  // Yetki kartı verilmemiş normal kullanıcı yalnızca Büro Yönetimi'ni görür (admin kartla genişletir)
  contributor: ["buro"],
  viewer: ["buro"],
};
const FULL = "Görür, Düzenler, Ekler";

type Card = Record<string, unknown>;

function findCard(user: User, cards: Card[]): Card | undefined {
  return cards.find((c) => String(c.yetki_tipi) === "Kullanıcı" && String(c.hedef) === user.name)
    ?? cards.find((c) => String(c.yetki_tipi) === "Departman" && String(c.hedef) === String(user.department ?? ""));
}

/** Bir kullanıcının görebileceği çalışma alanı (workspace) anahtarları. */
export function allowedWorkspaceKeys(user: User, cards: Card[]): Set<string> {
  if (user.role === "owner" || user.role === "manager") return new Set(ALL_WS_KEYS);
  const card = findCard(user, cards);
  if (!card) return new Set(DEFAULT_BY_ROLE[user.role] ?? ["buro"]);
  const ca = String(card.calisma_alanlari ?? "").trim();
  if (!ca || /tümü/i.test(ca)) return new Set(ALL_WS_KEYS);
  const keys = ca.split(",").map((s) => s.trim()).map((l) => LABEL_TO_KEY[l]).filter(Boolean);
  return new Set(keys.length ? keys : (DEFAULT_BY_ROLE[user.role] ?? ["buro"]));
}

export interface Access {
  isAdmin: boolean;
  workspaces: Set<string>;
  /** Sekme (modül) görünür mü? */
  canSeeTab: (wsKey: string, view: string) => boolean;
  /** Sekme izin dizgesi ("", "Görmez", "Görür, Düzenler" …). */
  tabPerm: (wsKey: string, view: string) => string;
  canEdit: (wsKey: string, view: string) => boolean;
  canAdd: (wsKey: string, view: string) => boolean;
}

export function buildAccess(user: User, cards: Card[]): Access {
  const isAdmin = user.role === "owner" || user.role === "manager";
  const workspaces = allowedWorkspaceKeys(user, cards);
  if (isAdmin) {
    return { isAdmin, workspaces, canSeeTab: () => true, tabPerm: () => "Ekler", canEdit: () => true, canAdd: () => true };
  }
  const card = findCard(user, cards);
  let mp: Record<string, string> = {};
  try { mp = card?.modul_yetkileri_detay ? JSON.parse(String(card.modul_yetkileri_detay)) : {}; } catch { mp = {}; }
  const wsConfigured = (wsKey: string) => Object.keys(mp).some((k) => k.startsWith(wsKey + "::") && mp[k] && mp[k] !== "Görmez");
  const tabPerm = (wsKey: string, view: string): string => {
    if (!workspaces.has(wsKey)) return "";
    const p = mp[`${wsKey}::${view}`];
    if (p !== undefined && p !== "") return p;
    // Tanımsız: bu alanda hiç modül yetkisi verilmemişse tam erişim (alan düzeyinde grant), verilmişse Görmez
    return wsConfigured(wsKey) ? "Görmez" : FULL;
  };
  const canSeeTab = (wsKey: string, view: string) => { const p = tabPerm(wsKey, view); return !!p && p !== "Görmez"; };
  const canEdit = (wsKey: string, view: string) => /Düzenler|Ekler/.test(tabPerm(wsKey, view));
  const canAdd = (wsKey: string, view: string) => /Ekler/.test(tabPerm(wsKey, view));
  return { isAdmin, workspaces, canSeeTab, tabPerm, canEdit, canAdd };
}

export function useAccess(): Access {
  const { currentUser } = useUsers();
  const { getModule } = useModules();
  const cards = (getModule(YETKI_MOD)?.records ?? []) as Card[];
  return useMemo(() => buildAccess(currentUser, cards), [currentUser, cards]);
}

export function useAllowedWorkspaces(): Set<string> {
  return useAccess().workspaces;
}
