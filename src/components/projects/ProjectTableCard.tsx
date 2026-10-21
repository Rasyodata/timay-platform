import { useState, useRef, useEffect } from "react";
import { FileText, Lock, Pencil, Plus, Trash2, Download, Upload } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";

/** DROPDOWN alanının seçeneklerini (varsa) canlı kaynaktan çözer: "users" (T-0001) veya "mod-T-XXXX". */
const trSort = (a: string, b: string) => a.localeCompare(b, "tr");
function resolveOptions(source: string | undefined, staticOpts: string[] | undefined, users: { name: string; active: boolean }[], modules: DynamicModule[], filter?: { field: string; equals: string }): string[] {
  if (!source) return staticOpts ?? [];
  // Tablodan gelen seçenekler alfabetik (Türkçe) sıralanır.
  if (source === "users") return users.filter((u) => u.active).map((u) => u.name).sort(trSort);
  const mod = modules.find((m) => m.id === source);
  let recs = (mod?.records ?? []) as Array<Record<string, unknown>>;
  // optionsFilter: kayıtları belirli bir alana göre süz (ör. yalnız tip="Banka").
  if (filter) recs = recs.filter((r) => String(r[filter.field] ?? "") === filter.equals);
  // Etiket: 'ad' yoksa kod/numara alanlarına düş (masraf_no, hareket_no, evrak_no…).
  const label = (r: Record<string, unknown>) =>
    String(r.ad ?? r.kalem ?? r.masraf_no ?? r.hareket_no ?? r.evrak_no ?? r.belge_no ?? r.kasa_kodu ?? r.kod ?? "").trim();
  return recs.map(label).filter(Boolean).sort(trSort);
}
import MentionTextarea from "@/components/common/MentionTextarea";
import { resolveIcon } from "@/lib/icons";
import { fmtNum } from "@/lib/format";
import { openTableReport } from "@/lib/tableReport";
import type { DynamicField, DynamicModule, DynamicRecord } from "@/types/modules";

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

function fmt(f: DynamicField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (f.type === "NUMBER") {
    const s = fmtNum(v);
    // Para alanlarına TL eki (ör. "1.000.000,00 TL"); oran/adet gibi alanlar sade kalır.
    return /₺|TL|Tutar|Bütçe|Kâr|Kar|Maliyet|Değer|Fiyat/i.test(f.name) ? `${s} TL` : s;
  }
  if (f.type === "BOOLEAN") return v ? "Evet" : "Hayır";
  return String(v);
}

// Bugünün tarihi (YYYY-AA-GG) — yeni kayıtlarda "Tarih" alanının varsayılanı.
const todayISO = () => new Date().toISOString().slice(0, 10);
// Evrak No alanı mı? (kod "evrak_no" veya adı "Evrak/Fatura/Belge No")
const isEvrakNoField = (f: DynamicField) => f.code === "evrak_no" || /^(evrak|fatura|belge)\s*no$/i.test(f.name.trim());
// Evrak No üret: ADKISALTMA-YY-SIRA(4 hane) — ör. TAH-26-0001, ÖDE-26-0001, FAT-26-0001
function genEvrakNo(mod: DynamicModule): string {
  const yy = String(new Date().getFullYear() % 100).padStart(2, "0");
  const prefix = (mod.name.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "").slice(0, 3) || mod.code.replace(/\D/g, "")).toLocaleUpperCase("tr");
  const nums = mod.records.map((r) => { const m = String((r as Record<string, unknown>).evrak_no ?? "").match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; });
  const next = (nums.length ? Math.max(0, ...nums) : 0) + 1;
  return `${prefix}-${yy}-${String(next).padStart(4, "0")}`;
}
// Yeni kayıt için başlangıç taslağı: Evrak No otomatik + tüm tarih alanları bugünün tarihi (vade dahil).
function makeInitialDraft(mod: DynamicModule): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (mod.kind === "evrak") { const ef = mod.fields.find(isEvrakNoField); if (ef) d[ef.code] = genEvrakNo(mod); }
  for (const f of mod.fields) if (f.type === "DATE") d[f.code] = todayISO();
  return d;
}

