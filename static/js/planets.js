/**
 * Planets Database
 * Kepler orbital elements + visual parameters for all 13 objects.
 */

const PLANETS = {
    mercury: {
        name: "Mercury", color: 0xb5b5b5, size: 0.35,
        radiusAU: 0.387, periodYr: 0.241, startAngle: 1.74,
    },
    venus: {
        name: "Venus", color: 0xe8cda0, size: 0.95,
        radiusAU: 0.723, periodYr: 0.615, startAngle: 0.26,
    },
    earth: {
        name: "Earth", color: 0x6b93d6, size: 1.00,
        radiusAU: 1.000, periodYr: 1.000, startAngle: 0.0,
    },
    mars: {
        name: "Mars", color: 0xc1440e, size: 0.53,
        radiusAU: 1.524, periodYr: 1.881, startAngle: 5.86,
    },
    jupiter: {
        name: "Jupiter", color: 0xc88b3a, size: 5.00,
        radiusAU: 5.203, periodYr: 11.86, startAngle: 0.60,
    },
    saturn: {
        name: "Saturn", color: 0xead6b8, size: 4.20,
        radiusAU: 9.537, periodYr: 29.46, startAngle: 0.45,
        rings: true, ringInner: 1.5, ringOuter: 2.8,
    },
    uranus: {
        name: "Uranus", color: 0xd1e7e7, size: 2.80,
        radiusAU: 19.19, periodYr: 84.01, startAngle: 5.10,
    },
    neptune: {
        name: "Neptune", color: 0x5b5ddf, size: 2.70,
        radiusAU: 30.07, periodYr: 164.8, startAngle: 0.78,
    },
    pluto: {
        name: "Pluto", color: 0xc2a07a, size: 0.20,
        radiusAU: 39.48, periodYr: 248.0, startAngle: 3.95,
    },
    ceres: {
        name: "Ceres", color: 0xaaaaaa, size: 0.25,
        radiusAU: 2.77, periodYr: 4.60, startAngle: 1.20,
    },
    vesta: {
        name: "Vesta", color: 0xbbbb99, size: 0.22,
        radiusAU: 2.36, periodYr: 3.63, startAngle: 0.50,
    },
    eris: {
        name: "Eris", color: 0x99bbcc, size: 0.30,
        radiusAU: 67.67, periodYr: 557.0, startAngle: 2.80,
    },
    haumea: {
        name: "Haumea", color: 0xccbbaa, size: 0.25,
        radiusAU: 43.13, periodYr: 283.0, startAngle: 3.40,
    },
    makemake: {
        name: "Makemake", color: 0xdd9988, size: 0.25,
        radiusAU: 45.79, periodYr: 309.0, startAngle: 1.90,
    },
};

const J2000 = new Date("2000-01-01T00:00:00Z");

/**
 * Compute Kepler position for a planet at a given Date.
 */
function keplerPosition(planet, date) {
    const years = (date - J2000) / (365.25 * 24 * 3600 * 1000);
    const theta = 2 * Math.PI * (years / planet.periodYr) + planet.startAngle;
    const x = planet.radiusAU * Math.cos(theta);
    const z = planet.radiusAU * Math.sin(theta);
    return { x, y: 0, z };
}
