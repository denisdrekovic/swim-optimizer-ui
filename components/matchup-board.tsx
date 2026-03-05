"use client";

import { useMemo } from "react";
import { Swords, Zap } from "lucide-react";
import type { MatchupAnalysis, EventMatchup, SwimmerMatchup } from "@/lib/api";

interface MatchupBoardProps {
  analysis: MatchupAnalysis;
  enabledEvents?: Set<number>;
}

const DIFFICULTY_CONFIG = {
  dominant: {
    label: "Dominant",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    barColor: "bg-emerald-500",
  },
  competitive: {
    label: "Competitive",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    barColor: "bg-amber-500",
  },
  uphill: {
    label: "Uphill",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    barColor: "bg-red-500",
  },
  no_entries: {
    label: "No Entries",
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    dot: "bg-slate-400",
    barColor: "bg-slate-300",
  },
} as const;

function PlaceBadge({ place }: { place: number }) {
  const styles: Record<number, string> = {
    1: "bg-amber-100 text-amber-800 border-amber-200",
    2: "bg-slate-100 text-slate-600 border-slate-200",
    3: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const style = styles[place] || "bg-white text-slate-500 border-slate-200";
  const suffix =
    place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th";

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[24px] h-5 px-1 rounded text-[10px] font-semibold border ${style}`}
    >
      {place}
      {suffix}
    </span>
  );
}

function PointBar({
  homePoints,
  opponentPoints,
  maxPoints,
}: {
  homePoints: number;
  opponentPoints: number;
  maxPoints: number;
}) {
  const total = homePoints + opponentPoints;
  if (total === 0) return null;
  const homePct = (homePoints / total) * 100;
  const oppPct = (opponentPoints / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold text-blue-600 w-6 text-right tabular-nums">
        {homePoints}
      </span>
      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-100">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-slate-400 transition-all duration-300"
          style={{ width: `${oppPct}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-slate-500 w-6 tabular-nums">
        {opponentPoints}
      </span>
    </div>
  );
}

function SwimmerRow({ swimmer, isSwing }: { swimmer: SwimmerMatchup; isSwing: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
        swimmer.is_home_team
          ? "bg-blue-50/60"
          : "bg-white"
      }`}
    >
      <PlaceBadge place={swimmer.projected_place} />
      <div className="flex-1 min-w-0">
        <span
          className={`font-medium truncate block ${
            swimmer.is_home_team ? "text-blue-900" : "text-slate-700"
          }`}
        >
          {swimmer.swimmer_name}
        </span>
        {!swimmer.is_home_team && (
          <span className="text-[10px] text-slate-400 truncate block">
            {swimmer.team_name}
          </span>
        )}
      </div>
      <span className="font-[family-name:var(--font-jetbrains)] text-[11px] tabular-nums text-slate-600 flex-shrink-0">
        {swimmer.time_display}
      </span>
      {swimmer.projected_points > 0 && (
        <span
          className={`text-[10px] font-semibold flex-shrink-0 w-8 text-right ${
            swimmer.is_home_team ? "text-blue-600" : "text-slate-400"
          }`}
        >
          +{swimmer.projected_points}
        </span>
      )}
      {isSwing && (
        <Zap size={10} className="text-amber-500 flex-shrink-0" />
      )}
    </div>
  );
}

function EventCard({
  event,
  isSwingEvent,
  homeTeamName,
}: {
  event: EventMatchup;
  isSwingEvent: boolean;
  homeTeamName: string;
}) {
  const dc = DIFFICULTY_CONFIG[event.difficulty];
  const totalOppPts = Object.values(event.opponent_projected_points).reduce(
    (a, b) => a + b,
    0
  );
  const maxPts = Math.max(
    event.home_projected_points + totalOppPts,
    event.max_possible_home_points,
    1
  );

  // Identify swimmers in close matchups for swing indicators
  const closeSwimmers = useMemo(() => {
    const set = new Set<string>();
    if (event.swing_potential > 0.2) {
      for (const h of event.home_entries) {
        for (const o of event.opponent_entries) {
          const gap =
            Math.abs(h.time_seconds - o.time_seconds) /
            Math.min(h.time_seconds, o.time_seconds);
          if (gap < 0.03) {
            set.add(h.swimmer_name);
            set.add(o.swimmer_name);
          }
        }
      }
    }
    return set;
  }, [event]);

  if (event.difficulty === "no_entries") return null;

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        isSwingEvent
          ? "border-amber-200 shadow-[0_0_0_1px_rgb(251_191_36_/_0.1)]"
          : "border-slate-200"
      }`}
    >
      {/* Card header */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {event.is_relay && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
          )}
          <h4 className="text-sm font-semibold text-slate-900">
            {event.event_name}
          </h4>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${dc.bg} ${dc.text} border ${dc.border}`}
          >
            <span className={`w-1 h-1 rounded-full ${dc.dot}`} />
            {dc.label}
          </span>
          {isSwingEvent && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Zap size={8} />
              Swing
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">
          {event.combined_ranked.length} swimmers
        </div>
      </div>

      {/* Ranked swimmer list */}
      <div className="divide-y divide-slate-100">
        {event.combined_ranked.map((swimmer, i) => (
          <SwimmerRow
            key={`${swimmer.swimmer_name}-${swimmer.team_name}-${i}`}
            swimmer={swimmer}
            isSwing={closeSwimmers.has(swimmer.swimmer_name)}
          />
        ))}
      </div>

      {/* Point summary bar */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100">
        <PointBar
          homePoints={event.home_projected_points}
          opponentPoints={totalOppPts}
          maxPoints={maxPts}
        />
      </div>
    </div>
  );
}

export function MatchupBoard({ analysis, enabledEvents }: MatchupBoardProps) {
  const filteredEvents = useMemo(() => {
    if (!enabledEvents) return analysis.events;
    return analysis.events.filter((e) => enabledEvents.has(e.event_id));
  }, [analysis.events, enabledEvents]);

  const swingSet = useMemo(
    () => new Set(analysis.swing_events),
    [analysis.swing_events]
  );

  // Counts
  const dominantCount = filteredEvents.filter(
    (e) => e.difficulty === "dominant"
  ).length;
  const competitiveCount = filteredEvents.filter(
    (e) => e.difficulty === "competitive"
  ).length;
  const uphillCount = filteredEvents.filter(
    (e) => e.difficulty === "uphill"
  ).length;
  const activeEvents = filteredEvents.filter(
    (e) => e.difficulty !== "no_entries"
  );

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-slate-400" />
          <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Event Matchups
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {dominantCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500">
                {dominantCount} dominant
              </span>
            </span>
          )}
          {competitiveCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-slate-500">
                {competitiveCount} competitive
              </span>
            </span>
          )}
          {uphillCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-slate-500">
                {uphillCount} uphill
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Event cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeEvents.map((event) => (
          <EventCard
            key={event.event_id}
            event={event}
            isSwingEvent={swingSet.has(event.event_name)}
            homeTeamName={analysis.home_team.team_name}
          />
        ))}
      </div>

      {activeEvents.length === 0 && (
        <div className="py-8 text-center text-xs text-slate-400">
          No events with entries to analyze
        </div>
      )}
    </div>
  );
}
