import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  ChevronRight,
  Car,
  Clock,
  MapPin,
  Radio,
  Loader2,
  AlertCircle,
  ListFilter,
} from 'lucide-react';

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
  return TRIGGER_LABELS[trigger] ?? trigger?.replace(/_/g, ' ') ?? 'Unknown';
}

const HIGH_SEVERITY_TRIGGERS = new Set([
  'reckless_overtake', 'red_light', 'wrong_way', 'signal_jump',
]);

function getSeverity(incident) {
  if (HIGH_SEVERITY_TRIGGERS.has(incident.trigger_reason)) {
    return {
      level: 'critical',
      label: 'CRITICAL',
      badge: 'bg-[#1e293b] text-[#FFFFF0] border border-[#1e293b]',
      row: 'border-l-[#1e293b]',
      dot: 'bg-[#1e293b]',
    };
  }
  if (incident.plate_confidence >= 0.8) {
    return {
      level: 'confirmed',
      label: 'CONFIRMED',
      badge: 'bg-[#334155] text-[#FFFFF0] border border-[#334155]',
      row: 'border-l-[#334155]',
      dot: 'bg-[#334155]',
    };
  }
  return {
    level: 'unverified',
    label: 'UNVERIFIED',
    badge: 'bg-[#334155]/10 text-[#334155] border border-[#334155]/20',
    row: 'border-l-[#334155]/40',
    dot: 'bg-[#334155]/50',
  };
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

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${active
          ? 'bg-[#1e293b] text-[#FFFFF0] border-[#1e293b]'
          : 'bg-[#FFFFF0] text-[#334155] border-[#334155]/20 hover:border-[#1e293b]'
        }`}
    >
      {label}
    </button>
  );
}

function IncidentRow({ incident, onSelect }) {
  const severity = getSeverity(incident);
  const pct = Math.round((incident.plate_confidence ?? 0) * 100);

  return (
    <button
      onClick={() => onSelect(incident)}
      className={`w-full text-left border-l-4 ${severity.row} bg-[#FFFFF0]/80 hover:bg-[#FFFFF0]
                  border border-[#334155]/20 rounded-2xl px-4 py-3 transition-all
                  hover:border-[#1e293b]/40 hover:shadow-md group relative`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${severity.dot}`} />
          <span className="text-sm font-extrabold tracking-widest text-[#1e293b] uppercase">
            {incident.plate_text && incident.plate_text !== 'UNKNOWN'
              ? incident.plate_text
              : <span className="text-[#334155] text-xs font-semibold tracking-normal">UNRECOGNIZED</span>
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${severity.badge}`}>
            {severity.label}
          </span>
          <ChevronRight className="w-4 h-4 text-[#334155] group-hover:text-[#1e293b] transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#1e293b] shrink-0" />
        <span className="text-xs text-[#1e293b] font-bold">
          {getTriggerLabel(incident.trigger_reason)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[#334155]">
        <span className="flex items-center gap-1">
          <Car className="w-3.5 h-3.5" />
          {incident.bus_id ?? '—'}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatTimestampShort(incident.timestamp)}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="text-[#334155]">OCR Confidence:</span>
          <span className="font-bold text-[#1e293b]">
            {pct}%
          </span>
        </span>
      </div>
    </button>
  );
}

function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
      <ShieldAlert className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm font-bold">
        {filtered ? 'No matching incidents' : 'No incidents recorded'}
      </p>
      <p className="text-xs mt-1 text-[#334155]/80">
        {filtered
          ? 'Adjust your search or filters.'
          : 'Incidents flagged by edge ANPR will appear here.'}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#334155]">
      <Loader2 className="w-8 h-8 mb-3 animate-spin text-[#1e293b]" />
      <p className="text-sm">Loading incident feed…</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-rose-700">
      <AlertCircle className="w-8 h-8 mb-3 opacity-80" />
      <p className="text-sm font-bold">Feed unavailable</p>
      <p className="text-xs mt-1 max-w-xs text-center">{message}</p>
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'unverified', label: 'Unverified' },
];

export default function IncidentFeed({ incidents, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const records = incidents?.data?.data ?? [];

  const filtered = useMemo(() => {
    let result = records;
    if (filter !== 'all') {
      result = result.filter((inc) => getSeverity(inc).level === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (inc) =>
          (inc.plate_text ?? '').toLowerCase().includes(q) ||
          getTriggerLabel(inc.trigger_reason).toLowerCase().includes(q) ||
          (inc.bus_id ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, filter, search]);

  const totalCount = records.length;
  const criticalCount = records.filter((i) => HIGH_SEVERITY_TRIGGERS.has(i.trigger_reason)).length;

  return (
    <div className="liquid-glass border border-[#334155]/20 rounded-2xl overflow-hidden flex flex-col shadow-xs">
      {/* ── Panel Header ── */}
      <div className="px-5 py-4 border-b border-[#334155]/15 bg-[#FFFFF0]/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#1e293b]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b]">
              ANPR Incident Feed
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#334155]">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              {incidents?.loading ? (
                <span>Fetching…</span>
              ) : (
                <span>
                  <strong className="text-[#1e293b] font-bold">{totalCount}</strong> records
                </span>
              )}
            </span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#1e293b] text-[#FFFFF0] text-[10px] font-bold">
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plate, trigger, bus ID…"
            className="w-full bg-[#FFFFF0] border border-[#334155]/20 rounded-xl pl-9 pr-3 py-2
                       text-xs text-[#1e293b] placeholder-[#334155]/60
                       focus:outline-none focus:border-[#1e293b] transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <ListFilter className="w-4 h-4 text-[#334155] shrink-0" />
          {FILTER_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.key}
              label={opt.label}
              active={filter === opt.key}
              onClick={() => setFilter(opt.key)}
            />
          ))}
          <span className="text-[10px] text-[#334155]/80 ml-auto hidden sm:inline">
            UI classification
          </span>
        </div>
      </div>

      {/* ── Feed Body ── */}
      <div className="flex-1 overflow-y-auto max-h-[520px] px-4 py-3 space-y-2.5">
        {incidents?.loading ? (
          <LoadingState />
        ) : incidents?.error ? (
          <ErrorState message={incidents.error} />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={search.trim() !== '' || filter !== 'all'} />
        ) : (
          filtered.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {!incidents?.loading && !incidents?.error && filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-[#334155]/15 bg-[#FFFFF0]/90 flex items-center justify-between">
          <span className="text-xs text-[#334155]">
            Showing <strong className="text-[#1e293b]">{filtered.length}</strong> of{' '}
            <strong className="text-[#1e293b]">{totalCount}</strong> incidents
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#334155]">
            <MapPin className="w-3.5 h-3.5" />
            Click row to inspect evidence
          </div>
        </div>
      )}
    </div>
  );
}
