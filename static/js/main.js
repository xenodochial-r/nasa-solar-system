/**
 * NASA JPL - Three.js 3D Solar System Simulation
 * Professional visualization with textures, bloom, orbital inclination.
 */

let scene, camera, renderer, labelRenderer, controls;
let composer;
let planetMeshes = {};
let orbitLines = {};
let sunMesh, sunGlow, sunLight;
let starField;
let animationId;
let currentDate = new Date();
let speed = 1;
let paused = false;
let isLive = false;

// Scale: AU -> scene units. 1 AU = SCALE units.
const SCALE = 50;

// Texture loader
const texLoader = new THREE.TextureLoader();

// Selected planet for info panel
let selectedPlanet = null;
let cameraTarget = null;
let cameraTargetLook = null;
let isAnimatingCamera = false;
let labelsVisible = true;
let planetLabels = [];

function initScene() {
    const container = document.getElementById("canvas-container");

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.01, 10000
    );
    camera.position.set(0, 60, 120);

    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Post-processing: Bloom
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.8,   // strength
        0.4,   // radius
        0.85   // threshold
    );
    composer.addPass(bloomPass);

    // CSS2D Labels
    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    container.appendChild(labelRenderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 1500;
    controls.enablePan = true;
    controls.zoomSpeed = 2.0;
    controls.rotateSpeed = 0.8;

    // Sun light (directional from center)
    sunLight = new THREE.PointLight(0xffffff, 2.5, 2000, 0.5);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Ambient fill (very dim)
    const ambientLight = new THREE.AmbientLight(0x111122, 0.15);
    scene.add(ambientLight);

    // Build scene
    createSun();
    createMilkyWay();
    createPlanets();

    // Interaction
    renderer.domElement.addEventListener("click", onPlanetClick);
    renderer.domElement.style.cursor = "pointer";

    // Resize
    window.addEventListener("resize", onResize);
}

// ---------------------------------------------------------------------------
//  SUN
// ---------------------------------------------------------------------------
function createSun() {
    const sunGeo = new THREE.SphereGeometry(2, 64, 64);
    const sunTex = texLoader.load("/static/textures/sun.jpg");
    const sunMat = new THREE.MeshBasicMaterial({
        map: sunTex,
        color: 0xffffff,
    });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.name = "sun";
    scene.add(sunMesh);

    // Inner glow sprite
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,220,100,1.0)");
    gradient.addColorStop(0.2, "rgba(255,180,50,0.6)");
    gradient.addColorStop(0.5, "rgba(255,140,20,0.15)");
    gradient.addColorStop(1, "rgba(255,100,0,0.0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    sunGlow = new THREE.Sprite(glowMat);
    sunGlow.scale.set(14, 14, 1);
    scene.add(sunGlow);
}

