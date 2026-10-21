import { ChevronLeft, GitBranch, ClipboardCheck, ShoppingCart, Wallet, Scale, ReceiptText, ArrowLeftRight, NotebookPen, Gavel, ShieldAlert, ClipboardList, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { View } from "@/App";

// Onay hiyerarşisi kademeleri (tutar & bütçe eşiklerine göre).
const APPROVAL: { tier: string; rule: string; accent: string }[] = [
  { tier: "Otomatik Onay", rule: "< 50.000 ₺ ve Bütçe İçi → doğrudan muhasebe", accent: "#1E7A46" },
  { tier: "Departman Müdürü", rule: "50.000 – 250.000 ₺ veya Bütçe Dışı", accent: "#B5731A" },
  { tier: "Genel Müdür + CFO", rule: "> 250.000 ₺ (CEO onayı + CFO uyum onayı)", accent: "#4B3FB0" },
  { tier: "BLOKE", rule: "Sıfır bütçe veya aşırı risk → işlem durur", accent: "#C1292E" },
];

// Karar / onay süreci tabloları.
const LINKS: { title: string; sub: string; icon: LucideIcon; view: View }[] = [
  { title: "İş Onay Süreçleri", sub: "T-0045", icon: ClipboardCheck, view: "mod:mod-T-0045" },
  { title: "Karar Kayıt Defteri", sub: "T-0061", icon: Gavel, view: "mod:mod-T-0061" },
  { title: "Risk Yönetimi", sub: "T-0062", icon: ShieldAlert, view: "mod:mod-T-0062" },
  { title: "Toplantı Tutanağı", sub: "T-0063", icon: ClipboardList, view: "mod:mod-T-0063" },
  { title: "Fikir / Öneri Havuzu", sub: "T-0066", icon: Lightbulb, view: "mod:mod-T-0066" },
  { title: "Satın Alma Talep", sub: "T-0024", icon: ShoppingCart, view: "mod:mod-T-0024" },
  { title: "Ödeme Emri", sub: "T-0026", icon: Wallet, view: "mod:mod-T-0026" },
  { title: "Masraf Hareket (Onay)", sub: "T-0010", icon: ReceiptText, view: "mod:mod-T-0010" },
  { title: "Kasa Hareket (Onay)", sub: "T-0007", icon: ArrowLeftRight, view: "mod:mod-T-0007" },
  { title: "Dava & İcra", sub: "T-0016", icon: Scale, view: "mod:mod-T-0016" },
];

// Onay bekleyen kayıtları sezgisel sayan yardımcı.
const BEKLEYEN = /bekliyor|incelemede|onay bekliyor|taslak/i;

export default function KararMerkezi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const bekleyenSay = (id: string, field: string) =>
    (getModule(id)?.records ?? []).filter((r) => BEKLEYEN.test(String((r as Record<string, unknown>)[field] ?? ""))).length;
  const bekleyen = {
    onay: bekleyenSay("mod-T-0045", "durum"),
    satinalma: bekleyenSay("mod-T-0024", "durum"),
    masraf: bekleyenSay("mod-T-0010", "onay_durumu"),
    dava: bekleyenSay("mod-T-0016", "durum"),
  };
  const toplamBekleyen = bekleyen.onay + bekleyen.satinalma + bekleyen.masraf + bekleyen.dava;

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 p-4 py-8 md:p-8">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink">
        <ChevronLeft size={14} /> Yönetim Merkezi
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-blue">İş Akışı</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-ink md:text-3xl"><GitBranch size={24} className="text-neon-blue" /> İş Akış ve Karar Yönetimi</h1>
          <p className="mt-2 text-sm text-muted">Onay hiyerarşisi · karar süreçleri · bekleyen onaylar. İşlemler tutar ve bütçeye göre doğru kademeye yönlendirilir.</p>
        </div>
        <button onClick={() => onNavigate("ajanda")} className="flex items-center gap-2 rounded-lg bg-neon-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
          <NotebookPen size={16} /> Ajanda / Gündem
        </button>
      </header>

      {/* Bekleyen onaylar özeti */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Toplam Bekleyen", value: toplamBekleyen, accent: "#C1292E" },
          { label: "İş Onayı", value: bekleyen.onay, accent: "#B5731A" },
          { label: "Satın Alma", value: bekleyen.satinalma, accent: "#0A4EA2" },
          { label: "Masraf Onayı", value: bekleyen.masraf, accent: "#4B3FB0" },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-2xl font-bold" style={{ color: k.accent }}>{k.value}</p>
            <p className="mt-0.5 text-xs text-muted">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Onay hiyerarşisi */}
      <section className="rounded-2xl border border-line bg-panel/60 p-6">
        <h2 className="text-sm font-semibold text-ink">Workflow Onay Hiyerarşisi</h2>
        <p className="mt-1 text-xs text-muted">İşlem tutarı ve bütçe durumuna göre onay kademesi otomatik belirlenir.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {APPROVAL.map((a) => (
            <div key={a.tier} className="rounded-xl border border-line bg-base/40 p-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: a.accent }}>
                <span className="h-2 w-2 rounded-full" style={{ background: a.accent }} /> {a.tier}
              </span>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{a.rule}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Karar / onay tabloları */}
      <section className="rounded-2xl border border-line bg-panel/60 p-6">
        <h2 className="text-sm font-semibold text-ink">Karar & Onay Süreçleri</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {LINKS.map((f) => {
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
