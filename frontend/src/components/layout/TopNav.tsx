"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";

const SCENARIOS = ["viable", "ltv_alert", "dti_alert"] as const;

const SCENARIO_LABELS = {
  viable: { label: "🟢 Viable", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  ltv_alert: { label: "🟡 Alerta LTV", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  dti_alert: { label: "🔴 Alerta DTI", className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
};

export default function TopNav({ activeTab }: { activeTab: "simulator" | "admin" }) {
  const router = useRouter();
  const { loadScenario, reset } = useMortgageStore();

  const handleNuevoCalculo = () => {
    reset();
    if (activeTab === "admin") {
      router.push("/simulador");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-xs flex-wrap">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link href="/simulador" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs text-lg transition">
            🏠
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight group-hover:text-blue-600 transition">
              Estudio Hipotecario
            </h1>
            <p className="text-[11px] text-slate-500">Motor Clean Architecture + PostgreSQL</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1 items-center">
        <Link
          href="/simulador"
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
            activeTab === "simulator"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          )}
        >
          <span>💬</span>
          <span>Asistente Conversacional</span>
        </Link>
        <Link
          href="/admin"
          className={cn(
            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
            activeTab === "admin"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          )}
        >
          <span>⚙️</span>
          <span>Portal de Maestros</span>
          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
            BD
          </span>
        </Link>
      </nav>

      {/* Actions: Nuevo Cálculo & Demos */}
      <div className="flex items-center gap-2">
        {/* Botón Principal: Nuevo Cálculo */}
        <button
          onClick={handleNuevoCalculo}
          title="Limpiar todos los datos y reiniciar el estudio hipotecario desde el Paso 1"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <span className="text-sm">✨</span>
          <span>Nuevo Cálculo</span>
        </button>

        {/* Escenarios rápidos (en simulador) */}
        {activeTab === "simulator" ? (
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium">Ejemplos:</span>
            {SCENARIOS.map((s) => (
              <button
                key={s}
                onClick={() => loadScenario(s)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                  SCENARIO_LABELS[s].className
                )}
              >
                {SCENARIO_LABELS[s].label}
              </button>
            ))}
          </div>
        ) : (
          <Link
            href="/simulador"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
          >
            ← Volver al Chat
          </Link>
        )}
      </div>
    </header>
  );
}
