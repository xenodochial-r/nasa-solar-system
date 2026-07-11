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
    });

    // Labels toggle
    const btnLabels = document.getElementById("btn-labels");
    if (btnLabels) {
        btnLabels.addEventListener("click", () => {
            if (typeof toggleLabels === "function") toggleLabels();
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
    window.loadDeviations = function() {
        fetch("/api/planets")
            .then(r => r.json())
            .then(planets => {
                const tbody = document.getElementById("dev-table-body");
                tbody.innerHTML = "";
                planets.forEach(p => {
                    const tr = document.createElement("tr");
                    tr.dataset.planet = p.planet;
                    tr.innerHTML = `
                        <td style="color:${p.color}">${p.planet.charAt(0).toUpperCase() + p.planet.slice(1)}</td>
                        <td id="dev-val-${p.planet}">Loading...</td>
                        <td><div class="dev-bar"><div class="dev-bar-fill" id="dev-bar-${p.planet}" style="width:0%;background:${p.color}"></div></div></td>
                        <td id="dev-time-${p.planet}">-</td>
                    `;
                    tr.addEventListener("click", () => loadDevChart(p.planet));
                    tbody.appendChild(tr);

                    // Fetch live deviation
                    fetch(`/api/deviation?planet=${p.planet}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.deviation_km !== undefined) {
                                document.getElementById(`dev-val-${p.planet}`).textContent =
                                    data.deviation_km.toLocaleString() + " km";
                                const pct = Math.min(100, data.deviation_km / 500);
                                document.getElementById(`dev-bar-${p.planet}`).style.width = pct + "%";
                                document.getElementById(`dev-time-${p.planet}`).textContent = data.date || "-";
                            }
                        })
                        .catch(() => {});
                });
            });
    };

    window.loadDevChart = function(planet) {
        document.getElementById("dev-chart-title").textContent =
            `Deviation: ${planet.charAt(0).toUpperCase() + planet.slice(1)} (last 30 days)`;
        fetch(`/api/deviation/history?planet=${planet}&days=30`)
            .then(r => r.json())
            .then(data => {
                if (window._devChart) window._devChart.destroy();
                const ctx = document.getElementById("dev-chart").getContext("2d");
                window._devChart = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: data.map(d => d.date),
                        datasets: [{
                            label: "Deviation (km)",
                            data: data.map(d => d.deviation_km),
                            borderColor: "#4fc3f7",
                            backgroundColor: "rgba(79,195,247,0.1)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { ticks: { color: "#666", maxTicksLimit: 10 }, grid: { color: "#222" } },
                            y: { ticks: { color: "#666" }, grid: { color: "#222" } }
                        },
                        plugins: { legend: { labels: { color: "#aaa" } } }
                    }
                });
            });
    };
})();
