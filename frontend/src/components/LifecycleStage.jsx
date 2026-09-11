import React from 'react';
import LifecycleItem from './LifecycleItem';
import { UilLock, UilExclamationCircle, UilAngleDown, UilAngleUp } from '@iconscout/react-unicons';

/**
 * LifecycleStage — Represents one stage of the 3x2 repair lifecycle workflow.
 * Supports click-to-expand behavior while preserving read-only backend status guarantees.
 */
export default function LifecycleStage({
  stage,
  items = [],
  onSelect,
  selectedId,
  isExpanded = false,
  onToggleExpand,
}) {
  const Icon = stage.icon;
  const count = items.length;

  return (
    <div
      className={`liquid-glass rounded-2xl overflow-hidden border transition-all duration-300 ${
        isExpanded
          ? 'border-[#1e293b] ring-2 ring-[#1e293b]/15 shadow-lg bg-[#FFFFF0]'
          : 'border-[#334155]/20 hover:border-[#334155]/40 shadow-xs'
      }`}
    >
      {/* ── Stage Header (Click to toggle expansion) ── */}
      <div
        onClick={onToggleExpand}
        className="p-4 bg-[#334155]/5 border-b border-[#334155]/15 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl border ${
              stage.isBackendSupported
                ? 'bg-[#1e293b] text-[#FFFFF0] border-[#1e293b]'
                : 'bg-[#334155]/10 text-[#334155] border-[#334155]/20'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e293b] truncate">
              {stage.title}
            </h3>
            <p className="text-[10px] text-[#334155] truncate">
              {stage.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              !stage.isBackendSupported
                ? 'bg-[#334155]/10 text-[#334155]/60 border-[#334155]/20'
                : count > 0
                ? 'bg-[#1e293b] text-[#FFFFF0] border-[#1e293b]'
                : 'bg-[#334155]/10 text-[#334155] border-[#334155]/20'
            }`}
          >
            {stage.isBackendSupported ? `${count} items` : 'Read-Only'}
          </span>

          <span className="text-[#334155] text-xs">
            {isExpanded ? <UilAngleUp className="w-4 h-4" /> : <UilAngleDown className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {/* ── Backend Status Indicator ── */}
      <div className="px-4 py-1.5 bg-[#334155]/5 border-b border-[#334155]/10 flex items-center justify-between text-[10px]">
        <span className="text-[#334155]">Backend Status:</span>
        {stage.isBackendSupported ? (
          <span className="px-2 py-0.5 rounded-full bg-[#334155]/10 text-[#334155] border border-[#334155]/20 font-bold uppercase">
            {stage.backendStatusMap ? stage.backendStatusMap.join(', ') : 'Supported'}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-[#334155]/5 text-[#334155]/70 border border-[#334155]/15 flex items-center gap-1 font-bold">
            <UilLock className="w-3 h-3 text-[#334155]" />
            <span>Pending Backend API</span>
          </span>
        )}
      </div>

      {/* ── Expandable Body Content ── */}
      {isExpanded && (
        <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto animate-fadeIn">
          {!stage.isBackendSupported ? (
            /* Unsupported Stage Notice */
            <div className="bg-[#334155]/5 border border-dashed border-[#334155]/20 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
              <UilLock className="w-6 h-6 text-[#334155]/60" />
              <div>
                <p className="text-xs font-bold text-[#1e293b]">
                  {stage.emptyNoticeTitle ?? 'Stage Unavailable'}
                </p>
                <p className="text-[10px] text-[#334155] mt-1 leading-relaxed">
                  {stage.emptyNotice}
                </p>
              </div>
            </div>
          ) : count === 0 ? (
            /* Empty Supported Stage */
            <div className="bg-[#334155]/5 border border-[#334155]/15 rounded-2xl p-6 flex flex-col items-center text-center space-y-2">
              <UilExclamationCircle className="w-6 h-6 text-[#334155]/60" />
              <p className="text-xs text-[#334155]">
                No observations currently in this stage
              </p>
            </div>
          ) : (
            /* Render Active Detection Items */
            items.map((item) => (
              <LifecycleItem
                key={item.id}
                detection={item}
                onSelect={onSelect}
                isSelected={selectedId === item.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
