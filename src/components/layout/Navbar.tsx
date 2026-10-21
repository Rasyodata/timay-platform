import { useEffect, useRef, useState } from "react";
import {
  Bell, Check, ChevronDown, LogOut, Menu, Radio, Search, X,
  CalendarCheck2, ListChecks, Inbox, StickyNote, NotebookPen, Users, Folder,
  FolderKanban, ClipboardList, Building2, Table2, FileText, UserPlus, Gauge, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { useUsers } from "@/context/UsersContext";
import { useModules } from "@/context/ModulesContext";
import { useProjects } from "@/context/ProjectsContext";
import { ROLE_LABELS } from "@/types/modules";
import { WORKSPACES } from "@/lib/nav";
import type { View } from "@/App";

interface NavbarProps {
  onMenu: () => void;
  onNavigate: (v: View) => void;
  view: View;
  activeWs: string;
}

const initialsOf = (name: string) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr");

// ── Global arama — tüm modüllerde ara (ajanda, görev, kişi, tutanak, dosya, not, onay) ──
function GlobalSearch({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const { users } = useUsers();
  const { projects } = useProjects();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  // Ctrl+K / ⌘K → global aramaya odaklan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recs = (id: string) => (getModule(id)?.records ?? []) as Array<Record<string, unknown>>;
  const pick = (r: Record<string, unknown>, keys: string[]) => { for (const k of keys) { if (r[k]) return String(r[k]); } return ""; };

  const SRC: { type: string; icon: LucideIcon; view: View; rows: () => { title: string; sub: string }[] }[] = [
    { type: "Kişi", icon: Users, view: "users", rows: () => users.map((u) => ({ title: u.name, sub: `${ROLE_LABELS[u.role]} · ${u.department}` })) },
    { type: "Proje", icon: FolderKanban, view: "projects", rows: () => projects.map((p) => ({ title: p.name, sub: p.code })) },
    { type: "Görev", icon: ListChecks, view: "gorev-yonetimi", rows: () => recs("mod-T-0056").map((r) => ({ title: pick(r, ["baslik", "ad", "gorev", "konu"]), sub: pick(r, ["durum"]) })) },
    { type: "Ajanda", icon: CalendarCheck2, view: "ajandam", rows: () => [...recs("mod-T-0057"), ...recs("mod-T-0060")].map((r) => ({ title: pick(r, ["baslik", "ad"]), sub: pick(r, ["tarih"]) })) },
    { type: "Talep", icon: ClipboardList, view: "talepler", rows: () => recs("mod-T-0076").map((r) => ({ title: pick(r, ["konu"]), sub: `${pick(r, ["talep_turu"])} · ${pick(r, ["durum"])}` })) },
    { type: "Onay", icon: Inbox, view: "onaylar", rows: () => recs("mod-T-0045").map((r) => ({ title: pick(r, ["konu"]), sub: pick(r, ["durum"]) })) },
    { type: "Tutanak", icon: NotebookPen, view: "tutanak", rows: () => recs("mod-T-0063").map((r) => ({ title: pick(r, ["toplanti", "baslik"]), sub: pick(r, ["tutanak_no"]) })) },
    { type: "Not", icon: StickyNote, view: "notlar", rows: () => recs("mod-T-0068").map((r) => ({ title: pick(r, ["baslik"]), sub: pick(r, ["etiket"]) })) },
    { type: "Dosya", icon: Folder, view: "dosya-kutuphanesi", rows: () => recs("mod-T-0067").map((r) => ({ title: pick(r, ["ad", "baslik"]), sub: pick(r, ["tur", "sinif"]) })) },
    { type: "Portföy", icon: Building2, view: "mod:mod-T-0072", rows: () => recs("mod-T-0072").map((r) => ({ title: pick(r, ["baslik", "kod"]), sub: `${pick(r, ["tip"])} · ${pick(r, ["durum"])}` })) },
    { type: "Sözleşme", icon: FileText, view: "mod:mod-T-0073", rows: () => recs("mod-T-0073").map((r) => ({ title: pick(r, ["sozlesme_no", "daire"]), sub: pick(r, ["kiraci"]) })) },
    { type: "Kiracı", icon: Users, view: "mod:mod-T-0074", rows: () => recs("mod-T-0074").map((r) => ({ title: pick(r, ["ad"]), sub: pick(r, ["daire"]) })) },
    { type: "Cari", icon: Table2, view: "mod:mod-T-0077", rows: () => recs("mod-T-0077").map((r) => ({ title: pick(r, ["ad", "unvan"]), sub: pick(r, ["tur", "sehir"]) })) },
    { type: "Aday", icon: UserPlus, view: "mod:mod-T-0069", rows: () => recs("mod-T-0069").map((r) => ({ title: pick(r, ["aday"]), sub: `${pick(r, ["pozisyon"])} · ${pick(r, ["asama"])}` })) },
    { type: "Bordro", icon: Wallet, view: "mod:mod-T-0071", rows: () => recs("mod-T-0071").map((r) => ({ title: pick(r, ["personel"]), sub: `Bordro ${pick(r, ["donem"])}` })) },
    { type: "Performans", icon: Gauge, view: "mod:mod-T-0070", rows: () => recs("mod-T-0070").map((r) => ({ title: pick(r, ["personel"]), sub: `Performans ${pick(r, ["donem"])}` })) },
  ];

  const qn = q.trim().toLocaleLowerCase("tr");
  const results: { type: string; icon: LucideIcon; view: View; title: string; sub: string }[] = [];
  if (qn) {
    for (const s of SRC) {
      const matched = s.rows().filter((it) => it.title && (it.title + " " + it.sub).toLocaleLowerCase("tr").includes(qn)).slice(0, 4);
      matched.forEach((it) => results.push({ type: s.type, icon: s.icon, view: s.view, title: it.title, sub: it.sub }));
    }
  }
  const go = (v: View) => { onNavigate(v); setQ(""); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Tüm platformda ara…"
        className="w-40 rounded-xl border border-line bg-panel py-2 pl-9 pr-14 text-sm text-ink placeholder:text-faint outline-none transition focus:w-64 md:w-56 md:focus:w-72 focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/40"
      />
      {q ? (
        <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">⌘K</kbd>
      )}
      {open && q && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-2xl border border-line bg-panel p-1.5 shadow-card animate-fade-in">
          <p className="px-2 py-1.5 text-[11px] text-faint">{results.length} sonuç</p>
          {results.map((r, i) => (
            <button key={i} onClick={() => go(r.view)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-elevated">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neon-blue/10 text-neon-blue"><r.icon size={15} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{r.title}</span>
                {r.sub && <span className="block truncate text-[11px] text-muted">{r.sub}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted">{r.type}</span>
            </button>
          ))}
          {results.length === 0 && <p className="px-2 py-6 text-center text-xs text-faint">Eşleşen kayıt yok.</p>}
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { logout } = useAuth();
  const { users, currentUser, setCurrentUser } = useUsers();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const handleLogout = () => { setOpen(false); logout(); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border bg-panel py-1.5 pl-1.5 pr-2 transition sm:pr-3 ${
          open ? "border-neon-blue/50 bg-elevated" : "border-line hover:bg-elevated"
        }`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-blue text-xs font-semibold text-white">
          {initialsOf(currentUser.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-medium leading-tight text-ink">{currentUser.name}</span>
          <span className="block text-[10px] leading-tight text-muted">{ROLE_LABELS[currentUser.role]}</span>
        </span>
        <ChevronDown size={15} className={`hidden text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-panel shadow-card animate-fade-in">
          <div className="flex items-center gap-3 border-b border-line p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-blue text-sm font-semibold text-white">
              {initialsOf(currentUser.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{currentUser.name}</p>
              <p className="truncate text-xs text-muted">{currentUser.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">Kullanıcı olarak görüntüle</p>
            <div className="max-h-56 overflow-y-auto">
              {users.map((u) => {
                const active = u.id === currentUser.id;
                return (
                  <button key={u.id} role="menuitem" onClick={() => { setCurrentUser(u.id); setOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-elevated ${active ? "bg-elevated" : ""}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5 text-[10px] font-semibold text-muted">{initialsOf(u.name)}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-ink">{u.name}</span>
                      <span className="block text-[10px] text-muted">{ROLE_LABELS[u.role]} · {u.department}</span>
                    </span>
                    {active && <Check size={14} className="text-neon-emerald" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-line p-1.5">
            <button role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-critical transition hover:bg-critical/10">
              <LogOut size={16} /> Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Döküman arama — Döküman Yönetimi üst barında (Dosya Kütüphanesi + Wiki)
function DocSearch({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { getModule } = useModules();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const recs = (id: string) => (getModule(id)?.records ?? []) as Array<Record<string, unknown>>;
  const low = (s: string) => s.toLocaleLowerCase("tr");
  const qn = low(q.trim());
  const results = qn ? [
    ...recs("mod-T-0067").filter((r) => [r.ad, r.etiketler, r.ocr_metni, r.aciklama, r.sinif].some((v) => low(String(v ?? "")).includes(qn))).slice(0, 6).map((r) => ({ title: String(r.ad), sub: [r.tur, r.sinif].filter(Boolean).join(" · "), view: "dosya-kutuphanesi" as View, kat: "Dosya" })),
    ...recs("mod-T-0064").filter((r) => [r.baslik, r.etiketler, r.icerik, r.kategori].some((v) => low(String(v ?? "")).includes(qn))).slice(0, 6).map((r) => ({ title: String(r.baslik), sub: String(r.kategori ?? ""), view: "dokumanlar" as View, kat: "Doküman" })),
  ] : [];
  const go = (v: View) => { onNavigate(v); setQ(""); setOpen(false); };
  return (
    <div className="relative ml-2 hidden md:block" ref={ref}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Döküman ara… (ad, etiket, OCR)" className="w-56 rounded-lg border border-line bg-panel py-1.5 pl-9 pr-8 text-sm text-ink outline-none transition focus:w-72 focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20" />
      {q && <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={14} /></button>}
      {open && q && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-80 w-80 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-card animate-fade-in">
          <p className="px-2 py-1 text-[10px] text-faint">{results.length} sonuç</p>
          {results.map((r, i) => (
            <button key={i} onClick={() => go(r.view)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-elevated">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-neon-blue/10 text-neon-blue"><Folder size={13} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{r.title}</span>{r.sub && <span className="block truncate text-[11px] text-muted">{r.sub}</span>}</span>
              <span className="shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-muted">{r.kat}</span>
            </button>
          ))}
          {results.length === 0 && <p className="px-2 py-4 text-center text-xs text-faint">Eşleşen döküman yok.</p>}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onMenu, onNavigate, view, activeWs }: NavbarProps) {
  const { live, toggleLive } = useDashboard();
  const { getModule } = useModules();

  const openTasks = (getModule("mod-T-0056")?.records ?? []).filter((r) => String((r as Record<string, unknown>).durum) !== "Tamamlandı").length;
  const pendingAppr = (getModule("mod-T-0045")?.records ?? []).filter((r) => /bekliyor|incelemede/i.test(String((r as Record<string, unknown>).durum ?? ""))).length;
  const badgeFor = (v: View): number | undefined => (v === "gorev-yonetimi" ? openTasks : v === "onaylar" ? pendingAppr : undefined);

  const ws = WORKSPACES.find((w) => w.key === activeWs) ?? WORKSPACES[0];
  const TABS = ws.tabs.map((t) => ({ icon: t.icon, label: t.label, view: t.view, kod: t.kod, badge: badgeFor(t.view), active: t.match ? t.match(view) : t.view === view }));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-base/80 px-4 backdrop-blur-xl md:px-6">
      <button onClick={onMenu} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:bg-elevated hover:text-ink md:hidden" aria-label="Menü">
        <Menu size={18} />
      </button>

      {/* Ana gezinme sekmeleri (üst bar) */}
      <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => onNavigate(t.view)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              t.active ? "bg-neon-blue/15 text-ink shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]" : "text-muted hover:bg-elevated hover:text-ink"
            }`}
          >
            <t.icon size={15} />
            <span className="whitespace-nowrap">{t.label}</span>
            {t.kod && <span className="rounded border border-line bg-base/60 px-1 font-mono text-[9px] leading-tight text-faint">{t.kod}</span>}
            {t.badge != null && t.badge > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "#C1292E" }}>{t.badge}</span>
            )}
          </button>
        ))}
        {activeWs === "dosya" && <DocSearch onNavigate={onNavigate} />}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden md:block"><GlobalSearch onNavigate={onNavigate} /></div>

        <button onClick={toggleLive} className={`chip transition ${live ? "border-good/40 bg-good/10 text-good" : "border-line bg-panel text-muted hover:text-ink"}`}>
          <Radio size={14} className={live ? "animate-pulse-dot" : ""} />
          {live ? "Canlı" : "Duraklatıldı"}
        </button>

        <button className="relative grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:bg-elevated hover:text-ink" aria-label="Bildirimler">
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neon-rose ring-2 ring-base" />
        </button>

        <ProfileMenu />
      </div>
    </header>
  );
}
