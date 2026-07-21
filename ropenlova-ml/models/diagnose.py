"""
Diagnostic script: tunes Ridge's alpha and compares against Random Forest
on the real survey data, to see whether Ridge is even the right model.

Usage:
    python models/diagnose.py
"""
import sys
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


# Force UTF-8 output on Windows so Unicode symbols render correctly
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    df = pd.read_csv("data/survey_responses.csv")
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    print(f"Rows: {len(df)}")
    print(f"Target mean: {y.mean():.0f}, std: {y.std():.0f}, "
          f"min: {y.min():.0f}, max: {y.max():.0f}\n")

    # ── Outlier / data-quality check ─────────────────────────────────────────
    mean_, std_ = y.mean(), y.std()
    outlier_mask = np.abs(y - mean_) > 3 * std_
    if outlier_mask.any():
        print("[!] Potential outliers (|z| > 3) detected in target column:")
        for idx in np.where(outlier_mask)[0]:
            print(f"   row {idx + 2}: {TARGET_COLUMN} = {y[idx]:.0f}  "
                  f"(z = {(y[idx] - mean_) / std_:+.2f})")
        print("   Consider fixing or dropping these before retraining.\n")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    kf = KFold(n_splits=5, shuffle=True, random_state=42)

    # ── Ridge alpha sweep ─────────────────────────────────────────────────────
    print("=== Ridge alpha sweep ===")
    alphas = [0.001, 0.01, 0.05, 0.1, 0.3, 0.5, 0.715,
              1.0, 2.0, 5.0, 10.0, 50.0, 100.0, 500.0]
    best_alpha, best_score = None, -np.inf
    for alpha in alphas:
        scores = cross_val_score(Ridge(alpha=alpha), X_scaled, y,
                                 cv=kf, scoring="r2")
        marker = " <- best" if scores.mean() > best_score else ""
        print(f"  alpha={alpha:>7}: R2 = {scores.mean():.4f} +/- {scores.std():.4f}{marker}")
        if scores.mean() > best_score:
            best_alpha, best_score = alpha, scores.mean()
    print(f"\n  Best alpha: {best_alpha}  (CV R2 = {best_score:.4f})\n")

    # ── Random Forest comparison ──────────────────────────────────────────────
    print("=== Random Forest comparison ===")
    rf_scores = cross_val_score(
        RandomForestRegressor(n_estimators=200, random_state=42),
        X, y, cv=kf, scoring="r2"
    )
    print(f"  Random Forest: R2 = {rf_scores.mean():.4f} +/- {rf_scores.std():.4f}")

    rf = RandomForestRegressor(n_estimators=200, random_state=42)
    rf.fit(X, y)
    print("\n  Feature importances (Random Forest):")
    for name, importance in sorted(
        zip(FEATURE_COLUMNS, rf.feature_importances_), key=lambda x: -x[1]
    ):
        bar = "#" * int(importance * 40)
        print(f"    {name:<30} {importance:.4f}  {bar}")

    # ── Verdict ───────────────────────────────────────────────────────────────
    print("\n=== Verdict ===")
    ridge_label  = f"Ridge(α={best_alpha})"
    rf_label     = "Random Forest"
    winner_label = ridge_label if best_score >= rf_scores.mean() else rf_label
    winner_score = max(best_score, rf_scores.mean())
    print(f"  {ridge_label:<20} CV R2 = {best_score:.4f}")
    print(f"  {rf_label:<20} CV R2 = {rf_scores.mean():.4f}")
    print(f"\n  [OK] Recommended model: {winner_label}  (R2 = {winner_score:.4f})")
    if winner_label != ridge_label:
        print("  → Consider switching train.py to RandomForestRegressor.")
    else:
        print(f"  → Update train.py --alpha to {best_alpha} if changed from current default.")


if __name__ == "__main__":
    main()
