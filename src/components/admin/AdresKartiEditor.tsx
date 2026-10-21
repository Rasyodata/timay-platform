import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { ADRES_TIPLERI } from "@/types/users";

const MOD_ID = "mod-T-0003";
const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

const fmtAdr = (r: Record<string, unknown>) => {
  const sm = [r.sokak, r.mahalle].filter(Boolean).join(", ");
  return [sm, r.ilce, r.il].filter(Boolean).join(" - ") || "—";
};

/**
 * Adres Kartı (T-0003) — kullanıcı kodu seçilince kullanıcı adı otomatik gelir.
 * filterKod verilirse yalnızca o kullanıcının adresleri gösterilir/eklenir (T-0001 "Adres Ekle").
 */
export default function AdresKartiEditor({ filterKod, title = "Adres Kartı Tablosu" }: { filterKod?: string; title?: string }) {
  const { getModule, addRecord, deleteRecord } = useModules();
  const { users } = useUsers();
  const mod = getModule(MOD_ID);
  const active = users.filter((u) => u.active).sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const [open, setOpen] = useState(false);
  const [kod, setKod] = useState(filterKod ?? "");
  const [adresTipi, setAdresTipi] = useState<string>("İş");
  const [sokak, setSokak] = useState("");
  const [mahalle, setMahalle] = useState("");
  const [ilce, setIlce] = useState("");
  const [il, setIl] = useState("");
  const [eposta, setEposta] = useState("");
  const [tel1, setTel1] = useState("");
  const [tel2, setTel2] = useState("");
  const [tel3, setTel3] = useState("");
  const [err, setErr] = useState("");

  if (!mod) return <div className="card p-5 text-sm text-muted">Adres Kartı tablosu (T-0003) bulunamadı.</div>;

  const adiOf = (k: string) => active.find((u) => u.kod === k)?.name ?? "";
  const allRecs = mod.records as Record<string, unknown>[];
  const rows = allRecs.filter((r) => !filterKod || r.kullanici_kodu === filterKod);
  const nextAdresKodu = `ADR-${String(allRecs.reduce((mx, r) => Math.max(mx, Number(String(r.adres_kodu ?? "").match(/(\d+)/)?.[1] ?? 0)), 0) + 1).padStart(4, "0")}`;

  const save = () => {
    if (!kod) return setErr("Kullanıcı kodu seçmelisiniz.");
    setErr("");
    addRecord(MOD_ID, { adres_kodu: nextAdresKodu, kullanici_kodu: kod, kullanici_adi: adiOf(kod), adres_tipi: adresTipi, sokak: sokak.trim(), mahalle: mahalle.trim(), ilce: ilce.trim(), il: il.trim(), eposta: eposta.trim(), telefon1: tel1.trim(), telefon2: tel2.trim(), telefon3: tel3.trim() });
    setSokak(""); setMahalle(""); setIlce(""); setIl(""); setEposta(""); setTel1(""); setTel2(""); setTel3(""); if (!filterKod) setKod(""); setOpen(false);
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-neon-emerald/30 bg-neon-emerald/10 text-neon-emerald"><MapPin size={16} /></span>
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="text-[11px] text-muted"><span className="nums">T-0003</span> · {rows.length} adres · kullanıcı kodu (T-0001) ile bağlı</p>
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
          <Plus size={14} /> Adres Ekle
        </button>
      </div>

      {open && (
        <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Adres Kodu (otomatik)</span>
              <input className={`${input} nums opacity-70`} value={nextAdresKodu} readOnly /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı Kodu (T-0001) *</span>
              <select className={input} value={kod} disabled={!!filterKod} onChange={(e) => setKod(e.target.value)}>
                <option value="">Seçin…</option>
                {active.map((u) => <option key={u.id} value={u.kod}>{u.kod} · {u.name}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Kullanıcı Adı (otomatik)</span>
              <input className={`${input} opacity-70`} value={adiOf(kod)} readOnly placeholder="—" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Adres Tipi *</span>
              <select className={input} value={adresTipi} onChange={(e) => setAdresTipi(e.target.value)}>
                {ADRES_TIPLERI.map((t) => <option key={t} value={t}>{t}</option>)}
              </select></label>
            <input className={input} value={sokak} onChange={(e) => setSokak(e.target.value)} placeholder="Sokak / Cadde" />
            <input className={input} value={mahalle} onChange={(e) => setMahalle(e.target.value)} placeholder="Mahalle" />
            <input className={input} value={ilce} onChange={(e) => setIlce(e.target.value)} placeholder="İlçe" />
            <input className={input} value={il} onChange={(e) => setIl(e.target.value)} placeholder="İl" />
            <label className="block"><span className="mb-1 block text-xs text-muted">E-posta</span>
              <input className={input} value={eposta} onChange={(e) => setEposta(e.target.value)} placeholder="ornek@firma.co" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Telefon 1</span>
              <input className={input} value={tel1} onChange={(e) => setTel1(e.target.value)} placeholder="0532 000 00 00" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Telefon 2</span>
              <input className={input} value={tel2} onChange={(e) => setTel2(e.target.value)} placeholder="(opsiyonel)" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Telefon 3</span>
              <input className={input} value={tel3} onChange={(e) => setTel3(e.target.value)} placeholder="(opsiyonel)" /></label>
          </div>
          {err && <p className="mt-2 text-xs text-critical">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Kaydet</button>
            <button onClick={() => { setOpen(false); setErr(""); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-8 text-sm text-muted">Adres kaydı yok.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Adres Kodu</th>
                <th className="px-3 py-2 font-medium text-muted">Kullanıcı Kodu</th>
                <th className="px-3 py-2 font-medium text-muted">Kullanıcı Adı</th>
                <th className="px-3 py-2 font-medium text-muted">Adres Tipi</th>
                <th className="px-3 py-2 font-medium text-muted">Adres</th>
                <th className="px-3 py-2 font-medium text-muted">İletişim</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-b border-line/60">
                  <td className="px-3 py-2.5 text-ink nums">{String(r.adres_kodu ?? "—")}</td>
                  <td className="px-3 py-2.5 text-ink nums">{String(r.kullanici_kodu ?? "—")}</td>
                  <td className="px-3 py-2.5 text-ink">{String(r.kullanici_adi ?? "—")}</td>
                  <td className="px-3 py-2.5"><span className="chip border-neon-violet/30 bg-neon-violet/10 text-neon-violet">{String(r.adres_tipi ?? "—")}</span></td>
                  <td className="px-3 py-2.5 text-muted">{fmtAdr(r)}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {r.eposta ? <span className="block">{String(r.eposta)}</span> : null}
                    {[r.telefon1, r.telefon2, r.telefon3].filter(Boolean).map((t, i) => <span key={i} className="block text-[11px] text-faint nums">{String(t)}</span>)}
                    {!r.eposta && !r.telefon1 && !r.telefon2 && !r.telefon3 ? "—" : null}
                  </td>
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
