import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, FileText, Lock, Plus, Trash2, Wallet } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";
import { fmtTL } from "@/lib/format";
import { openTableReport } from "@/lib/tableReport";

const LEDGER_ID = "mod-T-0046";

const INCOME = ["Tahsilat", "Satış"];
const EXPENSE = ["Ödeme", "Alış", "Satın Alma"];
const ALL_TIPI = [...INCOME, ...EXPENSE];

const input =
  "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40";
const money = (n: number) => fmtTL(n);

function Tile({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</p>
      <p className="mt-1 text-lg font-bold nums tabular-nums">{value}</p>
    </div>
  );
}

export default function ProjectLedger() {
  const { getModule, addRecord, deleteRecord } = useModules();
  const { users, canViewField } = useUsers();
  const ledger = getModule(LEDGER_ID);

  const [open, setOpen] = useState(false);
  const [tarih, setTarih] = useState("");
  const [tipi, setTipi] = useState("Tahsilat");
  const [turu, setTuru] = useState("Cari");
  const [cari, setCari] = useState("");
  const [yetki, setYetki] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [tutar, setTutar] = useState<number | "">("");
  const [err, setErr] = useState("");

  const showAmounts = canViewField("ONLY_MANAGERS");
  // Cari kartlar artık Kullanıcı Cari Kart'tan (T-0001 = Kullanıcılar) gelir.
  const cariOptions = useMemo(
    () => users.filter((u) => u.active).map((u) => u.name).sort((a, b) => a.localeCompare(b, "tr")),
    [users],
  );

  // Kasa mantığı: kronolojik akış → giren/çıkan + her satırın koşan bakiyesi.
  const { giren, cikan, bakiye, balanceById } = useMemo(() => {
    const recs = (ledger?.records ?? []) as Record<string, unknown>[];
    const sorted = [...recs].sort((a, b) => String(a.tarih ?? "").localeCompare(String(b.tarih ?? "")));
    let g = 0, c = 0, run = 0;
    const balanceById: Record<string, number> = {};
    for (const r of sorted) {
      const t = Number(r.tutar) || 0;
      if (INCOME.includes(String(r.hareket_tipi))) { g += t; run += t; }
      else if (EXPENSE.includes(String(r.hareket_tipi))) { c += t; run -= t; }
      balanceById[String(r.id)] = run;
    }
    return { giren: g, cikan: c, bakiye: g - c, balanceById };
  }, [ledger]);

  if (!ledger) return <div className="card p-5 text-sm text-muted">Proje Hesabı tablosu bulunamadı.</div>;

  const isExpense = EXPENSE.includes(tipi);
  const isCari = turu === "Cari";

  const save = () => {
    if (!tarih) return setErr("Tarih zorunlu.");
    if (!tutar) return setErr("Tutar zorunlu.");
    if (isCari && !cari) return setErr("Cari seçmelisiniz.");
    if (isExpense && !yetki) return setErr("Harcama için Harcama Yetkisi (onaylayan) zorunludur.");
    setErr("");
    addRecord(LEDGER_ID, {
      tarih, hareket_tipi: tipi, hareket_turu: turu,
      cari: isCari ? cari : "", harcama_yetkisi: isExpense ? yetki : "",
      aciklama, tutar: Number(tutar),
    });
    setTarih(""); setCari(""); setYetki(""); setAciklama(""); setTutar(""); setOpen(false);
  };

  const recs = [...(ledger.records as Record<string, unknown>[])].sort((a, b) =>
    String(b.tarih ?? "").localeCompare(String(a.tarih ?? "")),
  );

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-ink"><Wallet size={16} className="text-neon-emerald" /> Proje Hesabı (Muhasebe)</h3>
          <p className="text-[11px] text-muted"><span className="nums">{ledger.code}</span> · {ledger.records.length} hareket</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTableReport(ledger, showAmounts ? [
            { label: "Toplam Giren", value: money(giren) },
            { label: "Toplam Çıkan", value: money(cikan) },
            { label: "Kalan Bakiye", value: money(bakiye) },
          ] : undefined, "Kasa Raporu")} className="chip border-neon-violet/40 bg-neon-violet/10 text-neon-violet transition hover:bg-neon-violet/20">
            <FileText size={14} /> Rapor Al
          </button>
          <button onClick={() => setOpen((v) => !v)} className="chip border-neon-blue/40 bg-neon-blue/10 text-neon-blue transition hover:bg-neon-blue/20">
            <Plus size={14} /> Hareket Ekle
          </button>
        </div>
      </div>

      {/* Kasa özeti: giren · çıkan · kalan bakiye */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Toplam Giren (Tahsilat+Satış)" tone="border-good/30 bg-good/10 text-good" icon={<ArrowDownLeft size={13} />} value={showAmounts ? money(giren) : "•••••"} />
        <Tile label="Toplam Çıkan (Ödeme+Alış+Satın Alma)" tone="border-critical/30 bg-critical/10 text-critical" icon={<ArrowUpRight size={13} />} value={showAmounts ? money(cikan) : "•••••"} />
        <Tile label="Kalan Bakiye (Kasa)" tone={bakiye >= 0 ? "border-neon-blue/30 bg-neon-blue/10 text-neon-blue" : "border-warning/30 bg-warning/10 text-warning"} icon={<Wallet size={13} />} value={showAmounts ? money(bakiye) : "•••••"} />
      </div>

      {/* Hareket ekleme formu */}
      {open && (
        <div className="mb-4 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Tarih *</span>
              <input type="date" className={input} value={tarih} onChange={(e) => setTarih(e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Hareket Tipi *</span>
              <select className={input} value={tipi} onChange={(e) => setTipi(e.target.value)}>
                {ALL_TIPI.map((o) => <option key={o} value={o}>{o}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Hareket Türü</span>
              <select className={input} value={turu} onChange={(e) => setTuru(e.target.value)}>
                <option value="Gider">Gider</option><option value="Cari">Cari</option>
              </select></label>

            {/* Cari seçilince cari kartı dropdown'u gelir */}
            {isCari && (
              <label className="block"><span className="mb-1 block text-xs text-muted">Cari (Cari Kartı) *</span>
                <select className={input} value={cari} onChange={(e) => setCari(e.target.value)}>
                  <option value="">Cari seçin…</option>
                  {cariOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></label>
            )}

            {/* Harcama (gider) için harcama yetkisi istenir */}
            {isExpense && (
              <label className="block"><span className="mb-1 block text-xs text-muted">Harcama Yetkisi (Onaylayan) *</span>
                <select className={input} value={yetki} onChange={(e) => setYetki(e.target.value)}>
                  <option value="">Onaylayan seçin…</option>
                  {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select></label>
            )}

            <label className="block"><span className="mb-1 block text-xs text-muted">Tutar (₺) *</span>
              <input type="number" className={input} value={tutar} onChange={(e) => setTutar(e.target.valueAsNumber || "")} /></label>
            <label className="block sm:col-span-2 lg:col-span-3"><span className="mb-1 block text-xs text-muted">Açıklama</span>
              <input className={input} value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></label>
          </div>
          {err && <p className="mt-2 text-xs text-critical">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90">Kaydet</button>
            <button onClick={() => { setOpen(false); setErr(""); }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-elevated">Vazgeç</button>
          </div>
        </div>
      )}

      {/* Defter */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-3 py-2 font-medium text-muted">Tarih</th>
              <th className="px-3 py-2 font-medium text-muted">Hareket Tipi</th>
              <th className="px-3 py-2 font-medium text-muted">Tür</th>
              <th className="px-3 py-2 font-medium text-muted">Cari</th>
              <th className="px-3 py-2 font-medium text-muted">Harcama Yetkisi</th>
              <th className="px-3 py-2 font-medium text-muted">Açıklama</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Tutar</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Bakiye (Kasa)</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {recs.map((r) => {
              const inc = INCOME.includes(String(r.hareket_tipi));
              return (
                <tr key={String(r.id)} className="border-b border-line/60 transition hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 nums">{String(r.tarih ?? "").split("-").reverse().join(".")}</td>
                  <td className="px-3 py-2.5">
                    <span className={`chip ${inc ? "border-good/40 bg-good/10 text-good" : "border-critical/40 bg-critical/10 text-critical"}`}>{String(r.hareket_tipi ?? "")}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{String(r.hareket_turu ?? "—")}</td>
                  <td className="px-3 py-2.5 text-ink">{String(r.cari || "—")}</td>
                  <td className="px-3 py-2.5 text-ink">{String(r.harcama_yetkisi || "—")}</td>
                  <td className="px-3 py-2.5 text-muted">{String(r.aciklama || "—")}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold nums ${inc ? "text-good" : "text-critical"}`}>
                    {showAmounts ? `${inc ? "+" : "−"}${money(Number(r.tutar) || 0)}` : <span className="inline-flex items-center gap-1 text-muted"><Lock size={10} /> •••••</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-ink nums">
                    {showAmounts ? money(balanceById[String(r.id)] ?? 0) : "•••••"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => deleteRecord(LEDGER_ID, String(r.id))} className="rounded-md p-1 text-muted transition hover:text-critical" aria-label="Sil"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {recs.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted">Henüz hareket yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
