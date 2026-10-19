import { prisma } from "../prisma-client.js";
import type { IPoliticaRiesgoRepository, PoliticaRiesgoDto } from "../../../core/domain/ports/IPoliticaRiesgoRepository.js";

const DEFAULTS: PoliticaRiesgoDto = {
  ltvMaximo: 0.80,
  dtiMaximo: 0.35,
  ltvAlerta: 0.75,
  dtiAlerta: 0.30,
  plazoMaxAnios: 30,
  ahorrosMinPct: 0.20,
};

export class PrismaPoliticaRiesgoRepository implements IPoliticaRiesgoRepository {
  async obtener(): Promise<PoliticaRiesgoDto> {
    const politica = await prisma.politicaRiesgo.findUnique({ where: { id: "default" } });
    if (!politica) {
      const creada = await prisma.politicaRiesgo.create({
        data: { id: "default", ...DEFAULTS },
      });
      return {
        ltvMaximo: creada.ltvMaximo.toNumber(),
        dtiMaximo: creada.dtiMaximo.toNumber(),
        ltvAlerta: creada.ltvAlerta.toNumber(),
        dtiAlerta: creada.dtiAlerta.toNumber(),
        plazoMaxAnios: creada.plazoMaxAnios,
        ahorrosMinPct: creada.ahorrosMinPct.toNumber(),
      };
    }
    return {
      ltvMaximo: politica.ltvMaximo.toNumber(),
      dtiMaximo: politica.dtiMaximo.toNumber(),
      ltvAlerta: politica.ltvAlerta.toNumber(),
      dtiAlerta: politica.dtiAlerta.toNumber(),
      plazoMaxAnios: politica.plazoMaxAnios,
      ahorrosMinPct: politica.ahorrosMinPct.toNumber(),
    };
  }

  async actualizar(dto: PoliticaRiesgoDto): Promise<void> {
    await prisma.politicaRiesgo.upsert({
      where: { id: "default" },
      update: {
        ltvMaximo: dto.ltvMaximo,
        dtiMaximo: dto.dtiMaximo,
        ltvAlerta: dto.ltvAlerta,
        dtiAlerta: dto.dtiAlerta,
        plazoMaxAnios: dto.plazoMaxAnios,
        ahorrosMinPct: dto.ahorrosMinPct,
      },
      create: {
        id: "default",
        ltvMaximo: dto.ltvMaximo,
        dtiMaximo: dto.dtiMaximo,
        ltvAlerta: dto.ltvAlerta,
        dtiAlerta: dto.dtiAlerta,
        plazoMaxAnios: dto.plazoMaxAnios,
        ahorrosMinPct: dto.ahorrosMinPct,
      },
    });
  }
}
