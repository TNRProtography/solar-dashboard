
import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ImageryViewerProps {
  title: string;
  imageUrl: string;
  animatedImageUrl?: string; // Optional URL for the animated GIF
  refreshInterval?: number; // in milliseconds
}

// Helper function to get NZST or NZDT for ImageryViewer
const getImageryNzTimeAbbreviation = (dateInput: Date | string): string => {
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


export const ImageryViewer: React.FC<ImageryViewerProps> = ({ title, imageUrl, animatedImageUrl, refreshInterval }) => {
  const [staticImageUrl, setStaticImageUrl] = useState<string>(`${imageUrl}?t=${Date.now()}`); 
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  useEffect(() => {
    const loadImage = () => {
      setIsLoading(true);
      const newStaticImageUrl = `${imageUrl}?t=${Date.now()}`; 
      const img = new Image();
      img.src = newStaticImageUrl;
      img.onload = () => {
        setStaticImageUrl(newStaticImageUrl);
        setLastUpdated(new Date());
        setIsLoading(false);
        setError(null); 
      };
      img.onerror = () => {
        setError(`Failed to load image for ${title}.`);
        setIsLoading(false);
      };
    };

    loadImage(); 

    if (refreshInterval) {
      const intervalId = setInterval(loadImage, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [imageUrl, refreshInterval, title]); 

  let lastUpdatedText = "";
  if (lastUpdated) {
    const timePart = lastUpdated.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Pacific/Auckland' });
    const tzAbbreviation = getImageryNzTimeAbbreviation(lastUpdated);
    lastUpdatedText = `${timePart} ${tzAbbreviation}`.trim();
  }

  const displaySrc = isHovering && animatedImageUrl 
                     ? `${animatedImageUrl}?t=${Date.now()}` // Cache-bust GIF to replay
                     : staticImageUrl;

  return (
    <div 
      className="bg-gray-700 p-3 rounded-lg shadow-md flex flex-col items-center h-full"
      onMouseEnter={() => animatedImageUrl && setIsHovering(true)}
      onMouseLeave={() => animatedImageUrl && setIsHovering(false)}
    >
      <h3 className="text-lg font-medium text-blue-300 mb-2 self-start">{title}</h3>
      <div className="w-full aspect-square flex items-center justify-center bg-black rounded overflow-hidden relative">
        {error && !isLoading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 p-2">
                <p className="text-red-400 text-xs text-center">{error}</p>
                {lastUpdated && <p className="text-xs text-gray-500 mt-1">Stale image from: {lastUpdatedText}</p>}
             </div>
        )}
        {(isLoading && (!isHovering || !animatedImageUrl) ) && ( // Show loading for static image if not hovering on an animatable one
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size="sm" text="Loading..." />
          </div>
        )}
        {/* Always render img tag to allow browser to handle GIF loading/display on hover */}
        <img 
            src={displaySrc} 
            alt={title} 
            className="w-full h-full object-contain"
            // onError is tricky for dynamically changing src; primary error handling is for static image
            style={{ display: (isLoading && !isHovering && !animatedImageUrl) || (error && !isLoading) ? 'none' : 'block' }} // Hide if loading static or error for static
        />
         {!staticImageUrl && !isLoading && !error && (
             <p className="text-gray-400 text-xs p-2 text-center">Image not available.</p>
        )}
      </div>
      {lastUpdated && !error && ( 
         <p className="text-xs text-gray-500 mt-1 self-end">
            Updated: {lastUpdatedText}
         </p>
      )}
      {isLoading && lastUpdated && ( 
          <p className="text-xs text-blue-400 mt-1 self-end">Updating...</p>
      )}
    </div>
  );
};
