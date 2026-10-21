import { useState } from "react";
import { Calculator, Percent, Scale, Info, FileText } from "lucide-react";
import type { View } from "@/App";

const tl = (n: number) => (isFinite(n) ? n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00") + " ₺";
const gunArasi = (a: string, b: string) => {
  if (!a || !b) return 0;
  const d1 = new Date(a + "T00:00:00").getTime(), d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000));
};

// Oranlar yıllara göre değişir — varsayılanlar bilgilendirmedir, güncel oranı kontrol edin.
const FAIZ_TURU = [
  { ad: "Yasal Faiz (adi işler)", oran: 24 },
  { ad: "Avans / Ticari Temerrüt Faizi", oran: 48 },
  { ad: "Serbest (elle gir)", oran: 0 },
];

export default function HukukHesap({ onNavigate }: { onNavigate?: (v: View) => void }) {
  // Faiz
  const [anapara, setAnapara] = useState<string>("100000");
  const [basTarih, setBasTarih] = useState<string>("");
  const [bitTarih, setBitTarih] = useState<string>("");
  const [oran, setOran] = useState<string>("24");

  const ap = parseFloat(anapara) || 0;
  const or = parseFloat(oran) || 0;
  const gun = gunArasi(basTarih, bitTarih);
  const faiz = ap * (or / 100) * (gun / 365);
  const faizToplam = ap + faiz;

  // Harç
  const [deger, setDeger] = useState<string>("100000");
  const [binde, setBinde] = useState<string>("68.31");
  const [basvurma, setBasvurma] = useState<string>("427.60");
  const dg = parseFloat(deger) || 0;
  const bn = parseFloat(binde) || 0;
  const bv = parseFloat(basvurma) || 0;
  const ilamHarci = dg * (bn / 1000);
  const pesinHarc = ilamHarci / 4; // peşin harç genelde nispi harcın 1/4'ü
  const pesinOdenecek = pesinHarc + bv;

  const inp = "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20 nums";
  const lbl = "mb-1 block text-xs font-semibold text-muted";
  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${strong ? "bg-neon-blue/10" : "bg-base/40"}`}>
      <span className={`text-sm ${strong ? "font-semibold text-ink" : "text-muted"}`}>{k}</span>
      <span className={`nums text-sm ${strong ? "font-bold text-neon-blue" : "text-ink"}`}>{v}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neon-blue/10 text-neon-blue"><Calculator size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-ink">Faiz & Harç Hesaplama</h1>
          <p className="text-xs text-muted">İcra/dava faizi ve yargı harcı hesabı · oranlar düzenlenebilir.</p>
        </div>
        {onNavigate && (
          <button onClick={() => onNavigate("mod:mod-T-0016")} className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-ink"><FileText size={15} /> Dosyalar</button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2">
        <Info size={15} className="shrink-0 text-warning" />
        <p className="text-[12px] text-ink">Harç ve faiz oranları her yıl değişir. Varsayılanlar bilgilendirme amaçlıdır; kesin sonuç için güncel mevzuatı/UYAP'ı esas alın.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Faiz */}
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><Percent size={15} className="text-neon-blue" /> Faiz Hesabı (basit faiz)</h2>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Anapara (₺)</label>
              <input type="number" value={anapara} onChange={(e) => setAnapara(e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Başlangıç Tarihi</label><input type="date" value={basTarih} onChange={(e) => setBasTarih(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Bitiş Tarihi</label><input type="date" value={bitTarih} onChange={(e) => setBitTarih(e.target.value)} className={inp} /></div>
            </div>
            <div>
              <label className={lbl}>Faiz Türü / Yıllık Oran (%)</label>
              <div className="flex gap-2">
                <select onChange={(e) => { const t = FAIZ_TURU.find((x) => x.ad === e.target.value); if (t && t.oran) setOran(String(t.oran)); }} className={`${inp} flex-1`} defaultValue={FAIZ_TURU[0].ad}>
                  {FAIZ_TURU.map((t) => <option key={t.ad}>{t.ad}</option>)}
                </select>
                <input type="number" value={oran} onChange={(e) => setOran(e.target.value)} className={`${inp} w-24`} />
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Row k="Gün sayısı" v={`${gun} gün`} />
              <Row k="Hesaplanan faiz" v={tl(faiz)} />
              <Row k="Anapara + Faiz (Toplam)" v={tl(faizToplam)} strong />
            </div>
          </div>
        </section>

        {/* Harç */}
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><Scale size={15} className="text-neon-blue" /> Yargı Harcı Hesabı</h2>
          <div className="space-y-3">
            <div>
              <label className={lbl}>Dava / Takip Değeri (₺)</label>
              <input type="number" value={deger} onChange={(e) => setDeger(e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>Nispi Harç (binde)</label><input type="number" value={binde} onChange={(e) => setBinde(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Başvurma Harcı (₺)</label><input type="number" value={basvurma} onChange={(e) => setBasvurma(e.target.value)} className={inp} /></div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Row k={`Nispi karar/ilam harcı (‰${binde || 0})`} v={tl(ilamHarci)} />
              <Row k="Peşin harç (1/4)" v={tl(pesinHarc)} />
              <Row k="Başvurma harcı" v={tl(bv)} />
              <Row k="Peşin ödenecek toplam" v={tl(pesinOdenecek)} strong />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
