import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Compass, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Navigation, 
  Info,
  Radio,
  Layers,
  Droplet,
  ShieldAlert,
  Car,
  ChevronDown,
  ChevronUp,
  Filter,
  Maximize2,
  ExternalLink
} from 'lucide-react';

// Fallback operational map center (Delhi NCR operational corridor established in schema examples)
const DEFAULT_CENTER = [28.6139, 77.2090];
const DEFAULT_ZOOM = 12;

/**
 * Coordinate Validation Helper
 * Ensures latitude and longitude are valid finite numbers within geographic bounds.
 */
function isValidCoordinate(lat, lng) {
  const isLatValid =
    typeof lat === 'number' && !isNaN(lat) && isFinite(lat) && lat >= -90 && lat <= 90;
  const isLngValid =
    typeof lng === 'number' && !isNaN(lng) && isFinite(lng) && lng >= -180 && lng <= 180;
  return isLatValid && isLngValid;
}

/**
 * Leaflet Custom DIV Icon Generator for Detection Categories & Severity
 */
function createDetectionIcon(type, severity, isSelected = false) {
  let bgColor = 'bg-amber-500';
  let borderColor = 'border-amber-300';
  let glyph = '⚠️';

  if (type === 'waterlogging') {
    bgColor = 'bg-cyan-500';
    borderColor = 'border-cyan-300';
    glyph = '💧';
  } else if (type === 'vru_safety') {
    bgColor = 'bg-rose-500';
    borderColor = 'border-rose-300';
    glyph = '🛡️';
  }

  const isCritical = severity === 'critical';
  const isHigh = severity === 'high';
  const ringSize = isCritical ? 'w-9 h-9' : isHigh ? 'w-8 h-8' : 'w-7 h-7';
  const selectedStyle = isSelected
    ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50'
    : '';
  const selectedHalo = isSelected
    ? '<div class="absolute w-12 h-12 rounded-full border-2 border-cyan-400 bg-cyan-400/20 animate-ping opacity-80 pointer-events-none"></div>'
    : '';

  return L.divIcon({
    className: 'custom-gis-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${selectedHalo}
        ${isCritical && !isSelected ? `<div class="absolute ${ringSize} rounded-full ${bgColor} animate-ping opacity-75"></div>` : ''}
        <div class="relative ${ringSize} rounded-full ${bgColor} text-white font-bold text-xs flex items-center justify-center border-2 ${borderColor} shadow-lg transition-transform hover:scale-110 ${selectedStyle}">
          <span style="font-size: 13px; line-height: 1;">${glyph}</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Leaflet Custom DIV Icon Generator for Traffic Observations
 */
function createTrafficIcon(congestionLevel, vehicleCount) {
  let bgColor = 'bg-emerald-500';
  let borderColor = 'border-emerald-300';

  const level = String(congestionLevel || '').toLowerCase();
  if (level === 'high' || level === 'heavy') {
    bgColor = 'bg-rose-500';
    borderColor = 'border-rose-300';
  } else if (level === 'moderate' || level === 'medium') {
    bgColor = 'bg-amber-500';
    borderColor = 'border-amber-300';
  }

  return L.divIcon({
    className: 'custom-gis-traffic-marker',
    html: `
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bgColor} text-slate-950 font-mono font-bold text-[11px] border-2 ${borderColor} shadow-lg transition-transform hover:scale-105">
        <span style="font-size: 12px; line-height: 1;">🚗</span>
        <span>${vehicleCount}</span>
      </div>
    `,
    iconSize: [48, 26],
    iconAnchor: [24, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * MapBoundsController Component
 * - Performs initial bounds fit ONCE on data arrival.
 * - Performs explicit manual bounds fit when fitCounter changes.
 * - Prevents viewport movement on marker clicks or filter changes (FitBounds Safety).
 */
function MapBoundsController({ allCoordinates, fitCounter }) {
  const map = useMap();
  const hasFittedInitialRef = useRef(false);

  // Initial load fit
  useEffect(() => {
    if (!hasFittedInitialRef.current && allCoordinates && allCoordinates.length > 0) {
      map.fitBounds(allCoordinates, { padding: [50, 50], maxZoom: 14 });
      hasFittedInitialRef.current = true;
    }
  }, [allCoordinates, map]);

  // Explicit user trigger fit
  useEffect(() => {
    if (fitCounter > 0 && allCoordinates && allCoordinates.length > 0) {
      map.fitBounds(allCoordinates, { padding: [50, 50], maxZoom: 14 });
    }
  }, [fitCounter, allCoordinates, map]);

  return null;
}

/**
 * MapPanController Component
 * Smoothly pans map to a target WGS84 location when explicitly requested via "Focus on Map".
 */
function MapPanController({ focusedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (
      focusedLocation &&
      typeof focusedLocation.latitude === 'number' &&
      typeof focusedLocation.longitude === 'number' &&
      isFinite(focusedLocation.latitude) &&
      isFinite(focusedLocation.longitude)
    ) {
      map.flyTo([focusedLocation.latitude, focusedLocation.longitude], 15, {
        duration: 1.2,
      });
    }
  }, [focusedLocation, map]);

  return null;
}

/**
 * Returns true when a detection matches the active mapHighlightFilter.
 * Used to dim or fully show a marker.
 */
function detectionMatchesHighlight(detection, filter) {
  if (!filter) return true;
  if (filter === 'road_defect') return detection.type === 'road_defect';
  if (filter === 'waterlogging') return detection.type === 'waterlogging';
  if (filter === 'vru_safety') return detection.type === 'vru_safety';
  if (filter === 'high_critical') return detection.severity === 'high' || detection.severity === 'critical';
  if (filter === 'traffic') return false; // traffic markers handled separately
  return true;
}

const HIGHLIGHT_FILTER_LABELS = {
  road_defect: 'Road Defects',
  waterlogging: 'Waterlogging',
  vru_safety: 'VRU Safety',
  high_critical: 'High / Critical Severity',
  traffic: 'Traffic Observations',
};

export default function LiveMap({
  detections,
  vehicleDensity,
  layersState = {},
  selectedDetection = null,
  onSelectDetection,
  focusedLocation = null,
  mapHighlightFilter = null,
  onClearHighlight,
}) {
  const [showLegend, setShowLegend] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fitCounter, setFitCounter] = useState(0);

  const isDetectionsLoading = detections?.loading;
  const isDetectionsError = Boolean(detections?.error);
  const rawDetections = useMemo(
    () => (Array.isArray(detections?.data?.data) ? detections.data.data : []),
    [detections]
  );

  const isDensityLoading = vehicleDensity?.loading;
  const isDensityError = Boolean(vehicleDensity?.error);
  const rawDensity = useMemo(
    () => (Array.isArray(vehicleDensity?.data?.data) ? vehicleDensity.data.data : []),
    [vehicleDensity]
  );

  // Filter valid Detections
  const { validDetections } = useMemo(() => {
    const valid = [];
    rawDetections.forEach((item) => {
      const lat = item?.location?.latitude;
      const lng = item?.location?.longitude;
      if (isValidCoordinate(lat, lng)) {
        valid.push(item);
      }
    });
    return { validDetections: valid };
  }, [rawDetections]);

  // Filter valid Traffic Observations
  const { validTraffic } = useMemo(() => {
    const valid = [];
    rawDensity.forEach((item) => {
      const lat = item?.location?.latitude;
      const lng = item?.location?.longitude;
      if (isValidCoordinate(lat, lng)) {
        valid.push(item);
      }
    });
    return { validTraffic: valid };
  }, [rawDensity]);

  // Active Map Markers filtered by layer toggles and HUD filters
  const activeDetections = useMemo(() => {
    return validDetections.filter((d) => {
      const typeKey = d.type || 'road_defect';
      if (layersState[typeKey] === false) return false;
      if (severityFilter !== 'all' && (d.severity || 'low') !== severityFilter) return false;
      if (statusFilter !== 'all' && (d.status || 'pending') !== statusFilter) return false;
      return true;
    });
  }, [validDetections, layersState, severityFilter, statusFilter]);

  const activeTraffic = useMemo(() => {
    if (layersState.traffic === false) return [];
    return validTraffic;
  }, [validTraffic, layersState]);

  // All valid coordinates for bounds fitting
  const allCoordinates = useMemo(() => {
    const coords = [];
    activeDetections.forEach((d) => coords.push([d.location.latitude, d.location.longitude]));
    activeTraffic.forEach((t) => coords.push([t.location.latitude, t.location.longitude]));
    return coords;
  }, [activeDetections, activeTraffic]);

  // Derived context metrics for map summary HUD
  const highCriticalCount = useMemo(() => {
    return activeDetections.filter(
      (d) => d.severity === 'high' || d.severity === 'critical'
    ).length;
  }, [activeDetections]);

  const handleManualFit = () => {
    setFitCounter((prev) => prev + 1);
  };

  const hasActiveHudFilters = severityFilter !== 'all' || statusFilter !== 'all';
  const isMapEmpty = activeDetections.length === 0 && activeTraffic.length === 0;

  return (
    <div className="relative w-full h-[540px] bg-[#FFFFF0] border border-[#334155]/20 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Top Map HUD Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between bg-[#FFFFF0]/95 border-b border-[#334155]/15 px-4 py-2.5 gap-3">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#1e293b]" />
            OPERATIONAL MAP — GIS TELEMETRY
          </span>
        </div>

        {/* Spatial Filters & Actions */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#FFFFF0] px-2.5 py-1 rounded-xl border border-[#334155]/20">
            <Filter className="w-3 h-3 text-[#1e293b]" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-[#1e293b] text-xs focus:outline-none cursor-pointer font-bold"
            >
              <option value="all" className="bg-[#FFFFF0]">Severity: All</option>
              <option value="critical" className="bg-[#FFFFF0]">Critical</option>
              <option value="high" className="bg-[#FFFFF0]">High</option>
              <option value="medium" className="bg-[#FFFFF0]">Medium</option>
              <option value="low" className="bg-[#FFFFF0]">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#FFFFF0] px-2.5 py-1 rounded-xl border border-[#334155]/20">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[#1e293b] text-xs focus:outline-none cursor-pointer font-bold"
            >
              <option value="all" className="bg-[#FFFFF0]">Status: All</option>
              <option value="pending" className="bg-[#FFFFF0]">Pending</option>
              <option value="confirmed" className="bg-[#FFFFF0]">Confirmed</option>
              <option value="in_review" className="bg-[#FFFFF0]">In Review</option>
              <option value="resolved" className="bg-[#FFFFF0]">Resolved</option>
              <option value="rejected" className="bg-[#FFFFF0]">Rejected</option>
            </select>
          </div>

          {/* Fit Observations Button */}
          <button
            onClick={handleManualFit}
            title="Recenter map to encompass all currently visible observations"
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#FFFFF0] font-bold text-xs transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3 text-[#FFFFF0]" />
            <span>Fit Observations</span>
          </button>
        </div>

        {/* Dynamic Context Summary + Stage 11 Focus Filter Dismiss Chip */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="bg-[#334155]/10 text-[#334155] px-2.5 py-1 rounded-full border border-[#334155]/15 font-bold">
            Visible Observations: <strong className="text-[#1e293b]">{activeDetections.length + activeTraffic.length}</strong>
          </span>
          {highCriticalCount > 0 && (
            <span className="bg-[#1e293b] text-[#FFFFF0] px-2.5 py-1 rounded-full font-bold text-[10px]">
              {highCriticalCount} High/Critical
            </span>
          )}
          {/* Focus filter active chip */}
          {mapHighlightFilter && (
            <span className="inline-flex items-center gap-1.5 bg-[#1e293b] text-[#FFFFF0] px-2.5 py-1 rounded-full font-bold text-[10px]">
              <span>Focused: {HIGHLIGHT_FILTER_LABELS[mapHighlightFilter] || mapHighlightFilter}</span>
              {onClearHighlight && (
                <button
                  onClick={onClearHighlight}
                  className="ml-0.5 text-[#FFFFF0] hover:text-[#94A3B8] transition-colors"
                  title="Clear map focus filter"
                >
                  ✕
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main Leaflet Map Engine Viewport */}
      <div className="relative flex-1 w-full h-full z-0">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          {/* Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | TransitEye SIH 2026'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Map Controllers */}
          <MapBoundsController allCoordinates={allCoordinates} fitCounter={fitCounter} />
          <MapPanController focusedLocation={focusedLocation} />

          {/* Active Detection Markers */}
          {activeDetections.map((detection) => {
            const { latitude, longitude } = detection.location;
            const type = detection.type || 'road_defect';
            const severity = detection.severity || 'low';
            const isSelected = selectedDetection && selectedDetection.id === detection.id;
            const icon = createDetectionIcon(type, severity, isSelected);
            // Stage 11: Dim non-matching markers when a highlight filter is active
            const isDimmed =
              mapHighlightFilter !== null &&
              !isSelected &&
              !detectionMatchesHighlight(detection, mapHighlightFilter);

            return (
              <Marker
                key={`det-${detection.id || `${latitude}-${longitude}`}`}
                position={[latitude, longitude]}
                icon={icon}
                opacity={isDimmed ? 0.25 : 1}
                eventHandlers={{
                  click: () => {
                    if (onSelectDetection) onSelectDetection(detection);
                  },
                }}
              >
                <Popup className="transiteye-popup">
                  <div className="p-1 space-y-2 min-w-[230px] text-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                      <span className="font-mono font-bold text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                        {type === 'waterlogging' ? '💧 Waterlogging' : type === 'vru_safety' ? '🛡️ VRU Risk' : '⚠️ Road Defect'}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        severity === 'high' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {severity}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      {detection.subtype && (
                        <div>
                          <strong className="text-slate-400">Subtype:</strong> {detection.subtype.replace(/_/g, ' ')}
                        </div>
                      )}
                      {detection.confidence !== undefined && (
                        <div>
                          <strong className="text-slate-400">Confidence:</strong> {(Number(detection.confidence) * 100).toFixed(1)}%
                        </div>
                      )}
                      {detection.bus_id && (
                        <div>
                          <strong className="text-slate-400">Sensing Bus:</strong> {detection.bus_id}
                        </div>
                      )}
                      {detection.segment_id && (
                        <div>
                          <strong className="text-slate-400">GIS Segment:</strong> {detection.segment_id}
                        </div>
                      )}
                      {detection.status && (
                        <div>
                          <strong className="text-slate-400">Backend Status:</strong> <span className="font-mono text-cyan-400">{detection.status}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono pt-1">
                        Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                      </div>
                      {detection.timestamp && (
                        <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                          Observed: {new Date(detection.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectDetection && onSelectDetection(detection)}
                      className="w-full mt-2 py-1 px-2.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Inspect Observation Details</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Active Traffic Observation Markers */}
          {activeTraffic.map((traffic) => {
            const { latitude, longitude } = traffic.location;
            const vehicleCount = Number(traffic.vehicle_count) || 0;
            const congestionLevel = traffic.metadata?.congestion_level || 'Moderate';
            const icon = createTrafficIcon(congestionLevel, vehicleCount);
            // Stage 11: When a detection-type filter is active, dim traffic markers;
            // when filter is 'traffic', keep them fully visible
            const isTrafficDimmed =
              mapHighlightFilter !== null && mapHighlightFilter !== 'traffic';

            return (
              <Marker
                key={`traffic-${traffic.id || `${latitude}-${longitude}`}`}
                position={[latitude, longitude]}
                icon={icon}
                opacity={isTrafficDimmed ? 0.25 : 1}
              >
                <Popup className="transiteye-popup">
                  <div className="p-1 space-y-2 min-w-[220px] text-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                      <span className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        🚗 Traffic Observation
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {congestionLevel}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div>
                        <strong className="text-slate-400">Observed Vehicles:</strong> <span className="font-mono font-bold text-white text-sm">{vehicleCount}</span>
                      </div>
                      {traffic.segment_id && (
                        <div>
                          <strong className="text-slate-400">Road Segment:</strong> {traffic.segment_id}
                        </div>
                      )}
                      {traffic.class_breakdown && (
                        <div className="pt-1">
                          <strong className="text-slate-400">Class Breakdown:</strong>
                          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono mt-0.5 bg-slate-900 p-1.5 rounded border border-slate-800">
                            {Object.entries(traffic.class_breakdown).map(([cls, count]) => (
                              <span key={cls} className="capitalize">{cls}: <strong className="text-cyan-300">{count}</strong></span>
                            ))}
                          </div>
                        </div>
                      )}
                      {traffic.metadata?.sampling_window_sec && (
                        <div>
                          <strong className="text-slate-400">Sample Window:</strong> {traffic.metadata.sampling_window_sec}s
                        </div>
                      )}
                      {traffic.bus_id && (
                        <div>
                          <strong className="text-slate-400">Sensing Bus:</strong> {traffic.bus_id}
                        </div>
                      )}
                      {traffic.recorded_at && (
                        <div className="text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-800">
                          Recorded: {new Date(traffic.recorded_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Spatial Empty State Overlay */}
        {!isDetectionsLoading && !isDensityLoading && isMapEmpty && (
          <div className="absolute inset-0 z-[500] bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            <MapPin className="w-10 h-10 text-slate-600 mb-2 opacity-50" />
            <p className="text-sm font-mono font-bold text-slate-300">
              No observations match the current filters
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1 max-w-sm">
              All observation layers may be toggled off or filtered out. Try adjusting your GIS layer or severity filters.
            </p>
            {hasActiveHudFilters && (
              <button
                onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono text-xs hover:bg-cyan-900 transition-colors"
              >
                Reset Map Filters
              </button>
            )}
          </div>
        )}

        {/* GIS Interactive Map Legend (Bottom Right Overlay) */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-950/95 border border-slate-800 rounded-lg shadow-xl p-3 max-w-xs text-xs font-sans">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
            <span className="font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              GIS Visual Legend
            </span>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="text-slate-400 hover:text-slate-200"
            >
              {showLegend ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showLegend && (
            <div className="space-y-2.5 text-[11px]">
              {/* Category Encoding */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Observation Categories
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300" />
                    <span className="text-slate-300">Road Defect</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-cyan-300" />
                    <span className="text-slate-300">Waterlogging</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300" />
                    <span className="text-slate-300">VRU Safety</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300" />
                    <span className="text-slate-300">Traffic Seg.</span>
                  </div>
                </div>
              </div>

              {/* Severity Hierarchy */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Severity Hierarchy & Selection
                </span>
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Low</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Medium</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">High</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">Critical</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400" />
                  <span>Cyan Halo = Selected Detection</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
