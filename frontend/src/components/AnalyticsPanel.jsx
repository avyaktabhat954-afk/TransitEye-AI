import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Activity,
  AlertTriangle,
  Car,
  ShieldAlert,
  Clock,
  Filter,
  RefreshCw,
  Info,
  CheckCircle2,
  PieChart as PieIcon,
  Layers,
  Database
} from 'lucide-react';

/**
 * Muted, Harmonized Palette for Recharts Data Series
 */
const TYPE_COLORS = {
  road_defect: '#1e293b',
  waterlogging: '#334155',
  vru_safety: '#8ea58c',
  other: '#94a3b8',
};

const SEVERITY_COLORS = {
  low: '#94a3b8',
  medium: '#8ea58c',
  high: '#334155',
  critical: '#1e293b',
};

const STATUS_COLORS = {
  pending: '#fce68d',
  in_review: '#8ea58c',
  confirmed: '#334155',
  resolved: '#1e293b',
  rejected: '#94a3b8',
};

const VEHICLE_CLASS_COLORS = {
  car: '#1e293b',
  bus: '#334155',
  truck: '#475569',
  motorcycle: '#8ea58c',
  auto_rickshaw: '#94a3b8',
  other: '#cbd5e1',
};

const CONGESTION_COLORS = {
  low: '#8ea58c',
  moderate: '#fce68d',
  heavy: '#334155',
  severe: '#1e293b',
};

