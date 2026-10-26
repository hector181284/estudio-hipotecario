"use client";

import React, { useEffect, useState } from "react";
import {
  obtenerEstudio,
  descargarPdfEstudio,
  actualizarSeguimientoEstudio,
  EstudioCompletoResponse,
  EstadoOperacion,
  DatosSeguimientoDto,
  ExpedienteHipotecarioEspanol,
  crearExpedienteEspanolPorDefecto,
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
    desc: "Cumple con todos los criterios de riesgo bancario estándar.",
  },
  condicionado: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "⚠️",
    label: "OPERACIÓN CONDICIONADA",
    desc: "Cerca de los límites. Podría requerir avalista o más aportación de ahorro.",
  },
  riesgo_elevado: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
    label: "RIESGO ELEVADO",
    desc: "El LTV o DTI supera los máximos prudenciales del Banco de España.",
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
  "Tecnitasa",
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

type SubFaseEspana = "docs" | "arras" | "tasacion" | "fein" | "notaria" | "firma" | "bitacora";

export default function EstudioDetalleDrawer({ estudioId, onClose, onActualizado }: Props) {
  const [estudio, setEstudio] = useState<EstudioCompletoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<"financiero" | "seguimiento">("seguimiento");
  const [subFaseActiva, setSubFaseActiva] = useState<SubFaseEspana>("docs");

  // Estado editable para el seguimiento
  const [estadoOperacion, setEstadoOperacion] = useState<EstadoOperacion>("estudio_inicial");
  const [expediente, setExpediente] = useState<ExpedienteHipotecarioEspanol>(() =>
    crearExpedienteEspanolPorDefecto()
  );
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
          let expData: ExpedienteHipotecarioEspanol;
          if (seg.datosExpedienteJson) {
            try {
              expData = JSON.parse(seg.datosExpedienteJson);
            } catch {
              expData = crearExpedienteEspanolPorDefecto(data.input?.precioInmueble, data.input?.comunidadAutonoma);
            }
          } else {
            expData = crearExpedienteEspanolPorDefecto(data.input?.precioInmueble, data.input?.comunidadAutonoma);
            // Pre-rellenar con datos existentes
            if (seg.importeArras) expData.inmuebleYArras.importeArras = seg.importeArras;
            if (seg.fechaLimiteArras) expData.inmuebleYArras.fechaLimiteEscrituracion = seg.fechaLimiteArras.slice(0, 10);
            if (seg.tasadora) expData.tasacion.sociedadTasadora = seg.tasadora;
            if (seg.valorTasacionReal) expData.tasacion.valorTasacionOficial = seg.valorTasacionReal;
            if (seg.bancoSeleccionado) expData.aprobacionFein.bancoDefinitivo = seg.bancoSeleccionado;
            if (seg.notaria) expData.notariaYActa.notariaNombre = seg.notaria;
            if (seg.fechaFirmaNotaria) expData.firmaYRegistro.fechaHoraFirmaEscritura = seg.fechaFirmaNotaria.slice(0, 16);
          }
          setExpediente(expData);
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
        bancoSeleccionado: expediente.aprobacionFein.bancoDefinitivo || undefined,
        gestorAsignado: expediente.notariaYActa.gestorTramitador || undefined,
        fechaLimiteArras: expediente.inmuebleYArras.fechaLimiteEscrituracion || undefined,
        importeArras: expediente.inmuebleYArras.importeArras != null ? Number(expediente.inmuebleYArras.importeArras) : undefined,
        tasadora: expediente.tasacion.sociedadTasadora || undefined,
        valorTasacionReal: expediente.tasacion.valorTasacionOficial != null ? Number(expediente.tasacion.valorTasacionOficial) : undefined,
        notaria: expediente.notariaYActa.notariaNombre || undefined,
        fechaFirmaNotaria: expediente.firmaYRegistro.fechaHoraFirmaEscritura || undefined,
        datosExpedienteJson: JSON.stringify(expediente),
        nuevaNota: cambioInmediato?.nuevaNota ?? (nuevaNota.trim() || undefined),
      };

      await actualizarSeguimientoEstudio(estudioId, payload);
      setMensajeGuardado("✓ Expediente completo actualizado con éxito");
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

  // Cálculos automáticos de soporte para el proceso en España
  const precio = estudio?.input?.precioInmueble ?? 200000;
  const capital = estudio?.dictamen?.capitalPrestado ?? 160000;
  const valorTasacion = expediente.tasacion.valorTasacionOficial ?? 0;
  const ltvSobreTasacion = valorTasacion > 0 ? (capital / valorTasacion) * 100 : null;

  // Días restantes de arras
  let diasRestantesArras: number | null = null;
  if (expediente.inmuebleYArras.fechaLimiteEscrituracion) {
    const limite = new Date(expediente.inmuebleYArras.fechaLimiteEscrituracion);
    const hoy = new Date();
    const diff = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    diasRestantesArras = diff;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header principal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800">
                Expediente: {estudio?.input?.titularPrincipal.nombre || "Titular"}
                {estudio?.input?.cotitular?.nombre && ` & ${estudio.input.cotitular.nombre}`}
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
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-bold shrink-0">
          <button
            onClick={() => setTabActiva("seguimiento")}
            className={`py-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              tabActiva === "seguimiento"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🇪🇸</span> Proceso de Compra e Hipoteca
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
              Expediente Real
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

          {/* ================= PESTAÑA: SEGUIMIENTO / EXPEDIENTE ESPAÑOL ================= */}
          {estudio && tabActiva === "seguimiento" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Stepper Visual de 9 Estados */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📍</span> Estado de Tramitación del Préstamo
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Haz clic para actualizar la fase en curso
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
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
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-1.5 ${
                          esActual
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="text-sm">{cfg.icon}</span>
                        <div className="truncate">
                          <p className={`text-[10px] font-bold truncate ${esActual ? "text-white" : "text-slate-800"}`}>
                            {cfg.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-navegador de las 6 Fases Clave en España + Bitácora */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
                {[
                  { id: "docs", label: "1. Documentación", icon: "📄" },
                  { id: "arras", label: "2. Inmueble & Arras", icon: "✍️" },
                  { id: "tasacion", label: "3. Tasación Oficial", icon: "📐" },
                  { id: "fein", label: "4. Riesgos & FEIN", icon: "📋" },
                  { id: "notaria", label: "5. Notaría & Acta", icon: "🏛️" },
                  { id: "firma", label: "6. Firma & Registro", icon: "🔑" },
                  { id: "bitacora", label: "Bitácora", icon: "📝" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSubFaseActiva(f.id as SubFaseEspana)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      subFaseActiva === f.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* ── SUB-FASE 1: DOCUMENTACIÓN Y SCORING INICIAL ── */}
              {subFaseActiva === "docs" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📄</span> Checklist Documental Exigido por Entidades Bancarias
                      </h5>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                        Perfil Financiero
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Documentación requerida para tramitar el análisis de solvencia y scoring ante los departamentos de riesgos:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          key: "dniAportado",
                          label: "DNI / NIE en vigor de intervinientes",
                          sub: "Fotocopia por ambas caras",
                        },
                        {
                          key: "ultimasTresNominas",
                          label: "Últimas 3 nóminas completas",
                          sub: "O certificados de haberes",
                        },
                        {
                          key: "declaracionRentaIrpf",
                          label: "Declaración de la Renta (IRPF Mod. 100)",
                          sub: "Último ejercicio fiscal presentado",
                        },
                        {
                          key: "vidaLaboralActualizada",
                          label: "Vida Laboral actualizada (TGSS)",
                          sub: "Menos de 30 días de antigüedad",
                        },
                        {
                          key: "extractosBancarios",
                          label: "Extractos bancarios (últimos 3-6 meses)",
                          sub: "Cuenta principal donde se perciben ingresos",
                        },
                        {
                          key: "recibosPrestamos",
                          label: "Recibos de préstamos vigentes",
                          sub: "Para verificar cuotas no reflejadas en CIRBE",
                        },
                        {
                          key: "informeCirbe",
                          label: "Consulta CIRBE (Banco de España)",
                          sub: "Endeudamiento del sistema financiero",
                        },
                        {
                          key: "justificanteFondosPropios",
                          label: "Justificante de ahorros para entrada",
                          sub: "Extracto de posiciones bancarias o donación",
                        },
                      ].map((item) => {
                        const checked = (expediente.documentacion as any)[item.key] ?? false;
                        return (
                          <label
                            key={item.key}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 transition cursor-pointer ${
                              checked
                                ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
                                : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setExpediente((prev) => ({
                                  ...prev,
                                  documentacion: {
                                    ...prev.documentacion,
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="w-4 h-4 rounded text-blue-600 accent-blue-600 mt-0.5 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold">{item.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Si es autónomo */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={expediente.documentacion.modelosTrimestralesIvaIrpf ?? false}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              documentacion: {
                                ...prev.documentacion,
                                modelosTrimestralesIvaIrpf: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Autónomo: Aportados modelos trimestrales 130/131 (IRPF) y 303/390 (IVA)
                        </span>
                      </label>
                    </div>

                    {/* Estado de Pre-Scoring / Pre-autorización */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Pre-Scoring y Viabilidad Bancaria
                      </h6>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Dictamen Pre-scoring
                          </label>
                          <select
                            value={expediente.documentacion.estadoScoring}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                documentacion: {
                                  ...prev.documentacion,
                                  estadoScoring: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white text-slate-800"
                          >
                            <option value="pendiente">⏳ Pendiente de scoring</option>
                            <option value="favorable">✅ Pre-aprobada / Favorable</option>
                            <option value="condicionado">⚠️ Condicionada (Aval/Aportación)</option>
                            <option value="denegado">🔴 Denegada en scoring</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Banco de pre-estudio
                          </label>
                          <input
                            type="text"
                            list="bancos-list-sub"
                            placeholder="ej. Santander, BBVA..."
                            value={expediente.documentacion.bancoPreAprobacion ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                documentacion: {
                                  ...prev.documentacion,
                                  bancoPreAprobacion: e.target.value,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Importe pre-aprobado (€)
                          </label>
                          <input
                            type="number"
                            step={1000}
                            placeholder="ej. 180000"
                            value={expediente.documentacion.importePreAprobado ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                documentacion: {
                                  ...prev.documentacion,
                                  importePreAprobado: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE 2: INMUEBLE Y CONTRATO DE ARRAS ── */}
              {subFaseActiva === "arras" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>✍️</span> Inmueble, Nota Simple y Contrato de Arras
                      </h5>
                      {diasRestantesArras !== null && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            diasRestantesArras <= 15
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          ⏳ {diasRestantesArras > 0 ? `${diasRestantesArras} días restantes` : "Plazo vencido"}
                        </span>
                      )}
                    </div>

                    {/* Datos Catastrales y Registrales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Referencia Catastral (20 caracteres)
                        </label>
                        <input
                          type="text"
                          maxLength={20}
                          placeholder="ej. 9872023VH5797S0001WX"
                          value={expediente.inmuebleYArras.referenciaCatastral ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              inmuebleYArras: {
                                ...prev.inmuebleYArras,
                                referenciaCatastral: e.target.value.toUpperCase(),
                              },
                            }))
                          }
                          className="w-full font-mono text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Nº Finca Registral / Registro
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Finca 14.892 - Registro Madrid nº 12"
                          value={expediente.inmuebleYArras.numeroFincaRegistral ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              inmuebleYArras: {
                                ...prev.inmuebleYArras,
                                numeroFincaRegistral: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    {/* Nota Simple y Cargas */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expediente.inmuebleYArras.notaSimpleSolicitada}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                inmuebleYArras: {
                                  ...prev.inmuebleYArras,
                                  notaSimpleSolicitada: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            Nota Simple Informativa del Registro de la Propiedad obtenida
                          </span>
                        </label>
                        <input
                          type="date"
                          value={expediente.inmuebleYArras.fechaNotaSimple ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              inmuebleYArras: {
                                ...prev.inmuebleYArras,
                                fechaNotaSimple: e.target.value,
                              },
                            }))
                          }
                          className="text-xs font-semibold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Cargas existentes en Nota Simple
                          </label>
                          <select
                            value={expediente.inmuebleYArras.cargasExistentes}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                inmuebleYArras: {
                                  ...prev.inmuebleYArras,
                                  cargasExistentes: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white text-slate-800"
                          >
                            <option value="ninguna">✅ Libre de cargas (Limpia)</option>
                            <option value="hipoteca_vendedor">🏦 Hipoteca previa del vendedor</option>
                            <option value="embargo">⚠️ Embargo preventivo o judicial</option>
                            <option value="afeccion_fiscal">📑 Afección fiscal de transmisiones</option>
                          </select>
                        </div>

                        {expediente.inmuebleYArras.cargasExistentes === "hipoteca_vendedor" && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Importe de cancelación previa (€)
                            </label>
                            <input
                              type="number"
                              step={500}
                              placeholder="ej. 62000"
                              value={expediente.inmuebleYArras.importeCargaPendiente ?? ""}
                              onChange={(e) =>
                                setExpediente((prev) => ({
                                  ...prev,
                                  inmuebleYArras: {
                                    ...prev.inmuebleYArras,
                                    importeCargaPendiente: e.target.value ? Number(e.target.value) : undefined,
                                  },
                                }))
                              }
                              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contrato de Arras */}
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
                      <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Condiciones del Contrato de Arras
                      </h6>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Tipo de Arras
                          </label>
                          <select
                            value={expediente.inmuebleYArras.tipoContratoArras}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                inmuebleYArras: {
                                  ...prev.inmuebleYArras,
                                  tipoContratoArras: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          >
                            <option value="penitenciales_1454">Penitenciales (art. 1454 C.C.)</option>
                            <option value="confirmatorias">Confirmatorias (cuenta del precio)</option>
                            <option value="penales">Penales (indemnizatorias)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Importe de la Señal / Arras (€)
                          </label>
                          <input
                            type="number"
                            step={500}
                            placeholder="ej. 20000"
                            value={expediente.inmuebleYArras.importeArras ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                inmuebleYArras: {
                                  ...prev.inmuebleYArras,
                                  importeArras: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Fecha Límite Escrituración
                          </label>
                          <input
                            type="date"
                            value={expediente.inmuebleYArras.fechaLimiteEscrituracion ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                inmuebleYArras: {
                                  ...prev.inmuebleYArras,
                                  fechaLimiteEscrituracion: e.target.value,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      </div>

                      {/* Cláusula de no concesión de hipoteca */}
                      <label className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={expediente.inmuebleYArras.clausulaResolutoriaHipoteca}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              inmuebleYArras: {
                                ...prev.inmuebleYArras,
                                clausulaResolutoriaHipoteca: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded text-blue-600 accent-blue-600 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold text-blue-900">
                            🛡️ Cláusula de rescisión por no concesión de préstamo hipotecario
                          </p>
                          <p className="text-[10px] text-blue-700 mt-0.5">
                            Protege al comprador: si las entidades bancarias deniegan la financiación, recupera íntegramente la señal depositada.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE 3: TASACIÓN OFICIAL HOMOLOGADA (BdE) ── */}
              {subFaseActiva === "tasacion" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📐</span> Tasación Homologada por el Banco de España
                      </h5>
                      <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                        Valor de Garantía
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Sociedad Tasadora Homologada
                        </label>
                        <input
                          type="text"
                          list="tasadoras-list-sub"
                          placeholder="ej. Tinsa, ST Sociedad de Tasación..."
                          value={expediente.tasacion.sociedadTasadora ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              tasacion: {
                                ...prev.tasacion,
                                sociedadTasadora: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                        <datalist id="tasadoras-list-sub">
                          {TASADORAS_POPULARES.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Estado de la Tasación
                        </label>
                        <select
                          value={expediente.tasacion.estadoTasacion}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              tasacion: {
                                ...prev.tasacion,
                                estadoTasacion: e.target.value as any,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        >
                          <option value="pendiente">⏳ Pendiente de encargar</option>
                          <option value="encargada">📞 Encargada / Pago realizado</option>
                          <option value="visita_realizada">🏠 Visita del tasador realizada</option>
                          <option value="informe_emitido">📄 Informe oficial emitido</option>
                          <option value="conforme">✅ Conforme para riesgos</option>
                        </select>
                      </div>
                    </div>

                    {/* Valor de tasación y comparativa LTV */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Valor de Tasación Certificado (€)
                          </label>
                          <input
                            type="number"
                            step={1000}
                            placeholder="ej. 265000"
                            value={expediente.tasacion.valorTasacionOficial ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                tasacion: {
                                  ...prev.tasacion,
                                  valorTasacionOficial: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-sm font-black text-blue-700 border border-slate-300 rounded-xl px-3 py-2 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Coste de Tasación (€)
                          </label>
                          <input
                            type="number"
                            step={20}
                            placeholder="ej. 380"
                            value={expediente.tasacion.costeTasacion ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                tasacion: {
                                  ...prev.tasacion,
                                  costeTasacion: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                          />
                        </div>
                      </div>

                      {/* Análisis automático del LTV sobre Tasación vs Compraventa */}
                      {valorTasacion > 0 && (
                        <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">
                              LTV sobre Precio Compra
                            </span>
                            <span className="text-base font-black text-slate-900">
                              {((capital / precio) * 100).toFixed(1)}%
                            </span>
                          </div>

                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">
                              LTV real sobre Tasación
                            </span>
                            <span
                              className={`text-base font-black ${
                                (ltvSobreTasacion ?? 100) <= 80 ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {ltvSobreTasacion ? `${ltvSobreTasacion.toFixed(1)}%` : "—"}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {valorTasacion >= precio ? "✓ Tasación ≥ Compra" : "⚠️ Tasación por debajo"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Advertencias o condicionantes de la tasación */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Condicionantes o advertencias en el informe
                        </label>
                        <input
                          type="text"
                          placeholder="ej. ITE favorable, sin servidumbres ni discrepancias catastrales..."
                          value={expediente.tasacion.advertenciasOCondicionantes ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              tasacion: {
                                ...prev.tasacion,
                                advertenciasOCondicionantes: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-medium border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE 4: RIESGOS, OFERTA VINCULANTE (FEIN Y FiAE) ── */}
              {subFaseActiva === "fein" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📋</span> Oferta Vinculante FEIN y FiAE (Ley 5/2019 LCCI)
                      </h5>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        Carácter Vinculante
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      La FEIN (Ficha Europea de Información Normalizada) tiene consideración de oferta vinculante para la entidad durante un mínimo de 30 días naturales.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Banco Concedente Definitivo
                        </label>
                        <input
                          type="text"
                          list="bancos-list-sub"
                          placeholder="ej. BBVA, Santander..."
                          value={expediente.aprobacionFein.bancoDefinitivo ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              aprobacionFein: {
                                ...prev.aprobacionFein,
                                bancoDefinitivo: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Fecha Emisión FEIN
                        </label>
                        <input
                          type="date"
                          value={expediente.aprobacionFein.fechaEmisionFein ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              aprobacionFein: {
                                ...prev.aprobacionFein,
                                fechaEmisionFein: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    {/* Condiciones Financieras Aprobadas */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <h6 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                        Condiciones Financieras Concedidas
                      </h6>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Capital (€)
                          </label>
                          <input
                            type="number"
                            step={1000}
                            placeholder={String(capital)}
                            value={expediente.aprobacionFein.capitalConcedido ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                aprobacionFein: {
                                  ...prev.aprobacionFein,
                                  capitalConcedido: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            TIN Bonificado (%)
                          </label>
                          <input
                            type="number"
                            step={0.05}
                            placeholder="2.75"
                            value={expediente.aprobacionFein.tinNominalBonificado ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                aprobacionFein: {
                                  ...prev.aprobacionFein,
                                  tinNominalBonificado: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            TAE (%)
                          </label>
                          <input
                            type="number"
                            step={0.05}
                            placeholder="3.20"
                            value={expediente.aprobacionFein.taeFinanciera ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                aprobacionFein: {
                                  ...prev.aprobacionFein,
                                  taeFinanciera: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                            Plazo (Años)
                          </label>
                          <input
                            type="number"
                            placeholder="25"
                            value={expediente.aprobacionFein.plazoAniosAprobado ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                aprobacionFein: {
                                  ...prev.aprobacionFein,
                                  plazoAniosAprobado: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white"
                          />
                        </div>
                      </div>

                      {/* Bonificaciones vinculadas */}
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                          Bonificaciones y Vinculaciones Contratadas:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { key: "nomina", label: "Nómina domiciliada" },
                            { key: "seguroHogar", label: "Seguro de Hogar" },
                            { key: "seguroVida", label: "Seguro de Vida" },
                            { key: "planPensiones", label: "Plan de Pensiones" },
                            { key: "alarma", label: "Alarma del hogar" },
                          ].map((b) => {
                            const active = (expediente.aprobacionFein.bonificacionesContratadas as any)[b.key] ?? false;
                            return (
                              <label key={b.key} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={(e) =>
                                    setExpediente((prev) => ({
                                      ...prev,
                                      aprobacionFein: {
                                        ...prev.aprobacionFein,
                                        bonificacionesContratadas: {
                                          ...prev.aprobacionFein.bonificacionesContratadas,
                                          [b.key]: e.target.checked,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                                />
                                <span>{b.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE 5: NOTARÍA, PLATAFORMA Y ACTA PREVIA LCCI (10/14 DÍAS) ── */}
              {subFaseActiva === "notaria" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏛️</span> Notaría, Plataforma y Acta Previa LCCI
                      </h5>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                        10 días obligatorios (14d en Cataluña)
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                      💡 <strong>Ley 5/2019 de Crédito Inmobiliario:</strong> Es obligatorio que el prestatario comparezca ante el notario de su elección para el <em>Acta de Transparencia Material previa</em> (gratuita), debiendo transcurrir al menos 10 días naturales (14 en Cataluña) entre la recepción de la FEIN y la firma formal de la hipoteca.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Notaría de Libre Elección
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Notaría Dña. Carmen Gómez - Madrid"
                          value={expediente.notariaYActa.notariaNombre ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              notariaYActa: {
                                ...prev.notariaYActa,
                                notariaNombre: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Plataforma Notarial Telemática
                        </label>
                        <select
                          value={expediente.notariaYActa.plataformaEnvio}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              notariaYActa: {
                                ...prev.notariaYActa,
                                plataformaEnvio: e.target.value as any,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        >
                          <option value="ancert">Ancert (Consejo General del Notariado)</option>
                          <option value="signe">Signe</option>
                          <option value="otra">Otra plataforma homologada</option>
                        </select>
                      </div>
                    </div>

                    {/* Fechas de Plataforma y Acta Previa */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Fecha y Hora del Acta Previa LCCI
                          </label>
                          <input
                            type="datetime-local"
                            value={expediente.notariaYActa.fechaHoraActaPrevia ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                notariaYActa: {
                                  ...prev.notariaYActa,
                                  fechaHoraActaPrevia: e.target.value,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Provisión de Fondos Solicitada (€)
                          </label>
                          <input
                            type="number"
                            step={500}
                            placeholder="ej. 24500"
                            value={expediente.notariaYActa.provisionFondosSolicitada ?? ""}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                notariaYActa: {
                                  ...prev.notariaYActa,
                                  provisionFondosSolicitada: e.target.value ? Number(e.target.value) : undefined,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          />
                        </div>
                      </div>

                      {/* Checks de Conformidad LCCI */}
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expediente.notariaYActa.cumplePlazoLegalLcci}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                notariaYActa: {
                                  ...prev.notariaYActa,
                                  cumplePlazoLegalLcci: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            ✓ Plazo legal cumplido: Transcurridos al menos 10 días (14 en Cataluña) desde la subida a plataforma
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expediente.notariaYActa.actaPreviaFavorable}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                notariaYActa: {
                                  ...prev.notariaYActa,
                                  actaPreviaFavorable: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            ✓ Acta notarial previa de comprensión completada favorablemente por los compradores
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE 6: FIRMA DE ESCRITURAS, LIQUIDACIÓN Y REGISTRO ── */}
              {subFaseActiva === "firma" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔑</span> Firma de Escrituras, Liquidación y Registro de la Propiedad
                      </h5>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                        Etapa Final
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Fecha y Hora de Firma de Escrituras
                        </label>
                        <input
                          type="datetime-local"
                          value={expediente.firmaYRegistro.fechaHoraFirmaEscritura ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              firmaYRegistro: {
                                ...prev.firmaYRegistro,
                                fechaHoraFirmaEscritura: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Nº de Protocolo Notarial
                        </label>
                        <input
                          type="text"
                          placeholder="ej. Protocolo 2026/1458"
                          value={expediente.firmaYRegistro.numeroProtocoloNotarial ?? ""}
                          onChange={(e) =>
                            setExpediente((prev) => ({
                              ...prev,
                              firmaYRegistro: {
                                ...prev.firmaYRegistro,
                                numeroProtocoloNotarial: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    {/* Medios de Pago y Llaves */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Medio de Pago del Precio
                          </label>
                          <select
                            value={expediente.firmaYRegistro.medioPagoPrecio}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                firmaYRegistro: {
                                  ...prev.firmaYRegistro,
                                  medioPagoPrecio: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          >
                            <option value="cheque_bancario">Cheque bancario nominativo conformado</option>
                            <option value="transferencia_omf_bde">Transferencia urgente OMF (Banco de España)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Impuesto Autonómico Liquidado
                          </label>
                          <select
                            value={expediente.firmaYRegistro.impuestoLiquidado}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                firmaYRegistro: {
                                  ...prev.firmaYRegistro,
                                  impuestoLiquidado: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full text-xs font-bold border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                          >
                            <option value="itp_modelo_600">Modelo 600 (ITP - 2ª Mano)</option>
                            <option value="iva_ajd_modelo_601">Modelo 601 (AJD - Obra Nueva)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expediente.firmaYRegistro.entregaLlavesRealizada}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                firmaYRegistro: {
                                  ...prev.firmaYRegistro,
                                  entregaLlavesRealizada: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            🔑 Llaves entregadas y posesión transferida
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expediente.firmaYRegistro.cancelacionEconomicaHipotecaAnterior}
                            onChange={(e) =>
                              setExpediente((prev) => ({
                                ...prev,
                                firmaYRegistro: {
                                  ...prev.firmaYRegistro,
                                  cancelacionEconomicaHipotecaAnterior: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            Cancelación económica de hipoteca previa del vendedor
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-FASE: BITÁCORA Y CRONOLOGÍA ── */}
              {subFaseActiva === "bitacora" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📝</span> Bitácora de Seguimiento y Notas del Gestor
                    </h5>

                    {/* Formulario para añadir nueva nota */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe una actualización (ej. Recibida FEIN de Santander, tasación conforme, acta previa jueves a las 11h)..."
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
                        <div className="space-y-2 max-h-64 overflow-y-auto">
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

              {/* Barra Inferior: Guardar Expediente Completo */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between">
                <div>
                  {mensajeGuardado ? (
                    <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                      {mensajeGuardado}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Los datos se sincronizan y persisten en PostgreSQL
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleGuardarSeguimiento()}
                  disabled={guardando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {guardando ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <span>💾</span> Guardar Expediente Completo
                    </>
                  )}
                </button>
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
