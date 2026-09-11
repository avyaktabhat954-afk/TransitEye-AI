import React from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  CheckCheck,
  Info,
  Lock
} from 'lucide-react';

export default function LifecycleSummary({ records = [] }) {
  const totalCount = records.length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const inReviewCount = records.filter((r) => r.status === 'in_review').length;
  const confirmedCount = records.filter((r) => r.status === 'confirmed').length;
  const resolvedCount = records.filter((r) => r.status === 'resolved').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Total Observations */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col justify-between border border-[#334155]/20 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
            Total Telemetry
          </span>
          <div className="p-1.5 rounded-lg bg-[#1e293b] text-[#FFFFF0]">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#1e293b]">
            {totalCount}
          </span>
          <span className="text-xs text-[#334155]">records</span>
        </div>
        <p className="text-[10px] text-[#334155] mt-1">
          Backend observations
        </p>
      </div>

      {/* Pending / Detected */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col justify-between border border-[#334155]/20 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
            1. Detected
          </span>
          <div className="p-1.5 rounded-lg bg-[#1e293b] text-[#FFFFF0]">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#1e293b]">
            {pendingCount}
          </span>
          <span className="text-xs text-[#334155]">pending</span>
        </div>
        <p className="text-[10px] text-[#334155] mt-1">
          Awaiting verification
        </p>
      </div>

      {/* Verified (Confirmed + In Review) */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col justify-between border border-[#334155]/20 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
            2. Verified
          </span>
          <div className="p-1.5 rounded-lg bg-[#1e293b] text-[#FFFFF0]">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#1e293b]">
            {confirmedCount + inReviewCount}
          </span>
          <span className="text-xs text-[#334155]">
            {inReviewCount > 0 ? `${confirmedCount} conf / ${inReviewCount} rev` : 'confirmed'}
          </span>
        </div>
        <p className="text-[10px] text-[#334155] mt-1">
          Multi-pass confirmed
        </p>
      </div>

      {/* Resolved */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col justify-between border border-[#334155]/20 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
            Backend Resolved
          </span>
          <div className="p-1.5 rounded-lg bg-[#1e293b] text-[#FFFFF0]">
            <CheckCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#1e293b]">
            {resolvedCount}
          </span>
          <span className="text-xs text-[#334155]">resolved</span>
        </div>
        <p className="text-[10px] text-[#334155] mt-1">
          {rejectedCount > 0 ? `${rejectedCount} rejected` : 'Closed state'}
        </p>
      </div>

      {/* Contract Capability Badge */}
      <div className="liquid-glass rounded-2xl p-4 flex flex-col justify-between border border-[#334155]/20 shadow-xs col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#334155]">
            Backend Contract
          </span>
          <Lock className="w-4 h-4 text-[#334155]" />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1e293b] text-[#FFFFF0]">
            READ-ONLY
          </span>
          <span className="text-[10px] text-[#334155] font-bold">v1.0 GET</span>
        </div>
        <p className="text-[10px] text-[#334155] mt-1 flex items-center gap-1">
          <Info className="w-3 h-3 text-[#334155] shrink-0" />
          Mutations deferred
        </p>
      </div>
    </div>
  );
}