// Hem ekleme hem düzenleme formu (initial verilirse düzenleme).
export function RecordForm({ mod, initial, defaults, onClose, onSaved }: { mod: DynamicModule; initial?: DynamicRecord; defaults?: Record<string, unknown>; onClose: () => void; onSaved?: (approved: boolean) => void }) {
  const { addRecord, updateRecord, modules } = useModules();
  const { users, addUser } = useUsers();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => (initial ? { ...initial } : { ...makeInitialDraft(mod), ...defaults }));
  const [err, setErr] = useState("");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newVal, setNewVal] = useState("");
  const set = (c: string, v: unknown) => setDraft((d) => ({ ...d, [c]: v }));

  // DROPDOWN'un kaynağına (optionsSource) yeni kayıt ekler; cari → T-0001 (Kullanıcılar), diğer → ilgili tablo.
  const addNewOption = (source: string, code: string) => {
    const v = newVal.trim();
    if (!v) return;
    if (source === "users") addUser({ name: v, email: "—", department: "Dış Kaynak", userType: "Müşteri", role: "viewer", active: true });
    else if (source.startsWith("mod-")) addRecord(source, { ad: v, durum: "Aktif" });
    set(code, v); setNewVal(""); setAddingFor(null);
  };

  const save = (approved: boolean) => {
    const miss = mod.fields.find((f) => f.required && !String(draft[f.code] ?? "").trim());
    if (miss) return setErr(`"${miss.name}" zorunlu.`);
    if (initial) updateRecord(mod.id, String(initial.id), draft);
    else addRecord(mod.id, draft);
    onSaved?.(approved);
    onClose();
  };

  return (
    <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{initial ? "Kaydı Düzenle" : "Yeni Kayıt"}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mod.fields.map((f) => {
          // Koşullu alan: showWhen varsa, ilgili alan değeri listedeyken göster.
          if (f.showWhen && !f.showWhen.in.includes(String(draft[f.showWhen.field] ?? ""))) return null;
          return (
          <label key={f.id} className="block">
            <span className="mb-1 block text-xs text-muted">{f.name}{f.required && <span className="text-critical"> *</span>}{mod.kind === "evrak" && isEvrakNoField(f) && <span className="ml-1 text-[10px] text-faint">(otomatik)</span>}</span>
            {mod.kind === "evrak" && isEvrakNoField(f) ? (
              <input className={`${input} cursor-not-allowed opacity-80`} value={String(draft[f.code] ?? "")} readOnly title="Otomatik: AD-YIL-SIRA (ör. TAH-26-0001)" />
            ) : f.type === "DROPDOWN" ? (
              <>
                {f.optionsSource ? (
                  // Dinamik liste (cari/kayıt) → yazarak aranabilir combobox (200+ kayıtta hızlı bulma).
                  <>
                    <input className={input} list={`dl-${f.id}`} value={String(draft[f.code] ?? "")} onChange={(e) => set(f.code, e.target.value)} placeholder="Ara / seç…" autoComplete="off" />
                    <datalist id={`dl-${f.id}`}>
                      {resolveOptions(f.optionsSource, f.options, users, modules, f.optionsFilter).map((o) => <option key={o} value={o} />)}
                    </datalist>
                  </>
                ) : (
                  <select className={input} value={String(draft[f.code] ?? "")} onChange={(e) => set(f.code, e.target.value)}>
                    <option value="">Seçin…</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.optionsSource && (addingFor === f.code ? (
                  <div className="mt-1 flex gap-1">
                    <input className={input} value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNewOption(f.optionsSource!, f.code)} placeholder={f.optionsSource === "users" ? "Yeni cari adı" : "Yeni kayıt"} />
                    <button type="button" onClick={() => addNewOption(f.optionsSource!, f.code)} className="shrink-0 rounded-lg bg-neon-blue px-3 text-xs font-semibold text-white hover:bg-neon-blue/90">Ekle</button>
                    <button type="button" onClick={() => { setAddingFor(null); setNewVal(""); }} className="shrink-0 rounded-lg border border-line px-2 text-xs text-muted hover:bg-elevated">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setAddingFor(f.code); setNewVal(""); }} className="mt-1 text-[11px] text-neon-blue transition hover:underline">+ Yeni kayıt ekle</button>
                ))}
              </>
            ) : f.type === "TEXTAREA" ? (
              <MentionTextarea className={input} rows={3} value={String(draft[f.code] ?? "")} onChange={(v) => set(f.code, v)} />
            ) : (
              <input className={input} type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                value={String(draft[f.code] ?? "")}
                onChange={(e) => set(f.code, f.type === "NUMBER" ? (e.target.valueAsNumber || e.target.value) : e.target.value)} />
            )}
          </label>
          );
        })}
      </div>
      {err && <p className="mt-2 text-xs text-critical">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => save(false)} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Kaydet</button>
        <button onClick={() => save(true)} className="rounded-lg border border-good/40 bg-good/10 px-4 py-2 text-sm font-semibold text-good transition hover:bg-good/20">Onaya Gönder</button>
        <button onClick={() => { onClose(); setErr(""); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
      </div>
    </div>
  );
}

