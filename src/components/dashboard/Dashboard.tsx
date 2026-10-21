import { useDashboard } from "@/context/DashboardContext";
import GenelOzet from "./GenelOzet";
import FilterBar from "./FilterBar";
import MetricCard from "./MetricCard";
import PartnershipPanel from "./PartnershipPanel";
import PerformanceChart from "./PerformanceChart";
import ProjectDrawer from "./ProjectDrawer";
import ProjectPipeline from "./ProjectPipeline";

/**
 * Overview Dashboard — the widget-based home surface of the Timay platform.
 * Layout (desktop):
 *   ┌ Metric cards (4-up) ───────────────────────────────┐
 *   ┌ Filter bar ────────────────────────────────────────┐
 *   ┌ Performance chart (2fr) ──┬ Partnership panel (1fr) ┐
 *   ┌ Project pipeline (full width) ─────────────────────┐
 */
export default function Dashboard() {
  const { metrics } = useDashboard();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      {/* 0 — Canlı genel özet (projeler · cariler · hak sahipleri · finans) */}
      <GenelOzet />

      {/* 1 — Financial summary cards with sparklines */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </section>

      {/* 3 — Filtering & segmentation */}
      <FilterBar />

      {/* 4 + 2b — Performance charts beside the partnership/activity panel */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <PartnershipPanel />
        </div>
      </section>

      {/* 2a — Live project pipeline */}
      <ProjectPipeline />

      {/* Slide-over detail panel (portal-like, fixed-positioned) */}
      <ProjectDrawer />
    </div>
  );
}
