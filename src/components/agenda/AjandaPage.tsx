import { useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, LayoutGrid, Table2, CalendarDays, GanttChart, Plus, X, Trash2, Flag, Smartphone, RefreshCw } from "lucide-react";
import { useModules } from "@/context/ModulesContext";
import ProjectTableCard, { RecordForm } from "@/components/projects/ProjectTableCard";
import type { DynamicRecord, DynamicModule } from "@/types/modules";
import type { View } from "@/App";

const MOD = "mod-T-0057";
const MILE = "mod-T-0058";
const SPRINT = "mod-T-0059";

const STAGE_ACCENT: Record<string, string> = {
  "Yapılacak": "#8795A8", "Devam Ediyor": "#0A4EA2", "Beklemede": "#B5731A", "Tamamlandı": "#1E7A46",
};
const KAT_ACCENT: Record<string, string> = {
  "İş": "#0A4EA2", "Kişisel": "#4B3FB0", "Toplantı": "#0d9488", "Hatırlatma": "#B5731A", "Acil": "#C1292E", "Çağrı / Takip": "#9C2A6B",
};
const ONCELIK_ACCENT: Record<string, string> = { "Düşük": "#8795A8", "Orta": "#0A4EA2", "Yüksek": "#B5731A", "Acil": "#C1292E" };
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
const initials = (s: string) => s.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const TR_AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUN = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function AjandaPage({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule, updateRecord, deleteRecord } = useModules();
  const mod = getModule(MOD);
  const mile = getModule(MILE);
  const sprintMod = getModule(SPRINT);
  const [view, setView] = useState<"pano" | "takvim" | "yol" | "tablo">("pano");
  const [modal, setModal] = useState<{ mod: DynamicModule; rec: DynamicRecord | "new"; defaults?: Record<string, unknown> } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sprintFilter, setSprintFilter] = useState("");
  const [cal, setCal] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [calView, setCalView] = useState<"ay" | "hafta" | "liste">("ay");
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); d.setHours(0, 0, 0, 0); return d.getTime(); });

  if (!mod) return <div className="card p-5 text-sm text-muted">Ajanda tablosu bulunamadı.</div>;
  const stages = (mod.fields.find((f) => f.code === "durum")?.options ?? []) as string[];
  const allRecords = mod.records as DynamicRecord[];
  const records = sprintFilter ? allRecords.filter((r) => String(r.sprint ?? "") === sprintFilter) : allRecords;
  const byStage = (st: string) => records.filter((r) => String(r.durum ?? "") === st);
  const milestones = (mile?.records ?? []) as DynamicRecord[];
  const sprints = (sprintMod?.records ?? []) as DynamicRecord[];

  // ── Birleşik takvim: Ajanda (T-0057) + Etkinlikler (T-0060) ──
  const eventMod = getModule("mod-T-0060");
  const events = (eventMod?.records ?? []) as DynamicRecord[];
  const RENK: Record<string, string> = { Mavi: "#0A4EA2", Yeşil: "#1E7A46", Turuncu: "#B5731A", Kırmızı: "#C1292E", Mor: "#4B3FB0", Gri: "#8795A8" };
  type CalEntry = { key: string; baslik: string; start: string; end: string; time: string; color: string; src: "ajanda" | "etkinlik"; mod: DynamicModule; rec: DynamicRecord };
  const calEntries: CalEntry[] = [
    ...records.filter((r) => r.tarih).map((r) => ({ key: "a" + String(r.id), baslik: String(r.baslik), start: String(r.tarih), end: String(r.bitis || r.tarih), time: String(r.saat || ""), color: STAGE_ACCENT[String(r.durum)] || "#0A4EA2", src: "ajanda" as const, mod, rec: r })),
    ...(eventMod ? events.filter((r) => r.tarih).map((r) => ({ key: "e" + String(r.id), baslik: String(r.baslik), start: String(r.tarih), end: String(r.bitis || r.tarih), time: String(r.baslangic_saat || ""), color: RENK[String(r.renk)] || "#0d9488", src: "etkinlik" as const, mod: eventMod, rec: r })) : []),
  ];
  const entriesOn = (s: string) => calEntries.filter((e) => s >= e.start && s <= e.end).sort((a, b) => a.time.localeCompare(b.time));
  const openEdit = (m: DynamicModule, r: DynamicRecord) => setModal({ mod: m, rec: r });

  // Aktif sprint özeti (burn-down).
  const aktif = sprints.find((s) => String(s.durum) === "Aktif");
  const aktifItems = aktif ? allRecords.filter((r) => String(r.sprint ?? "") === String(aktif.ad)) : [];
  const aktifDone = aktifItems.filter((r) => String(r.durum) === "Tamamlandı").length;
  const aktifPct = aktifItems.length ? Math.round((aktifDone / aktifItems.length) * 100) : 0;
  const gunKalan = aktif?.bitis ? Math.max(0, Math.ceil((new Date(String(aktif.bitis)).getTime() - new Date().getTime()) / 86400000)) : null;

  const smsBekleyen = records.filter((r) => r.sms_hatirlatma === true && String(r.durum) !== "Tamamlandı");
  const sendSms = () => {
    const tekil = new Set(smsBekleyen.map((r) => String(r.telefon || "")).filter(Boolean)).size;
    setNote(`${smsBekleyen.length} madde için ${tekil || smsBekleyen.length} numaraya SMS hatırlatması gönderildi ✓ (simülasyon — canlıda SMS ağ geçidiyle otomatik).`);
  };
  const drop = (st: string) => { if (dragId) updateRecord(MOD, dragId, { durum: st }); setDragId(null); setOver(null); };

  // Takvim ızgarası.
  const firstDow = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const dayStr = (d: number) => `${cal.y}-${pad(cal.m + 1)}-${pad(d)}`;
  const td = new Date(); const todayStr = `${td.getFullYear()}-${pad(td.getMonth() + 1)}-${pad(td.getDate())}`;
  const prevMonth = () => setCal((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const nextMonth = () => setCal((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  // ── Hafta / Liste (FullCalendar tarzı) ──
  const ONE_D = 86400000;
  const openNew = (date?: string) => setModal({ mod, rec: "new", defaults: date ? { tarih: date } : undefined });
  const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * ONE_D));
  const listGroups = (() => { const m: Record<string, CalEntry[]> = {}; calEntries.forEach((e) => { (m[e.start] = m[e.start] || []).push(e); }); return Object.keys(m).sort().map((k) => ({ date: k, items: m[k].sort((a, b) => a.time.localeCompare(b.time)) })); })();
  const CalBtn = ({ v, label }: { v: typeof calView; label: string }) => (
    <button onClick={() => setCalView(v)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${calView === v ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}>{label}</button>
  );

  // ── Gantt / Yol Haritası ──
  const parseD = (s: string) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y || 2026, (m || 1) - 1, d || 1).getTime(); };
  const ONE = 86400000;
  const ganttItems = records.filter((r) => r.tarih);
  const ganttSprints = sprints.filter((s) => s.baslangic && s.bitis);
  const ganttMiles = milestones.filter((m) => m.bitis_tarihi);
  const nowTs = new Date().getTime();
  const allTs: number[] = [nowTs];
  ganttSprints.forEach((s) => { allTs.push(parseD(String(s.baslangic)), parseD(String(s.bitis))); });
  ganttMiles.forEach((m) => allTs.push(parseD(String(m.bitis_tarihi))));
  ganttItems.forEach((r) => { allTs.push(parseD(String(r.tarih))); if (r.bitis) allTs.push(parseD(String(r.bitis))); });
  const wStart = Math.min(...allTs) - 3 * ONE;
  const wEnd = Math.max(...allTs) + 3 * ONE;
  const wTot = Math.max(ONE, wEnd - wStart);
  const pct = (t: number) => ((t - wStart) / wTot) * 100;
  const barStyle = (s: number, e: number) => ({ left: `${pct(s)}%`, width: `${Math.max(1.5, pct(e + ONE) - pct(s))}%` });
  const months: { label: string; left: number }[] = [];
  { const md = new Date(wStart); md.setDate(1); for (let i = 0; i < 24; i++) { const t = md.getTime(); if (t > wEnd) break; if (t >= wStart) months.push({ label: `${TR_AY[md.getMonth()]} ${md.getFullYear()}`, left: pct(t) }); md.setMonth(md.getMonth() + 1); } }
  const SPRINT_ACCENT: Record<string, string> = { "Aktif": "#1E7A46", "Planlandı": "#8795A8", "Tamamlandı": "#0A4EA2", "İptal": "#C1292E" };

  const Btn = ({ v, icon: Icon, label }: { v: typeof view; icon: typeof LayoutGrid; label: string }) => (
    <button onClick={() => setView(v)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${view === v ? "bg-neon-blue text-white" : "text-muted hover:bg-elevated"}`}><Icon size={14} /> {label}</button>
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
      <button onClick={() => onNavigate("buro-merkezi")} className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"><ChevronLeft size={14} /> İş Akış ve Karar Yönetimi</button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink"><NotebookPen size={22} className="text-neon-blue" /> Ajanda / Gündem</h1>
          <p className="mt-1 text-sm text-muted">Plane/GitHub Projects tarzı: Kanban · Takvim · Sprint (döngü) · kilometre taşları · tablo.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line">
            <Btn v="pano" icon={LayoutGrid} label="Pano" />
            <Btn v="takvim" icon={CalendarDays} label="Takvim" />
            <Btn v="yol" icon={GanttChart} label="Yol Haritası" />
            <Btn v="tablo" icon={Table2} label="Tablo" />
          </div>
          <button onClick={sendSms} disabled={smsBekleyen.length === 0} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${smsBekleyen.length ? "border border-neon-blue/40 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20" : "cursor-not-allowed border border-line text-faint"}`}><Smartphone size={15} /> SMS{smsBekleyen.length ? ` (${smsBekleyen.length})` : ""}</button>
          <button onClick={() => openNew()} className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"><Plus size={15} /> Madde Ekle</button>
        </div>
      </header>

      {note && <div className="rounded-xl border border-good/30 bg-good/10 px-3 py-2 text-xs text-good">{note}</div>}

      {/* Sprint filtresi + aktif sprint burn-down */}
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setSprintFilter("")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!sprintFilter ? "bg-neon-blue/15 text-neon-blue ring-1 ring-neon-blue/40" : "border border-line text-muted hover:text-ink"}`}>Tümü</button>
          {sprints.map((s) => (
            <button key={s.id} onClick={() => setSprintFilter(String(s.ad))} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${sprintFilter === String(s.ad) ? "bg-neon-blue/15 text-neon-blue ring-1 ring-neon-blue/40" : "border border-line text-muted hover:text-ink"}`}>
              <RefreshCw size={11} /> {String(s.ad)}
              {String(s.durum) === "Aktif" && <span className="rounded-full bg-good/15 px-1.5 text-[10px] text-good">Aktif</span>}
            </button>
          ))}
          <button onClick={() => onNavigate("mod:mod-T-0059")} className="rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-ink">Sprintleri Yönet</button>
        </div>
        {aktif && (
          <div className="flex-1 min-w-[260px] rounded-xl border border-line bg-panel/60 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">⚡ {String(aktif.ad)}</span>
              <span className="text-muted">{dmy(String(aktif.baslangic))} – {dmy(String(aktif.bitis))}{gunKalan != null ? ` · ${gunKalan} gün kaldı` : ""}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-good" style={{ width: `${aktifPct}%` }} /></div>
            <p className="mt-1 text-[11px] text-muted">{aktifDone}/{aktifItems.length} madde tamamlandı · %{aktifPct}</p>
          </div>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (view === "pano" || view === "takvim") && (
        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink"><Flag size={15} className="text-neon-blue" /> Kilometre Taşları (Hedefler)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((m) => {
              const pct = Math.min(100, Math.max(0, Number(m.ilerleme) || 0));
              return (
                <button key={m.id} onClick={() => onNavigate("mod:mod-T-0058")} className="rounded-xl border border-line bg-base/40 p-3 text-left transition hover:border-neon-blue/40">
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-ink">{String(m.ad)}</span><span className="text-[11px] text-muted">{dmy(String(m.bitis_tarihi))}</span></div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated"><div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-[11px] text-muted">%{pct} · {String(m.durum)}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === "tablo" && <ProjectTableCard moduleId={MOD} />}

      {view === "pano" && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {stages.map((st) => {
            const accent = STAGE_ACCENT[st] ?? "#0A4EA2";
            const cards = byStage(st);
            return (
              <div key={st} onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver((s) => (s === st ? null : s))} onDrop={() => drop(st)}
                className={`flex w-[280px] shrink-0 flex-col rounded-xl border bg-base/60 transition ${over === st ? "border-neon-blue ring-2 ring-neon-blue/30" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink"><span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {st}</span>
                  <span className="rounded-full bg-elevated px-1.5 text-[11px] font-medium text-muted">{cards.length}</span>
                </div>
                <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
                  {cards.map((r) => <AjandaCard key={r.id} r={r} dragId={dragId} onDragStart={() => setDragId(String(r.id))} onDragEnd={() => { setDragId(null); setOver(null); }} onClick={() => openEdit(mod, r)} />)}
                  {cards.length === 0 && <p className="grid flex-1 place-items-center text-[11px] text-faint">Buraya sürükleyin</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "takvim" && (
        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {calView === "ay" ? `${TR_AY[cal.m]} ${cal.y}` : calView === "hafta" ? `${dmy(dstr(weekDays[0]))} – ${dmy(dstr(weekDays[6]))}` : "Yaklaşan Etkinlikler"}
              </h2>
              <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5"><CalBtn v="ay" label="Ay" /><CalBtn v="hafta" label="Hafta" /><CalBtn v="liste" label="Liste" /></div>
            </div>
            {calView !== "liste" && (
              <div className="flex items-center gap-1">
                <button onClick={calView === "ay" ? prevMonth : () => setWeekStart((w) => w - 7 * ONE_D)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated"><ChevronLeft size={15} /></button>
                <button onClick={() => { const d = new Date(); setCal({ y: d.getFullYear(), m: d.getMonth() }); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); d.setHours(0, 0, 0, 0); setWeekStart(d.getTime()); }} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:bg-elevated">Bugün</button>
                <button onClick={calView === "ay" ? nextMonth : () => setWeekStart((w) => w + 7 * ONE_D)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated"><ChevronRight size={15} /></button>
              </div>
            )}
          </div>

          {calView === "ay" && (
            <div className="grid grid-cols-7 gap-1">
              {TR_GUN.map((g) => <div key={g} className="px-1 py-1 text-center text-[11px] font-medium text-muted">{g}</div>)}
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="min-h-[92px] rounded-lg bg-base/30" />;
                const items = entriesOn(dayStr(d));
                const isToday = dayStr(d) === todayStr;
                return (
                  <div key={i} onClick={() => openNew(dayStr(d))} className={`group min-h-[92px] cursor-pointer rounded-lg border p-1 transition hover:border-neon-blue/50 ${isToday ? "border-neon-blue bg-neon-blue/5" : "border-line bg-base/40"}`}>
                    <div className={`mb-1 flex items-center justify-between text-[11px] ${isToday ? "font-bold text-neon-blue" : "text-muted"}`}><span className="opacity-0 transition group-hover:opacity-100"><Plus size={11} /></span><span>{d}</span></div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((e) => (
                        <button key={e.key} onClick={(ev) => { ev.stopPropagation(); openEdit(e.mod, e.rec); }} className="flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium" style={{ background: `${e.color}18`, color: e.color }} title={`${e.src === "etkinlik" ? "📅 " : ""}${e.baslik}`}>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} /><span className="truncate">{e.time ? `${e.time} ` : ""}{e.baslik}</span>
                        </button>
                      ))}
                      {items.length > 3 && <p className="px-1 text-[10px] text-faint">+{items.length - 3} daha</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calView === "hafta" && (
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d, i) => {
                const s = dstr(d); const isToday = s === todayStr; const items = entriesOn(s);
                return (
                  <div key={i} onClick={() => openNew(s)} className={`group min-h-[260px] cursor-pointer rounded-lg border p-1.5 transition hover:border-neon-blue/50 ${isToday ? "border-neon-blue bg-neon-blue/5" : "border-line bg-base/40"}`}>
                    <div className={`mb-2 text-center text-[11px] ${isToday ? "font-bold text-neon-blue" : "text-muted"}`}>{TR_GUN[i]} {d.getDate()}</div>
                    <div className="space-y-1">
                      {items.map((e) => (
                        <button key={e.key} onClick={(ev) => { ev.stopPropagation(); openEdit(e.mod, e.rec); }} className="block w-full rounded px-1.5 py-1 text-left text-[10px] font-medium" style={{ background: `${e.color}18`, color: e.color }} title={e.baslik}>{e.time ? <span className="block opacity-70">{e.time}</span> : null}<span className="line-clamp-2">{e.src === "etkinlik" ? "📅 " : ""}{e.baslik}</span></button>
                      ))}
                      {items.length === 0 && <p className="text-center text-[10px] text-faint opacity-0 transition group-hover:opacity-100">+ ekle</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calView === "liste" && (
            <div className="space-y-3">
              {listGroups.length === 0 && <p className="py-6 text-center text-sm text-muted">Tarihli madde yok.</p>}
              {listGroups.map((g) => (
                <div key={g.date} className="flex gap-3">
                  <div className={`w-28 shrink-0 pt-1 text-xs font-semibold ${g.date === todayStr ? "text-neon-blue" : "text-muted"}`}>{dmy(g.date)}{g.date === todayStr ? " · Bugün" : ""}</div>
                  <div className="flex-1 space-y-1">
                    {g.items.map((e) => (
                      <button key={e.key} onClick={() => openEdit(e.mod, e.rec)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-base/40 px-3 py-2 text-left transition hover:border-neon-blue/40">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
                        {e.time ? <span className="w-12 shrink-0 text-xs text-muted nums">{e.time}</span> : <span className="w-12 shrink-0" />}
                        <span className="flex-1 truncate text-sm text-ink">{e.baslik}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${e.color}14`, color: e.color }}>{e.src === "etkinlik" ? "Etkinlik" : "Ajanda"}</span>
                        <span className="text-[11px] text-faint">{String(e.rec.durum ?? "")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "yol" && (
        <section className="card overflow-x-auto p-4">
          <div className="min-w-[860px]">
            {/* Ay ekseni */}
            <div className="flex">
              <div className="w-44 shrink-0" />
              <div className="relative h-5 flex-1">
                {months.map((m) => <span key={m.label} className="absolute whitespace-nowrap text-[10px] text-faint" style={{ left: `${m.left}%` }}>{m.label}</span>)}
              </div>
            </div>

            <div className="relative">
              {/* Ay çizgileri + bugün çizgisi (sadece zaman şeridi üzerine) */}
              <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: "11rem" }}>
                <div className="relative h-full">
                  {months.map((m) => <div key={m.label} className="absolute inset-y-0 w-px bg-line" style={{ left: `${m.left}%` }} />)}
                  <div className="absolute inset-y-0 w-0.5 bg-neon-blue/60" style={{ left: `${pct(nowTs)}%` }} title="Bugün" />
                </div>
              </div>

              {/* Sprintler */}
              <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Sprintler</p>
              {ganttSprints.map((s) => {
                const acc = SPRINT_ACCENT[String(s.durum)] ?? "#0A4EA2";
                return (
                  <div key={s.id} className="flex items-center">
                    <div className="w-44 shrink-0 truncate pr-2 text-xs text-ink">{String(s.ad)}</div>
                    <div className="relative h-8 flex-1">
                      <div className="absolute top-1.5 flex h-5 items-center overflow-hidden rounded-md px-1.5" style={{ ...barStyle(parseD(String(s.baslangic)), parseD(String(s.bitis))), background: acc }}>
                        <span className="truncate text-[10px] font-medium text-white">{String(s.durum)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Hedefler (Milestones) — işaretçi */}
              <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Hedefler (Milestones)</p>
              {ganttMiles.map((m) => (
                <div key={m.id} className="flex items-center">
                  <div className="w-44 shrink-0 truncate pr-2 text-xs text-ink">{String(m.ad)}</div>
                  <div className="relative h-7 flex-1">
                    <div className="absolute top-1 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(parseD(String(m.bitis_tarihi)))}%` }}>
                      <span className="inline-flex items-center gap-1 rounded-md bg-neon-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-neon-blue"><Flag size={9} /> {dmy(String(m.bitis_tarihi))}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Maddeler */}
              <p className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Maddeler{sprintFilter ? ` · ${sprintFilter}` : ""}</p>
              {ganttItems.map((r) => {
                const acc = STAGE_ACCENT[String(r.durum)] ?? "#0A4EA2";
                const s = parseD(String(r.tarih));
                const e = r.bitis ? parseD(String(r.bitis)) : s;
                return (
                  <div key={r.id} className="flex items-center">
                    <div className="w-44 shrink-0 truncate pr-2 text-xs text-ink" title={String(r.baslik)}>{String(r.baslik)}</div>
                    <div className="relative h-8 flex-1">
                      <button onClick={() => openEdit(mod, r)} className="absolute top-1.5 flex h-5 items-center overflow-hidden rounded-md px-1.5 transition hover:brightness-110" style={{ ...barStyle(s, e), background: acc }}>
                        <span className="truncate text-[10px] font-medium text-white">{String(r.durum)}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {ganttItems.length === 0 && <p className="py-4 text-center text-xs text-muted">Tarihli madde yok.</p>}
            </div>
          </div>
        </section>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-sm font-semibold text-ink">{modal.rec === "new" ? (modal.mod.id === MOD ? "Yeni Ajanda Maddesi" : `Yeni ${modal.mod.name.split(" ")[0]}`) : String((modal.rec as DynamicRecord).baslik ?? "Kayıt")}</h3>
              <div className="flex items-center gap-1">
                {modal.rec !== "new" && <button onClick={() => { deleteRecord(modal.mod.id, String((modal.rec as DynamicRecord).id)); setModal(null); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-critical/10 hover:text-critical"><Trash2 size={15} /></button>}
                <button onClick={() => setModal(null)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-elevated"><X size={16} /></button>
              </div>
            </div>
            <div className="p-4"><RecordForm mod={modal.mod} initial={modal.rec === "new" ? undefined : modal.rec} defaults={modal.rec === "new" ? modal.defaults : undefined} onClose={() => setModal(null)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AjandaCard({ r, dragId, onDragStart, onDragEnd, onClick }: { r: DynamicRecord; dragId: string | null; onDragStart: () => void; onDragEnd: () => void; onClick: () => void }) {
  const kat = KAT_ACCENT[String(r.kategori)] ?? "#8795A8";
  const onc = ONCELIK_ACCENT[String(r.oncelik)] ?? "#8795A8";
  return (
    <button draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={`rounded-lg border border-line bg-panel p-3 text-left shadow-sm transition hover:border-neon-blue/50 ${dragId === String(r.id) ? "opacity-40" : ""}`}>
      <span className="text-sm font-semibold leading-tight text-ink">{String(r.baslik ?? "—")}</span>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {r.kategori ? <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${kat}14`, color: kat }}>{String(r.kategori)}</span> : null}
        {r.oncelik ? <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${onc}14`, color: onc }}>{String(r.oncelik)}</span> : null}
        {r.sms_hatirlatma === true ? <span className="inline-flex items-center gap-0.5 rounded bg-neon-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-neon-blue"><Smartphone size={9} /> SMS</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>{r.tarih ? dmy(String(r.tarih)) : ""}{r.saat ? ` ${String(r.saat)}` : ""}</span>
        {r.sorumlu ? <span className="grid h-6 w-6 place-items-center rounded-full bg-neon-blue/10 text-[10px] font-semibold text-neon-blue" title={String(r.sorumlu)}>{initials(String(r.sorumlu))}</span> : null}
      </div>
      {r.milestone ? <p className="mt-1 flex items-center gap-1 text-[10px] text-faint"><Flag size={9} /> {String(r.milestone)}</p> : null}
    </button>
  );
}