// ── CSV yardımcıları (toplu dışa/içe aktarım) ──
const csvCell = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const csvEsc = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
function buildCSV(fields: DynamicField[], records: Array<Record<string, unknown>>, canView: (v: DynamicField["visibility"]) => boolean): string {
  const header = fields.map((f) => f.name);
  const lines = [header, ...records.map((r) => fields.map((f) => (canView(f.visibility) ? csvCell(r[f.code]) : "•••••")))];
  return "﻿" + lines.map((row) => row.map((c) => csvEsc(csvCell(c))).join(",")).join("\r\n");
}
function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch === "\r") { /* yok say */ }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
function parseNum(v: string): number | string {
  const s = v.trim(); if (s === "") return "";
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(",", "."));
  const n = Number(s); return isNaN(n) ? s : n;
}
function downloadCSV(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProjectTableCard({ moduleId }: { moduleId: string }) {
  const { getModule, deleteRecord, addRecord } = useModules();
  const { currentUser, canViewField } = useUsers();
  const mod = getModule(moduleId);
  // null = kapalı, "new" = ekleme, string id = düzenleme
  const [form, setForm] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  // Tablo değişince seçimi sıfırla.
  useEffect(() => { setSelected(new Set()); }, [moduleId]);

  if (!mod) return <div className="card p-5 text-sm text-muted">Tablo bulunamadı (sistemde tanımlı değil).</div>;

  const level = mod.perms[currentUser.role] ?? "none";
  if (level === "none") {
    return (
      <div className="card flex items-center gap-2 p-5 text-sm text-critical">
        <Lock size={15} /> "{mod.name}" tablosuna erişiminiz yok (403).
      </div>
    );
  }
  const canWrite = level === "full";
  const Icon = resolveIcon(mod.icon);
  const editing = form && form !== "new" ? mod.records.find((r) => r.id === form) : undefined;

  const allSelected = mod.records.length > 0 && selected.size === mod.records.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(mod.records.map((r) => String(r.id))));
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const exportCSV = (onlySelected: boolean) => {
    const recs = onlySelected ? mod.records.filter((r) => selected.has(String(r.id))) : mod.records;
    downloadCSV(`${mod.code}${onlySelected ? "-secili" : ""}.csv`, buildCSV(mod.fields, recs, canViewField));
  };
  const bulkDelete = () => { const n = selected.size; selected.forEach((id) => deleteRecord(mod.id, id)); setSelected(new Set()); setNote(`${n} kayıt silindi.`); };
  const importCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result || ""));
      if (rows.length < 2) { setNote("CSV boş ya da yalnız başlık var."); return; }
      const codes = rows[0].map((h) => mod.fields.find((f) => f.name === h.trim() || f.code === h.trim())?.code ?? null);
      let added = 0;
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, unknown> = {};
        rows[i].forEach((val, idx) => { const code = codes[idx]; if (!code) return; const f = mod.fields.find((x) => x.code === code); obj[code] = f?.type === "NUMBER" ? parseNum(val) : val.trim(); });
        if (Object.keys(obj).length) { addRecord(mod.id, obj); added++; }
      }
      setNote(`${added} kayıt içe aktarıldı ✓`);
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
            <Icon size={16} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-ink">{mod.name}</h3>
            <p className="text-[11px] text-muted"><span className="nums">{mod.code}</span> · {mod.records.length} kayıt</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTableReport(mod)} className="chip border-neon-violet/40 bg-neon-violet/10 text-neon-violet transition hover:bg-neon-violet/20">
            <FileText size={14} /> Rapor Al
          </button>
          <button onClick={() => exportCSV(false)} className="chip border-line text-muted transition hover:bg-elevated hover:text-ink" title="Tüm kayıtları CSV indir">
            <Download size={14} /> CSV Dışa
          </button>
          {canWrite && (
            <>
              <button onClick={() => fileRef.current?.click()} className="chip border-line text-muted transition hover:bg-elevated hover:text-ink" title="CSV'den kayıt içe aktar">
                <Upload size={14} /> CSV İçe
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ""; }} />
              <button onClick={() => setForm((f) => (f === "new" ? null : "new"))} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
                <Plus size={14} /> Kayıt Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {mod.description && <p className="-mt-2 mb-3 text-xs text-muted">{mod.description}</p>}

      {note && <div className="mb-4 rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{note}</div>}

      {canWrite && form && (
        <RecordForm
          mod={mod}
          initial={editing}
          onClose={() => setForm(null)}
          onSaved={(approved) => setNote(approved ? "Değişiklik onaya gönderildi ve onaylandı ✓ (işlem loglandı)" : "")}
        />
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-neon-blue/40 bg-neon-blue/5 px-3 py-2 text-sm">
          <span className="font-semibold text-ink">{selected.size} kayıt seçili</span>
          <span className="flex-1" />
          <button onClick={() => exportCSV(true)} className="chip border-line text-muted transition hover:bg-elevated hover:text-ink"><Download size={13} /> Seçilenleri Dışa Aktar</button>
          {canWrite && <button onClick={bulkDelete} className="chip border-critical/40 bg-critical/10 text-critical transition hover:bg-critical/20"><Trash2 size={13} /> Seçilenleri Sil</button>}
          <button onClick={() => setSelected(new Set())} className="chip border-line text-muted transition hover:bg-elevated">Vazgeç</button>
        </div>
      )}

      {mod.records.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-8 text-sm text-muted">Henüz kayıt yok.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tümünü seç" className="cursor-pointer accent-neon-blue" /></th>
                {mod.fields.map((f) => {
                  const masked = !canViewField(f.visibility);
                  return (
                    <th key={f.id} className="whitespace-nowrap px-3 py-2 font-medium text-muted">
                      <span className="flex items-center gap-1">{f.name}{f.visibility !== "EVERYONE" && <Lock size={11} className={masked ? "text-critical" : "text-faint"} />}</span>
                    </th>
                  );
                })}
                <th className="whitespace-nowrap px-3 py-2 font-medium text-muted">Kayıt Tarihi</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {mod.records.map((rec) => (
                <tr key={rec.id} className={`border-b border-line/60 transition hover:bg-white/[0.02] ${selected.has(String(rec.id)) ? "bg-neon-blue/5" : ""}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(String(rec.id))} onChange={() => toggleOne(String(rec.id))} aria-label="Satırı seç" className="cursor-pointer accent-neon-blue" /></td>
                  {mod.fields.map((f) => {
                    const masked = !canViewField(f.visibility);
                    return (
                      <td key={f.id} className="px-3 py-2.5 text-ink nums">
                        {masked ? <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs text-muted"><Lock size={10} /> •••••</span> : fmt(f, rec[f.code])}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-faint nums">{rec._eklenme ? String(rec._eklenme).split("-").reverse().join(".") : "—"}</td>
                  {canWrite && (
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setForm(String(rec.id))} className="rounded-md p-1 text-muted transition hover:text-neon-blue" aria-label="Düzenle"><Pencil size={14} /></button>
                        <button onClick={() => deleteRecord(mod.id, String(rec.id))} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Sil"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
