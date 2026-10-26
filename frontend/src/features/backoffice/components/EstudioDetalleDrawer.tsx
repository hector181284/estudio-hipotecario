"use client";

import React, { useEffect, useState } from "react";
import {
  obtenerEstudio,
  descargarPdfEstudio,
  actualizarSeguimientoEstudio,
  EstudioCompletoResponse,
  EstadoOperacion,
  DatosSeguimientoDto,
} from "@/lib/api-client";
import { ESTADO_CONFIG } from "./HistorialView";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEMAFORO_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; badge: string; icon: string; label: string; desc: string }
> = {
  favorable: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: "✅",
    label: "OPERACIÓN FAVORABLE",
    desc: "Cumples con todos los criterios de riesgo bancario estándar.",
  },
  condicionado: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "⚠️",
    label: "OPERACIÓN CONDICIONADA",
    desc: "Cerca de los límites. Podrías requerir avalista o más ahorro.",
  },
  riesgo_elevado: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
    label: "RIESGO ELEVADO",
    desc: "El LTV o DTI supera los máximos prudenciales.",
  },
};

const BANCOS_POPULARES = [
  "Banco Santander",
  "BBVA",
  "CaixaBank",
  "Banco Sabadell",
  "Bankinter",
  "ING",
  "Abanca",
  "Unicaja Banco",
  "Kutxabank",
  "Ibercaja",
  "MyInvestor",
  "Openbank",
];

const TASADORAS_POPULARES = [
  "Tinsa",
  "Sociedad de Tasación (ST)",
  "Gloval",
  "Euroval",
  "CoHispania",
  "Valmesa",
  "Arco Valoraciones",
];

