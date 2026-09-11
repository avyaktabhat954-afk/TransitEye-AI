import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Droplet,
  ShieldAlert,
  Car,
  AlertOctagon,
  CheckCircle2,
  Info,
  TrendingUp,
  Thermometer,
  ListOrdered,
  Clock,
  ExternalLink,
  Activity,
  WifiOff,
  InboxIcon,
  Compass,
} from 'lucide-react';

/**
 * Severity sort order for the Priority Queue
 */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_BADGE = {
  critical: 'bg-[#1e293b] dark:bg-slate-800 text-[#FFFFF0] border border-[#1e293b]',
  high: 'bg-[#334155] dark:bg-slate-700 text-[#FFFFF0] border border-[#334155]',
  medium: 'bg-[#334155]/10 dark:bg-slate-800/60 text-[#334155] dark:text-slate-300 border border-[#334155]/20',
  low: 'bg-[#334155]/5 dark:bg-slate-800/40 text-[#334155] dark:text-slate-400 border border-[#334155]/15',
};

const TYPE_LABEL = {
  road_defect: 'Road Defect',
  waterlogging: 'Waterlogging',
  vru_safety: 'VRU Safety',
};

const TYPE_ICON = {
  road_defect: AlertTriangle,
  waterlogging: Droplet,
  vru_safety: ShieldAlert,
};

const TYPE_COLOR = {
  road_defect: 'text-amber-600 dark:text-amber-400',
  waterlogging: 'text-cyan-600 dark:text-cyan-400',
  vru_safety: 'text-rose-600 dark:text-rose-400',
};

function formatRelativeTime(ts) {
  if (!ts) return '—';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '—';
  }
}

function InsightChip({ icon: Icon, label, value, children }) {
  return (
    <div className="liquid-glass rounded-2xl border border-[#334155]/20 p-4 text-xs flex items-start gap-3 shadow-xs">
      <div className="w-9 h-9 rounded-xl bg-[#1e293b] dark:bg-slate-800 text-[#FFFFF0] flex items-center justify-center shadow-xs shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[#334155] dark:text-slate-400 block mb-1">
          {label}
        </span>
        {value && <p className="text-xs text-[#1e293b] dark:text-slate-200 leading-relaxed font-medium">{value}</p>}
        {children}
      </div>
    </div>
  );
}

/**
 * Priority Queue row for a single detection
 */
