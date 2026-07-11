#!/usr/bin/env python3
"""
JPL Planet Data Toolkit
=======================
Skyfield-based computation of planetary positions.
Exports to Parquet for Flask API consumption.

Modes:
  - monthly:     2000-2024, 1 month steps
  - minute:      Jul 2024 - Jul 2027, 1 minute steps
  - predictions: Jul 2026 - Jul 2027, Kepler-only (no perturbations)
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from skyfield.api import load

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

ORBITS_PARQUET = DATA_DIR / "orbits.parquet"
PREDICTIONS_PARQUET = DATA_DIR / "predictions.parquet"
PLANETS_PARQUET = DATA_DIR / "planets.parquet"
DEVIATIONS_PARQUET = DATA_DIR / "deviations.parquet"

AU_TO_KM = 149_597_870.7

MAJOR_PLANETS = {
    "mercury":  ("mercury", None),
    "venus":    ("venus", None),
    "earth":    ("earth", None),
    "mars":     ("mars", None),
    "jupiter":  ("jupiter barycenter", None),
    "saturn":   ("saturn barycenter", None),
    "uranus":   ("uranus barycenter", None),
    "neptune":  ("neptune barycenter", None),
    "pluto":    ("pluto barycenter", None),
}

MINOR_BODIES = {
    "ceres":    {"radius_au": 2.77,  "period_yr": 4.60,  "start_angle": 1.20},
    "vesta":    {"radius_au": 2.36,  "period_yr": 3.63,  "start_angle": 0.50},
    "eris":     {"radius_au": 67.67, "period_yr": 557.0, "start_angle": 2.80},
    "haumea":   {"radius_au": 43.13, "period_yr": 283.0, "start_angle": 3.40},
    "makemake": {"radius_au": 45.79, "period_yr": 309.0, "start_angle": 1.90},
}

PLANET_MAP = {**MAJOR_PLANETS, **{k: None for k in MINOR_BODIES}}

PLANET_META = {
    "mercury":  {"color": "#b5b5b5", "size": 0.35, "radius_au": 0.387, "period_yr": 0.241},
    "venus":    {"color": "#e8cda0", "size": 0.95, "radius_au": 0.723, "period_yr": 0.615},
    "earth":    {"color": "#6b93d6", "size": 1.00, "radius_au": 1.000, "period_yr": 1.000},
    "mars":     {"color": "#c1440e", "size": 0.53, "radius_au": 1.524, "period_yr": 1.881},
    "jupiter":  {"color": "#c88b3a", "size": 5.00, "radius_au": 5.203, "period_yr": 11.86},
    "saturn":   {"color": "#ead6b8", "size": 4.20, "radius_au": 9.537, "period_yr": 29.46, "rings": True},
    "uranus":   {"color": "#d1e7e7", "size": 2.80, "radius_au": 19.19, "period_yr": 84.01},
    "neptune":  {"color": "#5b5ddf", "size": 2.70, "radius_au": 30.07, "period_yr": 164.8},
    "pluto":    {"color": "#c2a07a", "size": 0.20, "radius_au": 39.48, "period_yr": 248.0},
    "ceres":    {"color": "#aaaaaa", "size": 0.25, "radius_au": 2.77,  "period_yr": 4.60},
    "vesta":    {"color": "#bbbb99", "size": 0.22, "radius_au": 2.36,  "period_yr": 3.63},
    "eris":     {"color": "#99bbcc", "size": 0.30, "radius_au": 67.67, "period_yr": 557.0},
    "haumea":   {"color": "#ccbbaa", "size": 0.25, "radius_au": 43.13, "period_yr": 283.0},
    "makemake": {"color": "#dd9988", "size": 0.25, "radius_au": 45.79, "period_yr": 309.0},
}


class JPLPlanetToolkit:
    def __init__(self):
        print("Loading Skyfield ephemeris (de421.bsp)...")
        self.ts = load.timescale()
        self.planets_data = load("de421.bsp")
        self.sun = self.planets_data["sun"]
        print("Ready.")

    def _get_body(self, planet_name):
        skyfield_name, id_type = MAJOR_PLANETS[planet_name.lower()]
        return self.planets_data[skyfield_name]

    def _is_minor(self, planet_name):
        return planet_name.lower() in MINOR_BODIES

    def get_position(self, planet_name, dt):
        if self._is_minor(planet_name):
            return self._kepler_position(planet_name, dt)
        body = self._get_body(planet_name)
        t = self.ts.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
        pos = body.at(t).position.au
        sun_pos = self.sun.at(t).position.au
        rel = pos - sun_pos
        return float(rel[0]), float(rel[1]), float(rel[2])

    def _kepler_position(self, planet_name, dt):
        meta = MINOR_BODIES[planet_name]
        period = meta["period_yr"]
        radius = meta["radius_au"]
        start_angle = meta["start_angle"]
        j2000 = datetime(2000, 1, 1)
        years = (dt - j2000).total_seconds() / (365.25 * 86400)
        theta = 2 * np.pi * (years / period) + start_angle
        x = radius * np.cos(theta)
        z = radius * np.sin(theta)
        return float(x), 0.0, float(z)

    def get_live_position(self, planet_name):
        return self.get_position(planet_name, datetime.utcnow())

    def compute_monthly(self, start_year=2000, stop_year=2024):
        print(f"Computing monthly orbits {start_year}-01 to {stop_year}-12...")
        rows = []
        total_months = (stop_year - start_year + 1) * 12
        count = 0
        for year in range(start_year, stop_year + 1):
            for month in range(1, 13):
                dt = datetime(year, month, 1)
                for planet_name in PLANET_MAP:
                    x, y, z = self.get_position(planet_name, dt)
                    rows.append({
                        "planet": planet_name,
                        "date": pd.Timestamp(dt),
                        "x": x, "y": y, "z": z,
                        "resolution": "monthly"
                    })
                count += 1
                if count % 12 == 0:
                    print(f"  Monthly: {count}/{total_months} months done")
        df = pd.DataFrame(rows)
        return df

    def compute_minute_range(self, start_dt, stop_dt, label="minute"):
        print(f"Computing {label} data: {start_dt} to {stop_dt}...")
        total_minutes = int((stop_dt - start_dt).total_seconds() / 60)
        rows = []
        count = 0
        current = start_dt
        while current <= stop_dt:
            for planet_name in PLANET_MAP:
                x, y, z = self.get_position(planet_name, current)
                rows.append({
                    "planet": planet_name,
                    "date": pd.Timestamp(current),
                    "x": x, "y": y, "z": z,
                    "resolution": label
                })
            count += 1
            if count % 10000 == 0:
                pct = count / total_minutes * 100
                print(f"  {label}: {count}/{total_minutes} minutes ({pct:.1f}%)")
            current += timedelta(minutes=1)
        df = pd.DataFrame(rows)
        return df

    def compute_kepler_prediction(self, planet_name, dt):
        meta = PLANET_META[planet_name]
        period = meta["period_yr"]
        radius = meta["radius_au"]
        j2000 = datetime(2000, 1, 1)
        years = (dt - j2000).total_seconds() / (365.25 * 86400)
        theta = 2 * np.pi * (years / period)
        x = radius * np.cos(theta)
        z = radius * np.sin(theta)
        return float(x), 0.0, float(z)

    def compute_predictions(self, start_dt, stop_dt):
        print(f"Computing Kepler predictions: {start_dt} to {stop_dt}...")
        total_minutes = int((stop_dt - start_dt).total_seconds() / 60)
        rows = []
        count = 0
        current = start_dt
        while current <= stop_dt:
            for planet_name in PLANET_MAP:
                x, y, z = self.compute_kepler_prediction(planet_name, current)
                rows.append({
                    "planet": planet_name,
                    "date": pd.Timestamp(current),
                    "x_pred": x, "y_pred": y, "z_pred": z,
                })
            count += 1
            if count % 10000 == 0:
                pct = count / total_minutes * 100
                print(f"  predictions: {count}/{total_minutes} minutes ({pct:.1f}%)")
            current += timedelta(minutes=1)
        df = pd.DataFrame(rows)
        return df

    def export_planets_metadata(self):
        rows = []
        for name, meta in PLANET_META.items():
            rows.append({
                "planet": name,
                "color": meta["color"],
                "size": meta["size"],
                "radius_au": meta["radius_au"],
                "period_yr": meta["period_yr"],
                "rings": meta.get("rings", False),
            })
        return pd.DataFrame(rows)

    def compute_all(self):
        print("=" * 60)
        print("JPL PLANET TOOLKIT - Full Compute")
        print("=" * 60)

        # 1. Monthly data (2000-2024)
        df_monthly = self.compute_monthly(2000, 2024)
        print(f"Monthly: {len(df_monthly)} rows")

        # 2. Minute data - historical (Jul 2024 - Jul 2026)
        df_minute_hist = self.compute_minute_range(
            datetime(2024, 7, 1), datetime(2026, 7, 11), label="minute"
        )
        print(f"Minute (historical): {len(df_minute_hist)} rows")

        # 3. Minute data - future (Jul 2026 - Jul 2027)
        df_minute_future = self.compute_minute_range(
            datetime(2026, 7, 12), datetime(2027, 7, 11), label="minute"
        )
        print(f"Minute (future): {len(df_minute_future)} rows")

        # Combine all orbits
        df_orbits = pd.concat([df_monthly, df_minute_hist, df_minute_future], ignore_index=True)
        df_orbits.to_parquet(ORBITS_PARQUET, index=False)
        size_mb = os.path.getsize(ORBITS_PARQUET) / (1024 * 1024)
        print(f"Saved orbits.parquet: {len(df_orbits)} rows, {size_mb:.1f} MB")

        # 4. Predictions (Kepler only, Jul 2026 - Jul 2027)
        df_pred = self.compute_predictions(datetime(2026, 7, 12), datetime(2027, 7, 11))
        df_pred.to_parquet(PREDICTIONS_PARQUET, index=False)
        size_mb = os.path.getsize(PREDICTIONS_PARQUET) / (1024 * 1024)
        print(f"Saved predictions.parquet: {len(df_pred)} rows, {size_mb:.1f} MB")

        # 5. Planet metadata
        df_meta = self.export_planets_metadata()
        df_meta.to_parquet(PLANETS_PARQUET, index=False)
        print(f"Saved planets.parquet: {len(df_meta)} rows")

        # 6. Empty deviations file
        if not DEVIATIONS_PARQUET.exists():
            pd.DataFrame(columns=[
                "planet", "date", "x_actual", "y_actual", "z_actual",
                "x_predicted", "y_predicted", "z_predicted", "deviation_km"
            ]).to_parquet(DEVIATIONS_PARQUET, index=False)
            print("Created empty deviations.parquet")

        print("=" * 60)
        print("ALL DONE!")
        print("=" * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="JPL Planet Data Toolkit")
    parser.add_argument("--compute-all", action="store_true", help="Compute all data (monthly + minute + predictions)")
    parser.add_argument("--compute-monthly", action="store_true", help="Compute monthly data only")
    parser.add_argument("--compute-minute", action="store_true", help="Compute minute-level data only")
    parser.add_argument("--compute-predictions", action="store_true", help="Compute Kepler predictions only")
    parser.add_argument("--export-metadata", action="store_true", help="Export planet metadata only")
    args = parser.parse_args()

    toolkit = JPLPlanetToolkit()

    if args.compute_all:
        toolkit.compute_all()
    elif args.compute_monthly:
        df = toolkit.compute_monthly(2000, 2024)
        df.to_parquet(ORBITS_PARQUET, index=False)
        print(f"Saved {len(df)} monthly rows to {ORBITS_PARQUET}")
    elif args.compute_minute:
        df = toolkit.compute_minute_range(datetime(2024, 7, 1), datetime(2027, 7, 11))
        df.to_parquet(ORBITS_PARQUET, index=False)
        print(f"Saved {len(df)} minute rows to {ORBITS_PARQUET}")
    elif args.compute_predictions:
        df = toolkit.compute_predictions(datetime(2026, 7, 12), datetime(2027, 7, 11))
        df.to_parquet(PREDICTIONS_PARQUET, index=False)
        print(f"Saved {len(df)} prediction rows to {PREDICTIONS_PARQUET}")
    elif args.export_metadata:
        df = toolkit.export_planets_metadata()
        df.to_parquet(PLANETS_PARQUET, index=False)
        print(f"Saved {len(df)} planet metadata rows")
    else:
        print("No action specified. Use --compute-all or individual flags.")
        print("Example: python jpl_toolkit.py --compute-all")
