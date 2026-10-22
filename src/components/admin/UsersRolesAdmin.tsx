import { useState } from "react";
import { Check, Minus, Plus, ShieldCheck, Trash2, UserPlus, Users as UsersIcon, Workflow } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { ROLE_LABELS, type RoleKey } from "@/types/modules";
import AdresKartiEditor from "@/components/admin/AdresKartiEditor";
import YetkiKartiEditor from "@/components/admin/YetkiKartiEditor";
import {
  ADRES_TIPLERI,
  CAPABILITIES,
  CAPABILITY_LABELS,
  DEPARTMENTS,
  USER_TYPES,
  type Department,
  type User,
} from "@/types/users";

/** Kullanıcı tipi seçenekleri — Cari Tür Kodları (T-0002) kayıtlarından; yoksa varsayılan liste. */
const trSort = (a: string, b: string) => a.localeCompare(b, "tr");
function useUserTypeOptions(): string[] {
  const { modules } = useModules();
  const recs = (modules.find((m) => m.id === "mod-T-0002")?.records ?? []) as Array<Record<string, unknown>>;
  const fromTable = recs.map((r) => String(r.ad ?? "").trim()).filter(Boolean);
  return (fromTable.length ? fromTable : [...USER_TYPES]).sort(trSort);
}

/** Departman seçenekleri — Departman Tanımları (T-0004) kayıtlarından; yoksa varsayılan liste. */
function useDepartmentOptions(): string[] {
  const { modules } = useModules();
  const recs = (modules.find((m) => m.id === "mod-T-0004")?.records ?? []) as Array<Record<string, unknown>>;
  const fromTable = recs.map((r) => String(r.ad ?? "").trim()).filter(Boolean);
  return (fromTable.length ? fromTable : [...DEPARTMENTS]).sort(trSort);
}

const ROLES: RoleKey[] = ["owner", "manager", "contributor", "viewer"];
const input =
  "rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

/* ─────────────────────────── Kullanıcılar ─────────────────────────── */

