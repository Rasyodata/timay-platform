import { useMemo, useState } from "react";
import { Eye, FileText, Lock, Pencil, Plus, ShieldCheck, Trash2, Smartphone } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import AccessDenied from "@/components/ui/AccessDenied";
import { resolveIcon } from "@/lib/icons";
import { openTableReport } from "@/lib/tableReport";
import {
  ACCESS_LABELS,
  ROLE_LABELS,
  type DynamicField,
  type DynamicModule,
  type RoleKey,
} from "@/types/modules";

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

function formatValue(field: DynamicField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "NUMBER") return Number(value).toLocaleString("tr-TR");
  if (field.type === "BOOLEAN") return value ? "Evet" : "Hayır";
  return String(value);
}

function AddRecordForm({ module }: { module: DynamicModule }) {
  const { addRecord } = useModules();
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  const set = (code: string, v: unknown) => setDraft((d) => ({ ...d, [code]: v }));

  const save = () => {
    const missing = module.fields.find((f) => f.required && !String(draft[f.code] ?? "").trim());
    if (missing) return setErr(`"${missing.name}" zorunlu.`);
    setErr("");
    addRecord(module.id, draft);
    setDraft({});
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
        <Plus size={14} /> Kayıt Ekle
      </button>
    );
  }

  return (
    <div className="card w-full space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {module.fields.map((f) => (
          <label key={f.id} className="block">
            <span className="mb-1 block text-xs text-muted">{f.name}{f.required && <span className="text-critical"> *</span>}</span>
            {f.type === "DROPDOWN" ? (
              <select className={input} value={String(draft[f.code] ?? "")} onChange={(e) => set(f.code, e.target.value)}>
                <option value="">Seçin…</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "BOOLEAN" ? (
              <label className="flex items-center gap-2 py-2 text-sm text-ink">
                <input type="checkbox" className="accent-neon-blue" checked={Boolean(draft[f.code])} onChange={(e) => set(f.code, e.target.checked)} /> Evet
              </label>
            ) : f.type === "TEXTAREA" ? (
              <textarea className={input} rows={2} value={String(draft[f.code] ?? "")} onChange={(e) => set(f.code, e.target.value)} />
            ) : (
              <input className={input} type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                value={String(draft[f.code] ?? "")}
                onChange={(e) => set(f.code, f.type === "NUMBER" ? e.target.valueAsNumber || e.target.value : e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {err && <p className="text-xs text-critical">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Kaydet</button>
        <button onClick={() => { setOpen(false); setErr(""); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
      </div>
    </div>
  );
}

export default function DynamicModulePage({
  moduleId,
  onDeleted,
  onEdit,
}: {
  moduleId: string;
  onDeleted: () => void;
  onEdit: (id: string) => void;
}) {
  const { getModule, deleteRecord, deleteModule } = useModules();
  const { currentUser, canViewField, can } = useUsers();
  const mod = getModule(moduleId);
  const [smsNote, setSmsNote] = useState("");

  const role: RoleKey = currentUser.role;
  const level = mod?.perms[role] ?? "none";

  const visibleFields = useMemo(
    () => (mod ? mod.fields.filter((f) => canViewField(f.visibility)) : []),
    [mod, canViewField],
  );

  if (!mod) return <div className="p-6 text-sm text-muted">Modül bulunamadı.</div>;

  // Gerçek yetki zorlaması: rolün bu modüle erişimi yoksa 403.
  if (level === "none") {
    return <AccessDenied detail={`"${mod.name}" modülüne "${ROLE_LABELS[role]}" rolüyle erişiminiz yok.`} />;
  }

  const Icon = resolveIcon(mod.icon);
  const hiddenCount = mod.fields.length - visibleFields.length;
  const canWrite = level === "full";
  const canManage = can("modul_olustur");

  // SMS hatırlatma: sms_hatirlatma alanı olan tablolarda otomatik buton (Randevu, Toplantı, Ajanda…).
  const hasSms = mod.fields.some((f) => f.code === "sms_hatirlatma");
  const smsPending = mod.records.filter((r) => r.sms_hatirlatma === true && !["Tamamlandı", "İptal", "Gelmedi"].includes(String(r.durum)));
  const sendSms = () => {
    const tekil = new Set(smsPending.map((r) => String(r.telefon || "")).filter(Boolean)).size;
    setSmsNote(`${smsPending.length} kayıt için ${tekil || smsPending.length} numaraya SMS hatırlatması gönderildi ✓ (simülasyon — canlıda SMS ağ geçidiyle otomatik tetiklenir).`);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-neon-violet/30 bg-neon-violet/10 text-neon-violet">
            <Icon size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-ink">{mod.name}</h2>
            {mod.description && <p className="mt-0.5 max-w-2xl text-sm text-muted">{mod.description}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>kod: <span className="text-ink nums">{mod.code}</span></span>
              <span>tablo: <span className="text-ink">{mod.tableName}</span></span>
              <span>{mod.fields.length} alan · {mod.records.length} kayıt</span>
              <span className={`chip ${mod.active ? "border-good/40 bg-good/10 text-good" : "border-line text-muted"}`}>{mod.active ? "Aktif" : "Pasif"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTableReport(mod)} className="chip border-neon-violet/40 bg-neon-violet/10 text-neon-violet transition hover:bg-neon-violet/20">
            <FileText size={14} /> Rapor Al
          </button>
          {hasSms && (
            <button onClick={sendSms} disabled={!smsPending.length} className={`chip ${smsPending.length ? "border-neon-blue/40 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20" : "cursor-not-allowed border-line text-faint"}`}>
              <Smartphone size={14} /> SMS Hatırlat{smsPending.length ? ` (${smsPending.length})` : ""}
            </button>
          )}
          {canManage && (
            <>
              <button onClick={() => onEdit(mod.id)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
                <Pencil size={14} /> Tabloyu Düzenle
              </button>
              <button onClick={() => { deleteModule(mod.id); onDeleted(); }} className="chip border-critical/40 bg-critical/10 text-critical transition hover:bg-critical/20">
                <Trash2 size={14} /> Tabloyu Sil
              </button>
            </>
          )}
        </div>
      </header>

      {smsNote && <div className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{smsNote}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
            <ShieldCheck size={15} /> Yetki Matrisi (RBAC)
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => {
              const lvl = mod.perms[r];
              const tone = lvl === "full" ? "border-good/30 bg-good/10 text-good"
                : lvl === "read" ? "border-neon-blue/30 bg-neon-blue/10 text-neon-blue"
                : "border-line bg-white/[0.02] text-muted";
              const isMe = r === role;
              return (
                <div key={r} className={`rounded-xl border p-3 ${tone} ${isMe ? "ring-1 ring-neon-violet/50" : ""}`}>
                  <p className="text-xs font-medium text-ink">{ROLE_LABELS[r]}{isMe && " (siz)"}</p>
                  <p className="mt-1 text-xs">{ACCESS_LABELS[lvl]}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
            <Eye size={15} /> Erişiminiz
          </h3>
          <p className="text-sm text-ink">{currentUser.name} · <span className="text-muted">{ROLE_LABELS[role]}</span></p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <Lock size={12} />
            {canWrite ? "Yazma yetkiniz var" : "Yalnızca okuma"} · {hiddenCount > 0 ? `${hiddenCount} alan maskeli` : "tüm alanlar görünür"}
          </p>
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-ink">Kayıtlar</h3>
          {canWrite && <AddRecordForm module={mod} />}
        </div>

        {mod.records.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-line py-12 text-sm text-muted">Henüz kayıt yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {mod.fields.map((f) => {
                    const masked = !canViewField(f.visibility);
                    return (
                      <th key={f.id} className="px-3 py-2 font-medium text-muted">
                        <span className="flex items-center gap-1">
                          {f.name}
                          {f.visibility !== "EVERYONE" && <Lock size={11} className={masked ? "text-critical" : "text-faint"} />}
                        </span>
                      </th>
                    );
                  })}
                  {canWrite && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {mod.records.map((rec) => (
                  <tr key={rec.id} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                    {mod.fields.map((f) => {
                      const masked = !canViewField(f.visibility);
                      return (
                        <td key={f.id} className="px-3 py-2.5 text-ink nums">
                          {masked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs text-muted"><Lock size={10} /> •••••</span>
                          ) : formatValue(f, rec[f.code])}
                        </td>
                      );
                    })}
                    {canWrite && (
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => deleteRecord(mod.id, rec.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Kaydı sil">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
