import {
  BarChart3,
  FileBarChart,
  FolderKanban,
  FolderPlus,
  Handshake,
  History,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Table2,
  TrendingUp,
  Users,
  Wallet,
  Briefcase,
  Building2,
  Rocket,
  GraduationCap,
  CalendarCheck2,
  ListChecks,
  Inbox,
  StickyNote,
  NotebookPen,
  Folder,
  Gavel,
  LayoutDashboard,
  BookOpen,
  UserPlus,
  Gauge,
  ClipboardList,
  Scale,
  FileText,
  CalendarClock,
  Calculator,
  MessageSquare,
  Package,
  ReceiptText,
  ShoppingCart,
  Activity,
  Banknote,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "@/App";

// ── İki seviyeli navigasyon: sol bar = çalışma alanı, üst bar = o alanın sekmeleri ──
export interface WsTab { icon: LucideIcon; label: string; view: View; match?: (v: View) => boolean; kod?: string; }
export interface Workspace { key: string; label: string; icon: LucideIcon; defaultView: View; tabs: WsTab[]; }

export const WORKSPACES: Workspace[] = [
  {
    key: "buro", label: "Büro Yönetimi", icon: Briefcase, defaultView: "ajandam",
    tabs: [
      { icon: CalendarCheck2, label: "Takvim", view: "ajandam", kod: "T-0078", match: (v) => v === "ajandam" || v === "ajanda" },
      { icon: BookOpen, label: "Ajanda", view: "planlayici", kod: "T-0078" },
      { icon: ListChecks, label: "Görevler", view: "gorev-yonetimi", kod: "T-0056" },
      { icon: Inbox, label: "Onaylar", view: "onaylar", kod: "T-0045", match: (v) => v === "onaylar" || v === "mod:mod-T-0045" },
      { icon: ClipboardList, label: "İstekler", view: "talepler", kod: "T-0076" },
      { icon: StickyNote, label: "Notlar", view: "notlar", kod: "T-0068" },
      { icon: NotebookPen, label: "Toplantı Defteri", view: "tutanak", kod: "T-0063" },
      { icon: BookOpen, label: "Çalışma Defteri", view: "calisma-defteri", kod: "CLS" },
      { icon: Wallet, label: "Kasa Defteri", view: "kasa-defteri", kod: "KASA" },
    ],
  },
  {
    key: "proje", label: "Proje Yönetimi", icon: FolderKanban, defaultView: "projects",
    tabs: [
      { icon: FolderKanban, label: "Tüm Projeler", view: "projects", kod: "PRJ", match: (v) => v === "projects" || v.startsWith("project:") },
      { icon: FolderPlus, label: "Yeni Proje", view: "project-new", kod: "PRJ" },
      { icon: NotebookPen, label: "Proje Defteri", view: "proje-defteri", kod: "T-0086" },
      { icon: Table2, label: "Defter Hareketleri", view: "mod:mod-T-0086", kod: "T-0086" },
      { icon: FileBarChart, label: "Belgeler", view: "evraklar", kod: "EVR", match: (v) => v === "evraklar" || v === "evrak-new" },
    ],
  },
  {
    key: "gayrimenkul", label: "Gayrimenkul Yönetimi", icon: Building2, defaultView: "emlak",
    tabs: [
      { icon: Building2, label: "Panel", view: "emlak", kod: "T-0072" },
      { icon: Table2, label: "Portföy", view: "mod:mod-T-0072", kod: "T-0072" },
      { icon: FileBarChart, label: "Sözleşmeler", view: "mod:mod-T-0073", kod: "T-0073" },
      { icon: Users, label: "Kiracılar", view: "mod:mod-T-0074", kod: "T-0074" },
      { icon: Wallet, label: "Gelir-Gider", view: "mod:mod-T-0075", kod: "T-0075" },
    ],
  },
  {
    key: "finans", label: "Finans Yönetimi", icon: Wallet, defaultView: "finans-merkezi",
    tabs: [
      { icon: Wallet, label: "Muhasebe Merkezi", view: "finans-merkezi", kod: "T-0046" },
      { icon: Package, label: "Stok", view: "muhasebe:stok", kod: "T-0085" },
      { icon: ReceiptText, label: "Masraflar", view: "muhasebe:masraf", kod: "T-0008" },
      { icon: ShoppingCart, label: "Satın Alma", view: "muhasebe:satinalma", kod: "T-0024" },
      { icon: TrendingUp, label: "Satış", view: "muhasebe:satis", kod: "T-0036" },
      { icon: Banknote, label: "Finans", view: "muhasebe:finans", kod: "T-0006" },
      { icon: Activity, label: "Nakit Akış", view: "muhasebe:nakit", kod: "T-0009" },
      { icon: BarChart3, label: "Raporlar", view: "finansal-raporlar", kod: "RPR" },
      { icon: History, label: "Tekrarlayan", view: "tekrarlayan", kod: "T-0015" },
      { icon: TrendingUp, label: "Satış Fırsatları", view: "pipeline", kod: "T-0011" },
      { icon: Gavel, label: "Karar Merkezi", view: "karar-merkezi", kod: "T-0061" },
    ],
  },
  {
    key: "startup", label: "Startup Yönetimi", icon: Rocket, defaultView: "overview",
    tabs: [
      { icon: LayoutDashboard, label: "Dashboard", view: "overview", kod: "DSB" },
    ],
  },
  {
    key: "fikir", label: "Fikir Kulübü", icon: Lightbulb, defaultView: "fikir-kulubu",
    tabs: [
      { icon: Lightbulb, label: "Fikir Panosu", view: "fikir-kulubu", kod: "FKR" },
      { icon: NotebookPen, label: "Fikir Defteri", view: "fikir-defteri", kod: "FKD" },
    ],
  },
  {
    key: "dosya", label: "Döküman Yönetimi", icon: Folder, defaultView: "dosya-kutuphanesi",
    tabs: [
      { icon: Folder, label: "Dosya Kütüphanesi", view: "dosya-kutuphanesi", kod: "T-0067", match: (v) => v === "dosya-kutuphanesi" },
      { icon: BookOpen, label: "Dokümanlar / Wiki", view: "dokumanlar", kod: "T-0064" },
    ],
  },
  {
    key: "hukuk", label: "Hukuk Yönetimi", icon: Scale, defaultView: "hukuk",
    tabs: [
      { icon: LayoutDashboard, label: "Panel", view: "hukuk" },
      { icon: FileText, label: "Davalar & İcra", view: "mod:mod-T-0016" },
      { icon: CalendarClock, label: "Duruşmalar", view: "mod:mod-T-0082" },
      { icon: Users, label: "Müvekkiller", view: "mod:mod-T-0083" },
      { icon: Wallet, label: "Tahsilat/Masraf", view: "mod:mod-T-0084" },
      { icon: ShieldCheck, label: "Avukatlar", view: "mod:mod-T-0017" },
      { icon: Gavel, label: "Dilekçe (AI)", view: "hukuk-dilekce" },
      { icon: Calculator, label: "Faiz/Harç", view: "hukuk-hesap" },
    ],
  },
  {
    key: "akademi", label: "Timay İK & Akademi", icon: GraduationCap, defaultView: "ik",
    tabs: [
      { icon: Briefcase, label: "İK Paneli", view: "ik", kod: "T-0025" },
      { icon: Users, label: "Çalışanlar", view: "mod:mod-T-0025", kod: "T-0025" },
      { icon: UserPlus, label: "İşe Alım", view: "mod:mod-T-0069", kod: "T-0069" },
      { icon: Gauge, label: "Performans", view: "mod:mod-T-0070", kod: "T-0070" },
      { icon: BookOpen, label: "Eğitimler", view: "akademi", kod: "AKD" },
      { icon: Users, label: "Kişiler", view: "users", kod: "USR", match: (v) => v === "users" || v === "roles" },
    ],
  },
];

/** Bir görünümün hangi çalışma alanına ait olduğunu bulur (yoksa null → mevcut kalır). */
export function workspaceForView(view: View): string | null {
  for (const ws of WORKSPACES) {
    if (ws.defaultView === view) return ws.key;
    for (const t of ws.tabs) {
      if (t.match ? t.match(view) : t.view === view) return ws.key;
    }
  }
  return null;
}

// Ana kategoriler (üst bar) + alt öğeler (sol bar).
export type CatKey = "yonetim" | "panel" | "projeler" | "isbirligi" | "kullanicilar" | "ayarlar";

export interface NavItemDef {
  icon: LucideIcon;
  label: string;
  view: View;
  badge?: string;
  match?: (v: View) => boolean;
}

export interface CategoryDef {
  key: CatKey;
  label: string;
  /** Kategori sekmesine tıklanınca açılacak varsayılan görünüm. */
  defaultView: View;
  items: NavItemDef[];
  /** true ise ayrıca dinamik modül listesi + "Modül Oluştur" eklenir. */
  dynamic?: boolean;
  /** true ise üst barda gösterilmez (yalnız hub kartlarından/iç navigasyonla erişilir). */
  hidden?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "yonetim",
    label: "Pano",
    defaultView: "buro-merkezi",
    items: [],
    hidden: true,
  },
  {
    key: "panel",
    label: "Panel",
    defaultView: "overview",
    items: [],
    hidden: true,
  },
  {
    key: "projeler",
    label: "Projeler",
    defaultView: "bi",
    hidden: true,
    items: [
      { icon: BarChart3, label: "İş Zekası", view: "bi" },
      { icon: TrendingUp, label: "Satış Fırsatları", view: "pipeline" },
      { icon: FolderKanban, label: "Tüm Projeler", view: "projects", match: (v) => v === "projects" || v.startsWith("project:") },
      { icon: FolderPlus, label: "Yeni Proje", view: "project-new" },
      { icon: FileBarChart, label: "Evraklar", view: "evraklar", match: (v) => v === "evraklar" || v === "evrak-new" },
    ],
  },
  {
    key: "isbirligi",
    label: "İş Birliği",
    defaultView: "overview",
    hidden: true,
    items: [
      { icon: Handshake, label: "Ortaklıklar", badge: "5", view: "overview" },
      { icon: Wallet, label: "Fonlar", badge: "3", view: "overview" },
      { icon: FileBarChart, label: "Raporlar", view: "overview" },
    ],
  },
  {
    key: "kullanicilar",
    label: "Kullanıcılar",
    defaultView: "users",
    hidden: true,
    items: [
      { icon: Users, label: "Kullanıcılar", view: "users" },
      { icon: ShieldCheck, label: "Yetki ve Roller", view: "roles" },
    ],
  },
  {
    key: "ayarlar",
    label: "Ayarlar",
    defaultView: "record-add",
    hidden: true,
    items: [
      { icon: Table2, label: "Tablo Kayıt Ekle", view: "record-add", match: (v) => v === "record-add" || v.startsWith("mod:") },
      { icon: FileBarChart, label: "Evraklar", view: "evraklar", match: (v) => v === "evraklar" || v === "evrak-new" },
      { icon: MessageSquare, label: "Mesaj Logu", view: "mod:mod-T-0087" },
      { icon: History, label: "Denetim İzi", view: "audit" },
      { icon: Settings, label: "Genel Ayarlar", view: "overview" },
      { icon: LifeBuoy, label: "Destek", view: "overview" },
    ],
  },
];

/** Bir görünümün hangi ana kategoriye ait olduğunu belirler (belirsizse mevcut kalır). */
export function categoryForView(view: View, current: CatKey): CatKey {
  if (view === "ajandam" || view === "finans-merkezi" || view === "finansal-raporlar" || view === "tekrarlayan" || view === "karar-merkezi" || view === "buro-merkezi" || view === "ajanda" || view === "dokumanlar" || view === "dosya-kutuphanesi" || view === "gorev-yonetimi" || view === "notlar" || view === "tutanak" || view === "onaylar") return "yonetim";
  if (view === "bi" || view === "pipeline" || view.startsWith("project")) return "projeler";
  if (view === "users" || view === "roles") return "kullanicilar";
  // Evraklar hem Proje Yönetimi hem Ayarlar barında var — bulunulan kategoriyi koru.
  if (view === "evraklar" || view === "evrak-new") return current;
  if (
    view === "audit" || view === "tables" || view === "db-schema" ||
    view === "record-add" || view === "builder" || view.startsWith("edit:") || view.startsWith("mod:")
  ) return "ayarlar";
  return current;
}
