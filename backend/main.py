from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib


# -------------------------------------------------------
# FASTAPI SETUP
# -------------------------------------------------------
app = FastAPI(title="Tekion ML Backend - RUL Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------
# LOAD RUL MODELS (km regression models)
# -------------------------------------------------------
try:
    rul_models = {
        "engine":  joblib.load("models/engine_RUL_model_RF.pkl"),
        "brake":   joblib.load("models/brake_RUL_model_RF.pkl"),
        "battery": joblib.load("models/battery_RUL_model_RF.pkl")
    }
    print("✅ Models loaded successfully")
except FileNotFoundError as e:
    print(f"❌ Error loading models: {e}")
    raise

# Required features for input
RUL_FEATURES = [
    "engine_temp_c","engine_rpm","coolant_temp_c","fuel_level_percent",
    "engine_load_percent","throttle_pos_percent","air_flow_rate_gps",
    "vehicle_speed_kph","ambient_temp_c","battery_voltage_v"
]


# -------------------------------------------------------
# DEFAULT FALLBACK VALUES FOR MISSING FIELDS
# -------------------------------------------------------
try:
    defaults = pd.read_csv("baseline/demo_risk_dataset.csv")
    defaults = defaults.select_dtypes(include=np.number).median()
    print("✅ Baseline defaults loaded successfully")
except FileNotFoundError as e:
    print(f"❌ Error loading baseline CSV: {e}")
    raise


# -------------------------------------------------------
# RUL PREDICTION CORE FUNCTION
# -------------------------------------------------------
def predict_subsystem(sub: str, sample: dict):

    model = rul_models[sub]

    # Build input row safely - only use required features
    input_data = {}
    for f in RUL_FEATURES:
        value = sample.get(f, None)
        if value is None:
            # Use default if missing
            value = float(defaults.get(f, 0.0))
        input_data[f] = value
    
    X = pd.DataFrame([input_data])
    
    print(f"🔄 Predicting {sub} with features: {list(input_data.keys())}")

    # Predict RUL
    try:
        rul_km = float(model.predict(X)[0])
        rul_km = round(max(0.0, min(rul_km, 120.0)), 2)   # clamp to range
    except Exception as e:
        print(f"❌ Prediction error for {sub}: {e}")
        rul_km = 50.0  # fallback value

    # ========= Health & Status from RUL =========
    if rul_km <= 10:
        status = "⚠ Critical - immediate service required"
        health = int((rul_km / 10) * 20)                  # 0→20%

    elif rul_km <= 40:
        status = "🟡 Attention soon"
        health = int(20 + (rul_km - 10) * (50/30))        # 20→70%

    else:
        status = "🟢 Healthy"
        health = int(70 + min(rul_km - 40, 80) * (30/80)) # 70→100%

    health = min(max(health,0),100)

    print(f"✅ {sub.upper()}: RUL={rul_km}km, Health={health}%, Status={status}")

    return {
        "rul_km": rul_km,
        "health_percent": health,
        "status": status
    }


# -------------------------------------------------------
# REQUEST PAYLOAD FORMAT
# -------------------------------------------------------
class Payload(BaseModel):
    data: dict


# -------------------------------------------------------
# PREDICTION ENDPOINT
# -------------------------------------------------------
@app.post("/predict")
def predict(payload: Payload):
    try:
        x = payload.data
        print(f"\n📨 Received prediction request with {len(x)} fields")
        
        result = {
            "engine":  predict_subsystem("engine", x),
            "brake":   predict_subsystem("brake", x),
            "battery": predict_subsystem("battery", x)
        }
        
        print(f"✅ Prediction complete!")
        return result
        
    except Exception as e:
        print(f"❌ Prediction endpoint error: {e}")
        return {"error": str(e), "engine": None, "brake": None, "battery": None}


# -------------------------------------------------------
# HEALTH CHECK ENDPOINT
# -------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "models_loaded": True}


# Run server:
# uvicorn main:app --reload