function AddUserForm() {
  const { addUser, users } = useUsers();
  const nextKod = `K-${String(users.reduce((mx, u) => Math.max(mx, Number(String(u.kod ?? "").match(/(\d+)/)?.[1] ?? 0)), 0) + 1).padStart(4, "0")}`;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const { addRecord, modules } = useModules();
  const adrRecs = (modules.find((m) => m.id === "mod-T-0003")?.records ?? []) as Array<Record<string, unknown>>;
  // Yeni kullanıcı için adres/iletişim — "Adres Ekle" ile girilir, kaydederken T-0003'e işlenir
  const [adresOpen, setAdresOpen] = useState(false);
  const [adresTipi, setAdresTipi] = useState<string>("İş");
  const [sokak, setSokak] = useState(""); const [mahalle, setMahalle] = useState("");
  const [ilce, setIlce] = useState(""); const [il, setIl] = useState("");
  const userTypeOptions = useUserTypeOptions();
  const departmanOptions = useDepartmentOptions();
  const [department, setDepartment] = useState<string>("");
  const [addingDept, setAddingDept] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [userType, setUserType] = useState<string>("");

  const addDepartman = () => {
    const d = newDept.trim();
    if (!d) return;
    addRecord("mod-T-0004", { ad: d, durum: "Aktif" });
    setDepartment(d); setNewDept(""); setAddingDept(false);
  };
  const [vergiDairesi, setVergiDairesi] = useState("");
  const [vergiNo, setVergiNo] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [baro, setBaro] = useState("");
  const [sicilNo, setSicilNo] = useState("");
  const [role, setRole] = useState<RoleKey>("contributor");

  const add = () => {
    if (!name.trim()) return;
    addUser({
      name: name.trim(), email: email.trim() || "—", phone: phone.trim(), department, userType,
      vergiDairesi: vergiDairesi.trim(), vergiNo: vergiNo.trim(), tcNo: tcNo.trim(), adresSecim: "",
      baro: userType === "Avukat" ? baro.trim() : "", sicilNo: userType === "Avukat" ? sicilNo.trim() : "",
      role, active: true,
    });
    // İletişim/adres girildiyse yeni kullanıcı için Adres Kartı (T-0003) oluştur
    if (email.trim() || phone.trim() || sokak.trim() || mahalle.trim() || ilce.trim() || il.trim()) {
      const nextAdrKod = `ADR-${String(adrRecs.reduce((mx, r) => Math.max(mx, Number(String(r.adres_kodu ?? "").match(/(\d+)/)?.[1] ?? 0)), 0) + 1).padStart(4, "0")}`;
      addRecord("mod-T-0003", {
        adres_kodu: nextAdrKod, kullanici_kodu: nextKod, kullanici_adi: name.trim(), adres_tipi: adresTipi,
        eposta: email.trim(), telefon1: phone.trim(), sokak: sokak.trim(), mahalle: mahalle.trim(), ilce: ilce.trim(), il: il.trim(),
      });
    }
    setName(""); setEmail(""); setPhone(""); setVergiDairesi(""); setVergiNo(""); setTcNo(""); setBaro(""); setSicilNo("");
    setSokak(""); setMahalle(""); setIlce(""); setIl(""); setAdresTipi("İş"); setAdresOpen(false);
  };

  return (
    <section className="card p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
        <UserPlus size={15} /> Kullanıcı Ekle
        <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-faint nums">T-0001</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı Kodu (otomatik)</span>
          <input className={`${input} w-full nums opacity-70`} value={nextKod} readOnly /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Ad Soyad *</span>
          <input className={`${input} w-full`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı Tipi <span className="text-faint">(T-0002)</span></span>
          <select className={`${input} w-full`} value={userType} onChange={(e) => setUserType(e.target.value)}>
            <option value="">Seçin…</option>
            {userTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Departman <span className="text-faint">(T-0004)</span></span>
          <select className={`${input} w-full`} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Seçin…</option>
            {departmanOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {!addingDept ? (
            <button type="button" onClick={() => setAddingDept(true)} className="mt-1 text-[11px] text-neon-blue transition hover:underline">+ Yeni departman ekle</button>
          ) : (
            <div className="mt-1 flex gap-1">
              <input className={`${input} w-full`} value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDepartman()} placeholder="Yeni departman adı" />
              <button type="button" onClick={addDepartman} className="shrink-0 rounded-lg bg-neon-blue px-3 text-xs font-semibold text-white hover:bg-neon-blue/90">Ekle</button>
              <button type="button" onClick={() => { setAddingDept(false); setNewDept(""); }} className="shrink-0 rounded-lg border border-line px-2 text-xs text-muted hover:bg-elevated">✕</button>
            </div>
          )}
        </label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Global Rol</span>
          <select className={`${input} w-full`} value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Vergi Dairesi</span>
          <input className={`${input} w-full`} value={vergiDairesi} onChange={(e) => setVergiDairesi(e.target.value)} placeholder="ör. Kozyatağı VD" /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Vergi Numarası</span>
          <input className={`${input} w-full nums`} value={vergiNo} onChange={(e) => setVergiNo(e.target.value)} placeholder="10 haneli" /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">TC Numarası</span>
          <input className={`${input} w-full nums`} value={tcNo} onChange={(e) => setTcNo(e.target.value)} placeholder="11 haneli" /></label>
        {userType === "Avukat" && (
          <>
            <label className="block"><span className="mb-1 block text-xs text-muted">Baro <span className="text-faint">(avukat)</span></span>
              <input className={`${input} w-full`} value={baro} onChange={(e) => setBaro(e.target.value)} placeholder="ör. İstanbul Barosu" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Baro Sicil No <span className="text-faint">(avukat)</span></span>
              <input className={`${input} w-full nums`} value={sicilNo} onChange={(e) => setSicilNo(e.target.value)} placeholder="ör. 12345" /></label>
          </>
        )}
      </div>

      {/* İletişim & Adres — "Adres Ekle" ile açılır; tüm adresler listelenmez, bu kullanıcıya özel yeni kayıt girilir */}
      <div className="mt-3">
        {!adresOpen ? (
          <button type="button" onClick={() => setAdresOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted transition hover:border-neon-blue/40 hover:text-ink">
            <Plus size={14} /> Adres Ekle <span className="text-faint">(e-posta, telefon, adres · T-0003)</span>
          </button>
        ) : (
          <div className="rounded-xl border border-line bg-base/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">İletişim & Adres <span className="font-normal normal-case text-faint">(T-0003)</span></span>
              <button type="button" onClick={() => setAdresOpen(false)} className="text-[11px] text-muted hover:text-ink">✕ Kapat</button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block"><span className="mb-1 block text-xs text-muted">E-posta</span>
                <input type="email" className={`${input} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@firma.com" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted">Telefon</span>
                <input className={`${input} w-full`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted">Adres Tipi</span>
                <select className={`${input} w-full`} value={adresTipi} onChange={(e) => setAdresTipi(e.target.value)}>
                  {ADRES_TIPLERI.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted">Sokak / Cadde</span>
                <input className={`${input} w-full`} value={sokak} onChange={(e) => setSokak(e.target.value)} placeholder="Sokak / Cadde / No" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted">Mahalle</span>
                <input className={`${input} w-full`} value={mahalle} onChange={(e) => setMahalle(e.target.value)} placeholder="Mahalle" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted">İlçe</span>
                <input className={`${input} w-full`} value={ilce} onChange={(e) => setIlce(e.target.value)} placeholder="İlçe" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted">İl</span>
                <input className={`${input} w-full`} value={il} onChange={(e) => setIl(e.target.value)} placeholder="İl" /></label>
            </div>
            <p className="mt-2 text-[11px] text-faint">Kaydederken bu bilgiler yeni kullanıcının <b>Adres Kartı (T-0003)</b> kaydı olarak oluşturulur.</p>
          </div>
        )}
      </div>

      <button onClick={add} className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">
        <UserPlus size={15} /> Kullanıcı Ekle
      </button>
      <p className="mt-2 text-[11px] text-faint">Kullanıcı kodu (K-00NN) otomatik atanır. Birden fazla adres için kullanıcı eklendikten sonra listedeki <b>Adres Ekle</b>'yi kullanın.</p>
      <p className="mt-3 text-[11px] text-faint">Rol seçimi kullanıcının sistem geneli yetkisini belirler; detay yetkiler "Yetki ve Roller"den düzenlenir.</p>
    </section>
  );
}

const fmtAdr = (r: Record<string, unknown>) => {
  const sm = [r.sokak, r.mahalle].filter(Boolean).join(", ");
  return [sm, r.ilce, r.il].filter(Boolean).join(" - ");
};

/** T-0001 tablosu üzerinde satır bazlı adres: listeler + "Adres Ekle" → T-0003'e işler. */
function UserAddressCell({ user, rows }: { user: User; rows: Array<Record<string, unknown>> }) {
  const { addRecord, modules } = useModules();
  const [open, setOpen] = useState(false);
  const [tipi, setTipi] = useState<string>("İş");
  const [sokak, setSokak] = useState(""); const [mahalle, setMahalle] = useState("");
  const [ilce, setIlce] = useState(""); const [il, setIl] = useState("");
  const inp = "w-full rounded border border-line bg-base/60 px-2 py-1 text-xs text-ink outline-none focus:border-neon-blue/50";

  const save = () => {
    const allAdr = (modules.find((m) => m.id === "mod-T-0003")?.records ?? []) as Array<Record<string, unknown>>;
    const nextKod = `ADR-${String(allAdr.reduce((mx, r) => Math.max(mx, Number(String(r.adres_kodu ?? "").match(/(\d+)/)?.[1] ?? 0)), 0) + 1).padStart(4, "0")}`;
    addRecord("mod-T-0003", { adres_kodu: nextKod, kullanici_kodu: user.kod, kullanici_adi: user.name, adres_tipi: tipi, sokak: sokak.trim(), mahalle: mahalle.trim(), ilce: ilce.trim(), il: il.trim() });
    setSokak(""); setMahalle(""); setIlce(""); setIl(""); setTipi("İş"); setOpen(false);
  };

  return (
    <div className="space-y-1">
      {rows.length === 0 ? <span className="text-faint">—</span> : rows.map((r) => (
        <span key={String(r.id)} className="block text-[11px]"><b className="text-ink">{String(r.adres_tipi)}:</b> {fmtAdr(r) || "—"}</span>
      ))}
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-neon-blue/40 hover:text-ink">
          <Plus size={11} /> Adres Ekle
        </button>
      ) : (
        <div className="mt-1 space-y-1 rounded-lg border border-line bg-white/[0.02] p-2">
          <select className={inp} value={tipi} onChange={(e) => setTipi(e.target.value)}>
            {ADRES_TIPLERI.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={inp} value={sokak} onChange={(e) => setSokak(e.target.value)} placeholder="Sokak / Cadde" />
          <input className={inp} value={mahalle} onChange={(e) => setMahalle(e.target.value)} placeholder="Mahalle" />
          <div className="flex gap-1">
            <input className={inp} value={ilce} onChange={(e) => setIlce(e.target.value)} placeholder="İlçe" />
            <input className={inp} value={il} onChange={(e) => setIl(e.target.value)} placeholder="İl" />
          </div>
          <div className="flex gap-1">
            <button onClick={save} className="rounded bg-neon-blue px-2 py-1 text-[11px] font-semibold text-white hover:bg-neon-blue/90">Kaydet</button>
            <button onClick={() => setOpen(false)} className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersList() {
  const { users, removeUser, toggleActive } = useUsers();
  const { modules } = useModules();
  // Adresler T-0003'ten kullanıcı koduyla gelir.
  const adresRecs = (modules.find((m) => m.id === "mod-T-0003")?.records ?? []) as Array<Record<string, unknown>>;
  const adresOf = (kod?: string) => (kod ? adresRecs.filter((r) => r.kullanici_kodu === kod) : []);
  return (
    <section className="card p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
        <UsersIcon size={15} /> Kullanıcılar <span className="text-faint nums">({users.length})</span>
        <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-faint nums">T-0001</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Kod</th>
              <th className="px-3 py-2 font-medium text-muted">Ad</th>
              <th className="px-3 py-2 font-medium text-muted">Kullanıcı Tipi</th>
              <th className="px-3 py-2 font-medium text-muted">İletişim</th>
              <th className="px-3 py-2 font-medium text-muted">Departman</th>
              <th className="px-3 py-2 font-medium text-muted">Adres (T-0003)</th>
              <th className="px-3 py-2 font-medium text-muted">Vergi / TC</th>
              <th className="px-3 py-2 font-medium text-muted">Global Rol</th>
              <th className="px-3 py-2 font-medium text-muted">Durum</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60">
                <td className="px-3 py-2.5 text-ink nums">{u.kod ?? "—"}</td>
                <td className="px-3 py-2.5 font-medium text-ink">{u.name}</td>
                <td className="px-3 py-2.5">
                  {u.userType ? <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">{u.userType}</span> : <span className="text-faint">—</span>}
                  {(u.baro || u.sicilNo) && <span className="mt-1 block text-[11px] text-faint">{[u.baro, u.sicilNo && `Sicil: ${u.sicilNo}`].filter(Boolean).join(" · ")}</span>}
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {(() => {
                    const card = adresOf(u.kod).find((r) => r.eposta || r.telefon1 || r.telefon2 || r.telefon3);
                    const eposta = (card?.eposta as string) || u.email;
                    const tels = card ? [card.telefon1, card.telefon2, card.telefon3].filter(Boolean) : (u.phone ? [u.phone] : []);
                    return (
                      <>
                        <span className="block">{eposta || "—"}</span>
                        {tels.map((t, i) => <span key={i} className="block text-[11px] text-faint nums">{String(t)}</span>)}
                        {card && <span className="block text-[10px] text-faint">(T-0003)</span>}
                      </>
                    );
                  })()}
                </td>
                <td className="px-3 py-2.5"><span className="chip border-line text-muted">{u.department}</span></td>
                <td className="px-3 py-2.5 text-muted align-top">
                  <UserAddressCell user={u} rows={adresOf(u.kod)} />
                </td>
                <td className="px-3 py-2.5 text-muted">
                  <span className="block">{u.vergiDairesi || "—"}</span>
                  {u.vergiNo && <span className="block text-[11px] text-faint nums">VN: {u.vergiNo}</span>}
                  {u.tcNo && <span className="block text-[11px] text-faint nums">TC: {u.tcNo}</span>}
                </td>
                <td className="px-3 py-2.5 text-ink">{ROLE_LABELS[u.role]}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => toggleActive(u.id)}
                    className={`chip ${u.active ? "border-good/40 bg-good/10 text-good" : "border-line text-muted"}`}
                  >
                    {u.active ? "Aktif" : "Pasif"}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => removeUser(u.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Kaldır">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Başlıksız gövde — hem Kullanıcılar sayfasında hem Tablo Kayıt Ekle (T-0001) içinde kullanılır. */
export function UsersAdminBody() {
  return (
    <div className="space-y-6">
      <AddUserForm />
      <UsersList />
      {/* Tüm adresler burada toplu — ister T-0003'ten ister T-0001 satırından eklensin hepsi görünür + buradan da eklenir */}
      <AdresKartiEditor title="Adres Kartları (Tümü · T-0003)" />
    </div>
  );
}

export function UsersAdmin() {
  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 md:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <UsersIcon size={20} className="text-neon-blue" /> Kullanıcılar
        </h2>
        <p className="mt-1 text-sm text-muted">Üstte yeni kullanıcı ekleyin; altta oluşturulan kullanıcıların listesi.</p>
      </header>
      <UsersAdminBody />
    </div>
  );
}

/* ─────────────────────────── Yetki ve Roller ─────────────────────────── */

function RoleCaps() {
  const { caps, toggleCap } = useUsers();
  return (
    <section className="card p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
        <ShieldCheck size={15} /> Rol Şablonları — Yetki Matrisi
        <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal text-faint nums">T-0031</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Yetki</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-2 text-center font-medium text-muted">{ROLE_LABELS[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((cap) => (
              <tr key={cap} className="border-b border-line/60">
                <td className="px-3 py-2 text-ink">{CAPABILITY_LABELS[cap]}</td>
                {ROLES.map((r) => {
                  const on = caps[r][cap];
                  return (
                    <td key={r} className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleCap(r, cap)}
                        className={`grid h-6 w-6 place-items-center rounded-md border transition ${
                          on ? "border-good/40 bg-good/15 text-good" : "border-line bg-white/[0.02] text-faint hover:text-muted"
                        }`}
                        aria-label={on ? "Kapat" : "Aç"}
                      >
                        {on ? <Check size={14} /> : <Minus size={14} />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-faint">Hücreye tıklayarak rolün sistem geneli yetkisini aç/kapat. Değişiklikler denetim izine yazılır.</p>
    </section>
  );
}

function Inheritance() {
  const { inheritance, addRule, removeRule, users } = useUsers();
  const [department, setDepartment] = useState<Department>("Pazarlama");
  const [role, setRole] = useState<RoleKey>("viewer");
  const [scope, setScope] = useState("");

  return (
    <>
      <section className="card p-5">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          <Workflow size={15} /> Departman Yetki Mirası — Kural Ekle
        </h3>
        <p className="mb-3 text-xs text-muted">"Pazarlama departmanındaki herkes bu projeyi otomatik görsün" türü kurallar.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select className={input} value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className={input} value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <input className={input} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Kapsam (ör. Tüm Pazarlama Projeleri)" />
          <button
            onClick={() => { if (scope.trim()) { addRule({ department, role, scope: scope.trim() }); setScope(""); } }}
            className="rounded-lg bg-neon-violet px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Kural Ekle
          </button>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          <Workflow size={15} /> Tanımlı Yetki Mirası Kuralları <span className="text-faint nums">({inheritance.length})</span>
        </h3>
        <ul className="space-y-2">
          {inheritance.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line/60 bg-white/[0.02] px-3 py-2">
              <span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">{r.department}</span>
              <span className="text-muted">→</span>
              <span className="chip border-neon-blue/30 bg-neon-blue/10 text-neon-blue">{ROLE_LABELS[r.role]}</span>
              <span className="flex-1 truncate text-sm text-ink">{r.scope}</span>
              <span className="text-[11px] text-muted nums">{users.filter((u) => u.department === r.department).length} kişi</span>
              <button onClick={() => removeRule(r.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Kuralı sil">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {inheritance.length === 0 && <li className="text-sm text-muted">Tanımlı kural yok.</li>}
        </ul>
      </section>
    </>
  );
}

export function RolesAdmin() {
  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 md:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <ShieldCheck size={20} className="text-neon-blue" /> Yetki ve Roller
        </h2>
        <p className="mt-1 text-sm text-muted">Rol şablonlarının yetki matrisi ve departman tabanlı yetki mirası (inheritance).</p>
      </header>
      <RoleCaps />
      <YetkiKartiEditor />
      <Inheritance />
    </div>
  );
}

export default UsersAdmin;
