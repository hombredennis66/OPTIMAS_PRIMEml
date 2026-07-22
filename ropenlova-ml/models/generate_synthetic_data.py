"""
Generates synthetic training data by replicating the exact hardcoded
coefficients currently used in src/lib/prediction.ts (VARIANTS object).

This lets us train real Ridge Regression models that reproduce the current
in-app formula exactly, giving a working, correctly-shaped FastAPI service
today. Once real `confirmed_actual_spending` rows accumulate in Supabase,
retrain on that instead (see models/train.py) -- no API changes needed.

Usage:
    python models/generate_synthetic_data.py
"""
import random

import pandas as pd

random.seed(42)

# Mirrors VARIANTS in src/lib/prediction.ts exactly.
VARIANTS = {
    "baseline": {
        "intercept": 850,
        "allowance": 0.32,
        "distance": 18,
        "outings": 260,
        "gaming": 28,
        "club": 85,
        "data": 42,
        "year": 110,
        "printing": 14,
        "accommodation": {"hostel": 0, "pg": 450, "rented": 950, "home": -250},
        "transport": {"walk": 0, "bicycle": 60, "public": 320, "own_vehicle": 900},
        "meal": {"mess": 0, "home": -180, "cafe": 520, "mixed": 240},
    },
    "lifestyle": {
        "intercept": 700,
        "allowance": 0.28,
        "distance": 22,
        "outings": 420,
        "gaming": 55,
        "club": 140,
        "data": 68,
        "year": 90,
        "printing": 12,
        "accommodation": {"hostel": 0, "pg": 500, "rented": 1050, "home": -280},
        "transport": {"walk": 0, "bicycle": 70, "public": 340, "own_vehicle": 1050},
        "meal": {"mess": 0, "home": -220, "cafe": 780, "mixed": 380},
    },
    "conservative": {
        "intercept": 1100,
        "allowance": 0.36,
        "distance": 14,
        "outings": 160,
        "gaming": 14,
        "club": 45,
        "data": 26,
        "year": 140,
        "printing": 16,
        "accommodation": {"hostel": 0, "pg": 400, "rented": 850, "home": -200},
        "transport": {"walk": 0, "bicycle": 50, "public": 280, "own_vehicle": 780},
        "meal": {"mess": 0, "home": -140, "cafe": 340, "mixed": 160},
    },
}

ACCOMMODATION_TYPES = ["hostel", "pg", "rented", "home"]
TRANSPORT_TYPES = ["walk", "bicycle", "public", "own_vehicle"]
MEAL_HABITS = ["mess", "home", "cafe", "mixed"]


def random_row():
    return {
        "monthly_allowance": random.randint(3000, 25000),
        "distance_from_campus": round(random.uniform(0.2, 30.0), 1),
        "accommodation_type": random.choice(ACCOMMODATION_TYPES),
        "transport_type": random.choice(TRANSPORT_TYPES),
        "meal_habits": random.choice(MEAL_HABITS),
        "outings_per_month": random.randint(0, 12),
        "gaming_hours": random.randint(0, 40),
        "club_events": random.randint(0, 6),
        "mobile_data_usage": round(random.uniform(1.0, 20.0), 1),
        "year_of_study": random.randint(1, 4),
        "printing_frequency": random.randint(0, 30),
    }


def predict_with_formula(row: dict, variant: str) -> float:
    c = VARIANTS[variant]
    total = (
        c["intercept"]
        + c["allowance"] * row["monthly_allowance"]
        + c["distance"] * row["distance_from_campus"]
        + c["accommodation"][row["accommodation_type"]]
        + c["transport"][row["transport_type"]]
        + c["meal"][row["meal_habits"]]
        + c["outings"] * row["outings_per_month"]
        + c["gaming"] * row["gaming_hours"]
        + c["club"] * row["club_events"]
        + c["data"] * row["mobile_data_usage"]
        + c["year"] * row["year_of_study"]
        + c["printing"] * row["printing_frequency"]
    )
    return max(0, round(total))


def generate(n_rows: int = 2000):
    for variant in VARIANTS:
        rows = []
        for _ in range(n_rows):
            row = random_row()
            row["predicted_spending"] = predict_with_formula(row, variant)
            rows.append(row)
        df = pd.DataFrame(rows)
        out_path = f"data/synthetic_{variant}.csv"
        df.to_csv(out_path, index=False)
        print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    generate()
