import pickle
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = Path(__file__).parent / "models" / "spending_models.pkl"

app = FastAPI(title="Ropenlova ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_bundle = None

NUMERIC_FEATURES = [
    "monthly_allowance",
    "distance_from_campus",
    "outings_per_month",
    "gaming_hours",
    "club_events",
    "mobile_data_usage",
    "year_of_study",
    "printing_frequency",
]

CATEGORICAL_FEATURES = {
    "accommodation_type": ["hostel", "pg", "rented", "home"],
    "transport_type": ["walk", "bicycle", "public", "own_vehicle"],
    "meal_habits": ["mess", "home", "cafe", "mixed"],
}

LABELS = {
    "monthly_allowance": "Monthly allowance",
    "distance_from_campus": "Distance from campus",
    "outings_per_month": "Outings",
    "gaming_hours": "Gaming hours",
    "club_events": "Club events",
    "mobile_data_usage": "Mobile data",
    "year_of_study": "Year of study",
    "printing_frequency": "Printing",
}

CATEGORY_LABELS = {
    "accommodation_type": "Accommodation",
    "transport_type": "Transport",
    "meal_habits": "Meal habits",
}


def get_bundle():
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="Models not trained yet. Run `python models/train.py` first.",
            )
        with open(MODEL_PATH, "rb") as f:
            _bundle = pickle.load(f)
    return _bundle


class SurveyInput(BaseModel):
    monthly_allowance: float = Field(..., ge=0)
    distance_from_campus: float = Field(..., ge=0)
    accommodation_type: Literal["hostel", "pg", "rented", "home"]
    transport_type: Literal["walk", "bicycle", "public", "own_vehicle"]
    meal_habits: Literal["mess", "home", "cafe", "mixed"]
    outings_per_month: int = Field(..., ge=0)
    gaming_hours: float = Field(..., ge=0)
    club_events: int = Field(..., ge=0)
    mobile_data_usage: float = Field(..., ge=0)
    year_of_study: int = Field(..., ge=1, le=6)
    printing_frequency: int = Field(..., ge=0)


class Contribution(BaseModel):
    feature: str
    label: str
    value: float


class PredictionOutput(BaseModel):
    predicted: float
    contributions: list[Contribution]


@app.get("/health")
def health():
    return {"status": "ok", "models_trained": MODEL_PATH.exists()}


@app.post("/predict/{variant}", response_model=PredictionOutput)
def predict(variant: Literal["baseline", "lifestyle", "conservative"], data: SurveyInput):
    bundle = get_bundle()
    if variant not in bundle:
        raise HTTPException(status_code=404, detail=f"Unknown variant: {variant}")

    variant_bundle = bundle[variant]
    model = variant_bundle["model"]
    feature_columns = variant_bundle["feature_columns"]
    coefs = dict(zip(feature_columns, model.coef_))

    input_dict = data.model_dump()

    contributions: list[Contribution] = [
        Contribution(feature="intercept", label="Baseline", value=round(variant_bundle["intercept"], 2))
    ]

    for feat in NUMERIC_FEATURES:
        value = coefs[feat] * input_dict[feat]
        contributions.append(
            Contribution(feature=feat, label=LABELS[feat], value=round(value, 2))
        )

    for col, categories in CATEGORICAL_FEATURES.items():
        baseline, *others = categories
        selected = input_dict[col]
        colname = f"{col}__{selected}" if selected != baseline else None
        value = coefs[colname] if colname else 0.0
        contributions.append(
            Contribution(
                feature=col,
                label=f"{CATEGORY_LABELS[col]} ({selected})",
                value=round(value, 2),
            )
        )

    predicted = max(0, round(sum(c.value for c in contributions)))

    return PredictionOutput(predicted=predicted, contributions=contributions)
