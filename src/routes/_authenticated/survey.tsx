import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { surveySchema, surveyDefaults, type SurveyFormValues, accommodationTypes, transportTypes, mealHabits } from "@/lib/survey-schema";
import { predictSpending, variantFromVersion } from "@/lib/prediction";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({
    meta: [
      { title: "New survey — SpendSmart" },
      { name: "description", content: "Answer a quick lifestyle survey to get a predicted monthly spending amount." },
    ],
  }),
  component: SurveyPage,
});

const LABELS: Record<string, string> = {
  hostel: "Hostel", pg: "PG / hostel-like", rented: "Rented apartment", home: "Living at home",
  walk: "Walk", bicycle: "Bicycle", public: "Public transport", own_vehicle: "Own vehicle",
  mess: "Mess / canteen", home_meals: "Home-cooked", cafe: "Cafes / eating out", mixed: "Mixed",
};
const mealLabel = (m: string) => (m === "home" ? "Home-cooked" : LABELS[m] ?? m);

type ModelRow = { id: string; version: string; metadata: { description?: string } | null };

function SurveyPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("model_versions").select("id, version, metadata").eq("is_active", true).order("version").then(({ data }) => {
      const rows = (data ?? []) as ModelRow[];
      setModels(rows);
      if (rows.length && selectedModels.size === 0) setSelectedModels(new Set([rows[0].id]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: surveyDefaults,
  });

  const toggleModel = (id: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onSubmit = async (values: SurveyFormValues) => {
    if (selectedModels.size === 0) return toast.error("Select at least one model");
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setSubmitting(false); return toast.error("Not signed in"); }

    const { data: survey, error: sErr } = await supabase
      .from("survey_responses")
      .insert({ ...values, user_id: userId })
      .select("id")
      .single();

    if (sErr || !survey) { setSubmitting(false); return toast.error(sErr?.message ?? "Failed to save survey"); }

    const chosen = models.filter(m => selectedModels.has(m.id));
    const rows = chosen.map(m => {
      const { predicted, contributions } = predictSpending(values, variantFromVersion(m.version));
      return {
        user_id: userId,
        survey_response_id: survey.id,
        model_version_id: m.id,
        predicted_spending: predicted,
        feature_contributions: contributions,
      };
    });

    const { error: pErr } = await supabase.from("predictions").insert(rows);

    setSubmitting(false);
    if (pErr) return toast.error(pErr.message);
    toast.success(chosen.length > 1 ? `${chosen.length} predictions generated!` : "Prediction generated!");
    navigate({ to: "/dashboard" });
  };

  const err = form.formState.errors;
  const reg = form.register;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl">Tell us about your lifestyle</h1>
        <p className="mt-2 text-muted-foreground">All values are for a typical month. Takes ~1 minute.</p>
      </div>

      <Card className="p-6 md:p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
          <NumberField label="Monthly allowance (₹)" error={err.monthly_allowance?.message} {...reg("monthly_allowance")} />
          <NumberField label="Distance from campus (km)" error={err.distance_from_campus?.message} step="0.1" {...reg("distance_from_campus")} />

          <SelectField
            label="Accommodation type"
            value={form.watch("accommodation_type")}
            onChange={(v) => form.setValue("accommodation_type", v as SurveyFormValues["accommodation_type"])}
            options={accommodationTypes.map(v => ({ value: v, label: LABELS[v] }))}
          />
          <SelectField
            label="Transport type"
            value={form.watch("transport_type")}
            onChange={(v) => form.setValue("transport_type", v as SurveyFormValues["transport_type"])}
            options={transportTypes.map(v => ({ value: v, label: LABELS[v] }))}
          />
          <SelectField
            label="Meal habits"
            value={form.watch("meal_habits")}
            onChange={(v) => form.setValue("meal_habits", v as SurveyFormValues["meal_habits"])}
            options={mealHabits.map(v => ({ value: v, label: mealLabel(v) }))}
          />

          <NumberField label="Outings per month" error={err.outings_per_month?.message} {...reg("outings_per_month")} />
          <NumberField label="Gaming hours per week" error={err.gaming_hours?.message} step="0.5" {...reg("gaming_hours")} />
          <NumberField label="Club / society events" error={err.club_events?.message} {...reg("club_events")} />
          <NumberField label="Mobile data (GB / month)" error={err.mobile_data_usage?.message} step="0.5" {...reg("mobile_data_usage")} />
          <NumberField label="Year of study" error={err.year_of_study?.message} {...reg("year_of_study")} />
          <NumberField label="Printing pages / week" error={err.printing_frequency?.message} {...reg("printing_frequency")} />

          <div className="md:col-span-2 flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Predict my spending
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const NumberField = ({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type="number" {...props} />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);
