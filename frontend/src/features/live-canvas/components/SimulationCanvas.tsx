"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";
import { descargarInformePdf } from "@/lib/api-client";
import type { ViabilityStatus } from "@/types/mortgage";

// ── Semáforo ──────────────────────────────────────────────────────────────────

const SEMAFORO_CONFIG: Record<
  ViabilityStatus,
  { bg: string; border: string; text: string; icon: string; label: string }
> = {
  favorable: {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    text: "text-emerald-800",
    icon: "✅",
    label: "Viable — Condiciones favorables",
  },
  condicionado: {
    bg: "bg-amber-50",
    border: "border-amber-400",
    text: "text-amber-800",
    icon: "⚠️",
    label: "Condicionado — Revisa los ratios",
  },
  riesgo_elevado: {
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-800",
    icon: "🔴",
    label: "Riesgo Elevado — Viabilidad comprometida",
  },
};

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  limit,
  unit,
  isPercentage = false,
}: {
  label: string;
  value: number;
  limit?: number;
  unit: string;
  isPercentage?: boolean;
}) {
  const pct = limit ? Math.min((value / limit) * 100, 100) : 0;
  const ok = limit ? value <= limit : true;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {limit && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {ok ? "OK" : "ALTO"}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-800 mb-2">
        {isPercentage ? `${value.toFixed(1)}%` : value.toLocaleString("es-ES")}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </div>
      {limit && (
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              pct <= 60 ? "bg-emerald-400" : pct <= 85 ? "bg-amber-400" : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {limit && (
        <div className="text-[10px] text-slate-400 mt-1">
          Límite recomendado: {isPercentage ? `${limit}%` : limit}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  );
}

// ── Canvas Principal ──────────────────────────────────────────────────────────

export default function SimulationCanvas() {
  const { result, isLoading, error, params } = useMortgageStore();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [leadNombre, setLeadNombre] = useState(params.titularPrincipal.nombre ?? "");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadTelefono, setLeadTelefono] = useState("");
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  async function handleDescargarPdf(e: React.FormEvent) {
    e.preventDefault();
    if (!leadEmail.trim()) return;

    try {
      setDescargandoPdf(true);
      setErrorDescarga(null);

      const blob = await descargarInformePdf(params, {
        nombre: leadNombre.trim() || params.titularPrincipal.nombre,
        email: leadEmail.trim(),
        telefono: leadTelefono.trim() || undefined,
      });

      // Crear enlace de descarga en el navegador
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-viabilidad-hipoteca-${result?.solicitudId ?? "simulacion"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setModalAbierto(false);
    } catch (err: any) {
      setErrorDescarga(err.message || "Error al descargar el informe");
    } finally {
      setDescargandoPdf(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <span className="text-4xl mb-3">⚡</span>
        <h3 className="text-lg font-semibold text-red-700 mb-1">Error de conexión</h3>
        <p className="text-sm text-slate-500">
          No se pudo conectar con el servidor backend en localhost:4000
        </p>
        <code className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">{error}</code>
      </div>
    );
  }

  if (!result && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 text-slate-400">
        <span className="text-5xl mb-4">🏦</span>
        <p className="text-base font-medium">Configura tu hipoteca en el panel izquierdo</p>
        <p className="text-sm mt-1">Los resultados aparecerán aquí en tiempo real</p>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading && !result) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { dictamen, amortizacion } = result!;
  const sem = SEMAFORO_CONFIG[dictamen.semaforo];

  // Datos para gráfico de amortización
  const chartData = amortizacion.primerasCuotas.map((c) => ({
    mes: `M${c.mes}`,
    Capital: Number(c.capital.toFixed(2)),
    Intereses: Number(c.interes.toFixed(2)),
    Pendiente: Number(c.pendiente.toFixed(0)),
  }));

  return (
    <div
      className={`relative h-full overflow-y-auto transition-opacity duration-200 ${
        isLoading ? "opacity-60" : "opacity-100"
      }`}
    >
      {/* ── Semáforo banner ─────────────────────────────────────── */}
      <div className={`border-b-2 ${sem.border} ${sem.bg} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sem.icon}</span>
          <div>
            <h2 className={`font-bold text-base ${sem.text}`}>{sem.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Solicitud {result!.solicitudId.slice(0, 16)}…
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-slate-800">
              {dictamen.cuotaMensualFormateada}
            </div>
            <div className="text-xs text-slate-500">cuota mensual estimada</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Métricas principales 2×2 ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Capital solicitado"
            value={dictamen.capitalPrestado}
            unit="€"
          />
          <MetricCard
            label="Ratio LTV"
            value={dictamen.ratioLtv}
            limit={80}
            unit=""
            isPercentage
          />
          <MetricCard
            label="Ratio DTI"
            value={dictamen.ratioDti}
            limit={35}
            unit=""
            isPercentage
          />
          <MetricCard
            label="Renta disponible"
            value={dictamen.rentaDisponibleTrasCuota}
            unit="€/mes"
          />
        </div>

        {/* ── Alertas ─────────────────────────────────────────────── */}
        {dictamen.alertas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wide">
              ⚠️ Alertas
            </h3>
            <ul className="space-y-1">
              {dictamen.alertas.map((a, i) => (
                <li key={i} className="text-xs text-amber-700">
                  • {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Recomendaciones ─────────────────────────────────────── */}
        {dictamen.recomendaciones.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">
              💡 Recomendaciones
            </h3>
            <ul className="space-y-1">
              {dictamen.recomendaciones.map((r, i) => (
                <li key={i} className="text-xs text-blue-700">
                  • {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Gráfico amortización primeras cuotas ─────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            📉 Desglose cuota — primeros 12 meses
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip
                formatter={(val: number) => `${val.toFixed(0)} €`}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Capital" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Intereses" stackId="a" fill="#fbbf24" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Evolución saldo pendiente ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            📊 Evolución del saldo pendiente
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip
                formatter={(val: number) => `${val.toLocaleString("es-ES")} €`}
                contentStyle={{ fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="Pendiente"
                stroke="#6366f1"
                fill="url(#pendGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Resumen financiero ────────────────────────────────────── */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">💰 Resumen financiero</h3>
          <div className="space-y-2">
            {[
              { label: "Capital prestado", value: dictamen.capitalPrestadoFormateado },
              {
                label: "Total intereses",
                value: `${amortizacion.totalIntereses.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €`,
              },
              {
                label: "Gastos compraventa (ITP/AJD + notaría)",
                value: `${dictamen.totalGastosCompraventa.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €`,
              },
              {
                label: "Fondos propios necesarios",
                value: `${dictamen.totalFondosPropiosRequeridos.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €`,
                highlight: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between text-sm ${
                  row.highlight ? "font-semibold text-slate-800" : "text-slate-600"
                }`}
              >
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Lead Gate CTA ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white text-center shadow-lg">
          <h3 className="font-bold text-base mb-1">¿Quieres el informe completo en PDF?</h3>
          <p className="text-xs text-blue-200 mb-4">
            Incluye cuadro de amortización, dictamen de viabilidad, desglose de impuestos autonómicos y advertencias legales.
          </p>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-white text-blue-700 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-blue-50 transition shadow transform hover:-translate-y-0.5 active:translate-y-0"
          >
            📄 Descargar PDF gratis
          </button>
          <p className="text-[10px] text-blue-300 mt-2">Sin compromiso · Recíbelo de inmediato</p>
        </div>
      </div>

      {/* ── Modal Lead Gate para descarga de PDF ──────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📑</span> Descargar Informe Completo
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Introduce tus datos de contacto para generar y descargar tu informe de viabilidad hipotecaria personalizado en PDF.
            </p>

            <form onSubmit={handleDescargarPdf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={leadNombre}
                  onChange={(e) => setLeadNombre(e.target.value)}
                  placeholder="Tu nombre y apellidos"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={leadTelefono}
                  onChange={(e) => setLeadTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorDescarga && (
                <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 border border-red-200">
                  {errorDescarga}
                </div>
              )}

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={descargandoPdf}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow disabled:opacity-50"
                >
                  {descargandoPdf ? (
                    <>
                      <span className="animate-spin inline-block">⏳</span>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      Descargar PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
