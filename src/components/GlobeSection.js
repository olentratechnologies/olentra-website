"use client";

import dynamic from 'next/dynamic';
import { useRef } from 'react';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Globe data for company locations
const globeData = [
  { lat: 40.2737, lng: -76.8844, size: 0.15, color: '#00d4ff', label: 'Harrisburg, PA, USA' },
  { lat: 17.3850, lng: 78.4867, size: 0.15, color: '#00d4ff', label: 'Hyderabad, India' },
];

// Arcs data for connectivity
const arcsData = [
  {
    startLat: 40.2737,
    startLng: -76.8844,
    endLat: 17.3850,
    endLng: 78.4867,
    color: '#00d4ff',
    stroke: 1,
  },
];

export default function GlobeSection() {
  const globeRef = useRef();

  return (
    <div className="flex items-center justify-center py-4 md:py-6 w-full">
      <div className="flex items-center justify-center w-full">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="#ffffff"
          width={300}
          height={300}
          initialLatitude={10}
          initialLongitude={78.4867}
          initialCameraDistance={1.8}
          pointsData={globeData}
          pointColor="color"
          pointAltitude={0.15}
          pointRadius={0.08}
          pointLabel="label"
          arcsData={arcsData}
          arcColor="color"
          arcStroke={0.8}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          atmosphereColor="#ffffff"
          atmosphereAltitude={0.1}
          animateIn={false}
          onGlobeReady={() => {
            if (globeRef.current) {
              const controls = globeRef.current.controls();
              controls.autoRotate = true;
              controls.autoRotateSpeed = 2.0;
              controls.enableDamping = true;
              controls.dampingFactor = 0.05;
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
