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
    # In production, replace "*" with your actual frontend origin(s), e.g.
    # ["https://ropenlova.onrender.com"]. Since this service is only ever
    # called server-to-server from your TanStack Start app (not the browser),
    # you can lock this down tightly or even drop CORS handling entirely.
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
    prediction = model.predict(X_scaled)[0]

    return PredictionOutput(
        predicted_monthly_spending=round(float(prediction), 2),
        model_alpha=bundle["alpha"],
    )
