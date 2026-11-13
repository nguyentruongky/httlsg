import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export default function EngagementChart({
  data,
}: {
  data: { day: string; active: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 8, left: -25, bottom: 0 }}
      >
        <defs>
          <linearGradient id="engagement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 4"
        />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 10,
            color: "var(--foreground)",
          }}
        />
        <Area
          type="monotone"
          dataKey="active"
          name="Active members"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#engagement)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
