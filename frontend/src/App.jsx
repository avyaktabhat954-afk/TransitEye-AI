import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LiveAI from './components/LiveAI';
import TelemetryCards from './components/TelemetryCards';
import LiveMap from './components/LiveMap';
import IncidentFeed from './components/IncidentFeed';
import IncidentDrawer from './components/IncidentDrawer';
import LifecycleBoard from './components/LifecycleBoard';
import LifecycleDetail from './components/LifecycleDetail';
import AnalyticsPanel from './components/AnalyticsPanel';
import OperationalInsights from './components/OperationalInsights';
import { getDetections, getIncidents, getVehicleDensity } from './services/api';
import { Radio, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  // Initial application load tab
  const [activeTab, setActiveTab] = useState('landing');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [focusedLocation, setFocusedLocation] = useState(null);
  const [mapHighlightFilter, setMapHighlightFilter] = useState(null);

  const handleFocusMap = useCallback((location) => {
    if (!location) return;
    setActiveTab((prev) => (prev === 'overview' || prev === 'map' ? prev : 'overview'));
    setFocusedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: Date.now(),
    });
  }, []);

  const handleFocusType = useCallback((type) => {
    setMapHighlightFilter(type);
    setActiveTab((prev) => (prev === 'overview' || prev === 'map' ? prev : 'overview'));
  }, []);

  const handleClearHighlight = useCallback(() => {
    setMapHighlightFilter(null);
  }, []);

  // Map Layer Visibility State (Default: all layers ON)
  const [layersState, setLayersState] = useState({
    road_defect: true,
    waterlogging: true,
    vru_safety: true,
    traffic: true,
  });

  const handleToggleLayer = useCallback((layerId) => {
    setLayersState((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  }, []);

  const [detectionsState, setDetectionsState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const [incidentsState, setIncidentsState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const [vehicleDensityState, setVehicleDensityState] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const fetchAllTelemetry = useCallback(async () => {
    setIsRefreshing(true);

    // Fetch Detections
    setDetectionsState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getDetections();
      setDetectionsState({ loading: false, data: res, error: null });
    } catch (err) {
      setDetectionsState({ loading: false, data: null, error: err.message });
    }

    // Fetch Incidents
    setIncidentsState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getIncidents();
      setIncidentsState({ loading: false, data: res, error: null });
    } catch (err) {
      setIncidentsState({ loading: false, data: null, error: err.message });
    }

    // Fetch Vehicle Density
    setVehicleDensityState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getVehicleDensity();
      setVehicleDensityState({ loading: false, data: res, error: null });
    } catch (err) {
      setVehicleDensityState({ loading: false, data: null, error: err.message });
    }

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAllTelemetry();
  }, [fetchAllTelemetry]);

  // Reconcile selectedIncident on fresh data arrival
  useEffect(() => {
    setSelectedIncident((prev) => {
      if (!prev) return null;
      const list = incidentsState.data?.data;
      if (Array.isArray(list)) {
        const match = list.find((item) => item.id === prev.id);
        return match || null;
      }
      return prev;
    });
  }, [incidentsState.data]);

  // Reconcile selectedDetection on fresh data arrival
  useEffect(() => {
    setSelectedDetection((prev) => {
      if (!prev) return null;
      const list = detectionsState.data?.data;
      if (Array.isArray(list)) {
        const match = list.find((item) => item.id === prev.id);
        return match || null;
      }
      return prev;
    });
  }, [detectionsState.data]);

  const isAnyConnected =
    detectionsState.data || incidentsState.data || vehicleDensityState.data;
  const isAnyLoading =
    detectionsState.loading && incidentsState.loading && vehicleDensityState.loading;

  const connectionStatus = isAnyLoading
    ? 'loading'
    : isAnyConnected
      ? 'connected'
      : 'error';

  // Landing Page Render Mode
  if (activeTab === 'landing') {
    return <LandingPage onEnterDashboard={() => setActiveTab('live-ai')} />;
  }

  return (
    <div className="min-h-screen bg-[#08090e] text-white flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Consolidated Top Command Center Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionStatus={connectionStatus}
        onRefresh={fetchAllTelemetry}
        isRefreshing={isRefreshing}
        layersState={layersState}
        onToggleLayer={handleToggleLayer}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex pt-16">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          layersState={layersState}
          onToggleLayer={handleToggleLayer}
        />

        <main className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full min-w-0">
          
          {/* LIVE AI PLATFORM TAB */}
          {activeTab === 'live-ai' && (
            <LiveAI />
          )}

          {/* MAIN OVERVIEW / DASHBOARD TAB */}
          {activeTab === 'overview' && (
            <>
              <div className="glass-panel p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white font-mono uppercase flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400" />
                    Municipal Urban Perception Dashboard
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    Real-time GIS perception telemetry aggregated across public bus transit fleets.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/40 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Edge Node Stream: Active</span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase text-gray-400 tracking-wider">
                  Fleet Perception Overview
                </h3>
                <TelemetryCards
                  detections={detectionsState}
                  incidents={incidentsState}
                  vehicleDensity={vehicleDensityState}
                  onFocusType={handleFocusType}
                  onSelectTab={setActiveTab}
                />
              </section>

              <section className="space-y-2">
                <OperationalInsights
                  detections={detectionsState}
                  incidents={incidentsState}
                  vehicleDensity={vehicleDensityState}
                  onSelectDetection={setSelectedDetection}
                  onFocusType={handleFocusType}
                  onSelectTab={setActiveTab}
                  onFocusMap={handleFocusMap}
                />
              </section>

              <section className="space-y-2">
                <LiveMap
                  detections={detectionsState}
                  vehicleDensity={vehicleDensityState}
                  layersState={layersState}
                  selectedDetection={selectedDetection}
                  onSelectDetection={setSelectedDetection}
                  focusedLocation={focusedLocation}
                  mapHighlightFilter={mapHighlightFilter}
                  onClearHighlight={handleClearHighlight}
                />
              </section>

              <section className="space-y-2">
                <IncidentFeed
                  incidents={incidentsState}
                  onSelect={setSelectedIncident}
                />
              </section>
            </>
          )}

          {/* LIVE CITY MAP TAB */}
          {activeTab === 'map' && (
            <section className="space-y-2">
              <LiveMap
                detections={detectionsState}
                vehicleDensity={vehicleDensityState}
                layersState={layersState}
                selectedDetection={selectedDetection}
                onSelectDetection={setSelectedDetection}
                focusedLocation={focusedLocation}
                mapHighlightFilter={mapHighlightFilter}
                onClearHighlight={handleClearHighlight}
              />
            </section>
          )}

          {/* ANPR INCIDENTS TAB */}
          {activeTab === 'incidents' && (
            <section className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase text-gray-300 tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                ANPR Violation Stream
              </h3>
              <IncidentFeed
                incidents={incidentsState}
                onSelect={setSelectedIncident}
              />
            </section>
          )}

          {/* REPAIR LIFECYCLE TAB */}
          {activeTab === 'lifecycle' && (
            <section className="space-y-2">
              <LifecycleBoard
                detections={detectionsState}
                selectedDetection={selectedDetection}
                onSelectDetection={setSelectedDetection}
                onFocusMap={handleFocusMap}
              />
            </section>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <section className="space-y-2">
              <AnalyticsPanel
                detections={detectionsState}
                vehicleDensity={vehicleDensityState}
                incidents={incidentsState}
                onSelectTab={setActiveTab}
              />
            </section>
          )}

        </main>
      </div>

      {/* ANPR Evidence Drawer Overlay */}
      <IncidentDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onFocusMap={handleFocusMap}
      />

      {/* Spatial Detection Inspection Drawer Overlay */}
      <LifecycleDetail
        detection={selectedDetection}
        onClose={() => setSelectedDetection(null)}
        onFocusMap={handleFocusMap}
      />
    </div>
  );
}
