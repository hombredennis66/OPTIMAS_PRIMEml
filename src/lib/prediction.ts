// Multiple linear model variants for spending prediction.
// Each returns a predicted monthly spending amount (INR) plus per-feature contributions.

export type SurveyInput = {
  monthly_allowance: number;
  distance_from_campus: number;
  accommodation_type: "hostel" | "pg" | "rented" | "home";
  transport_type: "walk" | "bicycle" | "public" | "own_vehicle";
  meal_habits: "mess" | "home" | "cafe" | "mixed";
  outings_per_month: number;
  gaming_hours: number;
  club_events: number;
  mobile_data_usage: number;
  year_of_study: number;
  printing_frequency: number;
};

export type Contribution = { feature: string; label: string; value: number };

export type ModelVariantKey = "baseline" | "lifestyle" | "conservative";

type Coeffs = {
  intercept: number;
  allowance: number;
  distance: number;
  outings: number;
  gaming: number;
  club: number;
  data: number;
  year: number;
  printing: number;
  accommodation: Record<SurveyInput["accommodation_type"], number>;
  transport: Record<SurveyInput["transport_type"], number>;
  meal: Record<SurveyInput["meal_habits"], number>;
};

const VARIANTS: Record<ModelVariantKey, Coeffs> = {
  baseline: {
    intercept: 850, allowance: 0.32, distance: 18, outings: 260, gaming: 28,
    club: 85, data: 42, year: 110, printing: 14,
    accommodation: { hostel: 0, pg: 450, rented: 950, home: -250 },
    transport: { walk: 0, bicycle: 60, public: 320, own_vehicle: 900 },
    meal: { mess: 0, home: -180, cafe: 520, mixed: 240 },
  },
  lifestyle: {
    intercept: 700, allowance: 0.28, distance: 22, outings: 420, gaming: 55,
    club: 140, data: 68, year: 90, printing: 12,
    accommodation: { hostel: 0, pg: 500, rented: 1050, home: -280 },
    transport: { walk: 0, bicycle: 70, public: 340, own_vehicle: 1050 },
    meal: { mess: 0, home: -220, cafe: 780, mixed: 380 },
  },
  conservative: {
    intercept: 1100, allowance: 0.36, distance: 14, outings: 160, gaming: 14,
    club: 45, data: 26, year: 140, printing: 16,
    accommodation: { hostel: 0, pg: 400, rented: 850, home: -200 },
    transport: { walk: 0, bicycle: 50, public: 280, own_vehicle: 780 },
    meal: { mess: 0, home: -140, cafe: 340, mixed: 160 },
  },
};

// Map DB version strings → variant keys
export function variantFromVersion(version: string): ModelVariantKey {
  if (version.includes("lifestyle")) return "lifestyle";
  if (version.includes("conservative")) return "conservative";
  return "baseline";
}

export function predictSpending(
  input: SurveyInput,
  variant: ModelVariantKey = "baseline",
): { predicted: number; contributions: Contribution[] } {
  const c = VARIANTS[variant];
  const contributions: Contribution[] = [
    { feature: "intercept", label: "Baseline", value: c.intercept },
    { feature: "monthly_allowance", label: "Monthly allowance", value: c.allowance * input.monthly_allowance },
    { feature: "distance_from_campus", label: "Distance from campus", value: c.distance * input.distance_from_campus },
    { feature: "accommodation_type", label: `Accommodation (${input.accommodation_type})`, value: c.accommodation[input.accommodation_type] },
    { feature: "transport_type", label: `Transport (${input.transport_type})`, value: c.transport[input.transport_type] },
    { feature: "meal_habits", label: `Meal habits (${input.meal_habits})`, value: c.meal[input.meal_habits] },
    { feature: "outings_per_month", label: "Outings", value: c.outings * input.outings_per_month },
    { feature: "gaming_hours", label: "Gaming hours", value: c.gaming * input.gaming_hours },
    { feature: "club_events", label: "Club events", value: c.club * input.club_events },
    { feature: "mobile_data_usage", label: "Mobile data", value: c.data * input.mobile_data_usage },
    { feature: "year_of_study", label: "Year of study", value: c.year * input.year_of_study },
    { feature: "printing_frequency", label: "Printing", value: c.printing * input.printing_frequency },
  ];
  const predicted = Math.max(0, contributions.reduce((s, x) => s + x.value, 0));
  return { predicted: Math.round(predicted), contributions };
}
