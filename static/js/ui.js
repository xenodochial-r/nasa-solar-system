/**
 * UI Controls - Time slider, speed, tabs, granularity
 */

(function() {
    const dateDisplay = document.getElementById("date-display");
    const timeSlider = document.getElementById("time-slider");
    const speedSlider = document.getElementById("speed-slider");
    const speedDisplay = document.getElementById("speed-display");
    const btnToday = document.getElementById("btn-today");
    const btnPause = document.getElementById("btn-pause");
    const btnReset = document.getElementById("btn-reset");

    const MIN_DATE = new Date("2000-01-01").getTime();
    const MAX_DATE = new Date("2027-07-11").getTime();
    const TOTAL_MS = MAX_DATE - MIN_DATE;

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("disabled")) return;
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab + "-tab").classList.add("active");
            if (btn.dataset.tab === "deviations") loadDeviations();
        });
    });

    // Time slider
    timeSlider.addEventListener("input", () => {
        const pct = parseFloat(timeSlider.value) / 100;
        currentDate = new Date(MIN_DATE + pct * TOTAL_MS);
        isLive = false;
        btnToday.classList.remove("active");
        if (typeof stopLiveApiPoll === "function") stopLiveApiPoll();
    });

    // Speed slider
    speedSlider.addEventListener("input", () => {
        speed = parseFloat(speedSlider.value);
        speedDisplay.textContent = speed + "x";
        paused = speed === 0;
        btnPause.textContent = paused ? "Play" : "Pause";
    });

    // Today button
    btnToday.addEventListener("click", () => {
        currentDate = new Date();
        isLive = true;
        btnToday.classList.add("active");
        // Update slider to current position
        const pct = (currentDate.getTime() - MIN_DATE) / TOTAL_MS;
        timeSlider.value = Math.min(100, Math.max(0, pct * 100));
        if (typeof startLiveApiPoll === "function") startLiveApiPoll();
    });

    // Pause button
    btnPause.addEventListener("click", () => {
        paused = !paused;
        btnPause.textContent = paused ? "Play" : "Pause";
        if (paused) {
            speedSlider.value = 0;
            speed = 0;
        } else {
            speedSlider.value = 1;
            speed = 1;
        }
        speedDisplay.textContent = speed + "x";
    });

    // Reset button
    btnReset.addEventListener("click", () => {
        currentDate = new Date("2026-07-11T00:00:00Z");
        isLive = false;
        paused = false;
        speed = 1;
        speedSlider.value = 1;
        speedDisplay.textContent = "1x";
        btnPause.textContent = "Pause";
        btnToday.classList.remove("active");
        timeSlider.value = 76;
        if (typeof stopLiveApiPoll === "function") stopLiveApiPoll();
    });

    // Labels toggle
    const btnLabels = document.getElementById("btn-labels");
    if (btnLabels) {
        btnLabels.addEventListener("click", () => {
            if (typeof toggleLabels === "function") toggleLabels();
        });
    }

    // Orbit toggle panel
    const btnOrbits = document.getElementById("btn-orbits");
    const orbitPanel = document.getElementById("orbit-panel");
    const orbitCheckboxes = document.getElementById("orbit-checkboxes");
    const MINOR_BODIES = ["pluto","ceres","vesta","eris","haumea","makemake"];

    if (btnOrbits && orbitPanel) {
        btnOrbits.addEventListener("click", (e) => {
            e.stopPropagation();
            orbitPanel.classList.toggle("open");
        });

        for (const [key, planet] of Object.entries(PLANETS)) {
            const label = document.createElement("label");
            label.className = "orbit-cb-label";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = !MINOR_BODIES.includes(key);
            cb.dataset.orbit = key;
            cb.addEventListener("change", () => {
                if (typeof setOrbitVisible === "function") setOrbitVisible(key, cb.checked);
            });
            label.appendChild(cb);
            label.appendChild(document.createTextNode(" " + planet.name));
            orbitCheckboxes.appendChild(label);
        }

        document.getElementById("orbits-all").addEventListener("click", (e) => {
            e.stopPropagation();
            orbitCheckboxes.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = true;
                if (typeof setOrbitVisible === "function") setOrbitVisible(cb.dataset.orbit, true);
            });
        });
        document.getElementById("orbits-none").addEventListener("click", (e) => {
            e.stopPropagation();
            orbitCheckboxes.querySelectorAll("input[type=checkbox]").forEach(cb => {
                cb.checked = false;
                if (typeof setOrbitVisible === "function") setOrbitVisible(cb.dataset.orbit, false);
            });
        });

        document.addEventListener("click", (e) => {
            if (!orbitPanel.contains(e.target) && e.target !== btnOrbits) {
                orbitPanel.classList.remove("open");
            }
        });
    }

    // Update date display in animation loop
    setInterval(() => {
        if (currentDate) {
            const y = currentDate.getFullYear();
            const m = String(currentDate.getMonth() + 1).padStart(2, "0");
            const d = String(currentDate.getDate()).padStart(2, "0");
            const hh = String(currentDate.getHours()).padStart(2, "0");
            const mm = String(currentDate.getMinutes()).padStart(2, "0");
            const ss = String(currentDate.getSeconds()).padStart(2, "0");
            dateDisplay.textContent = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;

            // Update slider position
            if (!isLive) {
                const pct = (currentDate.getTime() - MIN_DATE) / TOTAL_MS;
                timeSlider.value = Math.min(100, Math.max(0, pct * 100));
            }
        }
    }, 250);

    // Deviation table loader
    let devInterval = null;
    let selectedDevPlanet = null;

    window.loadDeviations = function() {
        fetch("/api/planets")
            .then(r => r.json())
            .then(planets => {
                const tbody = document.getElementById("dev-table-body");
                tbody.innerHTML = "";
                planets.forEach(p => {
                    const tr = document.createElement("tr");
                    tr.dataset.planet = p.planet;
                    if (selectedDevPlanet === p.planet) tr.classList.add("active");
                    tr.innerHTML = `
                        <td style="color:${p.color};font-weight:500">${p.planet.charAt(0).toUpperCase() + p.planet.slice(1)}</td>
                        <td class="dev-val" id="dv-${p.planet}">-</td>
                        <td><div class="dev-bar"><div class="dev-bar-fill" id="db-${p.planet}" style="width:0%"></div></div></td>
                        <td class="dev-val" id="df-${p.planet}">-</td>
                    `;
                    tr.addEventListener("click", () => showDevDetail(p.planet));
                    tbody.appendChild(tr);

                    fetch(`/api/forecast?planet=${p.planet}`)
                        .then(r => r.json())
                        .then(d => {
                            document.getElementById(`dv-${p.planet}`).textContent =
                                d.deviation_km ? d.deviation_km.toLocaleString() + " km" : "-";
                            const pct = Math.min(100, (d.deviation_km || 0) / 500);
                            document.getElementById(`db-${p.planet}`).style.width = pct + "%";
                            const f1h = d.forecasts.find(f => f.horizon_minutes === 60);
                            if (f1h) {
                                const dist = Math.sqrt(f1h.x_pred**2 + f1h.y_pred**2 + f1h.z_pred**2) * 149597870.7;
                                document.getElementById(`df-${p.planet}`).textContent =
                                    dist.toLocaleString() + " km";
                            }
                            if (selectedDevPlanet === p.planet) updateDevDetail(d);
                        })
                        .catch(() => {});
                });
            });

        if (devInterval) clearInterval(devInterval);
        devInterval = setInterval(() => loadDeviations(), 15000);
    };

    window.showDevDetail = function(planet) {
        selectedDevPlanet = planet;
        document.querySelectorAll("#dev-table-body tr").forEach(r => r.classList.remove("active"));
        const row = document.querySelector(`#dev-table-body tr[data-planet="${planet}"]`);
        if (row) row.classList.add("active");

        forecastHistory.length = 0;

        const detail = document.getElementById("dev-detail");
        document.getElementById("dev-detail-title").textContent =
            `Forecast: ${planet.charAt(0).toUpperCase() + planet.slice(1)}`;

        const fetchForecast = () => {
            fetch(`/api/forecast?planet=${planet}`)
                .then(r => r.json())
                .then(d => {
                    if (selectedDevPlanet === planet) {
                        detail.classList.add("open");
                        updateDevDetail(d);
                    }
                })
                .catch(() => {});
        };

        if (trackerInterval) clearInterval(trackerInterval);
        fetchForecast();
        trackerInterval = setInterval(fetchForecast, 15000);
        renderTracker();

        loadDevChart(planet);
    };

    function updateDevDetail(d) {
        const grid = document.getElementById("forecast-grid");
        grid.innerHTML = "";
        const allItems = [
            { label: "Now", min: 0, actual: true },
            ...d.forecasts
        ];
        allItems.forEach(f => {
            const card = document.createElement("div");
            card.className = "forecast-card";
            if (f.actual) {
                const dist = Math.sqrt(d.x_actual**2 + d.y_actual**2 + d.z_actual**2) * 149597870.7;
                card.innerHTML = `
                    <div class="h-label">Now</div>
                    <div class="h-deviation">${d.deviation_km.toLocaleString()} km</div>
                    <div class="h-coord">off from Kepler</div>
                `;
            } else {
                const dist = Math.sqrt(f.x_pred**2 + f.y_pred**2 + f.z_pred**2) * 149597870.7;
                card.innerHTML = `
                    <div class="h-label">${f.label}</div>
                    <div class="h-coord">${dist.toLocaleString()} km</div>
                    <div class="h-coord" style="color:#555">waiting...</div>
                `;
            }
            grid.appendChild(card);
        });

        addForecastEntry(d);
    }

    // -----------------------------------------------------------------------
    //  LIVE FORECAST TRACKER
    // -----------------------------------------------------------------------
    window.forecastHistory = [];
    let trackerInterval = null;

    function addForecastEntry(d) {
        const now = new Date(d.current_time);
        const f1m = d.forecasts.find(f => f.horizon_minutes === 1);
        if (!f1m) return;

        const entry = {
            time: now,
            targetTime: new Date(f1m.target_time),
            x_pred: f1m.x_pred,
            y_pred: f1m.y_pred,
            z_pred: f1m.z_pred,
            checked: false,
            x_actual: null, y_actual: null, z_actual: null, error_km: null
        };

        forecastHistory.forEach(e => {
            if (!e.checked && e.targetTime <= now) {
                e.checked = true;
                e.x_actual = d.x_actual;
                e.y_actual = d.y_actual;
                e.z_actual = d.z_actual;
                const dx = e.x_actual - e.x_pred;
                const dy = e.y_actual - e.y_pred;
                const dz = e.z_actual - e.z_pred;
                e.error_km = Math.round(Math.sqrt(dx*dx + dy*dy + dz*dz) * 149597870.7);
            }
        });

        if (forecastHistory.length > 50) forecastHistory.splice(0, forecastHistory.length - 50);
        forecastHistory.push(entry);
        renderTracker();
    }

    function renderTracker() {
        const list = document.getElementById("tracker-list");
        if (!list) return;
        if (!forecastHistory.length) {
            list.innerHTML = '<div style="color:#555;padding:10px;font-size:11px;text-align:center">Waiting for forecasts...</div>';
            return;
        }
        list.innerHTML = forecastHistory.slice().reverse().map(e => {
            const t = e.time;
            const ts = String(t.getHours()).padStart(2,"0") + ":" + String(t.getMinutes()).padStart(2,"0") + ":" + String(t.getSeconds()).padStart(2,"0");
            const p = `(${e.x_pred.toFixed(3)}, ${e.y_pred.toFixed(3)}, ${e.z_pred.toFixed(3)})`;
            if (e.checked && e.error_km !== null) {
                const a = `(${e.x_actual.toFixed(3)}, ${e.y_actual.toFixed(3)}, ${e.z_actual.toFixed(3)})`;
                return `<div class="tracker-entry"><span class="t-label">${ts}</span><span class="t-pred">${p}</span><span class="t-actual">${a}</span><span class="t-error">${e.error_km.toLocaleString()} km</span></div>`;
            }
            return `<div class="tracker-entry"><span class="t-label">${ts}</span><span class="t-pred">${p}</span><span class="t-pending">waiting...</span><span></span></div>`;
        }).join('');
    }

    document.addEventListener("click", function(e) {
        if (e.target && e.target.id === "tracker-clear") {
            forecastHistory.length = 0;
            renderTracker();
        }
    });

    window.loadDevChart = function(planet) {
        fetch(`/api/deviation/history?planet=${planet}&days=9999`)
            .then(r => r.json())
            .then(data => {
                if (window._devChart) window._devChart.destroy();
                if (!data.length) {
                    document.getElementById("dev-chart").style.display = "none";
                    return;
                }
                document.getElementById("dev-chart").style.display = "block";
                const ctx = document.getElementById("dev-chart").getContext("2d");
                const labels = data.map(d => d.date.slice(0, 7));
                const vals = data.map(d => d.deviation_km);
                window._devChart = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels,
                        datasets: [{
                            label: "Kepler Error (km)",
                            data: vals,
                            borderColor: "#4fc3f7",
                            backgroundColor: "rgba(79,195,247,0.05)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 0,
                            borderWidth: 1,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                ticks: { color: "#666", maxTicksLimit: 15, maxRotation: 45 },
                                grid: { color: "#222" }
                            },
                            y: {
                                ticks: { color: "#666", callback: v => (v/1e6).toFixed(1) + "M km" },
                                grid: { color: "#222" }
                            }
                        },
                        plugins: { legend: { labels: { color: "#aaa" } } }
                    }
                });
            });
    };
})();
