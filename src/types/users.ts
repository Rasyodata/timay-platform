import type { RoleKey } from "@/types/modules";

// ─────────────────────────────────────────────────────────────────────────
// Kullanıcı yönetimi + rol şablonları (yetenekler) + departman yetki mirası.
// ─────────────────────────────────────────────────────────────────────────

export const DEPARTMENTS = ["Yazılım", "Finans", "Pazarlama", "Yönetim", "Dış Kaynak"] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** Kullanıcı tipleri (cari/kişi sınıfı). */
export const USER_TYPES = ["Müşteri", "Satıcı", "Personel", "Hak Sahibi", "Danışman", "Yönetici"] as const;
export type UserType = (typeof USER_TYPES)[number];

/** Yapılandırılmış adres (sokak · mahalle · ilçe · il). */
export interface Adres {
  sokak?: string;
  mahalle?: string;
  ilce?: string;
  il?: string;
}

/** Adresi "Sokak, Mahalle - İlçe - İl" biçiminde metne çevirir. */
export function formatAdres(a?: Adres): string {
  if (!a) return "";
  const sm = [a.sokak, a.mahalle].filter(Boolean).join(", ");
  return [sm, a.ilce, a.il].filter(Boolean).join(" - ");
}

/** Adres tipleri (T-0003 Adres Kartı). */
export const ADRES_TIPLERI = ["İş", "Fatura Adresi", "Ev", "Diğer"] as const;

export interface User {
  id: string;
  /** Kullanıcı kodu (ör. K-0001) — Adres Kartı (T-0003) bu kodla bağlanır. */
  kod?: string;
  name: string;
  email: string;
  /** İletişim — telefon. */
  phone?: string;
  /** Departman — T-0004 (Departman Tanımları) kayıtlarından. */
  department: string;
  /** Kullanıcı tipi — T-0002 (Cari Tür Kodları) kayıtlarından gelir. */
  userType?: string;
  /** Cari kart bilgileri. */
  adres?: Adres;
  faturaAdresi?: Adres;
  vergiDairesi?: string;
  vergiNo?: string;
  tcNo?: string;
  /** Seçili adres kartı (T-0003 adres kodu). */
  adresSecim?: string;
  /** Avukat ise: baro ve baro sicil no. */
  baro?: string;
  sicilNo?: string;
  role: RoleKey;
  active: boolean;
}

/** Sistem geneli yetenekler (rol şablonlarının belirlediği). */
export type Capability =
  | "proje_olustur"
  | "proje_sil"
  | "butce_goruntule"
  | "uye_yonet"
  | "gorev_ata"
  | "modul_olustur"
  | "rapor_goruntule";

export const CAPABILITIES: Capability[] = [
  "proje_olustur",
  "proje_sil",
  "butce_goruntule",
  "uye_yonet",
  "gorev_ata",
  "modul_olustur",
  "rapor_goruntule",
];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  proje_olustur: "Proje Oluştur",
  proje_sil: "Proje Sil",
  butce_goruntule: "Bütçe Görüntüle",
  uye_yonet: "Üye & Yetki Yönet",
  gorev_ata: "Görev Ata/Düzenle",
  modul_olustur: "Modül Oluştur",
  rapor_goruntule: "Rapor Görüntüle",
};

/** Rol şablonlarının varsayılan yetenekleri. */
export const DEFAULT_CAPS: Record<RoleKey, Record<Capability, boolean>> = {
  owner: {
    proje_olustur: true, proje_sil: true, butce_goruntule: true, uye_yonet: true,
    gorev_ata: true, modul_olustur: true, rapor_goruntule: true,
  },
  manager: {
    proje_olustur: true, proje_sil: false, butce_goruntule: true, uye_yonet: true,
    gorev_ata: true, modul_olustur: false, rapor_goruntule: true,
  },
  contributor: {
    proje_olustur: false, proje_sil: false, butce_goruntule: false, uye_yonet: false,
    gorev_ata: true, modul_olustur: false, rapor_goruntule: false,
  },
  viewer: {
    proje_olustur: false, proje_sil: false, butce_goruntule: false, uye_yonet: false,
    gorev_ata: false, modul_olustur: false, rapor_goruntule: false,
  },
};

/** Departman → otomatik rol mirası: "Pazarlama departmanındaki herkes bu projeyi görür" gibi. */
export interface InheritanceRule {
  id: string;
  department: Department;
  role: RoleKey;
  scope: string; // ör. "Tüm Pazarlama Projeleri"
}
