/**
 * NASA JPL - Three.js 3D Solar System Simulation
 * Professional visualization with textures, bloom, orbital inclination.
 * Labels use manual DOM projection (no CSS2DRenderer).
 */

let scene, camera, renderer, controls;
let composer;
let planetMeshes = {};
let orbitLines = {};
let sunMesh, sunGlow, sunLight;
let animationId;
let currentDate = new Date();
let speed = 1;
let paused = false;
let isLive = false;

const SCALE = 50;
const texLoader = new THREE.TextureLoader();
const _projVec = new THREE.Vector3();

let selectedPlanet = null;
let cameraTarget = null;
let cameraTargetLook = null;
let isAnimatingCamera = false;
let labelsVisible = true;
let labelElements = {};
let labelOverlay = null;

function initScene() {
    const container = document.getElementById("canvas-container");

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.01, 10000
    );
    camera.position.set(0, 60, 120);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.8, 0.4, 0.85
    ));

    // Manual label overlay (pure DOM, no CSS2DRenderer)
    labelOverlay = document.createElement("div");
    labelOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:hidden;";
    container.appendChild(labelOverlay);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 1500;
    controls.enablePan = true;
    controls.zoomSpeed = 2.0;
    controls.rotateSpeed = 0.8;

    sunLight = new THREE.PointLight(0xffffff, 2.5, 2000, 0.5);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x111122, 0.15));

    createSun();
    createMilkyWay();
    createPlanets();
    createLabels();

    renderer.domElement.addEventListener("click", onPlanetClick);
    renderer.domElement.style.cursor = "pointer";
    window.addEventListener("resize", onResize);
}

// ---------------------------------------------------------------------------
//  SUN
// ---------------------------------------------------------------------------
function createSun() {
    const sunGeo = new THREE.SphereGeometry(2, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ map: texLoader.load("/static/textures/sun.jpg") });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256; glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,220,100,1.0)");
    g.addColorStop(0.2, "rgba(255,180,50,0.6)");
    g.addColorStop(0.5, "rgba(255,140,20,0.15)");
    g.addColorStop(1, "rgba(255,100,0,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sunGlow.scale.set(14, 14, 1);
    scene.add(sunGlow);
}

// ---------------------------------------------------------------------------
//  MILKY WAY
// ---------------------------------------------------------------------------
function createMilkyWay() {
    const tex = texLoader.load("/static/textures/milkyway.jpg");
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    scene.background = tex;
}

// ---------------------------------------------------------------------------
//  PLANETS
// ---------------------------------------------------------------------------
function createPlanets() {
    for (const [key, planet] of Object.entries(PLANETS)) {
        const meshSize = planet.size * 0.35;
        const geo = new THREE.SphereGeometry(meshSize, 48, 48);
        let mat;
        if (planet.texture) {
            const tex = texLoader.load("/static/textures/" + planet.texture);
            tex.encoding = THREE.sRGBEncoding;
            mat = new THREE.MeshPhongMaterial({ map: tex, shininess: 15 });
        } else {
            mat = new THREE.MeshPhongMaterial({ color: planet.color, shininess: 10 });
        }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { key, planet };
        scene.add(mesh);
        planetMeshes[key] = mesh;

        // Atmosphere
        if (key === "earth" || key === "venus") {
            const aGeo = new THREE.SphereGeometry(meshSize * 1.08, 32, 32);
            const aMat = new THREE.MeshPhongMaterial({
                color: key === "earth" ? 0x4488ff : 0xffcc88,
                transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false
            });
            mesh.add(new THREE.Mesh(aGeo, aMat));
        }

        // Rings
        if (planet.rings) {
            const tex = planet.ringTexture ? texLoader.load("/static/textures/" + planet.ringTexture) : null;
            if (tex) tex.encoding = THREE.sRGBEncoding;
            const rGeo = new THREE.RingGeometry(meshSize * planet.ringInner, meshSize * planet.ringOuter, tex ? 96 : 64);
            const rMat = tex
                ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false })
                : new THREE.MeshBasicMaterial({ color: 0xc8b888, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false });
            const ring = new THREE.Mesh(rGeo, rMat);
            ring.rotation.x = -Math.PI / 2;
            ring.rotation.y = (planet.ringTilt || 26.73) * Math.PI / 180;
            mesh.add(ring);
        }

        // Orbit line (with inclination)
        const orbitPoints = orbitPath(planet, 256).map(p => new THREE.Vector3(p.x * SCALE, p.y * SCALE, p.z * SCALE));
        const oGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const oMat = new THREE.LineBasicMaterial({ color: planet.color, transparent: true, opacity: 0.10 });
        const oLine = new THREE.Line(oGeo, oMat);
        scene.add(oLine);
        orbitLines[key] = oLine;

        // Gas giant glow
        if (["jupiter", "saturn", "uranus", "neptune"].includes(key)) {
            const c = document.createElement("canvas");
            c.width = 128; c.height = 128;
            const cx = c.getContext("2d");
            const gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
            const hex = "#" + planet.color.toString(16).padStart(6, "0");
            gr.addColorStop(0, hex + "40"); gr.addColorStop(0.5, hex + "10"); gr.addColorStop(1, hex + "00");
            cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
            }));
            sp.scale.set(meshSize * 3, meshSize * 3, 1);
            mesh.add(sp);
        }
    }
}

// ---------------------------------------------------------------------------
//  DOM LABELS (replaces CSS2DRenderer)
// ---------------------------------------------------------------------------
function createLabels() {
    for (const [key, planet] of Object.entries(PLANETS)) {
        const div = document.createElement("div");
        div.textContent = planet.name;
        div.style.cssText = "position:absolute;color:#fff;font:500 11px 'Segoe UI',system-ui,sans-serif;white-space:nowrap;text-shadow:0 0 6px #000,0 0 12px #000;opacity:0.9;transform:translate(-50%,-100%);pointer-events:none;";
        labelOverlay.appendChild(div);
        labelElements[key] = div;
    }
}

