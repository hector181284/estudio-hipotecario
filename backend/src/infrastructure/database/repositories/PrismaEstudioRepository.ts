import { prisma } from "../prisma-client.js";
import type { IEstudioRepository, EstudioResumen, EstudioCompletoPersistido } from "../../../core/domain/ports/IEstudioRepository.js";
import type { SimularEstudioInputDto, SimularEstudioOutputDto } from "../../../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";
import { CalculadoraAmortizacionFrancesa } from "../../../core/domain/services/CalculadoraAmortizacionFrancesa.js";
import { Money } from "../../../core/domain/value-objects/Money.js";
import { Percentage } from "../../../core/domain/value-objects/Percentage.js";
import { PlazoMeses } from "../../../core/domain/value-objects/PlazoMeses.js";
import type { TipoContratoLaboral } from "../../../core/domain/models/Participante.js";
import type { TipoVivienda, FinalidadPrestamo } from "../../../core/domain/models/Inmueble.js";
import type { ModalidadTipo } from "../../../core/domain/models/CondicionFinanciera.js";

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
    const completo = await this.buscarCompletoPorId(id);
    return completo ? completo.output : null;
  }

  async buscarCompletoPorId(id: string): Promise<EstudioCompletoPersistido | null> {
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
    const capital = estudio.capitalPrestado?.toNumber() ?? 0;

    const input: SimularEstudioInputDto = {
      solicitudId: estudio.id,
      precioInmueble: estudio.precioInmueble.toNumber(),
      valorTasacion: estudio.valorTasacion ? estudio.valorTasacion.toNumber() : undefined,
      tipoVivienda: estudio.tipoVivienda as TipoVivienda,
      finalidad: estudio.finalidad as FinalidadPrestamo,
      comunidadAutonoma: estudio.comunidadAutonoma,
      ahorrosAportados: estudio.ahorrosAportados.toNumber(),
      titularPrincipal: {
        nombre: titular?.nombre ?? "Titular Principal",
        contrato: (titular?.contrato ?? "indefinido") as TipoContratoLaboral,
        ingresosNetosMensuales: titular?.ingresosNetosMensuales.toNumber() ?? 0,
        deudasMensualesVigentes: titular?.deudasMensualesVigentes.toNumber() ?? 0,
      },
      cotitular: cotitular
        ? {
            nombre: cotitular.nombre,
            contrato: cotitular.contrato as TipoContratoLaboral,
            ingresosNetosMensuales: cotitular.ingresosNetosMensuales.toNumber(),
            deudasMensualesVigentes: cotitular.deudasMensualesVigentes.toNumber(),
          }
        : undefined,
      condicion: {
        modalidad: estudio.modalidad as ModalidadTipo,
        plazoAnios: estudio.plazoAnios,
        tinAnual: estudio.tinAnual.toNumber(),
      },
    };

    // Regenerar cuadro de amortización preciso para el informe
    const resultadoAmort = CalculadoraAmortizacionFrancesa.generarCuadro(
      Money.from(capital),
      Percentage.from(estudio.tinAnual.toNumber()),
      PlazoMeses.fromYears(estudio.plazoAnios)
    );

    const output: SimularEstudioOutputDto = {
      solicitudId: estudio.id,
      dictamen: {
        semaforo: estudio.semaforo ?? "desconocido",
        cuotaMensual: cuota,
        cuotaMensualFormateada: `${cuota.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        capitalPrestado: capital,
        capitalPrestadoFormateado: `${capital.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
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
        totalIntereses: resultadoAmort.totalIntereses.toNumber(),
        totalCosteFinanciacion: resultadoAmort.costeTotalFinanciacion.toNumber(),
        primerasCuotas: resultadoAmort.lineas.slice(0, 12).map((l) => ({
          mes: l.numeroMes,
          cuota: l.cuotaTotal.toNumber(),
          capital: l.capitalAmortizado.toNumber(),
          interes: l.interesPagado.toNumber(),
          pendiente: l.capitalPendiente.toNumber(),
        })),
      },
    };

    return { input, output };
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
