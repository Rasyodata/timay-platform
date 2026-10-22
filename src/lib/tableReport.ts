import type { DynamicField, DynamicModule } from "@/types/modules";
import { fmtNum } from "@/lib/format";

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");
const isMoney = (name: string) => /₺|TL|Tutar|Bütçe|Kâr|Kar|Maliyet|Değer|Fiyat|Bakiye|Matrah|KDV|Toplam/i.test(name);

function cell(f: DynamicField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (f.type === "NUMBER") return isMoney(f.name) ? `${fmtNum(v)} TL` : fmtNum(v);
  if (f.type === "DATE") return dmy(String(v));
  if (f.type === "BOOLEAN") return v ? "Evet" : "Hayır";
  return esc(String(v));
}

export interface ReportSummary {
  label: string;
  value: string;
  /** "pos" yeşil, "neg" kırmızı, "accent" mavi — tutar kartlarını renklendirir. */
  tone?: "pos" | "neg" | "accent";
}

export interface ReportColumn {
  label: string;
  align?: "left" | "right" | "center";
}

export interface ReportCell {
  text: string;
  align?: "left" | "right" | "center";
  /** "pos" yeşil, "neg" kırmızı, "accent" mavi, "muted" soluk, "strong" kalın. */
  tone?: "pos" | "neg" | "accent" | "muted" | "strong";
  colSpan?: number;
}

export interface ReportOptions {
  /** Rapor başlığı — ör. "Kasa Raporu". */
  title: string;
  /** Başlık altı açıklama satırı. */
  subtitle?: string;
  /** Monospace kod/etiket satırı (ör. tablo kodu, tarih). */
  code?: string;
  /** Üstte özet kartları. */
  summary?: ReportSummary[];
  columns: ReportColumn[];
  rows: ReportCell[][];
  /** Alt toplam satırları (tfoot). */
  footRows?: ReportCell[][];
  /** Alt bilgi notu. */
  footNote?: string;
  emptyText?: string;
}

const toneStyle: Record<string, string> = {
  pos: "color:#15803d", neg: "color:#b91c1c", accent: "color:#2563eb",
  muted: "color:#9aa2b2", strong: "font-weight:700",
};
function cellHtml(tag: "td" | "th", c: ReportCell): string {
  const styles: string[] = [];
  if (c.tone && toneStyle[c.tone]) styles.push(toneStyle[c.tone]);
  const align = c.align === "right" ? "num" : c.align === "center" ? "ctr" : "";
  const cls = align ? ` class="${align}"` : "";
  const st = styles.length ? ` style="${styles.join(";")}"` : "";
  const span = c.colSpan ? ` colspan="${c.colSpan}"` : "";
  return `<${tag}${cls}${st}${span}>${esc(c.text)}</${tag}>`;
}

