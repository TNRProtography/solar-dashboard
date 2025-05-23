
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section } from './Section';
import { XRayFluxChart } from './XRayFluxChart';
import { ProtonFluxDisplay } from './ProtonFluxDisplay';
import { ImageryViewer } from './ImageryViewer';
import { EventList } from './EventList';
import { 
    SUVI_304_URL, SUVI_131_URL, LASCO_C2_URL, LASCO_C3_URL, 
    SUVI_304_ANIMATED_URL, SUVI_131_ANIMATED_URL, 
    REFRESH_INTERVAL_MS
} from '../constants';
import type { SolarFlare, CME, GeomagneticStorm, InterplanetaryShock, AssociatedCMEInfo, EnhancedCME } from '../types';
import { getCMEs as fetchDonkiCMEs, getSolarFlares as fetchDonkiSolarFlares, getInterplanetaryShocks as fetchDonkiIPS } from '../services/nasaApiService';

const HelpTextList: React.FC<{ items: { term: string, definition: string }[] }> = ({ items }) => (
  <ul className="list-disc list-inside space-y-1 text-left">
    {items.map(item => (
      <li key={item.term}>
        <strong className="text-blue-300">{item.term}:</strong> {item.definition}
      </li>
    ))}
  </ul>
);

const Dashboard: React.FC = () => {
  const [processedCMEs, setProcessedCMEs] = useState<EnhancedCME[]>([]);
  const [cmeError, setCmeError] = useState<string | null>(null);
  const [cmeIsLoading, setCmeIsLoading] = useState<boolean>(true);

  const [processedFlares, setProcessedFlares] = useState<SolarFlare[]>([]);
  const [flaresError, setFlaresError] = useState<string | null>(null);
  const [flaresIsLoading, setFlaresIsLoading] = useState<boolean>(true);

  const [processedIPS, setProcessedIPS] = useState<InterplanetaryShock[]>([]);
  const [ipsError, setIpsError] = useState<string | null>(null);
  const [ipsIsLoading, setIpsIsLoading] = useState<boolean>(true);

  const getPastDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = getPastDate(7);
  const tenDaysAgo = getPastDate(10); 

  const isPotentiallyEarthRelevant = useCallback((cme: CME): boolean => {
    if (!cme.cmeAnalyses || cme.cmeAnalyses.length === 0) {
      return false;
    }
    return cme.cmeAnalyses.some(analysis =>
      analysis.isMostAccurate || 
      (analysis.enlilList && analysis.enlilList.length > 0) ||
      (analysis.note && analysis.note.toLowerCase().includes("earth"))
    );
  }, []);


  const enhanceCMEData = useCallback((cme: CME): EnhancedCME => {
    const enhanced: EnhancedCME = { ...cme, earthImpactScore: Infinity };
    enhanced.isPotentiallyEarthDirected = isPotentiallyEarthRelevant(cme);

    const mostAccurateAnalysis = cme.cmeAnalyses?.find(a => a.isMostAccurate);
    const relevantAnalysis = mostAccurateAnalysis || cme.cmeAnalyses?.[0];

    if (relevantAnalysis) {
      enhanced.displayAnalysisSpeed = relevantAnalysis.speed;
      enhanced.displayAnalysisHalfAngle = relevantAnalysis.halfAngle;
      enhanced.displayAnalysisType = relevantAnalysis.type;
      enhanced.displayAnalysisNote = relevantAnalysis.note; 

      const earthEnlilSimulations = relevantAnalysis.enlilList?.filter(enlil =>
        enlil.isEarthGB === true || (enlil.impactList && enlil.impactList.some(imp => imp.location === "Earth"))
      );
      
      const firstEarthEnlil = earthEnlilSimulations?.[0];

      if (firstEarthEnlil) {
        enhanced.displayEnlilArrivalTime = firstEarthEnlil.estimatedShockArrivalTime;
        enhanced.displayEnlilDuration = firstEarthEnlil.estimatedDuration;
        enhanced.displayEnlilImpactLocations = firstEarthEnlil.impactList?.map(imp => imp.location) || (firstEarthEnlil.isEarthGB ? ["Earth Geospace"] : []);

        if (firstEarthEnlil.estimatedShockArrivalTime) {
          enhanced.earthImpactScore = 1; 
        } else {
          enhanced.earthImpactScore = 2; 
        }
      } else if (relevantAnalysis.note && relevantAnalysis.note.toLowerCase().includes("earth")) {
        const anyEnlilWithImpact = relevantAnalysis.enlilList?.find(e => e.impactList && e.impactList.length > 0);
        if (anyEnlilWithImpact && enhanced.earthImpactScore! > 2) { 
            enhanced.displayEnlilArrivalTime = anyEnlilWithImpact.impactList![0].arrivalTime; 
        }
        if(enhanced.earthImpactScore! > 2) enhanced.earthImpactScore = 3; 
      } else if (relevantAnalysis.enlilList && relevantAnalysis.enlilList.length > 0) {
        if(enhanced.earthImpactScore! > 3) enhanced.earthImpactScore = 4;
      }
    }
    return enhanced;
  }, [isPotentiallyEarthRelevant]);


  const loadCMEData = useCallback(async () => {
    setCmeIsLoading(true);
    setCmeError(null);
    try {
      const donkiCMEs = await fetchDonkiCMEs(sevenDaysAgo, today); 
      const enhancedCMEs = donkiCMEs.map(enhanceCMEData);
      enhancedCMEs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setProcessedCMEs(enhancedCMEs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CME data.';
      console.error("Dashboard Error: ", errorMessage, err);
      setCmeError(errorMessage);
      setProcessedCMEs([]);
    } finally {
      setCmeIsLoading(false);
    }
  }, [sevenDaysAgo, today, enhanceCMEData]);

  const loadFlareAndCorrelateData = useCallback(async () => {
    setFlaresIsLoading(true);
    setFlaresError(null);
    try {
      const rawCmesForCorrelation = await fetchDonkiCMEs(sevenDaysAgo, today);
      const enhancedCmesForCorrelation = rawCmesForCorrelation.map(enhanceCMEData);
      
      const cmeMap = new Map<string, EnhancedCME>();
      enhancedCmesForCorrelation.forEach(cme => cmeMap.set(cme.activityID, cme));

      let solarFlares = await fetchDonkiSolarFlares(sevenDaysAgo, today);
      solarFlares = solarFlares.map(flare => {
        const linkedCMEInfos: AssociatedCMEInfo[] = [];
        if (flare.linkedEvents) {
          flare.linkedEvents.forEach(le => {
            const linkedEnhancedCME = cmeMap.get(le.activityID);
            if (linkedEnhancedCME) {
              linkedCMEInfos.push({
                activityID: linkedEnhancedCME.activityID,
                startTime: linkedEnhancedCME.startTime,
                note: linkedEnhancedCME.note, 
                link: linkedEnhancedCME.link,
                earthImpactScore: linkedEnhancedCME.earthImpactScore,
              });
            }
          });
        }
        return { ...flare, associatedCMEs: linkedCMEInfos.length > 0 ? linkedCMEInfos : undefined };
      });
      
      solarFlares.sort((a, b) => new Date(b.beginTime).getTime() - new Date(a.beginTime).getTime());
      setProcessedFlares(solarFlares);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load and process Solar Flare data.';
      console.error("Dashboard Error: ", errorMessage, err);
      setFlaresError(errorMessage);
      setProcessedFlares([]);
    } finally {
      setFlaresIsLoading(false);
    }
  }, [sevenDaysAgo, today, enhanceCMEData]);

  const loadIPSAndCorrelateData = useCallback(async () => {
    setIpsIsLoading(true);
    setIpsError(null);
    try {
      const rawCmesForIPSCorrelation = await fetchDonkiCMEs(tenDaysAgo, today);
      const enhancedCmesForIPSCorrelation = rawCmesForIPSCorrelation.map(enhanceCMEData);
      
      const cmeMap = new Map<string, EnhancedCME>();
      enhancedCmesForIPSCorrelation.forEach(cme => cmeMap.set(cme.activityID, cme));

      let ipsEvents = await fetchDonkiIPS(sevenDaysAgo, today);
      ipsEvents = ipsEvents.map(ips => {
        let associatedCMESpeed: number | undefined;
        let associatedCMEStartTime: string | undefined;
        let associatedCMELink: string | undefined;
        let associatedCMEActivityID: string | undefined;

        if (ips.linkedEvents) {
          for (const le of ips.linkedEvents) {
            const linkedCME = cmeMap.get(le.activityID); 
            if (linkedCME) {
              associatedCMESpeed = linkedCME.displayAnalysisSpeed || undefined; 
              associatedCMEStartTime = linkedCME.startTime;
              associatedCMELink = linkedCME.link;
              associatedCMEActivityID = linkedCME.activityID;
              break; 
            }
          }
        }
        return { ...ips, associatedCMESpeed, associatedCMEStartTime, associatedCMELink, associatedCMEActivityID };
      });
      
      ipsEvents.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
      setProcessedIPS(ipsEvents);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load and process Interplanetary Shock data.';
      console.error("Dashboard Error: ", errorMessage, err);
      setIpsError(errorMessage);
      setProcessedIPS([]);
    } finally {
      setIpsIsLoading(false);
    }
  }, [sevenDaysAgo, tenDaysAgo, today, enhanceCMEData]);


  useEffect(() => {
    loadCMEData();
    const cmeIntervalId = setInterval(loadCMEData, REFRESH_INTERVAL_MS.DONKI_EVENTS);
    return () => clearInterval(cmeIntervalId);
  }, [loadCMEData]);

  useEffect(() => {
    loadFlareAndCorrelateData();
    const flareIntervalId = setInterval(loadFlareAndCorrelateData, REFRESH_INTERVAL_MS.DONKI_EVENTS);
    return () => clearInterval(flareIntervalId);
  }, [loadFlareAndCorrelateData]);

  useEffect(() => {
    loadIPSAndCorrelateData();
    const ipsIntervalId = setInterval(loadIPSAndCorrelateData, REFRESH_INTERVAL_MS.DONKI_EVENTS);
    return () => clearInterval(ipsIntervalId);
  }, [loadIPSAndCorrelateData]);

  const earthDirectedCMEs = useMemo(() => {
    return processedCMEs
      .filter(cme => (cme.earthImpactScore || Infinity) <= 3) 
      .sort((a, b) => {
        if (a.earthImpactScore !== b.earthImpactScore) {
          return (a.earthImpactScore || Infinity) - (b.earthImpactScore || Infinity);
        }
        if (a.earthImpactScore === 1 && b.earthImpactScore === 1) {
          const timeA = a.displayEnlilArrivalTime ? new Date(a.displayEnlilArrivalTime).getTime() : Infinity;
          const timeB = b.displayEnlilArrivalTime ? new Date(b.displayEnlilArrivalTime).getTime() : Infinity;
          if (timeA !== timeB) return timeA - timeB; 
        }
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime(); 
      });
  }, [processedCMEs]);

  const otherCMEs = useMemo(() => 
    processedCMEs.filter(cme => !earthDirectedCMEs.find(edCME => edCME.activityID === cme.activityID)),
  [processedCMEs, earthDirectedCMEs]);

  // Help Text Definitions
  const xrayFluxHelp = (
    <>
      <p className="mb-2">GOES X-Ray flux measures solar flares. Higher flux means stronger flares.</p>
      <HelpTextList items={[
        { term: 'Flux (W/m²)', definition: 'Watts per square meter, measures X-ray intensity.' },
        { term: 'Classifications', definition: 'A, B, C, M, X (weakest to strongest). Each class is 10x stronger than the previous.' },
      ]} />
    </>
  );

  const protonFluxHelp = (
    <>
      <p className="mb-2">GOES Proton flux measures solar energetic particle (SEP) events, often associated with strong flares or CMEs.</p>
      <HelpTextList items={[
        { term: 'Flux (pfu)', definition: 'Particle Flux Units (particles/cm²-s-sr).' },
        { term: 'S-Scale', definition: 'S1 (Minor) to S5 (Extreme) indicates severity of radiation storms.' },
      ]} />
    </>
  );

  const imageryHelp = (
    <>
      <p className="mb-2">Real-time images of the Sun from different instruments:</p>
      <HelpTextList items={[
        { term: 'SUVI 304Å & 131Å', definition: 'Solar Ultraviolet Imager showing the Sun\'s chromosphere and corona at different temperatures (NOAA GOES). Hover for animation.' },
        { term: 'LASCO C2 & C3', definition: 'Coronagraphs blocking the Sun\'s bright disk to view CMEs (NASA/ESA SOHO).' },
      ]} />
    </>
  );
  
  const earthDirectedCMEHelp = (
    <>
      <p className="mb-2">Coronal Mass Ejections (CMEs) that are modeled or analyzed to potentially impact Earth.</p>
      <HelpTextList items={[
        { term: 'Activity ID', definition: 'Unique identifier for the CME event.' },
        { term: 'Start Time', definition: 'When the CME was first observed.' },
        { term: 'Est. Arrival Time', definition: 'Estimated arrival time at Earth from ENLIL model simulation.' },
        { term: 'Source', definition: 'Region on the Sun where the CME originated.' },
        { term: 'Analysis Speed', definition: 'Speed of the CME from scientific analysis (km/s).' },
        { term: 'Analysis Half Angle', definition: 'Angular width of the CME in degrees.' },
        { term: 'Analysis Type', definition: 'Shape/type classification (e.g., S-type, C-type).' },
        { term: 'Est. Impact Duration', definition: 'Estimated duration of the CME\'s impact on Earth\'s magnetosphere (hours).' },
        { term: 'Impact Locations', definition: 'Locations the ENLIL model predicts an impact (e.g., Earth, STEREO A).' },
        { term: 'CME Analysis Note', definition: 'Full text from the most relevant scientific analysis of the CME.' },
        { term: 'Original CME Note', definition: 'Initial note recorded with the CME observation.' },
        { term: 'Earth Impact Score', definition: 'Internal score: 1 (highest concern, Enlil Earth impact + arrival time) to 3 (moderate concern, e.g. note mentions Earth). Lower is more critical. This list shows CMEs with score 1, 2, or 3.' },
      ]} />
    </>
  );

  const solarFlareHelp = (
    <>
      <p className="mb-2">Sudden flashes of increased brightness on the Sun, usually observed near sunspots.</p>
      <HelpTextList items={[
        { term: 'Class Type', definition: 'Flare classification (e.g., M1.5, X2.0) indicating its peak X-ray flux.' },
        { term: 'Begin/Peak/End Time', definition: 'Timeline of the solar flare event.' },
        { term: 'Region', definition: 'Heliographic location on the Sun where the flare occurred.' },
        { term: 'Active Region #', definition: 'NOAA active region number associated with the flare, if any.' },
        { term: 'Associated CMEs', definition: 'Details of Coronal Mass Ejections linked to this flare. Highlighted orange if potentially Earth-directed (based on Enlil model - score 1 or 2).' },
      ]} />
    </>
  );
  
  const otherCMEHelp = (
    <>
      <p className="mb-2">Other Coronal Mass Ejections not meeting the stricter criteria for the \"Potentially Earth-Directed\" list (e.g. score 4 or no specific Earth indicators).</p>
       <HelpTextList items={[
        { term: 'Activity ID', definition: 'Unique identifier for the CME event.' },
        { term: 'Start Time', definition: 'When the CME was first observed.' },
        { term: 'Source', definition: 'Region on the Sun where the CME originated.' },
        { term: 'Note', definition: 'Initial note recorded with the CME observation.' },
        { term: 'Analysis Speed', definition: 'Speed of the CME from scientific analysis (km/s).' }, 
        { term: 'Analysis Half Angle', definition: 'Angular width of the CME in degrees.' },
      ]} />
    </>
  );

  const geomagneticStormHelp = (
    <>
      <p className="mb-2">Disturbances in Earth's magnetosphere, often caused by CMEs or fast solar wind streams.</p>
      <HelpTextList items={[
        { term: 'GST ID', definition: 'Unique identifier for the geomagnetic storm event.' },
        { term: 'Start Time', definition: 'When the storm conditions began.' },
        { term: 'Kp Indices', definition: 'List of Kp index values during the storm. Kp is a global measure of geomagnetic activity (0=quiet, 9=extreme storm).' },
        { term: 'Note', definition: 'Associated notes from forecasters.' },
      ]} />
    </>
  );

  const interplanetaryShockHelp = (
    <>
      <p className="mb-2">Abrupt changes in solar wind parameters, often marking the arrival of a CME or solar wind structure.</p>
      <HelpTextList items={[
        { term: 'IPS ID', definition: 'Unique identifier for the shock event.' },
        { term: 'Event Time', definition: 'Time the shock was observed/detected.' },
        { term: 'Location', definition: 'Location where the shock was observed (e.g., a specific spacecraft like DSCOVR or ACE).' },
        { term: 'Instruments', definition: 'Instruments that detected the shock event.' },
        { term: 'Causative CME Speed/Time', definition: 'Details of the CME believed to have caused this shock.' },
        { term: 'Note', definition: 'Associated notes from forecasters, may include observed parameters like Bz, speed, density if manually entered.' },
      ]} />
    </>
  );

  return (
    <main className="space-y-6">
      {/* Row 1: Flux Monitors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Live X-Ray Flux (GOES 0.1-0.8nm)" className="lg:col-span-2" helpText={xrayFluxHelp}>
          <XRayFluxChart />
        </Section>
        <Section title="Live Proton Flux (GOES >=10 MeV)" helpText={protonFluxHelp}>
          <ProtonFluxDisplay />
        </Section>
      </div>

      {/* Row 2: Imagery */}
      <Section title="Solar Imagery (Latest)" helpText={imageryHelp}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ImageryViewer 
            title="SUVI 304Å" 
            imageUrl={SUVI_304_URL} 
            animatedImageUrl={SUVI_304_ANIMATED_URL}
            refreshInterval={REFRESH_INTERVAL_MS.IMAGERY} 
          />
          <ImageryViewer 
            title="SUVI 131Å" 
            imageUrl={SUVI_131_URL} 
            animatedImageUrl={SUVI_131_ANIMATED_URL}
            refreshInterval={REFRESH_INTERVAL_MS.IMAGERY} 
          />
          <ImageryViewer 
            title="LASCO C2" 
            imageUrl={LASCO_C2_URL} 
            refreshInterval={REFRESH_INTERVAL_MS.IMAGERY} 
          />
          <ImageryViewer 
            title="LASCO C3" 
            imageUrl={LASCO_C3_URL} 
            refreshInterval={REFRESH_INTERVAL_MS.IMAGERY} 
          />
        </div>
      </Section>
      
      {/* Row 3: Potentially Earth Directed CMEs */}
       <Section title="Potentially Earth-Directed CMEs (Last 7 Days)" helpText={earthDirectedCMEHelp}>
         <EventList<EnhancedCME>
            eventType="CME" 
            events={earthDirectedCMEs}
            isLoading={cmeIsLoading}
            error={cmeError}
            displayProps={{
              titleKey: 'activityID',
              timeKeys: ['startTime', 'displayEnlilArrivalTime'],
              details: [
                { label: 'Source', key: 'sourceLocation'},
                { label: 'Analysis Speed (km/s)', key: 'displayAnalysisSpeed' },
                { label: 'Analysis Half Angle (°)', key: 'displayAnalysisHalfAngle' },
                { label: 'Analysis Type', key: 'displayAnalysisType' },
                { label: 'Est. Impact Duration (hrs)', key: 'displayEnlilDuration'},
                { label: 'Impact Locations', key: 'displayEnlilImpactLocations'}, 
                { label: 'CME Analysis Note', key: 'displayAnalysisNote', truncate: undefined }, 
                { label: 'Original CME Note', key: 'note', truncate: 100 } 
              ]
            }}
            highlightCondition={(cme) => (cme.earthImpactScore || Infinity) <= 2} 
         />
       </Section>

      {/* Row 4: Event Lists - Flares & Other CMEs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Solar Flares (Last 7 Days)" helpText={solarFlareHelp}>
          <EventList<SolarFlare>
            eventType="FLR"
            events={processedFlares}
            isLoading={flaresIsLoading}
            error={flaresError}
            displayProps={{
              titleKey: 'classType',
              timeKeys: ['beginTime', 'peakTime', 'endTime'],
              details: [
                { label: 'Region', key: 'sourceLocation' },
                { label: 'Active Region #', key: 'activeRegionNum' },
              ]
            }}
          />
        </Section>
        <Section title="Other Coronal Mass Ejections (Last 7 Days)" helpText={otherCMEHelp}>
          <EventList<EnhancedCME> 
            eventType="CME" 
            events={otherCMEs} 
            isLoading={cmeIsLoading}
            error={cmeError}
            displayProps={{
              titleKey: 'activityID',
              timeKeys: ['startTime'],
              details: [
                { label: 'Source', key: 'sourceLocation'},
                { label: 'Note', key: 'note', truncate: 100 },
                { label: 'Analysis Speed (km/s)', key: 'displayAnalysisSpeed' }, 
                { label: 'Analysis Half Angle (°)', key: 'displayAnalysisHalfAngle' },
              ]
            }}
          />
        </Section>
      </div>


      {/* Row 5: Other Event Lists - GST & IPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Geomagnetic Storms (Last 7 Days)" helpText={geomagneticStormHelp}>
          <EventList<GeomagneticStorm>
            eventType="GST"
            startDate={sevenDaysAgo} 
            endDate={today}
            displayProps={{
              titleKey: 'gstID',
              timeKeys: ['startTime'],
              details: [
                { label: 'Kp Indices', key: 'allKpIndex'},
                { label: 'Note', key: 'note', truncate: 150 },
              ] 
            }}
          />
        </Section>
        <Section title="Interplanetary Shocks (Last 7 Days)" helpText={interplanetaryShockHelp}>
          <EventList<InterplanetaryShock>
            eventType="IPS"
            events={processedIPS}
            isLoading={ipsIsLoading}
            error={ipsError}
            displayProps={{
              titleKey: 'ipsID',
              timeKeys: ['eventTime', 'associatedCMEStartTime'],
              details: [
                { label: 'Location', key: 'locatioN' },
                { label: 'Instruments', key: 'instruments'},
                { label: 'Causative CME Speed (km/s)', key: 'associatedCMESpeed' },
                { label: 'Note', key: 'note', truncate: undefined }, 
              ]
            }}
          />
        </Section>
      </div>
    </main>
  );
};

export default Dashboard;
