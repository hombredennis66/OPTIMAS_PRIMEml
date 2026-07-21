"""
Trains a Ridge Regression model on survey_responses.csv and saves it as a pickle.

Usage:
    python models/train.py
    python models/train.py --alpha 10.0 --data data/survey_responses.csv
"""
import argparse
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS = [
    "monthly_allowance",
    "year_of_study",
    "distance_from_campus_km",
    "num_dependents",
    "has_part_time_job",
    "meal_plan",
]
TARGET_COLUMN = "actual_monthly_spending"


def train(data_path: str, alpha: float, output_path: str):
    df = pd.read_csv(data_path)

    missing = [c for c in FEATURE_COLUMNS + [TARGET_COLUMN] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing expected columns: {missing}")

    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = Ridge(alpha=alpha)
    model.fit(X_train_scaled, y_train)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    X_all_scaled = scaler.fit_transform(X)

    cv_scores = cross_val_score(Ridge(alpha=alpha), X_all_scaled, y, cv=kf, scoring="r2")

    # Out-of-fold predictions across the WHOLE dataset -> honest residual spread.
    # This is what we'll use to build a prediction range, since it reflects
    # error on data each fold never trained on (unlike training residuals,
    # which are artificially small / overconfident).
    oof_predictions = cross_val_predict(Ridge(alpha=alpha), X_all_scaled, y, cv=kf)
    residuals = y - oof_predictions
    residual_std = float(np.std(residuals))

    y_pred = model.predict(X_test_scaled)
    test_r2 = r2_score(y_test, y_pred)
    test_mae = mean_absolute_error(y_test, y_pred)

    print(f"Rows trained on: {len(df)}")
    print(f"Alpha: {alpha}")
    print(f"5-fold CV R² (mean ± std): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    print(f"Held-out test R²: {test_r2:.3f}")
    print(f"Held-out test MAE: {test_mae:.2f}")
    print(f"Out-of-fold residual std (used for prediction ranges): {residual_std:.2f}")

    if len(df) < 50:
        print(
            "\nNote: dataset has fewer than 50 rows. Metrics above are not reliable "
            "yet — treat this as a smoke test of the pipeline, not a trustworthy "
            "model. Retrain once you have 100+ real responses."
        )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        pickle.dump(
            {
                "model": model,
                "scaler": scaler,
                "feature_columns": FEATURE_COLUMNS,
                "alpha": alpha,
                "residual_std": residual_std,
            },
            f,
        )
    print(f"\nSaved model to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/survey_responses.csv")
    parser.add_argument("--alpha", type=float, default=10.0)
    parser.add_argument("--output", default="models/spending_model.pkl")
    args = parser.parse_args()

    train(args.data, args.alpha, args.output)