"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  listarEstudios,
  descargarPdfEstudio,
  EstudioResumenDto,
} from "@/lib/api-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEMAFORO_CONFIG: Record<
  string,
  { bg: string; text: string; icon: string; label: string }
> = {
  favorable: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    icon: "✅",
    label: "Favorable",
  },
  condicionado: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon: "⚠️",
    label: "Condicionado",
  },
  riesgo_elevado: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    icon: "🔴",
    label: "Riesgo Elevado",
  },
};

const CCAA_LABELS: Record<string, string> = {
  MD: "Madrid",
  CT: "Cataluña",
  AN: "Andalucía",
  VC: "C. Valenciana",
  PV: "País Vasco",
  GA: "Galicia",
  CL: "Castilla y León",
  CM: "Castilla-La Mancha",
  IB: "Baleares",
  CN: "Canarias",
};

const TIPO_LABEL: Record<string, string> = {
  segunda_mano: "2ª Mano",
  obra_nueva: "Obra Nueva",
};

function formatFecha(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEuro(val: number | null): string {
  if (val === null) return "—";
  return val.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " €";
}

const PAGE_SIZE = 10;

// ── Componente principal ───────────────────────────────────────────────────────

export default function HistorialView() {
  const [estudios, setEstudios] = useState<EstudioResumenDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0); // 0-indexed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>("todos");
  const [descargando, setDescargando] = useState<string | null>(null); // id del estudio

  const cargarEstudios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarEstudios(PAGE_SIZE, pagina * PAGE_SIZE);
      setEstudios(data.estudios);
      setTotal(data.total);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  useEffect(() => {
    cargarEstudios();
  }, [cargarEstudios]);

  async function handleDescargarPdf(id: string) {
    setDescargando(id);
    try {
      const blob = await descargarPdfEstudio(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe-hipoteca-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setDescargando(null);
    }
  }

  // Filtrado local por semáforo
  const estudiosVisibles =
    filtroSemaforo === "todos"
      ? estudios
      : estudios.filter((e) => e.semaforo === filtroSemaforo);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* ── Cabecera de la sección ── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <span>📋</span> Historial de Estudios Hipotecarios
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} simulaciones guardadas en PostgreSQL · Ordenadas por fecha (más reciente primero)
          </p>
        </div>

        {/* Filtro por semáforo */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium">Filtrar:</span>
          {["todos", "favorable", "condicionado", "riesgo_elevado"].map((s) => (
            <button
              key={s}
              onClick={() => setFiltroSemaforo(s)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                filtroSemaforo === s
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "todos"
                ? "Todos"
                : (SEMAFORO_CONFIG[s]?.icon ?? "") +
                  " " +
                  (SEMAFORO_CONFIG[s]?.label ?? s)}
            </button>
          ))}

          <button
            onClick={cargarEstudios}
            title="Recargar historial"
            className="ml-1 text-slate-500 hover:text-blue-600 text-sm font-bold px-2 py-1 rounded-lg hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Cargando estudios desde PostgreSQL...
        </div>
      ) : estudiosVisibles.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <span className="text-4xl block mb-2">📭</span>
          <p className="text-sm font-medium">No hay estudios guardados todavía</p>
          <p className="text-xs mt-1">
            Las simulaciones realizadas en el Asistente Conversacional aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          {/* ── Tabla ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Fecha</th>
                    <th className="px-4 py-3 text-left font-bold">Dictamen</th>
                    <th className="px-4 py-3 text-left font-bold">Comunidad</th>
                    <th className="px-4 py-3 text-left font-bold">Tipo</th>
                    <th className="px-4 py-3 text-right font-bold">Capital</th>
                    <th className="px-4 py-3 text-right font-bold">Cuota/mes</th>
                    <th className="px-4 py-3 text-center font-bold">Plazo</th>
                    <th className="px-4 py-3 text-center font-bold">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estudiosVisibles.map((e) => {
                    const sem = SEMAFORO_CONFIG[e.semaforo ?? ""] ?? {
                      bg: "bg-slate-50 border-slate-200",
                      text: "text-slate-600",
                      icon: "❓",
                      label: "Desconocido",
                    };
                    const isDescargando = descargando === e.id;

                    return (
                      <tr
                        key={e.id}
                        className="hover:bg-slate-50/60 transition group"
                      >
                        {/* Fecha */}
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px] text-slate-500">
                            {formatFecha(e.creadoEn)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]" title={e.id}>
                            {e.id}
                          </div>
                        </td>

                        {/* Dictamen / Semáforo */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sem.bg} ${sem.text}`}
                          >
                            {sem.icon} {sem.label}
                          </span>
                        </td>

                        {/* Comunidad */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mr-1">
                            {e.comunidadAutonoma}
                          </span>
                          <span className="text-xs text-slate-700">
                            {CCAA_LABELS[e.comunidadAutonoma] ?? e.comunidadAutonoma}
                          </span>
                        </td>

                        {/* Tipo vivienda */}
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {TIPO_LABEL[e.tipoVivienda] ?? e.tipoVivienda}
                        </td>

                        {/* Capital */}
                        <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                          {formatEuro(e.capitalPrestado)}
                        </td>

                        {/* Cuota */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-black text-slate-900">
                            {formatEuro(e.cuotaMensual)}
                          </span>
                        </td>

                        {/* Plazo */}
                        <td className="px-4 py-3 text-center text-xs text-slate-600">
                          {e.plazoAnios} años
                        </td>

                        {/* PDF Download */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDescargarPdf(e.id)}
                            disabled={isDescargando}
                            title={`Descargar informe PDF del estudio ${e.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-xs"
                          >
                            {isDescargando ? (
                              <>
                                <span className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Generando
                              </>
                            ) : (
                              <>
                                <span>📄</span> PDF
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Paginación ── */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-500">
                Página {pagina + 1} de {totalPaginas} · {total} estudios totales
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i)
                  .filter((i) => Math.abs(i - pagina) <= 2)
                  .map((i) => (
                    <button
                      key={i}
                      onClick={() => setPagina(i)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        i === pagina
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
