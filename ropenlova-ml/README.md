# Ropenlova ML Service (v2 — matches real SurveyInput schema)

FastAPI service replacing the hardcoded `VARIANTS` formula in
`src/lib/prediction.ts` with real, trained Ridge Regression models —
one per variant (baseline/lifestyle/conservative).

## Current status: bootstrapped on synthetic data

There's no real `confirmed_actual_spending` data yet, so these models are
trained on synthetic data generated directly from your **existing**
hardcoded TypeScript formula (`models/generate_synthetic_data.py` mirrors
`VARIANTS` from `prediction.ts` exactly). This means:

- Predictions from this service currently match the old TS formula almost
  exactly (R² = 1.0000 on synthetic data, by construction)
- It's a safe drop-in replacement architecturally — same 11-field input,
  same 3 variants, same contribution shape — without changing behavior yet
- Once real data accumulates, retrain on that instead (see below) and the
  predictions will start reflecting real student spending patterns

## Setup

```bash
python -m venv venv
source venv/Scripts/activate    # Git Bash on Windows
pip install -r requirements.txt
```

## Train

```bash
python models/generate_synthetic_data.py   # only needed once, or to regenerate
python models/train.py
```

## Run

```bash
uvicorn main:app --reload --port 8002
```

- `GET /health`
- `POST /predict/{variant}` where variant is `baseline`, `lifestyle`, or `conservative`
- `GET /docs` — Swagger UI for manual testing

Example request body (matches `SurveyInput` in `prediction.ts` exactly):
```json
{
  "monthly_allowance": 10000,
  "distance_from_campus": 5.0,
  "accommodation_type": "hostel",
  "transport_type": "public",
  "meal_habits": "mess",
  "outings_per_month": 3,
  "gaming_hours": 5,
  "club_events": 1,
  "mobile_data_usage": 8.0,
  "year_of_study": 2,
  "printing_frequency": 4
}
```

Response shape matches `predictSpending()`'s return type:
```json
{
  "predicted": 6077,
  "contributions": [
    { "feature": "intercept", "label": "Baseline", "value": 850.09 },
    { "feature": "monthly_allowance", "label": "Monthly allowance", "value": 3199.99 },
    ...
  ]
}
```

## Switching to real data (once you have it)

1. Export rows from Supabase where `confirmed_actual_spending` is set (not
   null) — these are the real labeled examples.
2. Replace the data source in `models/train.py`:
   - Change `TARGET_COLUMN = "predicted_spending"` to
     `TARGET_COLUMN = "confirmed_actual_spending"`
   - Point `train_variant()` at your real CSV/export instead of
     `data/synthetic_{variant}.csv`
3. Re-tune `alpha` properly via cross-validation (see the old `diagnose.py`
   pattern from the earlier version of this service) — real data will be
   noisy, unlike the synthetic data, so `alpha=0.01` will no longer be
   appropriate.
4. If you don't have enough real data yet to train 3 separate variants
   reliably, consider training 1 consolidated model until volume grows.

No changes needed to `main.py` or the API contract — the frontend integration
stays the same regardless of which data trained the models underneath.

## Calling this from OPTIMAS_PRIMEml

Call from a server-only route in the TanStack Start app:

```ts
const response = await fetch(
  `${process.env.ML_SERVICE_URL}/predict/${variant}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(surveyInput),
  }
);
const { predicted, contributions } = await response.json();
```

This can replace the `predictSpending()` call in `survey.tsx` directly,
since the return shape (`predicted` + `contributions`) matches what the
dashboard already expects to store in the `predictions` table.

## Deploying (free tier)

Same as before — Render free tier, same pattern as `openlova`:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
