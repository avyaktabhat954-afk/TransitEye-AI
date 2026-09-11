import React, { useState, useMemo } from 'react';
import LifecycleSummary from './LifecycleSummary';
import LifecycleStage from './LifecycleStage';
import LifecycleDetail from './LifecycleDetail';
import {
  GitCommit,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  UserCheck,
  Wrench,
  ShieldCheck,
  CheckCheck,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';

/**
 * Stage definitions mapping backend statuses to conceptual 5-stage lifecycle.
 * Arranged into a clean 3x2 grid:
 * Row 1: Detected, Verified, Assigned
 * Row 2: Repaired, Reverified, Resolved
 */
const STAGE_DEFINITIONS = [
  {
    id: 'detected',
    title: '1. Detected',
    subtitle: 'Raw physical observations flagged by AI bus sensors',
    icon: Clock,
    isBackendSupported: true,
    backendStatusMap: ['pending'],
  },
  {
    id: 'verified',
    title: '2. Verified',
    subtitle: 'Multi-pass confirmed or verified by review rules',
    icon: CheckCircle2,
    isBackendSupported: true,
    backendStatusMap: ['confirmed', 'in_review'],
  },
  {
    id: 'assigned',
    title: '3. Assigned',
    subtitle: 'Work-order & technician dispatch',
    icon: UserCheck,
    isBackendSupported: false,
    emptyNoticeTitle: 'Assignment Data Unavailable',
    emptyNotice:
      'Technician assignment and work-order dispatch are not supported by the current backend contract (Read-Only).',
  },
  {
    id: 'repaired',
    title: '4. Repaired',
    subtitle: 'Field repair execution & timestamping',
    icon: Wrench,
    isBackendSupported: false,
    emptyNoticeTitle: 'Repair Event Tracking Unavailable',
    emptyNotice:
      'Physical repair timestamping is pending future backend API endpoints. (See Resolved column for completed items).',
  },
  {
    id: 'reverified',
    title: '5. Reverified',
    subtitle: 'Post-repair bus sensor re-inspection',
    icon: ShieldCheck,
    isBackendSupported: false,
    emptyNoticeTitle: 'Re-verification Data Unavailable',
    emptyNotice:
      'Post-repair bus re-inspection validation will be activated when backend lifecycle mutation endpoints deploy.',
  },
  {
    id: 'resolved',
    title: '6. Resolved',
    subtitle: 'Observations marked resolved in backend DB',
    icon: CheckCheck,
    isBackendSupported: true,
    backendStatusMap: ['resolved'],
  },
];

export default function LifecycleBoard({
  detections,
  selectedDetection: propSelectedDetection,
  onSelectDetection,
  onFocusMap,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedStageId, setExpandedStageId] = useState('detected');
  const [localSelectedDetection, setLocalSelectedDetection] = useState(null);

  const selectedDetection =
    propSelectedDetection !== undefined ? propSelectedDetection : localSelectedDetection;
  const handleSelectDetection = onSelectDetection || setLocalSelectedDetection;

  const rawRecords = detections?.data?.data ?? [];

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return rawRecords.filter((d) => {
      // Type filter
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;

      // Severity filter
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const idMatch = (d.id ?? '').toLowerCase().includes(q);
        const typeMatch = (d.type ?? '').toLowerCase().includes(q);
        const subtypeMatch = (d.subtype ?? '').toLowerCase().includes(q);
        const busMatch = (d.bus_id ?? '').toLowerCase().includes(q);
        const segmentMatch = (d.segment_id ?? '').toLowerCase().includes(q);
        if (!idMatch && !typeMatch && !subtypeMatch && !busMatch && !segmentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [rawRecords, typeFilter, severityFilter, statusFilter, search]);

  // Group filtered detections by stage
  const stageItemsMap = useMemo(() => {
    const map = {
      detected: [],
      verified: [],
      assigned: [],
      repaired: [],
      reverified: [],
      resolved: [],
    };

    filteredRecords.forEach((d) => {
      const status = d.status ?? 'pending';
      if (status === 'pending') {
        map.detected.push(d);
      } else if (status === 'confirmed' || status === 'in_review') {
        map.verified.push(d);
      } else if (status === 'resolved') {
        map.resolved.push(d);
      } else {
        map.detected.push(d);
      }
    });

    return map;
  }, [filteredRecords]);

  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    severityFilter !== 'all' ||
    statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setSeverityFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ── */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-[#334155]/20">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
              <GitCommit className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-[#1e293b]">
              Municipal Defect Repair Lifecycle
            </h2>
          </div>
          <p className="text-xs text-[#334155] font-mono">
            Structured 3×2 Workflow: Detected, Verified, Assigned | Repaired, Reverified, Resolved
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#334155]/10 border border-[#334155]/20 text-[#334155] flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Read-Only Telemetry Stream</span>
          </span>
        </div>
      </div>

      {/* ── Summary Metric Cards ── */}
      <LifecycleSummary records={rawRecords} />

      {/* ── Filter & Search Controls ── */}
      <div className="liquid-glass rounded-2xl p-4 space-y-3 border border-[#334155]/20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, subtype, bus ID, segment..."
              className="w-full bg-[#FFFFF0] border border-[#334155]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#1e293b] font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e293b]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#FFFFF0] border border-[#334155]/20 rounded-xl px-3 py-2 text-xs text-[#1e293b] font-mono focus:outline-none focus:border-[#1e293b]"
          >
            <option value="all">All Domain Types</option>
            <option value="road_defect">Road Defects</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="vru_safety">VRU Risk Overlay</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#FFFFF0] border border-[#334155]/20 rounded-xl px-3 py-2 text-xs text-[#1e293b] font-mono focus:outline-none focus:border-[#1e293b]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#FFFFF0] border border-[#334155]/20 rounded-xl px-3 py-2 text-xs text-[#1e293b] font-mono focus:outline-none focus:border-[#1e293b]"
          >
            <option value="all">All Backend Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl bg-[#334155]/10 hover:bg-[#334155]/20 text-xs font-mono text-[#1e293b] flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3×2 Lifecycle Stage Cards Layout ── */}
      {detections?.loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#334155] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e293b]" />
          <p className="text-sm">Loading telemetry lifecycle records…</p>
        </div>
      ) : detections?.error ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#1e293b] space-y-2 bg-[#FFFFF0] border border-[#334155]/20 rounded-2xl">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm font-bold">Failed to load detection records</p>
          <p className="text-xs text-[#334155]">{detections.error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {STAGE_DEFINITIONS.map((stage) => (
            <LifecycleStage
              key={stage.id}
              stage={stage}
              items={stageItemsMap[stage.id] ?? []}
              onSelect={handleSelectDetection}
              selectedId={selectedDetection?.id}
              isExpanded={expandedStageId === stage.id}
              onToggleExpand={() =>
                setExpandedStageId(expandedStageId === stage.id ? null : stage.id)
              }
            />
          ))}
        </div>
      )}

      {/* ── Slide-in Lifecycle Inspection Drawer ── */}
      <LifecycleDetail
        detection={selectedDetection}
        onClose={() => handleSelectDetection(null)}
        onFocusMap={onFocusMap}
      />
    </div>
  );
}
