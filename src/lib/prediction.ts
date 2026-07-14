// Baseline linear regression coefficients derived from student spending priors.
// Returns a predicted monthly spending amount (INR) plus per-feature contributions.

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

const INTERCEPT = 850;

const ACCOMMODATION: Record<SurveyInput["accommodation_type"], number> = {
  hostel: 0,
  pg: 450,
  rented: 950,
  home: -250,
};
const TRANSPORT: Record<SurveyInput["transport_type"], number> = {
  walk: 0,
  bicycle: 60,
  public: 320,
  own_vehicle: 900,
};
const MEAL: Record<SurveyInput["meal_habits"], number> = {
  mess: 0,
  home: -180,
  cafe: 520,
  mixed: 240,
};

export type Contribution = { feature: string; label: string; value: number };

export function predictSpending(input: SurveyInput): {
  predicted: number;
  contributions: Contribution[];
} {
  const contributions: Contribution[] = [
    { feature: "intercept", label: "Baseline", value: INTERCEPT },
    { feature: "monthly_allowance", label: "Monthly allowance", value: 0.32 * input.monthly_allowance },
    { feature: "distance_from_campus", label: "Distance from campus", value: 18 * input.distance_from_campus },
    { feature: "accommodation_type", label: `Accommodation (${input.accommodation_type})`, value: ACCOMMODATION[input.accommodation_type] },
    { feature: "transport_type", label: `Transport (${input.transport_type})`, value: TRANSPORT[input.transport_type] },
    { feature: "meal_habits", label: `Meal habits (${input.meal_habits})`, value: MEAL[input.meal_habits] },
    { feature: "outings_per_month", label: "Outings", value: 260 * input.outings_per_month },
    { feature: "gaming_hours", label: "Gaming hours", value: 28 * input.gaming_hours },
    { feature: "club_events", label: "Club events", value: 85 * input.club_events },
    { feature: "mobile_data_usage", label: "Mobile data", value: 42 * input.mobile_data_usage },
    { feature: "year_of_study", label: "Year of study", value: 110 * input.year_of_study },
    { feature: "printing_frequency", label: "Printing", value: 14 * input.printing_frequency },
  ];
  const predicted = Math.max(0, contributions.reduce((s, c) => s + c.value, 0));
  return { predicted: Math.round(predicted), contributions };
}
