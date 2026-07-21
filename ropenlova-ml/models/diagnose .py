"""
Diagnostic script: tunes Ridge's alpha and compares against Random Forest
on the real survey data, to see whether Ridge is even the right model.

Usage:
    python models/diagnose.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_val_score
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


def main():
    df = pd.read_csv("data/survey_responses.csv")
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    print(f"Rows: {len(df)}")
    print(f"Target mean: {y.mean():.0f}, std: {y.std():.0f}, "
          f"min: {y.min():.0f}, max: {y.max():.0f}\n")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    print("=== Ridge alpha sweep ===")
    best_alpha, best_score = None, -np.inf
    for alpha in [0.01, 0.1, 0.5, 0.715, 1.0, 5.0, 10.0, 50.0, 100.0]:
        scores = cross_val_score(Ridge(alpha=alpha), X_scaled, y, cv=kf, scoring="r2")
        print(f"alpha={alpha:>6}: R² = {scores.mean():.3f} ± {scores.std():.3f}")
        if scores.mean() > best_score:
            best_alpha, best_score = alpha, scores.mean()
    print(f"\nBest alpha: {best_alpha} (R² = {best_score:.3f})\n")

    print("=== Random Forest comparison ===")
    rf_scores = cross_val_score(
        RandomForestRegressor(n_estimators=200, random_state=42),
        X, y, cv=kf, scoring="r2"
    )
    print(f"Random Forest: R² = {rf_scores.mean():.3f} ± {rf_scores.std():.3f}")

    rf = RandomForestRegressor(n_estimators=200, random_state=42)
    rf.fit(X, y)
    print("\nFeature importances (Random Forest):")
    for name, importance in sorted(
        zip(FEATURE_COLUMNS, rf.feature_importances_), key=lambda x: -x[1]
    ):
        print(f"  {name}: {importance:.3f}")


if __name__ == "__main__":
    main()
