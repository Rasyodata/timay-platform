// ─────────────────────────────────────────────────────────────────────────
// Meta-veri tabanlı dinamik modül/tablo tipleri.
// Yönetici bir "modül" tanımlar (modules kaydı), içine "alanlar" (module_fields)
// ekler; sistem bu tanımdan menüyü, formu, tabloyu ve yetki matrisini üretir.
// ─────────────────────────────────────────────────────────────────────────

export type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "TIME" | "DROPDOWN" | "BOOLEAN";

/** Alanın varsayılan görünürlüğü (field-level security). */
export type Visibility = "EVERYONE" | "ONLY_MANAGERS" | "ONLY_ADMINS";

/** Proje rolleri (RBAC şablonları). */
export type RoleKey = "owner" | "manager" | "contributor" | "viewer";

/** Bir rolün modüle erişim seviyesi. */
export type AccessLevel = "none" | "read" | "full";

export interface DynamicField {
  id: string;
  /** Koddaki ad — ör. "serial_no". */
  code: string;
  /** Arayüz etiketi — ör. "Seri Numarası". */
  name: string;
  type: FieldType;
  required: boolean;
  visibility: Visibility;
  /** DROPDOWN için statik seçenekler. */
  options?: string[];
  /** DROPDOWN seçeneklerini başka bir kaynaktan canlı çeker: "users" (T-0001) veya "mod-T-XXXX" (o tablonun 'ad' alanı). */
  optionsSource?: string;
  /** mod- kaynağında kayıtları belirli bir alana göre süzer (ör. { field: "tip", equals: "Banka" }). */
  optionsFilter?: { field: string; equals: string };
  /** Bu alan yalnız başka bir alanın değeri listedeyken gösterilir (koşullu alan). */
  showWhen?: { field: string; in: string[] };
}

export type DynamicRecord = { id: string } & Record<string, unknown>;

export interface DynamicModule {
  id: string;
  /** Benzersiz tablo kodu — ör. "T-0042". */
  code: string;
  /** Menüde/arayüzde görünecek ad — ör. "Makine Envanteri". */
  name: string;
  /** Kısa açıklama — tablonun ne işe yaradığı. */
  description: string;
  /** Arka planda verinin tutulacağı yer (temsili) — ör. "dynamic_table_105". */
  tableName: string;
  /** Lucide ikon adı (string). */
  icon: string;
  /** "tablo" (varsayılan) veya "evrak" — Evraklar bölümünde ayrı listelenir. */
  kind?: "tablo" | "evrak";
  active: boolean;
  createdAt: string;
  fields: DynamicField[];
  records: DynamicRecord[];
  /** Rol → erişim seviyesi (yetki matrisi). */
  perms: Record<RoleKey, AccessLevel>;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Metin",
  TEXTAREA: "Uzun Metin",
  NUMBER: "Sayı",
  DATE: "Tarih",
  TIME: "Saat",
  DROPDOWN: "Açılır Liste",
  BOOLEAN: "Evet/Hayır",
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  EVERYONE: "Herkes",
  ONLY_MANAGERS: "Sadece Yöneticiler",
  ONLY_ADMINS: "Sadece Adminler",
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Proje Sahibi",
  manager: "Yönetici",
  contributor: "Katılımcı",
  viewer: "Gözlemci",
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  none: "Erişim Yok",
  read: "Sadece Okuma",
  full: "Tam Yetki",
};

/** Yeni modül için varsayılan yetki matrisi (Admin her zaman tam yetkilidir). */
export const DEFAULT_PERMS: Record<RoleKey, AccessLevel> = {
  owner: "full",
  manager: "full",
  contributor: "read",
  viewer: "none",
};
