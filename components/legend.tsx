"use client";

import {
  Lock,
  X,
  Sparkles,
  Activity,
  AlertTriangle,
  ThermometerSun,
  UserX,
  Zap,
} from "lucide-react";

/**
 * Visual guide explaining all icons, badges, and color codes used in the app.
 * Displayed when the coach clicks "Guide" in the configure step header.
 */
export function Legend() {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {/* ── Event Difficulty ── */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Event Difficulty
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-emerald-700">Dominant</span> — strong advantage
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-amber-700">Competitive</span> — close matchup
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-red-700">Uphill</span> — opponent leads
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={10} className="text-amber-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-amber-700">Swing</span> — lineup changes matter
              </span>
            </div>
          </div>
        </div>

        {/* ── Swimmer Condition ── */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Swimmer Condition
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles size={10} className="text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-emerald-700">Tapered</span> — times 3% faster
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-blue-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-blue-700">Fresh</span> — no adjustment
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={10} className="text-amber-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-amber-700">Tired</span> — times 3% slower
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThermometerSun size={10} className="text-red-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-red-700">Sick</span> — times 5% slower
              </span>
            </div>
          </div>
        </div>

        {/* ── Event Constraints ── */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Event Constraints
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Lock size={10} className="text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-emerald-700">Locked</span> — must swim this event
              </span>
            </div>
            <div className="flex items-center gap-2">
              <X size={10} className="text-red-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-red-700">Excluded</span> — won&apos;t swim this event
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserX size={10} className="text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-red-600">Unavailable</span> — out of meet entirely
              </span>
            </div>
          </div>
        </div>

        {/* ── Matchup Board ── */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Matchup Board
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 rounded-sm bg-blue-100 border border-blue-200 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-blue-700">Blue row</span> — your swimmer
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 rounded-sm bg-slate-100 border border-slate-200 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-slate-600">Gray row</span> — opponent swimmer
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 rounded-sm bg-violet-100 border border-violet-200 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">
                <span className="font-medium text-violet-700">Purple chip</span> — relay event
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
