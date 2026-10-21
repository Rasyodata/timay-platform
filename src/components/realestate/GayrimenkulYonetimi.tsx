import { useState } from "react";
import { Building2, Home, KeyRound, Tag, FileText, Users, Wallet, TrendingUp, TrendingDown, MapPin, Table2, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import type { View } from "@/App";

const DURUMLAR = ["Boş", "Kirada", "Satışta", "Satıldı", "Bakımda", "Rezerve"];
const DURUM_RENK: Record<string, string> = { "Boş": "#64748B", "Kirada": "#1E7A46", "Satışta": "#B5731A", "Satıldı": "#0A4EA2", "Bakımda": "#C1292E", "Rezerve": "#7C3AED" };
const tl = (n: number) => n.toLocaleString("tr-TR") + " ₺";
const tlK = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + "M ₺" : n.toLocaleString("tr-TR") + " ₺");

export default function GayrimenkulYonetimi({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, updateRecord } = useModules();
  const recs = (id: string) => (getModule(id)?.records ?? []) as Array<Record<string, unknown>>;
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const drop = (d: string) => { if (dragId) updateRecord("mod-T-0072", dragId, { durum: d }); setDragId(null); setOver(null); };

  const portfoy = recs("mod-T-0072");
  const sozlesme = recs("mod-T-0073");
  const gg = recs("mod-T-0075");

  const say = (d: string) => portfoy.filter((p) => String(p.durum) === d).length;
  const aktifSoz = sozlesme.filter((s) => String(s.durum) === "Aktif");
  const aylikKira = aktifSoz.reduce((s, c) => s + (Number(c.aylik_kira) || 0), 0);
  const portfoyDeger = portfoy.filter((p) => String(p.durum) !== "Satıldı").reduce((s, p) => s + (Number(p.satis_bedeli) || 0), 0);
  const gelir = gg.filter((g) => String(g.yon) === "Gelir").reduce((s, g) => s + (Number(g.tutar) || 0), 0);
  const gider = gg.filter((g) => String(g.yon) === "Gider").reduce((s, g) => s + (Number(g.tutar) || 0), 0);

  const KPIS = [
    { icon: Building2, label: "Toplam Portföy", value: String(portfoy.length), accent: "#0A4EA2" },
    { icon: KeyRound, label: "Kirada", value: String(say("Kirada")), accent: "#1E7A46" },
    { icon: Tag, label: "Satışta", value: String(say("Satışta")), accent: "#B5731A" },
    { icon: FileText, label: "Aktif Sözleşme", value: String(aktifSoz.length), accent: "#4B3FB0" },
    { icon: Wallet, label: "Aylık Kira Geliri", value: tlK(aylikKira), accent: "#0d9488" },
  ];

  const MODULLER: { title: string; desc: string; icon: LucideIcon; accent: string; view: View }[] = [
    { title: "Portföy / Daireler", desc: "Envanter · durum · bedel", icon: Building2, accent: "#0A4EA2", view: "mod:mod-T-0072" },
    { title: "Kira Sözleşmeleri", desc: "Kontrat · süre · depozito", icon: FileText, accent: "#4B3FB0", view: "mod:mod-T-0073" },
    { title: "Kiracılar", desc: "Daire sakinleri · iletişim", icon: Users, accent: "#9C2A6B", view: "mod:mod-T-0074" },
    { title: "Gelir-Gider", desc: "Kira/satış · aidat · bakım", icon: Wallet, accent: "#1E7A46", view: "mod:mod-T-0075" },
    { title: "Cari Kartlar", desc: "Alıcı/satıcı cariler", icon: Table2, accent: "#0891B2", view: "mod:mod-T-0077" },
    { title: "Adres Kartları", desc: "Konum bilgileri", icon: MapPin, accent: "#B5731A", view: "mod:mod-T-0003" },
  ];

  return (
    <div className="max-w-[1280px] space-y-6 px-4 py-8 md:px-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-neon-blue/10 text-neon-blue"><Building2 size={24} /></span>
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-ink md:text-3xl">Gayrimenkul Yönetimi <span className="rounded-md border border-line bg-base/60 px-1.5 py-0.5 font-mono text-[11px] font-normal text-muted">Portföy T-0072 · Sözleşme T-0073 · Kiracı T-0074 · Finans T-0075</span></h1>
          <p className="text-sm text-muted">Portföy, kira sözleşmeleri, kiracılar ve finans tek panelde (Open Condo / OpenProperty / Estate MS tarzı).</p>
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => (
          <div key={k.label} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${k.accent}18`, color: k.accent }}><k.icon size={18} /></span>
            <div className="min-w-0"><p className="truncate text-lg font-bold text-ink">{k.value}</p><p className="text-[11px] text-muted">{k.label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Durum dağılımı */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink"><Home size={15} className="text-neon-blue" /> Portföy Durumu</h2>
            <button onClick={() => onNavigate("mod:mod-T-0072")} className="text-[11px] text-neon-blue hover:underline">Tüm portföy →</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {DURUMLAR.map((d) => (
              <button key={d} onClick={() => onNavigate("mod:mod-T-0072")} className="rounded-xl border border-line bg-base/40 p-3 text-left transition hover:border-neon-blue/40">
                <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: DURUM_RENK[d] }}><span className="h-2 w-2 rounded-full" style={{ background: DURUM_RENK[d] }} /> {d}</span>
                <p className="mt-1 text-xl font-bold text-ink">{say(d)}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-base/40 p-3">
            <p className="text-[11px] text-muted">Portföy Değeri (satılmayan)</p>
            <p className="text-xl font-bold text-ink">{tl(portfoyDeger)}</p>
          </div>
        </section>

        {/* Gelir-Gider */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><Wallet size={15} className="text-neon-blue" /> Finans Özeti</h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl bg-good/10 px-3 py-2.5"><span className="flex items-center gap-1.5 text-sm text-good"><TrendingUp size={15} /> Gelir</span><span className="font-mono text-sm font-bold text-good nums">{tl(gelir)}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-critical/10 px-3 py-2.5"><span className="flex items-center gap-1.5 text-sm text-critical"><TrendingDown size={15} /> Gider</span><span className="font-mono text-sm font-bold text-critical nums">{tl(gider)}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5"><span className="text-sm font-semibold text-ink">Net</span><span className="font-mono text-sm font-bold text-ink nums">{tl(gelir - gider)}</span></div>
          </div>
          <button onClick={() => onNavigate("mod:mod-T-0075")} className="mt-3 w-full rounded-lg border border-line py-2 text-xs font-medium text-muted transition hover:text-ink">Gelir-Gider defteri →</button>
        </section>
      </div>

      {/* Portföy Panosu (Kanban) — daireyi sürükle-bırak ile durum değiştir */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink"><Building2 size={15} className="text-neon-blue" /> Portföy Panosu <span className="text-xs font-normal text-muted">· kartı başka kolona sürükleyip bırakarak durumu değiştir</span></h2>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {DURUMLAR.map((d) => {
            const accent = DURUM_RENK[d];
            const cards = portfoy.filter((p) => String(p.durum) === d);
            return (
              <div key={d} onDragOver={(e) => { e.preventDefault(); setOver(d); }} onDragLeave={() => setOver((s) => (s === d ? null : s))} onDrop={() => drop(d)}
                className={`flex w-[260px] shrink-0 flex-col rounded-xl border bg-base/60 transition ${over === d ? "border-neon-blue ring-2 ring-neon-blue/30" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}><span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {d}</span>
                  <span className="rounded-full bg-elevated px-1.5 text-[11px] font-medium text-muted">{cards.length}</span>
                </div>
                <div className="flex min-h-[90px] flex-1 flex-col gap-2 p-2">
                  {cards.map((p) => (
                    <div key={String(p.id)} draggable onDragStart={() => setDragId(String(p.id))} onDragEnd={() => { setDragId(null); setOver(null); }}
                      className={`cursor-grab rounded-lg border border-line bg-panel p-3 shadow-sm transition hover:border-neon-blue/50 active:cursor-grabbing ${dragId === String(p.id) ? "opacity-40" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{String(p.baslik || p.kod || "—")}</span>
                        <span className="shrink-0 font-mono text-[9px] text-faint">{String(p.kod || "")}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">{String(p.tip || "")}{p.sehir ? ` · ${p.sehir}` : ""}{p.bolge ? ` / ${p.bolge}` : ""}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-faint">{p.oda ? `${p.oda} · ` : ""}{p.metrekare ? `${p.metrekare} m²` : ""}</span>
                        <span className="font-mono font-bold text-ink nums">{Number(p.satis_bedeli) ? tlK(Number(p.satis_bedeli)) : Number(p.kira_bedeli) ? tlK(Number(p.kira_bedeli)) + "/ay" : ""}</span>
                      </div>
                      {p.danisman ? <p className="mt-1 text-[10px] text-faint">{String(p.danisman)}</p> : null}
                    </div>
                  ))}
                  {cards.length === 0 && <p className="grid flex-1 place-items-center text-[11px] text-faint">Buraya sürükleyin</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modüller */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Gayrimenkul Modülleri</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {MODULLER.map((t) => (
            <button key={t.title} onClick={() => onNavigate(t.view)} className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-line bg-panel/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-neon-blue/40 hover:shadow-glow-blue">
              <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: `${t.accent}55`, background: `${t.accent}1a`, color: t.accent }}><t.icon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{t.title}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{t.desc}</span>
              </span>
              <ChevronRight size={14} className="absolute right-3 top-3 text-faint opacity-0 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
