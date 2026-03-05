"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TeamPicker } from "@/components/team-picker";
import { OpponentPicker } from "@/components/opponent-picker";
import { MeetSetup } from "@/components/meet-setup";
import { Results } from "@/components/results";
import { Check, Sparkles, Target, Zap, Shield } from "lucide-react";
import type {
  TeamSummary,
  MeetConfig,
  OptimizerResult,
  SwimmerTimeRow,
  OpponentTeamData,
} from "@/lib/api";

type Step = "team" | "opponents" | "config" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "team", label: "Select Team" },
  { key: "opponents", label: "Opponents" },
  { key: "config", label: "Strategy" },
  { key: "results", label: "Lineup" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("team");
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [gender, setGender] = useState<string>("F");
  const [times, setTimes] = useState<SwimmerTimeRow[]>([]);
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeamData[]>([]);
  const [meetConfig, setMeetConfig] = useState<MeetConfig | null>(null);
  const [result, setResult] = useState<OptimizerResult | null>(null);

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const isLanding = step === "team" && !team;

  return (
    <div className="min-h-screen">
      {/* Header — compact when in wizard, hidden/minimal on landing */}
      <header className={`bg-white border-b border-slate-200/80 sticky top-0 z-10 transition-all ${isLanding ? "border-transparent bg-transparent" : ""}`}>
        <div className={`${step === "config" ? "max-w-7xl" : "max-w-5xl"} mx-auto px-6 py-3 flex items-center justify-between transition-all`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h4l3-9 6 18 3-9h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                SwimCoach
              </h1>
              {!isLanding && (
                <p className="text-[11px] text-slate-400 leading-none">
                  AI-powered meet strategy
                </p>
              )}
            </div>
          </div>

          {/* Stepper — only after team selected */}
          {!isLanding && (
            <div className="hidden sm:flex items-center gap-0">
              {STEPS.map((s, i) => {
                const isActive = step === s.key;
                const isPast = currentIdx > i;
                return (
                  <div key={s.key} className="flex items-center">
                    {i > 0 && (
                      <div
                        className={`w-8 h-px mx-1 transition-colors duration-300 ${
                          isPast ? "bg-blue-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                    <button
                      onClick={() => {
                        if (s.key === "team") setStep("team");
                        else if (s.key === "opponents" && team) setStep("opponents");
                        else if (s.key === "config" && team) setStep("config");
                        else if (s.key === "results" && result) setStep("results");
                      }}
                      className="flex items-center gap-1.5 group"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-300
                          ${isActive ? "bg-blue-600 text-white ring-4 ring-blue-100" : ""}
                          ${isPast ? "bg-blue-600 text-white" : ""}
                          ${!isActive && !isPast ? "bg-slate-100 text-slate-400 border border-slate-200" : ""}
                        `}
                      >
                        {isPast ? <Check size={12} strokeWidth={3} /> : i + 1}
                      </div>
                      <span
                        className={`text-xs font-medium transition-colors ${
                          isActive ? "text-slate-900" : isPast ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section — only on landing */}
      {isLanding && (
        <div className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
          {/* Water wave pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 200" fill="none">
              <path d="M0 80C240 20 480 140 720 80C960 20 1200 140 1440 80V200H0V80Z" fill="white" />
              <path d="M0 120C240 60 480 180 720 120C960 60 1200 180 1440 120V200H0V120Z" fill="white" opacity="0.5" />
            </svg>
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-20">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium mb-6 border border-white/10">
                <Sparkles size={12} />
                AI-Powered Meet Strategy
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
                Prepare your team<br />to compete at their best.
              </h2>
              <p className="text-base text-blue-100 leading-relaxed max-w-lg">
                Matchup intelligence, optimal lineups, and scouting briefs — built for high school swim coaches who want every point.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3 mt-8">
                {[
                  { icon: Target, label: "Head-to-head scouting" },
                  { icon: Zap, label: "Optimal event assignments" },
                  { icon: Shield, label: "Coach-controlled adjustments" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm"
                  >
                    <Icon size={14} className="text-blue-200" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className={`${step === "config" ? "max-w-7xl" : "max-w-5xl"} mx-auto px-6 transition-all ${isLanding ? "py-0 -mt-8 relative z-10" : "py-8"}`}>
        <AnimatePresence mode="wait">
          {step === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: isLanding ? 10 : 0, x: isLanding ? 0 : 16 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <TeamPicker
                onSelect={(t, g, swimmerTimes) => {
                  setTeam(t);
                  setGender(g);
                  setTimes(swimmerTimes);
                  setStep("opponents");
                }}
              />
            </motion.div>
          )}

          {step === "opponents" && team && (
            <motion.div
              key="opponents"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <OpponentPicker
                homeTeam={team}
                gender={gender}
                onContinue={(opponents) => {
                  setOpponentTeams(opponents);
                  setStep("config");
                }}
                onBack={() => setStep("team")}
              />
            </motion.div>
          )}

          {step === "config" && team && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <MeetSetup
                team={team}
                gender={gender}
                times={times}
                opponentTeams={opponentTeams}
                onBack={() => setStep("opponents")}
                onOptimize={(config, optimizerResult) => {
                  setMeetConfig(config);
                  setResult(optimizerResult);
                  setStep("results");
                }}
              />
            </motion.div>
          )}

          {step === "results" && result && meetConfig && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <Results
                result={result}
                config={meetConfig}
                onBack={() => setStep("config")}
                onRestart={() => {
                  setStep("team");
                  setTeam(null);
                  setResult(null);
                  setMeetConfig(null);
                  setOpponentTeams([]);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
