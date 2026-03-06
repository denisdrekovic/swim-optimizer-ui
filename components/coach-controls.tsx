"use client";

import { useState, useCallback } from "react";
import {
  Lock,
  X,
  AlertTriangle,
  ThermometerSun,
  Activity,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Users,
} from "lucide-react";
import type { SwimmerTimeRow } from "@/lib/api";

// ── Types matching backend ──────────────────────────────────────

export interface CoachConstraint {
  swimmer_id: number;
  event_id: number;
  constraint_type: "lock" | "exclude";
}

export interface TimeAdjustment {
  swimmer_id: number;
  event_id: number | null; // null = all events
  multiplier: number;
  reason: string;
}

export interface CoachControlsProps {
  swimmers: { id: number; name: string }[];
  events: { id: number; name: string }[];
  enabledEvents: Set<number>;
  timesMatrix: Record<number, Record<number, SwimmerTimeRow>>;
  constraints: CoachConstraint[];
  timeAdjustments: TimeAdjustment[];
  unavailableSwimmers: number[];
  coachNotes: string;
  onChange: (
    constraints: CoachConstraint[],
    adjustments: TimeAdjustment[],
    unavailable: number[],
    notes: string,
  ) => void;
}

// ── Presets ──────────────────────────────────────────────────────

const CONDITION_PRESETS = [
  {
    label: "Tapered",
    multiplier: 0.97,
    icon: Sparkles,
    desc: "3% faster",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    activeBg: "bg-emerald-100",
    activeRing: "ring-emerald-300",
  },
  {
    label: "Fresh",
    multiplier: 1.0,
    icon: Activity,
    desc: "Baseline",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBg: "bg-blue-100",
    activeRing: "ring-blue-300",
  },
  {
    label: "Tired",
    multiplier: 1.03,
    icon: AlertTriangle,
    desc: "3% slower",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBg: "bg-amber-100",
    activeRing: "ring-amber-300",
  },
  {
    label: "Sick",
    multiplier: 1.05,
    icon: ThermometerSun,
    desc: "5% slower",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    activeBg: "bg-red-100",
    activeRing: "ring-red-300",
  },
] as const;

// ── Main Component ──────────────────────────────────────────────

