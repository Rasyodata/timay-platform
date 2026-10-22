import { useState } from "react";
import { X, Bell, Send, Repeat, CalendarDays, Wallet } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { useUsers } from "@/context/UsersContext";

const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "—");
const tl = (n: number) => (n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

// Her ayın N'i → bugünden itibaren ilk uygun tarih
function nextMonthlyDay(day: number): string {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const y = now.getFullYear(), m = now.getMonth();
  let cand = new Date(y, m, Math.min(day, lastDay(y, m)));
  if (cand.getTime() < now.getTime()) cand = new Date(y, m + 1, Math.min(day, lastDay(y, m + 1)));
  return dstr(cand);
}
// Her yıl (ay/gün) → bugünden itibaren ilk uygun tarih
function nextYearly(iso: string): string {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const [, mm, dd] = iso.split("-").map(Number);
  let cand = new Date(now.getFullYear(), (mm || 1) - 1, dd || 1);
  if (cand.getTime() < now.getTime()) cand = new Date(now.getFullYear() + 1, (mm || 1) - 1, dd || 1);
  return dstr(cand);
}

type Tur = "Hatırlatma" | "Ödeme" | "Tahsilat";
type Zaman = "tarih" | "aylik" | "yillik";

export default function HatirlatmaModal({ defaultDate, onClose }: { defaultDate?: string; onClose: () => void }) {
  const { addRecord } = useModules();
  const { users } = useUsers();
  const [baslik, setBaslik] = useState("");
  const [tur, setTur] = useState<Tur>("Hatırlatma");
  const [tutar, setTutar] = useState("");
  const [cari, setCari] = useState("");
  const [zaman, setZaman] = useState<Zaman>("tarih");
  const [tarih, setTarih] = useState(defaultDate || dstr(new Date()));
  const [gun, setGun] = useState("15");
  const [aciklama, setAciklama] = useState("");

  const next = zaman === "aylik" ? nextMonthlyDay(Number(gun) || 1) : zaman === "yillik" ? nextYearly(tarih) : tarih;
  const tutarN = Number(tutar) || 0;
  const odeme = tur === "Ödeme" || tur === "Tahsilat";
  const recurring = zaman !== "tarih";
  const periyotLabel = zaman === "aylik" ? `Her ayın ${gun}'i` : zaman === "yillik" ? `Her yıl ${dmy(next)}` : dmy(next);

  const inp = "w-full rounded-lg border border-line bg-base/60 px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/30";
  const lbl = "mb-1 block text-xs text-muted";

  const kaydet = () => {
    if (!baslik.trim()) return;
    const etiket = `🔔 ${baslik.trim()}${tutarN ? ` · ${tl(tutarN)}` : ""}`;
    // 1) Ajanda hatırlatması — takvim + defter (Ajandam) üzerinde o tarihte görünür
    addRecord("mod-T-0057", {
      baslik: etiket, kategori: "Hatırlatma", oncelik: tur === "Ödeme" ? "Yüksek" : "Orta",
      tarih: next, durum: "Yapılacak",
      not: `${tur} · ${periyotLabel}${cari ? ` · ${cari}` : ""}${aciklama ? ` — ${aciklama}` : ""}`,
    });
    if (odeme && tutarN > 0) {
      // 2) Finans — Ödeme Takvimi (Tekrarlayan İşlemler T-0015), sadece tekrarlı olanlar
      if (recurring) {
        addRecord("mod-T-0015", {
          baslik: baslik.trim(), islem_tipi: tur, cari, tutar: tutarN,
          periyot: zaman === "yillik" ? "Yıllık" : "Aylık", baslangic: next, sonraki_tarih: next,
          durum: "Aktif", aciklama: `${periyotLabel}${aciklama ? ` · ${aciklama}` : ""}`,
        });
      }
      // 3) Nakit akış — Tahmini Bütçe Çıkış Kartı (T-0028), Ödeme çıkışları
      if (tur === "Ödeme") {
        addRecord("mod-T-0028", {
          cikis_tipi: /kira/i.test(baslik) ? "Kira" : /maaş|maas|bordro/i.test(baslik) ? "Maaş" : /vergi/i.test(baslik) ? "Vergi" : "Diğer",
          kategori: baslik.trim(), tutar: tutarN, tarih: next,
          tekrar: zaman === "yillik" ? "Yıllık" : zaman === "aylik" ? "Aylık" : "Tek Sefer",
          cari, aciklama,
        });
      }
    }
    onClose();
  };

  const hedefler = [
    { on: true, icon: CalendarDays, txt: `Ajanda/Takvim · ${dmy(next)}` },
    { on: odeme && tutarN > 0 && recurring, icon: Repeat, txt: "Finans · Ödeme Takvimi (Tekrarlayan)" },
    { on: odeme && tutarN > 0 && tur === "Ödeme", icon: Wallet, txt: "Nakit Akış (Tahmini Çıkış)" },
  ].filter((h) => h.on);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Bell size={15} className="text-neon-blue" /> Hatırlatma Ekle</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block"><span className={lbl}>Başlık *</span>
            <input className={inp} value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="ör. Kira Ödeme" autoFocus /></label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className={lbl}>Tür</span>
              <select className={inp} value={tur} onChange={(e) => setTur(e.target.value as Tur)}>
                <option value="Hatırlatma">Hatırlatma</option><option value="Ödeme">Ödeme</option><option value="Tahsilat">Tahsilat</option>
              </select></label>
            {odeme && (
              <label className="block"><span className={lbl}>Tutar (₺)</span>
                <input type="number" className={inp} value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder="0,00" /></label>
            )}
            {odeme && (
              <label className="block"><span className={lbl}>Cari</span>
                <select className={inp} value={cari} onChange={(e) => setCari(e.target.value)}>
                  <option value="">—</option>{users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select></label>
            )}
          </div>

          <div>
            <span className={lbl}>Zamanlama</span>
            <div className="flex gap-1 rounded-lg border border-line bg-base/40 p-0.5">
              {([["tarih", "Belirli Tarih"], ["aylik", "Her Ay"], ["yillik", "Her Yıl"]] as [Zaman, string][]).map(([v, t]) => (
                <button key={v} onClick={() => setZaman(v)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${zaman === v ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{t}</button>
              ))}
            </div>
          </div>

          {zaman === "aylik" ? (
            <label className="block"><span className={lbl}>Her ayın kaçında</span>
              <select className={inp} value={gun} onChange={(e) => setGun(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}. günü</option>)}
              </select></label>
          ) : (
            <label className="block"><span className={lbl}>{zaman === "yillik" ? "Yıllık tekrar tarihi" : "Tarih"}</span>
              <input type="date" className={inp} value={tarih} onChange={(e) => setTarih(e.target.value)} /></label>
          )}

          <label className="block"><span className={lbl}>Açıklama</span>
            <input className={inp} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="(opsiyonel)" /></label>

          {/* Nereye işlenecek önizlemesi */}
          <div className="rounded-lg border border-line bg-base/40 p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Şuralara işlenecek</p>
            <div className="space-y-1">
              {hedefler.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-ink"><h.icon size={13} className="text-neon-blue" /> {h.txt}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:bg-elevated">Vazgeç</button>
          <button onClick={kaydet} disabled={!baslik.trim()} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-blue/90 disabled:opacity-40"><Send size={14} /> Hatırlatma Kur</button>
        </div>
      </div>
    </div>
  );
}
