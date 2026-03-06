"use client";

import {
  Sparkles,
  BarChart3,
  Target,
  Zap,
  AlertTriangle,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import type { MatchupAnalysis } from "@/lib/api";

interface ScoutingBriefProps {
  narrative: string | null;
  aiAvailable: boolean;
  analysis: MatchupAnalysis;
  isLoading: boolean;
}

function ConfidenceBadge({
  confidence,
  winner,
  isHome,
}: {
  confidence: string;
  winner: string;
  isHome: boolean;
}) {
  const config = {
    strong: {
      bg: isHome ? "bg-emerald-50" : "bg-red-50",
      text: isHome ? "text-emerald-700" : "text-red-700",
      border: isHome ? "border-emerald-200" : "border-red-200",
      icon: isHome ? TrendingUp : TrendingDown,
    },
    moderate: {
      bg: isHome ? "bg-blue-50" : "bg-amber-50",
      text: isHome ? "text-blue-700" : "text-amber-700",
      border: isHome ? "border-blue-200" : "border-amber-200",
      icon: isHome ? TrendingUp : AlertTriangle,
    },
    "toss-up": {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: Minus,
    },
  };

  const c = config[confidence as keyof typeof config] || config["toss-up"];
  const Icon = c.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <Icon size={12} />
      {confidence === "toss-up"
        ? "Toss-up"
        : isHome
        ? `${winner} favored (${confidence})`
        : `${winner} favored (${confidence})`}
    </div>
  );
}

function ComputedSummary({ analysis }: { analysis: MatchupAnalysis }) {
  const homeTeam = analysis.home_team;
  const topOpponent = analysis.opponents[0];
  const isHomeWinning =
    analysis.projected_winner === homeTeam.team_name;

  return (
    <div className="space-y-3">
      {/* Overall assessment */}
      <div className="flex items-start gap-3">
        <Trophy size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">
            {homeTeam.team_name}
          </span>{" "}
          is projected{" "}
          <span
            className={`font-semibold ${
              isHomeWinning ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {homeTeam.total_projected_points} pts
          </span>
          {topOpponent && (
            <>
              {" "}
              vs{" "}
              <span className="font-semibold text-slate-900">
                {topOpponent.team_name}
              </span>{" "}
              at{" "}
              <span className="font-semibold">
                {topOpponent.total_projected_points} pts
              </span>
            </>
          )}
          {". "}
          {analysis.point_gap > 0 ? (
            <span className="text-emerald-600">
              Leading by {analysis.point_gap} points.
            </span>
          ) : analysis.point_gap < 0 ? (
            <span className="text-red-600">
              Trailing by {Math.abs(analysis.point_gap)} points.
            </span>
          ) : (
            <span className="text-amber-600">Dead even.</span>
          )}
        </div>
      </div>

      {/* Strongest events */}
      {homeTeam.strongest_events.length > 0 && (
        <div className="flex items-start gap-3">
          <TrendingUp
            size={14}
            className="text-emerald-500 mt-0.5 flex-shrink-0"
          />
          <div className="text-sm text-slate-700">
            <span className="font-medium">Strongest events:</span>{" "}
            {homeTeam.strongest_events.join(", ")}
          </div>
        </div>
      )}

      {/* Swing events */}
      {analysis.swing_events.length > 0 && (
        <div className="flex items-start gap-3">
          <Zap
            size={14}
            className="text-amber-500 mt-0.5 flex-shrink-0"
          />
          <div className="text-sm text-slate-700">
            <span className="font-medium">Swing events:</span>{" "}
            {analysis.swing_events.join(", ")} &mdash; lineup changes here
            could shift the outcome.
          </div>
        </div>
      )}

      {/* Key matchups */}
      {analysis.key_matchups.length > 0 && (
        <div className="flex items-start gap-3">
          <Target
            size={14}
            className="text-blue-500 mt-0.5 flex-shrink-0"
          />
          <div className="text-sm text-slate-700">
            <span className="font-medium">
              {analysis.key_matchups.length} key head-to-head
              {analysis.key_matchups.length > 1 ? "s" : ""}:
            </span>
            <div className="mt-1.5 space-y-1">
              {analysis.key_matchups.slice(0, 4).map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`font-medium ${
                      m.home_wins ? "text-emerald-600" : "text-slate-700"
                    }`}
                  >
                    {m.home_swimmer}
                  </span>
                  <span className="text-slate-300">vs</span>
                  <span
                    className={`font-medium ${
                      !m.home_wins ? "text-red-600" : "text-slate-700"
                    }`}
                  >
                    {m.opponent_swimmer}
                  </span>
                  <span className="text-slate-400">
                    in {m.event_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({m.time_gap_seconds > 0 ? `${m.time_gap_seconds.toFixed(2)}s` : "tied"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScoutingBrief({
  narrative,
  aiAvailable,
  analysis,
  isLoading,
}: ScoutingBriefProps) {
  const isHomeWinning =
    analysis.projected_winner === analysis.home_team.team_name;

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-slate-400" />
          </div>
          <div>
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-50 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-[90%]" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-[75%]" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-[85%]" />
        </div>
      </div>
    );
  }

  // AI narrative available
  if (aiAvailable && narrative) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04),_0_0_0_1px_rgb(59_130_246_/_0.05)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-blue-100 bg-blue-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                AI Scouting Brief
              </h3>
              <p className="text-[10px] text-slate-400">
                Generated from matchup analysis
              </p>
            </div>
          </div>
          <ConfidenceBadge
            confidence={analysis.confidence}
            winner={analysis.projected_winner}
            isHome={isHomeWinning}
          />
        </div>

        {/* Score summary */}
        <div className="px-5 py-3 border-b border-blue-100/60 bg-blue-50/20">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {analysis.home_team.team_name}
              </div>
              <div
                className={`text-2xl font-bold tracking-tight ${
                  isHomeWinning ? "text-emerald-600" : "text-slate-900"
                }`}
              >
                {analysis.home_team.total_projected_points}
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium">vs</div>
            {analysis.opponents.map((opp) => (
              <div key={opp.team_name}>
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  {opp.team_name}
                </div>
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    analysis.projected_winner === opp.team_name
                      ? "text-red-600"
                      : "text-slate-900"
                  }`}
                >
                  {opp.total_projected_points}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual summary bullets (concise) */}
        <div className="px-5 py-4">
          <ComputedSummary analysis={analysis} />
        </div>
      </div>
    );
  }

  // Fallback: computed summary (no AI key)
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
            <BarChart3 size={14} className="text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Matchup Summary
            </h3>
            <p className="text-[10px] text-slate-400">
              Computed from swimmer times
            </p>
          </div>
        </div>
        <ConfidenceBadge
          confidence={analysis.confidence}
          winner={analysis.projected_winner}
          isHome={isHomeWinning}
        />
      </div>

      {/* Score summary */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {analysis.home_team.team_name}
            </div>
            <div
              className={`text-2xl font-bold tracking-tight ${
                isHomeWinning ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {analysis.home_team.total_projected_points}
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium">vs</div>
          {analysis.opponents.map((opp) => (
            <div key={opp.team_name}>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {opp.team_name}
              </div>
              <div
                className={`text-2xl font-bold tracking-tight ${
                  analysis.projected_winner === opp.team_name
                    ? "text-red-600"
                    : "text-slate-900"
                }`}
              >
                {opp.total_projected_points}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Computed bullets */}
      <div className="px-5 py-4">
        <ComputedSummary analysis={analysis} />
      </div>
    </div>
  );
}
