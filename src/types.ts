// ─────────────────────────────────────────────────────────────────────────
// Domain types for the Timay platform (Proje · Yatırım · Ortaklık · Emlak)
// ─────────────────────────────────────────────────────────────────────────

/** Project category — drives filtering/segmentation on the dashboard. */
export type Category = "proje" | "yatirim" | "ortaklik" | "fona-acik" | "startup";

/** Lifecycle status of a project. */
export type ProjectStatus = "aktif" | "fon-topluyor" | "tamamlandi" | "beklemede";

export interface SparkPoint {
  /** index along the series (time order) */
  i: number;
  v: number;
}

export interface Metric {
  id: string;
  label: string;
  /** Raw numeric value (currency metrics are in TRY). */
  value: number;
  /** "currency" | "number" | "percent" — controls formatting. */
  format: "currency" | "number" | "percent";
  /** Period-over-period change, as a ratio (0.124 => +12.4%). */
  delta: number;
  /** Which accent the card leans on. */
  accent: "emerald" | "blue" | "violet" | "amber";
  /** Mini trend used by the sparkline. */
  spark: SparkPoint[];
}

export interface PartnerRef {
  id: string;
  name: string;
  role: string;
  /** Equity / participation share in this project (0..1). */
  share: number;
}

export interface ProjectDoc {
  id: string;
  name: string;
  type: "Sözleşme" | "Rapor" | "Ruhsat" | "Finansal" | "Sunum";
  sizeKb: number;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  category: Category;
  status: ProjectStatus;
  location: string;
  /** Completion / progress, 0..100. */
  progress: number;
  /** Funding raised so far, TRY. */
  raised: number;
  /** Funding target, TRY. */
  target: number;
  /** Projected / realized annual return (ratio, e.g. 0.185 => 18.5%). */
  roi: number;
  /** ISO date the project is expected to close/mature. */
  deadline: string;
  partners: PartnerRef[];
  docs: ProjectDoc[];
  /** Per-project valuation trend (for the detail drawer). */
  trend: SparkPoint[];
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  /** Project the activity relates to, if any. */
  project?: string;
  /** Relative-friendly ISO timestamp. */
  at: string;
  kind: "fon" | "ortak" | "belge" | "durum" | "getiri";
}

export interface PerfPoint {
  /** Short month label, e.g. "Oca". */
  month: string;
  /** Monthly investment return, TRY. */
  getiri: number;
  /** Real-estate valuation index for the month, TRY. */
  degerleme: number;
}
