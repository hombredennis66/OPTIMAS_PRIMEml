import pickle
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = Path(__file__).parent / "models" / "spending_model.pkl"

app = FastAPI(title="Ropenlova ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_bundle = None


def get_model_bundle():
    global _model_bundle
    if _model_bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Model not trained yet. Run `python models/train.py` "
                    "before starting the server."
                ),
            )
        with open(MODEL_PATH, "rb") as f:
            _model_bundle = pickle.load(f)
    return _model_bundle


class PredictionInput(BaseModel):
    monthly_allowance: float = Field(..., ge=0, description="KES per month")
    year_of_study: int = Field(..., ge=1, le=6)
    distance_from_campus_km: float = Field(..., ge=0)
    num_dependents: int = Field(..., ge=0)
    has_part_time_job: bool
    meal_plan: bool


class PredictionOutput(BaseModel):
    model_config = {"protected_namespaces": ()}

    predicted_monthly_spending: float
    low_estimate: float
    high_estimate: float
    confidence_note: str
    model_alpha: float


@app.get("/health")
def health():
    model_exists = MODEL_PATH.exists()
    return {"status": "ok", "model_trained": model_exists}


@app.post("/predict", response_model=PredictionOutput)
def predict(data: PredictionInput):
    bundle = get_model_bundle()
    model = bundle["model"]
    scaler = bundle["scaler"]
    feature_columns = bundle["feature_columns"]
    residual_std = bundle.get("residual_std")

    row = {
        "monthly_allowance": data.monthly_allowance,
        "year_of_study": data.year_of_study,
        "distance_from_campus_km": data.distance_from_campus_km,
        "num_dependents": data.num_dependents,
        "has_part_time_job": int(data.has_part_time_job),
        "meal_plan": int(data.meal_plan),
    }
    X = np.array([[row[c] for c in feature_columns]])
    X_scaled = scaler.transform(X)
    prediction = float(model.predict(X_scaled)[0])

    # ~80% interval using out-of-fold residual std (1.28 * std under a
    # normal-error assumption). This is a rough range, not a formal
    # prediction interval -- honest framing given the small dataset.
    if residual_std:
        margin = 1.28 * residual_std
        low = round(max(0, prediction - margin), 2)
        high = round(prediction + margin, 2)
        note = (
            "This is a rough estimate based on a small training dataset "
            "(under 100 responses). Treat it as a ballpark range, not a "
            "precise figure."
        )
    else:
        low = high = round(prediction, 2)
        note = "No residual data available -- range could not be computed."

    return PredictionOutput(
        predicted_monthly_spending=round(prediction, 2),
        low_estimate=low,
        high_estimate=high,
        confidence_note=note,
        model_alpha=bundle["alpha"],
    )