# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://your-frontend-domain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionInput(BaseModel):
    # your feature fields here
    monthly_allowance: float
    year_of_study: int
    # ...

@app.post("/predict")
def predict(data: PredictionInput):
    # load model, run prediction
    return {"prediction": 0.0}

@app.get("/health")
def health():
    return {"status": "ok"}