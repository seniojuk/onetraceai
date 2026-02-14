import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type CoverageSnapshot } from "@/hooks/useCoverage";

interface CoverageTrendChartProps {
  history: CoverageSnapshot[];
}

const CoverageTrendChart = ({ history }: CoverageTrendChartProps) => {
  // Aggregate snapshots by computed_at date into project-level trend points
  const trendData = useMemo(() => {
    if (!history.length) return [];

    // Group by computed_at timestamp (rounded to minute for grouping)
    const grouped = new Map<string, CoverageSnapshot[]>();
    for (const s of history) {
      // Round to the minute for grouping multiple stories computed at the same time
      const key = s.computed_at?.slice(0, 16) || "";
      if (!key) continue;
      const arr = grouped.get(key) || [];
      arr.push(s);
      grouped.set(key, arr);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, snapshots]) => {
        const totalACs = snapshots.reduce((sum, s) => sum + (s.total_acs || 0), 0);
        const satisfiedACs = snapshots.reduce((sum, s) => sum + (s.satisfied_acs || 0), 0);
        const testedACs = snapshots.reduce((sum, s) => sum + (s.tested_acs || 0), 0);

        return {
          date: format(new Date(timestamp), "MMM d, HH:mm"),
          coverage: totalACs > 0 ? Math.round((satisfiedACs / totalACs) * 100) : 0,
          testCoverage: totalACs > 0 ? Math.round((testedACs / totalACs) * 100) : 0,
        };
      });
  }, [history]);

  if (trendData.length < 2) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Coverage Trend
        </CardTitle>
        <CardDescription>
          How coverage has changed over time across recomputations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="testGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--card-foreground))",
              }}
              formatter={(value: number) => [`${value}%`]}
            />
            <Area
              type="monotone"
              dataKey="coverage"
              name="AC Satisfaction"
              stroke="hsl(var(--success))"
              fill="url(#coverageGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="testCoverage"
              name="Test Coverage"
              stroke="hsl(var(--accent))"
              fill="url(#testGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CoverageTrendChart;
