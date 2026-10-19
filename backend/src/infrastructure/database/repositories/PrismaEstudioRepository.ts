import { prisma } from "../prisma-client.js";
import type { IEstudioRepository, EstudioResumen } from "../../../core/domain/ports/IEstudioRepository.js";
import type { SimularEstudioInputDto, SimularEstudioOutputDto } from "../../../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";

export class PrismaEstudioRepository implements IEstudioRepository {
  async guardar(input: SimularEstudioInputDto, output: SimularEstudioOutputDto): Promise<string> {
    const { dictamen } = output;

    const participantesData = [
      {
        rol: "titular_principal",
        nombre: input.titularPrincipal.nombre,
        contrato: input.titularPrincipal.contrato,
        ingresosNetosMensuales: input.titularPrincipal.ingresosNetosMensuales,
        deudasMensualesVigentes: input.titularPrincipal.deudasMensualesVigentes,
      },
      ...(input.cotitular
        ? [
            {
              rol: "cotitular",
              nombre: input.cotitular.nombre,
              contrato: input.cotitular.contrato,
              ingresosNetosMensuales: input.cotitular.ingresosNetosMensuales,
              deudasMensualesVigentes: input.cotitular.deudasMensualesVigentes,
            },
          ]
        : []),
    ];

    const estudio = await prisma.estudioHipotecario.create({
      data: {
        id: output.solicitudId,
        precioInmueble: input.precioInmueble,
        valorTasacion: input.valorTasacion ?? null,
        tipoVivienda: input.tipoVivienda,
        finalidad: input.finalidad,
        comunidadAutonoma: input.comunidadAutonoma,
        ahorrosAportados: input.ahorrosAportados,
        modalidad: input.condicion.modalidad,
        plazoAnios: input.condicion.plazoAnios,
        tinAnual: input.condicion.tinAnual,
        semaforo: dictamen.semaforo,
        cuotaMensual: dictamen.cuotaMensual,
        capitalPrestado: dictamen.capitalPrestado,
        ratioLtv: dictamen.ratioLtv,
        ratioDti: dictamen.ratioDti,
        totalGastos: dictamen.totalGastosCompraventa,
        totalFondosPropios: dictamen.totalFondosPropiosRequeridos,
        deficitAhorro: dictamen.deficitAhorro,
        alertas: dictamen.alertas,
        recomendaciones: dictamen.recomendaciones,
        participantes: {
          create: participantesData,
        },
      },
    });

    return estudio.id;
  }

  async buscarPorId(id: string): Promise<SimularEstudioOutputDto | null> {
    const estudio = await prisma.estudioHipotecario.findUnique({
      where: { id },
      include: { participantes: true },
    });

    if (!estudio) return null;

    const titular = estudio.participantes.find((p) => p.rol === "titular_principal");
    const cotitular = estudio.participantes.find((p) => p.rol === "cotitular");
    const ingresos =
      (titular?.ingresosNetosMensuales.toNumber() ?? 0) +
      (cotitular?.ingresosNetosMensuales.toNumber() ?? 0);
    const cuota = estudio.cuotaMensual?.toNumber() ?? 0;

    return {
      solicitudId: estudio.id,
      dictamen: {
        semaforo: estudio.semaforo ?? "desconocido",
        cuotaMensual: cuota,
        cuotaMensualFormateada: `${cuota.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        capitalPrestado: estudio.capitalPrestado?.toNumber() ?? 0,
        capitalPrestadoFormateado: `${(estudio.capitalPrestado?.toNumber() ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        ratioLtv: estudio.ratioLtv?.toNumber() ?? 0,
        ratioDti: estudio.ratioDti?.toNumber() ?? 0,
        totalGastosCompraventa: estudio.totalGastos?.toNumber() ?? 0,
        totalFondosPropiosRequeridos: estudio.totalFondosPropios?.toNumber() ?? 0,
        deficitAhorro: estudio.deficitAhorro?.toNumber() ?? 0,
        ingresosNetosTotales: ingresos,
        rentaDisponibleTrasCuota: ingresos - cuota,
        alertas: estudio.alertas,
        recomendaciones: estudio.recomendaciones,
      },
      amortizacion: {
        totalIntereses: 0,
        totalCosteFinanciacion: 0,
        primerasCuotas: [],
      },
    };
  }

  async listar(limite = 20, offset = 0): Promise<EstudioResumen[]> {
    const estudios = await prisma.estudioHipotecario.findMany({
      take: limite,
      skip: offset,
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        creadoEn: true,
        semaforo: true,
        cuotaMensual: true,
        capitalPrestado: true,
        comunidadAutonoma: true,
        plazoAnios: true,
        tipoVivienda: true,
      },
    });

    return estudios.map((e) => ({
      id: e.id,
      creadoEn: e.creadoEn,
      semaforo: e.semaforo,
      cuotaMensual: e.cuotaMensual?.toNumber() ?? null,
      capitalPrestado: e.capitalPrestado?.toNumber() ?? null,
      comunidadAutonoma: e.comunidadAutonoma,
      plazoAnios: e.plazoAnios,
      tipoVivienda: e.tipoVivienda,
    }));
  }

  async contar(): Promise<number> {
    return prisma.estudioHipotecario.count();
  }
}
