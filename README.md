# NASA JPL - Solar System Simulation

Interactive 3D Solar System with live NASA/Skyfield positions, Kepler forecasts, and forecast accuracy tracking.

[NASA Jet Propulsion Laboratory](https://www.jpl.nasa.gov/) | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)

## Quick Start

```bash
cd NASA_JPL
source .venv/bin/activate
pip install -r requirements.txt

# Compute data (first run: ~45 min, then instant)
python jpl_toolkit.py --compute-all

# Start server
python flask_server.py
```

Open in browser: **http://127.0.0.1:5000/**

> Port 5000 avoids conflict with existing UI on port 8080.

## Features

| Feature | Description |
|---|---|
| 3D Simulation | Three.js with Sun, 14 bodies, Saturn rings, bloom, Milky Way skybox |
| Time Range | 2000 - 2027 (monthly + minute resolution) |
| Live Skyfield Mode | Real-time DE421 ephemeris positions via `/api/live/all` (15s updates) |
| Kepler Fallback | Client-side Kepler positions between API responses (smooth animation) |
| Orbit Toggle | Per-planet checkboxes to show/hide orbit lines (planets ON / minor bodies OFF by default) |
| Labels Toggle | DOM-projected planet labels (no CSS2DRenderer) |
| Click-to-Fly | Camera flies to selected planet, shows info panel |
| Forecast Accuracy | Kepler vs Skyfield deviation for all 14 bodies |
| Live Forecast Tracker | Rolling comparison of +1min Kepler predictions vs actual Skyfield positions |
| Deviation Charts | Chart.js line chart of monthly Kepler error (2000-2024) |
| SPICE (placeholder) | Reserved for high-precision kernels |

## Architecture

```
Flask (port 5000)                Three.js + Chart.js (Browser)
    │                                  │
    ├─ /api/planets                     ├─ 3D Rendering (Three.js)
    ├─ /api/positions                   ├─ Time Controls (slider/speed)
    ├─ /api/predictions                 ├─ Tab Navigation
    ├─ /api/live                        ├─ Forecast Cards + Tracker
    ├─ /api/live/all       ────────────── Live Skyfield positions (15s poll)
    ├─ /api/forecast                    ├─ Deviation Chart (Chart.js)
    └─ /api/deviation                   └─ Orbit/Label Toggles
           │
     Parquet (data/)
```

## Data Resolution

| Period | Resolution | Rows | Size |
|---|---|---|---|
| 2000 - Jul 2024 | Monthly | 4,200 | 112 KB |
| Jul 2024 - Jul 2027 | Minute | 22,260,868 | 472 MB |
| Jul 2026 - Jul 2027 | Kepler predictions | ~7.8 M | 117 MB |
| 2000 - 2024 | Monthly deviations | 4,200 | 30 KB |

> Data is stored in a single `orbits.parquet` file. First compute takes ~45 minutes (chunked to avoid OOM). Subsequent starts are instant.

## Tabs

1. **3D Simulation** - Interactive solar system with time controls, orbit/label toggles
2. **Deviations** - Forecast accuracy table + Live Forecast Tracker + monthly deviation chart
3. **SPICE** - Placeholder for high-precision calculations (coming soon)

## Live Skyfield Mode

Click **"Today"** to activate:
- `/api/live/all` is polled every 15 seconds
- Planet positions come from NASA DE421 ephemeris (via Skyfield), not client-side Kepler
- Status indicator `☉ Skyfield HH:MM:SS` shows data freshness
- Falls back to smooth Kepler animation between API responses
- Slider, Pause, or Reset stops polling

## Live Forecast Tracker (Deviations Tab)

1. Open the Deviations tab
2. Click any planet → detail panel opens
3. The **Live Forecast Tracker** captures a +1min Kepler prediction every 15 seconds
4. When the next API response arrives, expired predictions are compared with actual Skyfield positions
5. Result: rolling 50-entry log of "predicted vs actual ± error km"

## API Endpoints

| Endpoint | Parameters | Description |
|---|---|---|
| `GET /` | - | 3D Simulation (HTML) |
| `GET /api/planets` | - | All planet metadata |
| `GET /api/positions` | planet, start, stop, resolution | Orbital positions |
| `GET /api/predictions` | planet, start, stop | Kepler predictions |
| `GET /api/live` | planet | Single planet live position |
| `GET /api/live/all` | - | All 14 planets live positions (used by 3D view) |
| `GET /api/forecast` | planet | Current pos + 6 forecasts (+1m/+10m/+1h/+3h/+1d/+3d) |
| `GET /api/deviation` | planet | Current Kepler vs Skyfield deviation + save |
| `GET /api/deviation/history` | planet, days | Monthly deviation time series |
| `GET /api/status` | - | Data availability check |

## Planets (14 Objects)

| Object | Type | Radius (AU) | Period (yr) | Model |
|---|---|---|---|---|
| Mercury | Planet | 0.387 | 0.241 | Skyfield (de421) |
| Venus | Planet | 0.723 | 0.615 | Skyfield |
| Earth | Planet | 1.000 | 1.000 | Skyfield |
| Mars | Planet | 1.524 | 1.881 | Skyfield |
| Jupiter | Planet | 5.203 | 11.86 | Skyfield |
| Saturn | Planet (rings) | 9.537 | 29.46 | Skyfield |
| Uranus | Planet | 19.19 | 84.01 | Skyfield |
| Neptune | Planet | 30.07 | 164.8 | Skyfield |
| Pluto | Dwarf planet | 39.48 | 248.0 | Skyfield |
| Ceres | Dwarf planet | 2.77 | 4.60 | Kepler (de421 lacks Ceres) |
| Vesta | Asteroid | 2.36 | 3.63 | Kepler |
| Eris | Dwarf planet | 67.67 | 557.0 | Kepler |
| Haumea | Dwarf planet | 43.13 | 283.0 | Kepler |
| Makemake | Dwarf planet | 45.79 | 309.0 | Kepler |

> Minor bodies (Ceres, Vesta, Eris, Haumea, Makemake) use Kepler elements since de421.bsp doesn't include them. Pluto is included in de421.

## CLI Tools

### jpl_horizons.py - JPL Horizons API Queries

```bash
python jpl_horizons.py --object Ceres --start 2026-01-01 --stop 2026-12-31 --step 7d --type ephemerides
python jpl_horizons.py --object Mars --type vectors --start 2026-01-01 --stop 2026-01-31 --step 1d
python jpl_horizons.py --object Vesta --type ephemerides --start 2026-01-01 --stop 2026-06-30 --step 30d --output data/vesta.parquet
```

### jpl_toolkit.py - Skyfield Data Engine

```bash
python jpl_toolkit.py --compute-all        # Full compute (~45 min)
python jpl_toolkit.py --compute-monthly     # 2000-2024 monthly
python jpl_toolkit.py --compute-minute      # Jul 2024 - Jul 2027 minute
python jpl_toolkit.py --compute-predictions # Kepler predictions
python jpl_toolkit.py --export-metadata     # Planet metadata
```

> The compute uses 30-day chunks with temporary Parquet files to avoid OOM on low-RAM systems.

## Files

```
NASA_JPL/
├── .venv/                     Python virtual environment
├── data/
│   ├── orbits.parquet        22M rows, 472 MB (monthly + minute positions)
│   ├── predictions.parquet   Kepler-only predictions (Jul 2026 - Jul 2027)
│   ├── deviations.parquet    Monthly Kepler errors (2000-2024)
│   └── planets.parquet       14 planet metadata
├── static/
│   ├── js/
│   │   ├── main.js           Three.js scene, Skyfield live polling, labels
│   │   ├── planets.js        Planet database + Kepler solver
│   │   ├── ui.js             Time controls, tabs, deviation + forecast tracker
│   │   └── deviations.js     Extended deviation features (reserved)
│   └── textures/            11 NASA 2K textures (sun, 8 planets, saturn_ring, milkyway)
├── templates/
│   └── index.html            Single-page 3-tab Flask template
├── flask_server.py           API server (port 5000)
├── jpl_toolkit.py            Skyfield data engine (+ chunked Parquet export)
├── jpl_horizons.py           JPL Horizons CLI tool (independent)
├── requirements.txt          Dependencies
└── README.md                 This file
```

## Technical Notes

- **Three.js v0.137.0**: Last non-module version with `examples/js/` scripts. All newer versions require ES modules.
- **No CSS2DRenderer**: v0.137 CSS2DRenderer has a cache bug in `zOrder()` that crashes when labels are behind the camera. Planet labels use manual DOM projection via `updateLabels()` in the animation loop.
- **Bloom Post-processing**: `UnrealBloomPass` for sun glow. Threshold 0.85 keeps it off planet meshes.
- **Planet Textures**: Solar System Scope (CC-BY 4.0), loaded via Three.js TextureLoader.
- **Orbital Inclination**: All 14 bodies use real inclinations. Kepler equation solved with Newton iteration.
- **Scale**: 1 AU = 50 scene units. Planet sizes compressed for visual balance (Jupiter 3.5 instead of 11.2 Earth radii).
- **Browser Caching**: Use `Ctrl+Shift+R` after code changes. Script tags use `?v=N` cache-busting.
- **GitHub**: https://github.com/xenodochial-r/nasa-solar-system

## Further Resources

- [JPL Horizons Documentation](https://ssd.jpl.nasa.gov/horizons/)
- [SPICE Toolkit (NAIF)](https://naif.jpl.nasa.gov/naif/toolkit.html)
- [Three.js](https://threejs.org/)
- [Skyfield Documentation](https://rhodesmill.org/skyfield/)
- [Solar System Scope Textures](https://www.solarsystemscope.com/) (CC-BY 4.0)
