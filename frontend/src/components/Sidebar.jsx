import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  AlertOctagon, 
  GitCommit, 
  BarChart3, 
  Layers, 
  Radio, 
  AlertTriangle, 
  ShieldAlert, 
  Droplet,
  Car,
  Check,
  X,
  Cpu,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, layersState = {}, onToggleLayer }) {
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-ai', label: 'Live AI Platform', icon: Cpu, isHighlight: true, badge: 'PERCEPTION' },
    { id: 'map', label: 'Live City Map', icon: MapPin },
    { id: 'incidents', label: 'Incidents & ANPR', icon: AlertOctagon },
    { id: 'lifecycle', label: 'Repair Lifecycle', icon: GitCommit },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
  ];

  const mapLayerItems = [
    { id: 'road_defect', name: 'Road Defects', icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-700/50' },
    { id: 'waterlogging', name: 'Waterlogging', icon: Droplet, color: 'text-cyan-400', border: 'border-cyan-700/50' },
    { id: 'vru_safety', name: 'VRU Risk Overlay', icon: ShieldAlert, color: 'text-rose-400', border: 'border-rose-700/50' },
    { id: 'traffic', name: 'Traffic Observations', icon: Car, color: 'text-emerald-400', border: 'border-emerald-700/50' },
  ];

  return (
    <aside className="w-64 bg-[#0a0c13] border-r border-zinc-800/80 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="p-4 space-y-6">
        {/* Main Operations Navigation */}
        <div>
          <h2 className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Operations Navigation
          </h2>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? item.isHighlight
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/40 font-semibold'
                        : 'bg-zinc-900 text-white border border-zinc-700 shadow-sm font-semibold'
                      : item.isHighlight
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? item.isHighlight ? 'text-emerald-400' : 'text-white' 
                        : item.isHighlight ? 'text-emerald-400' : 'text-gray-400'
                    }`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* GIS Map Layers Interactive Controls */}
        <div className="pt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between px-3 mb-2">
            <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              GIS Map Layers
            </h2>
          </div>
          <div className="space-y-1.5 px-1">
            {mapLayerItems.map((layer) => {
              const LayerIcon = layer.icon;
              const isEnabled = Boolean(layersState[layer.id]);
              return (
                <button
                  key={layer.id}
                  onClick={() => onToggleLayer && onToggleLayer(layer.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    isEnabled
                      ? 'bg-zinc-900/90 text-gray-200 border-zinc-700 shadow-sm'
                      : 'bg-zinc-950/40 text-gray-500 border-zinc-900 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayerIcon className={`w-3.5 h-3.5 ${isEnabled ? layer.color : 'text-gray-600'}`} />
                    <span className="truncate">{layer.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      isEnabled
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-zinc-900 text-gray-600 border border-zinc-800'
                    }`}
                  >
                    {isEnabled ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                    {isEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edge Fleet Info Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-[#07080e]">
        <div className="flex items-center gap-2 text-xs text-gray-300 font-mono mb-1">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Edge Fleet Perception</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          Mobile transit AI streaming canonical telemetry to Express/PostGIS backend.
        </p>
      </div>
    </aside>
  );
}
