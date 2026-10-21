import { useState } from "react";
import { ShieldCheck, Plus, Trash2, ChevronRight } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { useProjects } from "@/context/ProjectsContext";
import type { DynamicModule } from "@/types/modules";

const MOD_ID = "mod-T-0030";
const SIRKETLER = ["Toprak İnşaat", "Proje Ortaklığı", "Tümü (Konsolide)"];
const YETKI_DUZEYLERI = ["Görür", "Değiştirir", "Tam"];
// Alan bazlı yetki seçenekleri (seçili olan sarı vurgulanır).
const ALAN_YETKILERI = ["Görmez", "Görür", "Düzenler", "Ekler"];

/** Bir tablonun alanları — T-0001 (Kullanıcılar) için gerçek kullanıcı alanları, diğerleri modül alanları. */
function fieldsOf(m: DynamicModule): Array<{ code: string; name: string }> {
  if (m.id === "mod-T-0001") {
    return [
      { code: "name", name: "Ad Soyad" },
      { code: "kod", name: "Kullanıcı Kodu" },
      { code: "userType", name: "Kullanıcı Tipi" },
      { code: "department", name: "Departman" },
      { code: "email", name: "E-posta" },
      { code: "phone", name: "Telefon" },
      { code: "vergiNo", name: "Vergi No" },
      { code: "tcNo", name: "TC No" },
    ];
  }
  return m.fields.map((f) => ({ code: f.code, name: f.name }));
}
const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

/**
 * Yetki Kartı Oluştur (T-0030) — Yetki Tipi (Kullanıcı/Departman):
 *  · Kullanıcı → Kullanıcı Tipi (T-0002) → seçime göre T-0001 kullanıcıları gelir.
 *  · Departman → T-0004 departmanları gelir.
 */
