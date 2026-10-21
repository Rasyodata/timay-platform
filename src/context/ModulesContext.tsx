import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PERMS,
  type DynamicField,
  type DynamicModule,
  type DynamicRecord,
} from "@/types/modules";
import { useAudit } from "@/context/AuditContext";

const STORAGE_KEY = "timay.dynamic-modules.v71";

interface NewModuleInput {
  name: string;
  description: string;
  icon: string;
  fields: Omit<DynamicField, "id">[];
  kind?: "tablo" | "evrak";
}

/** Düzenlemede gelen alanlar — mevcut alanlar id taşır (kayıt verisini korur). */
export type FieldPatch = Omit<DynamicField, "id"> & { id?: string };

interface ModulesState {
  modules: DynamicModule[];
  getModule: (id: string) => DynamicModule | undefined;
  createModule: (input: NewModuleInput) => DynamicModule;
  updateModule: (id: string, patch: { name: string; description: string; icon: string; fields: FieldPatch[] }) => void;
  deleteModule: (id: string) => void;
  toggleActive: (id: string) => void;
  addRecord: (moduleId: string, data: Record<string, unknown>) => void;
  updateRecord: (moduleId: string, recordId: string, data: Record<string, unknown>) => void;
  deleteRecord: (moduleId: string, recordId: string) => void;
  clearAllRecords: () => void;
}

const Ctx = createContext<ModulesState | null>(null);

