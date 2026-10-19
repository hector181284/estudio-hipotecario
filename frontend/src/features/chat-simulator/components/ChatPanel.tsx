"use client";

import React, { useRef, useEffect } from "react";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";
import type {
  PropertyType,
  LoanPurpose,
  EmploymentType,
  RateType,
} from "@/types/mortgage";

const CCAA_OPTIONS = [
  { value: "MD", label: "Madrid (ITP 6%)" },
  { value: "CT", label: "Cataluña (ITP 10%)" },
  { value: "AN", label: "Andalucía (ITP 7%)" },
  { value: "VC", label: "C. Valenciana (ITP 10%)" },
  { value: "PV", label: "País Vasco (ITP 4%)" },
  { value: "GA", label: "Galicia (ITP 8%)" },
  { value: "CL", label: "Castilla y León (ITP 8%)" },
  { value: "CM", label: "Castilla-La Mancha (ITP 9%)" },
  { value: "IB", label: "Baleares (ITP 8%)" },
  { value: "CN", label: "Canarias (ITP 6.5%)" },
];

const PASOS_CONFIG = [
  { id: 1, titulo: "Propósito", icono: "🏠" },
  { id: 2, titulo: "Inmueble", icono: "📍" },
  { id: 3, titulo: "Ahorro", icono: "💰" },
  { id: 4, titulo: "Ingresos", icono: "💼" },
  { id: 5, titulo: "Condiciones", icono: "⚡" },
];

