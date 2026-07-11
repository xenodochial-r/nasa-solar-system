/**
 * Planets Database
 * Kepler orbital elements + visual parameters for all 14 objects.
 *
 * Inclination: degrees relative to ecliptic
 * Eccentricity: 0 = perfect circle, 0.99 = very elongated
 * AscendingNode: longitude of ascending node in degrees
 * ArgPerihelion: argument of perihelion in degrees
 * RealDiameter: km (for scale reference)
 * Texture: filename in /static/textures/
 */

const PLANETS = {
    mercury: {
        name: "Mercury",
        texture: "mercury.jpg",
        color: 0xb5b5b5,
        size: 0.38,          // Earth radii
        realDiameter: 4879,
        radiusAU: 0.387,
        periodYr: 0.241,
        startAngle: 1.745,
        eccentricity: 0.2056,
        inclination: 7.0,
        ascendingNode: 48.33,
        argPerihelion: 29.12,
    },
    venus: {
        name: "Venus",
        texture: "venus.jpg",
        color: 0xe8cda0,
        size: 0.95,
        realDiameter: 12104,
        radiusAU: 0.723,
        periodYr: 0.615,
        startAngle: 0.264,
        eccentricity: 0.0068,
        inclination: 3.39,
        ascendingNode: 76.68,
        argPerihelion: 54.85,
    },
    earth: {
        name: "Earth",
        texture: "earth.jpg",
        color: 0x6b93d6,
        size: 1.00,
        realDiameter: 12742,
        radiusAU: 1.000,
        periodYr: 1.000,
        startAngle: 0.0,
        eccentricity: 0.0167,
        inclination: 0.0,
        ascendingNode: 0.0,
        argPerihelion: 102.94,
    },
    mars: {
        name: "Mars",
        texture: "mars.jpg",
        color: 0xc1440e,
        size: 0.53,
        realDiameter: 6779,
        radiusAU: 1.524,
        periodYr: 1.881,
        startAngle: 5.865,
        eccentricity: 0.0934,
        inclination: 1.85,
        ascendingNode: 49.56,
        argPerihelion: 286.50,
    },
    jupiter: {
        name: "Jupiter",
        texture: "jupiter.jpg",
        color: 0xc88b3a,
        size: 3.50,          // compressed from 11.2 for visual balance
        realDiameter: 139820,
        radiusAU: 5.203,
        periodYr: 11.86,
        startAngle: 0.600,
        eccentricity: 0.0489,
        inclination: 1.31,
        ascendingNode: 100.46,
        argPerihelion: 273.87,
    },
    saturn: {
        name: "Saturn",
        texture: "saturn.jpg",
        color: 0xead6b8,
        size: 2.90,          // compressed from 9.45
        realDiameter: 116460,
        radiusAU: 9.537,
        periodYr: 29.46,
        startAngle: 0.450,
        eccentricity: 0.0565,
        inclination: 2.49,
        ascendingNode: 113.66,
        argPerihelion: 339.39,
        rings: true,
        ringTexture: "saturn_ring.png",
        ringInner: 1.1,
        ringOuter: 2.3,
        ringTilt: 26.73,
    },
    uranus: {
        name: "Uranus",
        texture: "uranus.jpg",
        color: 0xd1e7e7,
        size: 2.00,          // compressed from 4.01
        realDiameter: 50724,
        radiusAU: 19.19,
        periodYr: 84.01,
        startAngle: 5.100,
        eccentricity: 0.0457,
        inclination: 0.77,
        ascendingNode: 74.01,
        argPerihelion: 96.99,
    },
    neptune: {
        name: "Neptune",
        texture: "neptune.jpg",
        color: 0x5b5ddf,
        size: 1.90,          // compressed from 3.88
        realDiameter: 49244,
        radiusAU: 30.07,
        periodYr: 164.8,
        startAngle: 0.780,
        eccentricity: 0.0113,
        inclination: 1.77,
        ascendingNode: 131.72,
        argPerihelion: 273.19,
    },
    pluto: {
        name: "Pluto",
        texture: null,
        color: 0xc2a07a,
        size: 0.15,
        realDiameter: 2377,
        radiusAU: 39.48,
        periodYr: 248.0,
        startAngle: 3.950,
        eccentricity: 0.2488,
        inclination: 17.16,
        ascendingNode: 110.30,
        argPerihelion: 113.76,
    },
    ceres: {
        name: "Ceres",
        texture: null,
        color: 0x999999,
        size: 0.12,
        realDiameter: 946,
        radiusAU: 2.77,
        periodYr: 4.60,
        startAngle: 1.200,
        eccentricity: 0.0758,
        inclination: 10.59,
        ascendingNode: 80.33,
        argPerihelion: 73.59,
    },
    vesta: {
        name: "Vesta",
        texture: null,
        color: 0xbbbb99,
        size: 0.10,
        realDiameter: 525,
        radiusAU: 2.36,
        periodYr: 3.63,
        startAngle: 0.500,
        eccentricity: 0.0886,
        inclination: 7.14,
        ascendingNode: 103.85,
        argPerihelion: 151.23,
    },
    eris: {
        name: "Eris",
        texture: null,
        color: 0x99bbcc,
        size: 0.14,
        realDiameter: 2326,
        radiusAU: 67.67,
        periodYr: 557.0,
        startAngle: 2.800,
        eccentricity: 0.436,
        inclination: 44.04,
        ascendingNode: 35.87,
        argPerihelion: 151.43,
    },
    haumea: {
        name: "Haumea",
        texture: null,
        color: 0xccbbaa,
        size: 0.12,
        realDiameter: 1560,
        radiusAU: 43.13,
        periodYr: 283.0,
        startAngle: 3.400,
        eccentricity: 0.1912,
        inclination: 28.22,
        ascendingNode: 124.17,
        argPerihelion: 259.00,
    },
    makemake: {
        name: "Makemake",
        texture: null,
        color: 0xdd9988,
        size: 0.12,
        realDiameter: 1430,
        radiusAU: 45.79,
        periodYr: 309.0,
        startAngle: 1.900,
        eccentricity: 0.159,
        inclination: 28.96,
        ascendingNode: 79.00,
        argPerihelion: 295.40,
    },
};

