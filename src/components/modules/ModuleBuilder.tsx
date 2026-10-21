import { useMemo, useState } from "react";
import { Eye, Plus, Sparkles, Trash2 } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import AccessDenied from "@/components/ui/AccessDenied";
import { ICON_CHOICES, resolveIcon } from "@/lib/icons";
import {
  FIELD_TYPE_LABELS,
  VISIBILITY_LABELS,
  type FieldType,
  type Visibility,
} from "@/types/modules";

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
function ascii(s: string) {
  return s.toLocaleLowerCase("tr").replace(/[çğıöşü]/g, (c) => TR_MAP[c] ?? c);
}
const toFieldCode = (name: string) =>
  ascii(name).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

interface DraftField {
  /** Mevcut alanlarda dolu — düzenlemede id/kod korunur (kayıt verisi bozulmaz). */
  id?: string;
  code?: string;
  name: string;
  type: FieldType;
  required: boolean;
  visibility: Visibility;
  optionsText: string;
}

const emptyField = (): DraftField => ({
  name: "",
  type: "TEXT",
  required: false,
  visibility: "EVERYONE",
  optionsText: "",
});

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

export default function ModuleBuilder(props: { onDone: (id: string) => void; editModuleId?: string; kind?: "evrak" }) {
  const { can } = useUsers();
  if (!can("modul_olustur")) {
    return <AccessDenied detail="Tablo oluşturma/düzenleme yetkiniz yok. Bu işlem 'Modül Oluştur' yetkisi gerektirir." />;
  }
  return <BuilderBody {...props} />;
}

