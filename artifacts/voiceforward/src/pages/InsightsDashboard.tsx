import { Link } from "wouter";
import { useGetDashboardInsights, useListOperators } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { cn, LANGUAGES, RISK_COLORS, RISK_BG } from "@/lib/utils";

const RISK_CHART_COLORS: Record<string, string> = {
  low: "#34d399",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

export default function InsightsDashboard() {
  const { data: insights } = useGetDashboardInsights({ query: { refetchInterval: 10000 } });
  const { data: operators } = useListOperators({ query: { refetchInterval: 10000 } });

  const riskData = insights ? Object.entries(insights.riskBreakdown).map(([level, count]) => ({ level, count, fill: RISK_CHART_COLORS[level] || "#94a3b8" })) : [];
  const langData = insights ? Object.entries(insights.languageBreakdown).map(([lang, count]) => ({ lang: LANGUAGES[lang] || lang, count })) : [];
  const hourData = insights?.callsPerHour || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <div className="h-12 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
          </div>
          <span className="font-bold text-sm">VoiceForward</span>
          <span className="text-muted-foreground text-xs">|</span>
          <span className="text-xs text-muted-foreground">Supervisor Analytics</span>
        </div>
        <Link href="/operator/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to HUD</Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Calls Today", value: insights?.totalCallsToday ?? 0 },
            { label: "Avg Risk Level", value: insights?.avgRiskLevel ?? "—", className: RISK_COLORS[insights?.avgRiskLevel || ""] },
            { label: "Avg Duration", value: insights ? `${Math.round(insights.avgCallDuration / 60)}m ${Math.round(insights.avgCallDuration % 60)}s` : "—" },
            { label: "Active Operators", value: `${insights?.activeOperators ?? 0} / ${insights?.totalOperators ?? 0}` },
          ].map((kpi, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <div className="text-xs text-muted-foreground mb-2">{kpi.label}</div>
              <div className={cn("text-2xl font-black", kpi.className)}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Risk breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Risk Level Breakdown</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskData}>
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(222 47% 11%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Language breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Language Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={langData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="lang" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: "hsl(222 47% 11%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calls per hour */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Calls Per Hour (Today)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hourData}>
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={h => `${h}:00`} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(222 47% 11%)", border: "1px solid hsl(220 26% 20%)", borderRadius: 8, fontSize: 12 }} labelFormatter={h => `${h}:00`} />
              <Line type="monotone" dataKey="count" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Recommended Actions</div>
            <div className="space-y-2">
              {insights?.topRecommendedActions.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 text-sm">{a.action}</div>
                  <span className="text-xs text-muted-foreground font-mono">{a.count}</span>
                </div>
              ))}
              {(!insights?.topRecommendedActions || insights.topRecommendedActions.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No data yet</div>
              )}
            </div>
          </div>

          {/* Operators */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Operator Status</div>
            <div className="space-y-3">
              {operators?.map(op => (
                <div key={op.id} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", op.status === "available" ? "bg-emerald-400" : op.status === "busy" ? "bg-amber-400" : "bg-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{op.name}</div>
                    <div className="text-xs text-muted-foreground">{op.organization}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{op.callsHandled} calls</div>
                    <div className="text-xs text-muted-foreground">{Math.round(op.avgCallDuration / 60)}m avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
