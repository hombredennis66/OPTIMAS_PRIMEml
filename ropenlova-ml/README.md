# Ropenlova ML Service

FastAPI service that predicts student monthly spending using Ridge Regression.
Replaces the in-app TypeScript prediction logic in OPTIMAS_PRIMEml.

## Local setup

```bash
python -m venv venv
source venv/Scripts/activate    # Git Bash on Windows
# or: venv\Scripts\activate.bat  on cmd

pip install -r requirements.txt
```

## Train the model

Replace `data/survey_responses.csv` with your real data (100+ responses
recommended — the included file has only 30 sample rows for pipeline testing).
The CSV must have these columns:

- `monthly_allowance`
- `year_of_study`
- `distance_from_campus_km`
- `num_dependents`
- `has_part_time_job` (0 or 1)
- `meal_plan` (0 or 1)
- `actual_monthly_spending` (the target)

Then run:

```bash
python models/train.py
```

This prints cross-validated R² / MAE and saves `models/spending_model.pkl`.
Re-run this any time you have new data — it overwrites the existing model.

## Run the server

```bash
uvicorn main:app --reload --port 8001
```

- `GET /health` — confirms the service is up and whether a model is trained
- `POST /predict` — returns a spending prediction
- `GET /docs` — interactive Swagger UI (FastAPI generates this automatically)

## Calling this from the TanStack Start app

Call it from a **server-only** route/function in OPTIMAS_PRIMEml (never from
client-side code, so the ML service URL and any future auth aren't exposed to
the browser):

```ts
const response = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    monthly_allowance: 10000,
    year_of_study: 2,
    distance_from_campus_km: 6.0,
    num_dependents: 0,
    has_part_time_job: false,
    meal_plan: true,
  }),
});
const prediction = await response.json();
```

## Deploying (free tier)

Deploy to Render, same as the `openlova` service:

1. New Web Service → connect this repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Free tier spins down after inactivity — first request after idle will be
   slow (~30s cold start). Fine for low-traffic / non-profit use.

## Notes

- The current sample dataset (30 rows) is for testing the pipeline only.
  Metrics are not meaningful until you train on 100+ real responses.
- `alpha=0.715` is carried over from earlier experimentation on a similar
  dataset — re-tune it once you have real data (try a small grid search
  over `alpha` values and compare cross-validated R²).
