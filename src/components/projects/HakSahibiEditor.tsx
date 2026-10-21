import { Plus, Trash2, Users } from "lucide-react";
import { ORTAKLIK_TIPLERI, type HakSahibi } from "@/types/projects";
import { fmtNum } from "@/lib/format";
import { useUsers } from "@/context/UsersContext";

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";

let hsCounter = 0;
const newHakSahibi = (): HakSahibi => ({
  id: `hs-${Date.now().toString(36)}-${(hsCounter++).toString(36)}`,
  hakSahibi: "", satisHedefi: 0, karHedefi: 0, pazarBeklentisi: "", ortaklikTipi: "", iletisim: "", ortakSayisi: 0, aciklama: "",
});

/**
 * Projeye özel "Proje Hak Sahibi ve Beklentisi" kayıtları — satırlar kullanıcı tarafından eklenip doldurulur.
 * readOnly=true → salt-okunur tablo (proje detayı görünümü).
 */
export default function HakSahibiEditor({
  value, onChange, readOnly = false,
}: { value: HakSahibi[]; onChange?: (v: HakSahibi[]) => void; readOnly?: boolean }) {
  const { users } = useUsers();
  const activeUsers = users.filter((u) => u.active).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const contactOf = (name: string) => {
    const u = activeUsers.find((x) => x.name === name);
    if (!u) return "";
    return [u.email, u.phone].filter(Boolean).join(" · ");
  };
  const rows = value ?? [];
  const update = (id: string, patch: Partial<HakSahibi>) => onChange?.(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  // Hak sahibi seçilince iletişim bilgisi kullanıcıdan otomatik gelir.
  const selectHakSahibi = (id: string, name: string) => update(id, { hakSahibi: name, iletisim: contactOf(name) });
  const remove = (id: string) => onChange?.(rows.filter((r) => r.id !== id));
  const add = () => onChange?.([...rows, newHakSahibi()]);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-neon-violet/30 bg-neon-violet/10 text-neon-violet"><Users size={16} /></span>
          <div>
            <h3 className="flex items-center gap-1.5 text-base font-semibold text-ink">
              Proje Hak Sahibi ve Beklentisi
              <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-normal text-faint nums">T-0049</span>
            </h3>
            <p className="text-[11px] text-muted">Projeye özel · hak sahibi · satış/kâr hedefi · pazar beklentisi · ortaklık tipi · iletişim · ortak sayısı</p>
          </div>
        </div>
        {!readOnly && (
          <button type="button" onClick={add} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Plus size={14} /> Hak Sahibi Ekle
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line py-8 text-sm text-muted">
          {readOnly ? "Hak sahibi girilmemiş." : "Henüz hak sahibi yok — \"Hak Sahibi Ekle\" ile satır ekleyin."}
        </div>
      ) : readOnly ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-3 py-2 font-medium text-muted">Hak Sahibi</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Satış Hedefi</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Kâr Hedefi</th>
                <th className="px-3 py-2 font-medium text-muted">Ortaklık Tipi</th>
                <th className="px-3 py-2 font-medium text-muted">Pazar Beklentisi</th>
                <th className="px-3 py-2 font-medium text-muted">İletişim</th>
                <th className="px-3 py-2 text-right font-medium text-muted">Ortak</th>
                <th className="px-3 py-2 font-medium text-muted">Proje Açıklaması</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="px-3 py-2.5 font-medium text-ink">{r.hakSahibi || "—"}</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{fmtNum(r.satisHedefi)} TL</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{fmtNum(r.karHedefi)} TL</td>
                  <td className="px-3 py-2.5 text-muted">{r.ortaklikTipi || "—"}</td>
                  <td className="px-3 py-2.5 text-muted">{r.pazarBeklentisi || "—"}</td>
                  <td className="px-3 py-2.5 text-muted">{r.iletisim || "—"}</td>
                  <td className="px-3 py-2.5 text-right text-ink nums">{r.ortakSayisi || 0}</td>
                  <td className="px-3 py-2.5 text-muted">{r.aciklama || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-xl border border-line/70 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Hak Sahibi #{i + 1}</span>
                <button type="button" onClick={() => remove(r.id)} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Satırı sil"><Trash2 size={15} /></button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Hak Sahibi (Kullanıcılardan)</span>
                  <select className={input} value={r.hakSahibi} onChange={(e) => selectHakSahibi(r.id, e.target.value)}>
                    <option value="">Seçin… (Kullanıcılar)</option>
                    {activeUsers.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Satış Hedefi (₺)</span>
                  <input type="number" className={input} value={r.satisHedefi || ""} onChange={(e) => update(r.id, { satisHedefi: Number(e.target.value) || 0 })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Kâr Hedefi (₺)</span>
                  <input type="number" className={input} value={r.karHedefi || ""} onChange={(e) => update(r.id, { karHedefi: Number(e.target.value) || 0 })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Proje Ortaklık Tipi</span>
                  <select className={input} value={r.ortaklikTipi} onChange={(e) => update(r.id, { ortaklikTipi: e.target.value })}>
                    <option value="">Seçin…</option>
                    {ORTAKLIK_TIPLERI.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">İletişim Bilgileri</span>
                  <input className={input} value={r.iletisim} onChange={(e) => update(r.id, { iletisim: e.target.value })} placeholder="e-posta · telefon" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Ortak Sayısı</span>
                  <input type="number" className={input} value={r.ortakSayisi || ""} onChange={(e) => update(r.id, { ortakSayisi: Number(e.target.value) || 0 })} />
                </label>
                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className="mb-1 block text-xs text-muted">Pazar Beklentisi</span>
                  <textarea className={input} rows={2} value={r.pazarBeklentisi} onChange={(e) => update(r.id, { pazarBeklentisi: e.target.value })} />
                </label>
                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className="mb-1 block text-xs text-muted">Proje Açıklaması</span>
                  <textarea className={input} rows={2} value={r.aciklama} onChange={(e) => update(r.id, { aciklama: e.target.value })} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export { newHakSahibi };
