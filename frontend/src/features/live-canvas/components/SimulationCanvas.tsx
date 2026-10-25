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

const SEMAFORO_CONFIG: Record<
  ViabilityStatus,
  { bg: string; border: string; text: string; badge: string; icon: string; label: string; desc: string }
> = {
  favorable: {
    bg: "bg-emerald-50/90",
    border: "border-emerald-300",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "✅",
    label: "OPERACIÓN FAVORABLE",
    desc: "Cumples con todos los criterios de riesgo bancario estándar (LTV ≤ 80% y DTI ≤ 35%).",
  },
  condicionado: {
    bg: "bg-amber-50/90",
    border: "border-amber-300",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "⚠️",
    label: "OPERACIÓN CONDICIONADA",
    desc: "Cerca de los límites recomendados. Podrías requerir un avalista o aportar más ahorro.",
  },
  riesgo_elevado: {
    bg: "bg-red-50/90",
    border: "border-red-300",
    text: "text-red-900",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
    label: "RIESGO ELEVADO",
    desc: "El porcentaje financiado o el ratio de endeudamiento supera los máximos prudenciales.",
  },
};

export default function SimulationCanvas() {
  const { result, isLoading, error, params, activeStep, hasCompletedSimulation, nextStep, reset } = useMortgageStore();
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

  // Si hay error en la petición backend
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <span className="text-4xl mb-3">⚡</span>
        <h3 className="text-lg font-bold text-red-700 mb-1">Error de conexión</h3>
        <p className="text-sm text-slate-500">No se pudo conectar con el servidor backend en localhost:4000</p>
        <code className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">{error}</code>
      </div>
    );
  }

  // ── ESTADO INICIAL / EN PROGRESO: El usuario está completando el chat paso a paso ──
  if (!hasCompletedSimulation || !result) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            {activeStep === 1 && "🏠"}
            {activeStep === 2 && "📍"}
            {activeStep === 3 && "💰"}
            {activeStep === 4 && "💼"}
            {activeStep === 5 && "⚡"}
          </div>

          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Paso {activeStep} de 5
            </span>
            <h2 className="text-lg font-black text-slate-800 mt-2">
              {activeStep === 1 && "Define el Inmueble"}
              {activeStep === 2 && "Precio y Comunidad"}
              {activeStep === 3 && "Ahorros y Entrada"}
              {activeStep === 4 && "Capacidad de Pago"}
              {activeStep === 5 && "Condiciones Financieras"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {activeStep === 1 && "Indica si la vivienda será tu residencia habitual y si es de segunda mano u obra nueva en el panel izquierdo."}
              {activeStep === 2 && "Introduce el valor de compraventa y la Comunidad Autónoma para calcular los impuestos fiscales autonómicos."}
              {activeStep === 3 && "Indica tus fondos propios para analizar el porcentaje de financiación necesario (LTV)."}
              {activeStep === 4 && "Introduce tus ingresos y cuotas actuales para evaluar tu ratio de endeudamiento bancario (DTI)."}
              {activeStep === 5 && "Selecciona el plazo y tipo de interés. Al finalizar, desbloquearás el dictamen oficial y la amortización."}
            </p>
          </div>

          {/* Tarjeta resumen de datos configurados hasta ahora */}
          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Precio inmueble:</span>
              <span className="font-bold text-slate-800">{params.precioInmueble.toLocaleString("es-ES")} €</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Comunidad:</span>
              <span className="font-bold text-slate-800">{params.comunidadAutonoma}</span>
            </div>
            {activeStep >= 3 && (
              <div className="flex justify-between text-slate-600">
                <span>Ahorros aportados:</span>
                <span className="font-bold text-slate-800">{params.ahorrosAportados.toLocaleString("es-ES")} €</span>
              </div>
            )}
            {activeStep >= 4 && (
              <div className="flex justify-between text-slate-600">
                <span>Ingresos netos:</span>
                <span className="font-bold text-slate-800">{params.titularPrincipal.ingresosNetosMensuales.toLocaleString("es-ES")} €/mes</span>
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            👉 Continúa respondiendo en el chat de la izquierda
          </div>
        </div>
      </div>
    );
  }

  // ── ESTADO FINAL: SIMULACIÓN DESBLOQUEADA Y REACTIVA ──
  const { dictamen, amortizacion } = result;
  const sem = SEMAFORO_CONFIG[dictamen.semaforo];

  const chartData = amortizacion.primerasCuotas.map((c) => ({
    mes: `M${c.mes}`,
    Capital: Number(c.capital.toFixed(2)),
    Intereses: Number(c.interes.toFixed(2)),
    Pendiente: Number(c.pendiente.toFixed(0)),
  }));

  const ltvAlerta = dictamen.ratioLtv > 80;
  const dtiAlerta = dictamen.ratioDti > 35;

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50/50">
      
      {/* ── Banner Superior Semáforo Reactivo ── */}
      <div className={`p-6 border-b transition-colors duration-300 ${sem.bg} ${sem.border}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="text-3xl shrink-0 p-1 bg-white rounded-xl shadow-xs">{sem.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-black text-lg tracking-tight ${sem.text}`}>{sem.label}</h2>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${sem.badge}`}>
                  Dictamen IA
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-md">{sem.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={reset}
              title="Borrar datos y reiniciar estudio"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-700 text-xs font-bold rounded-xl border border-slate-200/80 shadow-xs transition cursor-pointer active:scale-95"
            >
              <span>✨</span> Nuevo Cálculo
            </button>
            <div className="bg-white/95 px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Cuota Estimada
              </span>
              <span className="text-2xl font-black text-slate-900 tracking-tight transition-all duration-300">
                {dictamen.cuotaMensualFormateada}
              </span>
              <span className="text-[10px] text-slate-500 block">
                al mes ({params.condicion.plazoAnios} años al {params.condicion.tinAnual.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* ── Métricas Principales de Viabilidad 2x2 ── */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Ratios Clave de Viabilidad Financiera
          </h3>

          <div className="grid grid-cols-2 gap-3.5">
            
            {/* LTV */}
            <div className={`bg-white rounded-2xl border p-4 shadow-xs transition-all duration-200 ${
              ltvAlerta ? "border-red-300 ring-2 ring-red-100 bg-red-50/20" : "border-slate-200"
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500">Financiación (LTV)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  ltvAlerta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {ltvAlerta ? "SUPERA 80%" : "OK"}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 my-1">
                {dictamen.ratioLtv.toFixed(1)} %
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    dictamen.ratioLtv <= 70 ? "bg-emerald-500" : dictamen.ratioLtv <= 80 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(dictamen.ratioLtv, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                <span>Préstamo: {dictamen.capitalPrestadoFormateado}</span>
                <span>Máx: 80%</span>
              </p>
            </div>

            {/* DTI */}
            <div className={`bg-white rounded-2xl border p-4 shadow-xs transition-all duration-200 ${
              dtiAlerta ? "border-red-300 ring-2 ring-red-100 bg-red-50/20" : "border-slate-200"
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500">Endeudamiento (DTI)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  dtiAlerta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {dtiAlerta ? "SUPERA 35%" : "OK"}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 my-1">
                {dictamen.ratioDti.toFixed(1)} %
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    dictamen.ratioDti <= 30 ? "bg-emerald-500" : dictamen.ratioDti <= 35 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(dictamen.ratioDti, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                <span>Ingresos: {dictamen.ingresosNetosTotales.toLocaleString("es-ES")} €</span>
                <span>Máx: 35%</span>
              </p>
            </div>

            {/* Fondos Propios Requeridos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Aportación Necesaria Total</span>
              <div className="text-2xl font-black text-slate-900 my-1">
                {dictamen.totalFondosPropiosRequeridos.toLocaleString("es-ES")} €
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Entrada + {dictamen.totalGastosCompraventa.toLocaleString("es-ES")} € en impuestos y notaría.
              </p>
            </div>

            {/* Renta Disponible Tras Pago */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Renta Libre Tras Cuota</span>
              <div className="text-2xl font-black text-emerald-700 my-1">
                {dictamen.rentaDisponibleTrasCuota.toLocaleString("es-ES")} €
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Margen libre mensual disponible para el hogar.
              </p>
            </div>
          </div>
        </div>

        {/* ── Alertas Dinámicas ── */}
        {dictamen.alertas.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
              <span>⚠️</span> Factores que comprometen la viabilidad:
            </h4>
            <ul className="space-y-1">
              {dictamen.alertas.map((a, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Recomendaciones ── */}
        {dictamen.recomendaciones.length > 0 && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 animate-in fade-in duration-200">
            <h4 className="text-xs font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
              <span>💡</span> Recomendaciones para aprobar la operación:
            </h4>
            <ul className="space-y-1">
              {dictamen.recomendaciones.map((r, i) => (
                <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Gráfico de Amortización Mensual ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Desglose de Cuota Mensual</h4>
              <p className="text-xs text-slate-400">Reparto entre amortización de capital e intereses (Primeros 12 meses)</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Sistema Francés
            </span>
          </div>

          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(val: number) => `${val.toFixed(2)} €`} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Capital" stackId="a" fill="#3b82f6" name="Amortización Capital" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Intereses" stackId="a" fill="#fbbf24" name="Intereses" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Gráfico Evolución del Saldo Pendiente ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Evolución del Saldo de Deuda Pendiente</h4>
          <p className="text-xs text-slate-400 mb-4">Ritmo de reducción del capital adeudado en el primer año</p>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(val: number) => `${val.toLocaleString("es-ES")} €`} />
              <Area type="monotone" dataKey="Pendiente" stroke="#4f46e5" strokeWidth={2} fill="url(#colorPend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Banner Lead Gate PDF ── */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 text-white text-center shadow-lg">
          <span className="text-3xl block mb-2">📑</span>
          <h3 className="font-extrabold text-lg mb-1">¿Deseas descargar tu informe oficial en PDF?</h3>
          <p className="text-xs text-blue-100 max-w-md mx-auto mb-5 leading-relaxed">
            Obtén tu estudio con el cuadro de amortización completo, desglose fiscal por Comunidad Autónoma y certificado orientativo de viabilidad.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-white text-blue-800 font-extrabold text-sm px-6 py-3 rounded-2xl hover:bg-blue-50 transition shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Descargar Informe Oficial en PDF
            </button>
            <button
              onClick={reset}
              className="bg-blue-900/60 hover:bg-blue-900/80 text-white font-bold text-sm px-5 py-3 rounded-2xl transition border border-white/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>✨</span> Iniciar Nuevo Cálculo
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Lead Gate para descarga de PDF ── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📑</span> Descargar Informe Personalizado
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Introduce tus datos de contacto para emitir el informe PDF con los cálculos de tu estudio.
            </p>

            <form onSubmit={handleDescargarPdf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre y Apellidos</label>
                <input
                  type="text"
                  required
                  value={leadNombre}
                  onChange={(e) => setLeadNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo electrónico *</label>
                <input
                  type="email"
                  required
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={leadTelefono}
                  onChange={(e) => setLeadTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {errorDescarga && (
                <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200">
                  {errorDescarga}
                </div>
              )}

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={descargandoPdf}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {descargandoPdf ? "Generando..." : "Descargar PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
