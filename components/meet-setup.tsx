"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getScoringPresets,
  getScoutingBrief,
  runOptimizer,
  type TeamSummary,
  type SwimmerTimeRow,
  type MeetConfig,
  type MeetDetails,
  type OptimizerResult,
  type EventConfig,
  type SwimmerEntry,
  type SwimmerTime,
  type OpponentTeamData,
  type OpponentTime,
  type AnalysisRequest,
} from "@/lib/api";
import {
  ArrowLeft,
  Zap,
  Loader2,
  Settings2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Users,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ScoutingBrief } from "@/components/scouting-brief";
import { MatchupBoard } from "@/components/matchup-board";
import {
  CoachControls,
  type CoachConstraint,
  type TimeAdjustment,
} from "@/components/coach-controls";
import { CoachChat } from "@/components/coach-chat";
import { Legend } from "@/components/legend";
import type { ParameterChange, CoachChatContext } from "@/lib/api";

/** Format seconds to swim time display (e.g. 65.23 → "1:05.23") */
function formatSwimTime(seconds: number): string {
  if (seconds < 60) return seconds.toFixed(2);
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

interface MeetSetupProps {
  team: TeamSummary;
  gender: string;
  times: SwimmerTimeRow[];
  opponentTeams: OpponentTeamData[];
  onBack: () => void;
  onOptimize: (config: MeetConfig, result: OptimizerResult, meetDetails: MeetDetails) => void;
}

export function MeetSetup({
  team,
  gender,
  times,
  opponentTeams,
  onBack,
  onOptimize,
}: MeetSetupProps) {
  const [scoringPreset, setScoringPreset] = useState("maine_class_b");
  const [maxIndividual, setMaxIndividual] = useState(2);
  const [maxEntriesPerEvent, setMaxEntriesPerEvent] = useState(4);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [meetDetailsExpanded, setMeetDetailsExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Meet details for export
  const [meetName, setMeetName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetCourse, setMeetCourse] = useState("SCY");
  const [meetFacility, setMeetFacility] = useState("");

  // Coach controls state
  const [coachConstraints, setCoachConstraints] = useState<CoachConstraint[]>(
    [],
  );
  const [timeAdjustments, setTimeAdjustments] = useState<TimeAdjustment[]>([]);
  const [unavailableSwimmers, setUnavailableSwimmers] = useState<number[]>([]);
  const [coachNotes, setCoachNotes] = useState("");

  // AI Coach chat
  const [chatOpen, setChatOpen] = useState(false);

  const { data: presets } = useQuery({
    queryKey: ["scoring-presets"],
    queryFn: getScoringPresets,
  });

  const events = useMemo(() => {
    const eventMap = new Map<number, { id: number; name: string }>();
    times.forEach((t) => {
      if (!eventMap.has(t.event_id))
        eventMap.set(t.event_id, { id: t.event_id, name: t.event_name });
    });
    return Array.from(eventMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [times]);

  const swimmers = useMemo(() => {
    const m = new Map<number, string>();
    times.forEach((t) => {
      if (!m.has(t.swimmer_id)) m.set(t.swimmer_id, t.swimmer_name);
    });
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [times]);

  // Non-standard HS events — disabled by default (age-group 25y, college 1000/1650)
  const NON_HS_PATTERNS = /^(25 |1000 |1650 )/;
  const [enabledEvents, setEnabledEvents] = useState<Set<number>>(
    () => new Set(events.filter((e) => !NON_HS_PATTERNS.test(e.name)).map((e) => e.id)),
  );

  const toggleEvent = (id: number) => {
    setEnabledEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const timesMatrix = useMemo(() => {
    const matrix: Record<number, Record<number, SwimmerTimeRow>> = {};
    times.forEach((t) => {
      if (!matrix[t.swimmer_id]) matrix[t.swimmer_id] = {};
      const existing = matrix[t.swimmer_id][t.event_id];
      if (!existing || t.time_seconds < existing.time_seconds)
        matrix[t.swimmer_id][t.event_id] = t;
    });
    return matrix;
  }, [times]);

  const enabledEventList = events.filter((e) => enabledEvents.has(e.id));

  // Loaded opponent teams
  const loadedOpponents = useMemo(
    () => opponentTeams.filter((o) => o.status === "loaded"),
    [opponentTeams],
  );
  const hasOpponents = loadedOpponents.length > 0;

  // Scoring system
  const scoring =
    presets?.[scoringPreset]?.points ||
    [20, 17, 16, 15, 14, 13, 12, 11, 9, 7, 6, 5, 4, 3, 2, 1];

  // Analysis request payload — reflects coach adjustments in real time
  const analysisRequest: AnalysisRequest | null = useMemo(() => {
    if (!hasOpponents) return null;
    const eventList = events.filter((e) => enabledEvents.has(e.id));
    const unavailSet = new Set(unavailableSwimmers);
    const excludedPairs = new Set(
      coachConstraints
        .filter((c) => c.constraint_type === "exclude")
        .map((c) => `${c.swimmer_id}-${c.event_id}`),
    );

    return {
      home_team_name: team.name,
      home_times: times
        .filter(
          (t) =>
            enabledEvents.has(t.event_id) &&
            !unavailSet.has(t.swimmer_id) &&
            !excludedPairs.has(`${t.swimmer_id}-${t.event_id}`),
        )
        .map((t) => {
          // Apply time adjustments (event-specific first, then global)
          const adj =
            timeAdjustments.find(
              (a) =>
                a.swimmer_id === t.swimmer_id && a.event_id === t.event_id,
            ) ??
            timeAdjustments.find(
              (a) =>
                a.swimmer_id === t.swimmer_id && a.event_id === null,
            );
          const secs = adj ? t.time_seconds * adj.multiplier : t.time_seconds;
          return {
            swimmer_id: t.swimmer_id,
            swimmer_name: t.swimmer_name,
            event_id: t.event_id,
            time_seconds: Math.round(secs * 100) / 100,
            time_display: adj ? formatSwimTime(secs) : t.time_display,
          };
        }),
      opponent_times: loadedOpponents.flatMap((ot) =>
        ot.times
          .filter((t) => enabledEvents.has(t.event_id))
          .map((t) => ({
            event_id: t.event_id,
            time_seconds: t.time_seconds,
            team_name: ot.team.name,
            swimmer_name: t.swimmer_name,
          })),
      ),
      events: eventList.map((e) => ({
        event_id: e.id,
        event_name: e.name,
        is_relay: e.name.toLowerCase().includes("relay"),
      })),
      scoring_system: scoring,
    };
  }, [
    team.name,
    times,
    loadedOpponents,
    events,
    enabledEvents,
    scoring,
    hasOpponents,
    unavailableSwimmers,
    timeAdjustments,
    coachConstraints,
  ]);

  // Fetch scouting brief
  const { data: scoutingData, isLoading: scoutingLoading } = useQuery({
    queryKey: ["scouting-brief", analysisRequest],
    queryFn: () => getScoutingBrief(analysisRequest!),
    enabled: !!analysisRequest && hasOpponents,
    staleTime: 60_000,
    retry: 1,
  });

  // Event difficulty badges
  const eventDifficultyMap = useMemo(() => {
    const map = new Map<number, string>();
    if (scoutingData?.analysis) {
      for (const em of scoutingData.analysis.events) {
        map.set(em.event_id, em.difficulty);
      }
    }
    return map;
  }, [scoutingData]);

  // Adjustment count for badge
  const totalMods =
    coachConstraints.length +
    timeAdjustments.length +
    unavailableSwimmers.length;

  // ── Chat context for AI Coach ─────────────────────────────────

  const chatContext: CoachChatContext = useMemo(() => {
    const swimmerCtx = swimmers.map((s) => {
      const swimmerTimes = enabledEventList
        .filter((e) => timesMatrix[s.id]?.[e.id])
        .map((e) => {
          const t = timesMatrix[s.id][e.id];
          return {
            event_id: e.id,
            event_name: e.name,
            time_seconds: t.time_seconds,
            time_display: t.time_display,
          };
        });
      return {
        swimmer_id: s.id,
        swimmer_name: s.name,
        events: swimmerTimes,
      };
    });

    const conditions = timeAdjustments
      .filter((a) => a.event_id === null)
      .map((a) => ({
        swimmer_id: a.swimmer_id,
        condition: a.reason.toLowerCase() || "custom",
        multiplier: a.multiplier,
      }));

    const constraintCtx = coachConstraints.map((c) => ({
      swimmer_id: c.swimmer_id,
      event_id: c.event_id,
      constraint_type: c.constraint_type,
    }));

    const oppSummary = loadedOpponents
      .map((o) => `${o.team.name} (${o.times.length} times)`)
      .join(", ");

    return {
      team_name: team.name,
      gender,
      swimmers: swimmerCtx,
      current_conditions: conditions,
      current_constraints: constraintCtx,
      unavailable: unavailableSwimmers,
      opponent_summary: oppSummary || "No opponents loaded",
      optimizer_result: null,
    };
  }, [swimmers, enabledEventList, timesMatrix, timeAdjustments, coachConstraints, unavailableSwimmers, loadedOpponents, team.name, gender]);

  // ── Handle parameter changes from AI Coach chat ───────────────

  const handleChatParameterChange = (change: ParameterChange) => {
    if (!change.success) return;

    if (change.type === "condition" && change.swimmer_id != null) {
      const multiplier = change.multiplier ?? 1.0;
      const reason = change.condition ?? "";
      setTimeAdjustments((prev) => {
        const filtered = prev.filter(
          (a) => !(a.swimmer_id === change.swimmer_id && a.event_id === null),
        );
        if (Math.abs(multiplier - 1.0) < 0.001) return filtered;
        return [
          ...filtered,
          {
            swimmer_id: change.swimmer_id!,
            event_id: null,
            multiplier,
            reason: reason.charAt(0).toUpperCase() + reason.slice(1),
          },
        ];
      });
    } else if (change.type === "unavailable" && change.swimmer_id != null) {
      if (change.unavailable) {
        setUnavailableSwimmers((prev) =>
          prev.includes(change.swimmer_id!) ? prev : [...prev, change.swimmer_id!],
        );
        setCoachConstraints((prev) =>
          prev.filter((c) => c.swimmer_id !== change.swimmer_id),
        );
        setTimeAdjustments((prev) =>
          prev.filter((a) => a.swimmer_id !== change.swimmer_id),
        );
      } else {
        setUnavailableSwimmers((prev) =>
          prev.filter((id) => id !== change.swimmer_id),
        );
      }
    } else if (change.type === "constraint" && change.swimmer_id != null && change.event_id != null) {
      setCoachConstraints((prev) => {
        const filtered = prev.filter(
          (c) => !(c.swimmer_id === change.swimmer_id && c.event_id === change.event_id),
        );
        if (change.constraint_type === "none") return filtered;
        return [
          ...filtered,
          {
            swimmer_id: change.swimmer_id!,
            event_id: change.event_id!,
            constraint_type: change.constraint_type as "lock" | "exclude",
          },
        ];
      });
    }
  };

  // ── Optimize handler ──────────────────────────────────────────

  const handleOptimize = async () => {
    setRunning(true);
    setError(null);
    try {
      const eventConfigs: EventConfig[] = enabledEventList.map((e) => ({
        event_id: e.id,
        event_name: e.name,
        is_relay: e.name.toLowerCase().includes("relay"),
        max_entries: maxEntriesPerEvent,
      }));
      const swimmerEntries: SwimmerEntry[] = swimmers.map((s) => ({
        swimmer_id: s.id,
        name: s.name,
        gender,
        max_individual_events: maxIndividual,
      }));
      const swimmerTimes: SwimmerTime[] = times
        .filter((t) => enabledEvents.has(t.event_id))
        .map((t) => ({
          swimmer_id: t.swimmer_id,
          event_id: t.event_id,
          time_seconds: t.time_seconds,
          time_display: t.time_display,
        }));
      const opponentTimes: OpponentTime[] = loadedOpponents.flatMap((ot) =>
        ot.times
          .filter((t) => enabledEvents.has(t.event_id))
          .map((t) => ({
            event_id: t.event_id,
            time_seconds: t.time_seconds,
            team_name: ot.team.name,
            swimmer_name: t.swimmer_name,
          })),
      );

      const config: MeetConfig = {
        team_name: team.name,
        events: eventConfigs,
        swimmers: swimmerEntries,
        times: swimmerTimes,
        opponent_times: opponentTimes,
        scoring_system: scoring,
        max_individual_events_default: maxIndividual,
        constraints: coachConstraints.map((c) => ({
          swimmer_id: c.swimmer_id,
          event_id: c.event_id,
          constraint_type: c.constraint_type,
        })),
        time_adjustments: timeAdjustments.map((a) => ({
          swimmer_id: a.swimmer_id,
          event_id: a.event_id,
          multiplier: a.multiplier,
          reason: a.reason,
        })),
        unavailable_swimmers: unavailableSwimmers,
      };
      const result = await runOptimizer(config);
      const details: MeetDetails = {
        meet_name: meetName || `${team.name} Meet`,
        meet_date: meetDate || new Date().toISOString().split("T")[0],
        course: meetCourse,
        facility: meetFacility,
      };
      onOptimize(config, result, details);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setRunning(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Configure Meet
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {team.name} &middot; {gender === "F" ? "Girls" : "Boys"} &middot;{" "}
            {swimmers.length} swimmers &middot; {events.length} events
            {hasOpponents && (
              <span className="text-blue-500">
                {" "}
                &middot; vs. {loadedOpponents.length} opponent{" "}
                {loadedOpponents.length === 1 ? "team" : "teams"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              showGuide
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <HelpCircle size={13} />
            Guide
          </button>
          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      </div>

      {/* ═══ Legend (expandable guide) ═══ */}
      {showGuide && (
        <div className="mb-4">
          <Legend />
        </div>
      )}

      {/* ═══ Event Selection ═══ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] px-4 py-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Events ({enabledEvents.size}/{events.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setEnabledEvents(new Set(events.map((e) => e.id)))
              }
              className="text-[11px] text-blue-600 hover:text-blue-700"
            >
              All
            </button>
            <button
              onClick={() => setEnabledEvents(new Set())}
              className="text-[11px] text-slate-400 hover:text-slate-600"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {events.map((event) => {
            const enabled = enabledEvents.has(event.id);
            const isRelay = event.name.toLowerCase().includes("relay");
            const diff = eventDifficultyMap.get(event.id);
            return (
              <button
                key={event.id}
                onClick={() => toggleEvent(event.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5
                  ${
                    enabled
                      ? isRelay
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-white text-slate-700 border-slate-300 shadow-sm"
                      : "bg-transparent text-slate-400 border-slate-200"
                  }`}
              >
                {isRelay && enabled && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
                )}
                {event.name}
                {diff && enabled && (
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      diff === "dominant"
                        ? "bg-emerald-500"
                        : diff === "competitive"
                          ? "bg-amber-500"
                          : diff === "uphill"
                            ? "bg-red-500"
                            : "bg-slate-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Dashboard: Left Sidebar + Right Content ═══ */}
      <div className="flex gap-5 items-start">
        {/* ── Left Sidebar ── */}
        <div
          className={`flex-shrink-0 transition-all duration-200 ease-in-out ${
            sidebarCollapsed ? "w-12" : "w-[300px]"
          }`}
        >
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)] flex flex-col">
            {/* ─── Collapsed: icon strip ─── */}
            {sidebarCollapsed && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] flex flex-col items-center py-2 gap-1">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="w-6 h-px bg-slate-200 my-1" />
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="relative p-2 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                  title={`Roster (${swimmers.length} swimmers)`}
                >
                  <Users size={16} />
                  {totalMods > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {totalMods}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSidebarCollapsed(false);
                    setSettingsExpanded(true);
                  }}
                  className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-600 transition-colors"
                  title="Settings & Optimize"
                >
                  <Zap size={16} />
                </button>
              </div>
            )}

            {/* ─── Expanded: full controls ─── */}
            {!sidebarCollapsed && (
              <div className="flex flex-col min-h-0">
                {/* Scrollable area */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-4 lg:max-h-[calc(100vh-220px)]">
                  {/* Collapse toggle — thin strip */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                      title="Collapse sidebar"
                    >
                      <ChevronLeft size={14} />
                      <span>Collapse</span>
                    </button>
                  </div>

                  {/* Meet Details — for HyTek/Team Unify export */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
                    <button
                      onClick={() => setMeetDetailsExpanded(!meetDetailsExpanded)}
                      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays size={12} className="text-slate-400" />
                        <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                          Meet Details
                        </h3>
                      </div>
                      {meetDetailsExpanded ? (
                        <ChevronUp size={14} className="text-slate-400" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">
                            {meetName || "for export"}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </div>
                      )}
                    </button>
                    {meetDetailsExpanded && (
                      <div className="px-4 pb-3 pt-2 border-t border-slate-100">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Meet Name
                            </label>
                            <input
                              type="text"
                              value={meetName}
                              onChange={(e) => setMeetName(e.target.value)}
                              placeholder={`${team.name} Dual Meet`}
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={meetDate}
                              onChange={(e) => setMeetDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Course
                            </label>
                            <select
                              value={meetCourse}
                              onChange={(e) => setMeetCourse(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                              <option value="SCY">SCY (25 yards)</option>
                              <option value="SCM">SCM (25 meters)</option>
                              <option value="LCM">LCM (50 meters)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Facility
                            </label>
                            <input
                              type="text"
                              value={meetFacility}
                              onChange={(e) => setMeetFacility(e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-300"
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">
                          Used for SD3 export (HyTek / Team Unify)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Optimizer constraints — always visible */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">
                        Max Events / Swimmer
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            onClick={() => setMaxIndividual(n)}
                            className={`w-8 h-8 rounded-md text-xs font-semibold transition-all ${
                              maxIndividual === n
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">
                        Max Swimmers / Event
                      </label>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4, 0].map((n) => (
                          <button
                            key={n}
                            onClick={() => setMaxEntriesPerEvent(n === 0 ? 99 : n)}
                            className={`h-8 px-2.5 rounded-md text-xs font-semibold transition-all ${
                              (n === 0 ? maxEntriesPerEvent >= 99 : maxEntriesPerEvent === n)
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {n === 0 ? "No limit" : n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      HS default: 2 events per swimmer, 4 swimmers per event
                    </p>
                  </div>

                  {/* Settings & Optimize — single card */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
                    {/* Accordion header */}
                    <button
                      onClick={() => setSettingsExpanded(!settingsExpanded)}
                      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Settings2 size={12} className="text-slate-400" />
                        <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                          Settings
                        </h3>
                      </div>
                      {settingsExpanded ? (
                        <ChevronUp size={14} className="text-slate-400" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">
                            {scoringPreset.replace(/_/g, " ")}
                          </span>
                          <ChevronDown size={14} className="text-slate-400" />
                        </div>
                      )}
                    </button>

                    {/* Settings fields — collapsible */}
                    {settingsExpanded && (
                      <div className="px-4 pb-3 pt-2 border-t border-slate-100">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Scoring
                            </label>
                            <select
                              value={scoringPreset}
                              onChange={(e) =>
                                setScoringPreset(e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                              {presets &&
                                Object.entries(presets).map(
                                  ([key, preset]) => (
                                    <option key={key} value={key}>
                                      {key.replace(/_/g, " ")} (top{" "}
                                      {preset.places})
                                    </option>
                                  ),
                                )}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Coach Controls — Roster */}
                  <CoachControls
                    swimmers={swimmers}
                    events={events}
                    enabledEvents={enabledEvents}
                    timesMatrix={timesMatrix}
                    constraints={coachConstraints}
                    timeAdjustments={timeAdjustments}
                    unavailableSwimmers={unavailableSwimmers}
                    coachNotes={coachNotes}
                    onChange={(
                      constraints,
                      adjustments,
                      unavailable,
                      notes,
                    ) => {
                      setCoachConstraints(constraints);
                      setTimeAdjustments(adjustments);
                      setUnavailableSwimmers(unavailable);
                      setCoachNotes(notes);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Content: Analysis ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Scouting Brief */}
          {hasOpponents && (
            <ScoutingBrief
              narrative={scoutingData?.narrative ?? null}
              aiAvailable={scoutingData?.ai_available ?? false}
              analysis={
                scoutingData?.analysis ?? {
                  home_team: {
                    team_name: team.name,
                    total_projected_points: 0,
                    event_wins: 0,
                    strongest_events: [],
                    weakest_events: [],
                    swimmer_count: swimmers.length,
                    events_entered: 0,
                  },
                  opponents: [],
                  events: [],
                  swing_events: [],
                  point_gap: 0,
                  projected_winner: "",
                  confidence: "toss-up" as const,
                  key_matchups: [],
                }
              }
              isLoading={scoutingLoading}
            />
          )}

          {/* Matchup Board */}
          {hasOpponents && scoutingData?.analysis && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] p-5">
              <MatchupBoard
                analysis={scoutingData.analysis}
                enabledEvents={enabledEvents}
              />
            </div>
          )}

          {/* Swimmer Times — fallback when no opponents */}
          {!hasOpponents && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Swimmer Times
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50/80">
                        Swimmer
                      </th>
                      {enabledEventList.map((e) => (
                        <th
                          key={e.id}
                          className="text-center py-2 px-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {e.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {swimmers.map((swimmer, i) => (
                      <tr
                        key={swimmer.id}
                        className={`border-t border-slate-100 hover:bg-blue-50/40 transition-colors ${
                          i % 2 === 1 ? "bg-slate-50/30" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-medium text-slate-900 sticky left-0 bg-white whitespace-nowrap text-xs">
                          {swimmer.name}
                        </td>
                        {enabledEventList.map((e) => {
                          const time = timesMatrix[swimmer.id]?.[e.id];
                          return (
                            <td
                              key={e.id}
                              className="text-center py-2 px-2 font-[family-name:var(--font-jetbrains)] text-[12px] tabular-nums text-slate-600"
                            >
                              {time ? (
                                time.time_display
                              ) : (
                                <span className="text-slate-200">
                                  &ndash;
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Floating Action Buttons (bottom-right) ═══ */}
      <div
        className={`fixed bottom-6 z-20 flex flex-col items-end gap-3 transition-all duration-300 ${
          chatOpen ? "right-[416px]" : "right-6"
        }`}
      >
        {/* AI Coach Assistant button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shadow-lg transition-all ${
            chatOpen
              ? "bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800 hover:shadow-xl"
              : "bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 hover:shadow-xl"
          }`}
        >
          <Sparkles size={16} />
          {chatOpen ? "Close Assistant" : "AI Coach Assistant"}
        </button>

        {/* Optimize Lineup button */}
        <button
          onClick={handleOptimize}
          disabled={running || enabledEvents.size === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {running ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap size={16} />
              Optimize Lineup
            </>
          )}
        </button>

        {/* Error toast */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 max-w-[240px] shadow-sm">
            {error}
          </div>
        )}
      </div>

      {/* ═══ AI Coach Chat Sidebar ═══ */}
      <AnimatePresence>
        {chatOpen && (
          <CoachChat
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            context={chatContext}
            onParameterChange={handleChatParameterChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
