
import React from 'react';
// FIX: Removed DisplayableSunspotRegion as it's not exported from ../types
import type { DonkiEvent, SolarFlare, AssociatedCMEInfo, EnhancedCME, KpIndex, GeomagneticStorm, InterplanetaryShock } from '../types';

// Helper function to get NZST or NZDT
const getPacificAucklandTimeZoneAbbreviation = (dateInput: Date | string): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return ''; // Invalid date

    const formatter = new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      timeZoneName: 'shortOffset', // Essential for getting GMT+12/GMT+13
      hour: 'numeric', // Dummy field to ensure formatter works correctly for timeZoneName
    });
    
    const parts = formatter.formatToParts(date);
    const gmtOffsetPart = parts.find(part => part.type === 'timeZoneName');

    if (gmtOffsetPart) {
      if (gmtOffsetPart.value === 'GMT+13') return 'NZDT';
      if (gmtOffsetPart.value === 'GMT+12') return 'NZST';
      return gmtOffsetPart.value; // Fallback to GMT offset if not +12 or +13
    }
    return ''; // Fallback if no timeZoneName part found
  } catch (e) {
    // console.warn('Error getting Pacific/Auckland timezone abbreviation:', e);
    return ''; 
  }
};

const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const baseOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Pacific/Auckland',
        // timeZoneName is omitted here as we'll append NZST/NZDT manually
    };
    
    const effectiveOptions = options ? { ...baseOptions, ...options } : baseOptions;

    if (dateString.match(/^\d{2}:\d{2}$/) || dateString.match(/^\d{2}:\d{2}:\d{2}$/)) {
        // For pre-formatted time strings, attempt to parse with current date for correct TZ
        const todayForTimeParse = new Date();
        const [hours, minutes, seconds] = dateString.split(':');
        todayForTimeParse.setHours(parseInt(hours,10), parseInt(minutes,10), seconds ? parseInt(seconds,10) : 0, 0);
        const timePart = todayForTimeParse.toLocaleTimeString('en-NZ', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Pacific/Auckland',
        });
        const tzAbbreviation = getPacificAucklandTimeZoneAbbreviation(todayForTimeParse);
        return `${timePart} ${tzAbbreviation}`.trim();
    }

    const formattedDate = date.toLocaleString('en-NZ', effectiveOptions);
    const tzAbbreviation = getPacificAucklandTimeZoneAbbreviation(date);
    return `${formattedDate} ${tzAbbreviation}`.trim();
  } catch (e) {
    console.warn("Failed to format date:", dateString, e);
    return dateString; 
  }
};

