import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from "recharts";
import type { Contribution } from "@/lib/prediction";

type PredictionRow = {
  id: string;
  predicted_spending: number;
  created_at: string;
  feature_contributions: Contribution[] | null;
  model_version_id: string | null;
};

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
  const { data, isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, predicted_spending, created_at, feature_contributions, model_version_id")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as PredictionRow[];
    },
  });

  const latest = data?.[0];
  const currency = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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
      ) : !latest ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 p-6 bg-primary text-primary-foreground border-primary">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
              <Sparkles className="h-3.5 w-3.5" /> Latest prediction
            </div>
            <div className="mt-3 font-display text-5xl">{currency(latest.predicted_spending)}</div>
            <p className="mt-1 text-sm opacity-80">Predicted monthly spending</p>
            <p className="mt-6 text-xs opacity-70">Generated {new Date(latest.created_at).toLocaleString()}</p>
          </Card>

          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Prediction history
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...data!].reverse().map(d => ({ date: new Date(d.created_at).toLocaleDateString(), value: d.predicted_spending }))}>
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-3 p-6">
            <div className="text-sm font-semibold">What's driving your prediction</div>
            <p className="text-xs text-muted-foreground">Contribution of each lifestyle factor to your latest forecast.</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={(latest.feature_contributions ?? []).filter(c => c.feature !== "intercept").sort((a, b) => Math.abs(b.value) - Math.abs(a.value))}
                  margin={{ left: 40 }}
                >
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="label" fontSize={11} width={180} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {(latest.feature_contributions ?? []).map((c, i) => (
                      <Cell key={i} fill={c.value >= 0 ? "var(--primary)" : "var(--success)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
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