function BuilderBody({
  onDone,
  editModuleId,
  kind,
}: {
  onDone: (id: string) => void;
  editModuleId?: string;
  kind?: "evrak";
}) {
  const { createModule, updateModule, getModule } = useModules();
  const editing = getModule(editModuleId ?? "");

  const [name, setName] = useState(() => editing?.name ?? "");
  const [description, setDescription] = useState(() => editing?.description ?? "");
  const [icon, setIcon] = useState(() => editing?.icon ?? "Table2");
  const [fields, setFields] = useState<DraftField[]>(() =>
    editing
      ? editing.fields.map((f) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          type: f.type,
          required: f.required,
          visibility: f.visibility,
          optionsText: (f.options ?? []).join(", "),
        }))
      : [emptyField()],
  );
  const [error, setError] = useState("");

  const displayCode = editing?.code ?? (kind === "evrak" ? "EVR-00NN (sistem atar)" : "T-00NN (sistem atar)");

  const definition = useMemo(
    () => ({
      table_code: editing?.code ?? "T-00NN",
      table_name: name || "İsimsiz Tablo",
      description: description || undefined,
      fields: fields
        .filter((f) => f.name.trim())
        .map((f) => ({
          field_code: toFieldCode(f.name),
          field_name: f.name,
          type: f.type,
          required: f.required,
          default_visibility: f.visibility,
          ...(f.type === "DROPDOWN"
            ? { options: f.optionsText.split(",").map((o) => o.trim()).filter(Boolean) }
            : {}),
        })),
    }),
    [editing?.code, name, description, fields],
  );

  const updateField = (i: number, patch: Partial<DraftField>) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const addField = () => setFields((prev) => [...prev, emptyField()]);
  const removeField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!name.trim()) return setError("Tablo adı zorunludur.");
    const valid = fields.filter((f) => f.name.trim());
    if (valid.length === 0) return setError("En az bir alan eklemelisiniz.");
    setError("");

    const built = valid.map((f) => ({
      id: f.id, // mevcut alanda dolu → kayıt verisi korunur
      code: f.code ?? toFieldCode(f.name),
      name: f.name.trim(),
      type: f.type,
      required: f.required,
      visibility: f.visibility,
      options:
        f.type === "DROPDOWN"
          ? f.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
    }));

    if (editing) {
      updateModule(editing.id, { name: name.trim(), description: description.trim(), icon, fields: built });
      onDone(editing.id);
    } else {
      const mod = createModule({ name: name.trim(), description: description.trim(), icon, fields: built, kind: kind === "evrak" ? "evrak" : "tablo" });
      onDone(mod.id);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <Sparkles size={20} className="text-neon-violet" />
          {editing ? `Tabloyu Düzenle — ${editing.name}` : "Tablo Oluştur"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {editing
            ? "Alan ekleyin/çıkarın veya düzenleyin. Mevcut alanların kayıt verisi korunur."
            : "Yeni bir tablo tanımlayın — sistem kodu otomatik atar ve menüyü, formu, yetki matrisini üretir."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol: tanım formu */}
        <div className="space-y-6 lg:col-span-2">
          {/* Meta */}
          <section className="card space-y-4 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Tablo Bilgileri</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Tablo Adı *</span>
                <input
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Makine Envanteri"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Tablo Kodu</span>
                <input className={`${input} nums opacity-60`} value={displayCode} disabled readOnly />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Açıklama</span>
              <textarea
                className={input}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu tablonun ne işe yaradığı…"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs text-muted">İkon</span>
              <div className="flex flex-wrap gap-2">
                {ICON_CHOICES.map((ic) => {
                  const Ic = resolveIcon(ic);
                  const on = ic === icon;
                  return (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                        on
                          ? "border-neon-violet/50 bg-neon-violet/15 text-neon-violet"
                          : "border-line text-muted hover:bg-elevated hover:text-ink"
                      }`}
                    >
                      <Ic size={17} />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Alanlar */}
          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Alanlar (Kolonlar)
              </h3>
              <button
                onClick={addField}
                className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20"
              >
                <Plus size={14} /> Alan Ekle
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                    <label className="sm:col-span-4">
                      <span className="mb-1 block text-[10px] uppercase text-muted">Alan Adı</span>
                      <input
                        className={input}
                        value={f.name}
                        onChange={(e) => updateField(i, { name: e.target.value })}
                        placeholder="Örn: Satın Alım Fiyatı"
                      />
                      {f.name && (
                        <span className="mt-1 block text-[10px] text-faint">kod: {toFieldCode(f.name) || "—"}</span>
                      )}
                    </label>
                    <label className="sm:col-span-3">
                      <span className="mb-1 block text-[10px] uppercase text-muted">Tip</span>
                      <select
                        className={input}
                        value={f.type}
                        onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label className="sm:col-span-3">
                      <span className="mb-1 block text-[10px] uppercase text-muted">Görünürlük</span>
                      <select
                        className={input}
                        value={f.visibility}
                        onChange={(e) => updateField(i, { visibility: e.target.value as Visibility })}
                      >
                        {Object.entries(VISIBILITY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-3 sm:col-span-2 sm:pb-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        <input
                          type="checkbox"
                          className="accent-neon-blue"
                          checked={f.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                        />
                        Zorunlu
                      </label>
                      <button
                        onClick={() => removeField(i)}
                        disabled={fields.length === 1}
                        className="ml-auto rounded-md p-1.5 text-muted transition hover:text-critical disabled:opacity-30"
                        aria-label="Alanı sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {f.type === "DROPDOWN" && (
                    <input
                      className={`${input} mt-2`}
                      value={f.optionsText}
                      onChange={(e) => updateField(i, { optionsText: e.target.value })}
                      placeholder="Seçenekler (virgülle): Aktif, Serviste, Satıldı"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-violet px-5 py-2.5 text-sm font-semibold text-white shadow-glow-blue transition hover:opacity-90"
          >
            <Sparkles size={16} /> {editing ? "Değişiklikleri Kaydet" : "Tabloyu Oluştur"}
          </button>
        </div>

        {/* Sağ: canlı önizleme (JSON + yetki) */}
        <div className="space-y-6">
          <section className="card p-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
              <Eye size={14} /> Üretilecek Tanım (JSON)
            </h3>
            <pre className="max-h-[360px] overflow-auto rounded-xl border border-line bg-base/60 p-3 text-[11px] leading-relaxed text-ink">
              {JSON.stringify(definition, null, 2)}
            </pre>
          </section>

          <section className="card p-5 text-sm">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Otomatik Yapılacaklar
            </h3>
            <ul className="space-y-2 text-xs text-muted">
              <li>• <span className="text-ink">modules</span> + <span className="text-ink">module_fields</span> kayıtları yazılır</li>
              <li>• Menüye (Sidebar) modül <span className="text-ink">enjekte edilir</span></li>
              <li>• Yetki matrisine satır eklenir: <span className="text-good">Admin: Tam</span> · <span className="text-critical">Standart: Gizli</span></li>
              <li>• <span className="text-ink">ONLY_MANAGERS</span> alanlar gözlemcilerden maskelenir</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
