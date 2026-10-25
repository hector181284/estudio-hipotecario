import { SimularEstudioInputDto, SimularEstudioOutputDto } from "@/types/mortgage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function simularEstudio(input: SimularEstudioInputDto): Promise<SimularEstudioOutputDto> {
  const res = await fetch(`${API_URL}/api/v1/simular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error ?? "Error en la simulación");
  }

  return res.json() as Promise<SimularEstudioOutputDto>;
}

export interface LeadDto {
  nombre?: string;
  email?: string;
  telefono?: string;
}

export async function descargarInformePdf(
  input: SimularEstudioInputDto,
  lead: LeadDto
): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/v1/simular/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, lead }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error al generar informe PDF" }));
    throw new Error(err.error ?? "Error al descargar el informe PDF");
  }

  return res.blob();
}

// ── Maestros y Parámetros del Sistema ─────────────────────────────────────────

export interface PoliticaRiesgoDto {
  ltvMaximo: number;
  dtiMaximo: number;
  ltvAlerta: number;
  dtiAlerta: number;
  plazoMaxAnios: number;
  ahorrosMinPct: number;
}

export interface EuriborEntrada {
  fecha: string;
  valor: number;
}

export interface TablaTributosDto {
  codigoCcaa: string;
  nombre: string;
  itpPct: number;
  ajdPct: number;
}

export async function obtenerPoliticas(): Promise<PoliticaRiesgoDto> {
  const res = await fetch(`${API_URL}/api/v1/maestros/politicas`);
  if (!res.ok) throw new Error("Error al obtener políticas de riesgo");
  return res.json();
}

export async function actualizarPoliticas(dto: PoliticaRiesgoDto): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/maestros/politicas`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Error al actualizar políticas de riesgo");
}

export async function obtenerEuribor(): Promise<EuriborEntrada[]> {
  const res = await fetch(`${API_URL}/api/v1/maestros/euribor`);
  if (!res.ok) throw new Error("Error al obtener histórico de euribor");
  return res.json();
}

export async function guardarEuribor(entrada: EuriborEntrada): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/maestros/euribor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entrada),
  });
  if (!res.ok) throw new Error("Error al guardar euribor");
}

export async function obtenerTributos(): Promise<TablaTributosDto[]> {
  const res = await fetch(`${API_URL}/api/v1/maestros/tributos`);
  if (!res.ok) throw new Error("Error al obtener tablas tributarias");
  return res.json();
}

export async function actualizarTributos(tributos: TablaTributosDto[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/maestros/tributos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tributos),
  });
  if (!res.ok) throw new Error("Error al actualizar tablas tributarias");
}
