import { useMemo, useState } from "react";
import { FolderPlus, IdCard, Save, Trash2, UserPlus } from "lucide-react";
import { defaultAccessForRole, newId, useProjects } from "@/context/ProjectsContext";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import AccessDenied from "@/components/ui/AccessDenied";
import HakSahibiEditor, { newHakSahibi } from "./HakSahibiEditor";
import { ROLE_LABELS, type RoleKey } from "@/types/modules";
import {
  ALL_MODULES,
  MODULE_LABELS,
  PRIORITY_META,
  STATUS_META,
  TYPE_LABELS,
  type HakSahibi,
  type Priority,
  type ProjectModuleKey,
  type ProjectStatus,
  type ProjectType,
} from "@/types/projects";

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");

interface DraftMember {
  id: string;
  name: string;
  role: RoleKey;
}

function Section({ title, code, children }: { title: string; code?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
        {code && <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-faint nums">{code}</span>}
      </h3>
      {children}
    </section>
  );
}

export default function ProjectWizard({ onCreated }: { onCreated: (id: string) => void }) {
  const { can } = useUsers();
  if (!can("proje_olustur")) {
    return <AccessDenied detail="Proje oluşturma yetkiniz yok. Bu işlem için 'Proje Oluştur' yetkisi gerekir." />;
  }
  return <WizardBody onCreated={onCreated} />;
}

function WizardBody({ onCreated }: { onCreated: (id: string) => void }) {
  const { projects, createProject } = useProjects();
  const { modules } = useModules();
  const { users } = useUsers();
  const userNames = users.filter((u) => u.active).map((u) => u.name).sort((a, b) => a.localeCompare(b, "tr"));

  const nextCode = useMemo(() => {
    const n = projects.filter((p) => p.code.startsWith("PRJ-2026")).length + 1;
    return `PRJ-2026-${String(n).padStart(2, "0")}`;
  }, [projects]);

  const [name, setName] = useState("");
  const [code, setCode] = useState(nextCode);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("musteri");
  const [hedefKitle, setHedefKitle] = useState("");
  const [projeyiGetiren, setProjeyiGetiren] = useState("");
  const [onaylayanlar, setOnaylayanlar] = useState<string[]>([]);
  const [onayTarihi, setOnayTarihi] = useState("");
  const [gorevliler, setGorevliler] = useState<string[]>([]);
  const [hakSahipleri, setHakSahipleri] = useState<HakSahibi[]>([newHakSahibi()]);
  const [priority, setPriority] = useState<Priority>("orta");
  const [status, setStatus] = useState<ProjectStatus>("taslak");
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("2026-10-14");
  const [endDate, setEndDate] = useState("2027-04-30");
  const [projModules, setProjModules] = useState<ProjectModuleKey[]>([...ALL_MODULES]);
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [team, setTeam] = useState<DraftMember[]>([{ id: newId("t"), name: "", role: "owner" }]);
  const [error, setError] = useState("");

  // Proje sahibi = ekipte "owner" rolündeki üye (hedef/bütçe artık Hedef ve Kar tablosundan yönetilir).
  const owner = team.find((m) => m.role === "owner" && m.name.trim());

  const toggleModule = (m: ProjectModuleKey) =>
    setProjModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const toggleTable = (id: string) =>
    setTableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleApprover = (name: string) =>
    setOnaylayanlar((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  const toggleGorevli = (name: string) =>
    setGorevliler((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const addMember = () => setTeam((prev) => [...prev, { id: newId("t"), name: "", role: "contributor" }]);
  const updateMember = (id: string, patch: Partial<DraftMember>) =>
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMember = (id: string) => setTeam((prev) => prev.filter((m) => m.id !== id));

  const submit = () => {
    if (!name.trim()) return setError("Proje adı zorunludur.");
    if (!code.trim()) return setError("Proje kodu zorunludur.");
    if (projModules.length === 0) return setError("En az bir modül seçmelisiniz.");
    setError("");
    const p = createProject({
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      type,
      hedefKitle: hedefKitle.trim(),
      projeyiGetiren,
      onaylayanlar,
      onayTarihi,
      gorevliler,
      hakSahipleri: hakSahipleri.filter((h) => h.hakSahibi.trim()),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      priority,
      status,
      startDate,
      endDate,
      // Bütçe/efor/paydaş kart künyesinden kaldırıldı — varsayılan; bütçe Hedef ve Kar tablosundan girilir.
      effort: 0,
      budget: 0,
      currency: "TRY",
      budgetVisibility: "ONLY_MANAGERS",
      stakeholder: "",
      modules: projModules,
      tableIds,
      team: team
        .filter((m) => m.name.trim())
        .map((m) => ({ id: m.id, name: m.name.trim(), role: m.role, access: defaultAccessForRole(m.role) })),
      tasks: [],
      activities: [],
      report: "",
    });
    onCreated(p.id);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-4 md:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <FolderPlus size={20} className="text-neon-blue" /> Yeni Proje Oluştur
        </h2>
        <p className="mt-1 text-sm text-muted">
          Meta bilgileri, zaman/bütçe planı, kategorizasyon, modüller ve ekip yetkilerini tanımlayın.
        </p>
      </header>

      <Section title="Proje Meta Bilgileri" code="T-0038">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Adı *</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="X Mobil Uygulaması" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Kodu</span>
            <input className={`${input} nums`} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Açıklama</span>
          <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Hedef Kitle</span>
            <input className={input} value={hedefKitle} onChange={(e) => setHedefKitle(e.target.value)} placeholder="ör. 25-45 yaş kurumsal müşteriler · KOBİ'ler" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Projeyi Getiren</span>
            <select className={input} value={projeyiGetiren} onChange={(e) => setProjeyiGetiren(e.target.value)}>
              <option value="">Seçin… (Kullanıcılar)</option>
              {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Onay Tarihi</span>
            <input type="date" className={input} value={onayTarihi} onChange={(e) => setOnayTarihi(e.target.value)} />
          </label>
          <div className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Onaylayan (çoklu — onay isteği)</span>
            <div className="flex flex-wrap gap-2">
              {userNames.map((n) => {
                const on = onaylayanlar.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleApprover(n)}
                    className={`chip ${on ? "border-neon-emerald/50 bg-neon-emerald/10 text-neon-emeraldGlow" : "border-line text-muted hover:text-ink"}`}
                  >
                    {on ? "✓ " : ""}{n}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="block sm:col-span-3">
            <span className="mb-1.5 block text-xs text-muted">Görevlendirilen Personel ve Yöneticiler (çoklu)</span>
            <div className="flex flex-wrap gap-2">
              {userNames.map((n) => {
                const on = gorevliler.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleGorevli(n)}
                    className={`chip ${on ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue" : "border-line text-muted hover:text-ink"}`}
                  >
                    {on ? "✓ " : ""}{n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Proje Hak Sahibi ve Beklentisi — projeye özel, burada doldurulur */}
      <HakSahibiEditor value={hakSahipleri} onChange={setHakSahipleri} />

      <Section title="Kategorizasyon" code="T-0020">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Proje Türü</span>
            <select className={input} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Öncelik</span>
            <select className={input} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Yaşam Döngüsü</span>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Etiketler (virgülle)</span>
            <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="mobil, öncelikli" />
          </label>
        </div>
      </Section>

      <Section title="Zaman Planlaması" code="T-0040">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Başlangıç Tarihi</span>
            <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Bitiş Tarihi</span>
            <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <p className="text-[11px] text-faint">Hedeflenen kâr ve bütçe, proje oluştuktan sonra <b>Hedef ve Kar</b> sekmesinden (dönem bazlı) girilir.</p>
      </Section>

      <Section title="Modüller (Özellik Aç/Kapa)" code="T-0031">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALL_MODULES.map((m) => {
            const on = projModules.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleModule(m)}
                className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                  on ? "border-neon-blue/50 bg-neon-blue/10 text-ink" : "border-line bg-white/[0.02] text-muted hover:text-ink"
                }`}
              >
                {MODULE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Kullanılacak Tablolar" code="T-0032">
        <p className="-mt-2 text-xs text-muted">Bu projenin hangi sistem tablolarını kullanacağını seçin ({tableIds.length} seçili).</p>
        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {[...modules].sort((a, b) => a.code.localeCompare(b.code, "tr")).map((m) => {
            const on = tableIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleTable(m.id)}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  on ? "border-neon-violet/50 bg-neon-violet/10 text-ink" : "border-line bg-white/[0.02] text-muted hover:text-ink"
                }`}
              >
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${on ? "border-neon-violet bg-neon-violet/30 text-neon-violet" : "border-line"}`}>
                  {on ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block text-[10px] text-faint nums">{m.code}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Ekip ve Roller" code="T-0001">
        <div className="space-y-2">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                className={`${input} flex-1`}
                value={m.name}
                onChange={(e) => updateMember(m.id, { name: e.target.value })}
                placeholder="Üye adı"
              />
              <select
                className={`${input} w-44`}
                value={m.role}
                onChange={(e) => updateMember(m.id, { role: e.target.value as RoleKey })}
              >
                {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button onClick={() => removeMember(m.id)} className="rounded-md p-2 text-muted transition hover:text-critical" aria-label="Üyeyi çıkar">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addMember} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
          <UserPlus size={14} /> Üye Ekle
        </button>
        <p className="text-[11px] text-faint">Rol seçimi, modül erişimlerini (yetki matrisi) otomatik ayarlar. Detayda tek tek düzenleyebilirsiniz.</p>
      </Section>

      {/* ── Proje Tanıtım Tablosu (künye) — girilen bilgilerin canlı özeti ── */}
      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-line bg-white/[0.02] px-5 py-3">
          <IdCard size={16} className="text-neon-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Proje Tanıtım Tablosu</h3>
          <span className="ml-auto chip border-line text-faint nums">{code || "PRJ-—"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Proje Adı", name || "—"],
                ["Proje Kodu", code || "—"],
                ["Açıklama", description || "—"],
                ["Proje Türü", TYPE_LABELS[type]],
                ["Hedef Kitle", hedefKitle.trim() || "—"],
                ["Projeyi Getiren", projeyiGetiren || "—"],
                ["Proje Onaylayan", onaylayanlar.length ? onaylayanlar.join(", ") : "—"],
                ["Proje Onay Tarihi", onayTarihi ? dmy(onayTarihi) : "—"],
                ["Görevli Personel/Yöneticiler", gorevliler.length ? gorevliler.join(", ") : "—"],
                ["Hak Sahipleri", hakSahipleri.filter((h) => h.hakSahibi.trim()).map((h) => h.hakSahibi.trim()).join(", ") || "—"],
                ["Öncelik", PRIORITY_META[priority].label],
                ["Yaşam Döngüsü", STATUS_META[status].label],
                ["Etiketler", tags.trim() || "—"],
                ["Başlangıç → Bitiş", `${dmy(startDate)} → ${dmy(endDate)}`],
                ["Proje Sahibi", owner ? `${owner.name.trim()} (${ROLE_LABELS[owner.role]})` : "—"],
                ["Aktif Modüller", projModules.length ? projModules.map((m) => MODULE_LABELS[m]).join(", ") : "—"],
                ["Seçili Tablolar", `${tableIds.length} tablo`],
                ["Ekip", team.filter((m) => m.name.trim()).length ? team.filter((m) => m.name.trim()).map((m) => `${m.name.trim()} (${ROLE_LABELS[m.role]})`).join(", ") : "—"],
              ].map(([k, v], i) => (
                <tr key={k} className={i % 2 ? "bg-white/[0.015]" : ""}>
                  <td className="w-52 whitespace-nowrap border-b border-line/50 px-5 py-2.5 align-top text-xs font-medium uppercase tracking-wide text-muted">{k}</td>
                  <td className="border-b border-line/50 px-5 py-2.5 text-ink">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-violet px-5 py-2.5 text-sm font-semibold text-white shadow-glow-blue transition hover:opacity-90"
        >
          <Save size={16} /> Kaydet
        </button>
        <span className="text-[11px] text-faint">Kaydet dersen proje oluşturulur ve tüm sekmeleriyle açılır.</span>
      </div>
    </div>
  );
}