// ---------------------------------------------------------------------------
//  MILKY WAY SKYBOX
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
    const segments = 48;

    for (const [key, planet] of Object.entries(PLANETS)) {
        // Planet mesh size: real relative diameter (compressed for visibility)
        const meshSize = planet.size * 0.35;

        const geo = new THREE.SphereGeometry(meshSize, segments, segments);

        let mat;
        if (planet.texture) {
            const tex = texLoader.load("/static/textures/" + planet.texture);
            tex.encoding = THREE.sRGBEncoding;
            mat = new THREE.MeshPhongMaterial({
                map: tex,
                shininess: 15,
            });
        } else {
            mat = new THREE.MeshPhongMaterial({
                color: planet.color,
                shininess: 10,
            });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { key, planet };
        scene.add(mesh);
        planetMeshes[key] = mesh;

        // Atmosphere glow for Earth and Venus
        if (key === "earth" || key === "venus") {
            const atmosGeo = new THREE.SphereGeometry(meshSize * 1.08, 32, 32);
            const atmosColor = key === "earth" ? 0x4488ff : 0xffcc88;
            const atmosMat = new THREE.MeshPhongMaterial({
                color: atmosColor,
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide,
                depthWrite: false,
            });
            const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
            mesh.add(atmosMesh);
        }

        // Saturn rings
        if (planet.rings && planet.ringTexture) {
            const ringTex = texLoader.load("/static/textures/" + planet.ringTexture);
            ringTex.encoding = THREE.sRGBEncoding;
            const innerR = meshSize * planet.ringInner;
            const outerR = meshSize * planet.ringOuter;
            const ringGeo = new THREE.RingGeometry(innerR, outerR, 96);
            const ringMat = new THREE.MeshBasicMaterial({
                map: ringTex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.rotation.y = (planet.ringTilt || 26.73) * Math.PI / 180;
            mesh.add(ring);
        } else if (planet.rings) {
            // Fallback: simple colored ring
            const innerR = meshSize * planet.ringInner;
            const outerR = meshSize * planet.ringOuter;
            const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xc8b888,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.rotation.y = (planet.ringTilt || 26.73) * Math.PI / 180;
            mesh.add(ring);
        }

        // Label
        const div = document.createElement("div");
        div.className = "planet-label";
        div.textContent = planet.name;
        div.style.color = "#fff";
        div.style.fontSize = "11px";
        div.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
        div.style.fontWeight = "500";
        div.style.textShadow = "0 0 6px #000, 0 0 12px #000";
        div.style.pointerEvents = "none";
        div.style.whiteSpace = "nowrap";
        div.style.opacity = "0.9";
        const label = new THREE.CSS2DObject(div);
        label.position.set(0, meshSize + 0.6, 0);
        label.userData = { isLabel: true };
        mesh.add(label);
        planetLabels.push(label);

        // Orbit line with inclination
        const orbitPoints = orbitPath(planet, 256);
        const vectors = orbitPoints.map(p =>
            new THREE.Vector3(p.x * SCALE, p.y * SCALE, p.z * SCALE)
        );
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(vectors);
        const orbitMat = new THREE.LineBasicMaterial({
            color: planet.color,
            transparent: true,
            opacity: 0.10,
            linewidth: 1,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
        orbitLines[key] = orbitLine;

        // Glow sprite for gas giants
        if (["jupiter", "saturn", "uranus", "neptune"].includes(key)) {
            const gCanvas = document.createElement("canvas");
            gCanvas.width = 128;
            gCanvas.height = 128;
            const gCtx = gCanvas.getContext("2d");
            const gGrad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
            const hex = "#" + planet.color.toString(16).padStart(6, "0");
            gGrad.addColorStop(0, hex + "40");
            gGrad.addColorStop(0.5, hex + "10");
            gGrad.addColorStop(1, hex + "00");
            gCtx.fillStyle = gGrad;
            gCtx.fillRect(0, 0, 128, 128);
            const gTex = new THREE.CanvasTexture(gCanvas);
            const gMat = new THREE.SpriteMaterial({
                map: gTex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const gSprite = new THREE.Sprite(gMat);
            const glowSize = meshSize * 3;
            gSprite.scale.set(glowSize, glowSize, 1);
            mesh.add(gSprite);
        }
    }
}

// ---------------------------------------------------------------------------
//  UPDATE POSITIONS
// ---------------------------------------------------------------------------
function updatePlanetPositions(date) {
    for (const [key, planet] of Object.entries(PLANETS)) {
        const pos = keplerPosition(planet, date);
        const mesh = planetMeshes[key];
        mesh.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);

        // Self-rotation (slow spin based on time)
        mesh.rotation.y += 0.002 * speed;
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
    labelRenderer.setSize(w, h);
}

// ---------------------------------------------------------------------------
//  ANIMATION LOOP
// ---------------------------------------------------------------------------
function animate() {
    animationId = requestAnimationFrame(animate);

    if (!paused) {
        const msPerFrame = 1000 / 60;
        // 1 speed = ~1 day per second (60fps = ~0.0167 days per frame)
        const daysPerFrame = speed * 0.0167;
        currentDate = new Date(currentDate.getTime() + daysPerFrame * 86400000);
        updatePlanetPositions(currentDate);
    }

    // Sun rotation
    if (sunMesh) sunMesh.rotation.y += 0.001;
    if (sunGlow) sunGlow.material.rotation += 0.001;

    // Camera fly-to animation
    if (isAnimatingCamera && cameraTarget) {
        const camPos = camera.position;
        const tgtPos = cameraTarget;
        const tgtLook = cameraTargetLook || new THREE.Vector3(0, 0, 0);

        camPos.lerp(tgtPos, 0.04);
        controls.target.lerp(tgtLook, 0.04);

        const dist = camPos.distanceTo(tgtPos);
        if (dist < 0.5) {
            isAnimatingCamera = false;
            camera.position.copy(tgtPos);
            controls.target.copy(tgtLook);
        }
    }

    controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
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

    const meshes = Object.values(planetMeshes);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
        const hit = intersects[0].object;
        const data = hit.userData;
        if (data && data.planet) {
            selectPlanet(data.key, data.planet, hit);
            return;
        }
    }

    // Click on empty space -> deselect
    deselectPlanet();
}

function selectPlanet(key, planet, mesh) {
    selectedPlanet = key;

    // Update info panel
    const panel = document.getElementById("info-panel");
    if (panel) {
        const dist = mesh.position.length() / SCALE;
        const auKm = 149597870.7;
        const distKm = (dist * auKm).toFixed(0);
        panel.innerHTML = `
            <div class="info-header">
                <span class="info-name">${planet.name}</span>
                <button class="info-close" onclick="deselectPlanet()">&times;</button>
            </div>
            <div class="info-row"><span>Diameter</span><span>${planet.realDiameter.toLocaleString()} km</span></div>
            <div class="info-row"><span>Distance from Sun</span><span>${dist.toFixed(3)} AU</span></div>
            <div class="info-row"><span>Distance (km)</span><span>${Number(distKm).toLocaleString()} km</span></div>
            <div class="info-row"><span>Orbital Period</span><span>${planet.periodYr} years</span></div>
            <div class="info-row"><span>Eccentricity</span><span>${planet.eccentricity}</span></div>
            <div class="info-row"><span>Inclination</span><span>${planet.inclination}°</span></div>
        `;
        panel.classList.add("visible");
    }

    // Fly camera to planet
    const meshSize = planet.size * 0.35;
    const offset = meshSize * 6 + 3;
    const meshPos = mesh.position.clone();
    cameraTarget = new THREE.Vector3(
        meshPos.x + offset,
        meshPos.y + offset * 0.5,
        meshPos.z + offset
    );
    cameraTargetLook = meshPos.clone();
    isAnimatingCamera = true;

    // Highlight orbit line
    for (const [k, line] of Object.entries(orbitLines)) {
        line.material.opacity = k === key ? 0.5 : 0.05;
    }
}

function deselectPlanet() {
    selectedPlanet = null;
    const panel = document.getElementById("info-panel");
    if (panel) panel.classList.remove("visible");

    // Reset orbits
    for (const line of Object.values(orbitLines)) {
        line.material.opacity = 0.10;
    }

    // Fly back to overview
    cameraTarget = new THREE.Vector3(0, 60, 120);
    cameraTargetLook = new THREE.Vector3(0, 0, 0);
    isAnimatingCamera = true;
}

// ---------------------------------------------------------------------------
//  LABEL TOGGLE
// ---------------------------------------------------------------------------
function toggleLabels() {
    labelsVisible = !labelsVisible;
    for (const label of planetLabels) {
        label.visible = labelsVisible;
    }
    const btn = document.getElementById("btn-labels");
    if (btn) btn.classList.toggle("active", labelsVisible);
}
