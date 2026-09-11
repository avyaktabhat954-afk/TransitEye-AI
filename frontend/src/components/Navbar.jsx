import React, { useState, useEffect, useRef } from 'react';
import {
  UilBus,
  UilSync,
  UilBars,
  UilMultiply,
  UilLayers,
  UilApps,
  UilShieldExclamation,
  UilChartLine
} from '@iconscout/react-unicons';
import { Cpu } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  connectionStatus,
  onRefresh,
  isRefreshing,
  layersState = {},
  onToggleLayer
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide navbar on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsVisible(false); // Scroll down -> hide
      } else {
        setIsVisible(true); // Scroll up -> show
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: UilApps },
    { id: 'live-ai', label: 'Live AI', icon: Cpu, isHighlight: true },
    { id: 'incidents', label: 'Incidents & ANPR', icon: UilShieldExclamation },
    { id: 'lifecycle', label: 'Lifecycle', icon: UilSync },
    { id: 'analytics', label: 'Analytics', icon: UilChartLine },
  ];

  const layerItems = [
    { id: 'road_defect', name: 'Road Defects', color: 'bg-amber-400' },
    { id: 'waterlogging', name: 'Waterlogging', color: 'bg-cyan-400' },
    { id: 'vru_safety', name: 'VRU Safety', color: 'bg-rose-400' },
    { id: 'traffic', name: 'Traffic Segments', color: 'bg-emerald-400' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } bg-[#08090e]/90 backdrop-blur-xl border-b border-zinc-800/80 shadow-2xl`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* ── Brand Title & Landing Link ── */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <UilBus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base font-mono uppercase tracking-wider text-white">
                TransitEye
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                SIH 2026 AI
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block font-medium">
              Real-Time AI Perception & Urban Intelligence Platform
            </p>
          </div>
        </div>

        {/* ── Navigation Links (Desktop) ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'overview' && activeTab === 'map');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                  isActive
                    ? item.isHighlight
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-md font-semibold'
                      : 'bg-zinc-900 text-white border border-zinc-700 shadow-sm font-semibold'
                    : item.isHighlight
                    ? 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/20'
                    : 'text-gray-400 hover:bg-zinc-900/80 hover:text-gray-200 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.isHighlight ? 'text-emerald-400' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Controls & Actions ── */}
        <div className="flex items-center gap-2">
          
          {/* Layer Popover Control */}
          <div className="relative">
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="p-2 rounded-xl border border-zinc-800 text-gray-300 hover:bg-zinc-900 transition-colors text-xs font-mono flex items-center gap-1.5"
              title="Toggle Map Layers"
            >
              <UilLayers className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline text-[11px]">Layers</span>
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase text-gray-400 border-b border-zinc-800 pb-1">
                  GIS Map Layers
                </p>
                {layerItems.map((layer) => {
                  const isEnabled = Boolean(layersState[layer.id]);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => onToggleLayer && onToggleLayer(layer.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono text-gray-300 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${layer.color}`} />
                        <span>{layer.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isEnabled ? 'text-emerald-400' : 'text-gray-600'}`}>
                        {isEnabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Refresh Telemetry Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 transition-colors disabled:opacity-50"
            title="Refresh Telemetry"
          >
            <UilSync className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-zinc-800 text-gray-300 hover:bg-zinc-900"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <UilMultiply className="w-5 h-5" /> : <UilBars className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-2 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 ${
                  isActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-300 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
