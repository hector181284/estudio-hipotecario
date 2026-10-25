"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  obtenerPoliticas,
  actualizarPoliticas,
  obtenerEuribor,
  guardarEuribor,
  obtenerTributos,
  actualizarTributos,
  TablaTributosDto,
} from "@/lib/api-client";

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

// ── Datos iniciales (fallback si backend no responde) ──────────────────────────

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

function SaveButton({ onClick, saved, saving }: { onClick: () => void; saved: boolean; saving?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm ${
        saved
          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
          : saving
          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {saving ? "Guardando en BD..." : saved ? "✓ Guardado en PostgreSQL" : "Guardar cambios"}
    </button>
  );
}

// ── Pestaña: Políticas de Riesgo ──────────────────────────────────────────────

function PoliticasTab() {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    obtenerPoliticas()
      .then((data) => {
        if (!mounted) return;
        setPolicies([
          { id: "ltv_max", label: "LTV máximo", value: Math.round(data.ltvMaximo * 100), type: "percent", min: 50, max: 100, unit: "%" },
          { id: "dti_max", label: "DTI máximo", value: Math.round(data.dtiMaximo * 100), type: "percent", min: 20, max: 60, unit: "%" },
          { id: "ltv_alert", label: "Umbral alerta LTV", value: Math.round(data.ltvAlerta * 100), type: "percent", min: 50, max: 90, unit: "%" },
          { id: "dti_alert", label: "Umbral alerta DTI", value: Math.round(data.dtiAlerta * 100), type: "percent", min: 20, max: 55, unit: "%" },
          { id: "plazo_max", label: "Plazo máximo", value: data.plazoMaxAnios, type: "number", min: 5, max: 40, unit: "años" },
          { id: "ahorros_min_pct", label: "Ahorros mínimos sobre precio", value: Math.round(data.ahorrosMinPct * 100), type: "percent", min: 10, max: 40, unit: "%" },
        ]);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Usando fallback de políticas:", err);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  function update(id: string, val: number) {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, value: val } : p)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const getVal = (id: string) => {
        const found = policies.find((p) => p.id === id);
        return found ? Number(found.value) : 0;
      };
      await actualizarPoliticas({
        ltvMaximo: getVal("ltv_max") / 100,
        dtiMaximo: getVal("dti_max") / 100,
        ltvAlerta: getVal("ltv_alert") / 100,
        dtiAlerta: getVal("dti_alert") / 100,
        plazoMaxAnios: getVal("plazo_max"),
        ahorrosMinPct: getVal("ahorros_min_pct") / 100,
      });
      setSaved(true);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Error al persistir políticas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        icon="⚖️"
        title="Políticas de Riesgo"
        subtitle="Umbrales que determinan el semáforo de viabilidad (LTV, DTI, ahorros mínimos). Persistidos en PostgreSQL."
      />
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          ⚠️ {errorMsg}
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Cargando políticas desde la base de datos...</div>
      ) : (
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
                    step={1}
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
      )}
      <div className="flex justify-end mt-5">
        <SaveButton onClick={handleSave} saved={saved} saving={saving} />
      </div>
      {saved && (
        <div className="mt-3 text-xs text-emerald-600 text-right">
          ✓ Configuración sincronizada en tiempo real con PostgreSQL (tabla <code>PoliticaRiesgo</code>).
        </div>
      )}
    </div>
  );
}

// ── Pestaña: Tipos de Interés / Euribor ──────────────────────────────────────

