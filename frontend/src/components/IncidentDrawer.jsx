import React from 'react';
import {
  X,
  ShieldAlert,
  Car,
  MapPin,
  Clock,
  Radio,
  AlertTriangle,
  Film,
  Eye,
  Gauge,
  Compass,
  ExternalLink,
  AlertOctagon
} from 'lucide-react';

function isValidCoord(value, min, max) {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

function isValidLocation(loc) {
  if (!loc || typeof loc !== 'object') return false;
  const lat = loc.latitude ?? loc.lat;
  const lng = loc.longitude ?? loc.lng;
  return (
    isValidCoord(lat, -90, 90) &&
    isValidCoord(lng, -180, 180)
  );
}

const TRIGGER_LABELS = {
  bus_lane_violation: 'Bus Lane Violation',
  reckless_overtake: 'Reckless Overtake',
  red_light: 'Red Light Run',
  speeding: 'Speeding',
  wrong_way: 'Wrong-Way Entry',
  pedestrian_hazard: 'Pedestrian Hazard',
  signal_jump: 'Signal Jump',
  no_helmet: 'No Helmet Detected',
};

function getTriggerLabel(trigger) {
  return TRIGGER_LABELS[trigger] ?? trigger?.replace(/_/g, ' ') ?? 'Unknown Trigger';
}

function getSeverityClass(incident) {
  const highSeverityTriggers = new Set([
    'reckless_overtake', 'red_light', 'wrong_way', 'signal_jump',
  ]);
  if (highSeverityTriggers.has(incident.trigger_reason)) {
    return { label: 'CRITICAL', classes: 'bg-[#1e293b] text-[#FFFFF0] border-[#1e293b]' };
  }
  if (incident.plate_confidence >= 0.8) {
    return { label: 'CONFIRMED', classes: 'bg-[#334155] text-[#FFFFF0] border-[#334155]' };
  }
  return { label: 'UNVERIFIED', classes: 'bg-[#334155]/10 text-[#334155] border-[#334155]/20' };
}

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

function DataRow({ icon: Icon, label, value, className = '' }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#334155]/15 last:border-0">
      {Icon && (
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4 h-4 text-[#334155]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-0.5">
          {label}
        </p>
        <p className={`text-xs break-all text-[#1e293b] font-medium ${className}`}>
          {value ?? <span className="text-[#334155]/60 italic">—</span>}
        </p>
      </div>
    </div>
  );
}

function ConfidenceBar({ confidence }) {
  const pct = Math.round((confidence ?? 0) * 100);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#334155]/15">
      <div className="mt-0.5 shrink-0">
        <Gauge className="w-4 h-4 text-[#334155]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-1">
          OCR Confidence
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-[#334155]/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1e293b] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#1e293b]">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

function EvidenceClip({ clipUrl }) {
  if (!clipUrl) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border border-dashed border-[#334155]/30 bg-[#334155]/5 text-[#334155]">
        <Film className="w-6 h-6 opacity-40" />
        <p className="text-xs">No video evidence clip available</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-2 flex items-center gap-1.5">
        <Film className="w-3.5 h-3.5" />
        Evidence Clip Stream
      </p>
      <a
        href={clipUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 rounded-2xl border border-[#334155]/20 bg-[#FFFFF0] text-[#1e293b] text-xs font-bold hover:bg-[#1e293b] hover:text-[#FFFFF0] transition-all shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="w-4 h-4 shrink-0 text-[#1e293b]" />
          <span className="truncate">{clipUrl}</span>
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 ml-2 text-[#1e293b]" />
      </a>
    </div>
  );
}

export default function IncidentDrawer({ incident, onClose, onFocusMap }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!incident) return null;

  const severity = getSeverityClass(incident);
  const locationValid = isValidLocation(incident.location);

  const lat = incident.location?.latitude ?? incident.location?.lat;
  const lng = incident.location?.longitude ?? incident.location?.lng;

  const handleFocusMap = () => {
    if (locationValid && onFocusMap && typeof lat === 'number' && typeof lng === 'number') {
      onFocusMap({ latitude: lat, longitude: lng });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex justify-end bg-[#1e293b]/40 backdrop-blur-xs animate-fadeIn"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Incident Evidence Drawer"
    >
      <div className="relative w-full max-w-md bg-[#FFFFF0] border-l border-[#334155]/20 flex flex-col overflow-hidden shadow-2xl animate-slideIn">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-5 border-b border-[#334155]/15 bg-[#FFFFF0]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-[#1e293b]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1e293b]">
                Incident Evidence
              </h2>
            </div>
            <p className="text-[11px] text-[#334155]">
              ID: {incident.id ?? 'N/A'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severity.classes}`}>
              {severity.label}
            </span>
            <span className="text-[9px] text-[#334155]/80">
              UI Classification
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#334155] hover:text-[#1e293b] hover:bg-[#334155]/10 rounded-xl p-1.5 transition-colors ml-2 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Plate Banner ── */}
        <div className="px-5 py-4 bg-[#334155]/5 border-b border-[#334155]/15">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-1.5">
            Recognized License Plate
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center justify-center bg-[#1e293b] text-[#FFFFF0] border-2 border-[#334155]/30 rounded-2xl py-3 px-4 shadow-sm">
              <span className="text-2xl font-black tracking-[0.2em] uppercase">
                {incident.plate_text && incident.plate_text !== 'UNKNOWN'
                  ? incident.plate_text
                  : <span className="text-[#FFFFF0]/60 text-sm tracking-normal font-semibold">UNRECOGNIZED</span>
                }
              </span>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Trigger Section */}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-2">
                Violation Telemetry
              </p>
              <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 px-4 divide-y divide-[#334155]/10">
                <DataRow
                  icon={AlertTriangle}
                  label="Trigger Reason"
                  value={getTriggerLabel(incident.trigger_reason)}
                  className="font-bold text-[#1e293b]"
                />
                <ConfidenceBar confidence={incident.plate_confidence} />
                <DataRow
                  icon={Car}
                  label="Sensing Bus Fleet ID"
                  value={incident.bus_id}
                />
                <DataRow
                  icon={Clock}
                  label="Occurrence Timestamp"
                  value={formatTimestamp(incident.timestamp)}
                />
              </div>
            </div>

            {/* Location Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155]">
                  Location Coordinates
                </p>
                {locationValid && (
                  <button
                    onClick={handleFocusMap}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1e293b] text-[#FFFFF0] hover:bg-[#334155] text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Compass className="w-3 h-3 text-[#FFFFF0]" />
                    <span>Focus on Map</span>
                  </button>
                )}
              </div>
              <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 px-4 divide-y divide-[#334155]/10">
                {locationValid ? (
                  <>
                    <DataRow
                      icon={MapPin}
                      label="WGS84 Coordinates"
                      value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                    />
                    {incident.location.address && (
                      <DataRow
                        icon={MapPin}
                        label="Address Description"
                        value={incident.location.address}
                      />
                    )}
                  </>
                ) : (
                  <div className="py-3 text-xs text-[#334155] flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location data unavailable or invalid
                  </div>
                )}
              </div>
            </div>

            {/* Related Detection Context */}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-[#1e293b]" />
                Related Road Defect Context
              </p>
              <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 p-3 text-xs text-[#334155] leading-relaxed">
                No authoritative incident-to-detection relationship available in backend schema (Independent ANPR and road perception streams).
              </div>
            </div>

            {/* Metadata Section */}
            {incident.metadata && Object.keys(incident.metadata).length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#334155] mb-2">
                  Additional Telemetry Context
                </p>
                <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 px-4 divide-y divide-[#334155]/10">
                  {Object.entries(incident.metadata).map(([key, val]) => (
                    <DataRow
                      key={key}
                      icon={Radio}
                      label={key.replace(/_/g, ' ')}
                      value={String(val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Clip */}
            <EvidenceClip clipUrl={incident.clip_url} />

            {/* Read-only notice */}
            <div className="mt-4 mb-2 flex items-center gap-2 text-xs text-[#334155]">
              <Car className="w-4 h-4" />
              <span>Read-only ANPR feed · Edge sensor stream</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
