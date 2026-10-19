import { prisma } from "../prisma-client.js";
import type { IEuriborRepository, EuriborEntrada } from "../../../core/domain/ports/IEuriborRepository.js";

function mesAFecha(yyyyMM: string): Date {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function fechaAMes(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export class PrismaEuriborRepository implements IEuriborRepository {
  async listar(): Promise<EuriborEntrada[]> {
    const registros = await prisma.registroEuribor.findMany({ orderBy: { fecha: "desc" } });
    return registros.map((r) => ({ fecha: fechaAMes(r.fecha), valor: r.valor.toNumber() }));
  }

  async upsert(entrada: EuriborEntrada): Promise<void> {
    const fechaDate = mesAFecha(entrada.fecha);
    await prisma.registroEuribor.upsert({
      where: { fecha: fechaDate },
      update: { valor: entrada.valor },
      create: { fecha: fechaDate, valor: entrada.valor },
    });
  }

  async obtenerUltimo(): Promise<EuriborEntrada | null> {
    const ultimo = await prisma.registroEuribor.findFirst({ orderBy: { fecha: "desc" } });
    if (!ultimo) return null;
    return { fecha: fechaAMes(ultimo.fecha), valor: ultimo.valor.toNumber() };
  }
}
