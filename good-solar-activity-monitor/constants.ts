
// NASA DONKI API
export const NASA_API_KEY: string = "aLT6HpGrdyDTXjZCvt9o5jcuxtCCx7sqBxHKqVtw"; // Per user instruction for this app
export const DONKI_API_BASE_URL: string = "https://api.nasa.gov/DONKI";

// NOAA SWPC API & Image URLs
export const NOAA_XRAY_FLUX_URL: string = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-minute.json";
export const NOAA_PROTON_FLUX_URL: string = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-minute.json"; // For >=10 MeV


export const SUVI_304_URL: string = "https://services.swpc.noaa.gov/images/animations/suvi/primary/304/latest.png";
export const SUVI_131_URL: string = "https://services.swpc.noaa.gov/images/animations/suvi/primary/131/latest.png";
export const SUVI_304_ANIMATED_URL: string = "https://services.swpc.noaa.gov/images/animations/suvi/primary/304/latest.gif";
export const SUVI_131_ANIMATED_URL: string = "https://services.swpc.noaa.gov/images/animations/suvi/primary/131/latest.gif";


// SOHO LASCO Imagery URLs
export const LASCO_C2_URL: string = "https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg";
export const LASCO_C3_URL: string = "https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg";

// X-Ray Flux classification thresholds (W/m^2 for 0.1-0.8 nm)
export const XRAY_FLUX_THRESHOLDS = [
  { name: 'X', value: 1e-4, color: '#FF00FF', labelPosition: 1e-3 }, // Magenta
  { name: 'M', value: 1e-5, color: '#FF0000', labelPosition: 1e-4 }, // Red
  { name: 'C', value: 1e-6, color: '#FFA500', labelPosition: 1e-5 }, // Orange
  { name: 'B', value: 1e-7, color: '#FFFF00', labelPosition: 1e-6 }, // Yellow
  { name: 'A', value: 1e-8, color: '#ADD8E6', labelPosition: 1e-7 }, // Light Blue (below B)
];

// Proton Flux S-Scale (particles/cm^2-s-sr for >10 MeV protons)
export const PROTON_FLUX_S_SCALE = [
    { level: 'S5', threshold: 1e5, description: 'Extreme', color: '#FF00FF' }, // Magenta
    { level: 'S4', threshold: 1e4, description: 'Severe', color: '#FF0000' },  // Red
    { level: 'S3', threshold: 1e3, description: 'Strong', color: '#FFA500' },  // Orange
    { level: 'S2', threshold: 1e2, description: 'Moderate', color: '#FFFF00' }, // Yellow
    { level: 'S1', threshold: 10,  description: 'Minor', color: '#90EE90' },   // Light Green
];

export const REFRESH_INTERVAL_MS = {
    FLUX_DATA: 60 * 1000, // 1 minute
    IMAGERY: 5 * 60 * 1000, // 5 minutes
    DONKI_EVENTS: 15 * 60 * 1000, // 15 minutes
};
