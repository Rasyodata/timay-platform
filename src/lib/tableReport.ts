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
}

/** Bir tablonun kayıtlarını baskıya hazır bir PDF raporu olarak açar. */
export function openTableReport(mod: DynamicModule, summary?: ReportSummary[], titleSuffix = "Tablo Raporu") {
  const headCells = mod.fields.map((f) => `<th>${esc(f.name)}</th>`).join("");
  const bodyRows = mod.records
    .map((r) => `<tr>${mod.fields.map((f) => `<td${f.type === "NUMBER" ? ' class="num"' : ""}>${cell(f, (r as Record<string, unknown>)[f.code])}</td>`).join("")}</tr>`)
    .join("");

  const summaryHtml = summary && summary.length
    ? `<div class="cards">${summary.map((s) => `<div class="scard"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></div>`).join("")}</div>`
    : "";

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
<title>${esc(mod.name)} — ${esc(titleSuffix)}</title>
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
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .foot{margin-top:26px;color:#aab;font-size:11px;border-top:1px solid #e8ebf2;padding-top:10px}
  @media print{.band{padding:18px 32px}}
</style></head><body>
  <div class="band">
    <div class="brand">Proje ve İş Yönetimi<br/><b>Timay Platform</b></div>
    <div class="code">${esc(mod.code)}</div>
    <h1>${esc(mod.name)}</h1>
    <div class="sub">${esc(mod.description || "")} · ${mod.records.length} kayıt</div>
  </div>
  <div class="wrap">
    ${summaryHtml}
    <table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows || `<tr><td colspan="${mod.fields.length}" style="text-align:center;color:#99a">Kayıt yok</td></tr>`}</tbody></table>
    <p class="foot">${esc(titleSuffix)} · ${dmy(new Date().toISOString().slice(0, 10))} tarihinde oluşturuldu.</p>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=1000,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