const SHELL = (title: string, code: string, h1: string, sub: string, inner: string, foot: string) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font:12.5px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#1a1f2e;margin:0;background:#fff}
  .wrap{max-width:1000px;margin:0 auto;padding:0 32px 40px}
  .band{background:linear-gradient(120deg,#3b82f6,#8b5cf6);color:#fff;padding:22px 32px;margin-bottom:20px}
  .band .code{font-family:ui-monospace,Menlo,monospace;opacity:.85;font-size:12px;letter-spacing:1px}
  .band h1{font-size:22px;margin:4px 0 4px} .band .sub{opacity:.9;font-size:12px}
  .brand{float:right;text-align:right;font-size:12px;opacity:.9}
  .cards{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 16px}
  .scard{flex:1;min-width:140px;border:1px solid #e3e7f0;border-radius:10px;padding:10px 14px;background:#f8faff}
  .scard span{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:#7a8296}
  .scard b{display:block;margin-top:3px;font-size:16px}
  table{width:100%;border-collapse:collapse;margin:4px 0} th,td{text-align:left;padding:6px 9px;border-bottom:1px solid #eceef4;vertical-align:top}
  th{background:#f4f6fb;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#7a8296;white-space:nowrap}
  .num{text-align:right;font-variant-numeric:tabular-nums} .ctr{text-align:center}
  tfoot td{border-top:2px solid #d7dbe6;background:#f4f6fb;font-weight:600}
  .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:7px 22px;margin:0 0 18px;padding:14px 18px;border:1px solid #e3e7f0;border-radius:10px;background:#f8faff}
  .meta div{font-size:12.5px} .meta span{color:#7a8296;margin-right:6px} .meta b{color:#2b3245}
  .sec{margin:0 0 16px;break-inside:avoid} .sec h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#4b5563;margin:14px 0 6px;padding-bottom:5px;border-bottom:1px solid #e8ebf2}
  .sec ol{margin:0;padding-left:22px} .sec li{margin:2px 0} .sec .empty{color:#aab;font-size:12px}
  .foot{margin-top:26px;color:#aab;font-size:11px;border-top:1px solid #e8ebf2;padding-top:10px}
  @media print{.band{padding:18px 32px}}
</style></head><body>
  <div class="band">
    <div class="brand">Proje ve İş Yönetimi<br/><b>Timay Platform</b></div>
    <div class="code">${esc(code)}</div>
    <h1>${esc(h1)}</h1>
    <div class="sub">${esc(sub)}</div>
  </div>
  <div class="wrap">${inner}
    <p class="foot">${esc(foot)}</p>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

function spawn(html: string) {
  const w = window.open("", "_blank", "width=1000,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Serbest biçimli, baskıya hazır rapor açar (Kasa, Tutanak vb. için). */
export function openReport(o: ReportOptions) {
  const summaryHtml = o.summary && o.summary.length
    ? `<div class="cards">${o.summary.map((s) => `<div class="scard"><span>${esc(s.label)}</span><b${s.tone && toneStyle[s.tone] ? ` style="${toneStyle[s.tone]}"` : ""}>${esc(s.value)}</b></div>`).join("")}</div>`
    : "";
  const head = `<tr>${o.columns.map((c) => cellHtml("th", { text: c.label, align: c.align })).join("")}</tr>`;
  const body = o.rows.length
    ? o.rows.map((r) => `<tr>${r.map((c) => cellHtml("td", c)).join("")}</tr>`).join("")
    : `<tr><td colspan="${o.columns.length}" style="text-align:center;color:#99a;padding:24px">${esc(o.emptyText || "Kayıt yok")}</td></tr>`;
  const footRows = o.footRows && o.footRows.length
    ? `<tfoot>${o.footRows.map((r) => `<tr>${r.map((c) => cellHtml("td", c)).join("")}</tr>`).join("")}</tfoot>`
    : "";
  const inner = `${summaryHtml}<table><thead>${head}</thead><tbody>${body}</tbody>${footRows}</table>`;
  const foot = o.footNote || `${o.title} · ${dmy(new Date().toISOString().slice(0, 10))} tarihinde oluşturuldu.`;
  spawn(SHELL(`${o.title}${o.subtitle ? " — " + o.subtitle : ""}`, o.code || "", o.title, o.subtitle || "", inner, foot));
}

export interface DocSection {
  title: string;
  /** Numaralı liste maddeleri. */
  items?: string[];
  /** Tablo biçimli bölüm (ör. aksiyonlar). items yerine kullanılır. */
  columns?: ReportColumn[];
  rows?: ReportCell[][];
  emptyText?: string;
}
export interface DocReportOptions {
  title: string;
  code?: string;
  subtitle?: string;
  /** Üst künye (etiket/değer çiftleri). */
  meta?: ReportSummary[];
  sections: DocSection[];
  footNote?: string;
}

/** Belge biçimli (künye + bölümler) baskıya hazır rapor açar (Tutanak vb. için). */
export function openDocReport(o: DocReportOptions) {
  const metaHtml = o.meta && o.meta.length
    ? `<div class="meta">${o.meta.filter((m) => m.value).map((m) => `<div><span>${esc(m.label)}:</span><b>${esc(m.value)}</b></div>`).join("")}</div>`
    : "";
  const secHtml = o.sections.map((s) => {
    let inner: string;
    if (s.columns && s.rows) {
      const head = `<tr>${s.columns.map((c) => cellHtml("th", { text: c.label, align: c.align })).join("")}</tr>`;
      const body = s.rows.length
        ? s.rows.map((r) => `<tr>${r.map((c) => cellHtml("td", c)).join("")}</tr>`).join("")
        : `<tr><td colspan="${s.columns.length}" class="empty" style="padding:10px">${esc(s.emptyText || "—")}</td></tr>`;
      inner = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
    } else {
      const items = s.items ?? [];
      inner = items.length ? `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>` : `<div class="empty">—</div>`;
    }
    return `<div class="sec"><h2>${esc(s.title)}</h2>${inner}</div>`;
  }).join("");
  const inner = `${metaHtml}${secHtml}`;
  const foot = o.footNote || `${o.title} · ${dmy(new Date().toISOString().slice(0, 10))} tarihinde oluşturuldu.`;
  spawn(SHELL(`${o.title}${o.subtitle ? " — " + o.subtitle : ""}`, o.code || "", o.title, o.subtitle || "", inner, foot));
}

/** Bir tablonun kayıtlarını baskıya hazır bir rapor olarak açar. */
export function openTableReport(mod: DynamicModule, summary?: ReportSummary[], titleSuffix = "Tablo Raporu") {
  openReport({
    title: `${mod.name} — ${titleSuffix}`,
    code: mod.code,
    subtitle: `${mod.description || ""} · ${mod.records.length} kayıt`,
    summary,
    columns: mod.fields.map((f) => ({ label: f.name, align: f.type === "NUMBER" ? "right" : "left" })),
    rows: mod.records.map((r) => mod.fields.map((f) => ({
      text: cell(f, (r as Record<string, unknown>)[f.code]),
      align: f.type === "NUMBER" ? "right" : "left",
    } as ReportCell))),
    footNote: `${titleSuffix} · ${dmy(new Date().toISOString().slice(0, 10))} tarihinde oluşturuldu.`,
  });
}
