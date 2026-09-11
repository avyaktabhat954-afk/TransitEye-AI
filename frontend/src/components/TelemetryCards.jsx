import React from 'react';
import { AlertTriangle, ShieldAlert, Car, Activity, RefreshCw, MousePointerClick } from 'lucide-react';

/**
 * TelemetryCards — Overview cards updated in Stage 13.1 to use the unified TransitEye design system.
 */
export default function TelemetryCards({
  detections,
  incidents,
  vehicleDensity,
  onFocusType,
  onSelectTab,
}) {
  const getActiveDefectsState = () => {
    if (detections.loading) {
      return { status: 'loading', text: 'Loading telemetry...' };
    }
    if (detections.error) {
      return { status: 'error', text: 'Unable to load detection telemetry' };
    }
    if (!detections.data || detections.data.data.length === 0) {
      return { status: 'empty', text: 'No defects reported', count: 0 };
    }
    const count = detections.data.data.filter((d) => d.type === 'road_defect').length;
    return { status: 'success', count, text: `${count} active road defects detected` };
  };

  const getSevereHazardsState = () => {
    if (detections.loading) {
      return { status: 'loading', text: 'Loading telemetry...' };
    }
    if (detections.error) {
      return { status: 'error', text: 'Unable to load hazard telemetry' };
    }
    if (!detections.data || detections.data.data.length === 0) {
      return { status: 'empty', text: 'No severe hazards reported', count: 0 };
    }
    const count = detections.data.data.filter(
      (d) => d.severity === 'high' || d.severity === 'critical'
    ).length;
    return { status: 'success', count, text: `${count} high/critical severity hazards` };
  };

  const getIncidentsState = () => {
    if (incidents.loading) {
      return { status: 'loading', text: 'Loading telemetry...' };
    }
    if (incidents.error) {
      return { status: 'error', text: 'Unable to load incident telemetry' };
    }
    if (!incidents.data || incidents.data.data.length === 0) {
      return { status: 'empty', text: 'No incidents reported', count: 0 };
    }
    const count = incidents.data.count || incidents.data.data.length;
    return { status: 'success', count, text: `${count} recorded traffic & ANPR incidents` };
  };

  const getCongestionState = () => {
    if (vehicleDensity.loading) {
      return { status: 'loading', text: 'Loading telemetry...' };
    }
    if (vehicleDensity.error) {
      return { status: 'error', text: 'Unable to load density telemetry' };
    }
    if (!vehicleDensity.data || vehicleDensity.data.data.length === 0) {
      return { status: 'empty', text: 'No density observations', count: 0, level: 'N/A' };
    }

    const records = vehicleDensity.data.data;
    const totalVehicles = records.reduce((sum, r) => sum + (Number(r.vehicle_count) || 0), 0);
    const latestRecord = records[records.length - 1];
    const congestionLevel = latestRecord?.metadata?.congestion_level || 'Moderate';

    return {
      status: 'success',
      totalVehicles,
      level: String(congestionLevel).toUpperCase(),
      text: `${totalVehicles} total vehicles observed across ${records.length} segment(s)`,
    };
  };

  const defectsState = getActiveDefectsState();
  const hazardsState = getSevereHazardsState();
  const incidentsState = getIncidentsState();
  const congestionState = getCongestionState();

  function CardWrapper({ onClick, children }) {
    const isClickable = Boolean(onClick);
    return (
      <div
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
        className={`liquid-glass p-5 rounded-2xl border border-[#334155]/20 shadow-xs flex flex-col justify-between transition-all duration-200 ${
          isClickable ? 'cursor-pointer hover:border-[#1e293b]/40 hover:shadow-md hover:scale-[1.01]' : ''
        }`}
      >
        {children}
        {isClickable && (
          <div className="mt-3 pt-2 border-t border-[#334155]/10 flex items-center gap-1.5 text-[10px] text-[#334155] font-bold">
            <MousePointerClick className="w-3 h-3 text-[#1e293b]" />
            <span>Click to focus map</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Active Road Defects */}
      <CardWrapper onClick={onFocusType ? () => onFocusType('road_defect') : undefined}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase text-[#334155] tracking-wider">
            Active Road Defects
          </span>
          <div className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#FFFFF0] flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div>
          {defectsState.status === 'loading' && (
            <div className="flex items-center gap-2 text-[#334155] text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1e293b]" />
              <span>{defectsState.text}</span>
            </div>
          )}
          {defectsState.status === 'error' && (
            <div className="text-rose-700 text-xs py-1 font-bold">{defectsState.text}</div>
          )}
          {defectsState.status === 'empty' && (
            <div>
              <div className="text-2xl font-bold text-[#334155]">0</div>
              <div className="text-xs text-[#334155]/80 mt-1">{defectsState.text}</div>
            </div>
          )}
          {defectsState.status === 'success' && (
            <div>
              <div className="text-3xl font-bold text-[#1e293b] tracking-tight">
                {defectsState.count}
              </div>
              <div className="text-xs text-[#334155] mt-1 truncate">{defectsState.text}</div>
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Card 2: Severe Hazards */}
      <CardWrapper onClick={onFocusType ? () => onFocusType('high_critical') : undefined}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase text-[#334155] tracking-wider">
            Severe Hazards
          </span>
          <div className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#FFFFF0] flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div>
          {hazardsState.status === 'loading' && (
            <div className="flex items-center gap-2 text-[#334155] text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1e293b]" />
              <span>{hazardsState.text}</span>
            </div>
          )}
          {hazardsState.status === 'error' && (
            <div className="text-rose-700 text-xs py-1 font-bold">{hazardsState.text}</div>
          )}
          {hazardsState.status === 'empty' && (
            <div>
              <div className="text-2xl font-bold text-[#334155]">0</div>
              <div className="text-xs text-[#334155]/80 mt-1">{hazardsState.text}</div>
            </div>
          )}
          {hazardsState.status === 'success' && (
            <div>
              <div className="text-3xl font-bold text-[#1e293b] tracking-tight">
                {hazardsState.count}
              </div>
              <div className="text-xs text-[#334155] mt-1 truncate">{hazardsState.text}</div>
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Card 3: ANPR Incidents */}
      <CardWrapper onClick={onSelectTab ? () => onSelectTab('incidents') : undefined}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase text-[#334155] tracking-wider">
            ANPR Incidents
          </span>
          <div className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#FFFFF0] flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div>
          {incidentsState.status === 'loading' && (
            <div className="flex items-center gap-2 text-[#334155] text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1e293b]" />
              <span>{incidentsState.text}</span>
            </div>
          )}
          {incidentsState.status === 'error' && (
            <div className="text-rose-700 text-xs py-1 font-bold">{incidentsState.text}</div>
          )}
          {incidentsState.status === 'empty' && (
            <div>
              <div className="text-2xl font-bold text-[#334155]">0</div>
              <div className="text-xs text-[#334155]/80 mt-1">{incidentsState.text}</div>
            </div>
          )}
          {incidentsState.status === 'success' && (
            <div>
              <div className="text-3xl font-bold text-[#1e293b] tracking-tight">
                {incidentsState.count}
              </div>
              <div className="text-xs text-[#334155] mt-1 truncate">{incidentsState.text}</div>
            </div>
          )}
        </div>
      </CardWrapper>

      {/* Card 4: Traffic Observations */}
      <CardWrapper onClick={onFocusType ? () => onFocusType('traffic') : undefined}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase text-[#334155] tracking-wider">
            Traffic Density
          </span>
          <div className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#FFFFF0] flex items-center justify-center shadow-xs">
            <Car className="w-4 h-4" />
          </div>
        </div>
        <div>
          {congestionState.status === 'loading' && (
            <div className="flex items-center gap-2 text-[#334155] text-xs py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1e293b]" />
              <span>{congestionState.text}</span>
            </div>
          )}
          {congestionState.status === 'error' && (
            <div className="text-rose-700 text-xs py-1 font-bold">{congestionState.text}</div>
          )}
          {congestionState.status === 'empty' && (
            <div>
              <div className="text-2xl font-bold text-[#334155]">N/A</div>
              <div className="text-xs text-[#334155]/80 mt-1">{congestionState.text}</div>
            </div>
          )}
          {congestionState.status === 'success' && (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#1e293b] tracking-tight">
                  {congestionState.totalVehicles}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#334155]/10 text-[#334155] border border-[#334155]/15">
                  {congestionState.level}
                </span>
              </div>
              <div className="text-xs text-[#334155] mt-1 truncate">{congestionState.text}</div>
            </div>
          )}
        </div>
      </CardWrapper>
    </div>
  );
}