function EuriborTab() {
  const [rows, setRows] = useState(INITIAL_EURIBOR);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newFecha, setNewFecha] = useState("");
  const [newValor, setNewValor] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEuribor = useCallback(async () => {
    try {
      const data = await obtenerEuribor();
      if (data && data.length > 0) {
        setRows(data.map((d) => ({ fecha: d.fecha, valor: d.valor.toFixed(3) })));
      }
    } catch (err) {
      console.warn("Usando fallback de Euribor:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEuribor();
  }, [fetchEuribor]);

  function updateValor(idx: number, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, valor: val } : r)));
    setSaved(false);
  }

  async function addRow() {
    if (!newFecha || !newValor) return;
    const valNum = parseFloat(newValor);
    if (isNaN(valNum)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await guardarEuribor({ fecha: newFecha, valor: valNum });
      await fetchEuribor();
      setNewFecha("");
      setNewValor("");
      setSaved(true);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg(null);
    try {
      for (const row of rows) {
        const val = parseFloat(row.valor);
        if (!isNaN(val)) {
          await guardarEuribor({ fecha: row.fecha, valor: val });
        }
      }
      setSaved(true);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        icon="📊"
        title="Histórico Euribor"
        subtitle="Tabla de referencia del Euribor mensual (%) para cálculo de hipotecas variables. Persistida en PostgreSQL."
      />
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          ⚠️ {errorMsg}
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Cargando histórico desde la base de datos...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Fecha (Mes)</th>
                <th className="px-4 py-2 text-right">Euribor (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-slate-700">{row.fecha}</td>
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
      )}

      {/* Añadir fila */}
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 mb-4">
        <h4 className="text-xs font-semibold text-slate-600 mb-3">+ Añadir nuevo registro mensual</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="YYYY-MM (ej. 2026-03)"
            value={newFecha}
            onChange={(e) => setNewFecha(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="2.150"
            step={0.001}
            value={newValor}
            onChange={(e) => setNewValor(e.target.value)}
            className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addRow}
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            Añadir a BD
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton onClick={handleSaveAll} saved={saved} saving={saving} />
      </div>
    </div>
  );
}

// ── Pestaña: Tablas Fiscales Autonómicas ──────────────────────────────────────

function TablasFiscalesTab() {
  const [taxes, setTaxes] = useState(INITIAL_TAXES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    obtenerTributos()
      .then((data) => {
        if (!mounted) return;
        if (data && data.length > 0) {
          setTaxes(
            data.map((t) => ({
              code: t.codigoCcaa,
              ccaa: t.nombre,
              itpPct: Math.round(t.itpPct * 1000) / 10,
              ajdPct: Math.round(t.ajdPct * 1000) / 10,
            }))
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Usando fallback de tablas fiscales:", err);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  function update(code: string, field: "itpPct" | "ajdPct", val: number) {
    setTaxes((prev) =>
      prev.map((r) => (r.code === code ? { ...r, [field]: val } : r))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const dtos: TablaTributosDto[] = taxes.map((r) => ({
        codigoCcaa: r.code,
        nombre: r.ccaa,
        itpPct: r.itpPct / 100,
        ajdPct: r.ajdPct / 100,
      }));
      await actualizarTributos(dtos);
      setSaved(true);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        icon="🗺️"
        title="Tablas Fiscales Autonómicas"
        subtitle="ITP (Impuesto Transmisiones Patrimoniales) y AJD (Actos Jurídicos Documentados) por CCAA. Persistidas en PostgreSQL."
      />
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          ⚠️ {errorMsg}
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Cargando tablas fiscales desde la base de datos...</div>
      ) : (
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
                      step={0.1}
                      min={0}
                      max={20}
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
      )}
      <div className="flex justify-end mt-4">
        <SaveButton onClick={handleSave} saved={saved} saving={saving} />
      </div>
      {saved && (
        <div className="mt-3 text-xs text-emerald-600 text-right">
          ✓ Tipos impositivos guardados en PostgreSQL (tabla <code>TablaTributosCcaa</code>).
        </div>
      )}
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
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            🏛️ Portal de Administración
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configuración de parámetros de riesgo, tipos de interés y tablas fiscales autonómicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostgreSQL Conectado
          </span>
        </div>
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
          🔒 Los cambios persisten directamente en la base de datos PostgreSQL local.
        </div>
      </div>
    </div>
  );
}
