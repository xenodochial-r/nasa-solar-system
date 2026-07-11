/**
 * NASA JPL - Three.js 3D Solar System Simulation
 */

let scene, camera, renderer, labelRenderer, controls;
let planetMeshes = {};
let orbitLines = {};
let sunMesh, sunGlow;
let starField;
let animationId;
let currentDate = new Date();
let speed = 1;
let paused = false;
let isLive = false;
let SCALE = 10;

function initScene() {
    const container = document.getElementById("canvas-container");

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(0, 80, 160);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

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
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 500;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 1000);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // Sun
    createSun();

    // Stars
    createStars();

    // Planets
    createPlanets();

    // Resize
    window.addEventListener("resize", onResize);
}

function createSun() {
    const sunGeo = new THREE.SphereGeometry(2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 0, 0);
    scene.add(sunMesh);

    // Glow
    const glowGeo = new THREE.SphereGeometry(3, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00, transparent: true, opacity: 0.3
    });
    sunGlow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(sunGlow);
}

function createStars() {
    const count = 15000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 300 + Math.random() * 700;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    starField = new THREE.Points(geo, mat);
    scene.add(starField);
}

function createPlanets() {
    const segments = 32;

    for (const [key, planet] of Object.entries(PLANETS)) {
        // Planet sphere
        const geo = new THREE.SphereGeometry(planet.size * 0.4, segments, segments);
        const mat = new THREE.MeshPhongMaterial({
            color: planet.color,
            shininess: 10,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { key, planet };
        scene.add(mesh);
        planetMeshes[key] = mesh;

        // Rings (Saturn)
        if (planet.rings) {
            const ringGeo = new THREE.RingGeometry(
                planet.size * 0.4 * planet.ringInner,
                planet.size * 0.4 * planet.ringOuter,
                64
            );
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xc8b888, side: THREE.DoubleSide, transparent: true, opacity: 0.6
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2.2;
            mesh.add(ring);
        }

        // Label
        const div = document.createElement("div");
        div.className = "planet-label";
        div.textContent = planet.name;
        div.style.color = "#fff";
        div.style.fontSize = "11px";
        div.style.fontFamily = "sans-serif";
        div.style.textShadow = "0 0 4px #000";
        div.style.pointerEvents = "none";
        const label = new THREE.CSS2DObject(div);
        label.position.set(0, planet.size * 0.4 + 0.5, 0);
        mesh.add(label);

        // Orbit line
        const orbitPoints = [];
        const orbitSegments = 128;
        for (let i = 0; i <= orbitSegments; i++) {
            const angle = (i / orbitSegments) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                planet.radiusAU * Math.cos(angle) * SCALE,
                0,
                planet.radiusAU * Math.sin(angle) * SCALE
            ));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMat = new THREE.LineBasicMaterial({
            color: planet.color, transparent: true, opacity: 0.15
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
        orbitLines[key] = orbitLine;
    }
}

function updatePlanetPositions(date) {
    for (const [key, planet] of Object.entries(PLANETS)) {
        const pos = keplerPosition(planet, date);
        const mesh = planetMeshes[key];
        mesh.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
    }
}

function onResize() {
    const container = document.getElementById("canvas-container");
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (!paused) {
        const msPerFrame = 1000 / 60;
        const daysPerFrame = speed * (msPerFrame / (1000 * 86400)) * 365.25;
        currentDate = new Date(currentDate.getTime() + daysPerFrame * 86400 * 1000 * 50);
        updatePlanetPositions(currentDate);
    }

    // Rotate sun glow
    if (sunGlow) sunGlow.rotation.y += 0.001;

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function startAnimation() {
    currentDate = new Date();
    updatePlanetPositions(currentDate);
    animate();
}
