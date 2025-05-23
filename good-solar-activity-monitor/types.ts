
// Common
export interface Link {
  label: string;
  url: string;
}

// NOAA GOES X-Ray Flux
export interface XRayFluxDataPoint {
  time_tag: string;
  flux: number;
  observed_flux: number; // For display, actual value
  energy: string; // e.g., "0.05-0.4nm" or "0.1-0.8nm"
}

export interface XRayFluxThreshold {
  name: string;
  value: number;
  color: string;
  labelPosition: number;
}

// NOAA GOES Proton Flux
export interface ProtonFluxDataPoint {
  time_tag: string;
  flux: number;
  energy: string; // e.g., ">=10 MeV"
}

export interface ProtonFluxScaleLevel {
    level: string; // S1, S2, etc.
    threshold: number; // pfu
    description: string;
    color: string;
}


// NASA DONKI API Types
export interface DonkiEvent {
  activityID?: string; // For FLR, SEP
  catalog?: string; // For SEP
  link: string;
  note?: string;
  messageType?: string;
  messageID?: string;
  messageIssueTime?: string;
}

export interface AssociatedCMEInfo {
  activityID: string;
  startTime?: string;
  note?: string;
  link?: string;
  earthImpactScore?: number; // Added to indicate if this specific CME is Earth-directed
}

export interface SolarFlare extends DonkiEvent {
  flrID: string;
  beginTime: string;
  peakTime: string;
  endTime: string | null;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  linkedEvents?: { activityID: string }[];
  associatedCMEs?: AssociatedCMEInfo[];
}

export interface CME extends DonkiEvent {
  activityID: string; 
  startTime: string;
  sourceLocation: string;
  activeRegionNum: number | null;
  note: string; 
  instruments: { displayName: string }[];
  linkedEvents?: { activityID: string }[];
  cmeAnalyses?: CMEAnalysis[]; 
}

// Interface for enhanced CME data for display and sorting
export interface EnhancedCME extends CME {
  earthImpactScore?: number; // Lower is more critical/likely
  displayAnalysisSpeed?: number;
  displayAnalysisHalfAngle?: number;
  displayAnalysisType?: string;
  displayAnalysisNote?: string; // Full note from the most relevant analysis
  displayEnlilArrivalTime?: string | null;
  displayEnlilDuration?: number | null;
  displayEnlilImpactLocations?: string[];
  isPotentiallyEarthDirected?: boolean; // Simplified flag for filtering if needed
}


export interface CMEAnalysis extends DonkiEvent {
  time21_5: string;
  latitude: number;
  longitude: number;
  halfAngle: number;
  speed: number;
  type: string; // e.g., "S-type"
  isMostAccurate: boolean;
  note: string; 
  levelOfData: number;
  link: string; 
  enlilList?: EnlilSimulation[];
}

export interface EnlilSimulation {
  modelCompletionTime: string;
  au: number;
  estimatedShockArrivalTime: string | null;
  estimatedDuration: number | null;
  rmin_re: number | null;
  kp_18: number | null;
  kp_24: number | null;
  kp_30: number | null;
  kp_36: number | null;
  kp_42: number | null;
  kp_48: number | null;
  isEarthGB: boolean | null;
  link: string;
  impactList?: EnlilImpact[];
}

export interface EnlilImpact {
    location: string;
    arrivalTime: string;
    isGlancingBlow: boolean;
}


export interface GeomagneticStorm extends DonkiEvent {
  gstID: string;
  startTime: string;
  link: string; 
  allKpIndex?: KpIndex[];
  linkedEvents?: { activityID: string }[];
}

export interface KpIndex {
  timeTag: string;
  kpValue: number;
  observedTime: string;
  source: string;
}

export interface InterplanetaryShock extends DonkiEvent {
  ipsID: string;
  eventTime: string;
  locatioN: string; 
  link: string; 
  instruments?: {displayName: string}[];
  linkedEvents?: { activityID: string }[];
  associatedCMESpeed?: number;
  associatedCMEStartTime?: string;
  associatedCMELink?: string;
  associatedCMEActivityID?: string;
}

export interface SolarEnergeticParticle extends DonkiEvent {
  sepID: string;
  eventTime: string;
  link: string; 
  instruments: { displayName: string }[];
  linkedEvents?: { activityID: string }[];
}

// Generic type for data fetching hook
export interface FetchDataResponse<T,> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}