const truncateText = (text: string, maxLength: number | undefined): string => {
  if (typeof maxLength === 'undefined' || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

interface EventCardProps<T extends DonkiEvent> {
  event: T;
  displayProps: {
    titleKey: keyof T;
    timeKeys: (keyof T)[];
    details: { label: string; key: keyof T; truncate?: number }[];
  };
  isHighlighted?: boolean;
}

export const EventCard = <T extends DonkiEvent,>({ event, displayProps, isHighlighted = false }: EventCardProps<T>): React.ReactNode => {
  let title = String(event[displayProps.titleKey] || 'Event');
  
  // Specific title prefix for Sunspot Regions
  if ('regionNumber' in event && displayProps.titleKey === 'regionNumber') {
    // FIX: Changed type assertion from non-existent DisplayableSunspotRegion to any
    title = `Region ${(event as any).regionNumber}`;
  }


  const cardClasses = "bg-gray-750 p-4 rounded-lg shadow-lg transition-colors duration-200 break-words " + 
                      (isHighlighted
                         ? "border-2 border-orange-400 hover:border-orange-300"
                         : "border border-gray-700 hover:border-blue-500");

  const solarFlareEvent = event as unknown as SolarFlare; 
  const associatedCMEs = solarFlareEvent.associatedCMEs;

  const enhancedCMEEvent = event as unknown as EnhancedCME;
  const geomagneticStormEvent = event as unknown as GeomagneticStorm;
  const interplanetaryShockEvent = event as unknown as InterplanetaryShock; 
  // FIX: Removed unused sunspotRegionEvent variable which used the non-existent DisplayableSunspotRegion type.


  return (
    <div className={cardClasses}>
      <h4 className="text-lg font-semibold text-blue-400 mb-2">{title}</h4>
      
      {enhancedCMEEvent.earthImpactScore && enhancedCMEEvent.earthImpactScore !== Infinity && (
         <p className="text-xs mb-1" style={{ color: enhancedCMEEvent.earthImpactScore! <= 2 ? 'rgb(251 146 60)' : 'text-gray-400'}}>
            <span className="font-medium">Earth Impact Score: </span>{enhancedCMEEvent.earthImpactScore} 
            {enhancedCMEEvent.earthImpactScore! <=2 ? ' (Higher concern)' : ''}
         </p>
      )}

      {displayProps.timeKeys.map(key => {
        const timeValue = event[key] as string | undefined | null;
        
        let labelText = String(key)
            .replace('displayEnlil', 'Est. ')
            .replace(/([A-Z])/g, ' $1') 
            .replace(/Time$/, '') 
            .replace(/^associated CME /i, 'Causative CME ') 
            .trim();
        labelText = labelText.charAt(0).toUpperCase() + labelText.slice(1);


        if (key === 'displayEnlilArrivalTime' && !timeValue) {
          return (
            <div key={String(key)} className="text-xs text-gray-400 mb-1">
              <span className="font-medium capitalize">Est. Arrival (Earth): </span>
              Not available or not predicted
            </div>
          );
        }
        if (!timeValue && key !== 'endTime' && key as string !== 'associatedCMEStartTime') return null;
        if (key as string === 'associatedCMEStartTime' && !interplanetaryShockEvent.associatedCMEStartTime) return null;

        return (
          <div key={String(key)} className="text-xs text-gray-400 mb-1">
            <span className="font-medium">{labelText}: </span>
            {formatDate(String(timeValue))}
          </div>
        );
      })}

      {displayProps.details.map(detail => {
        const actualValueAtKey = event[detail.key];

        // FIX: Moved special handling for boolean sunspot properties to execute first.
        // It handles undefined values by defaulting to false and returns early.
        if (detail.key === 'isEarthFacing' || detail.key === 'isPotentiallyUnstable') {
          const isTrue = actualValueAtKey === undefined ? false : (actualValueAtKey as boolean);
          const labelColor = isTrue ? 'rgb(251 146 60)' /* orange-400 */ : 'inherit';
          return (
            <p key={detail.label} className="text-sm my-1">
              <span className="font-medium text-gray-400">{detail.label}: </span>
              <span style={{ color: labelColor }} className={isTrue ? 'font-semibold' : ''}>
                {isTrue ? 'Yes' : 'No'}
              </span>
            </p>
          );
        }

        // FIX: Moved special handling for Kp Indices and Instruments to return early if applicable.
        if (detail.key === 'allKpIndex' && geomagneticStormEvent.allKpIndex && Array.isArray(geomagneticStormEvent.allKpIndex) && geomagneticStormEvent.allKpIndex.length > 0) {
          return (
            <div key={detail.label} className="text-sm text-gray-300 my-1">
              <h5 className="text-xs font-semibold text-gray-400 mt-2 mb-1">{detail.label}:</h5>
              <ul className="list-disc list-inside pl-2 text-xs space-y-0.5">
                {geomagneticStormEvent.allKpIndex.map((kp: KpIndex, index: number) => (
                  <li key={index}>
                    {formatDate(kp.timeTag, { year: undefined, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}: 
                    <span className="font-semibold"> Kp {kp.kpValue}</span>
                    {kp.source && <span className="text-gray-500"> ({kp.source})</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        
        if (detail.key === 'instruments' && interplanetaryShockEvent.instruments && Array.isArray(interplanetaryShockEvent.instruments)) {
            const instrumentNames = interplanetaryShockEvent.instruments.map(inst => inst.displayName).join(', ');
            if (!instrumentNames) return null; // Don't render if no instrument names
            return (
                <p key={detail.label} className="text-sm text-gray-300 my-1">
                    <span className="font-medium text-gray-400">{detail.label}: </span>
                    {instrumentNames}
                </p>
            );
        }
        
        // FIX: Refactored handling of null/undefined values.
        // This block now correctly filters out most null/undefined values,
        // allowing 'magneticClass' (if null/undefined) to pass through to be displayed as "N/A".
        if (actualValueAtKey === null || actualValueAtKey === undefined) {
          if (detail.key === 'associatedCMESpeed' && interplanetaryShockEvent.associatedCMESpeed === undefined) {
            return null;
          }
          // If not magneticClass (which will become "N/A"), skip rendering for other null/undefined.
          if (detail.key !== 'magneticClass') {
            return null;
          }
          // If it IS magneticClass and null/undefined, it proceeds to displayValue logic.
        }
        
        let displayValue: string;

        // FIX: Ensures magneticClass becomes "N/A" if null or undefined.
        // Other type conversions follow.
        if (detail.key === 'magneticClass' && (actualValueAtKey === undefined || actualValueAtKey === null)) {
            displayValue = "N/A";
        } else if (detail.key === 'associatedCMESpeed' && typeof actualValueAtKey === 'number') {
            displayValue = `${actualValueAtKey.toFixed(0)} km/s`;
        } else if (typeof actualValueAtKey === 'number' && (detail.key === 'area' || detail.key === 'spotCount' || detail.key === 'heliocentricLat' || detail.key === 'heliocentricLon')) {
            displayValue = actualValueAtKey.toString();
        } else if (Array.isArray(actualValueAtKey)) { // Should ideally be caught by specific array handlers like KpIndex
          displayValue = actualValueAtKey.join(', ');
        } else if (typeof actualValueAtKey === 'boolean') { // General booleans (specific ones are handled above)
          displayValue = actualValueAtKey ? 'Yes' : 'No';
        } else if (actualValueAtKey === null || actualValueAtKey === undefined) {
            // Fallback for any null/undefined that made it this far (e.g. magneticClass if null).
            displayValue = "N/A";
        } else {
          displayValue = String(actualValueAtKey);
        }

        if (displayValue.trim() === '' && displayValue !== "N/A" && detail.key !== 'displayAnalysisNote' && detail.key !== 'note' && detail.key !== 'detailsNote') {
           return null; // Don't render if empty string, unless it's an intentional "N/A" or a note field
        }

        displayValue = truncateText(displayValue, detail.truncate);
        
        const noteStyle = (detail.key === 'displayAnalysisNote' || detail.key === 'note' || detail.key === 'detailsNote') 
                          ? { whiteSpace: 'pre-wrap' as React.CSSProperties['whiteSpace'] } 
                          : {};

        return (
          <p key={detail.label} className="text-sm text-gray-300 my-1" style={noteStyle}>
            <span className="font-medium text-gray-400">{detail.label}: </span>
            {displayValue}
          </p>
        );
      })}

      {/* Display for Solar Flare's Associated CMEs */}
      {associatedCMEs && associatedCMEs.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <h5 className="text-sm font-semibold text-blue-300 mb-1">
            Associated CME{associatedCMEs.length > 1 ? 's' : ''}:
          </h5>
          {associatedCMEs.map((cmeInfo, index) => {
            const isEarthDirectedCME = cmeInfo.earthImpactScore !== undefined && cmeInfo.earthImpactScore <=2;
            const cmeHighlightClass = isEarthDirectedCME ? 'border-orange-400' : 'border-gray-500';
            return (
                <div key={index} className={`pl-2 mb-2 text-xs border-l-2 ${cmeHighlightClass} ml-1`}>
                  <p className="text-gray-300">
                    <span className="font-medium text-gray-400">CME ID: </span>{cmeInfo.activityID}
                  </p>
                  {cmeInfo.startTime && (
                    <p className="text-gray-400">
                      <span className="font-medium">Start: </span>{formatDate(cmeInfo.startTime)}
                    </p>
                  )}
                   {isEarthDirectedCME && cmeInfo.earthImpactScore && (
                    <p className="font-semibold" style={{color: 'rgb(251 146 60)'}}>Earth-Directed (Score: {cmeInfo.earthImpactScore})</p>
                  )}
                  {cmeInfo.note && (
                    <p className="text-gray-400 italic" style={{ whiteSpace: 'pre-wrap' }}>
                      <span className="font-medium not-italic">Note: </span>{truncateText(cmeInfo.note, 70)}
                    </p>
                  )}
                  {cmeInfo.link && (
                    <a
                      href={cmeInfo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline block"
                    >
                      View CME Details
                    </a>
                  )}
                </div>
            );
           })}
        </div>
      )}
      
      {/* Display for IPS's Associated Causative CME Link */}
      {interplanetaryShockEvent.associatedCMELink && interplanetaryShockEvent.associatedCMEActivityID &&(
        <div className="mt-3 pt-2 border-t border-gray-600">
           <h5 className="text-sm font-semibold text-blue-300 mb-1">
            Associated Causative CME:
          </h5>
           <div className="pl-2 text-xs border-l-2 border-gray-500 ml-1">
            <p className="text-gray-300">
                <span className="font-medium text-gray-400">CME ID: </span>{interplanetaryShockEvent.associatedCMEActivityID}
            </p>
            <a
                href={interplanetaryShockEvent.associatedCMELink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline block"
            >
                View Causative CME Details
            </a>
           </div>
        </div>
      )}


      {event.note && String(event.note).trim() !== '' && 
       !displayProps.details.find(d => (d.key === 'note' || d.key === 'detailsNote') && d.truncate === undefined) && 
       enhancedCMEEvent.displayAnalysisNote !== event.note && (
         <p className="text-sm text-gray-300 my-1 mt-2 italic" style={{ whiteSpace: 'pre-wrap' }}>
            <span className="font-medium text-gray-400 not-italic">Original Event Note: </span>
            {truncateText(String(event.note), 150)}
         </p>
      )}

      {event.link && event.link.trim() !== '' &&
        !(associatedCMEs && associatedCMEs.some(c => c.link === event.link)) &&
        !(interplanetaryShockEvent.associatedCMELink === event.link) && 
        (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-2 block"
        >
          View Event Details on NASA DONKI
        </a>
      )}
    </div>
  );
};
