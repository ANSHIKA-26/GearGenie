from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Tekion ML Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow ALL domains during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== LOAD MODELS ==========
engine_model = joblib.load("models/engine_xgb_calibrated.joblib")
battery_model = joblib.load("models/battery_xgb_calibrated.joblib")
brake_model   = joblib.load("models/brake_model.pkl")

# ========== LOAD BASELINE STATS ==========
engine_stats = pd.read_csv("baseline/engine_baseline_stats.csv")
battery_stats = pd.read_csv("baseline/battery_baseline_stats.csv")
brake_stats   = pd.read_csv("baseline/brake_baseline_stats.csv")

engine_cols = engine_stats["feature"].tolist()
engine_mean = engine_stats["mean"].values
engine_std  = np.where(engine_stats["std"].values == 0, 1e-6, engine_stats["std"].values)

battery_cols = battery_stats["feature"].tolist()
bat_mean = battery_stats["mean"].values
bat_std  = np.where(battery_stats["std"].values == 0, 1e-6, battery_stats["std"].values)

brake_cols = brake_stats["feature"].tolist()
brake_mean = brake_stats["mean"].values
brake_std  = np.where(brake_stats["std"].values == 0, 1e-6, brake_stats["std"].values)

# ========== ENGINE ==========
def engine_deviation(sample):
    s = pd.DataFrame([sample])[engine_cols]
    dev = abs((s.values - engine_mean) / engine_std)
    return float(dev.mean())

def engine_health(sample):
    return max(0, round(100 - engine_deviation(sample) * 12, 1))

# def engine_api(sample):
#     df = pd.DataFrame([sample])
#     proba = float(engine_model.predict_proba(df)[0][1])
#     failure = proba > 0.5
#     health = engine_health(sample)

#     return {
#         "failure_imminent": failure,
#         "probability": round(proba, 4),
#         "health_percent": health,
#         "recommendation": "Severe engine risk detected." if failure else "Engine normal."
#     }
def engine_api(sample):
    df = pd.DataFrame([sample])[engine_cols]  # FIXED: remove unwanted columns
    proba = float(engine_model.predict_proba(df)[0][1])
    failure = proba > 0.5
    health = engine_health(sample)

    return {
        "failure_imminent": failure,
        "probability": round(proba, 4),
        "health_percent": health,
        "recommendation": "Severe engine risk detected." if failure else "Engine normal."
    }


# ========== BATTERY ==========
def battery_deviation(sample):
    s = pd.DataFrame([sample])[battery_cols]
    dev = abs((s.values - bat_mean) / bat_std)
    return float(dev.mean())

def battery_health(sample):
    return max(0, round(100 - battery_deviation(sample) * 10, 1))

def battery_recommend(sample, prob, health):
    volt = sample["battery_voltage_v"]
    temp = sample["battery_temp_c"]
    alt  = sample["alternator_output_v"]
    charge = sample["battery_charge_percent"]

    if prob > 0.85 or health < 40:
        return "Battery critically unstable."
    if volt < 12.0:
        return "Low battery voltage."
    if alt < 13.0:
        return "Weak charging system."
    if temp > 50:
        return "Battery overheating."
    if charge < 25:
        return "Battery charge low."
    return "Battery normal."

def battery_api(sample):
    df = pd.DataFrame([sample])[battery_cols]  # FIXED
    proba = float(battery_model.predict_proba(df)[0][1])
    failure = proba > 0.5
    health = battery_health(sample)
    rec = battery_recommend(sample, proba, health)

    return {
        "failure_imminent": failure,
        "probability": round(proba, 4),
        "health_percent": health,
        "recommendation": rec
    }


# ========== BRAKE ==========
def brake_health(sample):
    s = pd.DataFrame([sample])[brake_cols]
    dev = abs((s.values - brake_mean) / brake_std).mean()
    return max(0, round(100 - dev * 10, 1))

def brake_api(sample):
    df = pd.DataFrame([sample])  # DO NOT DROP brand!

    # brake_model is a pipeline (preprocessing + classifier)
    proba = float(brake_model.predict_proba(df)[0][1])

    failure = proba > 0.5
    health = brake_health(sample)

    return {
        "failure_imminient": failure,
        "probability": round(proba, 4),
        "health_percent": health,
        "recommendation": "Brake system unstable." if failure else "Brakes normal."
    }


# ========== UNIFIED API ==========
class Payload(BaseModel):
    data: dict

@app.post("/predict")
def predict(payload: Payload):
    x = payload.data
    return {
        "engine": engine_api(x),
        "battery": battery_api(x),
        "brake": brake_api(x)
    }
