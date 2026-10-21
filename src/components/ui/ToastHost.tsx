import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type { Toast } from "@/context/DashboardContext";

const toneMeta: Record<Toast["tone"], { icon: LucideIcon; ring: string; accent: string }> = {
  success: { icon: CheckCircle2, ring: "border-good/40", accent: "text-good" },
  info: { icon: Info, ring: "border-neon-blue/40", accent: "text-neon-blue" },
  warning: { icon: TriangleAlert, ring: "border-warning/40", accent: "text-warning" },
};

/** Fixed bottom-right toast stack. Auto-dismisses; also dismissable by click. */
export default function ToastHost() {
  const { toasts, dismissToast } = useDashboard();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => {
        const m = toneMeta[t.tone];
        const Icon = m.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-elevated/95 p-3 shadow-card backdrop-blur animate-fade-in ${m.ring}`}
            role="status"
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${m.accent}`} />
            <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded-md p-0.5 text-muted transition hover:text-ink"
              aria-label="Kapat"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
