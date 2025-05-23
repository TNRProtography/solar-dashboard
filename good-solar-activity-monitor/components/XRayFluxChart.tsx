
import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getXRayFlux } from '../services/nasaApiService';
import type { XRayFluxDataPoint, XRayFluxThreshold } from '../types';
import { XRAY_FLUX_THRESHOLDS, REFRESH_INTERVAL_MS } from '../constants';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

// Helper function to get NZST or NZDT for XRayFluxChart
const getChartNzTimeAbbreviation = (dateInput: Date | string): string => {
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


// Format time for X-axis tick
const formatXAxisTick = (timeStr: string): string => {
  const date = new Date(timeStr);
  const timePart = date.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Pacific/Auckland' });
  const tzAbbreviation = getChartNzTimeAbbreviation(date);
  return `${timePart} ${tzAbbreviation}`.trim();
};

// Format flux for Y-axis tick (scientific notation)
const formatYAxisTick = (flux: number): string => flux.toExponential(0);

// Custom Tooltip
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as XRayFluxDataPoint;
    let classification = 'A';
    for (let i = XRAY_FLUX_THRESHOLDS.length - 1; i >= 0; i--) {
        if (data.observed_flux >= XRAY_FLUX_THRESHOLDS[i].value) {
            classification = XRAY_FLUX_THRESHOLDS[i].name;
            break;
        }
    }
    const date = new Date(label);
    const timePart = date.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Pacific/Auckland' });
    const tzAbbreviation = getChartNzTimeAbbreviation(date);

    return (
      <div className="bg-gray-700 p-3 rounded shadow-lg border border-gray-600">
        <p className="text-sm text-gray-200">{`Time: ${timePart} ${tzAbbreviation}`.trim()}</p>
        <p className="text-sm text-blue-300">{`Flux: ${data.observed_flux.toExponential(2)} W/m²`}</p>
        <p className="text-sm" style={{ color: XRAY_FLUX_THRESHOLDS.find(t => t.name === classification)?.color || '#FFFFFF' }}>
          {`Class: ${classification}-Class`}
        </p>
      </div>
    );
  }
  return null;
};


export const XRayFluxChart: React.FC = () => {
  const [data, setData] = useState<XRayFluxDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true); // Set loading true at the start of fetch
    // setError(null); // Clear previous error - can be too aggressive if showing stale data during load
    try {
      const fluxData = await getXRayFlux();
      setData(fluxData.slice(-120)); 
      setError(null); // Clear error only on successful fetch
    } catch (err) {
      const newError = err instanceof Error ? err.message : 'Failed to fetch X-Ray flux data.';
      setError(newError); // Set error if fetch fails
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

  if (isLoading && data.length === 0) return <LoadingSpinner text="Loading X-Ray Flux..." />;
  if (error && data.length === 0) return <ErrorMessage message={error} />; // Show error only if no data at all
  if (data.length === 0 && !isLoading) return <p className="text-gray-400 text-center py-4">No X-Ray flux data available.</p>;

  return (
    <div className="h-96 w-full"> 
      {error && data.length > 0 && <ErrorMessage message={`Failed to update X-Ray flux: ${error}`} /> /* Show non-blocking error if stale data exists */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 25, bottom: 35 }}> {/* Increased bottom margin */}
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} stroke="#A0AEC0" />
          <XAxis
            dataKey="time_tag"
            tickFormatter={formatXAxisTick}
            stroke="#A0AEC0"
            dy={10}
            tick={{ fontSize: '0.75rem' }}
            interval="preserveStartEnd" // Ensure first and last ticks are shown
            label={{ value: "Time", position: "insideBottom", dy: 25, fill:"#A0AEC0", fontSize: '0.8rem' }}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']} 
            allowDataOverflow={true}
            tickFormatter={formatYAxisTick}
            stroke="#A0AEC0"
            dx={-5}
            tick={{ fontSize: '0.75rem' }}
            label={{ value: "Flux (W/m²)", angle: -90, position: "insideLeft", dx: -20, fill:"#A0AEC0", fontSize: '0.8rem' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} wrapperStyle={{color: "#A0AEC0"}}/>
          <Line
            type="monotone"
            dataKey="observed_flux"
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={false}
            name="GOES X-Ray Flux (0.1-0.8nm)"
          />
          {XRAY_FLUX_THRESHOLDS.map((threshold: XRayFluxThreshold) => (
            <ReferenceLine
              key={threshold.name}
              y={threshold.value}
              stroke={threshold.color}
              strokeDasharray="2 2"
              strokeOpacity={0.7}
            >
              {/* Legend for ReferenceLine labels is tricky in Recharts, often requires custom legend */}
              {/* <Label value={threshold.name} position="right" fill={threshold.color} fontSize="0.7rem" dx={5} /> */}
            </ReferenceLine>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