/**
 * Custom Light Theme Tooltip for Recharts
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#FFFFF0] border border-[#334155]/20 rounded-xl p-3 shadow-md text-xs text-[#1e293b]">
        <p className="font-bold uppercase text-[#1e293b] mb-1">{data.name || label || data.payload?.name}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || data.fill || '#1e293b' }} />
          <span>Value: <strong className="text-[#1e293b] font-bold">{data.value}</strong></span>
        </div>
      </div>
    );
  }
  return null;
}

export default function AnalyticsPanel({
  detections,
  vehicleDensity,
  incidents,
  onSelectTab,
}) {
  const [activeSegmentFilter, setActiveSegmentFilter] = useState('all');

  const rawDetections = useMemo(() => detections?.data?.data ?? [], [detections]);
  const rawDensity = useMemo(() => vehicleDensity?.data?.data ?? [], [vehicleDensity]);
  const rawIncidents = useMemo(() => incidents?.data?.data ?? [], [incidents]);

  // Aggregated Metric A: Detection Types Distribution
  const typeDistribution = useMemo(() => {
    const counts = { road_defect: 0, waterlogging: 0, vru_safety: 0 };
    rawDetections.forEach((d) => {
      const type = d.type || 'road_defect';
      if (counts[type] !== undefined) counts[type] += 1;
    });
    return [
      { name: 'Road Defects', key: 'road_defect', count: counts.road_defect, fill: TYPE_COLORS.road_defect },
      { name: 'Waterlogging', key: 'waterlogging', count: counts.waterlogging, fill: TYPE_COLORS.waterlogging },
      { name: 'VRU Safety Risks', key: 'vru_safety', count: counts.vru_safety, fill: TYPE_COLORS.vru_safety },
    ];
  }, [rawDetections]);

  // Aggregated Metric B: Severity Breakdown
  const severityBreakdown = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    rawDetections.forEach((d) => {
      const sev = d.severity || 'low';
      if (counts[sev] !== undefined) counts[sev] += 1;
    });
    return [
      { name: 'Low', count: counts.low, fill: SEVERITY_COLORS.low },
      { name: 'Medium', count: counts.medium, fill: SEVERITY_COLORS.medium },
      { name: 'High', count: counts.high, fill: SEVERITY_COLORS.high },
      { name: 'Critical', count: counts.critical, fill: SEVERITY_COLORS.critical },
    ];
  }, [rawDetections]);

  // Aggregated Metric C: Lifecycle Status Summary
  const statusSummary = useMemo(() => {
    const counts = { pending: 0, in_review: 0, confirmed: 0, resolved: 0, rejected: 0 };
    rawDetections.forEach((d) => {
      const st = d.status || 'pending';
      if (counts[st] !== undefined) counts[st] += 1;
    });
    return [
      { name: 'Pending', count: counts.pending, fill: STATUS_COLORS.pending },
      { name: 'In Review', count: counts.in_review, fill: STATUS_COLORS.in_review },
      { name: 'Confirmed', count: counts.confirmed, fill: STATUS_COLORS.confirmed },
      { name: 'Resolved', count: counts.resolved, fill: STATUS_COLORS.resolved },
      { name: 'Rejected', count: counts.rejected, fill: STATUS_COLORS.rejected },
    ];
  }, [rawDetections]);

  // Aggregated Metric D: Vehicle Class Distribution Across Traffic Segments
  const vehicleClassDistribution = useMemo(() => {
    const totals = { car: 0, bus: 0, truck: 0, motorcycle: 0, auto_rickshaw: 0 };
    rawDensity.forEach((td) => {
      if (td.class_breakdown) {
        Object.entries(td.class_breakdown).forEach(([cls, count]) => {
          if (totals[cls] !== undefined) {
            totals[cls] += Number(count) || 0;
          }
        });
      }
    });
    return Object.entries(totals).map(([cls, count]) => ({
      name: cls.replace(/_/g, ' ').toUpperCase(),
      count,
      fill: VEHICLE_CLASS_COLORS[cls] || VEHICLE_CLASS_COLORS.other,
    }));
  }, [rawDensity]);

  // Aggregated Metric E: Segment Traffic & Congestion Metrics
  const segmentTrafficData = useMemo(() => {
    const map = {};
    rawDensity.forEach((td) => {
      const seg = td.segment_id || 'UNKNOWN';
      if (!map[seg]) {
        map[seg] = { segment_id: seg, total_vehicles: 0, observations: 0, congestion_level: td.metadata?.congestion_level || 'Moderate' };
      }
      map[seg].total_vehicles += Number(td.vehicle_count) || 0;
      map[seg].observations += 1;
    });
    return Object.values(map);
  }, [rawDensity]);

  // Unique GIS Segments list for filter
  const uniqueSegments = useMemo(() => {
    const set = new Set();
    segmentTrafficData.forEach((s) => set.add(s.segment_id));
    return Array.from(set);
  }, [segmentTrafficData]);

  // Filtered Segment Traffic Data
  const filteredSegmentData = useMemo(() => {
    if (activeSegmentFilter === 'all') return segmentTrafficData;
    return segmentTrafficData.filter((s) => s.segment_id === activeSegmentFilter);
  }, [segmentTrafficData, activeSegmentFilter]);

  // Aggregated Metric F: ANPR Incident Trigger Breakdown
  const incidentTriggerBreakdown = useMemo(() => {
    const counts = {};
    rawIncidents.forEach((inc) => {
      const reason = inc.trigger_reason ? inc.trigger_reason.replace(/_/g, ' ') : 'Unknown';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts).map(([reason, count]) => ({
      name: reason.toUpperCase(),
      count,
    }));
  }, [rawIncidents]);

  const totalDetectionsCount = rawDetections.length;
  const totalVehiclesObserved = rawDensity.reduce((sum, d) => sum + (Number(d.vehicle_count) || 0), 0);
  const totalIncidentsCount = rawIncidents.length;

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ── */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#334155]/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-[#1e293b]">
              Perception & Traffic Analytics
            </h2>
          </div>
          <p className="text-xs text-[#334155]">
            Quantitative telemetry insights aggregated from public transport bus sensors.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onSelectTab && onSelectTab('overview')}
            className="px-3.5 py-2 rounded-xl bg-[#1e293b] text-[#FFFFF0] hover:bg-[#334155] font-bold transition-all shadow-xs cursor-pointer"
          >
            Main Dashboard
          </button>
        </div>
      </div>

      {/* ── Summary Key Metrics Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#334155] tracking-wider block mb-1">
              Physical Observations
            </span>
            <span className="text-3xl font-bold text-[#1e293b]">
              {totalDetectionsCount}
            </span>
            <p className="text-[11px] text-[#334155] mt-1">Defects, waterlogging & VRU hazards</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#334155] tracking-wider block mb-1">
              Vehicles Observed
            </span>
            <span className="text-3xl font-bold text-[#1e293b]">
              {totalVehiclesObserved}
            </span>
            <p className="text-[11px] text-[#334155] mt-1">Segment traffic density samples</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-[#334155] tracking-wider block mb-1">
              ANPR Incidents Logged
            </span>
            <span className="text-3xl font-bold text-[#1e293b]">
              {totalIncidentsCount}
            </span>
            <p className="text-[11px] text-[#334155] mt-1">Camera traffic violation feeds</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1e293b] text-[#FFFFF0]">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Section 1: Observation Perception Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Detection Category Distribution (Bar Chart) */}
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155]/15 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1e293b]" />
              Observation Category Distribution
            </h3>
            <span className="text-[10px] text-[#334155]">Physical Hazards</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} />
                <YAxis stroke="#334155" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Observation Severity Hierarchy (Pie Chart) */}
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155]/15 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#1e293b]" />
              Severity Hierarchy Breakdown
            </h3>
            <span className="text-[10px] text-[#334155]">Risk Tier</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {severityBreakdown.map((entry, index) => (
                    <Cell key={`sev-cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-[#334155] font-bold">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 2: Traffic & Vehicle Density Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Vehicle Class Breakdown */}
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155]/15 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-2">
              <Car className="w-4 h-4 text-[#1e293b]" />
              Vehicle Class Distribution
            </h3>
            <span className="text-[10px] text-[#334155]">Class Ingestion</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleClassDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                <XAxis dataKey="name" stroke="#334155" fontSize={10} tickLine={false} />
                <YAxis stroke="#334155" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {vehicleClassDistribution.map((entry, index) => (
                    <Cell key={`vc-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Segment Traffic Telemetry */}
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155]/15 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1e293b]" />
              Segment Vehicle Volume
            </h3>
            {/* Filter Dropdown */}
            <select
              value={activeSegmentFilter}
              onChange={(e) => setActiveSegmentFilter(e.target.value)}
              className="bg-[#FFFFF0] border border-[#334155]/20 rounded-xl px-2.5 py-1 text-xs text-[#1e293b] font-bold focus:outline-none"
            >
              <option value="all">All GIS Segments</option>
              {uniqueSegments.map((seg) => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSegmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                <XAxis dataKey="segment_id" stroke="#334155" fontSize={10} tickLine={false} />
                <YAxis stroke="#334155" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_vehicles" fill="#1e293b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 3: ANPR Violation Trigger Breakdown ── */}
      {incidentTriggerBreakdown.length > 0 && (
        <div className="liquid-glass rounded-2xl p-5 border border-[#334155]/20 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#334155]/15 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1e293b] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#1e293b]" />
              ANPR Violation Trigger Frequency
            </h3>
            <span className="text-[10px] text-[#334155]">Camera Feed</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentTriggerBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" />
                <XAxis dataKey="name" stroke="#334155" fontSize={10} tickLine={false} />
                <YAxis stroke="#334155" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
