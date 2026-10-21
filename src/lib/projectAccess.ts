import type { DynamicModule } from "@/types/modules";
import type { User } from "@/types/users";

/**
 * Act-as kullanıcının Yetki Kartlarına (T-0030) göre görebileceği proje kodları.
 * "ALL" → kısıt yok (tüm projeler). Aksi halde yalnız döndürülen kodlar.
 *
 * Kural:
 *  · owner (sahip/admin) → her zaman tümünü görür.
 *  · Kullanıcıya uygun yetki kartı yoksa → kısıt uygulanmaz (ALL).
 *  · Uygun kart(lar)dan biri "Tümü" projeyi kapsıyorsa → ALL.
 *  · Aksi halde → kartlarda belirtilen proje kodlarının birleşimi.
 */
export function allowedProjectCodes(user: User, modules: DynamicModule[]): "ALL" | Set<string> {
  if (user.role === "owner") return "ALL";
  const cards = (modules.find((m) => m.id === "mod-T-0030")?.records ?? []) as Array<Record<string, unknown>>;
  const applies = cards.filter((c) => {
    const tip = String(c.yetki_tipi ?? "");
    const hedef = String(c.hedef ?? "");
    if (tip === "Kullanıcı") return (!!user.kod && hedef.includes(user.kod)) || hedef.includes(user.name);
    if (tip === "Departman") return hedef === user.department;
    return false;
  });
  if (applies.length === 0) return "ALL";
  const codes = new Set<string>();
  for (const c of applies) {
    const pr = String(c.projeler ?? "Tümü");
    if (pr.includes("Tümü")) return "ALL";
    (pr.match(/PRJ-\d{4}-\d{2}/g) ?? []).forEach((code) => codes.add(code));
  }
  return codes;
}

/** Kullanıcı bu projeyi görebilir mi? */
export function canSeeProject(user: User, code: string, modules: DynamicModule[]): boolean {
  const allowed = allowedProjectCodes(user, modules);
  return allowed === "ALL" || allowed.has(code);
}