export default function ChatPanel() {
  const {
    params,
    setParam,
    setCondicion,
    setTitular,
    activeStep,
    setStep,
    nextStep,
    prevStep,
    loadScenario,
    reset,
    hasCompletedSimulation,
    isLoading,
  } = useMortgageStore();

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeStep]);

  return (
    <div className="flex flex-col h-full bg-slate-50/70">
      
      {/* ── Top Bar con Stepper y Demos ── */}
      <div className="p-3.5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              🤖
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Asistente Hipotecario</h3>
              <p className="text-[10px] text-slate-400">Paso a paso guiado</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">Demos:</span>
            <button
              onClick={() => loadScenario("viable")}
              className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
            >
              ✅ Viable
            </button>
            <button
              onClick={() => loadScenario("ltv_alert")}
              className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
            >
              ⚠️ LTV
            </button>
            <button
              onClick={() => loadScenario("dti_alert")}
              className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition cursor-pointer"
            >
              🔴 DTI
            </button>
            <button
              onClick={reset}
              title="Reiniciar estudio"
              className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Indicador de 5 Pasos */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {PASOS_CONFIG.map((p) => {
            const isCompleted = p.id < activeStep || hasCompletedSimulation;
            const isCurrent = p.id === activeStep;
            return (
              <button
                key={p.id}
                onClick={() => {
                  if (p.id <= activeStep || hasCompletedSimulation) {
                    setStep(p.id);
                  }
                }}
                className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer border ${
                  isCurrent
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="text-[11px] font-bold">
                  {isCompleted && !isCurrent ? "✓" : p.icono}
                </div>
                <div className="text-[9px] font-medium truncate">{p.titulo}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mensajes acumulados del Chat (Historial hasta el paso actual) ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* ================= PASO 1: FINALIDAD Y TIPO ================= */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 max-w-[92%]">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
              IA
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs text-xs text-slate-800">
              <p className="font-bold text-slate-900 mb-0.5">¡Hola! Soy tu asistente para el estudio hipotecario.</p>
              <p className="text-slate-600">Para comenzar, ¿cuál es el propósito de la compra y qué tipo de inmueble es?</p>
            </div>
          </div>

          <div className="ml-8 space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Finalidad del préstamo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "primera_vivienda", label: "🏡 Habitual" },
                  { value: "segunda_residencia", label: "🏖️ Segunda" },
                  { value: "inversion", label: "📈 Inversión" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setParam("finalidad", f.value as LoanPurpose)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition cursor-pointer ${
                      params.finalidad === f.value
                        ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Tipo de vivienda
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "segunda_mano", label: "🔑 Segunda mano (ITP)" },
                  { value: "obra_nueva", label: "🏗️ Obra nueva (IVA+AJD)" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setParam("tipoVivienda", t.value as PropertyType)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition cursor-pointer ${
                      params.tipoVivienda === t.value
                        ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeStep === 1 && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  Continuar al Inmueble ➔
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= PASO 2: PRECIO Y COMUNIDAD ================= */}
        {activeStep >= 2 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2.5 max-w-[92%]">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs text-xs text-slate-800">
                <p>¿Cuánto cuesta la vivienda y en qué Comunidad Autónoma está?</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Calcularemos los impuestos autonómicos reales.</p>
              </div>
            </div>

            <div className="ml-8 space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Precio de Compra</span>
                  <span className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {params.precioInmueble.toLocaleString("es-ES")} €
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={900000}
                  step={5000}
                  value={params.precioInmueble}
                  onChange={(e) => setParam("precioInmueble", Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Comunidad Autónoma
                </label>
                <select
                  value={params.comunidadAutonoma}
                  onChange={(e) => setParam("comunidadAutonoma", e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 outline-none"
                >
                  {CCAA_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {activeStep === 2 && (
                <div className="pt-2 flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    ← Modificar paso 1
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Continuar al Ahorro ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PASO 3: AHORROS DISPONIBLES ================= */}
        {activeStep >= 3 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2.5 max-w-[92%]">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs text-xs text-slate-800">
                <p>¿Qué cantidad de ahorros propios tienes previstos aportar para la operación?</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Se destina a cubrir la entrada del 20% y los gastos de compraventa.</p>
              </div>
            </div>

            <div className="ml-8 space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ahorro aportado</span>
                <span className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  {params.ahorrosAportados.toLocaleString("es-ES")} €
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(params.precioInmueble * 0.6, 150000)}
                step={2500}
                value={params.ahorrosAportados}
                onChange={(e) => setParam("ahorrosAportados", Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 €</span>
                <span>{(params.precioInmueble * 0.3).toLocaleString("es-ES")} € (30% recomendado)</span>
              </div>

              {activeStep === 3 && (
                <div className="pt-2 flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    ← Modificar paso 2
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Continuar a Ingresos ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PASO 4: SITUACIÓN ECONÓMICA ================= */}
        {activeStep >= 4 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2.5 max-w-[92%]">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs text-xs text-slate-800">
                <p>Analicemos la solvencia y capacidad mensual de pago.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">El banco exige que tus deudas no superen el 35% de tus ingresos netos.</p>
              </div>
            </div>

            <div className="ml-8 space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Contrato laboral
                  </label>
                  <select
                    value={params.titularPrincipal.contrato}
                    onChange={(e) => setTitular("contrato", e.target.value as EmploymentType)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-800 outline-none"
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="funcionario">Funcionario</option>
                    <option value="autonomo">Autónomo</option>
                    <option value="temporal">Temporal</option>
                    <option value="pensionista">Pensionista</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Ingresos netos
                  </label>
                  <div className="flex items-center border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white">
                    <input
                      type="number"
                      step={50}
                      value={params.titularPrincipal.ingresosNetosMensuales}
                      onChange={(e) => setTitular("ingresosNetosMensuales", Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 ml-1">€/mes</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Otros préstamos o deudas vigentes
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white">
                  <input
                    type="number"
                    step={25}
                    value={params.titularPrincipal.deudasMensualesVigentes}
                    onChange={(e) => setTitular("deudasMensualesVigentes", Number(e.target.value))}
                    className="w-full text-xs font-bold text-slate-800 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 ml-1">€/mes</span>
                </div>
              </div>

              {activeStep === 4 && (
                <div className="pt-2 flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    ← Modificar paso 3
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Configurar Hipoteca ➔
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PASO 5: CONDICIONES FINANCIERAS ================= */}
        {activeStep >= 5 && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-2.5 max-w-[92%]">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-xs text-xs text-slate-800">
                <p className="font-bold text-slate-900 mb-0.5">Último paso: ajusta las condiciones deseadas.</p>
                <p className="text-slate-600">Al pulsar en "Calcular Viabilidad", obtendrás el dictamen de scoring completo y la tabla de amortización.</p>
              </div>
            </div>

            <div className="ml-8 space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Modalidad de tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "fijo", label: "🔒 Fija" },
                    { value: "variable", label: "📊 Variable" },
                    { value: "mixto", label: "🔄 Mixta" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setCondicion("modalidad", m.value as RateType)}
                      className={`p-2 rounded-xl border text-center text-xs font-semibold transition cursor-pointer ${
                        params.condicion.modalidad === m.value
                          ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plazo</span>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {params.condicion.plazoAnios} años
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={30}
                  step={1}
                  value={params.condicion.plazoAnios}
                  onChange={(e) => setCondicion("plazoAnios", Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Interés anual (TIN)</span>
                  <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {params.condicion.tinAnual.toFixed(2)} %
                  </span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={5.5}
                  step={0.05}
                  value={params.condicion.tinAnual}
                  onChange={(e) => setCondicion("tinAnual", Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  ← Paso anterior
                </button>
                <button
                  onClick={nextStep}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? "Calculando..." : "⚡ Calcular Viabilidad Completa"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ── Footer ── */}
      <div className="p-3 bg-white border-t border-slate-200 text-center text-[11px] text-slate-400">
        Paso {activeStep} de 5 {hasCompletedSimulation ? "• Simulación finalizada y reactiva" : "• Completa el asistente para ver el resultado"}
      </div>
    </div>
  );
}
