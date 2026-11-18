"use client";

import dynamic from 'next/dynamic';
import { useRef, useEffect } from 'react';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Globe data: only India location with prominent red marker
const globeData = [
  { lat: 17.3850, lng: 78.4867, size: 0.5, color: '#ef4444', label: 'Hyderabad, India · Remote operations' },
];

const ringsData = [
  { lat: 17.3850, lng: 78.4867, maxR: 7, propagationSpeed: 2, repeatPeriod: 1400, color: () => '#ef4444' },
];

const htmlData = [
  {
    lat: 17.3850,
    lng: 78.4867,
    name: 'Hyderabad, India',
  },
];

export default function GlobeSection() {
  const globeRef = useRef();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 1.9 }, 0);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-4 md:py-6 w-full">
      <div className="flex items-center justify-center w-full">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="#ffffff"
          width={360}
          height={360}
          initialLatitude={17.3850}
          initialLongitude={78.4867}
          initialCameraDistance={1.85}
          pointsData={globeData}
          pointColor="color"
          pointAltitude={0.08}
          pointRadius={0.55}
          pointLabel="label"
          ringsData={ringsData}
          ringColor="color"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          htmlElementsData={htmlData}
          htmlElement={(d) => {
            const el = document.createElement('div');
            el.innerHTML = `
              <div style="display:flex;align-items:center;gap:6px;transform:translate(-50%, -140%);pointer-events:none;">
                <div style="background:#ef4444;color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.05em;padding:3px 8px;border-radius:4px;box-shadow:0 4px 12px rgba(239,68,68,0.45);font-family:sans-serif;white-space:nowrap;border:1px solid #ffffff;">
                  HYDERABAD, INDIA<br /><span style="font-size:10px;font-weight:500;letter-spacing:0.02em;">REMOTE OPERATIONS</span>
                </div>
              </div>
            `;
            return el;
          }}
          atmosphereColor="#ef4444"
          atmosphereAltitude={0.08}
          animateIn={false}
          onGlobeReady={() => {
            if (globeRef.current) {
              const controls = globeRef.current.controls();
              controls.enabled = false;
              controls.autoRotate = false;
              controls.enableZoom = false;
              controls.enableRotate = false;
              controls.enablePan = false;
              controls.enableDamping = false;
              // Explicitly lock camera to face India directly towards viewer
              globeRef.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 1.9 }, 0);
            }
          }}
          onPointClick={(point) => {
            console.log('Clicked:', point.label);
          }}
        />
      </div>
    </div>
  );
}
