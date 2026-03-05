/**
 * API client — talks to the FastAPI backend on localhost:8000
 */

const API_BASE = "http://localhost:8000/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types matching the Python Pydantic models ────────────────────

export interface TeamSummary {
  id: number;
  swimcloud_id: number;
  name: string;
  level: string;
  state: string | null;
}

export interface SwimmerSummary {
  id: number;
  swimcloud_id: number;
  name: string;
  gender: string;
  hometown_state: string | null;
}

export interface SwimmerTimeRow {
  swimmer_id: number;
  swimmer_name: string;
  event_id: number;
  event_name: string;
  time_seconds: number;
  time_display: string;
  course: string | null;
}

export interface EventConfig {
  event_id: number;
  event_name: string;
  is_relay: boolean;
  max_entries: number;
}

export interface SwimmerEntry {
  swimmer_id: number;
  name: string;
  gender: string;
  max_individual_events: number;
}

export interface SwimmerTime {
  swimmer_id: number;
  event_id: number;
  time_seconds: number;
  time_display: string;
}

export interface OpponentTime {
  event_id: number;
  time_seconds: number;
  team_name: string;
  swimmer_name: string;
}

export interface OpponentTeamData {
  team: TeamSummary;
  times: SwimmerTimeRow[];
  status: "pending" | "loading" | "loaded" | "error";
  error?: string;
}

export interface CoachConstraintApi {
  swimmer_id: number;
  event_id: number;
  constraint_type: "lock" | "exclude";
}

export interface TimeAdjustmentApi {
  swimmer_id: number;
  event_id: number | null;
  multiplier: number;
  reason: string;
}

export interface MeetConfig {
  team_name: string;
  events: EventConfig[];
  swimmers: SwimmerEntry[];
  times: SwimmerTime[];
  opponent_times: OpponentTime[];
  scoring_system: number[];
  max_individual_events_default: number;
  constraints?: CoachConstraintApi[];
  time_adjustments?: TimeAdjustmentApi[];
  unavailable_swimmers?: number[];
}

export interface Assignment {
  swimmer_id: number;
  swimmer_name: string;
  event_id: number;
  event_name: string;
  expected_time: number;
  expected_time_display: string;
  expected_place: number;
  expected_points: number;
}

export interface EventSummaryResult {
  event_id: number;
  event_name: string;
  entries: Assignment[];
  total_event_points: number;
}

export interface OptimizerResult {
  assignments: Assignment[];
  total_projected_points: number;
  events_summary: EventSummaryResult[];
  unassigned_swimmers: string[];
  solve_time_ms: number;
  status: string;
}

export interface ScoringPreset {
  name: string;
  points: number[];
  places: number;
}

// ── Analysis types (matchup intelligence) ────────────────────────

export interface SwimmerMatchup {
  swimmer_id: number;
  swimmer_name: string;
  time_seconds: number;
  time_display: string;
  team_name: string;
  projected_place: number;
  projected_points: number;
  is_home_team: boolean;
}

export interface KeyMatchup {
  event_name: string;
  event_id: number;
  home_swimmer: string;
  home_time: number;
  home_time_display: string;
  opponent_swimmer: string;
  opponent_team: string;
  opponent_time: number;
  opponent_time_display: string;
  time_gap_seconds: number;
  time_gap_pct: number;
  home_wins: boolean;
}

export interface EventMatchup {
  event_id: number;
  event_name: string;
  is_relay: boolean;
  home_entries: SwimmerMatchup[];
  opponent_entries: SwimmerMatchup[];
  combined_ranked: SwimmerMatchup[];
  home_projected_points: number;
  opponent_projected_points: Record<string, number>;
  max_possible_home_points: number;
  point_opportunity: number;
  difficulty: "dominant" | "competitive" | "uphill" | "no_entries";
  swing_potential: number;
}

export interface TeamStrength {
  team_name: string;
  total_projected_points: number;
  event_wins: number;
  strongest_events: string[];
  weakest_events: string[];
  swimmer_count: number;
  events_entered: number;
}

export interface MatchupAnalysis {
  home_team: TeamStrength;
  opponents: TeamStrength[];
  events: EventMatchup[];
  swing_events: string[];
  point_gap: number;
  projected_winner: string;
  confidence: "strong" | "moderate" | "toss-up";
  key_matchups: KeyMatchup[];
}

export interface ScoutingBriefResponse {
  analysis: MatchupAnalysis;
  narrative: string | null;
  ai_available: boolean;
}

// ── API calls ────────────────────────────────────────────────────

export async function searchTeams(
  query: string,
): Promise<{ items: TeamSummary[]; total: number }> {
  const params = new URLSearchParams({ q: query, level: "HS", per_page: "20" });
  return fetchJson(`${API_BASE}/teams?${params}`);
}

export async function getTeamSwimmers(
  teamId: number,
  gender?: string,
): Promise<SwimmerSummary[]> {
  const params = new URLSearchParams();
  if (gender) params.append("gender", gender);
  return fetchJson(`${API_BASE}/teams/${teamId}/swimmers?${params}`);
}

export async function fetchTeamTimes(
  teamId: number,
  gender: string,
): Promise<{
  team_name: string;
  swimmer_count: number;
  times: SwimmerTimeRow[];
  message: string;
}> {
  return fetchJson(`${API_BASE}/fetch/team-times`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_id: teamId, gender }),
  });
}

export async function buildConfig(
  teamId: number,
  gender: string,
  scoringPreset: string,
  maxIndividual: number,
): Promise<MeetConfig> {
  const params = new URLSearchParams({
    team_id: String(teamId),
    gender,
    scoring_preset: scoringPreset,
    max_individual: String(maxIndividual),
  });
  return fetchJson(`${API_BASE}/optimizer/build-config?${params}`, {
    method: "POST",
  });
}

export async function runOptimizer(
  config: MeetConfig,
): Promise<OptimizerResult> {
  return fetchJson(`${API_BASE}/optimizer/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export async function getScoringPresets(): Promise<
  Record<string, ScoringPreset>
> {
  return fetchJson(`${API_BASE}/optimizer/presets`);
}

export async function getStandardEvents(): Promise<
  { name: string; distance: number; stroke: string; is_relay: boolean }[]
> {
  return fetchJson(`${API_BASE}/optimizer/events`);
}

// ── Analysis API calls ──────────────────────────────────────────

export interface AnalysisRequest {
  home_team_name: string;
  home_times: {
    swimmer_id: number;
    swimmer_name: string;
    event_id: number;
    time_seconds: number;
    time_display: string;
  }[];
  opponent_times: {
    event_id: number;
    time_seconds: number;
    team_name: string;
    swimmer_name: string;
  }[];
  events: {
    event_id: number;
    event_name: string;
    is_relay: boolean;
  }[];
  scoring_system: number[];
}

export async function getMatchupAnalysis(
  request: AnalysisRequest,
): Promise<MatchupAnalysis> {
  return fetchJson(`${API_BASE}/analysis/matchup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function getScoutingBrief(
  request: AnalysisRequest,
): Promise<ScoutingBriefResponse> {
  return fetchJson(`${API_BASE}/analysis/scouting-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}