export default function YetkiKartiEditor() {
  const { getModule, addRecord, deleteRecord, modules } = useModules();
  const { users } = useUsers();
  const { projects } = useProjects();
  const mod = getModule(MOD_ID);

  const trSort = (a: string, b: string) => a.localeCompare(b, "tr");
  const userTypes = (modules.find((m) => m.id === "mod-T-0002")?.records ?? []).map((r) => String((r as Record<string, unknown>).ad ?? "")).filter(Boolean).sort(trSort);
  const departments = (modules.find((m) => m.id === "mod-T-0004")?.records ?? []).map((r) => String((r as Record<string, unknown>).ad ?? "")).filter(Boolean).sort(trSort);
  const activeUsers = users.filter((u) => u.active).sort((a, b) => trSort(a.name, b.name));

  const [open, setOpen] = useState(false);
  const [ad, setAd] = useState("");
  const [yetkiTipi, setYetkiTipi] = useState<"Kullanıcı" | "Departman">("Kullanıcı");
  const [kullaniciTipi, setKullaniciTipi] = useState("");
  const [kullanici, setKullanici] = useState("");
  const [departman, setDepartman] = useState("");
  const [sirketler, setSirketler] = useState<string[]>([]);
  const [projeler, setProjeler] = useState<string[]>([]);
  const [kapsam, setKapsam] = useState("");
  const [duzey, setDuzey] = useState("Görür");
  const [err, setErr] = useState("");
  // Tablo & alan bazlı yetkiler: key = "modId::fieldCode" → "Görmez/Görür/Düzenler/Ekler"
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fieldPerms, setFieldPerms] = useState<Record<string, string>>({});
  const setFieldPerm = (key: string, perm: string) => setFieldPerms((p) => ({ ...p, [key]: perm }));
  // Genel: bir tablonun tüm alanlarını seçilen yetkiye ayarla.
  const setAllFieldsFor = (m: DynamicModule, perm: string) =>
    setFieldPerms((p) => {
      const next = { ...p };
      fieldsOf(m).forEach((f) => { next[`${m.id}::${f.code}`] = perm; });
      return next;
    });
  // Tümü: bütün tabloların tüm alanlarını seçilen yetkiye ayarla.
  const setAllTablesFields = (perm: string) =>
    setFieldPerms(() => {
      const next: Record<string, string> = {};
      modules.forEach((m) => fieldsOf(m).forEach((f) => { next[`${m.id}::${f.code}`] = perm; }));
      return next;
    });

  if (!mod) return <div className="card p-5 text-sm text-muted">Yetki Kartı tablosu (T-0030) bulunamadı.</div>;

  const records = mod.records as Record<string, unknown>[];
  const belgeNo = `T-0030-2026-${String(records.length + 1).padStart(4, "0")}`;
  // Kullanıcı tipine göre T-0001 filtrelenir.
  const filteredUsers = kullaniciTipi ? activeUsers.filter((u) => u.userType === kullaniciTipi) : activeUsers;
  const toggleSirket = (s: string) => setSirketler((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const toggleProje = (s: string) => setProjeler((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const reset = () => { setAd(""); setKullaniciTipi(""); setKullanici(""); setDepartman(""); setSirketler([]); setProjeler([]); setKapsam(""); setDuzey("Görür"); setYetkiTipi("Kullanıcı"); setFieldPerms({}); setExpanded(null); };
  const save = () => {
    if (!ad.trim()) return setErr("Yetki kartı adı zorunludur.");
    const hedef = yetkiTipi === "Kullanıcı" ? kullanici : departman;
    if (!hedef) return setErr(yetkiTipi === "Kullanıcı" ? "Kullanıcı seçmelisiniz." : "Departman seçmelisiniz.");
    setErr("");
    addRecord(MOD_ID, {
      belge_no: belgeNo, ad: ad.trim(), yetki_tipi: yetkiTipi,
      kullanici_tipi: yetkiTipi === "Kullanıcı" ? kullaniciTipi : "",
      hedef, sirketler: sirketler.join(", "), projeler: projeler.join(", ") || "Tümü", kapsam, yetki_duzeyi: duzey,
      alan_yetkileri: (() => {
        const granted = Object.values(fieldPerms).filter((v) => v && v !== "Görmez");
        return granted.length ? `${granted.length} alan yetkilendirildi` : "—";
      })(),
      alan_yetkileri_detay: JSON.stringify(fieldPerms),
    });
    reset(); setOpen(false);
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-neon-violet/30 bg-neon-violet/10 text-neon-violet"><ShieldCheck size={16} /></span>
          <div>
            <h3 className="text-base font-semibold text-ink">Yetki Kartı Oluştur</h3>
            <p className="text-[11px] text-muted"><span className="nums">T-0030</span> · şirket → modül/tablo yetkileri · yetki tipi (kullanıcı/departman)</p>
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
          <Plus size={14} /> Yetki Kartı Ekle
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Belge No (otomatik)</span>
              <input className={`${input} nums opacity-70`} value={belgeNo} readOnly /></label>
            <label className="block sm:col-span-1 lg:col-span-2"><span className="mb-1 block text-xs text-muted">Yetki Kartı Adı / Başlık *</span>
              <input className={input} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="ör. Satış Ekibi — Proje Görüntüleme" /></label>

            <label className="block"><span className="mb-1 block text-xs text-muted">Yetki Tipi *</span>
              <select className={input} value={yetkiTipi} onChange={(e) => { setYetkiTipi(e.target.value as "Kullanıcı" | "Departman"); setKullanici(""); setDepartman(""); }}>
                <option value="Kullanıcı">Kullanıcı</option>
                <option value="Departman">Departman</option>
              </select></label>

            {yetkiTipi === "Kullanıcı" ? (
              <>
                <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı Tipi <span className="text-faint">(T-0002)</span></span>
                  <select className={input} value={kullaniciTipi} onChange={(e) => { setKullaniciTipi(e.target.value); setKullanici(""); }}>
                    <option value="">Tümü</option>
                    {userTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı <span className="text-faint">(T-0001{kullaniciTipi ? ` · ${kullaniciTipi}` : ""})</span></span>
                  <select className={input} value={kullanici} onChange={(e) => setKullanici(e.target.value)}>
                    <option value="">Seçin…</option>
                    {filteredUsers.map((u) => <option key={u.id} value={`${u.kod} · ${u.name}`}>{u.kod} · {u.name}</option>)}
                  </select></label>
              </>
            ) : (
              <label className="block"><span className="mb-1 block text-xs text-muted">Departman <span className="text-faint">(T-0004)</span></span>
                <select className={input} value={departman} onChange={(e) => setDepartman(e.target.value)}>
                  <option value="">Seçin…</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></label>
            )}

            <label className="block"><span className="mb-1 block text-xs text-muted">Kapsam (Modül / Tablo)</span>
              <select className={input} value={kapsam} onChange={(e) => setKapsam(e.target.value)}>
                <option value="">Tümü (Konsolide)</option>
                {[...modules].sort((a, b) => a.code.localeCompare(b.code, "tr")).map((m) => <option key={m.id} value={`${m.code} · ${m.name}`}>{m.code} · {m.name}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Yetki Düzeyi (kart/tablo)</span>
              <select className={input} value={duzey} onChange={(e) => setDuzey(e.target.value)}>
                {YETKI_DUZEYLERI.map((d) => <option key={d} value={d}>{d}</option>)}
              </select></label>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs text-muted">Hangi Şirket(ler)e Yetki</span>
            <div className="flex flex-wrap gap-2">
              {SIRKETLER.map((s) => {
                const on = sirketler.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleSirket(s)} className={`chip ${on ? "border-neon-emerald/50 bg-neon-emerald/10 text-neon-emeraldGlow" : "border-line text-muted hover:text-ink"}`}>
                    {on ? "✓ " : ""}{s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <span className="mb-1 block text-xs text-muted">Hangi Proje(ler)e Yetki <span className="text-faint">(boş = Tümü · seçilirse yalnız seçili projeleri görür)</span></span>
            <div className="flex flex-wrap gap-2">
              {projects.length === 0 ? <span className="text-xs text-muted">Proje yok.</span> : projects.map((p) => {
                const label = `${p.code} · ${p.name}`;
                const on = projeler.includes(label);
                return (
                  <button key={p.id} type="button" onClick={() => toggleProje(label)} className={`chip ${on ? "border-neon-blue/50 bg-neon-blue/10 text-neon-blue" : "border-line text-muted hover:text-ink"}`}>
                    {on ? "✓ " : ""}{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tablo & Alan Yetkileri — tablolar satır satır, tıklayınca alanlar açılır */}
          <div className="mt-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">Tablo &amp; Alan Yetkileri <span className="text-faint">(tabloya tıkla → alanlar açılır · her alan: Görmez / Görür / Düzenler / Ekler)</span></span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide text-faint">Tümü:</span>
                {ALAN_YETKILERI.map((opt) => (
                  <button key={opt} type="button" onClick={() => setAllTablesFields(opt)} title={`Bütün tabloların tüm alanlarını "${opt}" yap`}
                    className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-warning/60 hover:bg-warning/10 hover:text-warning">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
              {[...modules].sort((a, b) => a.code.localeCompare(b.code, "tr")).map((m) => {
                const isOpen = expanded === m.id;
                const flds = fieldsOf(m);
                const grantedCount = flds.filter((f) => { const v = fieldPerms[`${m.id}::${f.code}`]; return v && v !== "Görmez"; }).length;
                return (
                  <div key={m.id}>
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm transition hover:bg-white/[0.02]">
                      <button type="button" onClick={() => setExpanded(isOpen ? null : m.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ChevronRight size={14} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <span className="nums text-[11px] text-faint">{m.code}</span>
                        <span className="truncate text-ink">{m.name}</span>
                      </button>
                      {grantedCount > 0 && <span className="chip border-warning/40 bg-warning/10 text-warning">{grantedCount} alan</span>}
                      {/* Genel (toplu): tüm alanları seçilen yetkiye ayarlar */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-faint">Genel:</span>
                        {ALAN_YETKILERI.map((opt) => (
                          <button key={opt} type="button" onClick={() => setAllFieldsFor(m, opt)} title={`Tüm alanları "${opt}" yap`}
                            className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-warning/60 hover:bg-warning/10 hover:text-warning">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="space-y-1.5 bg-white/[0.015] px-3 py-2">
                        {flds.map((f) => {
                          const key = `${m.id}::${f.code}`;
                          const cur = fieldPerms[key] ?? "Görmez";
                          return (
                            <div key={f.code} className="flex flex-wrap items-center gap-2">
                              <span className="w-40 shrink-0 truncate text-xs text-ink">{f.name}</span>
                              <div className="flex flex-wrap gap-1">
                                {ALAN_YETKILERI.map((opt) => {
                                  const on = cur === opt;
                                  return (
                                    <button key={opt} type="button" onClick={() => setFieldPerm(key, opt)}
                                      className={`rounded-md border px-2 py-0.5 text-[11px] transition ${on ? "border-warning/60 bg-warning/20 font-semibold text-warning" : "border-line text-muted hover:text-ink"}`}>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {err && <p className="mt-2 text-xs text-critical">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Yetki Kartı Oluştur</button>
            <button onClick={() => { setOpen(false); setErr(""); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-8 text-sm text-muted">Yetki kartı yok.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Belge No</th>
                <th className="px-3 py-2 font-medium text-muted">Ad</th>
                <th className="px-3 py-2 font-medium text-muted">Yetki Tipi</th>
                <th className="px-3 py-2 font-medium text-muted">Hedef</th>
                <th className="px-3 py-2 font-medium text-muted">Şirketler</th>
                <th className="px-3 py-2 font-medium text-muted">Projeler</th>
                <th className="px-3 py-2 font-medium text-muted">Kapsam</th>
                <th className="px-3 py-2 font-medium text-muted">Düzey</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={String(r.id)} className="border-b border-line/60">
                  <td className="px-3 py-2.5 text-ink nums">{String(r.belge_no ?? "—")}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{String(r.ad ?? "—")}</td>
                  <td className="px-3 py-2.5"><span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">{String(r.yetki_tipi ?? "—")}</span></td>
                  <td className="px-3 py-2.5 text-ink">{String(r.hedef ?? "—")}{r.kullanici_tipi ? <span className="block text-[11px] text-faint">{String(r.kullanici_tipi)}</span> : null}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.sirketler || "—")}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.projeler || "Tümü")}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.kapsam || "Tümü")}</td>
                  <td className="px-3 py-2.5 text-ink">{String(r.yetki_duzeyi ?? "—")}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => deleteRecord(MOD_ID, String(r.id))} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Sil"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
