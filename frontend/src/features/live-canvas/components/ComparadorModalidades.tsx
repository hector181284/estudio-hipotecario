"use client";

/**
 * ComparadorModalidades
 * Tabla interactiva Fijo vs Variable vs Mixto con:
 *  - Control de precio de vivienda (capital base)
 *  - Plazo configurable
 *  - TIN individual por modalidad
 *  - Análisis de estrés: impacto de subidas del Euribor (+1%, +2%, +3%)
 *  - Totales de coste financiero
 */

import React, { useState, useMemo } from "react";

// ── Fórmula de cuota mensual (Sistema Francés) ────────────────────────────────

function calcularCuota(capital: number, tinAnual: number, plazoAnios: number): number {
  if (capital <= 0 || plazoAnios <= 0) return 0;
  const n = plazoAnios * 12;
  const i = tinAnual / 100 / 12;
  if (i === 0) return capital / n;
  const factor = Math.pow(1 + i, n);
  return (capital * i * factor) / (factor - 1);
}

function calcularTotalIntereses(cuota: number, capital: number, plazoAnios: number): number {
  return cuota * plazoAnios * 12 - capital;
}

function fmtEuro(v: number): string {
  return v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

function fmtCuota(v: number): string {
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €/mes";
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ModalidadConfig {
  id: "fijo" | "variable" | "mixto";
  label: string;
  icon: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  colorBadge: string;
}

const MODALIDADES: ModalidadConfig[] = [
  {
    id: "fijo",
    label: "Tipo Fijo",
    icon: "🔒",
    colorBg: "bg-blue-50",
    colorBorder: "border-blue-200",
    colorText: "text-blue-900",
    colorBadge: "bg-blue-100 text-blue-800",
  },
  {
    id: "variable",
    label: "Tipo Variable",
    icon: "📈",
    colorBg: "bg-emerald-50",
    colorBorder: "border-emerald-200",
    colorText: "text-emerald-900",
    colorBadge: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "mixto",
    label: "Tipo Mixto",
    icon: "⚖️",
    colorBg: "bg-violet-50",
    colorBorder: "border-violet-200",
    colorText: "text-violet-900",
    colorBadge: "bg-violet-100 text-violet-800",
  },
];

const STRESS_ESCENARIOS = [
  { label: "Euribor actual", delta: 0, color: "text-slate-700" },
  { label: "+1%", delta: 1, color: "text-amber-600" },
  { label: "+2%", delta: 2, color: "text-orange-600" },
  { label: "+3%", delta: 3, color: "text-red-700" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Capital financiado base (calculado en el dictamen) */
  capitalBase: number;
  /** Precio del inmueble actual */
  precioInmueble: number;
  /** Plazo actual de la simulación */
  plazoBase: number;
  /** TIN de la simulación actual */
  tinBase: number;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ComparadorModalidades({
  capitalBase,
  precioInmueble,
  plazoBase,
  tinBase,
}: Props) {
  // ── Estado configurable por el usuario ──
  const [precio, setPrecio] = useState(precioInmueble);
  const [plazo, setPlazo] = useState(plazoBase);
  const [tinFijo, setTinFijo] = useState(tinBase);
  const [tinVariableBase, setTinVariableBase] = useState(Math.max(tinBase - 0.5, 1.5));
  const [tinMixtoFijo, setTinMixtoFijo] = useState(tinBase - 0.2);
  const [tinMixtoVariable, setTinMixtoVariable] = useState(Math.max(tinBase - 0.3, 1.5));
  const [aniosMixtoFijo, setAniosMixtoFijo] = useState(10);
  const [mostrarStress, setMostrarStress] = useState(false);

  // Capital aproximado (20% entrada + gastos ≈ 10%)
  const entrada = precio * 0.2;
  const gastos = precio * 0.1;
  const capital = Math.max(precio - entrada, 10000);

  // ── Cálculos ──
  const resultados = useMemo(() => {
    const cuotaFija = calcularCuota(capital, tinFijo, plazo);
    const cuotaVariable = calcularCuota(capital, tinVariableBase, plazo);

    // Mixto: primeros X años a tipo fijo, resto variable
    const cuotaMixtoFijo = calcularCuota(capital, tinMixtoFijo, plazo);
    const capitalTrasFase1 =
      capital -
      Array.from({ length: aniosMixtoFijo * 12 }, (_, m) => {
        const i = tinMixtoFijo / 100 / 12;
        const factor = Math.pow(1 + i, plazo * 12);
        const cuota = i === 0 ? capital / (plazo * 12) : (capital * i * factor) / (factor - 1);
        const interes = capital * i * Math.pow(1 + i, m); // simplified
        return cuota - interes;
      }).reduce((a, b) => a + b, 0);
    // Simplified approach: recalculate remaining capital after fixed period
    let saldo = capital;
    const iF = tinMixtoFijo / 100 / 12;
    for (let m = 0; m < aniosMixtoFijo * 12; m++) {
      const interes = saldo * iF;
      const cuotaM = cuotaMixtoFijo;
      saldo -= cuotaM - interes;
    }
    const plazoResto = plazo - aniosMixtoFijo;
    const cuotaMixtoVariable = plazoResto > 0 ? calcularCuota(saldo, tinMixtoVariable, plazoResto) : 0;

    return {
      fijo: { cuota: cuotaFija, total: cuotaFija * plazo * 12, intereses: calcularTotalIntereses(cuotaFija, capital, plazo) },
      variable: { cuota: cuotaVariable, total: cuotaVariable * plazo * 12, intereses: calcularTotalIntereses(cuotaVariable, capital, plazo) },
      mixto: {
        cuotaFase1: cuotaMixtoFijo,
        cuotaFase2: cuotaMixtoVariable,
        total: cuotaMixtoFijo * aniosMixtoFijo * 12 + cuotaMixtoVariable * plazoResto * 12,
        intereses:
          cuotaMixtoFijo * aniosMixtoFijo * 12 + cuotaMixtoVariable * plazoResto * 12 - capital,
      },
    };
  }, [capital, tinFijo, tinVariableBase, tinMixtoFijo, tinMixtoVariable, plazo, aniosMixtoFijo]);

  const masBarato = Math.min(
    resultados.fijo.total,
    resultados.variable.total,
    resultados.mixto.total
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <span>⚡</span> Comparador de Modalidades
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Fijo vs Variable vs Mixto · Análisis de coste total y estrés de Euribor
          </p>
        </div>
        <button
          onClick={() => setMostrarStress((v) => !v)}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
            mostrarStress
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
          }`}
        >
          {mostrarStress ? "🔥 Estrés ON" : "🔥 Ver estrés Euribor"}
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Panel de configuración ── */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
          <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
            ⚙️ Parámetros de la Operación
          </h5>

          <div className="grid grid-cols-2 gap-4">
            {/* Precio de la vivienda */}
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-600">
                  🏠 Precio del Inmueble
                </label>
                <span className="text-sm font-black text-blue-700">
                  {fmtEuro(precio)}
                </span>
              </div>
              <input
                type="range"
                min={80000}
                max={1000000}
                step={5000}
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>80.000 €</span>
                <span className="text-slate-500 font-semibold">
                  Capital financiado (80%): {fmtEuro(capital)}
                </span>
                <span>1.000.000 €</span>
              </div>
            </div>

            {/* Plazo */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-600">📅 Plazo</label>
                <span className="text-sm font-black text-slate-800">{plazo} años</span>
              </div>
              <input
                type="range" min={5} max={40} step={1} value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>5a</span><span>40a</span>
              </div>
            </div>

            {/* TIN Fijo */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-blue-700">🔒 TIN Fijo</label>
                <span className="text-sm font-black text-blue-800">{tinFijo.toFixed(2)}%</span>
              </div>
              <input
                type="range" min={1} max={6} step={0.05} value={tinFijo}
                onChange={(e) => setTinFijo(Number(e.target.value))}
                className="w-full h-2 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-blue-300 mt-0.5">
                <span>1%</span><span>6%</span>
              </div>
            </div>

            {/* TIN Variable base */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-emerald-700">📈 TIN Variable (hoy)</label>
                <span className="text-sm font-black text-emerald-800">{tinVariableBase.toFixed(2)}%</span>
              </div>
              <input
                type="range" min={0.5} max={5} step={0.05} value={tinVariableBase}
                onChange={(e) => setTinVariableBase(Number(e.target.value))}
                className="w-full h-2 bg-emerald-100 rounded-full appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-emerald-300 mt-0.5">
                <span>0.5%</span><span>5%</span>
              </div>
            </div>

            {/* TIN Mixto fijo */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-violet-700">⚖️ TIN Mixto (tramo fijo)</label>
                <span className="text-sm font-black text-violet-800">{tinMixtoFijo.toFixed(2)}%</span>
              </div>
              <input
                type="range" min={1} max={5} step={0.05} value={tinMixtoFijo}
                onChange={(e) => setTinMixtoFijo(Number(e.target.value))}
                className="w-full h-2 bg-violet-100 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-violet-300 mt-0.5">
                <span>1%</span><span>5%</span>
              </div>
            </div>

            {/* Años tramo fijo mixto */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-violet-700">⏱ Años a tipo fijo (mixto)</label>
                <span className="text-sm font-black text-violet-800">{aniosMixtoFijo} años</span>
              </div>
              <input
                type="range" min={3} max={Math.min(plazo - 1, 20)} step={1} value={aniosMixtoFijo}
                onChange={(e) => setAniosMixtoFijo(Number(e.target.value))}
                className="w-full h-2 bg-violet-100 rounded-full appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-violet-300 mt-0.5">
                <span>3a</span><span>{Math.min(plazo - 1, 20)}a</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tarjetas comparativas ── */}
        <div className="grid grid-cols-3 gap-3">
          {MODALIDADES.map((m) => {
            const r =
              m.id === "fijo"
                ? resultados.fijo
                : m.id === "variable"
                ? resultados.variable
                : resultados.mixto;
            const esMasBarato = (r as { total: number }).total === masBarato;
            const cuotaPrincipal =
              m.id === "mixto"
                ? (r as typeof resultados.mixto).cuotaFase1
                : (r as typeof resultados.fijo).cuota;

            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3.5 space-y-3 relative transition ${m.colorBg} ${m.colorBorder} ${
                  esMasBarato ? "ring-2 ring-emerald-400 shadow-sm" : ""
                }`}
              >
                {esMasBarato && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    ✓ Más económico
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-base">{m.icon}</span>
                  <span className={`text-xs font-black ${m.colorText}`}>{m.label}</span>
                </div>

                {/* Cuota */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">Cuota mensual</span>
                  <span className={`text-lg font-black ${m.colorText} leading-tight`}>
                    {fmtCuota(cuotaPrincipal)}
                  </span>
                  {m.id === "mixto" && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Tramo variable: {fmtCuota(resultados.mixto.cuotaFase2)}
                    </span>
                  )}
                </div>

                {/* Coste total */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">Coste total</span>
                  <span className="text-sm font-black text-slate-800">{fmtEuro((r as { total: number }).total)}</span>
                </div>

                {/* Intereses */}
                <div className={`${m.colorBadge} rounded-lg px-2.5 py-1.5`}>
                  <span className="text-[10px] font-semibold block opacity-80">Total intereses</span>
                  <span className="text-sm font-black">{fmtEuro((r as { intereses: number }).intereses)}</span>
                </div>

                {/* TIN */}
                <div className="text-[10px] text-slate-500 font-medium">
                  {m.id === "fijo" && `TIN: ${tinFijo.toFixed(2)}% fijo · ${plazo} años`}
                  {m.id === "variable" && `TIN hoy: ${tinVariableBase.toFixed(2)}% + Euribor · ${plazo} años`}
                  {m.id === "mixto" && `${tinMixtoFijo.toFixed(2)}% fijo ${aniosMixtoFijo}a + ${tinMixtoVariable.toFixed(2)}% variable`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Diferencias resumen */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Ahorro Fijo vs Variable", a: resultados.variable.total, b: resultados.fijo.total },
            { label: "Ahorro Fijo vs Mixto", a: resultados.mixto.total, b: resultados.fijo.total },
            { label: "Ahorro Variable vs Mixto", a: resultados.mixto.total, b: resultados.variable.total },
          ].map(({ label, a, b }) => {
            const diff = a - b;
            return (
              <div key={label} className="text-center text-xs">
                <span className="text-slate-500 block text-[10px]">{label}</span>
                <span className={`font-black text-sm ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-500"}`}>
                  {diff > 0 ? "−" : diff < 0 ? "+" : "="} {fmtEuro(Math.abs(diff))}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Análisis de estrés Euribor ── */}
        {mostrarStress && (
          <div className="border border-amber-200 rounded-xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
              <h5 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                🔥 Análisis de Estrés: Impacto de subidas del Euribor
              </h5>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Efecto en la cuota mensual de hipoteca variable y mixto si el Euribor sube.
              </p>
            </div>
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Escenario</th>
                    <th className="px-3 py-2 text-right font-bold">Tipo Fijo</th>
                    <th className="px-3 py-2 text-right font-bold text-emerald-700">Variable</th>
                    <th className="px-3 py-2 text-right font-bold text-violet-700">Mixto (tramo variable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STRESS_ESCENARIOS.map(({ label, delta, color }) => {
                    const cuotaFijaE = calcularCuota(capital, tinFijo, plazo);
                    const cuotaVariableE = calcularCuota(capital, tinVariableBase + delta, plazo);
                    const cuotaMixtoE = calcularCuota(
                      capital * 0.5, // approx remaining after fixed period
                      tinMixtoVariable + delta,
                      plazo - aniosMixtoFijo
                    );
                    const isBase = delta === 0;

                    return (
                      <tr key={label} className={isBase ? "bg-slate-50/50" : ""}>
                        <td className={`px-3 py-2 font-bold ${color}`}>
                          {label}
                          {!isBase && (
                            <span className="text-[9px] ml-1 text-slate-400">
                              TIN +{delta}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 font-mono">
                          {/* Fijo no cambia */}
                          {fmtCuota(cuotaFijaE)}
                          {delta > 0 && <span className="text-[10px] text-slate-400 ml-1">(sin cambio)</span>}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold font-mono ${color}`}>
                          {fmtCuota(cuotaVariableE)}
                          {delta > 0 && (
                            <span className="text-[10px] text-red-500 block">
                              +{fmtCuota(cuotaVariableE - resultados.variable.cuota)} extra
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold font-mono ${color}`}>
                          {fmtCuota(cuotaMixtoE)}
                          {delta > 0 && (
                            <span className="text-[10px] text-red-500 block">
                              en tramo variable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50/50 px-4 py-2 text-[10px] text-amber-700 border-t border-amber-100">
              ⚠️ El tipo fijo garantiza cuota constante durante toda la vida del préstamo, independientemente de la evolución del Euribor.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
