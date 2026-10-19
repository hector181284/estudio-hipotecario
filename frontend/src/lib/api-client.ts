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
