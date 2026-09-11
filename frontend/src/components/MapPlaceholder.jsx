import React from 'react';
import { MapPin, Navigation, Layers, Compass, Crosshair } from 'lucide-react';

export default function MapPlaceholder() {
  return (
    <div className="relative w-full h-[520px] bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between p-6">
      {/* Subtle Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Map HUD Bar */}
      <div className="relative z-10 flex items-center justify-between bg-slate-900/90 border border-slate-800/80 px-4 py-2.5 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            LIVE CITY MAP — GIS PERCEPTION LAYER
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Delhi NCR (28.6139° N, 77.2090° E)
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
            Stage 3 Reserved Area
          </span>
        </div>
      </div>

      {/* Center Map Placeholder Callout */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/70 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shadow-xl mb-4">
          <MapPin className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1 tracking-wide font-mono">
          OPERATIONAL GIS MAP PLACEHOLDER
        </h3>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-4">
          Interactive Leaflet map container initialized in Stage 3. Will display live road defect markers, VRU hazard overlays, waterlogging locations, and traffic density heatmaps.
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Leaflet + OpenStreetMap engine pending Stage 3 integration</span>
        </div>
      </div>

      {/* Bottom Map HUD Controls Bar */}
      <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Projection: WGS84
          </span>
          <span>Zoom Level: 12</span>
        </div>
        <div>
          <span>Edge Fleet Coverage: 100% Active Routes</span>
        </div>
      </div>
    </div>
  );
}