function updateLabels() {
    const container = document.getElementById("canvas-container");
    const w = container.clientWidth;
    const h = container.clientHeight;

    for (const [key, planet] of Object.entries(PLANETS)) {
        const el = labelElements[key];
        if (!el) continue;

        if (!labelsVisible) { el.style.display = "none"; continue; }

        const mesh = planetMeshes[key];
        if (!mesh) { el.style.display = "none"; continue; }

        _projVec.copy(mesh.position);
        const meshSize = planet.size * 0.35;
        _projVec.y += meshSize + 0.8;
        _projVec.project(camera);

        // Behind camera or off screen
        if (_projVec.z > 1 || _projVec.z < -1) {
            el.style.display = "none";
            continue;
        }

        const x = (_projVec.x * 0.5 + 0.5) * w;
        const y = (-_projVec.y * 0.5 + 0.5) * h;

        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
            el.style.display = "none";
            continue;
        }

        el.style.display = "";
        el.style.left = x + "px";
        el.style.top = y + "px";
    }
}

// ---------------------------------------------------------------------------
//  UPDATE POSITIONS
// ---------------------------------------------------------------------------
function updatePlanetPositions(date) {
    for (const [key, planet] of Object.entries(PLANETS)) {
        const pos = keplerPosition(planet, date);
        planetMeshes[key].position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
        planetMeshes[key].rotation.y += 0.002 * speed;
    }
}

// ---------------------------------------------------------------------------
//  RESIZE
// ---------------------------------------------------------------------------
function onResize() {
    const container = document.getElementById("canvas-container");
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
}

// ---------------------------------------------------------------------------
//  ANIMATION LOOP
// ---------------------------------------------------------------------------
function animate() {
    animationId = requestAnimationFrame(animate);

    if (!paused) {
        if (isLive) {
            currentDate = new Date();
        } else {
            currentDate = new Date(currentDate.getTime() + speed * 0.003 * 86400000);
        }
        updatePlanetPositions(currentDate);
    }

    if (sunMesh) sunMesh.rotation.y += 0.001;
    if (sunGlow) sunGlow.material.rotation += 0.001;

    // Camera fly-to
    if (isAnimatingCamera && cameraTarget) {
        camera.position.lerp(cameraTarget, 0.04);
        controls.target.lerp(cameraTargetLook || new THREE.Vector3(0, 0, 0), 0.04);
        if (camera.position.distanceTo(cameraTarget) < 0.5) {
            isAnimatingCamera = false;
            camera.position.copy(cameraTarget);
            controls.target.copy(cameraTargetLook);
        }
    }

    controls.update();
    composer.render();
    updateLabels();
}

function startAnimation() {
    currentDate = new Date();
    updatePlanetPositions(currentDate);
    animate();
}

// ---------------------------------------------------------------------------
//  CLICK INTERACTION
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPlanetClick(event) {
    const container = document.getElementById("canvas-container");
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(Object.values(planetMeshes), false);

    if (hits.length > 0 && hits[0].object.userData.planet) {
        const d = hits[0].object.userData;
        selectPlanet(d.key, d.planet, hits[0].object);
    } else {
        deselectPlanet();
    }
}

function selectPlanet(key, planet, mesh) {
    selectedPlanet = key;
    const panel = document.getElementById("info-panel");
    if (panel) {
        const dist = mesh.position.length() / SCALE;
        const distKm = (dist * 149597870.7).toFixed(0);
        panel.innerHTML = `
            <div class="info-header">
                <span class="info-name">${planet.name}</span>
                <button class="info-close" onclick="deselectPlanet()">&times;</button>
            </div>
            <div class="info-row"><span>Diameter</span><span>${planet.realDiameter.toLocaleString()} km</span></div>
            <div class="info-row"><span>Distance</span><span>${dist.toFixed(3)} AU</span></div>
            <div class="info-row"><span>Distance</span><span>${Number(distKm).toLocaleString()} km</span></div>
            <div class="info-row"><span>Period</span><span>${planet.periodYr} years</span></div>
            <div class="info-row"><span>Eccentricity</span><span>${planet.eccentricity}</span></div>
            <div class="info-row"><span>Inclination</span><span>${planet.inclination}&deg;</span></div>`;
        panel.classList.add("visible");
    }

    const meshSize = planet.size * 0.35;
    const offset = meshSize * 6 + 3;
    const p = mesh.position;
    cameraTarget = new THREE.Vector3(p.x + offset, p.y + offset * 0.5, p.z + offset);
    cameraTargetLook = p.clone();
    isAnimatingCamera = true;

    for (const [k, line] of Object.entries(orbitLines)) {
        line.material.opacity = k === key ? 0.5 : 0.05;
    }
}

function deselectPlanet() {
    selectedPlanet = null;
    const panel = document.getElementById("info-panel");
    if (panel) panel.classList.remove("visible");
    for (const line of Object.values(orbitLines)) line.material.opacity = 0.10;
    cameraTarget = new THREE.Vector3(0, 60, 120);
    cameraTargetLook = new THREE.Vector3(0, 0, 0);
    isAnimatingCamera = true;
}

// ---------------------------------------------------------------------------
//  LABEL TOGGLE
// ---------------------------------------------------------------------------
function toggleLabels() {
    labelsVisible = !labelsVisible;
    const btn = document.getElementById("btn-labels");
    if (btn) btn.classList.toggle("active", labelsVisible);
}
