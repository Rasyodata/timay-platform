import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { SparkPoint } from "@/types";

interface SparklineProps {
  data: SparkPoint[];
  color: string;
  /** Unique id so multiple gradients can coexist on one page. */
  gradientId: string;
  height?: number;
}

/** Minimal gradient-filled area sparkline — no axes, no tooltip. */
export default function Sparkline({ data, color, gradientId, height = 48 }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
