import type { AccessLevel, RoleKey } from "@/types/modules";

// ─────────────────────────────────────────────────────────────────────────
// Proje yönetimi modeli — meta, zaman/bütçe, kategorizasyon, yaşam döngüsü,
// ekip + modül bazlı yetki matrisi (RBAC).
// ─────────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "taslak"
  | "baslamadi"
  | "devam"
  | "askida"
  | "tamamlandi"
  | "iptal";

export type Priority = "dusuk" | "orta" | "yuksek" | "kritik";

export type ProjectType = "arge" | "pazarlama" | "musteri" | "ic";

/** Proje içindeki modüller (açılıp kapanabilir, erişim kontrollü). */
export type ProjectModuleKey = "gorevler" | "finans" | "dokumanlar" | "zaman";

export interface TeamMember {
  id: string;
  name: string;
  /** Üyenin kurum/görev etiketi — ör. "Timay Platform", "Uygulama Üreticisi". */
  title?: string;
  role: RoleKey;
  /** Modül bazlı erişim (modül-level security). */
  access: Record<ProjectModuleKey, AccessLevel>;
}

/** Proje hareket/aktivite günlüğü kaydı (tarihli, kim · ne yaptı). */
export interface ProjectActivity {
  id: string;
  date: string; // ISO (YYYY-MM-DD)
  actor: string;
  description: string;
}

/** Proje ortaklık tipleri (Hak Sahibi tablosunda seçilir). */
export const ORTAKLIK_TIPLERI = [
  "Kâr-Zarar Ortaklığı",
  "Süreli Ortaklık",
  "Distribütörlük",
  "Bayilik",
  "Satış ve Pazarlama",
  "Diğer",
] as const;

/** Projeye özel hak sahibi ve beklenti kaydı. */
export interface HakSahibi {
  id: string;
  hakSahibi: string;
  satisHedefi: number;
  karHedefi: number;
  pazarBeklentisi: string;
  ortaklikTipi: string;
  iletisim: string;
  ortakSayisi: number;
  aciklama: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  type: ProjectType;
  tags: string[];
  priority: Priority;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  /** Tahmini adam/saat. */
  effort: number;
  budget: number;
  currency: "TRY" | "USD" | "EUR";
  /** Bütçe alanının gizlilik derecesi (field-level). */
  budgetVisibility: "EVERYONE" | "ONLY_MANAGERS";
  stakeholder: string;
  /** Hedef kitle (pazar segmenti / hedeflenen müşteri grubu). */
  hedefKitle?: string;
  /** Projeyi getiren kullanıcı (Kullanıcılar tablosundan). */
  projeyiGetiren?: string;
  /** Projeyi onaylayan kullanıcılar (çoklu seçim — onay isteği). */
  onaylayanlar?: string[];
  /** Proje onay tarihi (ISO). */
  onayTarihi?: string;
  /** Görevlendirilen personel ve yöneticiler (Kullanıcılardan çoklu seçim). */
  gorevliler?: string[];
  /** Projeye özel hak sahibi ve beklenti kayıtları (proje tanıtılırken doldurulur). */
  hakSahipleri?: HakSahibi[];
  modules: ProjectModuleKey[];
  /** Bu projenin kullanacağı dinamik tabloların id'leri (DynamicModule.id). */
  tableIds: string[];
  team: TeamMember[];
  tasks: Task[];
  /** Hareketler — proje aktivite/iletişim günlüğü. */
  activities: ProjectActivity[];
  /** Serbest rapor/değerlendirme metni (PDF rapora dahil edilir). */
  report: string;
  createdAt: string;
}

// ── monday.com esinli görev süreç takibi ───────────────────────────────────
export type TaskStatus = "yapilacak" | "calisiliyor" | "incelemede" | "takildi" | "tamamlandi";

export interface Task {
  id: string;
  name: string;
  owner: string;
  status: TaskStatus;
  priority: Priority;
  start: string;
  end: string;
  /** 0..100 */
  progress: number;
  /** Bağımlı olduğu görev id'leri (finish-to-start). */
  dependsOn?: string[];
}

/** monday paletiyle uyumlu, canlı/doygun durum renkleri. */
export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  yapilacak: { label: "Yapılacak", color: "#9699a6" },
  calisiliyor: { label: "Çalışılıyor", color: "#fdab3d" },
  incelemede: { label: "İncelemede", color: "#a25ddc" },
  takildi: { label: "Takıldı", color: "#e2445c" },
  tamamlandi: { label: "Tamamlandı", color: "#00c875" },
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "yapilacak",
  "calisiliyor",
  "incelemede",
  "takildi",
  "tamamlandi",
];

export const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  taslak: { label: "Taslak", className: "border-line text-muted bg-white/5" },
  baslamadi: { label: "Başlamadı", className: "border-muted/40 text-muted bg-white/5" },
  devam: { label: "Devam Ediyor", className: "border-good/40 text-good bg-good/10" },
  askida: { label: "Askıda", className: "border-warning/40 text-warning bg-warning/10" },
  tamamlandi: { label: "Tamamlandı", className: "border-neon-blue/40 text-neon-blue bg-neon-blue/10" },
  iptal: { label: "İptal Edildi", className: "border-critical/40 text-critical bg-critical/10" },
};

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  dusuk: { label: "Düşük", className: "border-line text-muted" },
  orta: { label: "Orta", className: "border-neon-blue/40 text-neon-blue" },
  yuksek: { label: "Yüksek", className: "border-warning/40 text-warning" },
  kritik: { label: "Kritik", className: "border-critical/40 text-critical" },
};

export const TYPE_LABELS: Record<ProjectType, string> = {
  arge: "Ar-Ge",
  pazarlama: "Pazarlama",
  musteri: "Müşteri Projesi",
  ic: "İç Proje",
};

export const MODULE_LABELS: Record<ProjectModuleKey, string> = {
  gorevler: "Görevler",
  finans: "Finans",
  dokumanlar: "Dökümanlar",
  zaman: "Zaman Çizelgesi",
};

export const ALL_MODULES: ProjectModuleKey[] = ["gorevler", "finans", "dokumanlar", "zaman"];

/** Rol şablonuna göre varsayılan modül erişimi. */
export function defaultAccessForRole(role: RoleKey): Record<ProjectModuleKey, AccessLevel> {
  const map: Record<RoleKey, AccessLevel> = {
    owner: "full",
    manager: "full",
    contributor: "read",
    viewer: "read",
  };
  const base = map[role];
  return { gorevler: base, finans: role === "viewer" ? "none" : base, dokumanlar: base, zaman: base };
}
