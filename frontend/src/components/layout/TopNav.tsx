"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";

const SCENARIOS = ["viable", "ltv_alert", "dti_alert"] as const;

const SCENARIO_LABELS = {
  viable: { label: "🟢 Viable", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  ltv_alert: { label: "🟡 Alerta LTV", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  dti_alert: { label: "🔴 Alerta DTI", className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
};

export default function TopNav({ activeTab }: { activeTab: "simulator" | "admin" }) {
  const { loadScenario } = useMortgageStore();

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 z-30 shadow-sm flex-wrap">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm text-lg">
          🏠
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Estudio Hipotecario</h1>
          <p className="text-xs text-slate-500">Motor Clean Architecture + Decimal.js</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
        <Link
          href="/simulador"
          className={cn(
            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
            activeTab === "simulator"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          💬 Asistente Conversacional
        </Link>
        <Link
          href="/admin"
          className={cn(
            "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
            activeTab === "admin"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          ⚙️ Portal de Maestros
        </Link>
      </div>

      {/* Scenario Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 hidden sm:inline font-medium">Escenario rápido:</span>
        <div className="flex gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => loadScenario(s)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all",
                SCENARIO_LABELS[s].className
              )}
            >
              {SCENARIO_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
