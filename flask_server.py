#!/usr/bin/env python3
"""
NASA JPL Flask Server
=====================
API server for 3D solar system visualization.
Auto-computes data on first start if Parquet files are missing.

Port: 5000 (avoids conflict with existing UI on 8080)
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

from jpl_toolkit import (
    JPLPlanetToolkit, DATA_DIR, ORBITS_PARQUET, PREDICTIONS_PARQUET,
    PLANETS_PARQUET, DEVIATIONS_PARQUET, AU_TO_KM, PLANET_MAP
)

app = Flask(__name__)
toolkit = None


def ensure_data():
    """Check if Parquet files exist. If not, compute everything."""
    if ORBITS_PARQUET.exists() and PLANETS_PARQUET.exists():
        return True

    print("=" * 60)
    print("First start: Computing planetary data...")
    print("This may take 30-60 minutes for minute-level data.")
    print("=" * 60)

    tk = JPLPlanetToolkit()
    tk.compute_all()
    return True


@app.before_request
def check_data():
    """Ensure toolkit is initialized before handling any request."""
    global toolkit
    if toolkit is None:
        try:
            toolkit = JPLPlanetToolkit()
            print("Toolkit initialized successfully.")
        except Exception as e:
            print(f"Toolkit init failed: {e}")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/planets")
def api_planets():
    if not PLANETS_PARQUET.exists():
        return jsonify({"error": "Data not computed yet"}), 503
    df = pd.read_parquet(PLANETS_PARQUET)
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/positions")
def api_positions():
    planet = request.args.get("planet", "")
    start = request.args.get("start", "")
    stop = request.args.get("stop", "")
    resolution = request.args.get("resolution", "monthly")

    if not planet or not start or not stop:
        return jsonify({"error": "Missing required params: planet, start, stop"}), 400

    if not ORBITS_PARQUET.exists():
        return jsonify({"error": "Data not computed yet"}), 503

    df = pd.read_parquet(ORBITS_PARQUET)
    df["date"] = pd.to_datetime(df["date"])

    mask = (
        (df["planet"] == planet) &
        (df["date"] >= pd.Timestamp(start)) &
        (df["date"] <= pd.Timestamp(stop))
    )

    if resolution:
        mask = mask & (df["resolution"] == resolution)

    result = df[mask][["date", "x", "y", "z"]].copy()
    result["date"] = result["date"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    return jsonify(result.to_dict(orient="records"))


@app.route("/api/predictions")
def api_predictions():
    planet = request.args.get("planet", "")
    start = request.args.get("start", "")
    stop = request.args.get("stop", "")

    if not planet:
        return jsonify({"error": "Missing required param: planet"}), 400

    if not PREDICTIONS_PARQUET.exists():
        return jsonify({"error": "Predictions not computed yet"}), 503

    df = pd.read_parquet(PREDICTIONS_PARQUET)
    df["date"] = pd.to_datetime(df["date"])

    mask = df["planet"] == planet
    if start:
        mask = mask & (df["date"] >= pd.Timestamp(start))
    if stop:
        mask = mask & (df["date"] <= pd.Timestamp(stop))

    result = df[mask][["date", "x_pred", "y_pred", "z_pred"]].copy()
    result["date"] = result["date"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    return jsonify(result.to_dict(orient="records"))


@app.route("/api/live")
def api_live():
    planet = request.args.get("planet", "")
    if not planet:
        return jsonify({"error": "Missing required param: planet"}), 400

    if planet not in PLANET_MAP:
        return jsonify({"error": f"Unknown planet: {planet}"}), 400

    if toolkit is None:
        return jsonify({"error": "Toolkit not initialized"}), 503

    try:
        from datetime import timezone
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        x, y, z = toolkit.get_position(planet, now)

        # Kepler prediction for same time
        xp, yp, zp = toolkit.compute_kepler_prediction(planet, now)
        deviation_km = np.sqrt((x - xp)**2 + (y - yp)**2 + (z - zp)**2) * AU_TO_KM

        return jsonify({
            "planet": planet,
            "date": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "x": x, "y": y, "z": z,
            "x_pred": xp, "y_pred": yp, "z_pred": zp,
            "deviation_km": round(deviation_km, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/deviation")
def api_deviation():
    planet = request.args.get("planet", "")
    if not planet:
        return jsonify({"error": "Missing required param: planet"}), 400

    if planet not in PLANET_MAP:
        return jsonify({"error": f"Unknown planet: {planet}"}), 400

    if toolkit is None:
        return jsonify({"error": "Toolkit not initialized"}), 503

    try:
        from datetime import timezone
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        x, y, z = toolkit.get_position(planet, now)
        xp, yp, zp = toolkit.compute_kepler_prediction(planet, now)
        deviation_km = np.sqrt((x - xp)**2 + (y - yp)**2 + (z - zp)**2) * AU_TO_KM

        row = {
            "planet": planet,
            "date": pd.Timestamp(now),
            "x_actual": x, "y_actual": y, "z_actual": z,
            "x_predicted": xp, "y_predicted": yp, "z_predicted": zp,
            "deviation_km": round(deviation_km, 2)
        }

        # Append to deviations parquet
        new_row = pd.DataFrame([row])
        if DEVIATIONS_PARQUET.exists():
            existing = pd.read_parquet(DEVIATIONS_PARQUET)
            combined = pd.concat([existing, new_row], ignore_index=True)
        else:
            combined = new_row
        combined.to_parquet(DEVIATIONS_PARQUET, index=False)

        return jsonify(row)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/deviation/history")
def api_deviation_history():
    planet = request.args.get("planet", "")
    days = int(request.args.get("days", 30))

    if not planet:
        return jsonify({"error": "Missing required param: planet"}), 400

    if not DEVIATIONS_PARQUET.exists():
        return jsonify([])

    df = pd.read_parquet(DEVIATIONS_PARQUET)
    df["date"] = pd.to_datetime(df["date"])

    from datetime import timezone
    cutoff = pd.Timestamp(datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days))
    mask = (df["planet"] == planet) & (df["date"] >= cutoff)
    result = df[mask][["date", "deviation_km"]].copy()
    result["date"] = result["date"].dt.strftime("%Y-%m-%dT%H:%M:%S")
    return jsonify(result.to_dict(orient="records"))


@app.route("/api/status")
def api_status():
    return jsonify({
        "orbits": ORBITS_PARQUET.exists(),
        "predictions": PREDICTIONS_PARQUET.exists(),
        "planets": PLANETS_PARQUET.exists(),
        "deviations": DEVIATIONS_PARQUET.exists(),
        "port": 5000
    })


if __name__ == "__main__":
    ensure_data()
    print("\nStarting NASA JPL Server on http://0.0.0.0:5000")
    print("Access: http://127.0.0.1:5000/ or http://192.168.1.111:5000/\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
