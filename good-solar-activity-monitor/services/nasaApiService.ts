
import { NASA_API_KEY, DONKI_API_BASE_URL, NOAA_XRAY_FLUX_URL, NOAA_PROTON_FLUX_URL } from '../constants';
import type { XRayFluxDataPoint, ProtonFluxDataPoint, SolarFlare, CME, CMEAnalysis, GeomagneticStorm, InterplanetaryShock, SolarEnergeticParticle } from '../types';

// Custom error class for non-retryable errors
class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

const fetchData = async <T,>(url: string, maxRetries = 2, initialDelayMs = 1000): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { mode: 'cors' }); // 'cors' is default but explicit

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          // Try to get a more specific error message from JSON response
          const errorData = await response.json();
          errorMessage = errorData.message || (errorData.error && errorData.error.message) || response.statusText;
        } catch (e) {
          // Response body is not JSON or empty, stick with statusText
        }
        
        const httpErrorMessage = `API Error (${response.status}) from ${url}: ${errorMessage}`;
        
        if (response.status >= 400 && response.status < 500) {
          // For 4xx client errors, throw a specific error type that won't be retried
          throw new NonRetryableError(httpErrorMessage);
        }
        
        // For 5xx server errors or other non-ok responses, set as lastError and let retry logic proceed
        lastError = new Error(httpErrorMessage);
        if (attempt < maxRetries) {
          console.warn(`Attempt ${attempt + 1} for ${url} (HTTP ${response.status}) failed. Retrying...`);
          const delay = initialDelayMs * Math.pow(2, attempt); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Move to the next iteration of the loop for retry
        } else {
          // This was the last attempt for a 5xx (or other retryable) error
          throw lastError;
        }
      }
      // If response.ok is true, try to parse JSON
      return await response.json() as T;
    } catch (error) {
      // Handle NonRetryableError specifically: re-throw immediately
      if (error instanceof NonRetryableError) {
        console.error(`Non-retryable error for ${url}: ${error.message}`);
        throw error; 
      }

      // For other errors (network errors like "Failed to fetch", or errors from response.json())
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt + 1} failed for ${url}: ${lastError.message}.`);

      if (attempt === maxRetries) { // If this was the last attempt
        let finalErrorMessage = `Failed to fetch data from ${url} after ${maxRetries + 1} attempts.`;
        if (lastError.message.toLowerCase().includes('failed to fetch')) {
          finalErrorMessage = `Could not connect to ${url} after ${maxRetries + 1} attempts. This may be due to network issues, CORS restrictions, browser extensions, or the service being offline. (Details: ${lastError.message})`;
        } else {
          finalErrorMessage += ` Last error: ${lastError.message}`;
        }
        console.error(finalErrorMessage, lastError); // Log the full error object for more context
        throw new Error(finalErrorMessage);
      }

      // Wait before the next retry
      const delay = initialDelayMs * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This part should ideally not be reached if maxRetries >= 0,
  // but it's a fallback to ensure the function always throws or returns.
  if (lastError) throw lastError; // Throw the last known error
  throw new Error(`Exhausted retries for ${url} but no definitive error was captured.`);
};


// NOAA Data
export const getXRayFlux = async (): Promise<XRayFluxDataPoint[]> => {
  const data = await fetchData<XRayFluxDataPoint[]>(NOAA_XRAY_FLUX_URL);
  return data
    .filter(d => d.energy === '0.1-0.8nm')
    .map(d => ({ ...d, observed_flux: d.flux }))
    .sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());
};

export const getProtonFlux = async (): Promise<ProtonFluxDataPoint[]> => {
  const data = await fetchData<ProtonFluxDataPoint[]>(NOAA_PROTON_FLUX_URL);
  return data
    .filter(d => d.energy === '>=10 MeV')
    .sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());
};


// NASA DONKI API Generic Fetcher
const getDonkiData = async <T,>(
  endpoint: string,
  startDate?: string,
  endDate?: string
): Promise<T[]> => {
  let url = `${DONKI_API_BASE_URL}/${endpoint}?api_key=${NASA_API_KEY}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  
  const data = await fetchData<T[]>(url);
  return Array.isArray(data) ? data : (data ? [data] : []);
};


// Specific DONKI Endpoints
export const getSolarFlares = (startDate: string, endDate: string): Promise<SolarFlare[]> => 
  getDonkiData<SolarFlare>('FLR', startDate, endDate);

export const getCMEs = (startDate: string, endDate: string): Promise<CME[]> => 
  getDonkiData<CME>('CME', startDate, endDate);

export const getCMEAnalyses = (startDate: string, endDate: string): Promise<CMEAnalysis[]> => 
  getDonkiData<CMEAnalysis>('CMEAnalysis', startDate, endDate);

export const getGeomagneticStorms = (startDate: string, endDate: string): Promise<GeomagneticStorm[]> => 
  getDonkiData<GeomagneticStorm>('GST', startDate, endDate);

export const getInterplanetaryShocks = (startDate: string, endDate: string): Promise<InterplanetaryShock[]> => 
  getDonkiData<InterplanetaryShock>('IPS', startDate, endDate);

export const getSolarEnergeticParticles = (startDate: string, endDate: string): Promise<SolarEnergeticParticle[]> =>
  getDonkiData<SolarEnergeticParticle>('SEP', startDate, endDate);
