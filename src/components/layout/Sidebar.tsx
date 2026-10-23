import { useState } from "react";
import { ChevronLeft, Printer, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "@/App";
import { WORKSPACES } from "@/lib/nav";
import { useAllowedWorkspaces } from "@/hooks/useAccess";
import BrandIntro from "@/components/layout/BrandIntro";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeWs: string;
  onSelectWorkspace: (key: string) => void;
  onNavigate: (v: View) => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, activeWs, onSelectWorkspace, onNavigate }: SidebarProps) {
  const allowed = useAllowedWorkspaces();
  const visibleWs = WORKSPACES.filter((w) => allowed.has(w.key));
  const [introOpen, setIntroOpen] = useState(false);
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

        {/* Çalışma alanları */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleWs.map((ws) => (
            <Item key={ws.key} icon={ws.icon} label={ws.label} onClick={() => onSelectWorkspace(ws.key)} active={activeWs === ws.key} />
          ))}
        </nav>

        {/* Alt: Ayarlar + Yazdır + Daralt */}
        <div className="space-y-1 border-t border-white/10 p-3">
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
