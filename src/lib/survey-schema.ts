import { z } from "zod";

export const accommodationTypes = ["hostel", "pg", "rented", "home"] as const;
export const transportTypes = ["walk", "bicycle", "public", "own_vehicle"] as const;
export const mealHabits = ["mess", "home", "cafe", "mixed"] as const;

export const surveySchema = z.object({
  monthly_allowance: z.coerce.number().min(0).max(200000),
  distance_from_campus: z.coerce.number().min(0).max(200),
  accommodation_type: z.enum(accommodationTypes),
  transport_type: z.enum(transportTypes),
  meal_habits: z.enum(mealHabits),
  outings_per_month: z.coerce.number().int().min(0).max(60),
  gaming_hours: z.coerce.number().min(0).max(168),
  club_events: z.coerce.number().int().min(0).max(60),
  mobile_data_usage: z.coerce.number().min(0).max(500),
  year_of_study: z.coerce.number().int().min(1).max(8),
  printing_frequency: z.coerce.number().int().min(0).max(200),
});

export type SurveyFormValues = z.infer<typeof surveySchema>;

export const surveyDefaults: SurveyFormValues = {
  monthly_allowance: 8000,
  distance_from_campus: 5,
  accommodation_type: "hostel",
  transport_type: "public",
  meal_habits: "mess",
  outings_per_month: 4,
  gaming_hours: 6,
  club_events: 2,
  mobile_data_usage: 30,
  year_of_study: 2,
  printing_frequency: 5,
};
