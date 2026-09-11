import React from 'react';
import {
  X,
  AlertTriangle,
  Droplet,
  ShieldAlert,
  Car,
  MapPin,
  Clock,
  Gauge,
  Layers,
  CheckCircle2,
  Lock,
  Wrench,
  UserCheck,
  ShieldCheck,
  Info,
  Image,
  ExternalLink,
  Compass,
  AlertOctagon
} from 'lucide-react';

const CATEGORY_ICONS = {
  road_defect: AlertTriangle,
  waterlogging: Droplet,
  vru_safety: ShieldAlert,
};

const SEVERITY_CLASSES = {
  low: 'bg-[#334155]/5 text-[#334155] border border-[#334155]/15',
  medium: 'bg-[#334155]/10 text-[#334155] border border-[#334155]/20',
  high: 'bg-[#334155] text-[#FFFFF0] border border-[#334155]',
  critical: 'bg-[#1e293b] text-[#FFFFF0] border border-[#1e293b]',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
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

function DataRow({ icon: Icon, label, value, color = 'text-[#1e293b]' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#334155]/15 text-xs">
      <div className="flex items-center gap-2 text-[#334155]">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#334155]" />}
        <span>{label}</span>
      </div>
      <span className={`font-medium ${color}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function LifecycleDetail({ detection, onClose, onFocusMap }) {
  if (!detection) return null;

  const IconComponent = CATEGORY_ICONS[detection.type] ?? AlertTriangle;
  const severityClass = SEVERITY_CLASSES[detection.severity] ?? 'bg-[#334155]/10 text-[#334155]';
  const confidencePct = Math.round((detection.confidence ?? 0) * 100);

  const loc = detection.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  const isValidLoc = typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng);

  const handleFocusMap = () => {
    if (isValidLoc && onFocusMap) {
      onFocusMap({ latitude: lat, longitude: lng });
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-[#1e293b]/40 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-[#FFFFF0] border-l border-[#334155]/20 flex flex-col overflow-hidden shadow-2xl animate-slideIn">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#334155]/15 bg-[#FFFFF0]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1e293b] capitalize">
                {detection.subtype ? detection.subtype.replace(/_/g, ' ') : 'Detection Observation'}
              </h2>
              <p className="text-[11px] text-[#334155]">
                ID: {detection.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityClass}`}>
              {detection.severity ?? 'N/A'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#334155] hover:text-[#1e293b] hover:bg-[#334155]/10 transition-colors cursor-pointer"
              aria-label="Close detail drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Perception Overview */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155] mb-2">
              Observation Telemetry
            </p>
            <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 px-4 divide-y divide-[#334155]/10">
              <DataRow label="Domain Category" value={detection.type} />
              <DataRow label="Subtype Label" value={detection.subtype ? detection.subtype.replace(/_/g, ' ') : '—'} />
              <DataRow
                label="Backend Lifecycle Status"
                value={detection.status ?? 'pending'}
                color="text-[#1e293b] font-bold capitalize"
              />
              <DataRow
                label="AI Perception Confidence"
                value={`${confidencePct}% (Model Score)`}
                color="text-[#1e293b] font-bold"
              />
              <DataRow
                label="Confirmed Bus Passes"
                value={`${detection.confirmed_by_count ?? 1} validation pass(es)`}
              />
              <DataRow icon={Car} label="Sensing Bus Fleet ID" value={detection.bus_id} />
              <DataRow icon={Layers} label="GIS Segment ID" value={detection.segment_id} />
              <DataRow icon={Clock} label="Observation Timestamp" value={formatTimestamp(detection.timestamp)} />
            </div>
          </div>

          {/* Section 2: GIS Location & Focus Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
                Geographic Coordinates
              </p>
              {isValidLoc && (
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
              {isValidLoc ? (
                <>
                  <DataRow
                    icon={MapPin}
                    label="WGS84 Coordinates"
                    value={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
                  />
                  {loc.speed !== undefined && loc.speed !== null && (
                    <DataRow icon={Gauge} label="Bus Speed at Observation" value={`${loc.speed} km/h`} />
                  )}
                  {loc.heading !== undefined && loc.heading !== null && (
                    <DataRow label="Compass Heading" value={`${loc.heading}°`} />
                  )}
                  {loc.accuracy !== undefined && loc.accuracy !== null && (
                    <DataRow label="GPS Accuracy Radius" value={`±${loc.accuracy} m`} />
                  )}
                </>
              ) : (
                <div className="py-3 text-xs text-[#334155] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location data unavailable
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Sensor Evidence Preview */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-[#1e293b]" />
              Sensor Evidence Frame
            </p>
            {detection.thumbnail_url ? (
              <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 p-3 space-y-2">
                <div className="relative aspect-video bg-[#1e293b] rounded-xl overflow-hidden border border-[#334155]/20 flex items-center justify-center">
                  <img
                    src={detection.thumbnail_url}
                    alt={`Evidence thumbnail for detection ${detection.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center p-4 text-center text-[#FFFFF0] text-xs space-y-1">
                    <Image className="w-6 h-6 opacity-40" />
                    <span>Failed to load thumbnail resource</span>
                  </div>
                </div>
                <a
                  href={detection.thumbnail_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFFFF0] hover:bg-[#1e293b] hover:text-[#FFFFF0] border border-[#334155]/20 text-[11px] font-bold text-[#1e293b] transition-all"
                >
                  <span className="truncate">{detection.thumbnail_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
                </a>
              </div>
            ) : (
              <div className="bg-[#334155]/5 rounded-2xl border border-dashed border-[#334155]/20 p-4 flex items-center justify-center text-[#334155] text-xs gap-2">
                <Image className="w-4 h-4 opacity-40" />
                <span>No detection evidence thumbnail available</span>
              </div>
            )}
          </div>

          {/* Section 4: Metadata Attributes */}
          {detection.metadata && Object.keys(detection.metadata).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155] mb-2">
                Metadata & Bounding Details
              </p>
              <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 px-4 py-2 text-xs text-[#1e293b] space-y-1.5">
                {Object.entries(detection.metadata).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-[#334155]/10 last:border-0">
                    <span className="text-[#334155] capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-bold text-[#1e293b]">
                      {Array.isArray(val) ? `[${val.join(', ')}]` : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Related Incident Context */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-[#1e293b]" />
              Related Incident Context
            </p>
            <div className="bg-[#334155]/5 rounded-2xl border border-[#334155]/15 p-3 text-xs text-[#334155]">
              No authoritative detection-to-incident relationship available in current backend schema (Independent ANPR and road perception streams).
            </div>
          </div>

          {/* Section 6: Workflow & Extensible Read-Only Lifecycle State */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center justify-between">
              <span>Lifecycle Workflow State</span>
              <span className="text-[9px] text-[#334155] font-bold">Read-Only Telemetry v1.0</span>
            </p>

            <div className="liquid-glass rounded-2xl border border-[#334155]/20 p-4 space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1.5 text-[#1e293b]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. Detected</span>
                </div>
                <span className="text-[#334155]">→</span>
                <div className="flex items-center gap-1.5 text-[#1e293b]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>2. Verified</span>
                </div>
                <span className="text-[#334155]">→</span>
                <div className="flex items-center gap-1.5 text-[#334155]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>3. Assigned</span>
                </div>
                <span className="text-[#334155]">→</span>
                <div className="flex items-center gap-1.5 text-[#334155]">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>4. Repaired</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#334155]/15 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                  <Info className="w-3.5 h-3.5 text-[#1e293b] shrink-0" />
                  <span className="font-bold text-[#1e293b]">Lifecycle Actions (Read-Only Mode)</span>
                </div>
                <p className="text-[11px] text-[#334155] leading-relaxed">
                  Backend mutation API endpoints (`PATCH /api/detections/:id`) for technician assignment, repair logging, and status transitions are pending backend deployment.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#334155]/10 text-[#334155]/60 border border-[#334155]/15 text-[10px] font-bold cursor-not-allowed opacity-70"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Assign Tech</span>
                    <Lock className="w-2.5 h-2.5 ml-auto" />
                  </button>

                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#334155]/10 text-[#334155]/60 border border-[#334155]/15 text-[10px] font-bold cursor-not-allowed opacity-70"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Mark Repaired</span>
                    <Lock className="w-2.5 h-2.5 ml-auto" />
                  </button>

                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#334155]/10 text-[#334155]/60 border border-[#334155]/15 text-[10px] font-bold cursor-not-allowed opacity-70"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Re-verify</span>
                    <Lock className="w-2.5 h-2.5 ml-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
