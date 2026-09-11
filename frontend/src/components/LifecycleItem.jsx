import React from 'react';
import {
  AlertTriangle,
  Droplet,
  ShieldAlert,
  Car,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2
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

function formatSubtype(subtype) {
  if (!subtype) return 'Unspecified';
  return subtype.replace(/_/g, ' ');
}

function formatTimestampShort(ts) {
  if (!ts) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeStyle: 'short',
      dateStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

export default function LifecycleItem({ detection, onSelect, isSelected }) {
  const IconComponent = CATEGORY_ICONS[detection.type] ?? AlertTriangle;
  const severityClass = SEVERITY_CLASSES[detection.severity] ?? 'bg-[#334155]/10 text-[#334155]';
  const confidencePct = Math.round((detection.confidence ?? 0) * 100);

  const lat = detection.location?.latitude;
  const lng = detection.location?.longitude;
  const coordsText =
    typeof lat === 'number' && typeof lng === 'number'
      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      : 'No coords';

  return (
    <button
      onClick={() => onSelect && onSelect(detection)}
      className={`w-full text-left bg-[#FFFFF0] hover:bg-[#FFFFF0] border rounded-2xl p-3.5 transition-all
                  hover:border-[#1e293b]/40 hover:shadow-md group relative flex flex-col space-y-2.5 ${isSelected
          ? 'border-[#1e293b] ring-2 ring-[#1e293b]/20 bg-[#FFFFF0]'
          : 'border-[#334155]/20 shadow-xs'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-[#1e293b] text-[#FFFFF0] shrink-0">
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#1e293b] capitalize truncate tracking-tight">
              {formatSubtype(detection.subtype)}
            </h4>
            <p className="text-[10px] text-[#334155] truncate">
              {detection.id}
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${severityClass}`}
        >
          {detection.severity ?? 'N/A'}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#334155]/15">
        <span className="px-2 py-0.5 rounded-full border uppercase font-bold text-[9px] bg-[#334155]/10 text-[#334155] border-[#334155]/20">
          Backend: {detection.status ?? 'pending'}
        </span>
        <span className="text-[#334155] font-bold flex items-center gap-1">
          <span className="text-[#334155]">AI Conf:</span>
          <span className="text-[#1e293b]">
            {confidencePct}%
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#334155] bg-[#334155]/5 p-2 rounded-xl border border-[#334155]/15">
        <div className="flex items-center gap-1 truncate">
          <Car className="w-3 h-3 text-[#334155] shrink-0" />
          <span className="truncate">{detection.bus_id ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1 truncate justify-end">
          <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
          <span>{detection.confirmed_by_count ?? 1} pass(es)</span>
        </div>
        <div className="flex items-center gap-1 truncate col-span-2 text-[#334155]">
          <MapPin className="w-3 h-3 text-[#334155] shrink-0" />
          <span className="truncate">{coordsText}</span>
          {detection.segment_id && (
            <span className="ml-auto text-[9px] text-[#1e293b] font-bold truncate">
              {detection.segment_id}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#334155] pt-0.5">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#334155]" />
          {formatTimestampShort(detection.timestamp)}
        </span>
        <span className="text-[#1e293b] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold text-[10px]">
          Inspect Details
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}
