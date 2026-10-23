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

/** Bir kullanıcının görebileceği çalışma alanı (workspace) anahtarları. */
export function allowedWorkspaceKeys(user: User, cards: Array<Record<string, unknown>>): Set<string> {
  if (user.role === "owner" || user.role === "manager") return new Set(ALL_WS_KEYS);
  // Önce kullanıcıya özel kart, yoksa departman kartı
  const card = cards.find((c) => String(c.yetki_tipi) === "Kullanıcı" && String(c.hedef) === user.name)
    ?? cards.find((c) => String(c.yetki_tipi) === "Departman" && String(c.hedef) === String(user.department ?? ""));
  if (!card) return new Set(DEFAULT_BY_ROLE[user.role] ?? ["buro"]);
  const ca = String(card.calisma_alanlari ?? "").trim();
  if (!ca || /tümü/i.test(ca)) return new Set(ALL_WS_KEYS);
  const keys = ca.split(",").map((s) => s.trim()).map((l) => LABEL_TO_KEY[l]).filter(Boolean);
  return new Set(keys.length ? keys : (DEFAULT_BY_ROLE[user.role] ?? ["buro"]));
}

export function useAllowedWorkspaces(): Set<string> {
  const { currentUser } = useUsers();
  const { getModule } = useModules();
  const cards = (getModule(YETKI_MOD)?.records ?? []) as Array<Record<string, unknown>>;
  return useMemo(() => allowedWorkspaceKeys(currentUser, cards), [currentUser, cards]);
}
