// Denetim izi (Audit Log) — kim, neyi, ne zaman değiştirdi.

export type AuditCategory = "proje" | "modul" | "yetki" | "gorev" | "kayit";

export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  actor: string;
  category: AuditCategory;
  action: string;
  target?: string;
  meta?: string;
}

export const AUDIT_CATEGORY_META: Record<AuditCategory, { label: string; className: string; dot: string }> = {
  proje: { label: "Proje", className: "border-neon-blue/40 text-neon-blue bg-neon-blue/10", dot: "bg-neon-blue" },
  modul: { label: "Modül", className: "border-neon-violet/40 text-neon-violet bg-neon-violet/10", dot: "bg-neon-violet" },
  yetki: { label: "Yetki", className: "border-warning/40 text-warning bg-warning/10", dot: "bg-warning" },
  gorev: { label: "Görev", className: "border-good/40 text-good bg-good/10", dot: "bg-good" },
  kayit: { label: "Kayıt", className: "border-line text-muted bg-white/5", dot: "bg-muted" },
};
