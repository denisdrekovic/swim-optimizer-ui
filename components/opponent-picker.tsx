"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTeams, fetchTeamTimes } from "@/lib/api";
import {
  Search,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Swords,
} from "lucide-react";
import type { TeamSummary, SwimmerTimeRow, OpponentTeamData } from "@/lib/api";

interface OpponentPickerProps {
  homeTeam: TeamSummary;
  gender: string;
  onContinue: (opponents: OpponentTeamData[]) => void;
  onBack: () => void;
}

export function OpponentPicker({
  homeTeam,
  gender,
  onContinue,
  onBack,
}: OpponentPickerProps) {
  const [search, setSearch] = useState("");
  const [opponents, setOpponents] = useState<OpponentTeamData[]>([]);

  // Pre-seed search with home team's state for convenience
  const smartQuery = search || (homeTeam.state ? homeTeam.state : "");
  const shouldSearch = search.length >= 2;

  const { data: teamsData, isLoading: searchLoading } = useQuery({
    queryKey: ["teams-opponent", search],
    queryFn: () => searchTeams(search),
    enabled: shouldSearch,
  });

  // Filter out home team and already-added opponents from search results
  const addedIds = new Set([homeTeam.id, ...opponents.map((o) => o.team.id)]);
  const filteredResults =
    teamsData?.items.filter((t) => !addedIds.has(t.id)) || [];

  const addOpponent = useCallback(
    async (team: TeamSummary) => {
      // Add immediately with loading status
      const entry: OpponentTeamData = {
        team,
        times: [],
        status: "loading",
      };
      setOpponents((prev) => [...prev, entry]);

      try {
        const result = await fetchTeamTimes(team.id, gender);
        setOpponents((prev) =>
          prev.map((o) =>
            o.team.id === team.id
              ? { ...o, times: result.times, status: "loaded" as const }
              : o
          )
        );
      } catch (e) {
        setOpponents((prev) =>
          prev.map((o) =>
            o.team.id === team.id
              ? {
                  ...o,
                  status: "error" as const,
                  error: e instanceof Error ? e.message : "Failed to load",
                }
              : o
          )
        );
      }
    },
    [gender]
  );

  const removeOpponent = (teamId: number) => {
    setOpponents((prev) => prev.filter((o) => o.team.id !== teamId));
  };

  const anyLoading = opponents.some((o) => o.status === "loading");
  const loadedOpponents = opponents.filter((o) => o.status === "loaded");
  const totalOpponentSwimmers = new Set(
    loadedOpponents.flatMap((o) => o.times.map((t) => t.swimmer_id))
  ).size;
  const totalOpponentTimes = loadedOpponents.reduce(
    (sum, o) => sum + o.times.length,
    0
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Add Opponents
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {homeTeam.name} &middot;{" "}
            {gender === "F" ? "Girls" : "Boys"} &middot; Add teams competing in
            this meet
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </button>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] p-5">
        <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
          Search Opponent Teams
        </h3>
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="School name, state, or both..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        {searchLoading && (
          <div className="py-4 text-center">
            <Loader2
              size={16}
              className="animate-spin mx-auto text-slate-400"
            />
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {filteredResults.map((team) => (
              <button
                key={team.id}
                onClick={() => addOpponent(team)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-sm group"
              >
                <div>
                  <span className="font-medium text-slate-900">
                    {team.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {team.state && (
                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {team.state}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {team.level}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} />
                  <span className="text-xs font-medium">Add</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {search.length >= 2 &&
          teamsData &&
          filteredResults.length === 0 &&
          !searchLoading && (
            <div className="py-4 text-center text-xs text-slate-400">
              No teams found for &ldquo;{search}&rdquo;
            </div>
          )}

        {search.length < 2 && (
          <div className="py-4 text-center text-xs text-slate-400">
            Type at least 2 characters to search
          </div>
        )}
      </div>

      {/* Added opponents */}
      {opponents.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords size={12} className="text-slate-400" />
              <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Opponent Teams ({opponents.length})
              </h3>
            </div>
            {loadedOpponents.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {totalOpponentSwimmers} swimmers &middot;{" "}
                {totalOpponentTimes} times
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {opponents.map((opp) => (
              <div
                key={opp.team.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  {opp.status === "loading" && (
                    <Loader2
                      size={14}
                      className="animate-spin text-blue-500 flex-shrink-0"
                    />
                  )}
                  {opp.status === "loaded" && (
                    <CheckCircle2
                      size={14}
                      className="text-emerald-500 flex-shrink-0"
                    />
                  )}
                  {opp.status === "error" && (
                    <AlertCircle
                      size={14}
                      className="text-red-500 flex-shrink-0"
                    />
                  )}

                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {opp.team.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {opp.status === "loading" && "Loading times..."}
                      {opp.status === "loaded" && (
                        <>
                          {
                            new Set(opp.times.map((t) => t.swimmer_id))
                              .size
                          }{" "}
                          swimmers &middot; {opp.times.length} times
                        </>
                      )}
                      {opp.status === "error" && (
                        <span className="text-red-500">{opp.error}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeOpponent(opp.team.id)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onContinue(opponents.filter((o) => o.status === "loaded" || o.status === "error"))}
          disabled={opponents.length === 0 || opponents.every((o) => o.status === "loading")}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_1px_3px_0_rgb(37_99_235_/_0.3)]"
        >
          {anyLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {loadedOpponents.length > 0 ? (
                <>Continue ({loadedOpponents.length} loaded, {opponents.filter((o) => o.status === "loading").length} still loading)</>
              ) : (
                <>Loading opponent data...</>
              )}
            </>
          ) : (
            <>
              Continue to Configure{" "}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {opponents.length === 0 && (
        <button
          onClick={() => onContinue([])}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          Skip — optimize without opponent data
        </button>
      )}
    </div>
  );
}
