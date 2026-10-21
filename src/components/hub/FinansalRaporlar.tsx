import type { ReactNode } from "react";
import { ChevronLeft, Wallet, TrendingUp, Receipt, LineChart } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import { fmtNum } from "@/lib/format";
import type { View } from "@/App";

const money = (v: number) => `${fmtNum(Math.round(v))} ₺`;
const num = (v: unknown) => Number(v) || 0;

export default function FinansalRaporlar({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { modules } = useModules();
  const recs = (id: string) => (modules.find((m) => m.id === id)?.records ?? []) as Array<Record<string, unknown>>;

  // 1) Hesap Bakiyeleri (T-0006)
  const kasalar = recs("mod-T-0006");
  const toplamNakit = kasalar.reduce((a, r) => a + num(r.guncel_bakiye), 0);
  const bakiyeTipGrup = Object.entries(
    kasalar.reduce<Record<string, number>>((acc, r) => {
      const t = String(r.tip ?? "Diğer");
      acc[t] = (acc[t] ?? 0) + num(r.guncel_bakiye);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  // 2) Gelir–Gider (T-0046 Proje Hesabı muhasebe defteri)
  const defter = recs("mod-T-0046");
  const GELIR_TIP = new Set(["Tahsilat", "Satış"]);
  const gelirKalem = defter.filter((r) => GELIR_TIP.has(String(r.hareket_tipi)));
  const giderKalem = defter.filter((r) => !GELIR_TIP.has(String(r.hareket_tipi)));
  const toplamGelir = gelirKalem.reduce((a, r) => a + num(r.tutar), 0);
  const toplamGider = giderKalem.reduce((a, r) => a + num(r.tutar), 0);
  const netKar = toplamGelir - toplamGider;
  const grupla = (rows: Array<Record<string, unknown>>) =>
    Object.entries(rows.reduce<Record<string, number>>((acc, r) => {
      const k = String(r.hareket_tipi ?? "Diğer");
      acc[k] = (acc[k] ?? 0) + num(r.tutar);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);

  // 3) KDV / Vergi Özeti (EVR-0003 fatura + T-0044 resmi kayıt)
  const faturalar = recs("mod-EVR-0003");
  const resmi = recs("mod-T-0044");
  const hesaplananKDV =
    faturalar.filter((r) => String(r.fatura_tipi) === "Satış").reduce((a, r) => a + num(r.kdv_tutari), 0) +
    resmi.filter((r) => String(r.belge_turu) === "Fatura").reduce((a, r) => a + num(r.kdv_tutari), 0);
  const indirilecekKDV = faturalar.filter((r) => String(r.fatura_tipi) === "Alış").reduce((a, r) => a + num(r.kdv_tutari), 0);
  const odenecekKDV = hesaplananKDV - indirilecekKDV;

  // 4) Bütçe Gerçekleşme (T-0048)
  const butce = recs("mod-T-0048");
  const toplamButce = butce.reduce((a, r) => a + num(r.butce), 0);
  const toplamGerceklesen = butce.reduce((a, r) => a + num(r.gerceklesen), 0);
  const butceKullanim = toplamButce ? Math.round((toplamGerceklesen / toplamButce) * 100) : 0;
  const asanlar = butce.filter((r) => String(r.durum) === "Aşıldı");

  // 5) Nakit Akış Projeksiyonu (T-0009)
  const nakit = recs("mod-T-0009");
  const giris = nakit.filter((r) => String(r.yon).startsWith("Giriş")).reduce((a, r) => a + num(r.tutar), 0);
  const cikis = nakit.filter((r) => String(r.yon).startsWith("Çıkış")).reduce((a, r) => a + num(r.tutar), 0);
  const netNakit = giris - cikis;
  const nakitDonem = Object.entries(nakit.reduce<Record<string, { g: number; c: number }>>((acc, r) => {
    const d = String(r.donem ?? "—");
    acc[d] = acc[d] ?? { g: 0, c: 0 };
    if (String(r.yon).startsWith("Giriş")) acc[d].g += num(r.tutar); else acc[d].c += num(r.tutar);
    return acc;
  }, {}));

  const KPIS = [
    { label: "Toplam Nakit (Kasa+Banka)", value: money(toplamNakit), accent: "#0A4EA2", icon: Wallet },
    { label: "Net Kâr / Zarar", value: money(netKar), accent: netKar >= 0 ? "#1E7A46" : "#C1292E", icon: TrendingUp },
    { label: "Ödenecek KDV", value: money(odenecekKDV), accent: "#B5731A", icon: Receipt },
    { label: "Net Nakit Akışı (proj.)", value: money(netNakit), accent: netNakit >= 0 ? "#1E7A46" : "#C1292E", icon: LineChart },
  ];

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 py-8 md:p-8">
      <button onClick={() => onNavigate("finans-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink">
        <ChevronLeft size={14} /> Entegre Finans & İş Akışı Yönetimi
      </button>
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-blue">Finans</p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Finansal Raporlar</h1>
        <p className="mt-2 text-sm text-muted">Mevcut tablolardan otomatik hesaplanır (kasa, muhasebe defteri, fatura, bütçe, nakit akışı).</p>
      </header>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${k.accent}14`, color: k.accent }}><Icon size={17} /></span>
              </div>
              <p className="mt-3 text-xl font-bold" style={{ color: k.accent }}>{k.value}</p>
              <p className="mt-0.5 text-xs text-muted">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gelir-Gider */}
        <Section title="Gelir – Gider (Kâr / Zarar)" sub="Kaynak: Proje Hesabı muhasebe defteri (T-0046)">
          <Row label="Toplam Gelir" value={money(toplamGelir)} color="#1E7A46" bold />
          {grupla(gelirKalem).map(([k, v]) => <Row key={k} label={`• ${k}`} value={money(v)} muted />)}
          <Row label="Toplam Gider" value={money(toplamGider)} color="#C1292E" bold />
          {grupla(giderKalem).map(([k, v]) => <Row key={k} label={`• ${k}`} value={money(v)} muted />)}
          <div className="my-1 border-t border-line" />
          <Row label="NET KÂR / ZARAR" value={money(netKar)} color={netKar >= 0 ? "#1E7A46" : "#C1292E"} bold />
        </Section>

        {/* KDV */}
        <Section title="KDV / Vergi Özeti" sub="Kaynak: Fatura Evrağı (EVR-0003) + Resmi Kayıtlar (T-0044)">
          <Row label="Hesaplanan KDV (Satış)" value={money(hesaplananKDV)} />
          <Row label="İndirilecek KDV (Alış)" value={money(indirilecekKDV)} />
          <div className="my-1 border-t border-line" />
          <Row label={odenecekKDV >= 0 ? "Ödenecek KDV" : "Devreden KDV"} value={money(Math.abs(odenecekKDV))} color={odenecekKDV >= 0 ? "#B5731A" : "#1E7A46"} bold />
        </Section>

        {/* Hesap Bakiyeleri */}
        <Section title="Hesap Bakiyeleri (Kasa & Banka)" sub="Kaynak: Kasa / Hesap Tanımları (T-0006)">
          {bakiyeTipGrup.map(([t, v]) => <Row key={t} label={t} value={money(v)} />)}
          <div className="my-1 border-t border-line" />
          <Row label="TOPLAM NAKİT" value={money(toplamNakit)} color="#0A4EA2" bold />
        </Section>

        {/* Bütçe */}
        <Section title="Bütçe Gerçekleşme" sub="Kaynak: Bütçe Kontrol (T-0048)">
          <Row label="Toplam Bütçe" value={money(toplamButce)} />
          <Row label="Gerçekleşen" value={money(toplamGerceklesen)} />
          <Row label="Kalan" value={money(toplamButce - toplamGerceklesen)} color={toplamButce - toplamGerceklesen >= 0 ? "#1E7A46" : "#C1292E"} />
          <Row label="Kullanım" value={`%${butceKullanim}`} color={butceKullanim > 100 ? "#C1292E" : butceKullanim >= 85 ? "#B5731A" : "#1E7A46"} bold />
          {asanlar.length > 0 && <p className="mt-1 text-[11px] text-critical">⚠ Aşan kalem: {asanlar.map((r) => String(r.kalem)).join(", ")}</p>}
        </Section>

        {/* Nakit Akış */}
        <Section title="Nakit Akış Projeksiyonu" sub="Kaynak: Nakit Akış Tablosu (T-0009)" wide>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Toplam Giriş" value={money(giris)} color="#1E7A46" />
            <MiniStat label="Toplam Çıkış" value={money(cikis)} color="#C1292E" />
            <MiniStat label="Net" value={money(netNakit)} color={netNakit >= 0 ? "#1E7A46" : "#C1292E"} />
          </div>
          <div className="mt-3 space-y-1">
            {nakitDonem.map(([d, o]) => (
              <div key={d} className="flex items-center justify-between text-xs">
                <span className="text-muted">{d}</span>
                <span className="flex gap-3 nums">
                  <span className="text-good">+{fmtNum(o.g)}</span>
                  <span className="text-critical">−{fmtNum(o.c)}</span>
                  <span className="font-semibold text-ink">{fmtNum(o.g - o.c)} ₺</span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <p className="text-[11px] text-faint">Not: Raporlar prototip verisinden otomatik hesaplanır; nakit esaslı gösterim. Resmi muhasebe (çift kayıt) raporu için canlı/sunucu sürümünde genişletilir.</p>
    </div>
  );
}

function Section({ title, sub, children, wide }: { title: string; sub: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`card p-5 ${wide ? "lg:col-span-2" : ""}`}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mb-3 text-[11px] text-faint">{sub}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
function Row({ label, value, color, bold, muted }: { label: string; value: string; color?: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-xs text-muted" : "text-ink"}>{label}</span>
      <span className={`nums ${bold ? "font-bold" : muted ? "text-xs text-muted" : "font-medium"}`} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-line bg-base/50 p-3 text-center">
      <p className="text-base font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
