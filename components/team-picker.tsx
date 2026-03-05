"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTeams, fetchTeamTimes } from "@/lib/api";
import { Search, ChevronRight, Users, Loader2, MapPin, X } from "lucide-react";
import type { TeamSummary, SwimmerTimeRow } from "@/lib/api";

// ── State detection (mirrors backend logic for instant UI feedback) ────

const STATE_NAME_TO_ABBREV: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN",
  texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

const ABBREV_TO_NAME: Record<string, string> = {};
for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBREV)) {
  ABBREV_TO_NAME[abbr] = name.replace(/\b\w/g, (c) => c.toUpperCase());
}
const ALL_ABBREVS = new Set(Object.values(STATE_NAME_TO_ABBREV));

function detectState(q: string): { search: string; state: string | null; stateName: string | null } {
  q = q.trim();
  if (!q) return { search: "", state: null, stateName: null };

  const lower = q.toLowerCase();

  // Try two-word state names at end
  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBREV)) {
    if (name.includes(" ") && lower.endsWith(name)) {
      const searchPart = q.slice(0, q.length - name.length).trim();
      return { search: searchPart, state: abbr, stateName: ABBREV_TO_NAME[abbr] };
    }
  }

  // Try single-word state name or abbreviation at end
  const tokens = q.split(/\s+/);
  const last = tokens[tokens.length - 1].toLowerCase();

  if (STATE_NAME_TO_ABBREV[last]) {
    const abbr = STATE_NAME_TO_ABBREV[last];
    return { search: tokens.slice(0, -1).join(" "), state: abbr, stateName: ABBREV_TO_NAME[abbr] };
  }

  if (last.length === 2 && ALL_ABBREVS.has(last.toUpperCase())) {
    const abbr = last.toUpperCase();
    return { search: tokens.slice(0, -1).join(" "), state: abbr, stateName: ABBREV_TO_NAME[abbr] };
  }

  return { search: q, state: null, stateName: null };
}

// ── Highlight matching text in team name ────────────────────────────

function HighlightName({ name, query }: { name: string; query: string }) {
  if (!query) return <>{name}</>;

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{name}</>;

  // Find all character positions that match any token
  const matched = new Array(name.length).fill(false);
  const nameLower = name.toLowerCase();

  for (const token of tokens) {
    let idx = 0;
    while (idx < nameLower.length) {
      const pos = nameLower.indexOf(token, idx);
      if (pos === -1) break;
      for (let i = pos; i < pos + token.length; i++) matched[i] = true;
      idx = pos + 1;
    }
  }

  // Build segments
  const segments: { text: string; highlight: boolean }[] = [];
  let current = { text: name[0], highlight: matched[0] };

  for (let i = 1; i < name.length; i++) {
    if (matched[i] === current.highlight) {
      current.text += name[i];
    } else {
      segments.push(current);
      current = { text: name[i], highlight: matched[i] };
    }
  }
  segments.push(current);

  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark key={i} className="bg-blue-100 text-blue-900 rounded-sm px-0">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

// ── Component ────────────────────────────────────────────────────────

interface TeamPickerProps {
  onSelect: (team: TeamSummary, gender: string, times: SwimmerTimeRow[]) => void;
}

export function TeamPicker({ onSelect }: TeamPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null);
  const [gender, setGender] = useState("F");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse the query for state detection (instant UI feedback)
  const parsed = useMemo(() => detectState(query), [query]);

  // The actual search text (without the state part) — used for highlighting
  const searchText = parsed.search || "";

  // Minimum chars to trigger search: 2 chars in the search part, or a state-only query
  const shouldSearch = query.trim().length >= 2;

  const { data: teamsData, isLoading: searchLoading } = useQuery({
    queryKey: ["teams", query],
    queryFn: () => searchTeams(query),
    enabled: shouldSearch,
  });

  const handleLoadTimes = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeamTimes(selectedTeam.id, gender);
      if (result.times.length === 0) {
        setError("No times found for this team/gender combination.");
        return;
      }
      onSelect(selectedTeam, gender, result.times);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load times");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Search card — main entry point */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_12px_0_rgb(0_0_0_/_0.05)] p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Find your team
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          Search by school name, state, or both &mdash; e.g. &ldquo;Camden Hills Maine&rdquo;
        </p>

        {/* Single smart search input */}
        <div className="relative mb-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="School name, city, or state..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedTeam(null); // Reset selection on new search
            }}
            autoFocus
            className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedTeam(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Detected state chip — inline feedback */}
        {parsed.state && query.trim().length >= 2 && (
          <div className="flex items-center gap-1.5 mb-3 mt-2">
            <MapPin size={12} className="text-blue-500" />
            <span className="text-xs text-slate-500">
              Filtering by{" "}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium text-[11px]">
                {parsed.stateName} ({parsed.state})
              </span>
            </span>
          </div>
        )}

        {/* Results */}
        {searchLoading && (
          <div className="py-8 text-center">
            <Loader2
              size={18}
              className="animate-spin mx-auto text-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">Searching teams...</p>
          </div>
        )}

        {teamsData && teamsData.items.length > 0 && !searchLoading && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto mt-3">
            {teamsData.items.map((team) => {
              const isSelected = selectedTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all text-sm
                    ${
                      isSelected
                        ? "bg-blue-50 border-l-[3px] border-l-blue-500"
                        : "hover:bg-slate-50 border-l-[3px] border-l-transparent"
                    }
                  `}
                >
                  <div className="min-w-0">
                    <span
                      className={`font-medium ${isSelected ? "text-blue-900" : "text-slate-900"}`}
                    >
                      <HighlightName name={team.name} query={searchText} />
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {team.state && (
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {team.state}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {team.level}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {shouldSearch &&
          teamsData &&
          teamsData.items.length === 0 &&
          !searchLoading && (
            <div className="py-8 text-center">
              <div className="text-sm text-slate-500">
                No teams found for &ldquo;{query}&rdquo;
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Try a different spelling or just the school name
              </p>
            </div>
          )}

        {!shouldSearch && !selectedTeam && (
          <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <Search size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              Type at least 2 characters to search
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              {["Camden Hills Maine", "Brunswick ME", "Bangor"].map(
                (example) => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {example}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Configure & load — appears after selection */}
      {selectedTeam && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_12px_0_rgb(0_0_0_/_0.05)] p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {selectedTeam.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {selectedTeam.state && (
                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {selectedTeam.state}
                  </span>
                )}
                <span className="text-xs text-slate-400">High School</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-md">
              <Users size={12} />
              Roster
            </div>
          </div>

          {/* Gender segmented control */}
          <div className="mb-5">
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              Team
            </label>
            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
              {[
                { value: "F", label: "Girls" },
                { value: "M", label: "Boys" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`px-5 py-2 text-sm font-medium rounded-md transition-all
                    ${
                      gender === opt.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleLoadTimes}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_1px_3px_0_rgb(37_99_235_/_0.3)]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading roster &amp; times...
              </>
            ) : (
              <>
                Get Started
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