export function CoachControls({
  swimmers,
  events,
  enabledEvents,
  timesMatrix,
  constraints,
  timeAdjustments,
  unavailableSwimmers,
  coachNotes,
  onChange,
}: CoachControlsProps) {
  const [expandedSwimmer, setExpandedSwimmer] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // ── Callbacks ─────────────────────────────────────────────────

  const setConstraint = useCallback(
    (swimmerId: number, eventId: number, type: "lock" | "exclude") => {
      const filtered = constraints.filter(
        (c) => !(c.swimmer_id === swimmerId && c.event_id === eventId),
      );
      onChange(
        [...filtered, { swimmer_id: swimmerId, event_id: eventId, constraint_type: type }],
        timeAdjustments,
        unavailableSwimmers,
        coachNotes,
      );
    },
    [constraints, timeAdjustments, unavailableSwimmers, coachNotes, onChange],
  );

  const removeConstraint = useCallback(
    (swimmerId: number, eventId: number) => {
      onChange(
        constraints.filter((c) => !(c.swimmer_id === swimmerId && c.event_id === eventId)),
        timeAdjustments,
        unavailableSwimmers,
        coachNotes,
      );
    },
    [constraints, timeAdjustments, unavailableSwimmers, coachNotes, onChange],
  );

  const toggleUnavailable = useCallback(
    (swimmerId: number) => {
      const isUnavail = unavailableSwimmers.includes(swimmerId);
      onChange(
        isUnavail ? constraints : constraints.filter((c) => c.swimmer_id !== swimmerId),
        isUnavail ? timeAdjustments : timeAdjustments.filter((a) => a.swimmer_id !== swimmerId),
        isUnavail
          ? unavailableSwimmers.filter((id) => id !== swimmerId)
          : [...unavailableSwimmers, swimmerId],
        coachNotes,
      );
    },
    [constraints, timeAdjustments, unavailableSwimmers, coachNotes, onChange],
  );

  const setAdjustment = useCallback(
    (swimmerId: number, multiplier: number, reason: string) => {
      const filtered = timeAdjustments.filter(
        (a) => !(a.swimmer_id === swimmerId && a.event_id === null),
      );
      if (Math.abs(multiplier - 1.0) < 0.001) {
        onChange(constraints, filtered, unavailableSwimmers, coachNotes);
      } else {
        onChange(
          constraints,
          [...filtered, { swimmer_id: swimmerId, event_id: null, multiplier, reason }],
          unavailableSwimmers,
          coachNotes,
        );
      }
    },
    [constraints, timeAdjustments, unavailableSwimmers, coachNotes, onChange],
  );

  const setNotes = useCallback(
    (notes: string) => onChange(constraints, timeAdjustments, unavailableSwimmers, notes),
    [constraints, timeAdjustments, unavailableSwimmers, onChange],
  );

  // ── Derived data ──────────────────────────────────────────────

  const enabledEventList = events.filter((e) => enabledEvents.has(e.id));
  const totalMods = constraints.length + timeAdjustments.length + unavailableSwimmers.length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden flex flex-col">
      {/* Header — always visible */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-slate-400" />
          <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Roster
          </h3>
          <span className="text-[11px] text-slate-400">
            {swimmers.length} swimmers
          </span>
          {totalMods > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
              {totalMods}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`flex items-center gap-1 text-[11px] transition-colors ${
            showNotes || coachNotes ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MessageSquare size={11} />
          Notes
        </button>
      </div>

      {/* Notes — toggle */}
      {showNotes && (
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <textarea
            value={coachNotes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Championship meet, swimmers tapered. Emma recovering from flu..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all bg-white"
          />
        </div>
      )}

      {/* Swimmer list — accordion, scrollable */}
      <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
        {swimmers.map((swimmer) => {
          const isUnavailable = unavailableSwimmers.includes(swimmer.id);
          const isExpanded = expandedSwimmer === swimmer.id;
          const swimmerConstraints = constraints.filter((c) => c.swimmer_id === swimmer.id);
          const swimmerAdjustment = timeAdjustments.find(
            (a) => a.swimmer_id === swimmer.id && a.event_id === null,
          );
          const activePreset = CONDITION_PRESETS.find(
            (p) => swimmerAdjustment && Math.abs(p.multiplier - swimmerAdjustment.multiplier) < 0.001,
          );
          const swimmerEvents = enabledEventList.filter(
            (e) => timesMatrix[swimmer.id]?.[e.id],
          );
          const lockCount = swimmerConstraints.filter((c) => c.constraint_type === "lock").length;
          const excludeCount = swimmerConstraints.filter((c) => c.constraint_type === "exclude").length;
          const constraintMap = new Map(swimmerConstraints.map((c) => [c.event_id, c.constraint_type]));

          return (
            <div key={swimmer.id} className={isUnavailable ? "opacity-45" : ""}>
              {/* ── Swimmer Row — click to expand ── */}
              <div
                className={`px-4 py-2 flex items-center gap-2 transition-colors ${
                  isUnavailable
                    ? "cursor-default"
                    : `cursor-pointer hover:bg-slate-50/70 ${isExpanded ? "bg-blue-50/40" : ""}`
                }`}
                onClick={() => {
                  if (!isUnavailable && swimmerEvents.length > 0) {
                    setExpandedSwimmer(isExpanded ? null : swimmer.id);
                  }
                }}
              >
                {/* Availability checkbox — checked = included (default) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUnavailable(swimmer.id);
                  }}
                  className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                    isUnavailable
                      ? "border-slate-300 bg-white hover:border-red-400"
                      : "border-blue-500 bg-blue-500 hover:bg-blue-600 hover:border-blue-600"
                  }`}
                  title={isUnavailable ? "Click to include" : "Click to exclude"}
                >
                  {!isUnavailable && <Check size={10} strokeWidth={3} className="text-white" />}
                </button>

                {/* Name */}
                <span
                  className={`text-[13px] font-medium flex-1 min-w-0 truncate ${
                    isUnavailable ? "line-through text-slate-400" : "text-slate-800"
                  }`}
                >
                  {swimmer.name}
                </span>

                {/* Summary pills — compact indicators of active settings */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUnavailable && (
                    <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      OUT
                    </span>
                  )}
                  {!isUnavailable && activePreset && (
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${activePreset.color} ${activePreset.bg} ${activePreset.border}`}
                    >
                      {activePreset.label}
                    </span>
                  )}
                  {!isUnavailable && lockCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <Lock size={7} />
                      {lockCount}
                    </span>
                  )}
                  {!isUnavailable && excludeCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      <X size={7} />
                      {excludeCount}
                    </span>
                  )}
                </div>

                {/* Expand/collapse indicator */}
                {!isUnavailable && swimmerEvents.length > 0 && (
                  <div className="flex-shrink-0 text-slate-400">
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                )}
              </div>

              {/* ── Expanded: Condition + Event Assignments ── */}
              {isExpanded && !isUnavailable && (
                <div className="px-4 pb-3 pt-1 bg-slate-50/40 border-t border-slate-100/60">
                  {/* Condition presets — labeled buttons */}
                  <div className="mb-3">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1.5">
                      Condition
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {CONDITION_PRESETS.map((preset) => {
                        const isActive = activePreset?.label === preset.label;
                        const Icon = preset.icon;
                        return (
                          <button
                            key={preset.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustment(
                                swimmer.id,
                                isActive ? 1.0 : preset.multiplier,
                                isActive ? "" : preset.label,
                              );
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                              isActive
                                ? `${preset.color} ${preset.activeBg} ${preset.border} ring-1 ${preset.activeRing}`
                                : "text-slate-500 bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                            title={preset.desc}
                          >
                            <Icon size={10} />
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event assignments — lock / exclude per event */}
                  {swimmerEvents.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1.5">
                        Events
                      </div>
                      <div className="bg-white rounded-md border border-slate-100 divide-y divide-slate-50">
                        {swimmerEvents.map((event) => {
                          const ct = constraintMap.get(event.id);
                          const time = timesMatrix[swimmer.id]?.[event.id];
                          return (
                            <div
                              key={event.id}
                              className="flex items-center gap-2 py-1.5 px-2.5"
                            >
                              <span className="text-[11px] text-slate-700 font-medium flex-1 truncate">
                                {event.name}
                              </span>
                              {time && (
                                <span className="text-[10px] font-mono text-slate-400 tabular-nums flex-shrink-0">
                                  {time.time_display}
                                </span>
                              )}
                              {ct === "lock" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeConstraint(swimmer.id, event.id);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:opacity-70 transition-opacity"
                                  title="Click to unlock"
                                >
                                  <Lock size={8} /> Locked
                                </button>
                              )}
                              {ct === "exclude" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeConstraint(swimmer.id, event.id);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border bg-red-50 text-red-700 border-red-200 hover:opacity-70 transition-opacity"
                                  title="Click to remove exclusion"
                                >
                                  <X size={8} /> Excluded
                                </button>
                              )}
                              {!ct && (
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConstraint(swimmer.id, event.id, "lock");
                                    }}
                                    className="p-1 rounded hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition-colors"
                                    title="Must swim this event"
                                  >
                                    <Lock size={10} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConstraint(swimmer.id, event.id, "exclude");
                                    }}
                                    className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-600 transition-colors"
                                    title="Exclude from this event"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
