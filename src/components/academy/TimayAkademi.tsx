import { useState } from "react";
import { GraduationCap, PlayCircle, Clock, BarChart2, Award, Search, BookOpen, Users } from "lucide-react";
import type { View } from "@/App";

type Egitim = { ad: string; kategori: string; egitmen: string; sure: string; seviye: "Başlangıç" | "Orta" | "İleri"; ilerleme: number; renk: string };

const EGITIMLER: Egitim[] = [
  { ad: "Liderlik ve Ekip Yönetimi", kategori: "Yönetim", egitmen: "Dr. Elif Arslan", sure: "6 saat", seviye: "Orta", ilerleme: 65, renk: "#0A4EA2" },
  { ad: "Proje Yönetimi (PMP Hazırlık)", kategori: "Proje", egitmen: "Mehmet Kaya", sure: "12 saat", seviye: "İleri", ilerleme: 30, renk: "#4B3FB0" },
  { ad: "Finansal Okuryazarlık", kategori: "Finans", egitmen: "Ayşe Demir", sure: "4 saat", seviye: "Başlangıç", ilerleme: 100, renk: "#1E7A46" },
  { ad: "Excel İleri Düzey & Raporlama", kategori: "Ofis", egitmen: "Burak Yıldız", sure: "8 saat", seviye: "İleri", ilerleme: 45, renk: "#0891B2" },
  { ad: "Dijital Pazarlama 101", kategori: "Pazarlama", egitmen: "Tuğba Yörük", sure: "5 saat", seviye: "Başlangıç", ilerleme: 0, renk: "#B5731A" },
  { ad: "İş Sağlığı ve Güvenliği", kategori: "Zorunlu", egitmen: "Kadir Fırat", sure: "3 saat", seviye: "Başlangıç", ilerleme: 100, renk: "#C1292E" },
  { ad: "Müşteri İlişkileri (CRM)", kategori: "Satış", egitmen: "Halim Bey", sure: "4 saat", seviye: "Orta", ilerleme: 20, renk: "#9C2A6B" },
  { ad: "Sunum ve İletişim Teknikleri", kategori: "Kişisel Gelişim", egitmen: "Dr. Elif Arslan", sure: "3 saat", seviye: "Başlangıç", ilerleme: 80, renk: "#0d9488" },
  { ad: "Veri Analizi ve Karar Verme", kategori: "Analitik", egitmen: "Mehmet Kaya", sure: "10 saat", seviye: "İleri", ilerleme: 10, renk: "#7C3AED" },
];
const KATEGORILER = ["Tümü", ...Array.from(new Set(EGITIMLER.map((e) => e.kategori)))];
const SEV_RENK: Record<string, string> = { "Başlangıç": "#1E7A46", "Orta": "#B5731A", "İleri": "#C1292E" };

export default function TimayAkademi(_props: { onNavigate?: (v: View) => void }) {
  const [kat, setKat] = useState("Tümü");
  const [q, setQ] = useState("");

  const qn = q.trim().toLocaleLowerCase("tr");
  const liste = EGITIMLER
    .filter((e) => (kat === "Tümü" ? true : e.kategori === kat))
    .filter((e) => (qn ? (e.ad + " " + e.egitmen + " " + e.kategori).toLocaleLowerCase("tr").includes(qn) : true));

  const tamam = EGITIMLER.filter((e) => e.ilerleme === 100).length;
  const devam = EGITIMLER.filter((e) => e.ilerleme > 0 && e.ilerleme < 100).length;

  const KPI = ({ icon: Icon, label, value, accent }: { icon: typeof Award; label: string; value: string; accent: string }) => (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}18`, color: accent }}><Icon size={19} /></span>
      <div><p className="text-xl font-bold text-ink">{value}</p><p className="text-xs text-muted">{label}</p></div>
    </div>
  );

  return (
    <div className="max-w-[1280px] space-y-6 px-4 py-8 md:px-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-neon-blue/10 text-neon-blue"><GraduationCap size={26} /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink md:text-3xl">Timay Akademi</h1>
          <p className="text-sm text-muted">Kurumsal eğitim ve gelişim platformu — eğitimlerini takip et, sertifika kazan.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KPI icon={BookOpen} label="Toplam Eğitim" value={String(EGITIMLER.length)} accent="#0A4EA2" />
        <KPI icon={PlayCircle} label="Devam Eden" value={String(devam)} accent="#B5731A" />
        <KPI icon={Award} label="Tamamlanan" value={String(tamam)} accent="#1E7A46" />
        <KPI icon={Users} label="Katılımcı" value="48" accent="#9C2A6B" />
      </div>

      {/* Filtre + ara */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {KATEGORILER.map((k) => (
            <button key={k} onClick={() => setKat(k)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${kat === k ? "border-neon-blue bg-neon-blue text-white" : "border-line bg-panel text-muted hover:text-ink"}`}>{k}</button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Eğitim ara…" className="w-56 rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
        </div>
      </div>

      {/* Eğitim kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {liste.map((e) => {
          const bitti = e.ilerleme === 100;
          const baslamadi = e.ilerleme === 0;
          return (
            <div key={e.ad} className="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-24 items-center justify-center" style={{ background: `${e.renk}14` }}>
                <GraduationCap size={34} style={{ color: e.renk }} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${e.renk}18`, color: e.renk }}>{e.kategori}</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: SEV_RENK[e.seviye] }}><BarChart2 size={11} /> {e.seviye}</span>
                </div>
                <h3 className="text-sm font-bold leading-tight text-ink">{e.ad}</h3>
                <p className="text-[11px] text-muted">{e.egitmen} · <Clock size={10} className="inline" /> {e.sure}</p>

                <div className="mt-auto pt-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted"><span>İlerleme</span><span>%{e.ilerleme}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full" style={{ width: `${e.ilerleme}%`, background: bitti ? "#1E7A46" : e.renk }} /></div>
                  <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: bitti ? "#1E7A46" : e.renk }}>
                    {bitti ? <><Award size={14} /> Sertifikayı Gör</> : baslamadi ? <><PlayCircle size={14} /> Başla</> : <><PlayCircle size={14} /> Devam Et</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {liste.length === 0 && <div className="col-span-full card grid place-items-center gap-2 p-16 text-center"><GraduationCap size={34} className="text-faint" /><p className="text-sm text-muted">Eşleşen eğitim yok.</p></div>}
      </div>
    </div>
  );
}
