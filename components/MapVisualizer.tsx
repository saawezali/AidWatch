import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CrisisSignal, Severity } from '../types';

interface MapProps {
  signals: CrisisSignal[];
  onSelectSignal: (signal: CrisisSignal) => void;
  selectedSignalId?: string;
}

// Simplified GeoJSON for world landmass (just coordinates for a rough outline or using D3's built-in simple projections without external data if possible. 
// However, D3 requires GeoJSON data. Since I can't load external files reliably without CORS, I will render a conceptual map using points or a very simplified grid).
// BETTER APPROACH: Use a static SVG background image of a world map and plot points on top based on Lat/Long conversion to % x/y.

const MapVisualizer: React.FC<MapProps> = ({ signals, onSelectSignal, selectedSignalId }) => {
  
  // Simple Mercator projection logic
  const latLngToXY = (lat: number, lng: number) => {
    const x = (lng + 180) * (100 / 360);
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (100 / 2) - (100 * mercN / (2 * Math.PI));
    // Clamp y for extreme poles
    const clampedY = Math.max(0, Math.min(100, y));
    return { x, y: clampedY };
  };

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case Severity.CRITICAL: return '#ef4444';
      case Severity.HIGH: return '#f97316';
      case Severity.MEDIUM: return '#eab308';
      case Severity.LOW: return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getSeverityRadius = (sev: Severity) => {
    switch (sev) {
      case Severity.CRITICAL: return 12;
      case Severity.HIGH: return 8;
      default: return 5;
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0b1121] overflow-hidden rounded-xl border border-gray-700 shadow-inner group">
      
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Rough World Map Silhouette (CSS shapes or SVG) - abstract representation */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
         <svg viewBox="0 0 1000 500" className="w-full h-full fill-gray-500">
             {/* Abstract continent shapes to give context without needing external GeoJSON */}
             {/* North America */}
             <path d="M 150 100 Q 250 100 300 200 L 250 300 Q 150 250 100 150 Z" />
             {/* South America */}
             <path d="M 280 320 L 350 320 L 320 450 L 280 400 Z" />
             {/* Europe/Asia */}
             <path d="M 450 100 L 850 100 L 800 300 L 600 350 L 500 200 Z" />
             {/* Africa */}
             <path d="M 480 220 L 600 220 L 580 400 L 500 350 Z" />
             {/* Australia */}
             <path d="M 800 350 L 900 350 L 880 420 L 820 400 Z" />
         </svg>
         <div className="absolute bottom-4 left-4 text-xs text-gray-600">Schematic View</div>
      </div>

      {/* Signal Points */}
      {signals.map((signal) => {
        const { x, y } = latLngToXY(signal.location.lat, signal.location.lng);
        const isSelected = selectedSignalId === signal.id;
        
        return (
          <div
            key={signal.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 hover:z-50"
            style={{ left: `${x}%`, top: `${y}%`, zIndex: isSelected ? 40 : 10 }}
            onClick={() => onSelectSignal(signal)}
          >
            {/* Ping animation for Critical */}
            {(signal.severity === Severity.CRITICAL || signal.severity === Severity.HIGH) && (
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping`} 
                    style={{ backgroundColor: getSeverityColor(signal.severity), width: '200%', height: '200%', left: '-50%', top: '-50%' }}></span>
            )}
            
            <div 
              className={`rounded-full border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all`}
              style={{ 
                backgroundColor: getSeverityColor(signal.severity),
                borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.3)',
                width: isSelected ? '24px' : `${getSeverityRadius(signal.severity) * 2}px`,
                height: isSelected ? '24px' : `${getSeverityRadius(signal.severity) * 2}px`,
              }}
            >
              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>

            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 bottom-full mb-2 w-48 bg-gray-900/90 backdrop-blur border border-gray-600 rounded p-2 text-xs opacity-0 hover:opacity-100 group-hover:block hidden pointer-events-none z-50">
                <div className="font-bold text-white">{signal.location.region}</div>
                <div className="text-gray-300 truncate">{signal.type}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MapVisualizer;