"use client";

import React, { useState } from "react";

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface PolicyRow {
  id: string;
  label: string;
  value: string | number;
  type: "percent" | "number" | "text";
  min?: number;
  max?: number;
  unit?: string;
}

interface EuriborRow {
  fecha: string;
  valor: string;
}

interface RegionTaxRow {
  code: string;
  ccaa: string;
  itpPct: number;
  ajdPct: number;
}

// ── Datos iniciales ────────────────────────────────────────────────────────────

const INITIAL_POLICIES: PolicyRow[] = [
  { id: "ltv_max", label: "LTV máximo", value: 80, type: "percent", min: 50, max: 100, unit: "%" },
  { id: "dti_max", label: "DTI máximo", value: 35, type: "percent", min: 20, max: 60, unit: "%" },
  { id: "ltv_alert", label: "Umbral alerta LTV", value: 75, type: "percent", min: 50, max: 90, unit: "%" },
  { id: "dti_alert", label: "Umbral alerta DTI", value: 30, type: "percent", min: 20, max: 55, unit: "%" },
  { id: "plazo_max", label: "Plazo máximo", value: 30, type: "number", min: 5, max: 40, unit: "años" },
  { id: "ahorros_min_pct", label: "Ahorros mínimos sobre precio", value: 20, type: "percent", min: 10, max: 40, unit: "%" },
];

const INITIAL_EURIBOR: EuriborRow[] = [
  { fecha: "2024-01", valor: "3.609" },
  { fecha: "2024-06", valor: "3.650" },
  { fecha: "2024-12", valor: "2.431" },
  { fecha: "2025-06", valor: "2.103" },
  { fecha: "2025-12", valor: "2.048" },
];

const INITIAL_TAXES: RegionTaxRow[] = [
  { code: "MD", ccaa: "Madrid", itpPct: 6.0, ajdPct: 0.75 },
  { code: "CT", ccaa: "Cataluña", itpPct: 10.0, ajdPct: 1.5 },
  { code: "AN", ccaa: "Andalucía", itpPct: 7.0, ajdPct: 1.2 },
  { code: "VC", ccaa: "C. Valenciana", itpPct: 10.0, ajdPct: 1.5 },
  { code: "PV", ccaa: "País Vasco", itpPct: 4.0, ajdPct: 0.5 },
  { code: "GA", ccaa: "Galicia", itpPct: 8.0, ajdPct: 1.0 },
  { code: "CL", ccaa: "Castilla y León", itpPct: 8.0, ajdPct: 1.0 },
  { code: "CM", ccaa: "Castilla-La Mancha", itpPct: 9.0, ajdPct: 1.0 },
  { code: "IB", ccaa: "Baleares", itpPct: 8.0, ajdPct: 1.2 },
  { code: "CN", ccaa: "Canarias", itpPct: 6.5, ajdPct: 0.75 },
];

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <span>{icon}</span> {title}
      </h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${
        saved
          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {saved ? "✓ Guardado" : "Guardar cambios"}
    </button>
  );
}

// ── Pestaña: Políticas de Riesgo ──────────────────────────────────────────────

