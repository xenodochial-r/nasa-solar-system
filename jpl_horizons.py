#!/usr/bin/env python3
"""
NASA JPL Horizons - Live, Historical & Pre-computed Solar System Data
=====================================================================

Fetch ephemerides, orbital elements, and state vectors for any Solar System
body using the JPL Horizons system via astroquery.

Usage:
    python jpl_horizons.py --object Ceres --start 2026-01-01 --stop 2026-12-31 --step 7d --type ephemerides
    python jpl_horizons.py --object 433 --type elements --epoch 2026-06-15
    python jpl_horizons.py --object Mars --type vectors --start 2026-01-01 --stop 2026-01-31 --step 1d
"""

import argparse
import os
import sys
from datetime import datetime

import pandas as pd
from astroquery.jplhorizons import Horizons


def fetch_ephemerides(obj_id, start, stop, step, location="500", id_type=None):
    """Fetch observer ephemerides (RA, DEC, distance, magnitude, etc.)."""
    epochs = {"start": start, "stop": stop, "step": step}
    horizons = Horizons(id=obj_id, location=location, epochs=epochs, id_type=id_type)
    result = horizons.ephemerides()
    return result.to_pandas()


def fetch_elements(obj_id, epoch=None, location="@10", id_type=None):
    """Fetch orbital elements (a, e, i, Omega, omega, M, etc.)."""
    if epoch:
        from astropy.time import Time
        t = Time(epoch)
        epochs = t.tdb.jd
    else:
        epochs = None
    horizons = Horizons(id=obj_id, location=location, epochs=epochs, id_type=id_type)
    result = horizons.elements()
    return result.to_pandas()


def fetch_vectors(obj_id, start, stop, step, location="@10", id_type=None):
    """Fetch state vectors (x, y, z, vx, vy, vz)."""
    epochs = {"start": start, "stop": stop, "step": step}
    horizons = Horizons(id=obj_id, location=location, epochs=epochs, id_type=id_type)
    result = horizons.vectors()
    return result.to_pandas()


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Solar System data from JPL Horizons"
    )
    parser.add_argument("--object", "-o", required=True, help="Target object (name, ID, or designation)")
    parser.add_argument("--type", "-t", required=True, choices=["ephemerides", "elements", "vectors"],
                        help="Query type: ephemerides, elements, or vectors")
    parser.add_argument("--start", "-s", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--stop", "-e", help="Stop date (YYYY-MM-DD)")
    parser.add_argument("--step", "-p", default="1d", help="Step size (default: 1d)")
    parser.add_argument("--epoch", help="Single epoch for elements query (YYYY-MM-DD)")
    parser.add_argument("--location", "-l", default=None,
                        help="Observer location code (default: 500 for ephemerides, @10 for elements/vectors)")
    parser.add_argument("--id-type", choices=["smallbody", "designation", "name", "asteroid_name", "comet_name"],
                        help="Horizons ID type filter")
    parser.add_argument("--output", help="Save result to Parquet file (e.g. data/ceres.parquet)")

    args = parser.parse_args()
    id_type = args.id_type

    print(f"Querying JPL Horizons for '{args.object}' ({args.type})...")
    print(f"  Location: {args.location}")
    if args.start and args.stop:
        print(f"  Period: {args.start} to {args.step} step {args.step}")

    try:
        if args.type == "ephemerides":
            if not args.start or not args.stop:
                print("Error: --start and --stop are required for ephemerides query.")
                sys.exit(1)
            location = args.location or "500"
            df = fetch_ephemerides(args.object, args.start, args.stop, args.step,
                                   location=location, id_type=id_type)
            key_cols = ["datetime_str", "RA", "DEC", "V", "r", "delta", "elong", "alpha"]
        elif args.type == "elements":
            location = args.location or "@10"
            df = fetch_elements(args.object, epoch=args.epoch, location=location, id_type=id_type)
            key_cols = ["targetname", "datetime_str", "e", "q", "a", "incl", "Omega", "w", "M", "P"]
        elif args.type == "vectors":
            if not args.start or not args.stop:
                print("Error: --start and --stop are required for vectors query.")
                sys.exit(1)
            location = args.location or "@10"
            df = fetch_vectors(args.object, args.start, args.stop, args.step,
                               location=location, id_type=id_type)
            key_cols = ["datetime_str", "x", "y", "z", "vx", "vy", "vz", "range"]

        available = [c for c in key_cols if c in df.columns]
        print(f"\nResult: {len(df)} rows\n")
        print(df[available].to_string(index=False))

        if args.output:
            path = args.output if args.output.endswith(".parquet") else args.output + ".parquet"
            df.to_parquet(path, index=False)
            print(f"\nSaved to {path} ({os.path.getsize(path) / 1024:.1f} KB)")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
