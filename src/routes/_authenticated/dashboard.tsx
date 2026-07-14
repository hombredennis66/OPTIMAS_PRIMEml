import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, Legend } from "recharts";
import type { Contribution } from "@/lib/prediction";

type PredictionRow = {
  id: string;
  predicted_spending: number;
  created_at: string;
  feature_contributions: Contribution[] | null;
  model_version_id: string | null;
  model_versions: { id: string; version: string } | null;
};

const SERIES_COLORS = ["var(--primary)", "var(--success, #10b981)", "#f59e0b", "#8b5cf6"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SpendSmart" },
      { name: "description", content: "Your latest spending prediction, history, and feature-level insights." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: predictions, isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, predicted_spending, created_at, feature_contributions, model_version_id, model_versions(id, version)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as PredictionRow[];
    },
  });

  // Distinct model versions present in the user's history
  const availableModels = useMemo(() => {
    const map = new Map<string, string>();
    (predictions ?? []).forEach(p => {
      if (p.model_versions) map.set(p.model_versions.id, p.model_versions.version);
    });
    return Array.from(map, ([id, version]) => ({ id, version }));
  }, [predictions]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeIds = selected.size ? selected : new Set(availableModels.map(m => m.id));

  const filtered = (predictions ?? []).filter(p => p.model_version_id && activeIds.has(p.model_version_id));

  // Latest prediction per selected model
  const latestByModel = useMemo(() => {
    const map = new Map<string, PredictionRow>();
    filtered.forEach(p => {
      if (p.model_version_id && !map.has(p.model_version_id)) map.set(p.model_version_id, p);
    });
    return Array.from(map.values());
  }, [filtered]);

  const currency = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Build history chart: one line per active model
  const historyData = useMemo(() => {
    const dates = Array.from(new Set(filtered.map(p => new Date(p.created_at).toLocaleDateString()))).reverse();
    return dates.map(date => {
      const row: Record<string, string | number> = { date };
      availableModels.forEach(m => {
        if (!activeIds.has(m.id)) return;
        const rec = filtered.find(p => new Date(p.created_at).toLocaleDateString() === date && p.model_version_id === m.id);
        if (rec) row[m.version] = rec.predicted_spending;
      });
      return row;
    });
  }, [filtered, availableModels, activeIds]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Your dashboard</h1>
          <p className="mt-1 text-muted-foreground">See your spending forecast and how your lifestyle drives it.</p>
        </div>
        <Button asChild><Link to="/survey">New prediction <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>

      {isLoading ? (
        <p className="mt-12 text-muted-foreground">Loading…</p>
      ) : !predictions?.length ? (
        <EmptyState />
      ) : (
        <>
          {availableModels.length > 0 && (
            <Card className="mt-8 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Filter by model</span>
                {availableModels.map(m => {
                  const on = activeIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                    >
                      {m.version}
                    </button>
                  );
                })}
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground underline ml-2">Show all</button>
                )}
              </div>
            </Card>
          )}

          {/* Side-by-side latest per model */}
          {latestByModel.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestByModel.map((p, i) => (
                <Card key={p.id} className={`p-6 ${i === 0 ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${i === 0 ? "opacity-80" : "text-muted-foreground"}`}>
                      <Sparkles className="h-3.5 w-3.5" /> {i === 0 ? "Latest" : "Compare"}
                    </div>
                    <Badge variant={i === 0 ? "secondary" : "outline"} className="text-[10px]">{p.model_versions?.version ?? "unknown"}</Badge>
                  </div>
                  <div className="mt-3 font-display text-4xl">{currency(p.predicted_spending)}</div>
                  <p className={`mt-1 text-xs ${i === 0 ? "opacity-80" : "text-muted-foreground"}`}>{new Date(p.created_at).toLocaleString()}</p>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-3 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" /> Prediction history
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {availableModels.filter(m => activeIds.has(m.id)).map((m, i) => (
                      <Line key={m.id} type="monotone" dataKey={m.version} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {latestByModel.length > 0 && (
              <Card className="lg:col-span-3 p-6">
                <div className="text-sm font-semibold">Feature contributions {latestByModel.length > 1 ? "— compared" : ""}</div>
                <p className="text-xs text-muted-foreground">How each lifestyle factor drives each model's latest prediction.</p>
                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={buildContributionCompare(latestByModel)}
                      margin={{ left: 40 }}
                    >
                      <XAxis type="number" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                      <YAxis type="category" dataKey="label" fontSize={11} width={180} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {latestByModel.map((p, i) => (
                        <Bar key={p.id} dataKey={p.model_versions?.version ?? `model-${i}`} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[0, 3, 3, 0]}>
                          {latestByModel.length === 1 && buildContributionCompare(latestByModel).map((row, idx) => (
                            <Cell key={idx} fill={(row[p.model_versions?.version ?? ""] as number) >= 0 ? SERIES_COLORS[0] : "#10b981"} />
                          ))}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function buildContributionCompare(rows: PredictionRow[]) {
  // Merge feature contributions across models into one array keyed by feature label
  const labels = new Set<string>();
  rows.forEach(r => (r.feature_contributions ?? []).forEach(c => c.feature !== "intercept" && labels.add(c.label)));
  return Array.from(labels).map(label => {
    const row: Record<string, string | number> = { label };
    rows.forEach(r => {
      const v = r.model_versions?.version;
      if (!v) return;
      const c = (r.feature_contributions ?? []).find(x => x.label === label);
      row[v] = c?.value ?? 0;
    });
    return row;
  }).sort((a, b) => {
    const maxA = Math.max(...rows.map(r => Math.abs(Number(a[r.model_versions?.version ?? ""] ?? 0))));
    const maxB = Math.max(...rows.map(r => Math.abs(Number(b[r.model_versions?.version ?? ""] ?? 0))));
    return maxB - maxA;
  });
}

function EmptyState() {
  return (
    <Card className="mt-10 p-12 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-4 font-display text-2xl">No predictions yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">Fill out the survey to generate your first spending forecast.</p>
      <Button asChild className="mt-6"><Link to="/survey">Start survey</Link></Button>
    </Card>
  );
}
