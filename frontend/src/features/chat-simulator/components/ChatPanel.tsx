"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";
import type {
  PropertyType,
  LoanPurpose,
  EmploymentType,
  RateType,
} from "@/types/mortgage";

// ── Opciones de Comunidades Autónomas ──────────────────────────────────────────
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

export default function ChatPanel() {
  const { params, setParam, setCondicion, setTitular, loadScenario, reset, result, isLoading } = useMortgageStore();

  // Nivel de progreso en la conversación (hasta qué paso se ha desbloqueado)
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(5);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll suave al final del chat cuando se desbloquea un nuevo paso
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [maxUnlockedStep]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Cabecera de estado del Asistente ── */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              🏦
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Asesor Hipotecario IA</h2>
            <p className="text-[11px] text-slate-400">
              {isLoading ? "Recalculando viabilidad en tiempo real..." : "Simulación activa y conectada"}
            </p>
          </div>
        </div>

        {/* Botones de Escenarios Rápidos */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              loadScenario("viable");
              setMaxUnlockedStep(5);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
          >
            ✅ Viable
          </button>
          <button
            onClick={() => {
              loadScenario("ltv_alert");
              setMaxUnlockedStep(5);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
          >
            ⚠️ LTV Alto
          </button>
          <button
            onClick={() => {
              loadScenario("dti_alert");
              setMaxUnlockedStep(5);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition cursor-pointer"
          >
            🔴 DTI Alto
          </button>
          <button
            onClick={() => {
              reset();
              setMaxUnlockedStep(1);
            }}
            title="Reiniciar chat"
            className="text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer ml-1"
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Hilo continuo del Chat ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        
        {/* ================= PASO 1 ================= */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 max-w-[90%]">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
              IA
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-sm text-slate-800">
              <p className="font-semibold text-blue-900 mb-1">¡Hola! Vamos a calcular la viabilidad de tu hipoteca.</p>
              <p className="text-slate-600">Para empezar, ¿cuál es la finalidad de la vivienda y qué tipo de inmueble es?</p>
            </div>
          </div>

          <div className="ml-9 space-y-3 bg-white/60 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Finalidad</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "primera_vivienda", label: "🏡 Habitual", desc: "Hasta 80% LTV" },
                  { value: "segunda_residencia", label: "🏖️ Segunda", desc: "Hasta 70% LTV" },
                  { value: "inversion", label: "📈 Inversión", desc: "Alquiler" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setParam("finalidad", f.value as LoanPurpose);
                      if (maxUnlockedStep < 2) setMaxUnlockedStep(2);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      params.finalidad === f.value
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-xs ring-1 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-xs font-semibold">{f.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Tipo de Inmueble</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "segunda_mano", label: "🔑 Segunda Mano", desc: "Tributa por ITP" },
                  { value: "obra_nueva", label: "🏗️ Obra Nueva", desc: "Tributa por IVA + AJD" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setParam("tipoVivienda", t.value as PropertyType);
                      if (maxUnlockedStep < 2) setMaxUnlockedStep(2);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      params.tipoVivienda === t.value
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-xs ring-1 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================= PASO 2 ================= */}
        {maxUnlockedStep >= 2 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-sm text-slate-800">
                <p>Perfecto. ¿Cuánto cuesta la vivienda y en qué Comunidad Autónoma está ubicada?</p>
                <p className="text-xs text-slate-500 mt-1">Los impuestos cambian significativamente según la autonomía.</p>
              </div>
            </div>

            <div className="ml-9 space-y-4 bg-white/60 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Precio de compraventa:</label>
                  <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {params.precioInmueble.toLocaleString("es-ES")} €
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={900000}
                  step={5000}
                  value={params.precioInmueble}
                  onChange={(e) => {
                    setParam("precioInmueble", Number(e.target.value));
                    if (maxUnlockedStep < 3) setMaxUnlockedStep(3);
                  }}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>50.000 €</span>
                  <span>500.000 €</span>
                  <span>900.000 €</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Comunidad Autónoma:</label>
                <select
                  value={params.comunidadAutonoma}
                  onChange={(e) => {
                    setParam("comunidadAutonoma", e.target.value);
                    if (maxUnlockedStep < 3) setMaxUnlockedStep(3);
                  }}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {CCAA_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 3 ================= */}
        {maxUnlockedStep >= 3 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-sm text-slate-800">
                <p>¿Qué cantidad de ahorros propios tienes disponibles para aportar?</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ten en cuenta que los bancos financian hasta el 80% del valor, por lo que necesitarás aproximadamente un 20% de entrada más un 10% adicional para impuestos y gastos.
                </p>
              </div>
            </div>

            <div className="ml-9 space-y-3 bg-white/60 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Ahorros aportados:</label>
                <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                  {params.ahorrosAportados.toLocaleString("es-ES")} €
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(params.precioInmueble * 0.7, 150000)}
                step={2500}
                value={params.ahorrosAportados}
                onChange={(e) => {
                  setParam("ahorrosAportados", Number(e.target.value));
                  if (maxUnlockedStep < 4) setMaxUnlockedStep(4);
                }}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 € (100% financiación)</span>
                <span>{(params.precioInmueble * 0.3).toLocaleString("es-ES")} € (30% recomendado)</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 4 ================= */}
        {maxUnlockedStep >= 4 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-sm text-slate-800">
                <p>Ahora analicemos la solvencia y capacidad de pago mensual.</p>
                <p className="text-xs text-slate-500 mt-1">
                  El Banco de España exige que la cuota de la hipoteca junto a tus otros préstamos no supere el 35% de tus ingresos netos mensuales (Ratio DTI).
                </p>
              </div>
            </div>

            <div className="ml-9 space-y-4 bg-white/60 p-4 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de contrato</label>
                  <select
                    value={params.titularPrincipal.contrato}
                    onChange={(e) => setTitular("contrato", e.target.value as EmploymentType)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-800 outline-none"
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="funcionario">Funcionario</option>
                    <option value="autonomo">Autónomo</option>
                    <option value="temporal">Temporal</option>
                    <option value="pensionista">Pensionista</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Ingresos netos/mes</label>
                  <div className="flex items-center border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                      type="number"
                      step={50}
                      value={params.titularPrincipal.ingresosNetosMensuales}
                      onChange={(e) => {
                        setTitular("ingresosNetosMensuales", Number(e.target.value));
                        if (maxUnlockedStep < 5) setMaxUnlockedStep(5);
                      }}
                      className="w-full text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-[11px] text-slate-400 ml-1">€/mes</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cuotas de otros préstamos o deudas vigentes
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                  <input
                    type="number"
                    step={25}
                    value={params.titularPrincipal.deudasMensualesVigentes}
                    onChange={(e) => setTitular("deudasMensualesVigentes", Number(e.target.value))}
                    className="w-full text-xs font-bold text-slate-800 outline-none"
                  />
                  <span className="text-[11px] text-slate-400 ml-1">€/mes</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Préstamos de coche, tarjetas de crédito, etc.</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 5 ================= */}
        {maxUnlockedStep >= 5 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start gap-2.5 max-w-[90%]">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                IA
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-sm text-slate-800">
                <p className="font-semibold text-slate-900">Por último, ajustemos las condiciones financieras de la hipoteca.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Prueba a mover el plazo o el tipo de interés para ver cómo reacciona tu cuota mensual en el panel derecho.
                </p>
              </div>
            </div>

            <div className="ml-9 space-y-4 bg-white/60 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Modalidad</span>
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
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Plazo:</label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
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
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>10 años</span>
                  <span>20 años</span>
                  <span>30 años</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Tipo de interés anual (TIN):</label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
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
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1.50 %</span>
                  <span>3.00 %</span>
                  <span>5.50 %</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ── Barra inferior informativa ── */}
      <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Cálculos sincronizados en tiempo real
        </span>
        <span className="font-semibold text-slate-700">
          Cuota: {result ? result.dictamen.cuotaMensualFormateada : "..."}
        </span>
      </div>
    </div>
  );
}