function PriorityRow({ detection, onSelectDetection, onFocusMap, rank }) {
  const TypeIcon = TYPE_ICON[detection.type] || AlertTriangle;
  const typeColor = TYPE_COLOR[detection.type] || 'text-[#1e293b] dark:text-slate-400';
  const sev = (detection.severity ?? 'medium').toLowerCase();
  const badgeClass = SEVERITY_BADGE[sev] || SEVERITY_BADGE.medium;

  const loc = detection.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  const isValidLoc =
    typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng);

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 border-b border-[#334155]/15 dark:border-slate-800 last:border-b-0 hover:bg-[#334155]/5 transition-colors">
      {/* Rank */}
      <span className="text-xs font-bold text-[#334155] dark:text-slate-400 w-4 shrink-0 text-right">{rank}</span>

      {/* Type Icon */}
      <div className="p-1.5 rounded-lg bg-[#334155]/10 dark:bg-slate-800 text-[#1e293b] dark:text-slate-200 shrink-0">
        <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#1e293b] dark:text-slate-200 truncate">
            {TYPE_LABEL[detection.type] || detection.type}
          </span>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeClass}`}
          >
            {sev}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 text-[#334155] dark:text-slate-400 shrink-0" />
          <span className="text-[10px] text-[#334155] dark:text-slate-400">
            {formatRelativeTime(detection.detected_at || detection.created_at)}
          </span>
          {detection.status && (
            <span className="text-[10px] text-[#334155] dark:text-slate-400 capitalize">
              · {detection.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Map Pan Button */}
      {isValidLoc && onFocusMap && (
        <button
          onClick={() => onFocusMap({ latitude: lat, longitude: lng })}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#334155]/10 dark:bg-slate-800 hover:bg-[#1e293b] hover:text-[#FFFFF0] border border-[#334155]/20 dark:border-slate-700 text-[10px] text-[#1e293b] dark:text-slate-200 font-bold transition-all cursor-pointer"
          title="Pan map to coordinates"
        >
          <Compass className="w-3 h-3 text-[#1e293b] dark:text-cyan-400" />
          <span className="hidden sm:inline">Map</span>
        </button>
      )}

      {/* Inspect Button */}
      <button
        onClick={() => onSelectDetection(detection)}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1e293b] dark:bg-slate-700 text-[#FFFFF0] hover:bg-[#334155] text-[10px] font-bold transition-all shadow-xs cursor-pointer"
        title="Open inspection drawer"
      >
        <ExternalLink className="w-3 h-3" />
        <span>Inspect</span>
      </button>
    </div>
  );
}

/**
 * OperationalInsights — Stage 11 & 12 Intelligence Component
 *
 * Props:
 *   detections        — detectionsState from App.jsx
 *   incidents         — incidentsState from App.jsx
 *   vehicleDensity    — vehicleDensityState from App.jsx
 *   onSelectDetection — callback to open LifecycleDetail drawer
 *   onFocusType       — callback to set mapHighlightFilter
 *   onSelectTab       — callback to switch dashboard active tab
 *   onFocusMap        — callback({ latitude, longitude }) to pan map
 */
export default function OperationalInsights({
  detections,
  incidents,
  vehicleDensity,
  onSelectDetection,
  onFocusType,
  onSelectTab,
  onFocusMap,
}) {
  const [queueExpanded, setQueueExpanded] = useState(true);

  const rawDetections = detections?.data?.data ?? [];
  const rawIncidents = incidents?.data?.data ?? [];
  const rawDensity = vehicleDensity?.data?.data ?? [];

  const isLoading =
    detections?.loading && incidents?.loading && vehicleDensity?.loading;
  const hasAnyError =
    detections?.error || incidents?.error || vehicleDensity?.error;
  const hasAnyData =
    rawDetections.length > 0 || rawIncidents.length > 0 || rawDensity.length > 0;

  // ── Derived Insights ────────────────────────────────────────────────────────

  // 1. Hotspot Summary: unresolved high/critical detections
  const unresolvedHighRisk = useMemo(
    () =>
      rawDetections.filter(
        (d) =>
          (d.severity === 'high' || d.severity === 'critical') &&
          d.status !== 'resolved' &&
          d.status !== 'rejected'
      ),
    [rawDetections]
  );

  const criticalCount = unresolvedHighRisk.filter(
    (d) => d.severity === 'critical'
  ).length;
  const highCount = unresolvedHighRisk.filter((d) => d.severity === 'high').length;

  // 2. Dominant Unresolved Category
  const dominantCategory = useMemo(() => {
    const unresolved = rawDetections.filter(
      (d) => d.status !== 'resolved' && d.status !== 'rejected'
    );
    if (unresolved.length === 0) return null;
    const counts = {};
    unresolved.forEach((d) => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { type: top[0], count: top[1], total: unresolved.length } : null;
  }, [rawDetections]);

  // 3. Observed Heavy/Severe Congestion segments
  const heavyCongestionSegments = useMemo(
    () =>
      rawDensity.filter((r) => {
        const lvl = (r.metadata?.congestion_level ?? '').toLowerCase();
        return lvl === 'heavy' || lvl === 'severe';
      }),
    [rawDensity]
  );

  // 4. Incident-to-Detection Count Context
  const incidentDetectionContext = useMemo(() => {
    if (rawIncidents.length === 0 || rawDetections.length === 0) return null;
    if (rawIncidents.length > rawDetections.length) {
      return {
        incidents: rawIncidents.length,
        detections: rawDetections.length,
      };
    }
    return null;
  }, [rawIncidents, rawDetections]);

  // ── Priority Observation Queue: top 5 unresolved by severity ────────────────
  const priorityQueue = useMemo(() => {
    return rawDetections
      .filter((d) => d.status !== 'resolved' && d.status !== 'rejected')
      .sort((a, b) => {
        const sa = SEVERITY_ORDER[a.severity] ?? 4;
        const sb = SEVERITY_ORDER[b.severity] ?? 4;
        if (sa !== sb) return sa - sb;
        // Secondary: older detections first (they've waited longer)
        const ta = new Date(a.detected_at || a.created_at || 0).getTime();
        const tb = new Date(b.detected_at || b.created_at || 0).getTime();
        return ta - tb;
      })
      .slice(0, 5);
  }, [rawDetections]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-4 flex items-center gap-3 text-xs text-[#334155] dark:text-slate-400 border border-[#334155]/20">
        <Activity className="w-4 h-4 text-[#1e293b] dark:text-slate-200 animate-spin" />
        <span>Deriving operational insights from telemetry…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-[#1e293b] dark:text-slate-200" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e293b] dark:text-slate-200">
            Operational Insights
          </h3>
        </div>
        <span className="text-[10px] text-[#334155] dark:text-slate-400 italic">
          Derived from observed telemetry · not predictive
        </span>
      </div>

      {/* ── Insight Chips ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* A. Hotspot Summary */}
        {unresolvedHighRisk.length > 0 ? (
          <InsightChip
            icon={Thermometer}
            label="Unresolved High-Risk"
            value={
              criticalCount > 0 && highCount > 0
                ? `${criticalCount} critical + ${highCount} high severity observations pending review.`
                : criticalCount > 0
                  ? `${criticalCount} critical severity observation${criticalCount > 1 ? 's' : ''} pending review.`
                  : `${highCount} high severity observation${highCount > 1 ? 's' : ''} pending review.`
            }
          >
            {onFocusType && (
              <button
                onClick={() => onFocusType('high_critical')}
                className="mt-2 text-[10px] font-bold text-[#1e293b] dark:text-slate-200 underline hover:text-[#334155] dark:hover:text-white block cursor-pointer"
              >
                Focus Map Filter →
              </button>
            )}
          </InsightChip>
        ) : rawDetections.length > 0 ? (
          <InsightChip
            icon={CheckCircle2}
            label="Risk Posture"
            value="No unresolved high or critical severity observations in current snapshot."
          />
        ) : null}

        {/* B. Dominant Category */}
        {dominantCategory && (
          <InsightChip
            icon={TYPE_ICON[dominantCategory.type] || AlertTriangle}
            label="Dominant Unresolved Category"
            value={`${TYPE_LABEL[dominantCategory.type] || dominantCategory.type}: ${dominantCategory.count} of ${dominantCategory.total} unresolved observations.`}
          >
            {onFocusType && (
              <button
                onClick={() => onFocusType(dominantCategory.type)}
                className="mt-2 text-[10px] font-bold text-[#1e293b] dark:text-slate-200 underline hover:text-[#334155] dark:hover:text-white block cursor-pointer"
              >
                Highlight Category on Map →
              </button>
            )}
          </InsightChip>
        )}

        {/* C. Observed Heavy/Severe Congestion */}
        {heavyCongestionSegments.length > 0 && (
          <InsightChip
            icon={Car}
            label="Observed Heavy/Severe Congestion"
            value={`${heavyCongestionSegments.length} segment${heavyCongestionSegments.length > 1 ? 's' : ''} with heavy or severe congestion observed. Segment-level observation only.`}
          >
            <div className="mt-2 flex items-center gap-3">
              {onFocusType && (
                <button
                  onClick={() => onFocusType('traffic')}
                  className="text-[10px] font-bold text-[#1e293b] dark:text-slate-200 underline hover:text-[#334155] cursor-pointer"
                >
                  Focus Traffic →
                </button>
              )}
              {onSelectTab && (
                <button
                  onClick={() => onSelectTab('analytics')}
                  className="text-[10px] font-bold text-[#334155] dark:text-slate-400 underline hover:text-[#1e293b] cursor-pointer"
                >
                  View Analytics →
                </button>
              )}
            </div>
          </InsightChip>
        )}

        {/* D. Incident-to-Detection Count Context */}
        {incidentDetectionContext && (
          <InsightChip
            icon={TrendingUp}
            label="Incident-to-Detection Count Context"
            value={`${incidentDetectionContext.incidents} ANPR incidents vs ${incidentDetectionContext.detections} road detections in current snapshot.`}
          >
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('incidents')}
                className="mt-2 text-[10px] font-bold text-[#1e293b] dark:text-slate-200 underline hover:text-[#334155] block cursor-pointer"
              >
                View ANPR Incidents →
              </button>
            )}
          </InsightChip>
        )}

        {/* E. Coverage Gap — empty data */}
        {!hasAnyData && !hasAnyError && (
          <InsightChip
            icon={InboxIcon}
            label="No Observations Recorded"
            value="No detections, incidents, or density observations in current snapshot."
          />
        )}

        {/* F. Coverage Gap — API error */}
        {!hasAnyData && hasAnyError && (
          <InsightChip
            icon={WifiOff}
            label="Telemetry Load Failed"
            value="One or more telemetry endpoints returned an error. Check backend connectivity."
          />
        )}

        {/* G. All clear when data is loaded and no specific warnings */}
        {hasAnyData &&
          unresolvedHighRisk.length === 0 &&
          heavyCongestionSegments.length === 0 &&
          !incidentDetectionContext &&
          !dominantCategory && (
            <InsightChip
              icon={Info}
              label="Operational Status"
              value={`${rawDetections.length} detection${rawDetections.length !== 1 ? 's' : ''} and ${rawIncidents.length} incident${rawIncidents.length !== 1 ? 's' : ''} loaded. No elevated risk observations in current snapshot.`}
            />
          )}
      </div>

      {/* ── Priority Observation Queue ── */}
      {priorityQueue.length > 0 && (
        <div className="liquid-glass rounded-2xl border border-[#334155]/20 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Queue Header */}
          <button
            onClick={() => setQueueExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#334155]/5 transition-colors border-b border-[#334155]/10"
          >
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[#1e293b] dark:text-slate-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1e293b] dark:text-slate-200">
                Priority Observation Queue
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1e293b] dark:bg-slate-800 text-[#FFFFF0]">
                {priorityQueue.length} unresolved
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#334155] dark:text-slate-400 hidden sm:block">
                Ranked by severity · oldest first
              </span>
              <span className="text-xs text-[#334155] dark:text-slate-400">
                {queueExpanded ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {queueExpanded && (
            <div className="px-5 py-2">
              {priorityQueue.map((detection, idx) => (
                <PriorityRow
                  key={detection.id ?? idx}
                  detection={detection}
                  onSelectDetection={onSelectDetection}
                  onFocusMap={onFocusMap}
                  rank={idx + 1}
                />
              ))}
              {rawDetections.filter(
                (d) => d.status !== 'resolved' && d.status !== 'rejected'
              ).length > 5 && (
                <p className="text-[10px] text-[#334155] dark:text-slate-400 pt-2 pb-1 text-center">
                  Showing top 5 of{' '}
                  {
                    rawDetections.filter(
                      (d) => d.status !== 'resolved' && d.status !== 'rejected'
                    ).length
                  }{' '}
                  unresolved observations · see Lifecycle tab for full list
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
