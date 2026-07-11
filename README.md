# NASA JPL - Solar System Simulation

Interactive 3D Solar System visualization with live JPL data, historical positions, and future predictions.

[NASA Jet Propulsion Laboratory](https://www.jpl.nasa.gov/) | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)

## Quick Start

```bash
cd NASA_JPL
source .venv/bin/activate
pip install -r requirements.txt

# Compute data (first run: ~30-60 min, then instant)
python jpl_toolkit.py --compute-all

# Start server
python flask_server.py
```

Open in browser: **http://127.0.0.1:5000/** or **http://192.168.1.111:5000/**

> Port 5000 is used to avoid conflict with existing UI on port 8080.

## Features

| Feature | Description |
|---|---|
| 3D Simulation | Three.js with Sun, 14 planets/dwarf planets, Saturn rings, star field |
| Time Range | 2000 - 2100 (monthly + minute resolution) |
| Live Mode | Real-time positions from JPL Horizons API (60s updates) |
| Historical Mode | Minute-level data from Jul 2024 to Jul 2026 |
| Future Prediction | Kepler model Jul 2026 - Jul 2027 |
| Deviations | Predicted vs actual positions, separate analysis tab |
| SPICE (planned) | High-precision accuracy option (placeholder) |

## Architecture

```
Flask (port 5000)          Three.js (Browser)
    │                           │
    ├─ /api/planets             ├─ 3D Rendering
    ├─ /api/positions           ├─ Time Controls
    ├─ /api/predictions         ├─ Tab Navigation
    ├─ /api/live                └─ Deviation Charts
    └─ /api/deviation
           │
     Parquet (data/)
```

## Data Resolution

| Period | Resolution | Source | Size |
|---|---|---|---|
| 2000 - Jul 2024 | Monthly | Skyfield (de421.bsp) | ~50 KB |
| Jul 2024 - Jul 2027 | Minute | Skyfield + Kepler | ~100-150 MB |
| Jul 2026 - Jul 2027 | Minute | Kepler prediction | ~25-50 MB |

## Tabs

1. **3D Simulation** - Interactive solar system with time controls
2. **Deviations** - Table of predicted vs actual positions + Chart.js time series
3. **SPICE** - Placeholder for high-precision calculations (coming soon)

## CLI Tools

### jpl_horizons.py - JPL Horizons API Queries

```bash
# Ephemerides
python jpl_horizons.py --object Ceres --start 2026-01-01 --stop 2026-12-31 --step 7d --type ephemerides

# Orbital Elements
python jpl_horizons.py --object 433 --type elements --epoch 2026-06-15

# State Vectors
python jpl_horizons.py --object Mars --type vectors --start 2026-01-01 --stop 2026-01-31 --step 1d

# Save to Parquet
python jpl_horizons.py --object Vesta --type ephemerides --start 2026-01-01 --stop 2026-06-30 --step 30d --output data/vesta.parquet
```

### jpl_toolkit.py - Skyfield Data Engine

```bash
# Compute all data
python jpl_toolkit.py --compute-all

# Individual modes
python jpl_toolkit.py --compute-monthly
python jpl_toolkit.py --compute-minute
python jpl_toolkit.py --compute-predictions
python jpl_toolkit.py --export-metadata
```

## API Endpoints

| Endpoint | Parameters | Description |
|---|---|---|
| `GET /` | - | 3D Simulation (HTML) |
| `GET /api/planets` | - | All planet metadata |
| `GET /api/positions` | planet, start, stop, resolution | Orbital positions |
| `GET /api/predictions` | planet, start, stop | Kepler predictions |
| `GET /api/live` | planet | Current position (JPL API) |
| `GET /api/deviation` | planet | Current deviation + save |
| `GET /api/deviation/history` | planet, days | Deviation time series |
| `GET /api/status` | - | Data availability check |

## Planets (14 Objects)

| Object | Type | Radius (AU) | Period (yr) |
|---|---|---|---|
| Mercury | Planet | 0.387 | 0.241 |
| Venus | Planet | 0.723 | 0.615 |
| Earth | Planet | 1.000 | 1.000 |
| Mars | Planet | 1.524 | 1.881 |
| Jupiter | Planet | 5.203 | 11.86 |
| Saturn | Planet (rings) | 9.537 | 29.46 |
| Uranus | Planet | 19.19 | 84.01 |
| Neptune | Planet | 30.07 | 164.8 |
| Pluto | Dwarf planet | 39.48 | 248.0 |
| Ceres | Dwarf planet | 2.77 | 4.60 |
| Vesta | Asteroid | 2.36 | 3.63 |
| Eris | Dwarf planet | 67.67 | 557.0 |
| Haumea | Dwarf planet | 43.13 | 283.0 |
| Makemake | Dwarf planet | 45.79 | 309.0 |

## Files

```
NASA_JPL/
├── .venv/                    Python virtual environment
├── data/
│   ├── orbits.parquet        All orbital data (2000-2100)
│   ├── predictions.parquet   Kepler predictions
│   ├── deviations.parquet    Collected deviations
│   └── planets.parquet       Planet metadata
├── js/
│   ├── main.js               Three.js scene
│   ├── planets.js            Planet database
│   ├── ui.js                 Time controls + tabs
│   └── deviations.js         Deviation module
├── templates/
│   └── index.html            Flask template (3 tabs)
├── flask_server.py           API server (port 5000)
├── jpl_toolkit.py            Skyfield data engine
├── jpl_horizons.py           JPL Horizons CLI tool
├── requirements.txt          Dependencies
└── README.md                 This file
```

## Further Resources

- [JPL Horizons Documentation](https://ssd.jpl.nasa.gov/horizons/) - Official API specification
- [SPICE Toolkit (NAIF)](https://naif.jpl.nasa.gov/naif/toolkit.html) - SPICE kernel documentation
- [Three.js Examples](https://threejs.org/examples/) - CSS2DRenderer and planet textures
- [Skyfield Documentation](https://rhodesmill.org/skyfield/) - Astronomical calculations in Python
