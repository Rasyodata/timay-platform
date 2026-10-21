import { useEffect, useState } from "react";
import { FileText, IdCard, Lock, Pencil, Save, ShieldCheck, Target, Trash2, Users, X } from "lucide-react";
import ProjeDefteri from "@/components/projects/ProjeDefteri";
import { useProjects } from "@/context/ProjectsContext";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import type { DynamicModule } from "@/types/modules";
import { TASK_STATUS_META } from "@/types/projects";
import { ACCESS_LABELS, ROLE_LABELS, type AccessLevel } from "@/types/modules";
import {
  MODULE_LABELS,
  PRIORITY_META,
  STATUS_META,
  TYPE_LABELS,
  type HakSahibi,
  type Priority,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/types/projects";
import { fmtNum } from "@/lib/format";
import { hedefKarRows } from "@/lib/projectFinance";
import { canSeeProject } from "@/lib/projectAccess";
import AccessDenied from "@/components/ui/AccessDenied";
import ProjectTableCard from "./ProjectTableCard";
import HakSahibiEditor, { newHakSahibi } from "./HakSahibiEditor";
import ProjectLedger from "./ProjectLedger";
import ProjectBudgetCompare from "./ProjectBudgetCompare";

// Proje kartı sekmeleri + bağlı tablo id'leri.
const TABS = [
  { key: "karti", label: "Proje Kartı", kod: "PRJ" },
  { key: "hesap", label: "Proje Hesabı", kod: "T-0046" },
  { key: "hedef", label: "Hedef ve Kar", kod: "T-0043" },
  { key: "resmi", label: "Resmi Tablolar", kod: "T-0044" },
  { key: "defter", label: "Proje Defteri", kod: "T-0079" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const TBL = { risk: "mod-T-0021", resmi: "mod-T-0044" };

function budgetText(p: Project) {
  if (p.currency === "TRY") return `${fmtNum(p.budget)} TL`;
  return `${p.currency === "USD" ? "$" : "€"}${fmtNum(p.budget)}`;
}

const esc = (s: string) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
const dmy = (iso: string) => iso.split("-").reverse().join(".");

/** Güzel bir rapor HTML'i açıp tarayıcının "PDF olarak kaydet" diyaloğunu tetikler. */
function openProjectReport(p: Project, modules: DynamicModule[], reportText: string) {
  const ht = hedefKarRows(modules);
  const hedefRows = ht.rows
    .map((r) => `<tr><td>${esc(r.donem)}</td><td class="num">${fmtNum(r.hedef)} TL</td><td class="num">${fmtNum(r.butce)} TL</td><td class="num">${fmtNum(r.gerceklesen)} TL</td><td>${esc(r.aciklama)}</td></tr>`)
    .join("");
  const kalan = ht.kalan;
  const tableRows = p.tableIds
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is DynamicModule => Boolean(m))
    .map((m) => `<tr><td class="code">${esc(m.code)}</td><td>${esc(m.name)}</td></tr>`)
    .join("");
  const teamRows = p.team
    .map((m) => `<tr><td><b>${esc(m.name)}</b>${m.title ? `<div class="muted">${esc(m.title)}</div>` : ""}</td><td>${esc(ROLE_LABELS[m.role])}</td></tr>`)
    .join("");
  const taskRows = p.tasks
    .map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.owner)}</td><td><span class="pill" style="background:${TASK_STATUS_META[t.status].color}">${esc(TASK_STATUS_META[t.status].label)}</span></td><td class="num">%${t.progress}</td></tr>`)
    .join("");
  const MS_PDF_COLOR: Record<string, string> = { "Tamamlandı": "#10b981", "Devam Ediyor": "#3b82f6", "Planlandı": "#9699a6", "Gecikti": "#ef4444" };
  const msRecs = (modules.find((m) => m.id === "mod-T-0047")?.records ?? []) as Array<Record<string, unknown>>;
  const msRows = [...msRecs]
    .sort((a, b) => String(a.hedef_tarih ?? "").localeCompare(String(b.hedef_tarih ?? "")))
    .map((r) => {
      const durum = String(r.durum ?? "");
      return `<tr><td><b>${esc(String(r.ad ?? ""))}</b>${r.aciklama ? `<div class="muted">${esc(String(r.aciklama))}</div>` : ""}</td><td class="code">${r.hedef_tarih ? dmy(String(r.hedef_tarih)) : "—"}</td><td><span class="pill" style="background:${MS_PDF_COLOR[durum] ?? "#9699a6"}">${esc(durum || "—")}</span></td><td>${esc(String(r.sorumlu ?? "—"))}</td><td class="num">%${Number(r.tamamlanma) || 0}</td></tr>`;
    })
    .join("");
  const hareketMod = p.tableIds.includes("mod-T-0042") ? modules.find((m) => m.id === "mod-T-0042") : undefined;
  const actRows = hareketMod
    ? [...hareketMod.records]
        .sort((a, b) => String(a.tarih ?? "").localeCompare(String(b.tarih ?? "")))
        .map((r) => `<tr><td class="code">${dmy(String(r.tarih ?? ""))}</td><td>${esc(String(r.kullanici ?? ""))}</td><td>${esc(String(r.aciklama ?? ""))}${r.hareket_turu ? ` <span class="muted">· ${esc(String(r.hareket_turu))}</span>` : ""}</td></tr>`)
        .join("")
    : [...p.activities]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((a) => `<tr><td class="code">${dmy(a.date)}</td><td>${esc(a.actor)}</td><td>${esc(a.description)}</td></tr>`)
        .join("");

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
<title>${esc(p.name)} — Proje Raporu</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font:13px/1.55 system-ui,Segoe UI,Arial,sans-serif;color:#1a1f2e;margin:0;background:#fff}
  .wrap{max-width:820px;margin:0 auto;padding:0 36px 40px}
  .band{background:linear-gradient(120deg,#3b82f6,#8b5cf6);color:#fff;padding:26px 36px;margin-bottom:24px}
  .band .code{font-family:ui-monospace,Menlo,monospace;opacity:.85;font-size:12px;letter-spacing:1px}
  .band h1{font-size:26px;margin:4px 0 6px}
  .band .meta{opacity:.9;font-size:12px}
  .brand{float:right;text-align:right;font-size:12px;opacity:.9}
  .chips{margin-top:10px} .chip{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:2px 10px;font-size:11px;margin-right:6px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.6px;color:#3b82f6;margin:26px 0 8px;padding-bottom:6px;border-bottom:2px solid #e8ebf2}
  .report{background:#f6f8ff;border:1px solid #dfe6fb;border-left:4px solid #3b82f6;border-radius:8px;padding:14px 16px;white-space:pre-wrap;font-size:13.5px;color:#222}
  table{width:100%;border-collapse:collapse;margin:4px 0} th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #eceef4;vertical-align:top}
  th{background:#f4f6fb;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#7a8296}
  .code{font-family:ui-monospace,Menlo,monospace;color:#555;white-space:nowrap} .num{text-align:right} .muted{color:#99a}
  .pill{color:#fff;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0 28px}
  .grid div{border-bottom:1px solid #eef0f5;padding:7px 0;display:flex;justify-content:space-between}
  .grid b{color:#7a8296;font-weight:600}
  .foot{margin-top:30px;color:#aab;font-size:11px;border-top:1px solid #e8ebf2;padding-top:10px}
  @media print{.band{padding:22px 36px}}
</style></head><body>
  <div class="band">
    <div class="brand">Proje ve İş Yönetimi<br/><b>Timay Platform</b></div>
    <div class="code">${esc(p.code)}</div>
    <h1>${esc(p.name)}</h1>
    <div class="meta">${esc(p.description || "")}</div>
    <div class="chips">
      <span class="chip">${esc(STATUS_META[p.status].label)}</span>
      <span class="chip">${esc(PRIORITY_META[p.priority].label)} öncelik</span>
      <span class="chip">${esc(TYPE_LABELS[p.type])}</span>
    </div>
  </div>
  <div class="wrap">

  ${reportText.trim() ? `<h2>Değerlendirme / Rapor</h2><div class="report">${esc(reportText.trim())}</div>` : ""}

  <h2>Proje Bilgileri</h2>
  <div class="grid">
    <div><b>Paydaş</b><span>${esc(p.stakeholder || "—")}</span></div>
    <div><b>Bütçe</b><span>${budgetText(p)}</span></div>
    <div><b>Başlangıç</b><span>${dmy(p.startDate)}</span></div>
    <div><b>Bitiş</b><span>${dmy(p.endDate)}</span></div>
    <div><b>Efor</b><span>${p.effort.toLocaleString("tr-TR")} adam/saat</span></div>
    <div><b>Etiketler</b><span>${esc(p.tags.join(", ") || "—")}</span></div>
  </div>

  ${ht.rows.length ? `<h2>Hedef &amp; Bütçe</h2>
  <div class="grid">
    <div><b>Hedeflenen Kar (Toplam)</b><span>${fmtNum(ht.totals.hedef)} TL</span></div>
    <div><b>Bütçe Hedefi (Toplam)</b><span>${fmtNum(ht.totals.butce)} TL</span></div>
    <div><b>Gerçekleşen (Satış)</b><span>${fmtNum(ht.totals.gerceklesen)} TL</span></div>
    <div><b>${kalan >= 0 ? "Kalan Bütçe" : "Bütçe Aşımı"}</b><span>${fmtNum(Math.abs(kalan))} TL</span></div>
  </div>
  <table><thead><tr><th>Dönem</th><th class="num">Hedeflenen Kar</th><th class="num">Bütçe</th><th class="num">Gerçekleşen</th><th>Açıklama</th></tr></thead><tbody>${hedefRows}</tbody></table>` : ""}

  <h2>Kullanıcılar (${p.team.length})</h2>
  <table><thead><tr><th>Ad</th><th>Rol</th></tr></thead><tbody>${teamRows || '<tr><td colspan="2" class="muted">—</td></tr>'}</tbody></table>

  ${actRows ? `<h2>Hareketler</h2>
  <table><thead><tr><th>Tarih</th><th>Kişi</th><th>Açıklama</th></tr></thead><tbody>${actRows}</tbody></table>` : ""}

  ${taskRows ? `<h2>Görevler</h2>
  <table><thead><tr><th>Görev</th><th>Sahip</th><th>Durum</th><th class="num">İlerleme</th></tr></thead><tbody>${taskRows}</tbody></table>` : ""}

  ${msRows ? `<h2>Kilometre Taşları</h2>
  <table><thead><tr><th>Kilometre Taşı</th><th>Hedef Tarih</th><th>Durum</th><th>Sorumlu</th><th class="num">Tamamlanma</th></tr></thead><tbody>${msRows}</tbody></table>` : ""}

  ${tableRows ? `<h2>Kullanılan Tablolar</h2>
  <table><thead><tr><th>Kod</th><th>Tablo</th></tr></thead><tbody>${tableRows}</tbody></table>` : ""}

  <p class="foot">Bu rapor Proje ve İş Yönetimi · Timay Platform tarafından ${dmy(new Date().toISOString().slice(0, 10))} tarihinde oluşturulmuştur.</p>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=920,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const accessTone: Record<AccessLevel, string> = {
  full: "border-good/30 bg-good/10 text-good",
  read: "border-neon-blue/30 bg-neon-blue/10 text-neon-blue",
  none: "border-line bg-white/[0.02] text-muted",
};

const fieldCls =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

interface InfoDraft {
  name: string; code: string; description: string;
  type: ProjectType; priority: Priority; status: ProjectStatus;
  tagsText: string; startDate: string; endDate: string;
  effort: number; budget: number; currency: "TRY" | "USD" | "EUR";
  budgetVisibility: "EVERYONE" | "ONLY_MANAGERS"; stakeholder: string;
  hedefKitle: string; projeyiGetiren: string; onaylayanlar: string[]; onayTarihi: string; gorevliler: string[];
}
const draftFrom = (p: Project): InfoDraft => ({
  name: p.name, code: p.code, description: p.description,
  type: p.type, priority: p.priority, status: p.status,
  tagsText: p.tags.join(", "), startDate: p.startDate, endDate: p.endDate,
  effort: p.effort, budget: p.budget, currency: p.currency,
  budgetVisibility: p.budgetVisibility, stakeholder: p.stakeholder,
  hedefKitle: p.hedefKitle ?? "", projeyiGetiren: p.projeyiGetiren ?? "",
  onaylayanlar: p.onaylayanlar ?? [], onayTarihi: p.onayTarihi ?? "",
  gorevliler: p.gorevliler ?? [],
});

/** Kayıtlı projenin künyesi — salt-okunur tablo + "Düzenle" ile satır içi form. */
function ProjectInfoCard({ p, canEdit, tableNames }: { p: Project; canEdit: boolean; tableNames: string[] }) {
  const { updateProject } = useProjects();
  const { users } = useUsers();
  const userNames = users.filter((u) => u.active).map((u) => u.name).sort((a, b) => a.localeCompare(b, "tr"));
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<InfoDraft>(() => draftFrom(p));

  const startEdit = () => { setD(draftFrom(p)); setEditing(true); };
  const set = <K extends keyof InfoDraft>(k: K, v: InfoDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const toggleApprover = (name: string) =>
    setD((s) => ({ ...s, onaylayanlar: s.onaylayanlar.includes(name) ? s.onaylayanlar.filter((x) => x !== name) : [...s.onaylayanlar, name] }));
  const toggleGorevli = (name: string) =>
    setD((s) => ({ ...s, gorevliler: s.gorevliler.includes(name) ? s.gorevliler.filter((x) => x !== name) : [...s.gorevliler, name] }));
  const save = () => {
    updateProject(p.id, {
      name: d.name.trim() || p.name,
      code: d.code.trim() || p.code,
      description: d.description.trim(),
      type: d.type, priority: d.priority, status: d.status,
      tags: d.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      startDate: d.startDate, endDate: d.endDate,
      effort: Number(d.effort) || 0, budget: Number(d.budget) || 0,
      currency: d.currency, budgetVisibility: d.budgetVisibility,
      stakeholder: d.stakeholder.trim(),
      hedefKitle: d.hedefKitle.trim(), projeyiGetiren: d.projeyiGetiren,
      onaylayanlar: d.onaylayanlar, onayTarihi: d.onayTarihi, gorevliler: d.gorevliler,
    });
    setEditing(false);
  };

  const owner = p.team.find((m) => m.role === "owner");

  const rows: [string, React.ReactNode][] = [
    ["Proje Adı", p.name],
    ["Proje Kodu", <span className="nums">{p.code}</span>],
    ["Açıklama", p.description || "—"],
    ["Proje Türü", TYPE_LABELS[p.type]],
    ["Hedef Kitle", p.hedefKitle || "—"],
    ["Projeyi Getiren", p.projeyiGetiren || "—"],
    ["Proje Onaylayan", p.onaylayanlar?.length ? p.onaylayanlar.join(", ") : "—"],
    ["Proje Onay Tarihi", p.onayTarihi ? dmy(p.onayTarihi) : "—"],
    ["Görevli Personel/Yöneticiler", p.gorevliler?.length ? p.gorevliler.join(", ") : "—"],
    ["Öncelik", PRIORITY_META[p.priority].label],
    ["Yaşam Döngüsü", STATUS_META[p.status].label],
    ["Etiketler", p.tags.length ? p.tags.join(", ") : "—"],
    ["Başlangıç → Bitiş", <span className="nums">{dmy(p.startDate)} → {dmy(p.endDate)}</span>],
    ["Proje Sahibi", owner ? `${owner.name}${owner.title ? ` · ${owner.title}` : ""}` : "—"],
    ["Aktif Modüller", p.modules.length ? p.modules.map((m) => MODULE_LABELS[m]).join(", ") : "—"],
    ["Kullanılan Tablolar", tableNames.length ? tableNames.join(", ") : "—"],
    ["Oluşturulma", <span className="nums">{dmy(p.createdAt)}</span>],
  ];

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-line bg-white/[0.02] px-5 py-3">
        <IdCard size={16} className="text-neon-blue" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Kayıt Detayları (Künye)</h3>
        {canEdit && !editing && (
          <button onClick={startEdit} className="ml-auto chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Pencil size={13} /> Düzenle
          </button>
        )}
        {editing && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={save} className="chip border-good/40 bg-good/10 text-good transition hover:bg-good/20">
              <Save size={13} /> Kaydet
            </button>
            <button onClick={() => setEditing(false)} className="chip border-line text-muted transition hover:bg-elevated">
              <X size={13} /> İptal
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map(([k, v], i) => (
                <tr key={k} className={i % 2 ? "bg-white/[0.015]" : ""}>
                  <td className="w-52 whitespace-nowrap border-b border-line/50 px-5 py-2.5 align-top text-xs font-medium uppercase tracking-wide text-muted">{k}</td>
                  <td className="border-b border-line/50 px-5 py-2.5 text-ink">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1.5 block text-xs text-muted">Proje Adı</span>
            <input className={fieldCls} value={d.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Kodu</span>
            <input className={`${fieldCls} nums`} value={d.code} onChange={(e) => set("code", e.target.value)} />
          </label>
          <label className="block lg:col-span-1">
            <span className="mb-1.5 block text-xs text-muted">Etiketler (virgülle)</span>
            <input className={fieldCls} value={d.tagsText} onChange={(e) => set("tagsText", e.target.value)} placeholder="mobil, pazarlama" />
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Açıklama</span>
            <textarea className={fieldCls} rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Türü</span>
            <select className={fieldCls} value={d.type} onChange={(e) => set("type", e.target.value as ProjectType)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Hedef Kitle</span>
            <input className={fieldCls} value={d.hedefKitle} onChange={(e) => set("hedefKitle", e.target.value)} placeholder="ör. 25-45 yaş kurumsal müşteriler" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Projeyi Getiren</span>
            <select className={fieldCls} value={d.projeyiGetiren} onChange={(e) => set("projeyiGetiren", e.target.value)}>
              <option value="">Seçin… (Kullanıcılar)</option>
              {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Onay Tarihi</span>
            <input type="date" className={fieldCls} value={d.onayTarihi} onChange={(e) => set("onayTarihi", e.target.value)} />
          </label>
          <div className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Proje Onaylayan (çoklu — onay isteği)</span>
            <div className="flex flex-wrap gap-2">
              {userNames.map((n) => {
                const on = d.onaylayanlar.includes(n);
                return (
                  <button key={n} type="button" onClick={() => toggleApprover(n)}
                    className={`chip ${on ? "border-neon-emerald/50 bg-neon-emerald/10 text-neon-emeraldGlow" : "border-line text-muted hover:text-ink"}`}>
                    {on ? "✓ " : ""}{n}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Görevlendirilen Personel ve Yöneticiler (çoklu)</span>
            <div className="flex flex-wrap gap-2">
              {userNames.map((n) => {
                const on = d.gorevliler.includes(n);
                return (
                  <button key={n} type="button" onClick={() => toggleGorevli(n)}
                    className={`chip ${on ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue" : "border-line text-muted hover:text-ink"}`}>
                    {on ? "✓ " : ""}{n}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Öncelik</span>
            <select className={fieldCls} value={d.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
              {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Yaşam Döngüsü</span>
            <select className={fieldCls} value={d.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Başlangıç Tarihi</span>
            <input type="date" className={fieldCls} value={d.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Bitiş Tarihi</span>
            <input type="date" className={fieldCls} value={d.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
        </div>
      )}

    </section>
  );
}

/** Proje Kartı — projeye özel Hak Sahibi ve Beklentisi (salt-okunur + Düzenle/Kaydet). */
function ProjectHakSahibi({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { updateProject } = useProjects();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HakSahibi[]>(p.hakSahipleri ?? []);

  const startEdit = () => { setDraft(p.hakSahipleri?.length ? p.hakSahipleri : [newHakSahibi()]); setEditing(true); };
  const save = () => { updateProject(p.id, { hakSahipleri: draft.filter((h) => h.hakSahibi.trim()) }); setEditing(false); };

  return (
    <div>
      <div className="mb-2 flex justify-end gap-2">
        {canEdit && !editing && (
          <button onClick={startEdit} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Pencil size={13} /> Hak Sahiplerini Düzenle
          </button>
        )}
        {editing && (
          <>
            <button onClick={save} className="chip border-good/40 bg-good/10 text-good transition hover:bg-good/20"><Save size={13} /> Kaydet</button>
            <button onClick={() => setEditing(false)} className="chip border-line text-muted transition hover:bg-elevated"><X size={13} /> İptal</button>
          </>
        )}
      </div>
      <HakSahibiEditor value={editing ? draft : (p.hakSahipleri ?? [])} onChange={setDraft} readOnly={!editing} />
    </div>
  );
}

/** Hedef ve Kar sekmesi — hedef/bütçe (T-0043) + gerçekleşen (Satış, T-0036) birleştirilmiş salt-okunur görünüm. */
function HedefKarView() {
  const { modules } = useModules();
  const { canViewField } = useUsers();
  const { rows, totals, kalan } = hedefKarRows(modules);
  const masked = !canViewField("ONLY_MANAGERS");

  if (masked) {
    return (
      <section className="card p-5">
        <h3 className="mb-2 flex items-center gap-1.5 text-base font-semibold text-ink"><Target size={16} className="text-neon-emerald" /> Hedef · Bütçe · Gerçekleşen</h3>
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted"><Lock size={12} /> Bu değerler yönetici gizliliğinde — görüntüleme yetkiniz yok.</p>
      </section>
    );
  }

  const cell = (v: number) => `${fmtNum(v)} TL`;
  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-neon-emerald/30 bg-neon-emerald/10 text-neon-emerald"><Target size={16} /></span>
        <div>
          <h3 className="text-base font-semibold text-ink">Hedef · Bütçe · Gerçekleşen</h3>
          <p className="text-[11px] text-muted">Hedef &amp; bütçe <span className="text-faint">Hedef ve Kar (T-0043)</span> · gerçekleşen <span className="text-faint">Satış Tablosu (T-0036)</span>'ndan otomatik</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-line py-8 text-sm text-muted">Henüz dönem hedefi girilmemiş. Proje Kartı'ndan ekleyin.</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Dönem</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Hedeflenen Kar</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Bütçe</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Gerçekleşen (Satış)</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Kalan</th>
                <th className="px-3 py-2 font-medium text-muted">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.donem} className="border-b border-line/60">
                  <td className="px-3 py-2.5 font-medium text-ink">{r.donem}</td>
                  <td className="px-3 py-2.5 text-right text-neon-emeraldGlow nums">{cell(r.hedef)}</td>
                  <td className="px-3 py-2.5 text-right text-neon-blue nums">{cell(r.butce)}</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{cell(r.gerceklesen)}</td>
                  <td className={`px-3 py-2.5 text-right nums ${r.kalan >= 0 ? "text-good" : "text-critical"}`}>{cell(r.kalan)}</td>
                  <td className="px-3 py-2.5 text-muted">{r.aciklama || "—"}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-3 py-2.5 text-ink">Toplam</td>
                <td className="px-3 py-2.5 text-right text-neon-emeraldGlow nums">{cell(totals.hedef)}</td>
                <td className="px-3 py-2.5 text-right text-neon-blue nums">{cell(totals.butce)}</td>
                <td className="px-3 py-2.5 text-right text-ink nums">{cell(totals.gerceklesen)}</td>
                <td className={`px-3 py-2.5 text-right nums ${kalan >= 0 ? "text-good" : "text-critical"}`}>{cell(kalan)}</td>
                <td className="px-3 py-2.5" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ProjectDetail({ projectId, onDeleted }: { projectId: string; onDeleted: () => void }) {
  const { getProject, setMemberAccess, removeMember, deleteProject } = useProjects();
  const { currentUser, can } = useUsers();
  const { modules } = useModules();
  const [tab, setTab] = useState<TabKey>("karti");
  const [reportText, setReportText] = useState(() => getProject(projectId)?.report ?? "");
  // Proje değişince taslağı senkronla (her tuş vuruşunda değil).
  useEffect(() => { setReportText(getProject(projectId)?.report ?? ""); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = getProject(projectId);

  if (!p) return <div className="p-6 text-sm text-muted">Proje bulunamadı.</div>;
  if (!canSeeProject(currentUser, p.code, modules)) {
    return <AccessDenied detail={`Bu projeye (${p.code}) erişim yetkiniz yok. Yetki Kartı (T-0030) ile bu proje size tanımlanmamış.`} />;
  }

  const canEditMatrix = can("uye_yonet");

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted nums">{p.code}</p>
          <h2 className="text-xl font-bold text-ink">{p.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`chip ${STATUS_META[p.status].className}`}>{STATUS_META[p.status].label}</span>
            <span className={`chip ${PRIORITY_META[p.priority].className}`}>{PRIORITY_META[p.priority].label}</span>
            <span className="chip border-line text-muted">{TYPE_LABELS[p.type]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
            <Users size={13} /> {currentUser.name} · {ROLE_LABELS[currentUser.role]}
          </span>
          {can("rapor_goruntule") && (
            <button onClick={() => openProjectReport(p, modules, reportText)}
              className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
              <FileText size={14} /> Rapor Oluştur (PDF)
            </button>
          )}
          {can("proje_sil") && (
            <button onClick={() => { deleteProject(p.id); onDeleted(); }}
              className="chip border-critical/40 bg-critical/10 text-critical transition hover:bg-critical/20">
              <Trash2 size={14} /> Sil
            </button>
          )}
        </div>
      </header>

      {/* Sekmeler */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "border-b-2 border-neon-blue text-ink" : "border-b-2 border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className="rounded border border-line bg-base/60 px-1 font-mono text-[9px] leading-tight text-faint">{t.kod}</span>
          </button>
        ))}
      </div>

      {/* ── Proje Hesabı (muhasebe defteri + maliyet/kâr) ── */}
      {tab === "hesap" && <ProjectLedger />}
      {/* ── Hedef ve Kar + Bütçe-Gerçekleşen karşılaştırma ── */}
      {tab === "hedef" && (
        <div className="space-y-6">
          {/* Hedef/bütçe + gerçekleşen (satıştan) birleşik salt-okunur görünüm */}
          <HedefKarView />
          {/* Hedef ve Kar Tablosu — hedef & bütçe buradan girilir (gerçekleşen sütunu yok) */}
          <ProjectTableCard moduleId="mod-T-0043" />
          {/* Satış Tablosu — gerçekleşeni besler (dönem bazlı) */}
          <ProjectTableCard moduleId="mod-T-0036" />
          <ProjectBudgetCompare />
        </div>
      )}
      {/* ── Resmi Tablolar ── */}
      {tab === "resmi" && <ProjectTableCard moduleId={TBL.resmi} />}
      {/* ── Proje Defteri: projeye bağlı tüm hareketler tarihli (İş Hareket · Kilometre Taşı · Not · Görev · Onay vb.) + sağ Hızlı İşlemler (T-0079) ── */}
      {tab === "defter" && <ProjeDefteri projectName={p.name} projectCode={p.code} />}

      {/* ── Proje Kartı: proje tanımı · kullanıcı tanımı · yetkilendirme tanımı · risk ── */}
      {tab === "karti" && (
      <>
      {/* Kayıt detayları (künye) — salt-okunur tablo + Düzenle */}
      <ProjectInfoCard
        p={p}
        canEdit={can("proje_olustur")}
        tableNames={p.tableIds
          .map((id) => modules.find((m) => m.id === id))
          .filter((m): m is DynamicModule => Boolean(m))
          .map((m) => `${m.code} · ${m.name}`)}
      />

      {/* Proje Hak Sahibi ve Beklentisi — projeye özel */}
      <ProjectHakSahibi p={p} canEdit={can("proje_olustur")} />

      {/* Enabled modules */}
      <section className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Aktif Modüller</h3>
        <div className="flex flex-wrap gap-2">
          {p.modules.map((m) => (
            <span key={m} className="chip border-neon-blue/30 bg-neon-blue/10 text-neon-blue">{MODULE_LABELS[m]}</span>
          ))}
        </div>
      </section>

      {/* Kullanılan sistem tabloları */}
      <section className="card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Kullanılan Tablolar ({p.tableIds.length})</h3>
        {p.tableIds.length === 0 ? (
          <p className="text-sm text-muted">Bu projeye tablo seçilmemiş.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.tableIds.map((id) => {
              const t = modules.find((m) => m.id === id);
              if (!t) return null;
              return (
                <span key={id} className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
                  <span className="nums text-[10px] opacity-80">{t.code}</span> {t.name}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Risk Tablosu — proje kartı içinde */}
      <ProjectTableCard moduleId={TBL.risk} />

      {/* Team × Module permission matrix (Kullanıcı Tanımı + Yetkilendirme Tanımı) */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
            <ShieldCheck size={15} /> Ekip Yetki Matrisi (Modül Bazlı)
          </h3>
          {!canEditMatrix && <span className="text-[11px] text-muted">Bu rolde salt-okunur</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Üye</th>
                <th className="px-3 py-2 font-medium text-muted">Rol</th>
                {p.modules.map((m) => <th key={m} className="px-3 py-2 font-medium text-muted">{MODULE_LABELS[m]}</th>)}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {p.team.map((mem) => (
                <tr key={mem.id} className="border-b border-line/60">
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-ink">{mem.name}</span>
                    {mem.title && <span className="block text-[11px] text-muted">{mem.title}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{ROLE_LABELS[mem.role]}</td>
                  {p.modules.map((m) => {
                    const level = mem.access[m];
                    return (
                      <td key={m} className="px-3 py-2.5">
                        {canEditMatrix ? (
                          <select
                            value={level}
                            onChange={(e) => setMemberAccess(p.id, mem.id, m, e.target.value as AccessLevel)}
                            className={`rounded-md border px-2 py-1 text-xs outline-none ${accessTone[level]}`}
                          >
                            {(Object.keys(ACCESS_LABELS) as AccessLevel[]).map((lv) => (
                              <option key={lv} value={lv} className="bg-panel text-ink">{ACCESS_LABELS[lv]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`chip ${accessTone[level]}`}>{ACCESS_LABELS[level]}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right">
                    {canEditMatrix && (
                      <button onClick={() => removeMember(p.id, mem.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Üyeyi çıkar">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
          <Lock size={12} /> Yönetici burada her üyenin her modüldeki erişimini değiştirebilir. Gerçek sistemde bu kurallar sunucuda da zorlanmalı (yetkisiz → 403).
        </p>
      </section>
      </>
      )}

    </div>
  );
}