function fmtEuro(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtPct(val: number | null | undefined): string {
  if (val == null) return "—";
  return val.toFixed(2) + "%";
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  estudioId: string | null;
  onClose: () => void;
  onActualizado?: () => void;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function EstudioDetalleDrawer({ estudioId, onClose, onActualizado }: Props) {
  const [estudio, setEstudio] = useState<EstudioCompletoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<"financiero" | "seguimiento">("seguimiento");

  // Estado editable para el seguimiento
  const [estadoOperacion, setEstadoOperacion] = useState<EstadoOperacion>("estudio_inicial");
  const [banco, setBanco] = useState("");
  const [gestor, setGestor] = useState("");
  const [fechaArras, setFechaArras] = useState("");
  const [importeArras, setImporteArras] = useState<string>("");
  const [tasadora, setTasadora] = useState("");
  const [valorTasacion, setValorTasacion] = useState<string>("");
  const [notaria, setNotaria] = useState("");
  const [fechaNotaria, setFechaNotaria] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  useEffect(() => {
    if (!estudioId) {
      setEstudio(null);
      return;
    }
    setLoading(true);
    setError(null);
    setMensajeGuardado(null);
    obtenerEstudio(estudioId)
      .then((data) => {
        setEstudio(data);
        const seg = data.seguimiento;
        if (seg) {
          setEstadoOperacion(seg.estadoOperacion ?? "estudio_inicial");
          setBanco(seg.bancoSeleccionado ?? "");
          setGestor(seg.gestorAsignado ?? "");
          setFechaArras(seg.fechaLimiteArras ? seg.fechaLimiteArras.slice(0, 10) : "");
          setImporteArras(seg.importeArras ? String(seg.importeArras) : "");
          setTasadora(seg.tasadora ?? "");
          setValorTasacion(seg.valorTasacionReal ? String(seg.valorTasacionReal) : "");
          setNotaria(seg.notaria ?? "");
          setFechaNotaria(seg.fechaFirmaNotaria ? seg.fechaFirmaNotaria.slice(0, 16) : "");
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [estudioId]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleDescargarPdf() {
    if (!estudioId) return;
    setDescargando(true);
    try {
      const blob = await descargarPdfEstudio(estudioId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-hipoteca-${estudioId}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setDescargando(false);
    }
  }

  async function handleGuardarSeguimiento(cambioInmediato?: Partial<DatosSeguimientoDto>) {
    if (!estudioId) return;
    setGuardando(true);
    setMensajeGuardado(null);
    try {
      const payload: DatosSeguimientoDto = {
        estadoOperacion: cambioInmediato?.estadoOperacion ?? estadoOperacion,
        bancoSeleccionado: banco || undefined,
        gestorAsignado: gestor || undefined,
        fechaLimiteArras: fechaArras || undefined,
        importeArras: importeArras ? Number(importeArras) : undefined,
        tasadora: tasadora || undefined,
        valorTasacionReal: valorTasacion ? Number(valorTasacion) : undefined,
        notaria: notaria || undefined,
        fechaFirmaNotaria: fechaNotaria || undefined,
        nuevaNota: cambioInmediato?.nuevaNota ?? (nuevaNota.trim() || undefined),
      };

      await actualizarSeguimientoEstudio(estudioId, payload);
      setMensajeGuardado("✓ Expediente actualizado con éxito");
      setNuevaNota("");

      // Recargar datos actualizados
      const actualizado = await obtenerEstudio(estudioId);
      setEstudio(actualizado);
      if (onActualizado) onActualizado();

      setTimeout(() => setMensajeGuardado(null), 3000);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!estudioId) return null;

  const sem = estudio
    ? (SEMAFORO_CONFIG[estudio.dictamen.semaforo] ?? SEMAFORO_CONFIG["riesgo_elevado"])
    : null;

  const estConfig = ESTADO_CONFIG[estadoOperacion] ?? ESTADO_CONFIG.estudio_inicial;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header principal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800">
                Expediente: {estudio?.input?.titularPrincipal.nombre || "Titular"}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${estConfig.bg} ${estConfig.text} ${estConfig.border}`}>
                {estConfig.icon} {estConfig.label}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-xs">{estudioId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarPdf}
              disabled={descargando || !estudio}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              {descargando ? (
                <span className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>📄</span>
              )}
              PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Cerrar (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Pestañas superiores del Drawer */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-bold">
          <button
            onClick={() => setTabActiva("seguimiento")}
            className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tabActiva === "seguimiento"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🚀</span> Seguimiento y Proceso Hipotecario
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
              CRM
            </span>
          </button>
          <button
            onClick={() => setTabActiva("financiero")}
            className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tabActiva === "financiero"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📊</span> Estudio Financiero y Cuotas
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-slate-50/50">

          {/* Loading */}
          {loading && (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Cargando expediente desde PostgreSQL…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* ================= PESTAÑA: SEGUIMIENTO / PIPELINE ================= */}
          {estudio && tabActiva === "seguimiento" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Stepper Visual de Etapas */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📍</span> Pipeline del Préstamo Hipotecario
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Haz clic en una etapa para cambiar de fase
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    "estudio_inicial",
                    "documentacion",
                    "analisis_riesgos",
                    "preconcedida",
                    "arras",
                    "tasacion",
                    "fein",
                    "notaria",
                    "formalizada",
                  ].map((fase) => {
                    const cfg = ESTADO_CONFIG[fase];
                    const esActual = estadoOperacion === fase;
                    return (
                      <button
                        key={fase}
                        type="button"
                        onClick={() => {
                          setEstadoOperacion(fase as EstadoOperacion);
                          handleGuardarSeguimiento({ estadoOperacion: fase as EstadoOperacion });
                        }}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                          esActual
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <div className="truncate">
                          <p className={`text-[11px] font-bold truncate ${esActual ? "text-white" : "text-slate-800"}`}>
                            {cfg.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulario de Datos del Proceso en 2 columnas */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* 1. Banco y Gestor */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏦</span> Entidad y Gestor
                  </h5>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Banco seleccionado
                    </label>
                    <input
                      type="text"
                      list="bancos-list"
                      placeholder="ej. BBVA, Santander..."
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                    <datalist id="bancos-list">
                      {BANCOS_POPULARES.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Asesor / Gestor asignado
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Laura Sánchez"
                      value={gestor}
                      onChange={(e) => setGestor(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* 2. Contrato de Arras */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>✍️</span> Contrato de Arras
                  </h5>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Fecha límite de arras
                    </label>
                    <input
                      type="date"
                      value={fechaArras}
                      onChange={(e) => setFechaArras(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Importe de la señal / arras (€)
                    </label>
                    <input
                      type="number"
                      step={500}
                      placeholder="ej. 15000"
                      value={importeArras}
                      onChange={(e) => setImporteArras(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* 3. Tasación Oficial */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📐</span> Tasación Inmobiliaria
                  </h5>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Sociedad tasadora
                    </label>
                    <input
                      type="text"
                      list="tasadoras-list"
                      placeholder="ej. Tinsa, ST..."
                      value={tasadora}
                      onChange={(e) => setTasadora(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                    <datalist id="tasadoras-list">
                      {TASADORAS_POPULARES.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Valor tasación certificado (€)
                    </label>
                    <input
                      type="number"
                      step={1000}
                      placeholder="ej. 260000"
                      value={valorTasacion}
                      onChange={(e) => setValorTasacion(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* 4. Notaría y Escrituras */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏛️</span> Notaría y Firma
                  </h5>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Notaría designada
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Notaría García Martínez"
                      value={notaria}
                      onChange={(e) => setNotaria(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Fecha y hora prevista
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaNotaria}
                      onChange={(e) => setFechaNotaria(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Guardar Cambios Generales */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  {mensajeGuardado && (
                    <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                      {mensajeGuardado}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleGuardarSeguimiento()}
                  disabled={guardando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {guardando ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <span>💾</span> Guardar Datos del Expediente
                    </>
                  )}
                </button>
              </div>

              {/* Bitácora de Notas y Seguimiento */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📝</span> Bitácora de Seguimiento y Notas del Gestor
                </h5>

                {/* Formulario para añadir nueva nota */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe una actualización (ej. Cliente aportó últimas nóminas, tasación enviada)..."
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nuevaNota.trim()) {
                        handleGuardarSeguimiento({ nuevaNota: nuevaNota.trim() });
                      }
                    }}
                    className="flex-1 text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (nuevaNota.trim()) {
                        handleGuardarSeguimiento({ nuevaNota: nuevaNota.trim() });
                      }
                    }}
                    disabled={!nuevaNota.trim() || guardando}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    + Añadir Nota
                  </button>
                </div>

                {/* Lista de notas cronológica */}
                <div className="space-y-2 pt-2">
                  {(estudio.seguimiento?.notasSeguimiento ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      Aún no hay notas registradas en este expediente.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {(estudio.seguimiento?.notasSeguimiento ?? [])
                        .slice()
                        .reverse()
                        .map((nota, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 flex items-start gap-2"
                          >
                            <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                            <span className="flex-1 leading-relaxed">{nota}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= PESTAÑA: ESTUDIO FINANCIERO ================= */}
          {estudio && sem && tabActiva === "financiero" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Semáforo */}
              <div className={`rounded-2xl border p-4 ${sem.bg} ${sem.border}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sem.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-base ${sem.text}`}>{sem.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sem.badge}`}>
                        Dictamen IA
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{sem.desc}</p>
                  </div>
                </div>
              </div>

              {/* KPIs principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cuota Mensual</p>
                  <p className="text-xl font-black text-slate-900">{estudio.dictamen.cuotaMensualFormateada}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Capital</p>
                  <p className="text-xl font-black text-slate-900">{estudio.dictamen.capitalPrestadoFormateado}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Intereses Totales</p>
                  <p className="text-xl font-black text-blue-700">{fmtEuro(estudio.amortizacion.totalIntereses)}</p>
                </div>
              </div>

              {/* Ratios LTV / DTI */}
              <div className="grid grid-cols-2 gap-3">
                {/* LTV */}
                {(() => {
                  const alerta = estudio.dictamen.ratioLtv > 80;
                  return (
                    <div className={`bg-white rounded-xl border p-4 shadow-xs ${alerta ? "border-red-300 bg-red-50/20" : "border-slate-200"}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-500">Financiación (LTV)</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${alerta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {alerta ? "⚠️ SUPERA 80%" : "✅ OK"}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-slate-900">{fmtPct(estudio.dictamen.ratioLtv)}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-full rounded-full ${estudio.dictamen.ratioLtv <= 70 ? "bg-emerald-500" : estudio.dictamen.ratioLtv <= 80 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(estudio.dictamen.ratioLtv, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Máx. bancario: 80%</p>
                    </div>
                  );
                })()}

                {/* DTI */}
                {(() => {
                  const alerta = estudio.dictamen.ratioDti > 35;
                  return (
                    <div className={`bg-white rounded-xl border p-4 shadow-xs ${alerta ? "border-red-300 bg-red-50/20" : "border-slate-200"}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-500">Endeudamiento (DTI)</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${alerta ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {alerta ? "⚠️ SUPERA 35%" : "✅ OK"}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-slate-900">{fmtPct(estudio.dictamen.ratioDti)}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-full rounded-full ${estudio.dictamen.ratioDti <= 30 ? "bg-emerald-500" : estudio.dictamen.ratioDti <= 35 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(estudio.dictamen.ratioDti, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Máx. bancario: 35%</p>
                    </div>
                  );
                })()}
              </div>

              {/* Desglose financiero */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3">💰 Desglose de Fondos</h4>
                <div className="space-y-2">
                  {[
                    { label: "Gastos de compraventa", val: estudio.dictamen.totalGastosCompraventa, color: "text-slate-800" },
                    { label: "Fondos propios requeridos", val: estudio.dictamen.totalFondosPropiosRequeridos, color: "text-slate-800" },
                    { label: "Déficit de ahorro", val: estudio.dictamen.deficitAhorro, color: estudio.dictamen.deficitAhorro > 0 ? "text-red-700 font-black" : "text-emerald-700 font-black" },
                    { label: "Ingresos netos totales", val: estudio.dictamen.ingresosNetosTotales, color: "text-slate-800" },
                    { label: "Renta disponible tras cuota", val: estudio.dictamen.rentaDisponibleTrasCuota, color: estudio.dictamen.rentaDisponibleTrasCuota < 0 ? "text-red-700 font-black" : "text-emerald-700" },
                    { label: "Coste total financiación", val: estudio.amortizacion.totalCosteFinanciacion, color: "text-blue-800 font-black" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-sm tabular-nums ${color}`}>{fmtEuro(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas y recomendaciones */}
              {(estudio.dictamen.alertas.length > 0 || estudio.dictamen.recomendaciones.length > 0) && (
                <div className="grid grid-cols-1 gap-3">
                  {estudio.dictamen.alertas.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-2">⚠️ Alertas</h4>
                      <ul className="space-y-1">
                        {estudio.dictamen.alertas.map((a, i) => (
                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {estudio.dictamen.recomendaciones.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-wider mb-2">💡 Recomendaciones</h4>
                      <ul className="space-y-1">
                        {estudio.dictamen.recomendaciones.map((r, i) => (
                          <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Primeras cuotas de amortización */}
              {estudio.amortizacion.primerasCuotas.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      📊 Primeras cuotas de amortización
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase">
                        <tr>
                          <th className="px-3 py-2 text-center font-bold">Mes</th>
                          <th className="px-3 py-2 text-right font-bold">Cuota</th>
                          <th className="px-3 py-2 text-right font-bold">Capital</th>
                          <th className="px-3 py-2 text-right font-bold">Interés</th>
                          <th className="px-3 py-2 text-right font-bold">Pendiente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {estudio.amortizacion.primerasCuotas.slice(0, 12).map((c) => (
                          <tr key={c.mes} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-center text-slate-500 font-mono">{c.mes}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800">{fmtEuro(c.cuota)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{fmtEuro(c.capital)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-red-600">{fmtEuro(c.interes)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtEuro(c.pendiente)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
