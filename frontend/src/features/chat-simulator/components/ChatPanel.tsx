"use client";

import React, { useState } from "react";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";
import type {
  PropertyType,
  LoanPurpose,
  EmploymentType,
  RateType,
} from "@/types/mortgage";

// ── Constantes ────────────────────────────────────────────────────────────────

const CCAA_OPTIONS = [
  { value: "MD", label: "Madrid" },
  { value: "CT", label: "Cataluña" },
  { value: "AN", label: "Andalucía" },
  { value: "VC", label: "C. Valenciana" },
  { value: "PV", label: "País Vasco" },
  { value: "GA", label: "Galicia" },
  { value: "CL", label: "Castilla y León" },
  { value: "CM", label: "Castilla-La Mancha" },
  { value: "IB", label: "Baleares" },
  { value: "CN", label: "Canarias" },
];

const STEPS = [
  { id: 1, label: "Propósito", icon: "🏠" },
  { id: 2, label: "Inmueble", icon: "📐" },
  { id: 3, label: "Ahorros", icon: "💰" },
  { id: 4, label: "Ingresos", icon: "💼" },
  { id: 5, label: "Hipoteca", icon: "📋" },
];

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-slate-200">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <button
            className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 transition-all ${
              step.id === current
                ? "text-blue-700"
                : step.id < current
                ? "text-emerald-600"
                : "text-slate-400"
            }`}
          >
            <span className="text-base">{step.id < current ? "✅" : step.icon}</span>
            <span className="text-[10px] font-medium leading-tight text-center truncate w-full">
              {step.label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px flex-1 min-w-[8px] max-w-[24px] transition-all ${
                step.id < current ? "bg-emerald-400" : "bg-slate-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow">
        A
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 shadow-sm max-w-[85%]">
        {text}
      </div>
    </div>
  );
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-blue-700">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 text-sm px-3 py-2 bg-white text-slate-800 outline-none"
        />
        <span className="bg-slate-100 px-3 py-2 text-xs text-slate-500 border-l border-slate-200">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ── Steps Content ─────────────────────────────────────────────────────────────

function Step1Proposito() {
  const { params, setParam } = useMortgageStore();

  return (
    <div>
      <BotBubble text="¡Hola! Soy tu asistente hipotecario. ¿Para qué necesitas la hipoteca?" />
      <div className="grid grid-cols-1 gap-2 ml-9 mb-4">
        {(
          [
            { value: "primera_vivienda", label: "🏡 Primera vivienda", desc: "Residencia habitual" },
            { value: "segunda_residencia", label: "🏖️ Segunda residencia", desc: "Vacacional o inversión" },
            { value: "inversion", label: "📈 Inversión", desc: "Para alquilar o plusvalías" },
          ] as { value: LoanPurpose; label: string; desc: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setParam("finalidad", opt.value)}
            className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${
              params.finalidad === opt.value
                ? "border-blue-500 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>
      <BotBubble text="¿Tipo de vivienda?" />
      <div className="grid grid-cols-2 gap-2 ml-9">
        {(
          [
            { value: "segunda_mano", label: "🔑 Segunda mano" },
            { value: "obra_nueva", label: "🏗️ Obra nueva" },
          ] as { value: PropertyType; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setParam("tipoVivienda", opt.value)}
            className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
              params.tipoVivienda === opt.value
                ? "border-blue-500 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2Inmueble() {
  const { params, setParam } = useMortgageStore();

  return (
    <div>
      <BotBubble text="¿Cuánto cuesta el inmueble y dónde está?" />
      <div className="ml-9">
        <SliderInput
          label="Precio del inmueble"
          value={params.precioInmueble}
          min={50000}
          max={1000000}
          step={5000}
          format={(v) => `${v.toLocaleString("es-ES")} €`}
          onChange={(v) => setParam("precioInmueble", v)}
        />
        <SelectInput
          label="Comunidad Autónoma"
          value={params.comunidadAutonoma}
          options={CCAA_OPTIONS}
          onChange={(v) => setParam("comunidadAutonoma", v)}
        />
      </div>
    </div>
  );
}

function Step3Ahorros() {
  const { params, setParam } = useMortgageStore();
  const minRecom = Math.round(params.precioInmueble * 0.3);

  return (
    <div>
      <BotBubble text="¿Cuánto puedes aportar de tus ahorros? Recomendamos al menos un 30% (gastos + entrada)." />
      <div className="ml-9">
        <SliderInput
          label="Ahorros disponibles"
          value={params.ahorrosAportados}
          min={0}
          max={params.precioInmueble}
          step={1000}
          format={(v) => `${v.toLocaleString("es-ES")} €`}
          onChange={(v) => setParam("ahorrosAportados", v)}
        />
        {params.ahorrosAportados < minRecom && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            ⚠️ Para una financiación cómoda se recomienda tener{" "}
            <strong>{minRecom.toLocaleString("es-ES")} €</strong> (30%). El resultado reflejará
            la viabilidad real con tus ahorros actuales.
          </div>
        )}
      </div>
    </div>
  );
}

function Step4Ingresos() {
  const { params, setTitular } = useMortgageStore();

  return (
    <div>
      <BotBubble text="Cuéntame sobre tu situación laboral y económica." />
      <div className="ml-9">
        <SelectInput
          label="Tipo de contrato"
          value={params.titularPrincipal.contrato}
          options={[
            { value: "indefinido", label: "Indefinido" },
            { value: "funcionario", label: "Funcionario" },
            { value: "autonomo", label: "Autónomo" },
            { value: "temporal", label: "Temporal" },
            { value: "pensionista", label: "Pensionista" },
          ]}
          onChange={(v) => setTitular("contrato", v as EmploymentType)}
        />
        <NumberInput
          label="Ingresos netos mensuales"
          value={params.titularPrincipal.ingresosNetosMensuales}
          unit="€/mes"
          onChange={(v) => setTitular("ingresosNetosMensuales", v)}
        />
        <NumberInput
          label="Cuotas de deudas vigentes (coches, otros préstamos…)"
          value={params.titularPrincipal.deudasMensualesVigentes}
          unit="€/mes"
          onChange={(v) => setTitular("deudasMensualesVigentes", v)}
        />
      </div>
    </div>
  );
}

function Step5Hipoteca() {
  const { params, setCondicion } = useMortgageStore();

  return (
    <div>
      <BotBubble text="Por último, configura las condiciones de la hipoteca." />
      <div className="ml-9">
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-2">Modalidad de tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "fijo", label: "🔒 Fijo" },
                { value: "variable", label: "📊 Variable" },
                { value: "mixto", label: "🔄 Mixto" },
              ] as { value: RateType; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCondicion("modalidad", opt.value)}
                className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                  params.condicion.modalidad === opt.value
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <SliderInput
          label="Plazo de amortización"
          value={params.condicion.plazoAnios}
          min={5}
          max={30}
          step={1}
          format={(v) => `${v} años`}
          onChange={(v) => setCondicion("plazoAnios", v)}
        />

        <SliderInput
          label="TIN anual"
          value={params.condicion.tinAnual}
          min={0.5}
          max={6}
          step={0.05}
          format={(v) => `${v.toFixed(2)}%`}
          onChange={(v) => setCondicion("tinAnual", v)}
        />
      </div>
    </div>
  );
}

// ── Panel Principal ────────────────────────────────────────────────────────────

export default function ChatPanel() {
  const { params, loadScenario, reset, activeStep } = useMortgageStore();
  const [step, setStep] = useState(activeStep);

  const totalSteps = STEPS.length;

  function renderStep() {
    switch (step) {
      case 1: return <Step1Proposito />;
      case 2: return <Step2Inmueble />;
      case 3: return <Step3Ahorros />;
      case 4: return <Step4Ingresos />;
      case 5: return <Step5Hipoteca />;
      default: return null;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress stepper */}
      <StepProgress current={step} />

      {/* Scenarios pill row */}
      <div className="flex gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] text-slate-500 self-center whitespace-nowrap">Demo:</span>
        {(["viable", "ltv_alert", "dti_alert"] as const).map((s) => (
          <button
            key={s}
            onClick={() => loadScenario(s)}
            className="text-[10px] px-2 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-200 whitespace-nowrap transition"
          >
            {s === "viable" ? "✅ Viable" : s === "ltv_alert" ? "⚠️ LTV alto" : "🔴 DTI alto"}
          </button>
        ))}
        <button
          onClick={reset}
          className="text-[10px] px-2 py-1 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-200 whitespace-nowrap transition ml-auto"
        >
          ↺ Reset
        </button>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition"
        >
          ← Anterior
        </button>
        <span className="text-xs text-slate-400">
          {step}/{totalSteps}
        </span>
        {step < totalSteps ? (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Siguiente →
          </button>
        ) : (
          <button className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">
            Ver resultado ✓
          </button>
        )}
      </div>
    </div>
  );
}
