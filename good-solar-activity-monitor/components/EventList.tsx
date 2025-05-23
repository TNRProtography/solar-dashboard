
import React, { useState, useEffect, useCallback } from 'react';
import { getSolarFlares, getCMEs, getGeomagneticStorms, getInterplanetaryShocks, getSolarEnergeticParticles, getCMEAnalyses } from '../services/nasaApiService';
import type { DonkiEvent, SolarFlare, CME, GeomagneticStorm, InterplanetaryShock, SolarEnergeticParticle, CMEAnalysis } from '../types';
import { EventCard } from './EventCard';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { REFRESH_INTERVAL_MS } from '../constants';

type DonkiEventType = 'FLR' | 'CME' | 'GST' | 'IPS' | 'SEP' | 'CMEAnalysis';

interface EventListProps<T extends DonkiEvent,> {
  eventType: DonkiEventType; // Still useful for messages if events prop not used, or as a key
  displayProps: {
    titleKey: keyof T;
    timeKeys: (keyof T)[];
    details: { label: string; key: keyof T; truncate?: number }[];
  };
  // Props for internal data fetching (optional if events are passed directly)
  startDate?: string;
  endDate?: string;
  // Props for externally fetched data
  events?: T[];
  isLoading?: boolean;
  error?: string | null;
  // Filtering and display options
  filter?: (event: T) => boolean;
  maxItems?: number;
  highlightCondition?: (event: T) => boolean;
}

const fetchFunctionMap: Record<DonkiEventType, (startDate: string, endDate: string) => Promise<any[]>> = {
  FLR: getSolarFlares,
  CME: getCMEs, // This specific fetch might not be used if `events` prop is provided for CMEs
  GST: getGeomagneticStorms,
  IPS: getInterplanetaryShocks,
  SEP: getSolarEnergeticParticles,
  CMEAnalysis: getCMEAnalyses,
};


export const EventList = <T extends DonkiEvent,>({ 
    eventType, 
    displayProps, 
    startDate, 
    endDate,
    events: externalEvents, // Renamed to avoid conflict with internal state
    isLoading: externalIsLoading,
    error: externalError,
    filter: customFilter,
    maxItems = 100, 
    highlightCondition 
}: EventListProps<T>): React.ReactNode => {
  const [internalEvents, setInternalEvents] = useState<T[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(!externalEvents); // Only true if not using external data
  const [internalError, setInternalError] = useState<string | null>(null);

  const usingExternalData = externalEvents !== undefined;

  const fetchDataInternal = useCallback(async () => {
    if (usingExternalData || !startDate || !endDate) return; // Don't fetch if external data is provided or dates missing

    setInternalIsLoading(true);
    setInternalError(null);
    try {
      const fetchFunction = fetchFunctionMap[eventType];
      if (!fetchFunction) {
        throw new Error(`Unknown event type for internal fetching: ${eventType}`);
      }
      let fetchedEvents = await fetchFunction(startDate, endDate) as T[];
      
      const primaryTimeKey = displayProps.timeKeys[0];
      if (primaryTimeKey) {
        fetchedEvents.sort((a, b) => {
            const timeA = new Date(String(a[primaryTimeKey] || 0)).getTime();
            const timeB = new Date(String(b[primaryTimeKey] || 0)).getTime();
            return timeB - timeA; 
        });
      }
      // Note: Custom filter is applied *after* this internal fetch, or applied to externalEvents below.
      setInternalEvents(fetchedEvents);
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : `Failed to fetch ${eventType} data.`);
      console.error(err);
    } finally {
      setInternalIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [eventType, startDate, endDate, displayProps.timeKeys, usingExternalData]); 

  useEffect(() => {
    if (!usingExternalData) {
      fetchDataInternal();
      const intervalId = setInterval(fetchDataInternal, REFRESH_INTERVAL_MS.DONKI_EVENTS);
      return () => clearInterval(intervalId);
    }
  }, [fetchDataInternal, usingExternalData]);

  const currentEvents = usingExternalData ? externalEvents : internalEvents;
  const isLoading = usingExternalData ? externalIsLoading ?? false : internalIsLoading;
  const error = usingExternalData ? externalError : internalError;

  let displayableEvents = currentEvents || [];
  if (customFilter) {
    displayableEvents = displayableEvents.filter(customFilter);
  }
  displayableEvents = displayableEvents.slice(0, maxItems);

  if (isLoading && displayableEvents.length === 0 && !error) return <LoadingSpinner text={`Loading ${eventType} events...`} />;
  if (error && displayableEvents.length === 0) return <ErrorMessage message={error} />;
  if (displayableEvents.length === 0 && !isLoading && !error) return <p className="text-gray-400 text-center py-4">No {eventType} events found for the selected period or criteria.</p>;
  if (!currentEvents && !isLoading && !error) return <p className="text-gray-400 text-center py-4">Data not available for {eventType}.</p>;


  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
      {isLoading && displayableEvents.length > 0 && ( 
         <div className="flex justify-center my-2">
             <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
         </div>
      )}
      {error && displayableEvents.length > 0 && <ErrorMessage message={error} /> /* Show error even if some data is stale */}
      {displayableEvents.map((event, index) => {
        const isHighlighted = !!(highlightCondition && highlightCondition(event));
        
        // FIX: The original code had unsafe casts for specific event IDs.
        // The following logic safely determines a unique key for the event.
        // It prioritizes common IDs like activityID and messageID (from DonkiEvent),
        // then checks for specific event type IDs using the 'in' operator before casting.
        // Finally, it falls back to a displayProps-based key or the map index.
        let specificEventId: string | undefined;

        if ('flrID' in event) {
          specificEventId = (event as unknown as SolarFlare).flrID;
        } else if ('gstID' in event) {
          specificEventId = (event as unknown as GeomagneticStorm).gstID;
        } else if ('ipsID' in event) {
          specificEventId = (event as unknown as InterplanetaryShock).ipsID;
        } else if ('sepID' in event) {
          specificEventId = (event as unknown as SolarEnergeticParticle).sepID;
        }

        const eventKey = event.activityID || 
                       event.messageID || 
                       specificEventId || 
                       String(event[displayProps.titleKey]) || 
                       index;
        return (
          <EventCard 
            key={eventKey as string} 
            event={event} 
            displayProps={displayProps}
            isHighlighted={isHighlighted}
          />
        );
      })}
    </div>
  );
};
