import { useState } from "react";
import { ChevronLeft, Printer, Settings, Sparkles, MonitorPlay } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "@/App";
import { WORKSPACES, workspaceForView } from "@/lib/nav";
import { useAllowedWorkspaces, useAccess } from "@/hooks/useAccess";
import BrandIntro from "@/components/layout/BrandIntro";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeWs: string;
  view: View;
  onSelectWorkspace: (key: string) => void;
  onNavigate: (v: View) => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, activeWs, view, onSelectWorkspace, onNavigate }: SidebarProps) {
  const allowed = useAllowedWorkspaces();
  const access = useAccess();
  const visibleWs = WORKSPACES.filter((w) => allowed.has(w.key));
  const [introOpen, setIntroOpen] = useState(false);

  // Platform modu = modül listesi; modül içi = o modülün kategorileri + "Platforma Dön"
  const curKey = workspaceForView(view) ?? activeWs;
  const current = WORKSPACES.find((w) => w.key === curKey);
  const onPlatform = view === "buro-merkezi" || !current;
  const isTabActive = (t: { view: View; match?: (v: View) => boolean }) => (t.match ? t.match(view) : t.view === view);
  const visibleTabs = current ? current.tabs.filter((t) => access.canSeeTab(current.key, String(t.view))) : [];
  const Item = ({ icon: Icon, label, onClick, active, title }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean; title?: string }) => (
    <button
      onClick={onClick}
      title={collapsed ? (title ?? label) : undefined}
      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
        active ? "bg-neon-blue text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={19} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
    </button>
  );

  return (
    <>
      <div
        onClick={onMobileClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col bg-navy-deep transition-[transform,width] duration-300 md:sticky md:top-0 md:z-auto md:translate-x-0 ${
          collapsed ? "md:w-[76px]" : "md:w-60"
        } ${mobileOpen ? "w-60 translate-x-0" : "w-60 -translate-x-full"}`}
      >
        {/* Logo — ana sayfa + köşede parıltı tuşu (animasyonlu giriş ekranı) */}
        <div className="relative flex h-16 items-center border-b border-white/10">
          <button onClick={() => onNavigate("buro-merkezi")} title="Platform ana sayfa" className={`flex h-full flex-1 items-center gap-3 px-5 text-left transition hover:bg-white/5 ${collapsed ? "justify-center px-0" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-violet font-bold text-white shadow-glow-blue">iP</span>
            {!collapsed && <p className="truncate text-sm font-semibold text-white">Timay Platform</p>}
          </button>
          <button
            onClick={() => setIntroOpen(true)}
            title="Timay Platform'u tanı ✨"
            className={`group grid place-items-center rounded-full text-amber-300 transition hover:scale-110 hover:text-amber-200 ${
              collapsed ? "absolute right-1 top-1 h-6 w-6 bg-white/10" : "mr-3 h-8 w-8 bg-white/5 hover:bg-white/15"
            }`}
          >
            <Sparkles size={collapsed ? 12 : 16} className="transition-transform group-hover:rotate-12" />
          </button>
        </div>

        {/* Platform: modül listesi · Modül içi: kategoriler */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {onPlatform ? (
            <>
              {!collapsed && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Modüller</p>}
              {visibleWs.map((ws) => (
                <Item key={ws.key} icon={ws.icon} label={ws.label} onClick={() => onSelectWorkspace(ws.key)} active={activeWs === ws.key && !onPlatform} />
              ))}
            </>
          ) : (
            <>
              {/* Seçili modül başlığı */}
              {current && (
                <div className={`mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-neon-blue/80 to-neon-violet/80 text-white"><current.icon size={16} /></span>
                  {!collapsed && <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{current.label}</span>}
                </div>
              )}
              {!collapsed && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategoriler</p>}
              {visibleTabs.map((t) => (
                <Item key={String(t.view)} icon={t.icon} label={t.label} onClick={() => onNavigate(t.view)} active={isTabActive(t)} />
              ))}
            </>
          )}
        </nav>

        {/* Alt: Ekranı Kapat (canlı komuta merkezi) + Ayarlar + Yazdır + Daralt */}
        <div className="space-y-1 border-t border-white/10 p-3">
          <button
            onClick={() => setIntroOpen(true)}
            title="Ekranı Kapat — canlı komuta merkezi"
            className={`flex w-full items-center gap-2.5 rounded-xl border border-neon-blue/40 bg-gradient-to-r from-neon-blue/15 to-neon-violet/15 px-3 py-2 text-xs font-semibold text-white transition hover:from-neon-blue/25 hover:to-neon-violet/25 ${collapsed ? "justify-center" : ""}`}
          >
            <MonitorPlay size={18} className="shrink-0 text-neon-blue" />
            {!collapsed && <span className="flex-1 truncate text-left">Ekranı Kapat</span>}
          </button>
          {allowed.has("ayarlar") && <Item icon={Settings} label="Ayarlar" onClick={() => onNavigate("record-add")} title="Ayarlar" />}
          <button onClick={() => window.print()} title="Yazdır" className={`no-print flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}>
            <Printer size={18} />{!collapsed && <span>Yazdır</span>}
          </button>
          <button onClick={onToggle} className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white md:flex ${collapsed ? "justify-center" : ""}`}>
            <ChevronLeft size={18} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />{!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>
      <BrandIntro open={introOpen} onClose={() => setIntroOpen(false)} />
    </>
  );
}
