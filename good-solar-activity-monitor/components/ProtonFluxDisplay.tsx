
import React, { useState, useEffect, useCallback } from 'react';
import { getProtonFlux } from '../services/nasaApiService';
import type { ProtonFluxDataPoint, ProtonFluxScaleLevel } from '../types';
import { PROTON_FLUX_S_SCALE, REFRESH_INTERVAL_MS } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

// Helper function to get NZST or NZDT for ProtonFluxDisplay
const getProtonFluxNzTimeAbbreviation = (dateInput: Date | string): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      timeZoneName: 'shortOffset',
      hour: 'numeric', 
    });
    const parts = formatter.formatToParts(date);
    const gmtOffsetPart = parts.find(part => part.type === 'timeZoneName');
    if (gmtOffsetPart) {
      if (gmtOffsetPart.value === 'GMT+13') return 'NZDT';
      if (gmtOffsetPart.value === 'GMT+12') return 'NZST';
      return gmtOffsetPart.value;
    }
    return '';
  } catch (e) { return ''; }
};

export const ProtonFluxDisplay: React.FC = () => {
  const [currentFlux, setCurrentFlux] = useState<ProtonFluxDataPoint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    // setError(null); // Potential aggressive clear
    try {
      const fluxData = await getProtonFlux(); 
      if (fluxData && fluxData.length > 0) {
        setCurrentFlux(fluxData[fluxData.length - 1]); 
      } else {
        setCurrentFlux(null);
      }
      setError(null); // Clear error on success
    } catch (err) {
      const newError = err instanceof Error ? err.message : 'Failed to fetch proton flux data.';
      setError(newError);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS.FLUX_DATA);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  if (isLoading && !currentFlux) return <LoadingSpinner text="Loading Proton Flux..." />;
  if (error && !currentFlux) return <ErrorMessage message={error} />;

  let sScaleLevel: ProtonFluxScaleLevel | null = null;
  let fluxValueText = "N/A";
  let lastUpdatedText = "";

  if (currentFlux) {
    const fluxDate = new Date(currentFlux.time_tag);
    fluxValueText = `${currentFlux.flux.toFixed(2)} pfu`;
    for (const level of PROTON_FLUX_S_SCALE) { 
      if (currentFlux.flux >= level.threshold) {
        sScaleLevel = level;
        break;
      }
    }
    const timePart = fluxDate.toLocaleTimeString('en-NZ', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Pacific/Auckland'
    });
    const tzAbbreviation = getProtonFluxNzTimeAbbreviation(fluxDate);
    lastUpdatedText = `${timePart} ${tzAbbreviation}`.trim();
  }

  return (
    <div className="p-4 h-full flex flex-col justify-center items-center text-center">
      {error && !currentFlux && <ErrorMessage message={error} /> /* Show error only if no current data */}
      {error && currentFlux && <ErrorMessage message={`Failed to update Proton Flux: ${error}`} /> /* Non-blocking error */}
      {!currentFlux && !isLoading && !error && <p className="text-gray-400">No proton flux data available.</p>}

      {currentFlux && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-400">Current Flux (≥10 MeV)</p>
            <p className="text-3xl font-bold" style={{ color: sScaleLevel?.color || '#FFFFFF' }}>
              {fluxValueText}
            </p>
            <p className="text-xs text-gray-500">
                Last updated: {lastUpdatedText}
            </p>
          </div>

          {sScaleLevel ? (
            <div className="w-full p-3 rounded-md" style={{ backgroundColor: `${sScaleLevel.color}33` }}>
              <p className="text-xl font-semibold" style={{ color: sScaleLevel.color }}>
                {sScaleLevel.level} - {sScaleLevel.description}
              </p>
              <p className="text-xs" style={{ color: sScaleLevel.color }}>
                (Threshold: {sScaleLevel.threshold.toExponential(0)} pfu)
              </p>
            </div>
          ) : (
            <div className="w-full p-3 rounded-md bg-gray-700">
              <p className="text-xl font-semibold text-gray-300">Normal Conditions</p>
              <p className="text-xs text-gray-400">(Below S1 threshold)</p>
            </div>
          )}
        </>
      )}
       {isLoading && currentFlux && ( 
          <div className="absolute bottom-2 right-2">
             <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
    </div>
  );
};
