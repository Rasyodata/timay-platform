// Formatting helpers — Turkish locale, TRY currency, compact large numbers.

// Binlik ayraç + 2 ondalık (ör. 1000000 → "1.000.000,00"). TL'li versiyonu: "1.000.000,00 TL".
const tr2 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtNum = (n: unknown): string => tr2.format(Number(n) || 0);
export const fmtTL = (n: unknown): string => `${fmtNum(n)} TL`;

const tryCompact = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const tryFull = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const numCompact = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "₺12,4 Mn" style compact currency for cards/axes. */
export function currency(value: number): string {
  return "₺" + tryCompact.format(value);
}

/** Full "₺12.400.000" for drawers/tooltips. */
export function currencyFull(value: number): string {
  return tryFull.format(value);
}

export function compact(value: number): string {
  return numCompact.format(value);
}

/** 0.124 => "+%12,4"  |  -0.03 => "−%3,0" */
export function percent(ratio: number, withSign = true): string {
  const pct = ratio * 100;
  const sign = !withSign ? "" : pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}%${Math.abs(pct).toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

/** Days remaining until an ISO date (negative => overdue). */
export function daysLeft(iso: string, now = new Date("2026-10-12")): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.round(ms / 86_400_000);
}

/** Humanized "3 gün önce" / "2 sa önce" style label. */
export function timeAgo(iso: string, now = new Date("2026-10-12T18:00:00")): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return `${Math.floor(day / 30)} ay önce`;
}

/** Remaining time phrased for the pipeline ("12 gün", "Tamamlandı"). */
export function deadlineLabel(iso: string): string {
  const d = daysLeft(iso);
  if (d < 0) return "Süre doldu";
  if (d === 0) return "Bugün";
  if (d < 45) return `${d} gün`;
  const months = Math.round(d / 30);
  return `${months} ay`;
}