const J2000 = new Date("2000-01-01T00:00:00Z");

/**
 * Kepler position with eccentricity + inclination.
 * Returns {x, y, z} in AU (ecliptic coordinates).
 */
function keplerPosition(planet, date) {
    const years = (date - J2000) / (365.25 * 24 * 3600 * 1000);
    const meanAnomaly = 2 * Math.PI * (years / planet.periodYr) + planet.startAngle;

    // Solve Kepler's equation: E - e*sin(E) = M
    let E = meanAnomaly;
    for (let i = 0; i < 10; i++) {
        E = E - (E - planet.eccentricity * Math.sin(E) - meanAnomaly) /
            (1 - planet.eccentricity * Math.cos(E));
    }

    // True anomaly
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const e = planet.eccentricity;
    const trueAnomaly = Math.atan2(
        Math.sqrt(1 - e * e) * sinE,
        cosE - e
    );

    // Distance from Sun
    const a = planet.radiusAU;
    const r = a * (1 - e * cosE);

    // Position in orbital plane
    const xOrbital = r * Math.cos(trueAnomaly);
    const yOrbital = r * Math.sin(trueAnomaly);

    // Rotate by orbital elements
    const inc = (planet.inclination || 0) * Math.PI / 180;
    const omega = (planet.ascendingNode || 0) * Math.PI / 180;
    const w = (planet.argPerihelion || 0) * Math.PI / 180;

    const cosOmega = Math.cos(omega);
    const sinOmega = Math.sin(omega);
    const cosI = Math.cos(inc);
    const sinI = Math.sin(inc);
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);

    const x = (cosOmega * Math.cos(trueAnomaly + w) -
               sinOmega * Math.sin(trueAnomaly + w) * cosI) * r;
    const z = (sinOmega * Math.cos(trueAnomaly + w) +
               cosOmega * Math.sin(trueAnomaly + w) * cosI) * r;
    const y = (Math.sin(trueAnomaly + w) * sinI) * r;

    return { x, y, z };
}

/**
 * Generate orbit path points for rendering orbit lines.
 * Returns array of {x, y, z} in AU.
 */
function orbitPath(planet, segments) {
    segments = segments || 128;
    const points = [];
    const savedAngle = planet.startAngle;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const years = t * planet.periodYr;
        const fakeDate = new Date(J2000.getTime() + years * 365.25 * 86400000);
        const pos = keplerPosition(planet, fakeDate);
        points.push(pos);
    }
    return points;
}