// Benzersiz, artan id — sadece bu oturum/istemci için yeterli.
let counter = 100;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function tableNo(code: string): number {
  const m = code.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
function pad4(n: number): string {
  return String(n).padStart(4, "0");
}
/** Mevcut tablolara göre bir sonraki TBL kodu. */
function nextTableCode(mods: DynamicModule[]): string {
  const max = mods.filter((m) => m.code.startsWith("T-")).reduce((mx, m) => Math.max(mx, tableNo(m.code)), 14);
  return `T-${pad4(max + 1)}`;
}
/** Evraklar için bir sonraki EVR kodu. */
function nextEvrakCode(mods: DynamicModule[]): string {
  const max = mods.filter((m) => m.code.startsWith("EVR-")).reduce((mx, m) => Math.max(mx, tableNo(m.code)), 0);
  return `EVR-${pad4(max + 1)}`;
}

// Yeni tablolar için varsayılan generic alan seti (sonradan "Tabloyu Düzenle" ile değiştirilir).
function genericFields(): DynamicField[] {
  return [
    { id: "f1", code: "ad", name: "Ad", type: "TEXT", required: true, visibility: "EVERYONE" },
    { id: "f2", code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
    { id: "f3", code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
  ];
}

// K018_TPR sistem yöneticisindeki örnek sistem tabloları.
const SEED_TABLES: [string, string, string][] = [
  ["T-0018", "Sözleşmeler Tablosu", "İnşaat / İK / danışmanlık / tedarik sözleşmeleri"],
  ["T-0019", "Satıcı / Prim Tablosu", "Satıcı cari hesapları ve prim bakiyeleri"],
  ["T-0020", "Projeler Tablosu", "İnşaat ve gayrimenkul proje kayıtları"],
  ["T-0001", "Kullanıcı Cari Kart", "Kullanıcılar ve cari kartlar (müşteri · satıcı · personel · hak sahibi · danışman · yönetici) · iletişim"],
  ["T-0027", "Ödeme Sözü Kartı", "Ödeme taahhüdü · tutar · vade · durum"],
  ["T-0028", "Tahminlenen Bütçe Çıkış Kartı", "Öngörülen harcama · çıkış tipi/türü · tekrar · tahmini tutar"],
  ["T-0029", "Gider Kartı", "Düzenli gider (kira, maaş, YK, mali müşavir…) · tekrarlı çıkış"],
  ["T-0031", "Yetki Ana Grup Tablosu", "Yetki grubu şablonu · temel rol · varsayılan düzey · kapsam modülleri"],
  ["T-0032", "Kayıt Grupları Tablosu", "Kart türüne göre gruplar (ör. Dava → Hukuk Davaları) · kart tanımlarında seçilir"],
  ["T-0033", "İnşaat Yapı Sınıfı ve Grup Tablosu", "Yapı sınıfı/grubu · sınıf tanımı · 2026 birim maliyet (TL/m²) · yaygın yapı türü örnekleri"],
  ["T-0034", "İnşaat Maliyet Hesaplama Tablosu", "Yapı sınıfı × m² = maliyet (T-0033 birim maliyetinden) · KDV hariç %10 müteahhit kârı dahil"],
  ["T-0035", "Satın Alma Tablosu", "Daire/arsa/dükkan satın alımları · proje · satıcı · tutar"],
  ["T-0037", "Giriş / Çıkış Tablosu", "Daire/arsa giriş-çıkış takibi · giriş tipi (müşteri/yap-sat/kat karşılığı) · proje"],
  ["T-0038", "Proje Tablosu", "Proje tipi (Yap-Sat/Kat Karşılığı) · künye · il/ilçe · arsa/inşaat/satılabilir m² · daire/dükkan · hedef maliyet"],
  ["T-0039", "Personel Görev Tablosu", "Departman/göreve göre standart görevler (ör. Büro Asistanı) + karta iş ekleme"],
  ["T-0040", "İş Takvimi Tablosu", "Her personelin günlük/haftalık/aylık işleri · durum takibi"],
  ["T-0041", "Belge Yönetimi Tablosu", "Sekreter/asistan günlük kayıt defteri · gelen kişi/telefon/evrak/istek · ofise giriş-çıkış · konum"],
];

type FieldDef = Omit<DynamicField, "id">;
function mkTbl(code: string, name: string, description: string, icon: string, fieldDefs: FieldDef[], records: DynamicRecord[] = [], kind: "tablo" | "evrak" = "tablo"): DynamicModule {
  return {
    id: `mod-${code}`,
    code,
    name,
    description,
    tableName: `dynamic_table_${tableNo(code)}`,
    icon,
    kind,
    active: true,
    createdAt: "2026-10-14",
    perms: { ...DEFAULT_PERMS },
    fields: fieldDefs.map((f, i) => ({ ...f, id: `f${i + 1}` })),
    records,
  };
}


// ── İş Akışı (Workflow) onay hiyerarşisi — tutar & bütçe durumuna göre kademe ──
// < 50K & Bütçe İçi → Otomatik · 50K–250K veya Bütçe Dışı → Departman Müdürü · > 250K → CEO + CFO · Sıfır bütçe/risk → Bloke
const WF_BUTCE_OPTS = ["Bütçe İçi", "Bütçe Dışı", "Sıfır Bütçe"];
const WF_KADEME_OPTS = [
  "Otomatik Onay (<50K · Bütçe İçi)",
  "Departman Müdürü Onayı (50K–250K / Bütçe Dışı)",
  "Genel Müdür (CEO) + CFO Uyum Onayı (>250K)",
  "Bloke (Sıfır Bütçe / Aşırı Risk)",
];
// Para akışı tablolarına eklenecek ortak Bütçe + Onay Kademesi alanları.
function workflowFields(): FieldDef[] {
  return [
    { code: "butce_durumu", name: "Bütçe Durumu", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: WF_BUTCE_OPTS },
    { code: "onay_kademesi", name: "Onay Kademesi (Workflow)", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: WF_KADEME_OPTS },
  ];
}

// Proje kartı sekmelerinde kullanılan özel tablolar.
function specialTables(): DynamicModule[] {
  return [
    mkTbl("T-0002", "Cari Tür Kodları Tanımlama",
      "Cari türleri (Kullanıcı Tipi) ve muhasebe kod önekleri (cari tür kodu).", "Table2",
      [
        { code: "ad", name: "Cari Tür", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kod", name: "Cari Tür Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "ct1", ad: "Müşteri", kod: "120", aciklama: "Alıcılar hesabı", durum: "Aktif" },
        { id: "ct2", ad: "Satıcı", kod: "320", aciklama: "Satıcılar hesabı", durum: "Aktif" },
        { id: "ct3", ad: "Personel", kod: "335", aciklama: "Personele borçlar", durum: "Aktif" },
        { id: "ct4", ad: "Hak Sahibi", kod: "500", aciklama: "Ortaklık / sermaye", durum: "Aktif" },
        { id: "ct5", ad: "Danışman", kod: "336", aciklama: "Diğer çeşitli borçlar", durum: "Aktif" },
        { id: "ct6", ad: "Yönetici", kod: "900", aciklama: "Yönetim", durum: "Aktif" },
        { id: "ct7", ad: "Avukat", kod: "131", aciklama: "Hukuk danışmanlığı / vekâlet", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0017", "Avukat Tanıtım Tablosu",
      "Tanımlı avukatlar · baro/sicil · büro · uzmanlık · vekâlet yetkisi (avukat T-0001'den seçilir)", "ShieldCheck",
      [
        { code: "avukat", name: "Avukat", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "baro", name: "Baro", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sicil_no", name: "Baro Sicil No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "buro", name: "Büro / Ofis", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "uzmanlik", name: "Uzmanlık Alanı", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Ticaret Hukuku", "İş Hukuku", "İcra & İflas", "Ceza Hukuku", "Gayrimenkul", "İdare Hukuku", "Aile Hukuku", "Diğer"] },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "eposta", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "vekalet_yetki", name: "Vekâlet / Yetki Kapsamı", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "av1", avukat: "Av. Can Yılmaz", baro: "İstanbul Barosu", sicil_no: "48217", buro: "Yılmaz Hukuk Bürosu", uzmanlik: "Ticaret Hukuku", telefon: "0532 777 88 99", eposta: "can@hukuk.co", vekalet_yetki: "Dava takip · icra · sulh görüşmesi · sözleşme inceleme", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0016", "Dava & İcra Tablosu",
      "Dava/İcra girişi · yeni dosya yönetici onayına düşer · avukat/personel yetkileri 'Avukat Atama' / 'Personel Atama' ekranlarından verilir.", "FileText",
      [
        { code: "dosya_no", name: "Dosya No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "dosya_konusu", name: "Dosya Konusu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "islem_tipi", name: "İşlem Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Dava", "İcra"] },
        { code: "dava_turu", name: "Dava / İcra Türü", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Hukuk Davası", "Ceza Davası", "İdari Dava", "İcra Takibi", "İhtiyati Haciz", "Diğer"] },
        { code: "taraf", name: "Taraf Durumu", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Lehine", "Aleyhine"] },
        { code: "anlasma_butce", name: "Anlaşma / Bütçe (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "dava_gideri", name: "Dava / İcra Gideri (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "odeme_tarihi", name: "Ödeme Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "vekaletname", name: "Vekaletname / Dayanak Dosyası", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "muvekkil", name: "Müvekkil (T-0083)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0083" },
        { code: "karsi_taraf", name: "Karşı Taraf / Borçlu", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "avukat", name: "Sorumlu Avukat (T-0017)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0017" },
        { code: "grup", name: "Grup (opsiyonel)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Onay Bekliyor", "Onaylandı", "Devam Ediyor", "Sonuçlandı", "Reddedildi"] },
        { code: "aciklama", name: "Açıklama / Strateji Notu", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "di1", dosya_no: "DI-2026-0001", dosya_konusu: "Tedarikçi sözleşme ihlali", islem_tipi: "Dava", dava_turu: "Hukuk Davası", taraf: "Lehine", anlasma_butce: 150000, dava_gideri: 12000, odeme_tarihi: "2026-11-15", vekaletname: "VEK-2026-044", muvekkil: "Timay Teknoloji A.Ş.", karsi_taraf: "Beta Tedarik Ltd.", avukat: "Av. Can Yılmaz", grup: "Hukuk Davaları", durum: "Devam Ediyor", aciklama: "İlk duruşma Kasım; sulh görüşmesi değerlendiriliyor." },
        { id: "di2", dosya_no: "DI-2026-0002", dosya_konusu: "Kira alacağı icra takibi", islem_tipi: "İcra", dava_turu: "İcra Takibi", taraf: "Lehine", anlasma_butce: 60000, dava_gideri: 4500, odeme_tarihi: "2026-10-30", vekaletname: "VEK-2026-051", muvekkil: "Timay Teknoloji A.Ş.", karsi_taraf: "Delta Danışmanlık", avukat: "Av. Can Yılmaz", grup: "İcra Dosyaları", durum: "Onay Bekliyor", aciklama: "Ödeme emri tebliğ edildi." },
      ],
    ),
    mkTbl("T-0082", "Duruşma & İşlem Takvimi",
      "Dava/icra dosyalarına bağlı duruşma, keşif, tebligat ve süre takibi · yaklaşan işlemler panelde uyarılır.", "CalendarClock",
      [
        { code: "dosya_no", name: "Dosya (T-0016)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0016" },
        { code: "islem_turu", name: "İşlem Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Duruşma", "Ön İnceleme", "Keşif", "Tebligat", "Süre / Zamanaşımı", "İcra İşlemi", "Müzekkere", "Diğer"] },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "mahkeme", name: "Mahkeme / İcra Dairesi", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "avukat", name: "Sorumlu Avukat (T-0017)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0017" },
        { code: "sonraki_islem", name: "Sonraki İşlem / Hazırlık", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Bekliyor", "Yapıldı", "Ertelendi", "İptal"] },
        { code: "aciklama", name: "Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "du1", dosya_no: "DI-2026-0001", islem_turu: "Duruşma", tarih: "2026-11-12", saat: "10:30", mahkeme: "İstanbul 3. Asliye Ticaret Mah.", sonraki_islem: "Tanık listesi ve delil dilekçesi sun", durum: "Bekliyor", aciklama: "İlk duruşma; sulh görüşmesi değerlendirilecek." },
        { id: "du2", dosya_no: "DI-2026-0002", islem_turu: "İcra İşlemi", tarih: "2026-10-30", saat: "", mahkeme: "İstanbul 8. İcra Dairesi", sonraki_islem: "Ödeme emri kesinleşme kontrolü", durum: "Bekliyor", aciklama: "Haciz talebi hazırlığı." },
      ],
    ),
    mkTbl("T-0083", "Müvekkiller",
      "Müvekkil kartları · iletişim · cari bakiye · bağlı dosyalar.", "Users",
      [
        { code: "ad", name: "Ad / Unvan", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Gerçek Kişi", "Tüzel Kişi"] },
        { code: "tc_vergi", name: "TC / Vergi No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "eposta", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "adres", name: "Adres", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "bakiye", name: "Cari Bakiye (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "mv1", ad: "Timay Teknoloji A.Ş.", tur: "Tüzel Kişi", tc_vergi: "1234567890", telefon: "0352 000 00 00", eposta: "hukuk@timay.co", adres: "Kayseri", bakiye: 150000, durum: "Aktif" },
      ],
    ),
    mkTbl("T-0084", "Hukuk Tahsilat & Masraf",
      "Dosya bazlı tahsilat (vekâlet ücreti, avans) ve masraf (harç, posta, bilirkişi) muhasebesi · makbuz takibi.", "Wallet",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "dosya_no", name: "Dosya (T-0016)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0016" },
        { code: "muvekkil", name: "Müvekkil (T-0083)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0083" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Tahsilat (+)", "Masraf (−)"] },
        { code: "kalem", name: "Kalem", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Vekâlet Ücreti", "Avans / Peşin", "Harç", "Posta / Tebligat", "Bilirkişi", "Keşif", "Noter / Vekâletname", "Dosya Masrafı", "Diğer"] },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "kdv_tutari", name: "KDV / Stopaj (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kasa", name: "Kasa / Banka (T-0006)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006" },
        { code: "makbuz_no", name: "Makbuz / Belge No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tahsil_durumu", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Tahsil Edildi", "Bekliyor", "Kısmi"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "tm1", tarih: "2026-10-18", dosya_no: "DI-2026-0001", muvekkil: "Timay Teknoloji A.Ş.", tur: "Tahsilat (+)", kalem: "Avans / Peşin", tutar: 25000, makbuz_no: "MKB-2026-0007", tahsil_durumu: "Tahsil Edildi", aciklama: "Dava avansı." },
        { id: "tm2", tarih: "2026-10-20", dosya_no: "DI-2026-0001", muvekkil: "Timay Teknoloji A.Ş.", tur: "Masraf (−)", kalem: "Harç", tutar: 6831, makbuz_no: "", tahsil_durumu: "Tahsil Edildi", aciklama: "Peşin harç." },
      ],
    ),
    mkTbl("T-0049", "Randevu / Takvim Tablosu",
      "Büro randevu ve takvim yönetimi (ONLYOFFICE/Randevu Sistemi tarzı) · danışan/müşteri · tarih-saat · tür · SMS hatırlatma.", "Calendar",
      [
        { code: "baslik", name: "Konu / Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "danisan", name: "Danışan / Müşteri (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "sure_dk", name: "Süre (dk)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "personel", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Toplantı", "Yüz Yüze Görüşme", "Telefon", "Online", "Saha Ziyareti"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Planlandı", "Tamamlandı", "Ertelendi", "İptal", "Gelmedi"] },
        { code: "sms_hatirlatma", name: "SMS Hatırlatma", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "telefon", name: "Hatırlatma Telefonu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "hatirlatma_zamani", name: "Hatırlatma Zamanı", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["15 dk önce", "1 saat önce", "1 gün önce", "Zamanında"] },
        { code: "not", name: "Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "rv1", baslik: "Acme sözleşme görüşmesi", danisan: "Acme A.Ş.", tarih: "2026-10-16", saat: "10:30", sure_dk: 45, personel: "Kadir Fırat", tur: "Toplantı", durum: "Planlandı", sms_hatirlatma: true, telefon: "0532 333 44 55", hatirlatma_zamani: "1 saat önce", not: "Yenileme teklifi sunulacak." },
        { id: "rv2", baslik: "Beta teknik değerlendirme", danisan: "Beta Tedarik Ltd.", tarih: "2026-10-16", saat: "14:00", sure_dk: 60, personel: "Halim Bey", tur: "Online", durum: "Planlandı", sms_hatirlatma: false, telefon: "", hatirlatma_zamani: "", not: "Zoom üzerinden." },
        { id: "rv3", baslik: "Delta ön görüşme", danisan: "Delta Danışmanlık", tarih: "2026-10-18", saat: "11:00", sure_dk: 30, personel: "Kadir Fırat", tur: "Telefon", durum: "Planlandı", sms_hatirlatma: true, telefon: "0216 333 22 44", hatirlatma_zamani: "1 gün önce", not: "" },
      ],
    ),
    mkTbl("T-0050", "Mesai / Giriş-Çıkış Tablosu",
      "Personel devam/mesai takibi (OfficeOps/Phonist tarzı attendance) · giriş-çıkış saati · mesai tipi · durum.", "Clock",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "giris_saat", name: "Giriş", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "cikis_saat", name: "Çıkış", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "toplam_saat", name: "Toplam Saat", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "mesai_tipi", name: "Mesai Tipi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Normal", "Fazla Mesai", "Vardiya", "Yarım Gün", "Uzaktan"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Geldi", "İzinli", "Raporlu", "Devamsız", "Resmi Tatil"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ms1", personel: "Kadir Fırat", tarih: "2026-10-16", giris_saat: "08:55", cikis_saat: "18:05", toplam_saat: 9, mesai_tipi: "Normal", durum: "Geldi", aciklama: "" },
        { id: "ms2", personel: "Halim Bey", tarih: "2026-10-16", giris_saat: "09:10", cikis_saat: "", toplam_saat: 0, mesai_tipi: "Uzaktan", durum: "Geldi", aciklama: "Evden çalışma." },
        { id: "ms3", personel: "Tuğba Yörük", tarih: "2026-10-16", giris_saat: "", cikis_saat: "", toplam_saat: 0, mesai_tipi: "", durum: "İzinli", aciklama: "Yıllık izin." },
      ],
    ),
    mkTbl("T-0051", "Toplantı Odası Rezervasyon Tablosu",
      "Toplantı odası / salon rezervasyonları (OfficeOps tarzı) · oda · saat aralığı · katılımcı · durum.", "DoorOpen",
      [
        { code: "oda", name: "Oda / Salon", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Toplantı Odası 1", "Toplantı Odası 2", "Eğitim Salonu", "Yönetim Odası"] },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "baslangic", name: "Başlangıç", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "konu", name: "Konu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "rezerve_eden", name: "Rezerve Eden (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "katilimci", name: "Katılımcı Sayısı", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "sms_hatirlatma", name: "SMS Hatırlatma", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "telefon", name: "Hatırlatma Telefonu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "hatirlatma_zamani", name: "Hatırlatma Zamanı", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["15 dk önce", "1 saat önce", "1 gün önce", "Zamanında"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Onaylandı", "Bekliyor", "İptal"] },
      ],
      [
        { id: "to1", oda: "Toplantı Odası 1", tarih: "2026-10-16", baslangic: "10:30", bitis: "11:15", konu: "Acme sözleşme görüşmesi", rezerve_eden: "Kadir Fırat", katilimci: 4, sms_hatirlatma: true, telefon: "0532 333 44 55", hatirlatma_zamani: "15 dk önce", durum: "Onaylandı" },
        { id: "to2", oda: "Eğitim Salonu", tarih: "2026-10-17", baslangic: "14:00", bitis: "16:00", konu: "Ürün eğitimi", rezerve_eden: "Halim Bey", katilimci: 12, sms_hatirlatma: true, telefon: "0532 222 33 44", hatirlatma_zamani: "1 gün önce", durum: "Bekliyor" },
      ],
    ),
    mkTbl("T-0052", "Telefon / Görüşme Kayıt Tablosu",
      "Sekreterya telefon ve görüşme kayıtları (Randevu Sistemi tarzı) · gelen/giden · cari · takip.", "Phone",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "yon", name: "Yön", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Gelen", "Giden"] },
        { code: "cari", name: "Arayan / Aranan (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "konu", name: "Konu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sonuc", name: "Sonuç / Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "takip", name: "Takip Gerekli", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "takip_tarihi", name: "Takip Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
      ],
      [
        { id: "tf1", tarih: "2026-10-16", saat: "09:20", yon: "Gelen", cari: "Acme A.Ş.", telefon: "0212 555 00 11", konu: "Teklif durumu sorgusu", sonuc: "Teklif cuma gönderilecek.", takip: true, takip_tarihi: "2026-10-18", sorumlu: "Kadir Fırat" },
        { id: "tf2", tarih: "2026-10-16", saat: "11:45", yon: "Giden", cari: "Delta Danışmanlık", telefon: "0216 333 22 44", konu: "Randevu teyidi", sonuc: "18 Ekim 11:00 teyit edildi.", takip: false, takip_tarihi: "", sorumlu: "Tuğba Yörük" },
      ],
    ),
    mkTbl("T-0053", "İzin Talepleri Tablosu",
      "Personel izin talepleri (HR) · izin türü · tarih aralığı · gün · onay durumu.", "CalendarDays",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "izin_turu", name: "İzin Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yıllık İzin", "Mazeret İzni", "Hastalık (Rapor)", "Ücretsiz İzin", "Doğum İzni", "Babalık İzni", "Evlilik İzni"] },
        { code: "baslangic", name: "Başlangıç", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "gun", name: "Gün Sayısı", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Onay Bekliyor", "Onaylandı", "Reddedildi", "İptal"] },
        { code: "onaylayan", name: "Onaylayan (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "iz1", personel: "Tuğba Yörük", izin_turu: "Yıllık İzin", baslangic: "2026-10-16", bitis: "2026-10-20", gun: 5, durum: "Onaylandı", onaylayan: "Şevket Kaan", aciklama: "Yıllık izin." },
        { id: "iz2", personel: "Kadir Fırat", izin_turu: "Mazeret İzni", baslangic: "2026-10-22", bitis: "2026-10-22", gun: 1, durum: "Onay Bekliyor", onaylayan: "", aciklama: "Sağlık raporu randevusu." },
      ],
    ),
    mkTbl("T-0054", "Vardiya / Mesai Planı Tablosu",
      "Personel vardiya/mesai planlaması (Phonist shift tarzı) · vardiya · saat aralığı · lokasyon.", "Clock",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "vardiya", name: "Vardiya", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Sabah (08-16)", "Akşam (16-24)", "Gece (24-08)", "Esnek", "İzinli"] },
        { code: "baslangic", name: "Başlangıç", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "lokasyon", name: "Lokasyon", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Ofis", "Saha", "Uzaktan", "Şube"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Planlandı", "Gerçekleşti", "Değişti", "İptal"] },
      ],
      [
        { id: "vp1", personel: "Kadir Fırat", tarih: "2026-10-16", vardiya: "Sabah (08-16)", baslangic: "08:00", bitis: "16:00", lokasyon: "Ofis", durum: "Gerçekleşti" },
        { id: "vp2", personel: "Halim Bey", tarih: "2026-10-16", vardiya: "Esnek", baslangic: "09:00", bitis: "18:00", lokasyon: "Uzaktan", durum: "Planlandı" },
      ],
    ),
    mkTbl("T-0055", "Zimmet / Demirbaş Tablosu",
      "Ofis demirbaş ve zimmet takibi · tür · seri no · zimmetli personel · değer · durum.", "Package",
      [
        { code: "demirbas", name: "Demirbaş Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Bilgisayar", "Telefon", "Araç", "Mobilya", "Yazılım Lisansı", "Makine", "Diğer"] },
        { code: "seri_no", name: "Seri / Demirbaş No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "zimmetli", name: "Zimmetli (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "zimmet_tarihi", name: "Zimmet Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "deger", name: "Değer (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Aktif (Zimmetli)", "İade Edildi", "Arızalı", "Bakımda", "Hurda"] },
      ],
      [
        { id: "zm1", demirbas: "Dell Latitude Dizüstü", tur: "Bilgisayar", seri_no: "DL-2026-014", zimmetli: "Halim Bey", zimmet_tarihi: "2025-03-01", deger: 42000, durum: "Aktif (Zimmetli)" },
        { id: "zm2", demirbas: "iPhone 15 Kurumsal Hat", tur: "Telefon", seri_no: "IP-2026-003", zimmetli: "Kadir Fırat", zimmet_tarihi: "2025-06-15", deger: 55000, durum: "Aktif (Zimmetli)" },
        { id: "zm3", demirbas: "JetBrains All Products Lisansı", tur: "Yazılım Lisansı", seri_no: "JB-2026-01", zimmetli: "Halim Bey", zimmet_tarihi: "2026-10-09", deger: 15000, durum: "Aktif (Zimmetli)" },
      ],
    ),
    mkTbl("T-0056", "Görev / İş Atama Tablosu",
      "Personele görev atama ve takip (ONLYOFFICE task tarzı) · öncelik · termin · ilerleme · durum.", "ClipboardList",
      [
        { code: "baslik", name: "Görev", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "atanan", name: "Atanan (T-0001)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "oncelik", name: "Öncelik", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek", "Acil"] },
        { code: "baslangic", name: "Başlangıç", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "termin", name: "Termin", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yapılacak", "Devam Ediyor", "Beklemede", "Tamamlandı", "Gecikti"] },
        { code: "ilerleme", name: "İlerleme (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "etiket", name: "Etiketler (Labels)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tahmini_saat", name: "Tahmini Süre (saat)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "harcanan_saat", name: "Harcanan Süre (saat)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "ust_gorev", name: "Üst Görev (T-0056)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0056" },
        { code: "bagimli", name: "Bağımlı Olduğu Görev (T-0056)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0056" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "gv1", baslik: "Acme teklif dokümanı hazırla", atanan: "Kadir Fırat", oncelik: "Yüksek", baslangic: "2026-10-16", termin: "2026-10-18", durum: "Devam Ediyor", ilerleme: 60, etiket: "satış, acil", tahmini_saat: 8, harcanan_saat: 5, ust_gorev: "", bagimli: "", aciklama: "Yenileme + 10 kullanıcı." },
        { id: "gv2", baslik: "Ekim bordro hazırlığı", atanan: "Tuğba Yörük", oncelik: "Orta", baslangic: "2026-10-20", termin: "2026-10-28", durum: "Yapılacak", ilerleme: 0, etiket: "ik, bordro", tahmini_saat: 6, harcanan_saat: 0, ust_gorev: "", bagimli: "", aciklama: "" },
        { id: "gv3", baslik: "Beta sürüm son testler", atanan: "Halim Bey", oncelik: "Acil", baslangic: "2026-10-14", termin: "2026-10-17", durum: "Devam Ediyor", ilerleme: 85, etiket: "beta, test", tahmini_saat: 20, harcanan_saat: 17, ust_gorev: "", bagimli: "", aciklama: "Kapalı beta." },
      ],
    ),
    mkTbl("T-0058", "Kilometre Taşları / Hedefler (Milestones)",
      "GitHub Milestones tarzı · bitiş tarihli (deadline) hedefler · ilerleme. Ajanda maddeleri bu hedeflere bağlanır.", "Flag",
      [
        { code: "ad", name: "Hedef / Milestone", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "bitis_tarihi", name: "Bitiş (Deadline)", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "ilerleme", name: "İlerleme (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Açık", "Yaklaşıyor", "Tamamlandı", "Gecikti"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ml1", ad: "Ekim Sonu Hedefleri", bitis_tarihi: "2026-10-31", ilerleme: 65, durum: "Açık", aciklama: "Teklifler, bordro, beta testleri." },
        { id: "ml2", ad: "Beta Lansmanı", bitis_tarihi: "2026-11-30", ilerleme: 40, durum: "Açık", aciklama: "Kapalı beta + geri bildirim." },
        { id: "ml3", ad: "Q4 Kapanışı", bitis_tarihi: "2026-12-31", ilerleme: 20, durum: "Açık", aciklama: "Yıl sonu finans + hedef değerlendirme." },
      ],
    ),
    mkTbl("T-0057", "Ajanda / Gündem Tablosu",
      "GitHub Projects tarzı kişisel/iş ajandası · Kanban (Yapılacak/Devam/Beklemede/Tamamlandı) · kategori (etiket) · öncelik · milestone bağlantısı.", "NotebookPen",
      [
        { code: "baslik", name: "Madde", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kategori", name: "Kategori (Etiket)", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["İş", "Kişisel", "Toplantı", "Hatırlatma", "Acil", "Çağrı / Takip"] },
        { code: "oncelik", name: "Öncelik", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek", "Acil"] },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş Tarihi (süre)", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "milestone", name: "Milestone (T-0058)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0058" },
        { code: "sprint", name: "Sprint / Döngü (T-0059)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0059" },
        { code: "sms_hatirlatma", name: "SMS Hatırlatma", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "telefon", name: "Hatırlatma Telefonu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "hatirlatma_zamani", name: "Hatırlatma Zamanı", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["15 dk önce", "1 saat önce", "1 gün önce", "Zamanında"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yapılacak", "Devam Ediyor", "Beklemede", "Tamamlandı"] },
        { code: "not", name: "Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "aj1", baslik: "Acme teklif sunumunu hazırla", kategori: "İş", oncelik: "Yüksek", tarih: "2026-10-16", saat: "15:00", bitis: "2026-10-18", sorumlu: "Kadir Fırat", milestone: "Ekim Sonu Hedefleri", sprint: "Sprint 42 (Ekim 2. Yarı)", sms_hatirlatma: true, telefon: "0532 333 44 55", hatirlatma_zamani: "1 saat önce", durum: "Devam Ediyor", not: "" },
        { id: "aj2", baslik: "Ekip haftalık toplantısı", kategori: "Toplantı", oncelik: "Orta", tarih: "2026-10-20", saat: "10:00", sorumlu: "Tuğba Yörük", milestone: "", sms_hatirlatma: true, telefon: "0532 111 22 33", hatirlatma_zamani: "15 dk önce", durum: "Yapılacak", not: "Gündem: sprint durumu." },
        { id: "aj3", baslik: "Beta test geri bildirimlerini topla", kategori: "İş", oncelik: "Yüksek", tarih: "2026-10-18", saat: "", bitis: "2026-10-22", sorumlu: "Halim Bey", milestone: "Beta Lansmanı", sprint: "Sprint 42 (Ekim 2. Yarı)", sms_hatirlatma: false, telefon: "", hatirlatma_zamani: "", durum: "Yapılacak", not: "" },
        { id: "aj4", baslik: "Delta'yı tekrar ara", kategori: "Çağrı / Takip", oncelik: "Orta", tarih: "2026-10-18", saat: "11:00", sorumlu: "Tuğba Yörük", milestone: "", sms_hatirlatma: true, telefon: "0532 111 22 33", hatirlatma_zamani: "1 gün önce", durum: "Beklemede", not: "Randevu teyidi." },
        { id: "aj5", baslik: "Ekim bordro verilerini kontrol et", kategori: "İş", oncelik: "Acil", tarih: "2026-10-20", saat: "", bitis: "2026-10-23", sorumlu: "Tuğba Yörük", milestone: "Ekim Sonu Hedefleri", sprint: "Sprint 42 (Ekim 2. Yarı)", sms_hatirlatma: false, telefon: "", hatirlatma_zamani: "", durum: "Yapılacak", not: "" },
        { id: "aj6", baslik: "Tasarım onayını ilet", kategori: "İş", oncelik: "Düşük", tarih: "2026-10-14", saat: "", sorumlu: "Kadir Fırat", milestone: "", sprint: "Sprint 42 (Ekim 2. Yarı)", sms_hatirlatma: false, telefon: "", hatirlatma_zamani: "", durum: "Tamamlandı", not: "Onaylandı." },
        { id: "aj7", baslik: "E-posta kontrolü", kategori: "İş", oncelik: "Orta", tarih: "2026-10-17", saat: "08:00", sorumlu: "", durum: "Tamamlandı", not: "" },
        { id: "aj8", baslik: "Ekip toplantısı hazırlığı", kategori: "Toplantı", oncelik: "Orta", tarih: "2026-10-17", saat: "08:30", sorumlu: "", durum: "Tamamlandı", not: "" },
        { id: "aj9", baslik: "Müşteri sunumu revize", kategori: "İş", oncelik: "Yüksek", tarih: "2026-10-17", saat: "10:00", sorumlu: "", durum: "Tamamlandı", not: "" },
        { id: "aj10", baslik: "Sözleşme taslağını incele", kategori: "İş", oncelik: "Yüksek", tarih: "2026-10-17", saat: "11:30", sorumlu: "", durum: "Yapılacak", not: "" },
        { id: "aj11", baslik: "Sunucu yedekleme kontrolü", kategori: "Acil", oncelik: "Yüksek", tarih: "2026-10-17", saat: "14:00", sorumlu: "", durum: "Yapılacak", not: "" },
        { id: "aj12", baslik: "Yatırımcı sunumu", kategori: "İş", oncelik: "Yüksek", tarih: "2026-10-17", saat: "16:00", sorumlu: "", durum: "Yapılacak", not: "" },
        { id: "aj13", baslik: "Teklif dosyası gönder", kategori: "İş", oncelik: "Orta", tarih: "2026-10-17", saat: "17:30", sorumlu: "", durum: "Yapılacak", not: "" },
        { id: "aj14", baslik: "Gün sonu raporu", kategori: "İş", oncelik: "Orta", tarih: "2026-10-17", saat: "19:00", sorumlu: "", durum: "Yapılacak", not: "" },
      ],
    ),
    mkTbl("T-0059", "Sprint / Döngü (Cycles) Tablosu",
      "Plane/Jira tarzı zaman kutulu iterasyonlar · başlangıç-bitiş · hedef · ilerleme (burn-down). Ajanda maddeleri sprint'e bağlanır.", "RefreshCw",
      [
        { code: "ad", name: "Sprint / Döngü", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "baslangic", name: "Başlangıç", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "hedef", name: "Hedef / Amaç", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Planlandı", "Aktif", "Tamamlandı", "İptal"] },
        { code: "ilerleme", name: "İlerleme (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "sp1", ad: "Sprint 42 (Ekim 2. Yarı)", baslangic: "2026-10-13", bitis: "2026-10-24", hedef: "Teklifler + beta testleri + bordro hazırlığı", durum: "Aktif", ilerleme: 25 },
        { id: "sp2", ad: "Sprint 43 (Kasım 1. Yarı)", baslangic: "2026-10-27", bitis: "2026-11-07", hedef: "Beta lansman hazırlıkları", durum: "Planlandı", ilerleme: 0 },
      ],
    ),
    mkTbl("T-0060", "Takvim / Etkinlikler Tablosu",
      "FullCalendar tarzı etkinlik modeli · tüm gün / saatli · tür · renk · tekrar (recurring) · konum · katılımcılar. Takvim görünümlerini besler.", "CalendarClock",
      [
        { code: "baslik", name: "Etkinlik Başlığı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Toplantı", "Etkinlik", "Resmi Tatil", "İzin", "Doğum Günü", "Son Tarih (Deadline)", "Hatırlatma", "Diğer"] },
        { code: "tarih", name: "Başlangıç Tarihi", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "tum_gun", name: "Tüm Gün", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "baslangic_saat", name: "Başlangıç Saati", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "bitis_saat", name: "Bitiş Saati", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "renk", name: "Renk", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Mavi", "Yeşil", "Turuncu", "Kırmızı", "Mor", "Gri"] },
        { code: "konum", name: "Konum", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "katilimcilar", name: "Katılımcılar", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tekrar", name: "Tekrar", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Yok", "Günlük", "Haftalık", "Aylık", "Yıllık"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Planlandı", "Onaylandı", "İptal"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ev1", baslik: "Haftalık Ekip Toplantısı", tur: "Toplantı", tarih: "2026-10-19", bitis: "", tum_gun: false, baslangic_saat: "10:00", bitis_saat: "11:00", renk: "Mavi", konum: "Toplantı Odası 1", katilimcilar: "Tüm ekip", sorumlu: "Tuğba Yörük", tekrar: "Haftalık", durum: "Onaylandı", aciklama: "Sprint durumu." },
        { id: "ev2", baslik: "Cumhuriyet Bayramı", tur: "Resmi Tatil", tarih: "2026-10-29", bitis: "", tum_gun: true, baslangic_saat: "", bitis_saat: "", renk: "Kırmızı", konum: "", katilimcilar: "", sorumlu: "", tekrar: "Yıllık", durum: "Onaylandı", aciklama: "Resmi tatil." },
        { id: "ev3", baslik: "Beta Lansman Son Tarihi", tur: "Son Tarih (Deadline)", tarih: "2026-11-30", bitis: "", tum_gun: true, baslangic_saat: "", bitis_saat: "", renk: "Turuncu", konum: "", katilimcilar: "", sorumlu: "Halim Bey", tekrar: "Yok", durum: "Planlandı", aciklama: "Beta sürüm teslimi." },
        { id: "ev4", baslik: "Halim Bey — Doğum Günü", tur: "Doğum Günü", tarih: "2026-10-24", bitis: "", tum_gun: true, baslangic_saat: "", bitis_saat: "", renk: "Mor", konum: "", katilimcilar: "", sorumlu: "", tekrar: "Yıllık", durum: "Planlandı", aciklama: "" },
        { id: "ev5", baslik: "Ekip Toplantısı", tur: "Toplantı", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "08:30", bitis_saat: "09:30", renk: "Mavi", konum: "Toplantı Odası / Online", katilimcilar: "Ekip", sorumlu: "Tuğba Yörük", tekrar: "Yok", durum: "Onaylandı", aciklama: "" },
        { id: "ev6", baslik: "Proje Durum Değerlendirme", tur: "Etkinlik", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "10:00", bitis_saat: "11:00", renk: "Yeşil", konum: "Yazılım Ekibi", katilimcilar: "", sorumlu: "Halim Bey", tekrar: "Yok", durum: "Onaylandı", aciklama: "" },
        { id: "ev7", baslik: "Müşteri Görüşmesi", tur: "Toplantı", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "11:30", bitis_saat: "12:30", renk: "Turuncu", konum: "ABC İnşaat - Zoom", katilimcilar: "", sorumlu: "Kadir Fırat", tekrar: "Yok", durum: "Planlandı", aciklama: "" },
        { id: "ev8", baslik: "Öğle Arası", tur: "Diğer", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "13:00", bitis_saat: "14:00", renk: "Gri", konum: "", katilimcilar: "", sorumlu: "", tekrar: "Günlük", durum: "Planlandı", aciklama: "" },
        { id: "ev9", baslik: "Teknik İnceleme", tur: "Etkinlik", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "14:00", bitis_saat: "15:30", renk: "Kırmızı", konum: "Sunucu ve Güvenlik Kontrolü", katilimcilar: "", sorumlu: "Halim Bey", tekrar: "Yok", durum: "Planlandı", aciklama: "" },
        { id: "ev10", baslik: "Yatırımcı Sunumu Hazırlığı", tur: "Toplantı", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "16:00", bitis_saat: "17:00", renk: "Mor", konum: "", katilimcilar: "", sorumlu: "Tuğba Yörük", tekrar: "Yok", durum: "Planlandı", aciklama: "" },
        { id: "ev11", baslik: "Danışman ile Görüşme", tur: "Toplantı", tarih: "2026-10-17", bitis: "", tum_gun: false, baslangic_saat: "17:30", bitis_saat: "18:30", renk: "Mavi", konum: "Finansal Planlama", katilimcilar: "", sorumlu: "Şevket Kaan", tekrar: "Yok", durum: "Planlandı", aciklama: "" },
      ],
    ),
    mkTbl("T-0061", "Karar Kayıt Defteri (Decision Log)",
      "Alınan kurumsal kararların kaydı (governance) · karar · gerekçe · karar veren · etkilenen birim · uygulama durumu.", "Gavel",
      [
        { code: "karar_no", name: "Karar No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "konu", name: "Konu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "karar", name: "Alınan Karar", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "gerekce", name: "Gerekçe", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "karar_veren", name: "Karar Veren (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "etkilenen_birim", name: "Etkilenen Birim / Proje", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Alındı", "Uygulanıyor", "Tamamlandı", "Beklemede", "İptal"] },
      ],
      [
        { id: "kr1", karar_no: "KRR-2026-001", konu: "Beta lansman tarihi", karar: "Beta lansmanı 30 Kasım'a sabitlendi.", gerekce: "Test kapsamı tamamlanmalı.", karar_veren: "Şevket Kaan", tarih: "2026-10-14", etkilenen_birim: "Yazılım, Pazarlama", durum: "Uygulanıyor" },
        { id: "kr2", karar_no: "KRR-2026-002", konu: "Pazarlama bütçe artışı", karar: "Q4 pazarlama bütçesi %15 artırıldı.", gerekce: "Lansman kampanyası.", karar_veren: "Tuğba Yörük", tarih: "2026-10-16", etkilenen_birim: "Pazarlama, Finans", durum: "Alındı" },
      ],
    ),
    mkTbl("T-0062", "Risk Yönetimi (Risk Register)",
      "Kurumsal risk kaydı (OpenProject tarzı) · kategori · olasılık × etki = skor · önlem · sorumlu · durum.", "ShieldAlert",
      [
        { code: "risk", name: "Risk Tanımı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kategori", name: "Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Finansal", "Operasyonel", "Hukuki", "Teknik", "İtibar", "Pazar", "Uyum"] },
        { code: "olasilik", name: "Olasılık", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek"] },
        { code: "etki", name: "Etki", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek", "Kritik"] },
        { code: "skor", name: "Risk Skoru", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek", "Kritik"] },
        { code: "onlem", name: "Önlem / Aksiyon", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Açık", "İzleniyor", "Azaltıldı", "Kapandı"] },
      ],
      [
        { id: "rs1", risk: "Beta lansmanının gecikmesi", kategori: "Teknik", olasilik: "Orta", etki: "Yüksek", skor: "Yüksek", onlem: "Test otomasyonu + ek kaynak.", sorumlu: "Halim Bey", durum: "İzleniyor" },
        { id: "rs2", risk: "Pazarlama bütçesinin aşılması", kategori: "Finansal", olasilik: "Yüksek", etki: "Orta", skor: "Yüksek", onlem: "Haftalık harcama takibi.", sorumlu: "Tuğba Yörük", durum: "Açık" },
        { id: "rs3", risk: "Tedarikçi sözleşme uyuşmazlığı", kategori: "Hukuki", olasilik: "Düşük", etki: "Yüksek", skor: "Orta", onlem: "Sözleşme avukat incelemesi.", sorumlu: "Kadir Fırat", durum: "Azaltıldı" },
      ],
    ),
    mkTbl("T-0063", "Toplantı Tutanağı & Aksiyonlar",
      "Spiral defter tarzı toplantı tutanağı · amaç · gündem · görüşülen · kararlar · hedefler · süreç · sorumlular · riskler · aksiyonlar.", "ClipboardList",
      [
        { code: "tutanak_no", name: "Tutanak No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "toplanti", name: "Toplantı Konusu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "yer", name: "Yer", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "katilimcilar", name: "Katılımcılar", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "amac", name: "Toplantı Amacı", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "gundem", name: "Gündem", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "gorusulen", name: "Görüşülen Konular", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "onemli_notlar", name: "Önemli Notlar", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "kararlar", name: "Alınan Kararlar", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "hedefler", name: "Hedefler", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "surec", name: "Süreç Akışı", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sorumlular", name: "Sorumlular", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "riskler", name: "Riskler", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "aksiyonlar", name: "Aksiyonlar (İş | Sorumlu | Tarih | Durum)", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Açık", "Devam Ediyor", "Tamamlandı", "İptal"] },
      ],
      [
        {
          id: "tt1", tutanak_no: "TTN-2026-001", toplanti: "Yeni Proje Planlama", tarih: "2026-10-13", saat: "10:00 – 11:30", yer: "Toplantı Odası A",
          katilimcilar: "Ahmet (Genel Müdür)\nZeynep (Proje Müdürü)\nMehmet (Teknik Ekip)\nAyşe (Finans)\nBurak (Pazarlama)",
          amac: "Proje kapsamını netleştirmek\nKaynakları belirlemek\nZaman planı oluşturmak\nSorumluları atamak",
          gundem: "Proje hedefleri ve kapsam\nTeknik gereksinimler\nBütçe ve kaynak planı\nZaman çizelgesi\nRiskler ve aksiyonlar",
          gorusulen: "1. Proje Kapsamı: Ana modüller kullanıcı yönetimi, raporlama, mobil uygulama. Öncelik: Web paneli + temel raporlar.\n2. Teknik Detaylar: Altyapı bulut (AWS / Azure). Güvenlik 2FA zorunlu. Entegrasyonlar ERP ve Muhasebe sistemi.\n3. Bütçe: İlk faz için yaklaşık 1.5 M TL. Detaylı maliyet analizi bir hafta içinde paylaşılacak.",
          onemli_notlar: "Proje 3 fazda tamamlanacak.\nMVP için 3 ay hedefleniyor.\nTeknik ekip React + .NET öneriyor.\nBütçe için finans detaylı çalışma yapacak.\nPazarlama lansman planını Mayıs'ta sunacak.\nMüşteri geri bildirimleri kritik olacak.",
          kararlar: "Proje resmen başlatıldı.\nMVP 3 ay içinde teslim edilecek.\nTeknik ekip önerilen teknoloji ile çalışacak.\nBütçe çalışması Ayşe tarafından hazırlanacak.\nLansman planı Mayıs ayı sonunda sunulacak.\nHer hafta Pazartesi 10:00'da durum toplantısı yapılacak.",
          hedefler: "Zamanında teslim, Kaliteli ürün, Müşteri memnuniyeti, Sürdürülebilir büyüme",
          surec: "Planlama:2 Hafta, Tasarım:3 Hafta, Geliştirme:8 Hafta, Test:3 Hafta, Yayına Alma:1 Hafta",
          sorumlular: "Zeynep: Proje genel koordinasyonu\nMehmet: Teknik altyapı\nAyşe: Bütçe ve finans\nBurak: Pazarlama ve lansman\nAhmet: Üst yönetim onayı",
          riskler: "Bütçe artışı riski\nTeknik entegrasyon gecikmesi\nEkip kaynak yetersizliği\nMüşteri taleplerinde değişiklik\nZaman çizelgesinde sapma",
          aksiyonlar: "Detaylı bütçe raporu | Ayşe | 2026-10-21 | Devam Ediyor\nTeknik mimari doküman | Mehmet | 2026-10-18 | Planlandı\nLansman stratejisi | Burak | 2026-10-30 | Bekliyor\nMVP geliştirme | Teknik Ekip | 2026-11-15 | Planlandı\nMüşteri görüşmeleri | Zeynep | 2026-10-25 | Devam Ediyor",
          durum: "Devam Ediyor",
        },
        {
          id: "tt2", tutanak_no: "TTN-2026-002", toplanti: "Haftalık Sprint Toplantısı", tarih: "2026-10-16", saat: "09:30 – 10:15", yer: "Online (Zoom)",
          katilimcilar: "Halim (Teknik Lider)\nTüm geliştirme ekibi",
          amac: "Sprint 42 durumunu değerlendirmek\nEngelleri kaldırmak",
          gundem: "Tamamlanan işler\nDevam eden işler\nEngeller\nSonraki sprint planı",
          gorusulen: "Beta testleri önceliklendirildi. Kritik hatalar ayıklandı. Yeni test senaryoları gerekiyor.",
          onemli_notlar: "Beta sürümü 1 hafta içinde çıkacak.\nTest otomasyonu başlatılacak.",
          kararlar: "Beta testleri önceliklendirildi.\nTest senaryoları güncellenecek.\nSürüm notları hazırlanacak.",
          hedefler: "Sıfır kritik hata, Zamanında beta",
          surec: "Analiz:2 Gün, Geliştirme:5 Gün, Test:3 Gün",
          sorumlular: "Halim: Teknik koordinasyon\nEkip: Geliştirme ve test",
          riskler: "Test kaynağı yetersizliği\nSürüm gecikmesi",
          aksiyonlar: "Test senaryolarını güncelle | Halim Bey | 2026-10-20 | Devam Ediyor\nSürüm notları hazırla | Tuğba Yörük | 2026-10-19 | Bekliyor",
          durum: "Devam Ediyor",
        },
        {
          id: "tt3", tutanak_no: "TTN-2026-003", toplanti: "Pazarlama Planlama", tarih: "2026-10-15", saat: "14:00 – 15:00", yer: "Toplantı Odası B",
          katilimcilar: "Tuğba (Pazarlama)\nKadir (Satış)",
          amac: "Lansman kampanyasını planlamak",
          gundem: "Kampanya bütçesi\nKanallar\nZaman planı",
          gorusulen: "Bütçe %15 artırıldı. Dijital kanallara ağırlık verilecek. Ajans brief'i hazırlanacak.",
          onemli_notlar: "Lansman Mayıs sonunda.\nSosyal medya önceliklendirildi.",
          kararlar: "Bütçe %15 artırıldı.\nAjans brief'i hazırlanacak.\nDijital öncelikli strateji benimsendi.",
          hedefler: "Marka bilinirliği, Lansman başarısı",
          surec: "Brief:1 Hafta, Üretim:2 Hafta, Yayın:1 Hafta",
          sorumlular: "Tuğba: Kampanya yönetimi\nKadir: Satış koordinasyonu",
          riskler: "Bütçe aşımı\nAjans gecikmesi",
          aksiyonlar: "Ajans brief'i hazırla | Kadir Fırat | 2026-10-22 | Bekliyor",
          durum: "Açık",
        },
      ],
    ),
    mkTbl("T-0068", "Notlar",
      "Mantar pano tarzı yapışkan notlar · önem · renk · tarih · hatırlatıcı · arşiv — tarihli notlar ajandaya düşer.", "StickyNote",
      [
        { code: "baslik", name: "Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "icerik", name: "Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "onem", name: "Önem", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Normal", "Yüksek", "Kritik"] },
        { code: "renk", name: "Renk", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Sarı", "Yeşil", "Mavi", "Pembe", "Mor", "Gri"] },
        { code: "etiket", name: "Etiket", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "hatirlatma", name: "Hatırlatıcı", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "arsiv", name: "Arşiv", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "sira", name: "Sıra", type: "NUMBER", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "n1", baslik: "Büyük planlar küçük adımlarla başlar", icerik: "Yatırımcı sunumu Cuma gününe kadar hazırlanacak, finansal projeksiyon eklenecek. Sunum taslağını ekiple paylaş.", onem: "Kritik", renk: "Sarı", etiket: "sunum, acil", tarih: "2026-10-17", hatirlatma: true, arsiv: false, sira: 1 },
        { id: "n2", baslik: "Beta geri bildirimleri", icerik: "Kullanıcı geri bildirimlerini topla, önceliklendir ve ekip ile paylaş. Kritik hataları ayıkla.", onem: "Yüksek", renk: "Mavi", etiket: "beta, ürün", tarih: "2026-10-18", hatirlatma: true, arsiv: false, sira: 2 },
        { id: "n3", baslik: "Fikirler", icerik: "- Yeni proje\n- Platform geliştirme\n- İş ortaklıkları\n- Yurt dışı pazar\n- Otomasyon", onem: "Normal", renk: "Gri", etiket: "fikir", tarih: "2026-10-22", hatirlatma: false, arsiv: false, sira: 3 },
        { id: "n4", baslik: "Sözleşme revizesi", icerik: "ABC İnşaat sözleşmesinde ödeme vadesi 45 güne çekilecek. Hukuk onayı alınacak.", onem: "Yüksek", renk: "Pembe", etiket: "hukuk, cari", tarih: "2026-10-19", hatirlatma: true, arsiv: false, sira: 4 },
        { id: "n5", baslik: "Alışveriş listesi", icerik: "- Market\n- Temizlik malzemeleri\n- Kahve\n- Yazıcı kağıdı\n- Kablo", onem: "Düşük", renk: "Yeşil", etiket: "ofis", tarih: "2026-10-20", hatirlatma: false, arsiv: false, sira: 5 },
        { id: "n6", baslik: "Hedefler 2026", icerik: "- Finansal özgürlük\n- Yeni projeler\n- Aile ile daha fazla zaman\n- Daha çok seyahat", onem: "Normal", renk: "Mavi", etiket: "hedef, kişisel", tarih: "2026-10-30", hatirlatma: false, arsiv: false, sira: 6 },
      ],
    ),
    mkTbl("T-0069", "İşe Alım / Aday Takibi",
      "İK işe alım hattı (OrangeHRM/Frappe HRMS tarzı) · aday · pozisyon · aşama · kaynak · değerlendirme.", "UserPlus",
      [
        { code: "aday", name: "Aday Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "pozisyon", name: "Pozisyon", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "departman", name: "Departman", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Yazılım", "Finans", "Pazarlama", "Satış", "İK", "Operasyon", "Hukuk"] },
        { code: "asama", name: "Aşama", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Başvuru", "Ön Eleme", "Mülakat", "Teknik Test", "Teklif", "İşe Alındı", "Reddedildi"] },
        { code: "kaynak", name: "Kaynak", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["LinkedIn", "Kariyer.net", "Referans", "Web Sitesi", "İK Ajansı"] },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "eposta", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "puan", name: "Değerlendirme (0-100)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "basvuru_tarihi", name: "Başvuru Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "personel_karti", name: "Personel Kartı (T-0025)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "notlar", name: "Notlar", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ia1", aday: "Selin Yılmaz", pozisyon: "Frontend Geliştirici", departman: "Yazılım", asama: "Mülakat", kaynak: "LinkedIn", puan: 82, basvuru_tarihi: "2026-10-10", notlar: "React/TS güçlü." },
        { id: "ia2", aday: "Emre Koç", pozisyon: "Finans Uzmanı", departman: "Finans", asama: "Teklif", kaynak: "Referans", puan: 90, basvuru_tarihi: "2026-10-08", notlar: "Teklif hazırlanıyor." },
        { id: "ia3", aday: "Derya Aksoy", pozisyon: "Dijital Pazarlama", departman: "Pazarlama", asama: "Başvuru", kaynak: "Kariyer.net", puan: 0, basvuru_tarihi: "2026-10-16", notlar: "" },
        { id: "ia4", aday: "Can Öztürk", pozisyon: "Backend Geliştirici", departman: "Yazılım", asama: "Teknik Test", kaynak: "Web Sitesi", puan: 75, basvuru_tarihi: "2026-10-12", notlar: "Node/Python." },
        { id: "ia5", aday: "Zeynep Ak", pozisyon: "İK Uzmanı", departman: "İK", asama: "İşe Alındı", kaynak: "İK Ajansı", puan: 88, basvuru_tarihi: "2026-09-28", notlar: "1 Kasım başlıyor." },
      ],
    ),
    mkTbl("T-0070", "Performans Değerlendirme",
      "Çalışan performans değerlendirme (Frappe HRMS tarzı) · dönem · hedef · yetkinlik · genel puan.", "Gauge",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "donem", name: "Dönem", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"] },
        { code: "hedef_puan", name: "Hedef Puanı (0-100)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "yetkinlik_puan", name: "Yetkinlik Puanı (0-100)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "genel_puan", name: "Genel Puan (0-100)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "degerlendiren", name: "Değerlendiren (T-0025)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "degerlendirme_tarihi", name: "Değerlendirme Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Planlandı", "Değerlendiriliyor", "Tamamlandı"] },
        { code: "geri_bildirim", name: "Geri Bildirim", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "pf1", personel: "Halim Bey", donem: "2026-Q3", hedef_puan: 85, yetkinlik_puan: 90, genel_puan: 87, durum: "Tamamlandı", geri_bildirim: "Teknik liderlikte güçlü." },
        { id: "pf2", personel: "Tuğba Yörük", donem: "2026-Q3", hedef_puan: 80, yetkinlik_puan: 85, genel_puan: 82, durum: "Tamamlandı", geri_bildirim: "Pazarlama hedefleri aşıldı." },
        { id: "pf3", personel: "Kadir Fırat", donem: "2026-Q4", hedef_puan: 0, yetkinlik_puan: 0, genel_puan: 0, durum: "Değerlendiriliyor", geri_bildirim: "" },
      ],
    ),
    mkTbl("T-0071", "Bordro / Maaş",
      "Aylık bordro yönetimi (Frappe HRMS payroll tarzı) · brüt · kesinti · net · ödeme durumu.", "Wallet",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "donem", name: "Dönem", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "brut", name: "Brüt Maaş (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "fazla_mesai", name: "Fazla Mesai (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "prim_ikramiye", name: "Prim / İkramiye (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "sgk_primi", name: "SGK Primi (İşçi) (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "issizlik_primi", name: "İşsizlik Sig. Primi (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gelir_vergisi", name: "Gelir Vergisi (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "damga_vergisi", name: "Damga Vergisi (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "net", name: "Net Maaş (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Ödeme Durumu", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Hazırlanıyor", "Onay Bekliyor", "Ödendi"] },
        { code: "odeme_tarihi", name: "Ödeme Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "bd1", personel: "Halim Bey", donem: "2026-10", brut: 95000, kesinti: 28500, net: 66500, durum: "Ödendi", odeme_tarihi: "2026-10-05" },
        { id: "bd2", personel: "Tuğba Yörük", donem: "2026-10", brut: 82000, kesinti: 24600, net: 57400, durum: "Ödendi", odeme_tarihi: "2026-10-05" },
        { id: "bd3", personel: "Kadir Fırat", donem: "2026-10", brut: 68000, kesinti: 20400, net: 47600, durum: "Onay Bekliyor", odeme_tarihi: "" },
      ],
    ),
    mkTbl("T-0072", "Gayrimenkul Portföy",
      "Daire/gayrimenkul envanteri (Open Condo/OpenProperty tarzı) · tip · konum · durum · alış/satış/kira bedeli.", "Building2",
      [
        { code: "kod", name: "Portföy Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "baslik", name: "Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tip", name: "Tip", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Daire", "Villa", "Dükkan", "Ofis", "Arsa", "Depo", "Rezidans"] },
        { code: "sehir", name: "Şehir", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "bolge", name: "Bölge / Semt", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "oda", name: "Oda Sayısı", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "Dubleks", "—"] },
        { code: "metrekare", name: "Metrekare (m²)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Boş", "Kirada", "Satışta", "Satıldı", "Bakımda", "Rezerve"] },
        { code: "alis_bedeli", name: "Alış Bedeli (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "satis_bedeli", name: "Satış Bedeli (₺)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "kira_bedeli", name: "Aylık Kira (₺)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "danisman", name: "Satış Danışmanı", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "gm1", kod: "GM-001", baslik: "3+1 Daire · Deniz Manzaralı", tip: "Daire", sehir: "İstanbul", bolge: "Kadıköy", oda: "3+1", metrekare: 135, durum: "Kirada", alis_bedeli: 6500000, satis_bedeli: 8200000, kira_bedeli: 32000, danisman: "Kadir Fırat", aciklama: "Bağdat Caddesi'ne yakın." },
        { id: "gm2", kod: "GM-002", baslik: "2+1 Rezidans", tip: "Rezidans", sehir: "İstanbul", bolge: "Ataşehir", oda: "2+1", metrekare: 95, durum: "Satışta", alis_bedeli: 4200000, satis_bedeli: 5500000, kira_bedeli: 24000, danisman: "Tuğba Yörük", aciklama: "Site içi, havuzlu." },
        { id: "gm3", kod: "GM-003", baslik: "Dükkan · Cadde Üzeri", tip: "Dükkan", sehir: "Ankara", bolge: "Çankaya", oda: "—", metrekare: 80, durum: "Kirada", alis_bedeli: 3800000, satis_bedeli: 4800000, kira_bedeli: 45000, danisman: "Kadir Fırat", aciklama: "Yüksek yaya trafiği." },
        { id: "gm4", kod: "GM-004", baslik: "Villa · Müstakil", tip: "Villa", sehir: "İzmir", bolge: "Çeşme", oda: "5+1", metrekare: 320, durum: "Satıldı", alis_bedeli: 12000000, satis_bedeli: 18500000, kira_bedeli: 0, danisman: "Tuğba Yörük", aciklama: "Deniz kenarı, satıldı." },
        { id: "gm5", kod: "GM-005", baslik: "Ofis · Plaza Katı", tip: "Ofis", sehir: "İstanbul", bolge: "Levent", oda: "—", metrekare: 210, durum: "Boş", alis_bedeli: 9500000, satis_bedeli: 12000000, kira_bedeli: 85000, danisman: "Halim Bey", aciklama: "A+ plaza, otoparklı." },
        { id: "gm6", kod: "GM-006", baslik: "1+1 Yatırımlık Daire", tip: "Daire", sehir: "İstanbul", bolge: "Kağıthane", oda: "1+1", metrekare: 55, durum: "Rezerve", alis_bedeli: 2100000, satis_bedeli: 2800000, kira_bedeli: 15000, danisman: "Kadir Fırat", aciklama: "Metro yakını." },
      ],
    ),
    mkTbl("T-0073", "Kira Sözleşmeleri",
      "Kira kontratları · daire · kiracı · süre · aylık kira · depozito · durum.", "FileText",
      [
        { code: "sozlesme_no", name: "Sözleşme No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "daire", name: "Portföy (T-0072)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0072" },
        { code: "kiraci", name: "Kiracı (T-0074)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0074" },
        { code: "baslangic", name: "Başlangıç", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "aylik_kira", name: "Aylık Kira (₺)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "depozito", name: "Depozito (₺)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Aktif", "Yenilendi", "Sona Erdi", "Feshedildi"] },
      ],
      [
        { id: "ks1", sozlesme_no: "KS-2026-001", daire: "GM-001 · 3+1 Daire", kiraci: "Ahmet Yılmaz", baslangic: "2026-01-15", bitis: "2027-01-15", aylik_kira: 32000, depozito: 64000, durum: "Aktif" },
        { id: "ks2", sozlesme_no: "KS-2026-002", daire: "GM-003 · Dükkan", kiraci: "Beta Market Ltd.", baslangic: "2025-09-01", bitis: "2028-09-01", aylik_kira: 45000, depozito: 135000, durum: "Aktif" },
        { id: "ks3", sozlesme_no: "KS-2025-014", daire: "GM-002 · 2+1 Rezidans", kiraci: "Selin Kaya", baslangic: "2025-03-01", bitis: "2026-03-01", aylik_kira: 22000, depozito: 44000, durum: "Sona Erdi" },
      ],
    ),
    mkTbl("T-0074", "Kiracılar / Daire Sakinleri",
      "Kiracı ve daire sakini kayıtları · iletişim · bağlı daire · durum.", "Users",
      [
        { code: "ad", name: "Ad Soyad / Firma", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "email", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "daire", name: "Bağlı Daire (T-0072)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0072" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Ayrıldı"] },
      ],
      [
        { id: "kr1", ad: "Ahmet Yılmaz", telefon: "0532 111 2233", email: "ahmet@example.com", daire: "GM-001", durum: "Aktif" },
        { id: "kr2", ad: "Beta Market Ltd.", telefon: "0312 444 5566", email: "info@betamarket.com", daire: "GM-003", durum: "Aktif" },
        { id: "kr3", ad: "Selin Kaya", telefon: "0505 777 8899", email: "selin@example.com", daire: "GM-002", durum: "Ayrıldı" },
      ],
    ),
    mkTbl("T-0075", "Gayrimenkul Gelir-Gider",
      "Daire bazlı finansal hareketler · kira/satış geliri · aidat · bakım · vergi · komisyon.", "Wallet",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "daire", name: "Portföy (T-0072)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0072" },
        { code: "tip", name: "İşlem Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Kira Geliri", "Satış Geliri", "Aidat", "Bakım / Onarım", "Vergi", "Fatura", "Komisyon", "Sigorta"] },
        { code: "yon", name: "Yön", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Gelir", "Gider"] },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXT", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "gg1", tarih: "2026-10-05", daire: "GM-001", tip: "Kira Geliri", yon: "Gelir", tutar: 32000, aciklama: "Ekim kirası" },
        { id: "gg2", tarih: "2026-10-05", daire: "GM-003", tip: "Kira Geliri", yon: "Gelir", tutar: 45000, aciklama: "Ekim kirası (dükkan)" },
        { id: "gg3", tarih: "2026-10-08", daire: "GM-004", tip: "Satış Geliri", yon: "Gelir", tutar: 18500000, aciklama: "Villa satışı tamamlandı" },
        { id: "gg4", tarih: "2026-10-10", daire: "GM-005", tip: "Bakım / Onarım", yon: "Gider", tutar: 18000, aciklama: "Ofis tadilat" },
        { id: "gg5", tarih: "2026-10-12", daire: "GM-002", tip: "Aidat", yon: "Gider", tutar: 3500, aciklama: "Site aidatı" },
        { id: "gg6", tarih: "2026-10-09", daire: "GM-004", tip: "Komisyon", yon: "Gider", tutar: 370000, aciklama: "Satış komisyonu %2" },
      ],
    ),
    mkTbl("T-0076", "Talepler",
      "Tüm talepler tek merkezde · IT/destek · malzeme · satın alma · izin · avans · bakım · müşteri/kiracı + onay akışı.", "Inbox",
      [
        { code: "talep_no", name: "Talep No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "konu", name: "Konu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "talep_turu", name: "Talep Türü / Form", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Personel Avans", "Yıllık İzin", "Hastalık / Mazeret İzni", "Masraf / Harcama", "İşe Giriş", "İş Başvurusu", "Tedarikçi Ödeme", "Görev Oluşturma", "Mesai / Vardiya", "Personel Transfer", "Performans Değerlendirme", "İşten Ayrılış", "IT / Destek", "Malzeme / Kırtasiye", "Satın Alma", "Eğitim", "Bakım / Arıza", "Müşteri / Kiracı", "Diğer"] },
        { code: "talep_eden", name: "Talep Eden", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "departman", name: "Departman", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Yazılım", "Finans", "Pazarlama", "Satış", "İK", "Operasyon", "Hukuk", "Genel"] },
        { code: "oncelik", name: "Öncelik", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Normal", "Yüksek", "Acil"] },
        { code: "atanan", name: "Atanan (Sorumlu)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yeni", "İncelemede", "Onaylandı", "Reddedildi", "Tamamlandı"] },
        { code: "tarih", name: "Talep Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "baslangic", name: "Başlangıç (izin/mesai)", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş (izin/mesai)", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "ilgili", name: "İlgili (cari/personel/aday)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "gun", name: "Gün Sayısı", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "onay_zinciri", name: "Onay Zinciri", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama / Gerekçe", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "tlp1", talep_no: "TLP-2026-001", konu: "Yeni dizüstü bilgisayar talebi", talep_turu: "IT / Destek", talep_eden: "Halim Bey", departman: "Yazılım", oncelik: "Yüksek", atanan: "Kadir Fırat", tutar: 45000, durum: "İncelemede", tarih: "2026-10-15", aciklama: "Geliştirme için yüksek performanslı dizüstü." },
        { id: "tlp2", talep_no: "TLP-2026-002", konu: "Yıllık izin talebi (5 gün)", talep_turu: "Yıllık İzin", talep_eden: "Tuğba Yörük", departman: "Pazarlama", oncelik: "Normal", atanan: "Şevket Kaan", tutar: 0, durum: "Onaylandı", tarih: "2026-10-12", baslangic: "2026-10-20", bitis: "2026-10-24", aciklama: "Yıllık izin · 5 gün." },
        { id: "tlp3", talep_no: "TLP-2026-003", konu: "Ofis kırtasiye siparişi", talep_turu: "Malzeme / Kırtasiye", talep_eden: "Kadir Fırat", departman: "Genel", oncelik: "Düşük", atanan: "", tutar: 3500, durum: "Yeni", tarih: "2026-10-16", aciklama: "Kalem, defter, toner." },
        { id: "tlp4", talep_no: "TLP-2026-004", konu: "GM-005 ofis klima arızası", talep_turu: "Bakım / Arıza", talep_eden: "Tuğba Yörük", departman: "Operasyon", oncelik: "Acil", atanan: "Kadir Fırat", tutar: 8000, durum: "İncelemede", tarih: "2026-10-17", aciklama: "Levent plaza katı klima çalışmıyor." },
        { id: "tlp5", talep_no: "TLP-2026-005", konu: "Yazılım lisansı satın alma (JetBrains)", talep_turu: "Satın Alma", talep_eden: "Halim Bey", departman: "Yazılım", oncelik: "Normal", atanan: "Şevket Kaan", tutar: 25000, durum: "Yeni", tarih: "2026-10-16", aciklama: "5 kullanıcılı yıllık." },
        { id: "tlp6", talep_no: "TLP-2026-006", konu: "Seyahat avansı talebi", talep_turu: "Personel Avans", talep_eden: "Kadir Fırat", departman: "Satış", oncelik: "Yüksek", atanan: "Şevket Kaan", tutar: 15000, durum: "Tamamlandı", tarih: "2026-10-10", aciklama: "İstanbul müşteri ziyareti · konaklama ve ulaşım." },
        { id: "tlp7", talep_no: "TLP-2026-007", konu: "İş seyahati avans talebi", talep_turu: "Personel Avans", talep_eden: "Halim Bey", departman: "Yazılım", oncelik: "Normal", atanan: "Şevket Kaan", tutar: 15000, durum: "Yeni", tarih: "2026-10-17", aciklama: "Konaklama ve ulaşım · Ankara." },
        { id: "tlp8", talep_no: "TLP-2026-008", konu: "Hastalık izni (2 gün)", talep_turu: "Hastalık / Mazeret İzni", talep_eden: "Kadir Fırat", departman: "Satış", oncelik: "Yüksek", atanan: "Şevket Kaan", tutar: 0, durum: "Onaylandı", tarih: "2026-10-15", baslangic: "2026-10-15", bitis: "2026-10-16", aciklama: "Doktor raporu ektedir." },
        { id: "tlp9", talep_no: "TLP-2026-009", konu: "Ekim ayı masraf/harcama formu", talep_turu: "Masraf / Harcama", talep_eden: "Tuğba Yörük", departman: "Pazarlama", oncelik: "Normal", atanan: "Şevket Kaan", tutar: 8750, durum: "İncelemede", tarih: "2026-10-16", aciklama: "Yemek, taksi, matbaa fişleri." },
        { id: "tlp10", talep_no: "TLP-2026-010", konu: "Tedarikçi ödeme talebi · Beta Tedarik", talep_turu: "Tedarikçi Ödeme", talep_eden: "Halim Bey", departman: "Finans", oncelik: "Yüksek", atanan: "Şevket Kaan", tutar: 40000, durum: "Yeni", tarih: "2026-10-16", aciklama: "Geliştirme lisans/araç alımı faturası." },
        { id: "tlp11", talep_no: "TLP-2026-011", konu: "Yeni personel işe giriş işlemleri · Zeynep Ak", talep_turu: "İşe Giriş", talep_eden: "Şevket Kaan", departman: "İK", oncelik: "Normal", atanan: "Tuğba Yörük", tutar: 0, durum: "İncelemede", tarih: "2026-10-14", baslangic: "2026-11-01", aciklama: "SGK giriş, ekipman zimmet, oryantasyon." },
        { id: "tlp12", talep_no: "TLP-2026-012", konu: "Personel transfer · Pazarlama → Satış", talep_turu: "Personel Transfer", talep_eden: "Kadir Fırat", departman: "Satış", oncelik: "Normal", atanan: "Şevket Kaan", tutar: 0, durum: "Yeni", tarih: "2026-10-17", baslangic: "2026-11-01", aciklama: "Departman değişikliği talebi." },
        { id: "tlp13", talep_no: "TLP-2026-013", konu: "Mesai / fazla çalışma talebi", talep_turu: "Mesai / Vardiya", talep_eden: "Halim Bey", departman: "Yazılım", oncelik: "Yüksek", atanan: "Şevket Kaan", tutar: 0, durum: "Onaylandı", tarih: "2026-10-16", baslangic: "2026-10-18", bitis: "2026-10-19", aciklama: "Beta sürüm hazırlığı · hafta sonu mesai." },
        { id: "tlp14", talep_no: "TLP-2026-014", konu: "Q4 performans değerlendirme başlatma", talep_turu: "Performans Değerlendirme", talep_eden: "Şevket Kaan", departman: "İK", oncelik: "Normal", atanan: "Tuğba Yörük", tutar: 0, durum: "Yeni", tarih: "2026-10-17", aciklama: "Tüm departmanlar için 2026-Q4 değerlendirmesi." },
      ],
    ),
    mkTbl("T-0021", "Proje Risk Tablosu",
      "Proje risk kaydı · kategori · olasılık · etki · skor · önlem · sorumlu · durum.", "ShieldAlert",
      [
        { code: "risk", name: "Risk", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "proje_kodu", name: "Proje Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kategori", name: "Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Teknik", "Finansal", "Operasyonel", "Yasal", "Zaman", "Kaynak"] },
        { code: "olasilik", name: "Olasılık", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek"] },
        { code: "etki", name: "Etki", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek"] },
        { code: "skor", name: "Risk Skoru", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "onlem", name: "Önlem / Aksiyon", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Açık", "İzleniyor", "Azaltıldı", "Kapandı"] },
      ],
      [
        { id: "rk1", risk: "Bütçe aşımı riski", proje_kodu: "PRJ-2026-01", kategori: "Finansal", olasilik: "Orta", etki: "Yüksek", skor: 6, onlem: "Aylık bütçe-gerçekleşen takibi.", sorumlu: "Tuğba Yörük", durum: "İzleniyor" },
        { id: "rk2", risk: "Teknik entegrasyon gecikmesi", proje_kodu: "PRJ-2026-01", kategori: "Teknik", olasilik: "Yüksek", etki: "Orta", skor: 6, onlem: "Erken prototip + API sözleşmesi.", sorumlu: "Halim Bey", durum: "Açık" },
        { id: "rk3", risk: "Ekip kaynak yetersizliği", proje_kodu: "PRJ-2026-01", kategori: "Kaynak", olasilik: "Orta", etki: "Orta", skor: 4, onlem: "Dış kaynak/yeni işe alım.", sorumlu: "Kadir Fırat", durum: "Açık" },
      ],
    ),
    mkTbl("T-0030", "Yetki Kartı",
      "Şirket → modül/tablo yetkileri · yetki tipi (kullanıcı/departman) · proje kapsamı · alan bazlı yetki.", "ShieldCheck",
      [
        { code: "belge_no", name: "Belge No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "ad", name: "Yetki Kartı Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "yetki_tipi", name: "Yetki Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Kullanıcı", "Departman"] },
        { code: "kullanici_tipi", name: "Kullanıcı Tipi", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "hedef", name: "Hedef (Kullanıcı/Departman)", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "sirketler", name: "Şirketler", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "projeler", name: "Projeler", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kapsam", name: "Kapsam (Modül/Tablo)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "yetki_duzeyi", name: "Yetki Düzeyi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Görür", "Değiştirir", "Tam"] },
        { code: "alan_yetkileri", name: "Alan Yetkileri", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "alan_yetkileri_detay", name: "Alan Yetkileri (JSON)", type: "TEXTAREA", required: false, visibility: "ONLY_MANAGERS" },
      ],
      [
        { id: "yk1", belge_no: "T-0030-2026-0001", ad: "Satış Ekibi — Proje Görüntüleme", yetki_tipi: "Departman", kullanici_tipi: "", hedef: "Satış", sirketler: "Tümü (Konsolide)", projeler: "Tümü", kapsam: "Tümü (Konsolide)", yetki_duzeyi: "Görür", alan_yetkileri: "—", alan_yetkileri_detay: "{}" },
      ],
    ),
    mkTbl("T-0077", "Cari Kartları",
      "Alıcı/satıcı cari kartları · müşteri/tedarikçi · vergi · iletişim · bakiye.", "Contact",
      [
        { code: "kod", name: "Cari Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ad", name: "Unvan / Ad", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Müşteri", "Tedarikçi", "Her İkisi"] },
        { code: "vergi_dairesi", name: "Vergi Dairesi", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "vergi_no", name: "Vergi / TC No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "email", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sehir", name: "Şehir", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "adres", name: "Adres", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "iban", name: "IBAN / Banka Hesabı", type: "TEXT", required: false, visibility: "ONLY_MANAGERS" },
        { code: "odeme_vadesi_gun", name: "Ödeme Vadesi (Gün)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "para_birimi", name: "Varsayılan Para Birimi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "risk_limiti", name: "Risk / Kredi Limiti (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "bakiye", name: "Bakiye (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "cr1", kod: "CR-001", ad: "Acme A.Ş.", tur: "Müşteri", vergi_dairesi: "Kadıköy", vergi_no: "1234567890", telefon: "0216 555 1020", email: "info@acme.com", sehir: "İstanbul", adres: "Bağdat Cad. No:12", para_birimi: "TL", odeme_vadesi_gun: 30, risk_limiti: 500000, bakiye: 150000, durum: "Aktif" },
        { id: "cr2", kod: "CR-002", ad: "Beta Tedarik Ltd.", tur: "Tedarikçi", vergi_dairesi: "Çankaya", vergi_no: "9876543210", telefon: "0312 444 3050", email: "satis@betatedarik.com", sehir: "Ankara", adres: "Kızılay Mah. No:5", bakiye: -40000, durum: "Aktif" },
        { id: "cr3", kod: "CR-003", ad: "ABC İnşaat", tur: "Müşteri", vergi_dairesi: "Konak", vergi_no: "5556667778", telefon: "0232 333 2010", email: "proje@abcinsaat.com", sehir: "İzmir", adres: "Alsancak No:88", bakiye: 320000, durum: "Aktif" },
        { id: "cr4", kod: "CR-004", ad: "Delta Yazılım", tur: "Her İkisi", vergi_dairesi: "Maslak", vergi_no: "1112223334", telefon: "0212 777 8090", email: "hello@deltasoft.com", sehir: "İstanbul", adres: "Maslak Plaza", bakiye: 0, durum: "Aktif" },
      ],
    ),
    mkTbl("T-0078", "Ajanda Hareketleri",
      "Ajandaya düşen tüm hareketlerin birleşik kaydı · kaynak tablolar: T-0057 Ajanda · T-0060 Takvim/Etkinlik · T-0056 Görevler · T-0049 Randevu · T-0051 Toplantı Odası · T-0063 Tutanak · T-0068 Notlar · T-0076 Talepler · T-0053 İzin.", "CalendarRange",
      [
        { code: "hareket_no", name: "Hareket No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "saat", name: "Saat", type: "TIME", required: false, visibility: "EVERYONE" },
        { code: "tip", name: "Hareket Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Görev", "Etkinlik", "Randevu", "Toplantı", "Not", "Talep", "Termin", "İzin", "Hatırlatma"] },
        { code: "kaynak", name: "Kaynak Tablo", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["T-0057 · Ajanda/Gündem", "T-0060 · Takvim/Etkinlik", "T-0056 · Görevler", "T-0049 · Randevu", "T-0051 · Toplantı Odası", "T-0063 · Toplantı Tutanağı", "T-0068 · Notlar", "T-0076 · Talepler", "T-0053 · İzin", "Manuel"] },
        { code: "baslik", name: "Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ilgili", name: "İlgili Kayıt", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Planlandı", "Devam Ediyor", "Tamamlandı", "İptal"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ah1", hareket_no: "AJH-2026-001", tarih: "2026-10-17", saat: "08:30", tip: "Etkinlik", kaynak: "T-0060 · Takvim/Etkinlik", baslik: "Ekip Toplantısı", ilgili: "Toplantı Odası / Online", sorumlu: "Halim Bey", durum: "Planlandı", aciklama: "Haftalık ekip senkronizasyonu." },
        { id: "ah2", hareket_no: "AJH-2026-002", tarih: "2026-10-17", saat: "08:00", tip: "Görev", kaynak: "T-0057 · Ajanda/Gündem", baslik: "E-posta kontrolü", ilgili: "", sorumlu: "Şevket Kaan", durum: "Tamamlandı", aciklama: "" },
        { id: "ah3", hareket_no: "AJH-2026-003", tarih: "2026-10-13", saat: "10:00", tip: "Toplantı", kaynak: "T-0063 · Toplantı Tutanağı", baslik: "Yeni Proje Planlama", ilgili: "TTN-2026-001", sorumlu: "Tuğba Yörük", durum: "Tamamlandı", aciklama: "Tutanak oluşturuldu." },
        { id: "ah4", hareket_no: "AJH-2026-004", tarih: "2026-10-17", saat: "", tip: "Not", kaynak: "T-0068 · Notlar", baslik: "Büyük planlar küçük adımlarla başlar", ilgili: "", sorumlu: "Şevket Kaan", durum: "Planlandı", aciklama: "Yatırımcı sunumu notu." },
        { id: "ah5", hareket_no: "AJH-2026-005", tarih: "2026-10-20", saat: "", tip: "İzin", kaynak: "T-0053 · İzin", baslik: "Yıllık izin · Tuğba Yörük", ilgili: "TLP-2026-002", sorumlu: "Tuğba Yörük", durum: "Planlandı", aciklama: "20-24 Ekim." },
        { id: "ah6", hareket_no: "AJH-2026-006", tarih: "2026-10-17", saat: "", tip: "Talep", kaynak: "T-0076 · Talepler", baslik: "İş seyahati avans talebi", ilgili: "TLP-2026-007", sorumlu: "Halim Bey", durum: "Planlandı", aciklama: "Onay bekliyor." },
        { id: "ah7", hareket_no: "AJH-2026-007", tarih: "2026-10-18", saat: "14:00", tip: "Randevu", kaynak: "T-0049 · Randevu", baslik: "Müşteri görüşmesi · Acme", ilgili: "", sorumlu: "Kadir Fırat", durum: "Planlandı", aciklama: "Zoom." },
      ],
    ),
    mkTbl("T-0079", "Proje Defteri",
      "Projeye özel kayıt defteri (T-0078 Ajanda Hareketleri tarzı) · not · görev · karar · toplantı · belge · gider · kilometre taşı.", "BookMarked",
      [
        { code: "defter_no", name: "Defter No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "proje_kodu", name: "Proje Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "tip", name: "Kayıt Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Not", "Görev", "Etkinlik", "Karar", "Toplantı", "Belge", "Gider", "Hareket", "Kilometre Taşı", "Risk"] },
        { code: "baslik", name: "Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ilgili", name: "İlgili (kişi/belge/tutar)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Açık", "Devam Ediyor", "Tamamlandı", "İptal"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "pd1", defter_no: "PD-001", proje_kodu: "PRJ-2026-01", tarih: "2026-10-07", tip: "Kilometre Taşı", baslik: "Proje başlangıcı", ilgili: "", sorumlu: "Şevket Kaan", durum: "Tamamlandı", aciklama: "Kickoff toplantısı yapıldı." },
        { id: "pd2", defter_no: "PD-002", proje_kodu: "PRJ-2026-01", tarih: "2026-10-09", tip: "Karar", baslik: "Teknoloji seçimi: React + .NET", ilgili: "", sorumlu: "Halim Bey", durum: "Tamamlandı", aciklama: "Teknik ekip onayladı." },
        { id: "pd3", defter_no: "PD-003", proje_kodu: "PRJ-2026-01", tarih: "2026-10-12", tip: "Görev", baslik: "Veri analiz modülü tasarımı", ilgili: "Halim Bey", sorumlu: "Halim Bey", durum: "Devam Ediyor", aciklama: "" },
        { id: "pd4", defter_no: "PD-004", proje_kodu: "PRJ-2026-01", tarih: "2026-10-15", tip: "Gider", baslik: "Lisans/araç alımı", ilgili: "40.000 ₺", sorumlu: "Tuğba Yörük", durum: "Tamamlandı", aciklama: "Beta Tedarik faturası." },
        { id: "pd5", defter_no: "PD-005", proje_kodu: "PRJ-2026-01", tarih: "2026-10-17", tip: "Not", baslik: "Müşteri demo erişimi hazırlanacak", ilgili: "", sorumlu: "Kadir Fırat", durum: "Açık", aciklama: "" },
      ],
    ),
    mkTbl("T-0064", "Doküman / Wiki (Pages)",
      "AppFlowy/Plane Pages tarzı kurumsal doküman ve wiki · prosedür/politika/kılavuz · sahip · etiket · yayın durumu.", "BookOpen",
      [
        { code: "baslik", name: "Başlık", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kategori", name: "Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Prosedür", "Politika", "Kılavuz", "Toplantı Notu", "Proje Dokümanı", "SSS", "Şablon", "Diğer"] },
        { code: "icerik", name: "İçerik", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "sahibi", name: "Sahibi (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "etiketler", name: "Etiketler", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "guncelleme", name: "Güncelleme Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Taslak", "Gözden Geçiriliyor", "Yayında", "Arşiv"] },
      ],
      [
        { id: "dk1", baslik: "İzin Talep Prosedürü", kategori: "Prosedür", icerik: "Yıllık izin en az 3 gün önce talep edilir; departman müdürü onaylar.", sahibi: "Tuğba Yörük", etiketler: "ik, izin, prosedür", guncelleme: "2026-10-10", durum: "Yayında" },
        { id: "dk2", baslik: "Masraf & Harcama Politikası", kategori: "Politika", icerik: "50.000₺ altı otomatik, 50-250K departman müdürü, 250K üzeri CEO+CFO onayı.", sahibi: "Şevket Kaan", etiketler: "finans, onay, politika", guncelleme: "2026-10-12", durum: "Yayında" },
        { id: "dk3", baslik: "Beta Sürüm Test Kılavuzu", kategori: "Kılavuz", icerik: "Test senaryoları ve kabul kriterleri.", sahibi: "Halim Bey", etiketler: "beta, test, kılavuz", guncelleme: "2026-10-16", durum: "Taslak" },
      ],
    ),
    mkTbl("T-0065", "Zaman Çizelgesi (Timesheet)",
      "Personel zaman takibi (OpenProject/Leantime time tracking) · proje/görev bazlı harcanan süre · faturalanabilirlik.", "Timer",
      [
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "proje_gorev", name: "Proje / Görev", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "faaliyet", name: "Faaliyet Tipi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Geliştirme", "Toplantı", "Analiz", "Destek", "Dokümantasyon", "Saha", "Eğitim", "Diğer"] },
        { code: "sure_saat", name: "Süre (saat)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "faturalanabilir", name: "Faturalanabilir", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "zc1", personel: "Halim Bey", tarih: "2026-10-16", proje_gorev: "Beta test otomasyonu", faaliyet: "Geliştirme", sure_saat: 6, faturalanabilir: true, aciklama: "" },
        { id: "zc2", personel: "Kadir Fırat", tarih: "2026-10-16", proje_gorev: "Acme teklif hazırlığı", faaliyet: "Analiz", sure_saat: 3, faturalanabilir: true, aciklama: "" },
        { id: "zc3", personel: "Tuğba Yörük", tarih: "2026-10-16", proje_gorev: "Bordro hazırlığı", faaliyet: "Dokümantasyon", sure_saat: 2, faturalanabilir: false, aciklama: "" },
      ],
    ),
    mkTbl("T-0066", "Fikir / Öneri Havuzu (Ideas)",
      "Leantime tarzı fikir/öneri backlog'u · kategori · etki × çaba · oy/puan · değerlendirme durumu.", "Lightbulb",
      [
        { code: "fikir", name: "Fikir / Öneri", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kategori", name: "Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Ürün", "Süreç", "Maliyet", "Müşteri Deneyimi", "Pazarlama", "Teknoloji", "Diğer"] },
        { code: "oneren", name: "Öneren (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "puan", name: "Oy / Puan", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "etki", name: "Etki", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek"] },
        { code: "caba", name: "Çaba", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Düşük", "Orta", "Yüksek"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yeni", "Değerlendiriliyor", "Onaylandı", "Reddedildi", "Uygulandı"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "fk1", fikir: "Müşteri self-servis portalı", kategori: "Müşteri Deneyimi", oneren: "Kadir Fırat", puan: 8, etki: "Yüksek", caba: "Yüksek", durum: "Değerlendiriliyor", aciklama: "Cari kendi fatura/bakiyesini görsün." },
        { id: "fk2", fikir: "Otomatik SMS hatırlatma", kategori: "Süreç", oneren: "Tuğba Yörük", puan: 6, etki: "Orta", caba: "Düşük", durum: "Onaylandı", aciklama: "Randevu/ödeme hatırlatmaları." },
        { id: "fk3", fikir: "Mobil uygulama (Capacitor)", kategori: "Teknoloji", oneren: "Halim Bey", puan: 9, etki: "Yüksek", caba: "Orta", durum: "Yeni", aciklama: "Android/iOS." },
      ],
    ),
    mkTbl("T-0067", "Dosya Kütüphanesi (EDMS)",
      "Mayan EDMS + Nextcloud tarzı belge yönetimi · sınıflandırma/etiket · OCR · rol bazlı erişim · çok aşamalı onay akışı · e-imza · versiyon.", "FolderOpen",
      [
        { code: "ad", name: "Belge Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Belge Türü", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Sözleşme", "Fatura", "Muhasebe Belgesi", "Denetim Dosyası", "Resmi Yazışma", "Teklif", "Rapor", "Dilekçe", "Kimlik/Ruhsat", "Diğer"] },
        { code: "sinif", name: "Sınıf / Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Hukuk", "Finans", "İnsan Kaynakları", "Satış", "İdari", "Teknik", "Gayrimenkul"] },
        { code: "etiketler", name: "Etiketler", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "dosya_tipi", name: "Dosya Tipi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["PDF", "DOCX", "XLSX", "JPG", "PNG", "TXT"] },
        { code: "boyut", name: "Boyut", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "versiyon", name: "Versiyon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "sahibi", name: "Sahibi (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "erisim", name: "Erişim (Rol Bazlı)", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Herkes", "Departman", "Sadece Yöneticiler", "Gizli"] },
        { code: "ocr_metni", name: "OCR Metni (Aranabilir)", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "onay_durumu", name: "Onay Durumu", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Taslak", "Onay Bekliyor — Departman Müdürü", "Onay Bekliyor — Genel Müdür", "Onaylandı", "Reddedildi"] },
        { code: "onaylayan", name: "Son Onaylayan (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "e_imza", name: "E-İmza", type: "BOOLEAN", required: false, visibility: "EVERYONE" },
        { code: "yuklenme", name: "Yüklenme Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ek1", ad: "Acme Hizmet Sözleşmesi 2026", tur: "Sözleşme", sinif: "Hukuk", etiketler: "acme, sözleşme, hizmet", dosya_tipi: "PDF", boyut: "2.4 MB", versiyon: "v1.2", sahibi: "Kadir Fırat", erisim: "Sadece Yöneticiler", ocr_metni: "İşbu sözleşme Acme A.Ş. ile Timay arasında hizmet temini amacıyla düzenlenmiştir...", onay_durumu: "Onaylandı", onaylayan: "Şevket Kaan", e_imza: true, yuklenme: "2026-10-12", aciklama: "Yıllık hizmet sözleşmesi." },
        { id: "ek2", ad: "Ekim Bordro Tahakkuk", tur: "Muhasebe Belgesi", sinif: "Finans", etiketler: "bordro, maaş, ekim", dosya_tipi: "XLSX", boyut: "0.8 MB", versiyon: "v1.0", sahibi: "Tuğba Yörük", erisim: "Sadece Yöneticiler", ocr_metni: "Personel bordro tahakkuk listesi — brüt/net/kesinti...", onay_durumu: "Onay Bekliyor — Genel Müdür", onaylayan: "Tuğba Yörük", e_imza: false, yuklenme: "2026-10-16", aciklama: "Ekim ayı bordro." },
        { id: "ek3", ad: "Beta Teklif Dokümanı", tur: "Teklif", sinif: "Satış", etiketler: "beta, teklif", dosya_tipi: "DOCX", boyut: "1.1 MB", versiyon: "v2.1", sahibi: "Kadir Fırat", erisim: "Departman", ocr_metni: "Beta Tedarik Ltd. için hazırlanan teklif — kapsam, fiyat, süre...", onay_durumu: "Onay Bekliyor — Departman Müdürü", onaylayan: "", e_imza: false, yuklenme: "2026-10-17", aciklama: "" },
        { id: "ek4", ad: "Vergi Levhası 2026", tur: "Resmi Yazışma", sinif: "İdari", etiketler: "vergi, resmi", dosya_tipi: "PDF", boyut: "0.5 MB", versiyon: "v1.0", sahibi: "Şevket Kaan", erisim: "Herkes", ocr_metni: "T.C. Hazine ve Maliye Bakanlığı — Vergi Levhası...", onay_durumu: "Taslak", onaylayan: "", e_imza: false, yuklenme: "2026-10-15", aciklama: "" },
      ],
    ),
    mkTbl("T-0024", "Satın Alma Talep Kartı",
      "Satın alma talepleri · kalem · miktar · tahmini tutar · tedarikçi · onay durumu", "ClipboardList",
      [
        { code: "talep_no", name: "Talep No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "talep_eden", name: "Talep Eden", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kalem", name: "Kalem / Malzeme", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "miktar", name: "Miktar", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "birim", name: "Birim", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Adet", "Kg", "m²", "m³", "Paket", "Lisans"] },
        { code: "tahmini_tutar", name: "Tahmini Tutar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "tedarikci", name: "Tedarikçi (T-0077)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0077" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Bekliyor", "Onaylandı", "Sipariş Verildi", "Teslim Alındı", "Reddedildi"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "sa1", talep_no: "SAT-2026-0001", tarih: "2026-10-09", talep_eden: "Halim Bey", kalem: "Geliştirici lisansı (JetBrains)", miktar: 3, birim: "Lisans", tahmini_tutar: 45000, tedarikci: "JetBrains s.r.o.", durum: "Onaylandı", aciklama: "Ekip için yıllık lisans" },
        { id: "sa2", talep_no: "SAT-2026-0002", tarih: "2026-10-12", talep_eden: "Kadir Fırat", kalem: "Tanıtım standı malzemesi", miktar: 1, birim: "Paket", tahmini_tutar: 18000, tedarikci: "Reklam A.Ş.", durum: "Bekliyor", aciklama: "İstanbul lansmanı" },
      ],
    ),
    mkTbl("T-0025", "Personel Tanıtım Kartı",
      "Personel künye · departman · ünvan · işe giriş · iletişim · durum", "Users",
      [
        { code: "sicil_no", name: "Sicil No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ad_soyad", name: "Ad Soyad", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tc_kimlik", name: "T.C. Kimlik No", type: "TEXT", required: false, visibility: "ONLY_MANAGERS" },
        { code: "sgk_sicil_no", name: "SGK Sicil No", type: "TEXT", required: false, visibility: "ONLY_MANAGERS" },
        { code: "departman", name: "Departman", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "unvan", name: "Ünvan", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "yonetici", name: "Bağlı Olduğu Yönetici (T-0025)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "sozlesme_tipi", name: "Sözleşme Tipi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Belirsiz Süreli", "Belirli Süreli", "Stajyer", "Yarı Zamanlı"] },
        { code: "ise_giris", name: "İşe Giriş", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "cikis_tarihi", name: "Çıkış Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "yillik_izin_bakiye", name: "Yıllık İzin Bakiyesi (gün)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "iban", name: "IBAN", type: "TEXT", required: false, visibility: "ONLY_MANAGERS" },
        { code: "telefon", name: "Telefon", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "eposta", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "İzinde", "Ayrıldı"] },
      ],
      [
        { id: "pe1", sicil_no: "PER-001", ad_soyad: "Halim Bey", tc_kimlik: "10000000146", sgk_sicil_no: "SGK-10001", departman: "Yazılım", unvan: "Uygulama Üreticisi", sozlesme_tipi: "Belirsiz Süreli", ise_giris: "2025-03-01", yillik_izin_bakiye: 14, iban: "TR00 0000 0000 0000 0000 0000 01", telefon: "0532 222 33 44", eposta: "halim@timay.co", durum: "Aktif" },
        { id: "pe2", sicil_no: "PER-002", ad_soyad: "Kadir Fırat", tc_kimlik: "10000000278", sgk_sicil_no: "SGK-10002", departman: "Pazarlama", unvan: "Satış ve Pazarlama Yön.", sozlesme_tipi: "Belirsiz Süreli", ise_giris: "2025-06-15", yillik_izin_bakiye: 10, iban: "TR00 0000 0000 0000 0000 0000 02", telefon: "0532 333 44 55", eposta: "kadir@timay.co", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0026", "Ödeme Emri Kartı",
      "Ödeme emri · hak sahibi · brüt/kesinti/net · ödeme yöntemi · onay", "Wallet",
      [
        { code: "belge_no", name: "Belge No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "hak_sahibi", name: "Hak Sahibi (T-0001)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "brut", name: "Brüt Tutar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kesinti", name: "Kesinti (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "net", name: "Net Tutar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "odeme_yontemi", name: "Ödeme Yöntemi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Havale/EFT", "Çek", "Nakit", "Kredi Kartı"] },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Hazırlandı", "Onaylandı", "Ödendi", "İptal"] },
        { code: "onaylayan", name: "Onaylayan", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        ...workflowFields(),
      ],
      [
        { id: "oe1", belge_no: "ODE-2026-0001", tarih: "2026-10-11", hak_sahibi: "Reklam A.Ş.", brut: 25000, kesinti: 0, net: 25000, odeme_yontemi: "Havale/EFT", durum: "Ödendi", onaylayan: "Tuğba Yörük", butce_durumu: "Bütçe İçi", onay_kademesi: "Otomatik Onay (<50K · Bütçe İçi)" },
        { id: "oe2", belge_no: "ODE-2026-0002", tarih: "2026-10-13", hak_sahibi: "JetBrains s.r.o.", brut: 45000, kesinti: 0, net: 45000, odeme_yontemi: "Kredi Kartı", durum: "Onaylandı", onaylayan: "Tuğba Yörük", butce_durumu: "Bütçe İçi", onay_kademesi: "Otomatik Onay (<50K · Bütçe İçi)" },
      ],
    ),
    mkTbl("T-0003", "Adres Kartı Tablosu",
      "Kullanıcıların adres kartları · kullanıcı kodu (T-0001) · adres tipi (İş/Fatura) · sokak-mahalle-ilçe-il", "MapPin",
      [
        { code: "adres_kodu", name: "Adres Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kullanici_kodu", name: "Kullanıcı Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kullanici_adi", name: "Kullanıcı Adı", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "adres_tipi", name: "Adres Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["İş", "Fatura Adresi", "Ev", "Diğer"] },
        { code: "sokak", name: "Sokak / Cadde", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "mahalle", name: "Mahalle", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "ilce", name: "İlçe", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "il", name: "İl", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "eposta", name: "E-posta", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "telefon1", name: "Telefon 1", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "telefon2", name: "Telefon 2", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "telefon3", name: "Telefon 3", type: "TEXT", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "adr1", adres_kodu: "ADR-0001", kullanici_kodu: "K-0001", kullanici_adi: "Şevket Kaan", adres_tipi: "İş", sokak: "Barbaros Cad. No:12", mahalle: "Barbaros Mah.", ilce: "Ataşehir", il: "İstanbul", eposta: "sevketkaan00@gmail.com", telefon1: "0532 111 22 33", telefon2: "0216 555 00 00", telefon3: "" },
        { id: "adr2", adres_kodu: "ADR-0002", kullanici_kodu: "K-0001", kullanici_adi: "Şevket Kaan", adres_tipi: "Fatura Adresi", sokak: "Barbaros Cad. No:12", mahalle: "Barbaros Mah.", ilce: "Ataşehir", il: "İstanbul", eposta: "muhasebe@timay.co", telefon1: "0216 555 00 01", telefon2: "", telefon3: "" },
        { id: "adr3", adres_kodu: "ADR-0003", kullanici_kodu: "K-0005", kullanici_adi: "Acme A.Ş.", adres_tipi: "Fatura Adresi", sokak: "Büyükdere Cad. No:100", mahalle: "Mecidiyeköy Mah.", ilce: "Şişli", il: "İstanbul", eposta: "info@acme.co", telefon1: "0212 100 00 00", telefon2: "0212 100 00 01", telefon3: "" },
      ],
    ),
    mkTbl("T-0006", "Kasa / Hesap Tanımları Tablosu",
      "Kasa, banka ve portföy hesaplarının tanımı (ERP/Hazine). Tahsilat/Ödeme evraklarında alt hesap buradan 'Tip'e göre seçilir.", "Wallet",
      [
        { code: "kasa_kodu", name: "Kasa / Hesap Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ad", name: "Kasa / Hesap Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tip", name: "Hesap Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Nakit Kasa", "Banka", "Alınan Çekler Kasası", "Alınan Senetler Kasası", "Kredi Kartı POS", "Döviz Kasası"] },
        { code: "doviz", name: "Döviz Cinsi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "muhasebe_hesap_kodu", name: "Muhasebe Hesap Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kasa_sorumlusu", name: "Kasa Sorumlusu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "acilis_bakiyesi", name: "Açılış Bakiyesi", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "guncel_bakiye", name: "Güncel Bakiye", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kritik_limit", name: "Kritik Limit (Alarm)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "k1", kasa_kodu: "100.01.001", ad: "Merkez TL Kasası", tip: "Nakit Kasa", doviz: "TL", muhasebe_hesap_kodu: "100.01.001", kasa_sorumlusu: "Tuğba Yörük", acilis_bakiyesi: 50000, guncel_bakiye: 92000, kritik_limit: 10000, durum: "Aktif" },
        { id: "k2", kasa_kodu: "100.02.001", ad: "Ankara Şube Euro Kasası", tip: "Döviz Kasası", doviz: "EUR", muhasebe_hesap_kodu: "100.02.001", kasa_sorumlusu: "Kadir Fırat", acilis_bakiyesi: 8000, guncel_bakiye: 5500, kritik_limit: 2000, durum: "Aktif" },
        { id: "k3", kasa_kodu: "102.01.001", ad: "Ziraat Bankası - TL", tip: "Banka", doviz: "TL", muhasebe_hesap_kodu: "102.01.001", kasa_sorumlusu: "Şevket Kaan", acilis_bakiyesi: 250000, guncel_bakiye: 410000, kritik_limit: 50000, durum: "Aktif" },
        { id: "k4", kasa_kodu: "102.01.002", ad: "İş Bankası - TL", tip: "Banka", doviz: "TL", muhasebe_hesap_kodu: "102.01.002", kasa_sorumlusu: "Şevket Kaan", acilis_bakiyesi: 120000, guncel_bakiye: 98000, kritik_limit: 30000, durum: "Aktif" },
        { id: "k5", kasa_kodu: "101.01.001", ad: "Alınan Çekler Portföyü", tip: "Alınan Çekler Kasası", doviz: "TL", muhasebe_hesap_kodu: "101.01.001", kasa_sorumlusu: "Tuğba Yörük", acilis_bakiyesi: 0, guncel_bakiye: 75000, kritik_limit: 0, durum: "Aktif" },
        { id: "k6", kasa_kodu: "121.01.001", ad: "Alınan Senetler Portföyü", tip: "Alınan Senetler Kasası", doviz: "TL", muhasebe_hesap_kodu: "121.01.001", kasa_sorumlusu: "Tuğba Yörük", acilis_bakiyesi: 0, guncel_bakiye: 40000, kritik_limit: 0, durum: "Aktif" },
        { id: "k7", kasa_kodu: "108.01.001", ad: "POS Kredi Kartı Hesabı", tip: "Kredi Kartı POS", doviz: "TL", muhasebe_hesap_kodu: "108.01.001", kasa_sorumlusu: "Tuğba Yörük", acilis_bakiyesi: 0, guncel_bakiye: 15000, kritik_limit: 0, durum: "Aktif" },
      ],
    ),
    mkTbl("T-0007", "Kasa Hareket Tablosu",
      "Kasa hareketleri · ERP (işlem türü/kur/muhasebe) + CRM (cari/makbuz/servis) + İş Akışı (masraf/avans/onay). Kasa T-0006, cari & sorumlu T-0001'den gelir.", "ArrowLeftRight",
      [
        // ── ERP (Finans / Muhasebe / Hazine) ──
        { code: "hareket_no", name: "Hareket No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "kasa", name: "Kasa (T-0006)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0006" },
        { code: "islem_turu", name: "İşlem Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Tahsilat", "Ödeme", "Kasalar Arası Virman", "Bankadan Kasaya", "Döviz Alım/Satım"] },
        { code: "tutar", name: "Tutar", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "doviz", name: "Döviz Cinsi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "kur", name: "İşlem Kuru", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "muhasebe_hesap_kodu", name: "Muhasebe Hesap Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "makbuz_no", name: "Makbuz No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "acilis_bakiyesi", name: "Açılış Bakiyesi", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kapanis_bakiyesi", name: "Kapanış Bakiyesi", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kasa_sorumlusu", name: "Kasa Sorumlusu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        // ── CRM (Satış / Saha / Müşteri) ──
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "cari_hareket_no", name: "İlgili Cari Hareket (T-0005)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tahsilat_makbuzu_id", name: "Saha Tahsilat Makbuzu ID", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "servis_formu_id", name: "Servis / İş Emri ID", type: "TEXT", required: false, visibility: "EVERYONE" },
        // ── İş Akışı (Workflow / Masraf) ──
        { code: "masraf_id", name: "Masraf Hareketi (T-0010)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0010" },
        { code: "avans_talep_id", name: "Avans Talep ID", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "onay_durumu", name: "Onay Durumu", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Ödemeye Hazır", "Departman Müdürü Onayladı", "Genel Müdür Onayı Bekliyor", "Kasa Fonlama Talebi", "Limit Aşım Onayı", "Kesinleşti", "Reddedildi"] },
        ...workflowFields(),
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "kh1", hareket_no: "KH-2026-0001", tarih: "2026-10-12", kasa: "Merkez TL Kasası", islem_turu: "Tahsilat", tutar: 45000, doviz: "TL", kur: 1, muhasebe_hesap_kodu: "100.01.001", makbuz_no: "MKB-2026-0012", acilis_bakiyesi: 47000, kapanis_bakiyesi: 92000, kasa_sorumlusu: "Tuğba Yörük", cari: "Beta Tedarik Ltd.", cari_hareket_no: "CH-2026-0002", tahsilat_makbuzu_id: "SÖZ-2026-12", servis_formu_id: "", masraf_id: "", avans_talep_id: "", onay_durumu: "Kesinleşti", butce_durumu: "Bütçe İçi", onay_kademesi: "Otomatik Onay (<50K · Bütçe İçi)", aciklama: "SÖZ-2026-12 sözleşme peşinatı — CRM'de müşteri borcu kapandı." },
        { id: "kh2", hareket_no: "KH-2026-0002", tarih: "2026-10-13", kasa: "Merkez TL Kasası", islem_turu: "Ödeme", tutar: 3200, doviz: "TL", kur: 1, muhasebe_hesap_kodu: "100.01.001", makbuz_no: "MKB-2026-0013", acilis_bakiyesi: 92000, kapanis_bakiyesi: 88800, kasa_sorumlusu: "Tuğba Yörük", cari: "", cari_hareket_no: "", tahsilat_makbuzu_id: "", servis_formu_id: "", masraf_id: "MH-2026-0001", avans_talep_id: "", onay_durumu: "Ödemeye Hazır", butce_durumu: "Bütçe İçi", onay_kademesi: "Otomatik Onay (<50K · Bütçe İçi)", aciklama: "Kadir Fırat müşteri ziyareti gideri — masraf onayı sonrası ödeme." },
        { id: "kh3", hareket_no: "KH-2026-0003", tarih: "2026-10-14", kasa: "Ankara Şube Euro Kasası", islem_turu: "Kasalar Arası Virman", tutar: 2500, doviz: "EUR", kur: 36.5, muhasebe_hesap_kodu: "100.02.001", makbuz_no: "MKB-2026-0014", acilis_bakiyesi: 8000, kapanis_bakiyesi: 5500, kasa_sorumlusu: "Kadir Fırat", cari: "", cari_hareket_no: "", tahsilat_makbuzu_id: "", servis_formu_id: "", masraf_id: "", avans_talep_id: "", onay_durumu: "Kesinleşti", butce_durumu: "Bütçe İçi", onay_kademesi: "Departman Müdürü Onayı (50K–250K / Bütçe Dışı)", aciklama: "Merkez EUR → Şube EUR transferi (finans yöneticisi onayı)." },
      ],
    ),
    mkTbl("T-0008", "Masraf Kart Tablosu",
      "Masraf (gider türü) tanım kartları · masraf kodu · kategori · para birimi/KDV · muhasebe hesap kodu (770/760) · masraf merkezi/proje · kullanım durumu. Hareket ve evraklarda bu kartlar seçilir.", "ReceiptText",
      [
        { code: "masraf_kodu", name: "Masraf Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "ad", name: "Masraf Adı / Açıklaması", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "kategori", name: "Masraf Türü / Kategorisi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Pazarlama", "Yönetim", "Üretim", "Satış", "IT", "İnsan Kaynakları", "Lojistik", "Finans", "Diğer"] },
        { code: "para_birimi", name: "Para Birimi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "kdv_orani", name: "KDV Oranı (%)", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["0", "1", "10", "20"] },
        { code: "muhasebe_hesap_kodu", name: "Muhasebe Hesap Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "masraf_merkezi", name: "Masraf Merkezi / Proje Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Kullanım Durumu", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "mk1", masraf_kodu: "MK-001", ad: "Elektrik Gideri", kategori: "Yönetim", para_birimi: "TL", kdv_orani: "20", muhasebe_hesap_kodu: "770", masraf_merkezi: "Genel Yönetim", durum: "Aktif" },
        { id: "mk2", masraf_kodu: "MK-002", ad: "Ofis Kırtasiye", kategori: "Yönetim", para_birimi: "TL", kdv_orani: "20", muhasebe_hesap_kodu: "770", masraf_merkezi: "IT", durum: "Aktif" },
        { id: "mk3", masraf_kodu: "MK-003", ad: "Nakliye / Kargo", kategori: "Lojistik", para_birimi: "TL", kdv_orani: "20", muhasebe_hesap_kodu: "760", masraf_merkezi: "Satış", durum: "Aktif" },
        { id: "mk4", masraf_kodu: "MK-004", ad: "Yemek Gideri", kategori: "İnsan Kaynakları", para_birimi: "TL", kdv_orani: "10", muhasebe_hesap_kodu: "770", masraf_merkezi: "İnsan Kaynakları", durum: "Aktif" },
        { id: "mk5", masraf_kodu: "MK-005", ad: "Reklam / Tanıtım", kategori: "Pazarlama", para_birimi: "TL", kdv_orani: "20", muhasebe_hesap_kodu: "760", masraf_merkezi: "Pazarlama", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0010", "Masraf Hareket Tablosu",
      "Gerçek masraf fişleri/işlemleri (İş Akışı). Masraf kartı T-0008, personel & onaylayan T-0001, departman T-0004, ödeyecek kasa T-0006'dan gelir. Onaylanmayan masraf kasadan çıkamaz.", "ReceiptText",
      [
        { code: "masraf_no", name: "Masraf Fiş No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "personel", name: "Personel (T-0025)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0025" },
        { code: "departman", name: "Departman (T-0004)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0004" },
        { code: "masraf_karti", name: "Masraf Kartı (T-0008)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "mod-T-0008" },
        { code: "tutar", name: "Tutar", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "para_birimi", name: "Para Birimi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "kdv_orani", name: "KDV Oranı (%)", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["0", "1", "10", "20"] },
        { code: "fatura_no", name: "Fatura / Fiş No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "proje", name: "İlgili Proje / Müşteri", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "avans_talep_id", name: "Avans Talep ID", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kasa", name: "Ödeyecek Kasa (T-0006)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Nakit Kasa" } },
        { code: "onay_durumu", name: "Onay Durumu", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Taslak", "Departman Müdürü Onayı Bekliyor", "Genel Müdür Onayı Bekliyor", "Onaylandı — Ödemeye Hazır", "Ödendi", "Reddedildi"] },
        { code: "onaylayan", name: "Onaylayan (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kasa_hareket_no", name: "İlgili Kasa Hareketi (T-0007)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0007" },
        { code: "butce_kalemi", name: "İlgili Bütçe Kalemi (T-0048)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0048" },
        ...workflowFields(),
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "mh1", masraf_no: "MH-2026-0001", tarih: "2026-10-13", personel: "Kadir Fırat", departman: "Pazarlama", masraf_karti: "Reklam / Tanıtım", tutar: 3200, para_birimi: "TL", kdv_orani: "20", fatura_no: "FIS-99821", proje: "Acme A.Ş. ziyareti", avans_talep_id: "", kasa: "Merkez TL Kasası", onay_durumu: "Onaylandı — Ödemeye Hazır", onaylayan: "Tuğba Yörük", kasa_hareket_no: "KH-2026-0002", butce_kalemi: "Pazarlama & Tanıtım", butce_durumu: "Bütçe İçi", onay_kademesi: "Otomatik Onay (<50K · Bütçe İçi)", aciklama: "Müşteri ziyareti gideri; kasa ödemesi KH-2026-0002 ile yapıldı." },
        { id: "mh2", masraf_no: "MH-2026-0002", tarih: "2026-10-14", personel: "Halim Bey", departman: "Yazılım", masraf_karti: "Ofis Kırtasiye", tutar: 5000, para_birimi: "TL", kdv_orani: "20", fatura_no: "", proje: "Saha kurulumu", avans_talep_id: "AVN-2026-0003", kasa: "Merkez TL Kasası", onay_durumu: "Genel Müdür Onayı Bekliyor", onaylayan: "", kasa_hareket_no: "", butce_durumu: "Bütçe Dışı", onay_kademesi: "Departman Müdürü Onayı (50K–250K / Bütçe Dışı)", aciklama: "İş avansı — onay bekliyor, henüz kasa ödemesi yok." },
      ],
    ),
    mkTbl("T-0005", "Cari Hareket Tablosu",
      "Cari hareketler · ERP (borç/alacak/vade/belge) + CRM (temsilci/fırsat/segment) + İş Akışı (onay/risk/görev). Cari ve temsilci T-0001'den gelir.", "Wallet",
      [
        // ── ERP (Finans/Muhasebe/Operasyon) ──
        { code: "hareket_id", name: "Hareket ID", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "cari_kod", name: "Cari (T-0001)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "islem_turu", name: "İşlem Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Fatura", "Tahsilat", "Ödeme", "Çek/Senet Girişi", "Kur Farkı", "Dekont"] },
        { code: "borc", name: "Borç (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "alacak", name: "Alacak (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "bakiye", name: "Bakiye (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "doviz", name: "Döviz Cinsi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["TL", "USD", "EUR", "GBP"] },
        { code: "kur", name: "İşlem Kuru", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "vade_tarihi", name: "Vade Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "gecikme_gun", name: "Gecikme Gün Sayısı", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "kapanan_tutar", name: "Kapanan / Eşleşen Tutar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "fatura_no", name: "Fatura No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "irsaliye_no", name: "İrsaliye No", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "depo_kodu", name: "Depo Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        // ── CRM (Müşteri İlişkileri/Satış) ──
        { code: "firsat_teklif", name: "Fırsat / Teklif ID", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "musteri_temsilcisi", name: "Müşteri Temsilcisi (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kampanya", name: "Kampanya / Kaynak", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "segment", name: "Müşteri Segmenti", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["VIP", "A Grubu", "B Grubu", "C Grubu", "Pasif"] },
        { code: "memnuniyet", name: "Memnuniyet / NPS", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "kontak_kisi", name: "Kontak Kişi (B2B)", type: "TEXT", required: false, visibility: "EVERYONE" },
        // ── İş Akışı (Workflow/BPM) ──
        { code: "onay_durumu", name: "Onay Durumu", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Onaylandı", "Finans Müdürü Onayı Bekliyor", "Risk Limiti Aşımı — Blokeli", "Reddedildi"] },
        { code: "bloke_kodu", name: "Bloke / Uyum Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "gorev", name: "Atanan Görev", type: "TEXT", required: false, visibility: "EVERYONE" },
        // ── Bağlantılar (Kasa / Masraf) ──
        { code: "ilgili_kasa", name: "İlgili Kasa / Hesap (T-0006)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006" },
        { code: "kasa_hareket_no", name: "İlgili Kasa Hareketi (T-0007)", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "ilgili_masraf", name: "İlgili Masraf (T-0008)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0008" },
        ...workflowFields(),
        { code: "kayit_tarihi", name: "Kayıt Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "onay_tarihi", name: "Onay Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "ch1", hareket_id: "CH-2026-0001", cari_kod: "Acme A.Ş.", islem_turu: "Fatura", borc: 120000, alacak: 0, bakiye: 120000, doviz: "TL", kur: 1, vade_tarihi: "2026-11-10", gecikme_gun: 0, kapanan_tutar: 0, fatura_no: "FTR-2026-0001", irsaliye_no: "IRS-2026-0001", depo_kodu: "DP-01", firsat_teklif: "FRS-2026-012", musteri_temsilcisi: "Ayşe Demir", kampanya: "İstanbul Fuarı", segment: "A Grubu", memnuniyet: 8, kontak_kisi: "Uğur Mertsöz", onay_durumu: "Onaylandı", bloke_kodu: "", gorev: "", butce_durumu: "Bütçe İçi", onay_kademesi: "Departman Müdürü Onayı (50K–250K / Bütçe Dışı)", kayit_tarihi: "2026-10-10", onay_tarihi: "2026-10-11" },
        { id: "ch2", hareket_id: "CH-2026-0002", cari_kod: "Beta Tedarik Ltd.", islem_turu: "Tahsilat", borc: 0, alacak: 90000, bakiye: 30000, doviz: "TL", kur: 1, vade_tarihi: "2026-10-30", gecikme_gun: 0, kapanan_tutar: 90000, fatura_no: "", irsaliye_no: "", depo_kodu: "", firsat_teklif: "", musteri_temsilcisi: "Şevket Kaan", kampanya: "", segment: "VIP", memnuniyet: 9, kontak_kisi: "", onay_durumu: "Finans Müdürü Onayı Bekliyor", bloke_kodu: "", gorev: "Müşteriyi tahsilat için ara", ilgili_kasa: "Merkez TL Kasası", kasa_hareket_no: "KH-2026-0001", ilgili_masraf: "", butce_durumu: "Bütçe İçi", onay_kademesi: "Departman Müdürü Onayı (50K–250K / Bütçe Dışı)", kayit_tarihi: "2026-10-12", onay_tarihi: "" },
      ],
    ),
    mkTbl("T-0011", "Satış Fırsatları (Pipeline)",
      "CRM satış hunisi · fırsat/deal · aşama (pipeline) · değer · olasılık · sorumlu. Pano görünümünde aşamalar arası sürükle-bırak.", "TrendingUp",
      [
        { code: "baslik", name: "Fırsat Başlığı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "cari", name: "Cari / Müşteri (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "deger", name: "Değer (₺)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "asama", name: "Aşama", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Yeni / Lead", "İletişim Kuruldu", "Teklif Verildi", "Müzakere", "Kazanıldı", "Kaybedildi"] },
        { code: "olasilik", name: "Kazanma Olasılığı (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "sorumlu", name: "Sorumlu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kapanis_tarihi", name: "Beklenen Kapanış", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "kaynak", name: "Kaynak", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Web", "Referans", "Fuar / Etkinlik", "Soğuk Arama", "Sosyal Medya", "Mevcut Müşteri", "Diğer"] },
        { code: "aciklama", name: "Not", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "fr1", baslik: "Acme ERP Lisans Yenileme", cari: "Acme A.Ş.", deger: 250000, asama: "Teklif Verildi", olasilik: 60, sorumlu: "Kadir Fırat", kapanis_tarihi: "2026-11-30", kaynak: "Mevcut Müşteri", aciklama: "Yıllık lisans + 10 ek kullanıcı." },
        { id: "fr2", baslik: "Beta Bakım & Destek Sözleşmesi", cari: "Beta Tedarik Ltd.", deger: 90000, asama: "Müzakere", olasilik: 75, sorumlu: "Şevket Kaan", kapanis_tarihi: "2026-11-15", kaynak: "Referans", aciklama: "Fiyat görüşmesi sürüyor." },
        { id: "fr3", baslik: "Delta Danışmanlık Entegrasyon", cari: "Delta Danışmanlık", deger: 120000, asama: "İletişim Kuruldu", olasilik: 40, sorumlu: "Kadir Fırat", kapanis_tarihi: "2026-12-10", kaynak: "Fuar / Etkinlik", aciklama: "İhtiyaç analizi toplantısı planlandı." },
        { id: "fr4", baslik: "Yeni Pazar — Potansiyel Müşteri", cari: "", deger: 60000, asama: "Yeni / Lead", olasilik: 20, sorumlu: "Tuğba Yörük", kapanis_tarihi: "2026-12-20", kaynak: "Web", aciklama: "Formdan gelen talep." },
        { id: "fr5", baslik: "Acme Ek Modül Satışı", cari: "Acme A.Ş.", deger: 180000, asama: "Kazanıldı", olasilik: 100, sorumlu: "Şevket Kaan", kapanis_tarihi: "2026-10-10", kaynak: "Mevcut Müşteri", aciklama: "Sözleşme imzalandı." },
      ],
    ),
    mkTbl("T-0012", "Vergi Oranları Tablosu",
      "KDV / vergi oranı tanımları (Akaunting tarzı) · fatura ve masraflarda kullanılır.", "Receipt",
      [
        { code: "ad", name: "Vergi Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "oran", name: "Oran (%)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Satış KDV", "Alış KDV", "Tevkifat", "Stopaj", "ÖTV", "Diğer"] },
        { code: "muhasebe_hesap_kodu", name: "Muhasebe Hesap Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "vr1", ad: "Genel KDV %20", oran: 20, tur: "Satış KDV", muhasebe_hesap_kodu: "391", durum: "Aktif" },
        { id: "vr2", ad: "İndirimli KDV %10", oran: 10, tur: "Satış KDV", muhasebe_hesap_kodu: "391", durum: "Aktif" },
        { id: "vr3", ad: "Temel Gıda %1", oran: 1, tur: "Satış KDV", muhasebe_hesap_kodu: "391", durum: "Aktif" },
        { id: "vr4", ad: "İstisna %0", oran: 0, tur: "Diğer", muhasebe_hesap_kodu: "", durum: "Aktif" },
        { id: "vr5", ad: "İndirilecek KDV %20", oran: 20, tur: "Alış KDV", muhasebe_hesap_kodu: "191", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0013", "Gelir / Gider Kategorileri Tablosu",
      "Gelir ve gider kategori tanımları (Akaunting tarzı) · muhasebe hesap kodu ile eşleşir.", "Table2",
      [
        { code: "ad", name: "Kategori Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tur", name: "Tür", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Gelir", "Gider"] },
        { code: "muhasebe_hesap_kodu", name: "Muhasebe Hesap Kodu", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "kt1", ad: "Satış Geliri", tur: "Gelir", muhasebe_hesap_kodu: "600", durum: "Aktif" },
        { id: "kt2", ad: "Hizmet Geliri", tur: "Gelir", muhasebe_hesap_kodu: "601", durum: "Aktif" },
        { id: "kt3", ad: "Diğer Gelirler", tur: "Gelir", muhasebe_hesap_kodu: "649", durum: "Aktif" },
        { id: "kt4", ad: "Personel Gideri", tur: "Gider", muhasebe_hesap_kodu: "770", durum: "Aktif" },
        { id: "kt5", ad: "Pazarlama Gideri", tur: "Gider", muhasebe_hesap_kodu: "760", durum: "Aktif" },
        { id: "kt6", ad: "Genel Yönetim Gideri", tur: "Gider", muhasebe_hesap_kodu: "770", durum: "Aktif" },
        { id: "kt7", ad: "Finansman Gideri", tur: "Gider", muhasebe_hesap_kodu: "780", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0014", "Döviz Kurları Tablosu",
      "Para birimleri ve güncel kurlar (Akaunting tarzı multi-currency) · dövizli işlemlerde çevrim için.", "TrendingUp",
      [
        { code: "ad", name: "Döviz Kodu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "aciklama", name: "Para Birimi", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "kur", name: "Kur (₺)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Geçerlilik Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "dk1", ad: "TL", aciklama: "Türk Lirası", kur: 1, tarih: "2026-10-16", durum: "Aktif" },
        { id: "dk2", ad: "USD", aciklama: "ABD Doları", kur: 34.5, tarih: "2026-10-16", durum: "Aktif" },
        { id: "dk3", ad: "EUR", aciklama: "Euro", kur: 37.2, tarih: "2026-10-16", durum: "Aktif" },
        { id: "dk4", ad: "GBP", aciklama: "İngiliz Sterlini", kur: 43.8, tarih: "2026-10-16", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0015", "Tekrarlayan İşlemler Tablosu",
      "Periyodik fatura/tahsilat/ödeme/masraf kuralları (Akaunting tarzı recurring). Vadesi gelince ilgili evrak/tabloya otomatik kayıt üretir.", "Repeat",
      [
        { code: "baslik", name: "Tanım", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "islem_tipi", name: "İşlem Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Tahsilat", "Ödeme", "Fatura", "Masraf", "Cari Hareket"] },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "EVERYONE" },
        { code: "periyot", name: "Periyot", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Günlük", "Haftalık", "Aylık", "3 Aylık", "Yıllık"] },
        { code: "baslangic", name: "Başlangıç", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "sonraki_tarih", name: "Sonraki Çalışma", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "bitis", name: "Bitiş (ops.)", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Aktif", "Duraklatıldı", "Bitti"] },
        { code: "son_uretim", name: "Son Üretim", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "tk1", baslik: "Ofis Kirası (Aylık Ödeme)", islem_tipi: "Ödeme", cari: "Delta Danışmanlık", tutar: 25000, periyot: "Aylık", baslangic: "2026-01-01", sonraki_tarih: "2026-10-16", bitis: "", durum: "Aktif", son_uretim: "2026-09-16", aciklama: "Her ayın 16'sı ofis kirası." },
        { id: "tk2", baslik: "SaaS Aboneliği (Aylık Tahsilat)", islem_tipi: "Tahsilat", cari: "Acme A.Ş.", tutar: 15000, periyot: "Aylık", baslangic: "2026-03-05", sonraki_tarih: "2026-11-05", bitis: "", durum: "Aktif", son_uretim: "2026-10-05", aciklama: "Aylık yazılım aboneliği." },
        { id: "tk3", baslik: "Yıllık Bakım Faturası", islem_tipi: "Fatura", cari: "Beta Tedarik Ltd.", tutar: 45000, periyot: "Yıllık", baslangic: "2025-11-01", sonraki_tarih: "2026-11-01", bitis: "", durum: "Aktif", son_uretim: "2025-11-01", aciklama: "Yıllık bakım sözleşmesi faturası." },
        { id: "tk4", baslik: "İnternet & Hat Gideri (Aylık Masraf)", islem_tipi: "Masraf", cari: "", tutar: 2000, periyot: "Aylık", baslangic: "2026-01-16", sonraki_tarih: "2026-10-16", bitis: "", durum: "Aktif", son_uretim: "2026-09-16", aciklama: "Aylık internet/telefon gideri." },
      ],
    ),
    // ── Evraklar (kind: "evrak") — cari T-0001'e bağlı ──
    mkTbl("EVR-0001", "Tahsilat Evrağı",
      "Cariden tahsilat belgesi · cari (T-0001) · tutar · Tahsilat Tipi'ne göre alt hesap (kasa/banka/çek/senet) T-0006'dan açılır.", "Receipt",
      [
        { code: "evrak_no", name: "Evrak No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "tahsilat_tipi", name: "Tahsilat Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Nakit", "Havale/EFT", "Çek", "Senet", "Kredi Kartı"] },
        // Tahsilat tipine göre açılan alt hesap — kaynak T-0006 (ilgili tip ile süzülür)
        { code: "kasa", name: "Kasa", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Nakit Kasa" }, showWhen: { field: "tahsilat_tipi", in: ["Nakit"] } },
        { code: "banka", name: "Banka", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Banka" }, showWhen: { field: "tahsilat_tipi", in: ["Havale/EFT"] } },
        { code: "alinan_cek_kasa", name: "Alınan Çekler Kasası", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Alınan Çekler Kasası" }, showWhen: { field: "tahsilat_tipi", in: ["Çek"] } },
        { code: "alinan_senet_kasa", name: "Alınan Senetler Kasası", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Alınan Senetler Kasası" }, showWhen: { field: "tahsilat_tipi", in: ["Senet"] } },
        { code: "pos_kasa", name: "Kredi Kartı (POS) Kasası", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006", optionsFilter: { field: "tip", equals: "Kredi Kartı POS" }, showWhen: { field: "tahsilat_tipi", in: ["Kredi Kartı"] } },
        { code: "vade", name: "Vade Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        ...workflowFields(),
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Hazırlandı", "Onaylandı", "Tahsil Edildi", "İptal"] },
      ],
      [], "evrak",
    ),
    mkTbl("EVR-0002", "Ödeme Evrağı",
      "Ödeme belgesi · hareket tipi (Cari / Masraf) · cari (T-0001) ya da masraf kartı (T-0008) · tutar · yöntem · vade", "Receipt",
      [
        { code: "evrak_no", name: "Evrak No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "hareket_tipi", name: "Evrak Hareket Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Cari", "Masraf"] },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users", showWhen: { field: "hareket_tipi", in: ["Cari"] } },
        { code: "masraf_karti", name: "Masraf Kartı (T-0008)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0008", showWhen: { field: "hareket_tipi", in: ["Masraf"] } },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "yontem", name: "Ödeme Yöntemi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Nakit", "Havale/EFT", "Çek", "Senet", "Kredi Kartı"] },
        { code: "vade", name: "Vade Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "harcama_yetkisi", name: "Harcama Yetkisi (Onaylayan)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        ...workflowFields(),
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Hazırlandı", "Onaylandı", "Ödendi", "İptal"] },
      ],
      [], "evrak",
    ),
    mkTbl("EVR-0003", "Fatura Evrağı",
      "Satış/alış faturası · cari (T-0001) · matrah · KDV · toplam", "FileText",
      [
        { code: "evrak_no", name: "Fatura No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: true, visibility: "EVERYONE", optionsSource: "users" },
        { code: "fatura_tipi", name: "Fatura Tipi", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Satış", "Alış", "İade"] },
        { code: "matrah", name: "Matrah (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kdv_orani", name: "KDV Oranı (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "kdv_tutari", name: "KDV Tutarı (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "toplam", name: "Toplam (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Taslak", "Kesildi", "Gönderildi", "İptal"] },
      ],
      [], "evrak",
    ),
    mkTbl("T-0004", "Departman Tanımları Tablosu",
      "Departmanların tanımlandığı tablo — T-0001 (Kullanıcılar) departman alanı buradan seçilir.", "Building2",
      [
        { code: "ad", name: "Departman Adı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Aktif", "Pasif"] },
      ],
      [
        { id: "dp1", ad: "Yazılım", aciklama: "Yazılım geliştirme", durum: "Aktif" },
        { id: "dp2", ad: "Finans", aciklama: "Mali işler / muhasebe", durum: "Aktif" },
        { id: "dp3", ad: "Pazarlama", aciklama: "Satış ve pazarlama", durum: "Aktif" },
        { id: "dp4", ad: "Yönetim", aciklama: "Üst yönetim", durum: "Aktif" },
        { id: "dp5", ad: "Dış Kaynak", aciklama: "Dış paydaş / tedarikçi", durum: "Aktif" },
      ],
    ),
    mkTbl("T-0042", "İş Hareket Tablosu",
      "Proje iş hareketleri · tarih · tür (telefon/WhatsApp/toplantı/yemek/gider/tahsilat/ödeme…) · kullanıcı · il · tutar", "ClipboardList",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "hareket_turu", name: "Hareket Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Telefon", "WhatsApp", "Toplantı", "Yemek", "Ziyaret", "E-posta", "Teklif", "Sözleşme", "Gider", "Tahsilat", "Ödeme", "Diğer"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "kullanici", name: "Kullanıcı", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "il", name: "İl", type: "TEXT", required: false, visibility: "EVERYONE" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
      ],
      [
        { id: "h1", tarih: "2026-10-07", hareket_turu: "Toplantı", aciklama: "Tanışma ve proje hakkında bilgilendirme telekonferansı", kullanici: "Tuğba Yörük", il: "" },
        { id: "h2", tarih: "2026-10-08", hareket_turu: "Ziyaret", aciklama: "Pazar araştırması ve detayı", kullanici: "Kadir Fırat", il: "" },
        { id: "h3", tarih: "2026-10-09", hareket_turu: "Telefon", aciklama: "Tuğba Yörük ile pazar araştırması hakkında sözlü brifing", kullanici: "Kadir Fırat", il: "" },
        { id: "h4", tarih: "2026-10-10", hareket_turu: "Toplantı", aciklama: "Proje hakkında bilgi verilmesi — Uğur Mertsöz'e", kullanici: "Kadir Fırat", il: "" },
        { id: "h5", tarih: "2026-10-11", hareket_turu: "Toplantı", aciklama: "Proje hakkında bilgi verilmesi ve talep toplama — Kozan Bey", kullanici: "Kadir Fırat", il: "İstanbul" },
        { id: "h6", tarih: "2026-10-12", hareket_turu: "Telefon", aciklama: "Halim Bey – Kadir Fırat telefon görüşmesi: proje ve süreç yönetimi", kullanici: "Kadir Fırat", il: "" },
        { id: "h7", tarih: "2026-10-14", hareket_turu: "WhatsApp", aciklama: "Halim Bey WhatsApp mesajı (proje tamamlama oranı %95) ve Kadir Fırat teşekkür mesajı", kullanici: "Kadir Fırat", il: "" },
      ],
    ),
    mkTbl("T-0043", "Hedef ve Kar Tablosu",
      "Dönem bazlı hedeflenen kar · bütçe (gerçekleşen Satış Tablosu'ndan otomatik gelir)", "Briefcase",
      [
        { code: "donem", name: "Dönem", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "hedef_gelir", name: "Hedeflenen Gelir (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "hedef_kar", name: "Hedeflenen Kar (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "butce", name: "Bütçe (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesen_gelir", name: "Gerçekleşen Gelir (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesen_maliyet", name: "Gerçekleşen Maliyet (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesen_kar", name: "Gerçekleşen Kâr (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "sapma_yuzde", name: "Sapma (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "k1", donem: "2026 Q4", hedef_gelir: 2000000, hedef_kar: 1200000, butce: 500000, gerceklesen_gelir: 0, gerceklesen_maliyet: 0, gerceklesen_kar: 0, sapma_yuzde: 0, aciklama: "Lansman dönemi hedefi" },
        { id: "k2", donem: "2027 Q1", hedef_kar: 1800000, butce: 650000, aciklama: "Büyüme dönemi" },
      ],
    ),
    mkTbl("T-0036", "Satış Tablosu",
      "Proje satışları · dönem · müşteri · tutar (Hedef ve Kar'daki Gerçekleşen bu tablodan otomatik hesaplanır)", "TrendingUp",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "donem", name: "Dönem", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "musteri", name: "Müşteri (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "sl1", tarih: "2026-11-05", donem: "2026 Q4", musteri: "Acme A.Ş.", tutar: 150000, aciklama: "İlk lansman satışı" },
        { id: "sl2", tarih: "2026-12-20", donem: "2026 Q4", musteri: "Beta Ltd.", tutar: 90000, aciklama: "Kurumsal paket" },
      ],
    ),
    mkTbl("T-0044", "Resmi Kayıtlar & Vergi Tablosu",
      "Resmi kayıtlar · vergi hesaplama (matrah · KDV · toplam) · belge türü", "FileText",
      [
        { code: "belge_no", name: "Belge No", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "belge_turu", name: "Belge Türü", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Fatura", "Beyanname", "Makbuz", "Tahakkuk", "Serbest Meslek Makbuzu", "Diğer"] },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "matrah", name: "Matrah (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kdv_orani", name: "KDV Oranı (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "kdv_tutari", name: "KDV Tutarı (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kdv_turu", name: "KDV Türü", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Hesaplanan KDV (Satış)", "İndirilecek KDV (Alış)"] },
        { code: "tevkifat_stopaj", name: "Tevkifat / Stopaj (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "toplam", name: "Toplam (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "son_odeme_tarihi", name: "Son Ödeme / Vade Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "odeme_durumu", name: "Ödeme Durumu", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Ödenmedi", "Ödendi", "Kısmi"] },
      ],
      [
        { id: "v1", belge_no: "FTR-2026-0001", belge_turu: "Fatura", tarih: "2026-10-12", matrah: 100000, kdv_orani: 20, kdv_tutari: 20000, kdv_turu: "Hesaplanan KDV (Satış)", toplam: 120000, cari: "Acme A.Ş.", son_odeme_tarihi: "2026-11-12", odeme_durumu: "Ödenmedi" },
      ],
    ),
    mkTbl("T-0045", "İş Onay Süreçleri",
      "Onay kartları · istek tipi · talep · onaylayan · durum · tutar — onaylanınca ilgili bölüm güncellenir", "ClipboardList",
      [
        { code: "konu", name: "Konu", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "istek_tipi", name: "İstek Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Ödeme", "Tahsilat", "Gider", "Satın Alma", "Hedef Değiştirme", "Kar Değiştirme", "Görev Değiştirme", "Hak Sahibi Onayı"] },
        { code: "talep_eden", name: "Talep Eden", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "onaylayan", name: "Onaylayan", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tutar", name: "Tutar / Yeni Değer (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Bekliyor", "İncelemede", "Onaylandı", "Reddedildi"] },
        { code: "tarih", name: "Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "o1", konu: "İstanbul tanıtım gideri onayı", istek_tipi: "Gider", talep_eden: "Kadir Fırat", onaylayan: "Tuğba Yörük", tutar: 25000, durum: "Onaylandı", tarih: "2026-10-11", aciklama: "Tanıtım harcaması" },
        { id: "o2", konu: "Ek geliştirme kaynağı", istek_tipi: "Satın Alma", talep_eden: "Halim Bey", onaylayan: "", tutar: 120000, durum: "Bekliyor", tarih: "2026-10-13", aciklama: "Son %5 için ek efor" },
        { id: "o3", konu: "2026 Q4 hedef kârı güncelle", istek_tipi: "Hedef Değiştirme", talep_eden: "Tuğba Yörük", onaylayan: "", tutar: 1500000, durum: "Bekliyor", tarih: "2026-10-14", aciklama: "Pazar olumlu, hedef yükseltildi" },
        { id: "o4", konu: "Tuğba Yörük hak sahipliği onayı", istek_tipi: "Hak Sahibi Onayı", talep_eden: "Kadir Fırat", onaylayan: "", tutar: 0, durum: "Bekliyor", tarih: "2026-10-14", aciklama: "Kâr-Zarar ortaklığı · hak sahibi onayı bekliyor" },
      ],
    ),
    mkTbl("T-0046", "Proje Hesabı (Muhasebe)",
      "Proje muhasebe defteri · hareket tipi (ödeme/tahsilat/alış/satış/satın alma) · tür (gider/cari) · cari · harcama yetkisi · tutar → maliyet & kâr", "Database",
      [
        { code: "tarih", name: "Tarih", type: "DATE", required: true, visibility: "EVERYONE" },
        { code: "hareket_tipi", name: "Hareket Tipi", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Tahsilat", "Satış", "Ödeme", "Alış", "Satın Alma"] },
        { code: "hareket_turu", name: "Hareket Türü", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Gider", "Cari"] },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "harcama_yetkisi", name: "Harcama Yetkisi (Onaylayan)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
      ],
      [
        { id: "m1", tarih: "2026-10-11", hareket_tipi: "Tahsilat", hareket_turu: "Cari", cari: "Acme A.Ş.", harcama_yetkisi: "", aciklama: "Proje avans tahsilatı", tutar: 150000 },
        { id: "m2", tarih: "2026-10-12", hareket_tipi: "Ödeme", hareket_turu: "Gider", cari: "", harcama_yetkisi: "Tuğba Yörük", aciklama: "İstanbul tanıtım gideri", tutar: 25000 },
        { id: "m3", tarih: "2026-10-13", hareket_tipi: "Satın Alma", hareket_turu: "Cari", cari: "Beta Tedarik", harcama_yetkisi: "Tuğba Yörük", aciklama: "Geliştirme lisans/araç alımı", tutar: 40000 },
      ],
    ),
    mkTbl("T-0047", "Kilometre Taşları Tablosu",
      "Projenin kritik aşamaları ve ana teslimatları · hedef tarih · durum · sorumlu · tamamlanma", "ClipboardList",
      [
        { code: "ad", name: "Kilometre Taşı", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "hedef_tarih", name: "Hedef Tarih", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Durum", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Planlandı", "Devam Ediyor", "Tamamlandı", "Gecikti"] },
        { code: "sorumlu", name: "Sorumlu", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "tamamlanma", name: "Tamamlanma (%)", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "km1", ad: "Tasarım onayı", hedef_tarih: "2026-10-10", durum: "Tamamlandı", sorumlu: "Tuğba Yörük", tamamlanma: 100, aciklama: "Tasarım sistemi ve onay" },
        { id: "km2", ad: "MVP geliştirme", hedef_tarih: "2026-12-15", durum: "Devam Ediyor", sorumlu: "Halim Bey", tamamlanma: 95, aciklama: "Çekirdek özellikler" },
        { id: "km3", ad: "Beta sürüm", hedef_tarih: "2027-01-31", durum: "Planlandı", sorumlu: "Halim Bey", tamamlanma: 0, aciklama: "Kapalı beta testleri" },
        { id: "km4", ad: "Yayına alma", hedef_tarih: "2027-03-31", durum: "Planlandı", sorumlu: "Tuğba Yörük", tamamlanma: 0, aciklama: "App Store / Play Store yayını" },
      ],
    ),
    mkTbl("T-0048", "Bütçe Kontrol Tablosu (Bütçe-Gerçekleşen)",
      "Bütçe Katmanı · departman/proje bazlı yıllık/aylık bütçe vs gerçekleşen · kalan · kullanım % · aşım durumu (harcama bütçeyi aşarsa onay ağırlaşır).", "Briefcase",
      [
        { code: "kalem", name: "Kalem", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "departman", name: "Departman (T-0004)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0004" },
        { code: "sorumlu", name: "Bütçe Sorumlusu (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kategori", name: "Kategori", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Geliştirme", "Pazarlama", "Donanım", "Personel", "Lisans", "Diğer"] },
        { code: "donem", name: "Dönem", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["2026 Yıllık", "2026 Q4", "2026-10 (Aylık)", "2026-11 (Aylık)", "2027 Yıllık"] },
        { code: "butce", name: "Bütçe (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesen_manuel", name: "Manuel / Diğer Gerçekleşen (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesen", name: "Gerçekleşen Toplam (₺) · oto", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kalan", name: "Kalan (₺) · oto", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "kullanim_yuzde", name: "Kullanım (%) · oto", type: "NUMBER", required: false, visibility: "EVERYONE" },
        { code: "durum", name: "Bütçe Durumu · oto", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Bütçe İçi", "Kritik — Yaklaşıyor (>%85)", "Aşıldı", "Sıfır Bütçe"] },
      ],
      [
        { id: "b1", kalem: "Yazılım Geliştirme", departman: "Yazılım", kategori: "Geliştirme", donem: "2026 Q4", butce: 250000, gerceklesen_manuel: 240000, gerceklesen: 240000, kalan: 10000, kullanim_yuzde: 96, durum: "Kritik — Yaklaşıyor (>%85)" },
        { id: "b2", kalem: "Pazarlama & Tanıtım", departman: "Pazarlama", kategori: "Pazarlama", donem: "2026 Q4", butce: 120000, gerceklesen_manuel: 131800, gerceklesen: 135000, kalan: -15000, kullanim_yuzde: 113, durum: "Aşıldı" },
        { id: "b3", kalem: "Lisans & Araçlar", departman: "Yazılım", kategori: "Lisans", donem: "2026 Q4", butce: 80000, gerceklesen_manuel: 40000, gerceklesen: 40000, kalan: 40000, kullanim_yuzde: 50, durum: "Bütçe İçi" },
        { id: "b4", kalem: "Personel", departman: "İnsan Kaynakları", kategori: "Personel", donem: "2026 Q4", butce: 50000, gerceklesen_manuel: 45000, gerceklesen: 45000, kalan: 5000, kullanim_yuzde: 90, durum: "Kritik — Yaklaşıyor (>%85)" },
      ],
    ),
    mkTbl("T-0009", "Nakit Akış Tablosu",
      "Nakit Akışı Katmanı · vade tarihine göre nakit giriş/çıkış projeksiyonu · kaynak (fatura/tahsilat/ödeme/masraf) · kasa/banka · beklenen vs gerçekleşen bakiye.", "LineChart",
      [
        { code: "donem", name: "Dönem / Hafta", type: "TEXT", required: true, visibility: "EVERYONE" },
        { code: "vade_tarihi", name: "Vade Tarihi", type: "DATE", required: false, visibility: "EVERYONE" },
        { code: "yon", name: "Yön", type: "DROPDOWN", required: true, visibility: "EVERYONE", options: ["Giriş (+)", "Çıkış (−)"] },
        { code: "kaynak", name: "Kaynak Türü", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Fatura Tahsilatı", "Peşin Tahsilat", "Tedarikçi Ödemesi", "Masraf / Avans", "Maaş / Bordro", "Vergi / SGK", "Kredi / Finansman", "Diğer"] },
        { code: "cari", name: "Cari (T-0001)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "users" },
        { code: "kasa", name: "Kasa / Banka (T-0006)", type: "DROPDOWN", required: false, visibility: "EVERYONE", optionsSource: "mod-T-0006" },
        { code: "tutar", name: "Tutar (₺)", type: "NUMBER", required: true, visibility: "ONLY_MANAGERS" },
        { code: "projeksiyon_bakiye", name: "Projeksiyon Bakiye (₺)", type: "NUMBER", required: false, visibility: "ONLY_MANAGERS" },
        { code: "gerceklesme", name: "Gerçekleşme", type: "DROPDOWN", required: false, visibility: "EVERYONE", options: ["Beklenen (Projeksiyon)", "Gerçekleşti", "Gecikti", "Riskli / Bloke"] },
        { code: "aciklama", name: "Açıklama", type: "TEXTAREA", required: false, visibility: "EVERYONE" },
      ],
      [
        { id: "nk1", donem: "2026-10 H2", vade_tarihi: "2026-10-30", yon: "Giriş (+)", kaynak: "Fatura Tahsilatı", cari: "Acme A.Ş.", kasa: "Ziraat Bankası - TL", tutar: 120000, projeksiyon_bakiye: 530000, gerceklesme: "Beklenen (Projeksiyon)", aciklama: "FTR-2026-0001 vadesi 30 Ekim." },
        { id: "nk2", donem: "2026-10 H2", vade_tarihi: "2026-10-30", yon: "Giriş (+)", kaynak: "Peşin Tahsilat", cari: "Beta Tedarik Ltd.", kasa: "Merkez TL Kasası", tutar: 90000, projeksiyon_bakiye: 620000, gerceklesme: "Gerçekleşti", aciklama: "SÖZ-2026-12 peşinatı kasaya girdi (KH-2026-0001)." },
        { id: "nk3", donem: "2026-11 H1", vade_tarihi: "2026-11-05", yon: "Çıkış (−)", kaynak: "Maaş / Bordro", cari: "", kasa: "İş Bankası - TL", tutar: 180000, projeksiyon_bakiye: 440000, gerceklesme: "Beklenen (Projeksiyon)", aciklama: "Kasım bordro ödemesi." },
        { id: "nk4", donem: "2026-11 H1", vade_tarihi: "2026-11-10", yon: "Çıkış (−)", kaynak: "Tedarikçi Ödemesi", cari: "JetBrains s.r.o.", kasa: "İş Bankası - TL", tutar: 45000, projeksiyon_bakiye: 395000, gerceklesme: "Beklenen (Projeksiyon)", aciklama: "Lisans ödemesi (ODE-2026-0002)." },
      ],
    ),
  ];
}

function seed(): DynamicModule[] {
  const generic = SEED_TABLES.map(([code, name, description]) => ({
    id: `mod-${code}`,
    code,
    name,
    description,
    tableName: `dynamic_table_${tableNo(code)}`,
    icon: "Table2",
    active: true,
    createdAt: "2026-10-13",
    perms: { ...DEFAULT_PERMS },
    fields: genericFields(),
    records: [] as DynamicRecord[],
  }));
  // Kullanıcı Cari Kart tablosuna örnek cariler (ledger'daki Cari dropdown'u için).
  const cari = generic.find((m) => m.code === "T-0001");
  if (cari) {
    cari.records = [
      { id: "c1", ad: "Acme A.Ş.", aciklama: "Müşteri", durum: "Aktif" },
      { id: "c2", ad: "Beta Tedarik Ltd.", aciklama: "Satıcı", durum: "Aktif" },
      { id: "c3", ad: "Av. Can Yılmaz", aciklama: "Avukat", durum: "Aktif" },
      { id: "c4", ad: "Delta Danışmanlık", aciklama: "Danışman", durum: "Aktif" },
    ];
  }
  return [...generic, ...specialTables()];
}

function load(): DynamicModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DynamicModule[];
  } catch {
    /* yoksa seed'e düş */
  }
  return seed();
}

// ── Bütçe Katmanı: masraf hareketlerinden (T-0010) bütçe kalemlerini (T-0048) otomatik hesaplar ──
// Harcanan sayılan masraf durumları (bütçeyi tüketir): onaylanıp ödemeye hazır veya ödenmiş.
const BUTCE_TUKETEN_DURUMLAR = new Set(["Onaylandı — Ödemeye Hazır", "Ödendi"]);
function recalcBudget(mods: DynamicModule[]): DynamicModule[] {
  const budget = mods.find((m) => m.id === "mod-T-0048");
  if (!budget) return mods;
  const masraf = mods.find((m) => m.id === "mod-T-0010");
  const sums: Record<string, number> = {};
  for (const r of (masraf?.records ?? []) as Array<Record<string, unknown>>) {
    if (!BUTCE_TUKETEN_DURUMLAR.has(String(r.onay_durumu))) continue;
    const k = String(r.butce_kalemi ?? "").trim();
    if (!k) continue;
    sums[k] = (sums[k] ?? 0) + (Number(r.tutar) || 0);
  }
  const recs = budget.records.map((rec) => {
    const r = rec as Record<string, unknown>;
    const butce = Number(r.butce) || 0;
    const manuel = Number(r.gerceklesen_manuel ?? 0) || 0;
    const ger = manuel + (sums[String(r.kalem ?? "").trim()] ?? 0);
    const kalan = butce - ger;
    const kullanim = butce ? Math.round((ger / butce) * 100) : 0;
    const durum = butce === 0 ? "Sıfır Bütçe" : ger > butce ? "Aşıldı" : kullanim >= 85 ? "Kritik — Yaklaşıyor (>%85)" : "Bütçe İçi";
    return { ...rec, gerceklesen: ger, kalan, kullanim_yuzde: kullanim, durum };
  });
  return mods.map((m) => (m.id === "mod-T-0048" ? { ...m, records: recs } : m));
}
// T-0010 (masraf) veya T-0048 (bütçe) değişince bütçeyi yeniden hesapla.
const maybeRecalc = (mods: DynamicModule[], moduleId: string) =>
  moduleId === "mod-T-0010" || moduleId === "mod-T-0048" ? recalcBudget(mods) : mods;

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<DynamicModule[]>(() => recalcBudget(load()));
  const { log } = useAudit();

  // Her değişiklikte localStorage'a yaz (mock kalıcılık).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    } catch {
      /* kota dolabilir, yok say */
    }
  }, [modules]);

  const getModule = useCallback(
    (id: string) => modules.find((m) => m.id === id),
    [modules],
  );

  const createModule = useCallback((input: NewModuleInput) => {
    const id = uid("mod");
    const isEvrak = input.kind === "evrak";
    const code = isEvrak ? nextEvrakCode(modules) : nextTableCode(modules); // EVR-00NN veya T-00NN
    const mod: DynamicModule = {
      id,
      code,
      name: input.name,
      description: input.description,
      icon: input.icon,
      kind: isEvrak ? "evrak" : "tablo",
      tableName: `dynamic_table_${tableNo(code)}`,
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
      perms: { ...DEFAULT_PERMS }, // ← otomatik yetki matrisine bağlanır
      fields: input.fields.map((f) => ({ ...f, id: uid("f") })),
      records: [],
    };
    setModules((prev) => [...prev, mod]);
    log({ category: "modul", action: isEvrak ? "Evrak oluşturuldu" : "Tablo oluşturuldu", target: `${mod.name} (${mod.code})` });
    return mod;
  }, [modules, log]);

  const updateModule = useCallback(
    (id: string, patch: { name: string; description: string; icon: string; fields: FieldPatch[] }) => {
      setModules((prev) =>
        prev.map((m) =>
          m.id !== id
            ? m
            : {
                ...m,
                name: patch.name,
                description: patch.description,
                icon: patch.icon,
                // Mevcut alanlar id/kodunu korur (kayıt verisi bozulmaz); yeni alanlara id üretilir.
                fields: patch.fields.map((f) => ({ ...f, id: f.id ?? uid("f") })),
              },
        ),
      );
      log({ category: "modul", action: "Tablo düzenlendi", target: patch.name });
    },
    [log],
  );

  const deleteModule = useCallback((id: string) => {
    const m = modules.find((x) => x.id === id);
    setModules((prev) => prev.filter((x) => x.id !== id));
    log({ category: "modul", action: "Tablo silindi", target: m?.name });
  }, [modules, log]);

  const toggleActive = useCallback((id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  }, []);

  const addRecord = useCallback((moduleId: string, data: Record<string, unknown>) => {
    const m = modules.find((x) => x.id === moduleId);
    // Her kayıta otomatik kayıt tarihi damgası (kartta/tabloda gösterilir).
    const eklenme = new Date().toISOString().slice(0, 10);
    setModules((prev) =>
      maybeRecalc(
        prev.map((x) =>
          x.id === moduleId
            ? { ...x, records: [{ id: uid("r"), _eklenme: eklenme, ...data } as DynamicRecord, ...x.records] }
            : x,
        ),
        moduleId,
      ),
    );
    log({ category: "kayit", action: "Kayıt eklendi", target: m?.name });
  }, [modules, log]);

  const updateRecord = useCallback((moduleId: string, recordId: string, data: Record<string, unknown>) => {
    const m = modules.find((x) => x.id === moduleId);
    setModules((prev) =>
      maybeRecalc(
        prev.map((x) =>
          x.id === moduleId
            ? { ...x, records: x.records.map((r) => (r.id === recordId ? ({ ...r, ...data, id: recordId } as DynamicRecord) : r)) }
            : x,
        ),
        moduleId,
      ),
    );
    log({ category: "kayit", action: "Kayıt güncellendi", target: m?.name });
  }, [modules, log]);

  const deleteRecord = useCallback((moduleId: string, recordId: string) => {
    const m = modules.find((x) => x.id === moduleId);
    setModules((prev) =>
      maybeRecalc(
        prev.map((x) =>
          x.id === moduleId ? { ...x, records: x.records.filter((r) => r.id !== recordId) } : x,
        ),
        moduleId,
      ),
    );
    log({ category: "kayit", action: "Kayıt silindi", target: m?.name });
  }, [modules, log]);

  // Tüm modüllerin kayıtlarını temizle (gerçek test için temiz başlangıç) — tablo/alan yapısı korunur.
  const clearAllRecords = useCallback(() => {
    setModules((prev) => prev.map((m) => ({ ...m, records: [] })));
    log({ category: "kayit", action: "Tüm kayıtlar temizlendi (test)" });
  }, [log]);

  const value = useMemo<ModulesState>(
    () => ({ modules, getModule, createModule, updateModule, deleteModule, toggleActive, addRecord, updateRecord, deleteRecord, clearAllRecords }),
    [modules, getModule, createModule, updateModule, deleteModule, toggleActive, addRecord, updateRecord, deleteRecord, clearAllRecords],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useModules(): ModulesState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useModules must be used within <ModulesProvider>");
  return ctx;
}
