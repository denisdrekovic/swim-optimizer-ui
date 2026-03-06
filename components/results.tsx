"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import {
  ArrowLeft,
  RotateCcw,
  Clock,
  Trophy,
  Users,
  Activity,
  Download,
  Copy,
  Printer,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { exportSd3 } from "@/lib/api";
import type { MeetConfig, MeetDetails, OptimizerResult } from "@/lib/api";

interface ResultsProps {
  result: OptimizerResult;
  config: MeetConfig;
  meetDetails: MeetDetails | null;
  gender: string;
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
  const suffix =
    place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th";

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded text-[11px] font-semibold border ${style}`}
    >
      {place}
      {suffix}
    </span>
  );
}

export function Results({
  result,
  config,
  meetDetails,
  gender,
  onBack,
  onRestart,
}: ResultsProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [sd3Loading, setSd3Loading] = useState(false);
  const [sd3Error, setSd3Error] = useState<string | null>(null);

  // Sort state for Event Breakdown table
  type SortKey = "event" | "swimmer" | "time" | "place" | "points";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("event");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  const statusConfig: Record<
    string,
    { dot: string; bg: string; text: string }
  > = {
    optimal: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
    },
    feasible: {
      dot: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    infeasible: {
      dot: "bg-red-500",
      bg: "bg-red-50",
      text: "text-red-700",
    },
  };
  const sc = statusConfig[result.status] || statusConfig.feasible;

  const swimmerStats = useMemo(() => {
    const map = new Map<
      number,
      { name: string; events: string[]; points: number }
    >();
    result.assignments.forEach((a) => {
      if (!map.has(a.swimmer_id))
        map.set(a.swimmer_id, { name: a.swimmer_name, events: [], points: 0 });
      const s = map.get(a.swimmer_id)!;
      s.events.push(a.event_name);
      s.points += a.expected_points;
    });
    return Array.from(map.values()).sort((a, b) => b.points - a.points);
  }, [result.assignments]);

  const maxSwimmerPts =
    swimmerStats.length > 0 ? swimmerStats[0].points : 1;

  const filledEvents = result.events_summary.filter(
    (es) => es.entries.length > 0
  );

  // ── Flat sorted assignments for table view ────────────────────
  const flatAssignments = useMemo(() => {
    const rows = result.assignments.slice();
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "event":
        rows.sort((a, b) => dir * a.event_name.localeCompare(b.event_name));
        break;
      case "swimmer":
        rows.sort((a, b) => dir * a.swimmer_name.localeCompare(b.swimmer_name));
        break;
      case "time":
        rows.sort((a, b) => dir * (a.expected_time - b.expected_time));
        break;
      case "place":
        rows.sort((a, b) => dir * (a.expected_place - b.expected_place));
        break;
      case "points":
        rows.sort((a, b) => dir * (a.expected_points - b.expected_points));
        break;
    }
    return rows;
  }, [result.assignments, sortKey, sortDir]);

  const isGroupedByEvent = sortKey === "event";

  // ── Build plain-text entry list for copy ──────────────────────
  const entryListText = useMemo(() => {
    const lines: string[] = [];
    const genderLabel = gender === "F" ? "Girls" : "Boys";
    lines.push(`${config.team_name} — ${genderLabel}`);
    if (meetDetails) {
      const parts = [meetDetails.meet_name, meetDetails.meet_date, meetDetails.course].filter(Boolean);
      if (parts.length) lines.push(`Meet: ${parts.join(" | ")}`);
    }
    lines.push("");

    for (const es of filledEvents) {
      lines.push(`${es.event_name}`);
      for (const a of es.entries) {
        const name = a.swimmer_name.padEnd(24);
        lines.push(`  ${name} ${a.expected_time_display}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }, [config.team_name, gender, meetDetails, filledEvents]);

  // ── Export handlers ───────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(entryListText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [entryListText]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleSd3 = useCallback(async () => {
    if (!meetDetails) return;
    setSd3Loading(true);
    setSd3Error(null);
    try {
      await exportSd3(
        meetDetails,
        config.team_name,
        gender,
        result.assignments.map((a) => ({
          swimmer_name: a.swimmer_name,
          event_name: a.event_name,
          time_seconds: a.expected_time,
          time_display: a.expected_time_display,
        }))
      );
    } catch (e) {
      setSd3Error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setSd3Loading(false);
    }
  }, [meetDetails, config.team_name, gender, result.assignments]);

  return (
    <>
      {/* Print-only stylesheet */}
      <style jsx global>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Optimal Lineup
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {config.team_name}
              {meetDetails?.meet_name && (
                <span> &middot; {meetDetails.meet_name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={12} /> Reconfigure
            </button>
            <button
              onClick={onRestart}
              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors"
            >
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
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Projected
                </span>
              </div>
              <div className="text-3xl font-bold text-emerald-600 tracking-tight">
                {result.total_projected_points}
              </div>
              <div className="text-[11px] text-slate-400">points</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Assignments
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {result.assignments.length}
              </div>
              <div className="text-[11px] text-slate-400">
                across {filledEvents.length} events
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={12} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {result.status}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Solve Time
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-400 tracking-tight">
                {result.solve_time_ms < 1000
                  ? `${Math.round(result.solve_time_ms)}`
                  : `${(result.solve_time_ms / 1000).toFixed(1)}k`}
              </div>
              <div className="text-[11px] text-slate-400">ms</div>
            </div>
          </div>
        </div>

        {/* ═══ Export toolbar ═══ */}
        <div className="flex items-center gap-2 no-print">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-1">
            Export
          </span>
          <button
            onClick={handleSd3}
            disabled={sd3Loading || !meetDetails}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={!meetDetails ? "Fill in Meet Details on Strategy page first" : "Download SD3 file for HyTek / Team Unify"}
          >
            <Download size={12} />
            {sd3Loading ? "Exporting..." : "SD3 File"}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            {copySuccess ? (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy Entry List
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Printer size={12} />
            Print
          </button>
          {sd3Error && (
            <span className="text-[11px] text-red-600 ml-2">{sd3Error}</span>
          )}
          {!meetDetails && (
            <span className="text-[10px] text-slate-400 ml-1">
              Set Meet Details on Strategy page for SD3 export
            </span>
          )}
        </div>

        {/* Event breakdown — sortable table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Event Breakdown
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {(
                  [
                    { key: "event" as SortKey, label: "Event", align: "text-left" },
                    { key: "swimmer" as SortKey, label: "Swimmer", align: "text-left" },
                    { key: "time" as SortKey, label: "Time", align: "text-center" },
                    { key: "place" as SortKey, label: "Place", align: "text-center" },
                    { key: "points" as SortKey, label: "Points", align: "text-right" },
                  ] as const
                ).map((col) => {
                  const active = sortKey === col.key;
                  const SortIcon = active
                    ? sortDir === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                  return (
                    <th
                      key={col.key}
                      className={`py-2 ${col.key === "time" || col.key === "place" ? "px-3" : "px-4"} text-[10px] font-medium uppercase tracking-wider ${col.align} cursor-pointer select-none group hover:bg-slate-100/60 transition-colors ${
                        active ? "text-blue-600" : "text-slate-500"
                      }`}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <SortIcon
                          size={10}
                          className={`transition-colors ${
                            active
                              ? "text-blue-600"
                              : "text-slate-300 group-hover:text-slate-400"
                          }`}
                        />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isGroupedByEvent ? (
                /* Grouped by event — show event group headers */
                filledEvents.map((es) => (
                  <Fragment key={es.event_id}>
                    <tr className="bg-slate-50/50 border-t border-slate-200">
                      <td
                        colSpan={4}
                        className="py-2 px-4 text-xs font-semibold text-slate-900"
                      >
                        {es.event_name}
                      </td>
                      <td className="py-2 px-4 text-right text-xs font-semibold text-emerald-600">
                        {es.total_event_points} pts
                      </td>
                    </tr>
                    {(sortDir === "asc" ? es.entries : [...es.entries].reverse()).map((a) => (
                      <tr
                        key={`${a.swimmer_id}-${a.event_id}`}
                        className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="py-2 px-4" />
                        <td className="py-2 px-4 text-sm text-slate-900 font-medium">
                          {a.swimmer_name}
                        </td>
                        <td className="py-2 px-3 text-center font-[family-name:var(--font-jetbrains)] text-[12px] tabular-nums text-slate-600">
                          {a.expected_time_display}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <PlaceBadge place={a.expected_place} />
                        </td>
                        <td className="py-2 px-4 text-right text-sm font-semibold text-slate-900">
                          {a.expected_points}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              ) : (
                /* Flat sorted view */
                flatAssignments.map((a) => (
                  <tr
                    key={`${a.swimmer_id}-${a.event_id}`}
                    className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-2 px-4 text-sm text-slate-700">
                      {a.event_name}
                    </td>
                    <td className="py-2 px-4 text-sm text-slate-900 font-medium">
                      {a.swimmer_name}
                    </td>
                    <td className="py-2 px-3 text-center font-[family-name:var(--font-jetbrains)] text-[12px] tabular-nums text-slate-600">
                      {a.expected_time_display}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <PlaceBadge place={a.expected_place} />
                    </td>
                    <td className="py-2 px-4 text-right text-sm font-semibold text-slate-900">
                      {a.expected_points}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Swimmer summary */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Swimmer Contributions
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Swimmer
                </th>
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider w-24">
                  Points
                </th>
                <th className="py-2 px-4 w-32" />
              </tr>
            </thead>
            <tbody>
              {swimmerStats.map((s) => (
                <tr key={s.name} className="border-t border-slate-100">
                  <td className="py-2 px-4 font-medium text-slate-900">
                    {s.name}
                  </td>
                  <td className="py-2 px-4 text-xs text-slate-500">
                    {s.events.join(", ")}
                  </td>
                  <td className="py-2 px-4 text-right font-semibold text-emerald-600">
                    {s.points}
                  </td>
                  <td className="py-2 px-4">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(s.points / maxSwimmerPts) * 100}%`,
                        }}
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
    </>
  );
}
