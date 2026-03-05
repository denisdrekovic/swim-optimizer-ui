"use client";

import { useMemo } from "react";
import { ArrowLeft, RotateCcw, Clock, Trophy, Users, Activity } from "lucide-react";
import type { MeetConfig, OptimizerResult } from "@/lib/api";

interface ResultsProps {
  result: OptimizerResult;
  config: MeetConfig;
  onBack: () => void;
  onRestart: () => void;
}

function PlaceBadge({ place }: { place: number }) {
  const styles: Record<number, string> = {
    1: "bg-amber-100 text-amber-800 border-amber-200",
    2: "bg-slate-100 text-slate-600 border-slate-200",
    3: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const style = styles[place] || "bg-white text-slate-500 border-slate-200";

  const suffix = place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th";

  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded text-[11px] font-semibold border ${style}`}>
      {place}{suffix}
    </span>
  );
}

export function Results({ result, config, onBack, onRestart }: ResultsProps) {
  const statusConfig: Record<string, { dot: string; bg: string; text: string }> = {
    optimal: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    feasible: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    infeasible: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  };
  const sc = statusConfig[result.status] || statusConfig.feasible;

  const swimmerStats = useMemo(() => {
    const map = new Map<number, { name: string; events: string[]; points: number }>();
    result.assignments.forEach((a) => {
      if (!map.has(a.swimmer_id)) map.set(a.swimmer_id, { name: a.swimmer_name, events: [], points: 0 });
      const s = map.get(a.swimmer_id)!;
      s.events.push(a.event_name);
      s.points += a.expected_points;
    });
    return Array.from(map.values()).sort((a, b) => b.points - a.points);
  }, [result.assignments]);

  const maxSwimmerPts = swimmerStats.length > 0 ? swimmerStats[0].points : 1;

  const filledEvents = result.events_summary.filter((es) => es.entries.length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Optimal Lineup</h2>
          <p className="text-xs text-slate-400 mt-0.5">{config.team_name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> Reconfigure
          </button>
          <button onClick={onRestart} className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors">
            <RotateCcw size={12} /> New Team
          </button>
        </div>
      </div>

      {/* Score hero */}
      <div className="bg-white rounded-lg border border-slate-200 border-t-2 border-t-emerald-500 shadow-[0_4px_12px_0_rgb(0_0_0_/_0.05)] p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={12} className="text-emerald-600" />
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Projected</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600 tracking-tight">{result.total_projected_points}</div>
            <div className="text-[11px] text-slate-400">points</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Assignments</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{result.assignments.length}</div>
            <div className="text-[11px] text-slate-400">across {filledEvents.length} events</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Activity size={12} className="text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Status</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {result.status}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-slate-400" />
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Solve Time</span>
            </div>
            <div className="text-3xl font-bold text-slate-400 tracking-tight">
              {result.solve_time_ms < 1000 ? `${Math.round(result.solve_time_ms)}` : `${(result.solve_time_ms / 1000).toFixed(1)}k`}
            </div>
            <div className="text-[11px] text-slate-400">ms</div>
          </div>
        </div>
      </div>

      {/* Event breakdown — grouped table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Event Breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Event</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Swimmer</th>
              <th className="text-center py-2 px-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Time</th>
              <th className="text-center py-2 px-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Place</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody>
            {filledEvents.map((es) => (
              <>
                {/* Event group header */}
                <tr key={`header-${es.event_id}`} className="bg-slate-50/50 border-t border-slate-200">
                  <td colSpan={4} className="py-2 px-4 text-xs font-semibold text-slate-900">{es.event_name}</td>
                  <td className="py-2 px-4 text-right text-xs font-semibold text-emerald-600">{es.total_event_points} pts</td>
                </tr>
                {/* Entries */}
                {es.entries.map((a) => (
                  <tr key={`${a.swimmer_id}-${a.event_id}`} className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4 text-sm text-slate-900 font-medium">{a.swimmer_name}</td>
                    <td className="py-2 px-3 text-center font-[family-name:var(--font-jetbrains)] text-[12px] tabular-nums text-slate-600">
                      {a.expected_time_display}
                    </td>
                    <td className="py-2 px-3 text-center"><PlaceBadge place={a.expected_place} /></td>
                    <td className="py-2 px-4 text-right text-sm font-semibold text-slate-900">{a.expected_points}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Swimmer summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Swimmer Contributions</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Swimmer</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">Events</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider w-24">Points</th>
              <th className="py-2 px-4 w-32" />
            </tr>
          </thead>
          <tbody>
            {swimmerStats.map((s) => (
              <tr key={s.name} className="border-t border-slate-100">
                <td className="py-2 px-4 font-medium text-slate-900">{s.name}</td>
                <td className="py-2 px-4 text-xs text-slate-500">{s.events.join(", ")}</td>
                <td className="py-2 px-4 text-right font-semibold text-emerald-600">{s.points}</td>
                <td className="py-2 px-4">
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(s.points / maxSwimmerPts) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unassigned */}
      {result.unassigned_swimmers.length > 0 && (
        <details className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)]">
          <summary className="px-5 py-3 text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700">
            {result.unassigned_swimmers.length} unassigned swimmers
          </summary>
          <div className="px-5 pb-3 text-xs text-slate-400">
            {result.unassigned_swimmers.join(", ")}
          </div>
        </details>
      )}
    </div>
  );
}
