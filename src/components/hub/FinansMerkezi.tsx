import { LineChart, Briefcase, ArrowLeftRight, ReceiptText, Landmark, Users2, Database, Wallet, ChevronLeft, BarChart3, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "@/App";

// Finans katmanları (görsel referans).
const LAYERS: { label: string; icon: LucideIcon; accent: string }[] = [
  { label: "CRM", icon: Users2, accent: "#0A4EA2" },
  { label: "ERP & Muhasebe", icon: Database, accent: "#4B3FB0" },
  { label: "Bütçe", icon: Briefcase, accent: "#1E7A46" },
  { label: "Nakit Akışı", icon: LineChart, accent: "#0891B2" },
];

// Para akışı tablolarına hızlı erişim.
const FLOW_LINKS: { title: string; sub: string; icon: LucideIcon; view: View }[] = [
  { title: "Nakit Akış", sub: "T-0009", icon: LineChart, view: "mod:mod-T-0009" },
  { title: "Bütçe Kontrol", sub: "T-0048", icon: Briefcase, view: "mod:mod-T-0048" },
  { title: "Kasa Hareket", sub: "T-0007", icon: ArrowLeftRight, view: "mod:mod-T-0007" },
  { title: "Masraf Hareket", sub: "T-0010", icon: ReceiptText, view: "mod:mod-T-0010" },
  { title: "Masraf Kartı", sub: "T-0008", icon: ReceiptText, view: "mod:mod-T-0008" },
  { title: "Cari Hareket", sub: "T-0005", icon: Wallet, view: "mod:mod-T-0005" },
  { title: "Kasa / Hesap", sub: "T-0006", icon: Landmark, view: "mod:mod-T-0006" },
];

export default function FinansMerkezi({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 py-8 md:p-8">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink">
        <ChevronLeft size={14} /> Büro & İş Akışı
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-blue">Finans</p>
          <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Finans Yönetimi</h1>
          <p className="mt-2 text-sm text-muted">CRM · ERP/Muhasebe · Bütçe · Nakit Akışı — kasa, masraf, cari ve bütçe tek merkezde.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate("finansal-raporlar")} className="flex items-center gap-2 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <BarChart3 size={16} /> Finansal Raporlar
          </button>
          <button onClick={() => onNavigate("tekrarlayan")} className="flex items-center gap-2 rounded-lg border border-neon-blue/40 bg-neon-blue/10 px-4 py-2.5 text-sm font-semibold text-neon-blue transition hover:bg-neon-blue/20">
            <Repeat size={16} /> Tekrarlayan İşlemler
          </button>
        </div>
      </header>

      {/* Katmanlar */}
      <div className="flex flex-wrap gap-2">
        {LAYERS.map((l) => {
          const Icon = l.icon;
          return (
            <span key={l.label} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: `${l.accent}55`, background: `${l.accent}14`, color: l.accent }}>
              <Icon size={13} /> {l.label}
            </span>
          );
        })}
      </div>

      {/* Hızlı erişim tabloları */}
      <section className="rounded-2xl border border-line bg-panel/60 p-6">
        <h2 className="text-sm font-semibold text-ink">Bağlı Finans Tabloları</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {FLOW_LINKS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.sub}
                onClick={() => onNavigate(f.view)}
                className="group flex flex-col items-start gap-2 rounded-xl border border-line bg-base/40 p-3 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:bg-white/[0.03]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue"><Icon size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-ink">{f.title}</span>
                  <span className="block text-[10px] text-faint">{f.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
