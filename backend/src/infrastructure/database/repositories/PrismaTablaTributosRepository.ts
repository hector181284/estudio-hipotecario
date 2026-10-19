import { prisma } from "../prisma-client.js";
import type { ITablaTributosRepository, TablaTributosDto } from "../../../core/domain/ports/ITablaTributosRepository.js";

export class PrismaTablaTributosRepository implements ITablaTributosRepository {
  async listar(): Promise<TablaTributosDto[]> {
    const tablas = await prisma.tablaTributosCcaa.findMany({ orderBy: { codigoCcaa: "asc" } });
    return tablas.map((t) => ({
      codigoCcaa: t.codigoCcaa,
      nombre: t.nombre,
      itpPct: t.itpPct.toNumber(),
      ajdPct: t.ajdPct.toNumber(),
    }));
  }

  async actualizar(tributo: TablaTributosDto): Promise<void> {
    await prisma.tablaTributosCcaa.upsert({
      where: { codigoCcaa: tributo.codigoCcaa },
      update: {
        nombre: tributo.nombre,
        itpPct: tributo.itpPct,
        ajdPct: tributo.ajdPct,
      },
      create: {
        codigoCcaa: tributo.codigoCcaa,
        nombre: tributo.nombre,
        itpPct: tributo.itpPct,
        ajdPct: tributo.ajdPct,
      },
    });
  }
}
