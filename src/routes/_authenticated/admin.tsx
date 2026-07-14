import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Trash2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SpendSmart" },
      { name: "description", content: "Manage users, surveys, and predictions." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading: checkingRole } = useIsAdmin();

  if (checkingRole) return <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Checking permissions…</div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need admin access to view this page.</p>
        <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="font-display text-4xl">Admin</h1>
      </div>
      <p className="mt-1 text-muted-foreground">Manage users, surveys, and prediction history.</p>

      <Tabs defaultValue="users" className="mt-8">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="surveys"><SurveysTab /></TabsContent>
        <TabsContent value="predictions"><PredictionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach(r => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });
      return (profiles ?? []).map(p => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const setAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); qc.invalidateQueries({ queryKey: ["is-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map(u => {
              const isAdminUser = u.roles.includes("admin");
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                  <TableCell>{u.display_name ?? "—"}</TableCell>
                  <TableCell>
                    {isAdminUser ? <Badge>admin</Badge> : <Badge variant="outline">user</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={isAdminUser ? "outline" : "default"}
                      onClick={() => setAdmin.mutate({ userId: u.id, makeAdmin: !isAdminUser })}
                      disabled={setAdmin.isPending}
                    >
                      {isAdminUser ? <><ShieldOff className="mr-1 h-3.5 w-3.5" />Revoke admin</> : <><ShieldCheck className="mr-1 h-3.5 w-3.5" />Make admin</>}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!data?.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No users yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function SurveysTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("id, user_id, created_at, monthly_allowance, accommodation_type, transport_type, meal_habits, year_of_study")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useDeleteRow("survey_responses", ["admin", "surveys"], qc);

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Allowance</TableHead>
              <TableHead>Accommodation</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Meals</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
                <TableCell>₹{s.monthly_allowance.toLocaleString("en-IN")}</TableCell>
                <TableCell className="capitalize">{s.accommodation_type}</TableCell>
                <TableCell className="capitalize">{s.transport_type}</TableCell>
                <TableCell className="capitalize">{s.meal_habits}</TableCell>
                <TableCell>{s.year_of_study}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)} disabled={del.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No survey responses.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function PredictionsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, user_id, predicted_spending, created_at, model_versions(version)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useDeleteRow("predictions", ["admin", "predictions"], qc);

  return (
    <Card className="mt-4 p-0 overflow-hidden">
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Predicted spending</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((p: { id: string; user_id: string; predicted_spending: number; created_at: string; model_versions: { version: string } | null }) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.user_id.slice(0, 8)}…</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{p.model_versions?.version ?? "unknown"}</Badge></TableCell>
                <TableCell className="font-medium">₹{Math.round(p.predicted_spending).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)} disabled={del.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No predictions.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function useDeleteRow(table: "survey_responses" | "predictions", key: unknown[], qc: ReturnType<typeof useQueryClient>) {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