function PoliticasTab() {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [saved, setSaved] = useState(false);

  function update(id: string, val: number) {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, value: val } : p)));
    setSaved(false);
  }

  return (
    <div>
      <SectionHeader
        icon="⚖️"
        title="Políticas de Riesgo"
        subtitle="Umbrales que determinan el semáforo de viabilidad (LTV, DTI, ahorros mínimos)."
      />
      <div className="space-y-5">
        {policies.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700">{p.label}</label>
              <span className="text-lg font-bold text-blue-700">
                {p.value}
                {p.unit}
              </span>
            </div>
            {(p.type === "percent" || p.type === "number") && (
              <>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.type === "percent" ? 1 : 1}
                  value={p.value as number}
                  onChange={(e) => update(p.id, Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>
                    {p.min}
                    {p.unit}
                  </span>
                  <span>
                    {p.max}
                    {p.unit}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-5">
        <SaveButton onClick={() => setSaved(true)} saved={saved} />
      </div>
      {saved && (
        <div className="mt-3 text-xs text-slate-500 text-right">
          ℹ️ En producción, estos valores se persistirán en base de datos y recargará el motor de scoring.
        </div>
      )}
    </div>
  );
}

// ── Pestaña: Tipos de Interés / Euribor ──────────────────────────────────────

function EuriborTab() {
  const [rows, setRows] = useState(INITIAL_EURIBOR);
  const [saved, setSaved] = useState(false);
  const [newFecha, setNewFecha] = useState("");
  const [newValor, setNewValor] = useState("");

  function updateValor(idx: number, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, valor: val } : r)));
    setSaved(false);
  }

  function addRow() {
    if (!newFecha || !newValor) return;
    setRows((prev) => [...prev, { fecha: newFecha, valor: newValor }]);
    setNewFecha("");
    setNewValor("");
    setSaved(false);
  }

  return (
    <div>
      <SectionHeader
        icon="📊"
        title="Histórico Euribor"
        subtitle="Tabla de referencia del Euribor mensual (%) para cálculo de hipotecas variables."
      />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-right">Euribor (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-700">{row.fecha}</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={row.valor}
                    step={0.001}
                    onChange={(e) => updateValor(i, e.target.value)}
                    className="w-24 text-right border border-slate-200 rounded px-2 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Añadir fila */}
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 mb-4">
        <h4 className="text-xs font-semibold text-slate-600 mb-3">+ Añadir registro</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="YYYY-MM"
            value={newFecha}
            onChange={(e) => setNewFecha(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="3.250"
            step={0.001}
            value={newValor}
            onChange={(e) => setNewValor(e.target.value)}
            className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addRow}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Añadir
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={() => setSaved(true)} saved={saved} />
      </div>
    </div>
  );
}

// ── Pestaña: Tablas Fiscales Autonómicas ──────────────────────────────────────

function TablasFiscalesTab() {
  const [taxes, setTaxes] = useState(INITIAL_TAXES);
  const [saved, setSaved] = useState(false);

  function update(code: string, field: "itpPct" | "ajdPct", val: number) {
    setTaxes((prev) =>
      prev.map((r) => (r.code === code ? { ...r, [field]: val } : r))
    );
    setSaved(false);
  }

  return (
    <div>
      <SectionHeader
        icon="🗺️"
        title="Tablas Fiscales Autonómicas"
        subtitle="ITP (Impuesto Transmisiones Patrimoniales) y AJD (Actos Jurídicos Documentados) por CCAA."
      />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">CCAA</th>
              <th className="px-4 py-2 text-center">ITP (%)</th>
              <th className="px-4 py-2 text-center">AJD (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taxes.map((row) => (
              <tr key={row.code} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mr-2">
                    {row.code}
                  </span>
                  {row.ccaa}
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="number"
                    value={row.itpPct}
                    step={0.5}
                    min={0}
                    max={15}
                    onChange={(e) => update(row.code, "itpPct", Number(e.target.value))}
                    className="w-16 text-center border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="number"
                    value={row.ajdPct}
                    step={0.05}
                    min={0}
                    max={5}
                    onChange={(e) => update(row.code, "ajdPct", Number(e.target.value))}
                    className="w-16 text-center border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4">
        <SaveButton onClick={() => setSaved(true)} saved={saved} />
      </div>
    </div>
  );
}

// ── Vista Principal ───────────────────────────────────────────────────────────

type AdminTab = "politicas" | "euribor" | "fiscalidad";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "politicas", label: "Políticas de riesgo", icon: "⚖️" },
  { id: "euribor", label: "Euribor / Tipos", icon: "📊" },
  { id: "fiscalidad", label: "Tablas fiscales", icon: "🗺️" },
];

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>("politicas");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">
          🏛️ Portal de Administración
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuración de parámetros de riesgo, tipos de interés y tablas fiscales autonómicas
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="transition-all">
          {activeTab === "politicas" && <PoliticasTab />}
          {activeTab === "euribor" && <EuriborTab />}
          {activeTab === "fiscalidad" && <TablasFiscalesTab />}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          🔒 Los cambios en producción requieren rol <code>ADMIN</code>. Actualmente en modo demo.
        </div>
      </div>
    </div>
  );
}
