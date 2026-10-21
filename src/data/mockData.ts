import type {
  ActivityItem,
  Metric,
  PerfPoint,
  Project,
  SparkPoint,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────
// Deterministic mock data. A tiny seeded PRNG keeps sparklines stable across
// reloads so the prototype looks "live" without flickering on every render.
// ─────────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build an upward-biased wobbly series for sparklines / trends. */
function makeSpark(seed: number, start: number, drift: number, len = 16): SparkPoint[] {
  const rnd = mulberry32(seed);
  let v = start;
  const out: SparkPoint[] = [];
  for (let i = 0; i < len; i++) {
    v = Math.max(1, v + drift + (rnd() - 0.42) * drift * 3.2);
    out.push({ i, v: Math.round(v) });
  }
  return out;
}

// ── Top summary metrics ───────────────────────────────────────────────────
export const metrics: Metric[] = [
  {
    id: "portfolio",
    label: "Toplam Portföy Değeri",
    value: 486_200_000,
    format: "currency",
    delta: 0.124,
    accent: "emerald",
    spark: makeSpark(11, 300, 9),
  },
  {
    id: "active",
    label: "Aktif Yatırımlar",
    value: 142_750_000,
    format: "currency",
    delta: 0.058,
    accent: "blue",
    spark: makeSpark(23, 120, 4),
  },
  {
    id: "realestate",
    label: "Tamamlanan Projeler",
    value: 37,
    format: "number",
    delta: 0.09,
    accent: "violet",
    spark: makeSpark(37, 10, 1.1),
  },
  {
    id: "partnership",
    label: "Ortaklık Gelirleri",
    value: 58_400_000,
    format: "currency",
    delta: -0.021,
    accent: "amber",
    spark: makeSpark(41, 70, 2.1),
  },
];

// ── Projects (pipeline + drawer source) ─────────────────────────────────────
export const projects: Project[] = [
  {
    id: "P-2041",
    name: "Levent Rezidans Kulesi",
    category: "proje",
    status: "fon-topluyor",
    location: "İstanbul, Beşiktaş",
    progress: 64,
    raised: 92_000_000,
    target: 140_000_000,
    roi: 0.212,
    deadline: "2026-12-20",
    partners: [
      { id: "u1", name: "Kaan Yatırım A.Ş.", role: "Lider Ortak", share: 0.45 },
      { id: "u2", name: "Timay Capital", role: "Finansman", share: 0.3 },
      { id: "u3", name: "Erez İnşaat", role: "Uygulama", share: 0.25 },
    ],
    docs: [
      { id: "d1", name: "Ortaklık Sözleşmesi", type: "Sözleşme", sizeKb: 842, updatedAt: "2026-10-05" },
      { id: "d2", name: "Değerleme Raporu Q3", type: "Rapor", sizeKb: 1240, updatedAt: "2026-09-28" },
      { id: "d3", name: "Yapı Ruhsatı", type: "Ruhsat", sizeKb: 310, updatedAt: "2026-08-14" },
    ],
    trend: makeSpark(101, 80, 3.4),
  },
  {
    id: "P-2038",
    name: "Ege Güneş Enerji Fonu",
    category: "yatirim",
    status: "aktif",
    location: "İzmir, Menemen",
    progress: 88,
    raised: 210_000_000,
    target: 220_000_000,
    roi: 0.168,
    deadline: "2027-03-01",
    partners: [
      { id: "u1", name: "Kaan Yatırım A.Ş.", role: "Fon Yöneticisi", share: 0.6 },
      { id: "u4", name: "Solaris GES", role: "Teknik Ortak", share: 0.4 },
    ],
    docs: [
      { id: "d4", name: "Fon İzahnamesi", type: "Finansal", sizeKb: 980, updatedAt: "2026-10-02" },
      { id: "d5", name: "Üretim Performansı", type: "Rapor", sizeKb: 640, updatedAt: "2026-10-09" },
    ],
    trend: makeSpark(102, 140, 4.2),
  },
  {
    id: "P-2033",
    name: "Bodrum Marina Villaları",
    category: "proje",
    status: "tamamlandi",
    location: "Muğla, Bodrum",
    progress: 100,
    raised: 165_000_000,
    target: 165_000_000,
    roi: 0.243,
    deadline: "2026-06-30",
    partners: [
      { id: "u2", name: "Timay Capital", role: "Lider Ortak", share: 0.55 },
      { id: "u5", name: "Deniz Mimarlık", role: "Tasarım", share: 0.2 },
      { id: "u6", name: "Portus Yapı", role: "Uygulama", share: 0.25 },
    ],
    docs: [
      { id: "d6", name: "Teslim Tutanağı", type: "Rapor", sizeKb: 420, updatedAt: "2026-06-30" },
      { id: "d7", name: "Satış Kapanış Raporu", type: "Finansal", sizeKb: 760, updatedAt: "2026-07-04" },
    ],
    trend: makeSpark(103, 90, 5.1),
  },
  {
    id: "P-2049",
    name: "Ankara Lojistik Merkezi",
    category: "fona-acik",
    status: "fon-topluyor",
    location: "Ankara, Kazan",
    progress: 28,
    raised: 34_000_000,
    target: 180_000_000,
    roi: 0.195,
    deadline: "2027-09-15",
    partners: [
      { id: "u1", name: "Kaan Yatırım A.Ş.", role: "Kurucu", share: 0.5 },
      { id: "u7", name: "TransLog", role: "Operasyon", share: 0.5 },
    ],
    docs: [
      { id: "d8", name: "Yatırım Teklifi", type: "Sunum", sizeKb: 2100, updatedAt: "2026-10-10" },
      { id: "d9", name: "Fizibilite Raporu", type: "Rapor", sizeKb: 1580, updatedAt: "2026-10-08" },
    ],
    trend: makeSpark(104, 30, 2.2),
  },
  {
    id: "P-2051",
    name: "Timay Teknoloji Girişim Fonu",
    category: "ortaklik",
    status: "aktif",
    location: "İstanbul, Maslak",
    progress: 52,
    raised: 76_000_000,
    target: 120_000_000,
    roi: 0.284,
    deadline: "2027-05-10",
    partners: [
      { id: "u2", name: "Timay Capital", role: "GP", share: 0.4 },
      { id: "u8", name: "Boğaziçi Ventures", role: "Co-GP", share: 0.35 },
      { id: "u9", name: "Melek Yatırımcılar", role: "LP Havuzu", share: 0.25 },
    ],
    docs: [
      { id: "d10", name: "LP Sözleşmesi", type: "Sözleşme", sizeKb: 1120, updatedAt: "2026-10-01" },
      { id: "d11", name: "Portföy Değerleme", type: "Finansal", sizeKb: 890, updatedAt: "2026-10-07" },
    ],
    trend: makeSpark(105, 60, 4.8),
  },
  {
    id: "P-2027",
    name: "Çeşme Butik Otel Ortaklığı",
    category: "ortaklik",
    status: "beklemede",
    location: "İzmir, Çeşme",
    progress: 41,
    raised: 48_000_000,
    target: 95_000_000,
    roi: 0.156,
    deadline: "2027-02-28",
    partners: [
      { id: "u3", name: "Erez İnşaat", role: "Lider Ortak", share: 0.5 },
      { id: "u10", name: "Aegean Hospitality", role: "İşletme", share: 0.5 },
    ],
    docs: [
      { id: "d12", name: "Niyet Mektubu", type: "Sözleşme", sizeKb: 260, updatedAt: "2026-09-20" },
    ],
    trend: makeSpark(106, 45, 1.8),
  },
  {
    id: "P-2055",
    name: "Gebze Sanayi Arazisi",
    category: "fona-acik",
    status: "fon-topluyor",
    location: "Kocaeli, Gebze",
    progress: 14,
    raised: 12_500_000,
    target: 95_000_000,
    roi: 0.178,
    deadline: "2027-11-01",
    partners: [
      { id: "u1", name: "Kaan Yatırım A.Ş.", role: "Kurucu", share: 0.7 },
      { id: "u7", name: "TransLog", role: "Stratejik Ortak", share: 0.3 },
    ],
    docs: [
      { id: "d13", name: "Arsa Ekspertizi", type: "Rapor", sizeKb: 540, updatedAt: "2026-10-11" },
    ],
    trend: makeSpark(107, 18, 1.4),
  },
  {
    id: "P-2044",
    name: "Kadıköy Karma Kullanım",
    category: "proje",
    status: "aktif",
    location: "İstanbul, Kadıköy",
    progress: 73,
    raised: 128_000_000,
    target: 160_000_000,
    roi: 0.201,
    deadline: "2027-01-20",
    partners: [
      { id: "u2", name: "Timay Capital", role: "Lider Ortak", share: 0.5 },
      { id: "u6", name: "Portus Yapı", role: "Uygulama", share: 0.5 },
    ],
    docs: [
      { id: "d14", name: "İmar Durumu", type: "Ruhsat", sizeKb: 410, updatedAt: "2026-09-30" },
      { id: "d15", name: "Ön Satış Raporu", type: "Finansal", sizeKb: 720, updatedAt: "2026-10-06" },
    ],
    trend: makeSpark(108, 95, 4.0),
  },
  {
    id: "P-2060",
    name: "Finlytic — Fintech Girişimi",
    category: "startup",
    status: "aktif",
    location: "İstanbul, Maslak",
    progress: 58,
    raised: 24_600_000,
    target: 40_000_000,
    roi: 0.412,
    deadline: "2027-06-30",
    partners: [
      { id: "u1", name: "Kaan Yatırım A.Ş.", role: "Lead Investor", share: 0.35 },
      { id: "u8", name: "Boğaziçi Ventures", role: "Yatırımcı", share: 0.4 },
      { id: "u11", name: "Finlytic Kurucuları", role: "Kurucu Ekip", share: 0.25 },
    ],
    docs: [
      { id: "d16", name: "SAFE Sözleşmesi", type: "Sözleşme", sizeKb: 420, updatedAt: "2026-10-09" },
      { id: "d17", name: "Büyüme Metrikleri (MRR)", type: "Finansal", sizeKb: 680, updatedAt: "2026-10-11" },
      { id: "d18", name: "Pitch Deck v4", type: "Sunum", sizeKb: 3200, updatedAt: "2026-10-04" },
    ],
    trend: makeSpark(109, 40, 6.2),
  },
  {
    id: "P-2063",
    name: "GreenMove — Mobilite Startup'ı",
    category: "startup",
    status: "fon-topluyor",
    location: "İzmir, Teknopark",
    progress: 32,
    raised: 9_800_000,
    target: 30_000_000,
    roi: 0.368,
    deadline: "2027-08-15",
    partners: [
      { id: "u8", name: "Boğaziçi Ventures", role: "Lead Investor", share: 0.5 },
      { id: "u12", name: "GreenMove Kurucuları", role: "Kurucu Ekip", share: 0.5 },
    ],
    docs: [
      { id: "d19", name: "Yatırım Turu Sunumu", type: "Sunum", sizeKb: 2600, updatedAt: "2026-10-10" },
      { id: "d20", name: "Birim Ekonomisi", type: "Finansal", sizeKb: 540, updatedAt: "2026-10-08" },
    ],
    trend: makeSpark(110, 22, 5.4),
  },
];

// ── Activity feed (partnership panel) ───────────────────────────────────────
export const activity: ActivityItem[] = [
  { id: "a1", actor: "Timay Capital", action: "150.000.000 ₺ fon katkısı onayladı", project: "Ege Güneş Enerji Fonu", at: "2026-10-12T17:35:00", kind: "fon" },
  { id: "a2", actor: "Boğaziçi Ventures", action: "Co-GP olarak ortaklığa katıldı", project: "Timay Teknoloji Girişim Fonu", at: "2026-10-12T15:10:00", kind: "ortak" },
  { id: "a2b", actor: "Finlytic", action: "aylık yinelenen gelirini (MRR) %28 artırdı", project: "Finlytic — Fintech Girişimi", at: "2026-10-12T13:05:00", kind: "getiri" },
  { id: "a3", actor: "Kaan Yatırım A.Ş.", action: "Değerleme raporu Q3 yükledi", project: "Levent Rezidans Kulesi", at: "2026-10-12T11:42:00", kind: "belge" },
  { id: "a4", actor: "Sistem", action: "proje durumunu “Fon Topluyor” yaptı", project: "Gebze Sanayi Arazisi", at: "2026-10-11T19:05:00", kind: "durum" },
  { id: "a5", actor: "Portus Yapı", action: "aylık getiriyi %20,1 olarak güncelledi", project: "Kadıköy Karma Kullanım", at: "2026-10-11T09:20:00", kind: "getiri" },
  { id: "a6", actor: "TransLog", action: "fizibilite raporunu paylaştı", project: "Ankara Lojistik Merkezi", at: "2026-10-10T16:48:00", kind: "belge" },
  { id: "a7", actor: "Melek Yatırımcılar", action: "12.000.000 ₺ taahhüt ekledi", project: "Timay Teknoloji Girişim Fonu", at: "2026-10-10T10:15:00", kind: "fon" },
];

// ── Performance series (12 months) ──────────────────────────────────────────
const months = ["Kas", "Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki"];
const getiriSpark = makeSpark(777, 18, 1.1, 12);
const degSpark = makeSpark(888, 40, 2.4, 12);
export const performance: PerfPoint[] = months.map((month, i) => ({
  month,
  getiri: getiriSpark[i].v * 220_000,
  degerleme: degSpark[i].v * 340_000,
}));

// ── Category metadata (filters, labels, accents) ───────────────────────────
export const categoryMeta: Record<
  string,
  { label: string; dot: string; chip: string }
> = {
  all: { label: "Tümü", dot: "bg-muted", chip: "border-line text-ink" },
  proje: { label: "Proje", dot: "bg-series-2", chip: "border-series-2/40 text-series-2" },
  yatirim: { label: "Yatırım", dot: "bg-series-1", chip: "border-series-1/40 text-series-1" },
  ortaklik: { label: "Aktif Ortaklık", dot: "bg-series-3", chip: "border-series-3/40 text-series-3" },
  "fona-acik": { label: "Fona Açık", dot: "bg-series-4", chip: "border-series-4/40 text-series-4" },
  startup: { label: "Startup", dot: "bg-series-5", chip: "border-series-5/40 text-series-5" },
};

export const statusMeta: Record<
  string,
  { label: string; className: string }
> = {
  aktif: { label: "Aktif", className: "border-good/40 text-good bg-good/10" },
  "fon-topluyor": { label: "Fon Topluyor", className: "border-neon-blue/40 text-neon-blue bg-neon-blue/10" },
  tamamlandi: { label: "Tamamlandı", className: "border-muted/40 text-muted bg-white/5" },
  beklemede: { label: "Beklemede", className: "border-warning/40 text-warning bg-warning/10" },
};
