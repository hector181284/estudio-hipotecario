import { prisma } from "../prisma-client.js";
import type { IEstudioRepository, EstudioResumen, EstudioCompletoPersistido, FiltrosEstudio, DatosSeguimientoDto, SeguimientoCompleto } from "../../../core/domain/ports/IEstudioRepository.js";
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
        edad: input.titularPrincipal.edad ?? null,
        hijosACargo: input.titularPrincipal.hijosACargo ?? 0,
      },
      ...(input.cotitular
        ? [
            {
              rol: "cotitular",
              nombre: input.cotitular.nombre,
              contrato: input.cotitular.contrato,
              ingresosNetosMensuales: input.cotitular.ingresosNetosMensuales,
              deudasMensualesVigentes: input.cotitular.deudasMensualesVigentes,
              edad: input.cotitular.edad ?? null,
              hijosACargo: input.cotitular.hijosACargo ?? 0,
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
        edad: titular?.edad ?? undefined,
        hijosACargo: titular?.hijosACargo ?? 0,
      },
      cotitular: cotitular
        ? {
            nombre: cotitular.nombre,
            contrato: cotitular.contrato as TipoContratoLaboral,
            ingresosNetosMensuales: cotitular.ingresosNetosMensuales.toNumber(),
            deudasMensualesVigentes: cotitular.deudasMensualesVigentes.toNumber(),
            edad: cotitular.edad ?? undefined,
            hijosACargo: cotitular.hijosACargo ?? 0,
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

    const seguimiento: SeguimientoCompleto = {
      estadoOperacion: estudio.estadoOperacion ?? "estudio_inicial",
      bancoSeleccionado: estudio.bancoSeleccionado,
      gestorAsignado: estudio.gestorAsignado,
      fechaLimiteArras: estudio.fechaLimiteArras,
      importeArras: estudio.importeArras ? estudio.importeArras.toNumber() : null,
      tasadora: estudio.tasadora,
      valorTasacionReal: estudio.valorTasacionReal ? estudio.valorTasacionReal.toNumber() : null,
      notaria: estudio.notaria,
      fechaFirmaNotaria: estudio.fechaFirmaNotaria,
      notasSeguimiento: estudio.notasSeguimiento ?? [],
    };

    return { input, output, seguimiento };
  }

  async actualizarSeguimiento(id: string, datos: DatosSeguimientoDto): Promise<void> {
    const dataToUpdate: any = {};

    if (datos.estadoOperacion !== undefined) dataToUpdate.estadoOperacion = datos.estadoOperacion;
    if (datos.bancoSeleccionado !== undefined) dataToUpdate.bancoSeleccionado = datos.bancoSeleccionado;
    if (datos.gestorAsignado !== undefined) dataToUpdate.gestorAsignado = datos.gestorAsignado;
    if (datos.fechaLimiteArras !== undefined) {
      dataToUpdate.fechaLimiteArras = datos.fechaLimiteArras ? new Date(datos.fechaLimiteArras) : null;
    }
    if (datos.importeArras !== undefined) {
      dataToUpdate.importeArras = datos.importeArras != null ? datos.importeArras : null;
    }
    if (datos.tasadora !== undefined) dataToUpdate.tasadora = datos.tasadora;
    if (datos.valorTasacionReal !== undefined) {
      dataToUpdate.valorTasacionReal = datos.valorTasacionReal != null ? datos.valorTasacionReal : null;
    }
    if (datos.notaria !== undefined) dataToUpdate.notaria = datos.notaria;
    if (datos.fechaFirmaNotaria !== undefined) {
      dataToUpdate.fechaFirmaNotaria = datos.fechaFirmaNotaria ? new Date(datos.fechaFirmaNotaria) : null;
    }

    if (datos.nuevaNota && datos.nuevaNota.trim()) {
      const fechaNota = new Date().toISOString();
      const notaFormateada = `[${fechaNota}] ${datos.nuevaNota.trim()}`;
      dataToUpdate.notasSeguimiento = {
        push: notaFormateada,
      };
    }

    await prisma.estudioHipotecario.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  private construirWhere(filtros?: FiltrosEstudio) {
    if (!filtros) return {};

    const where: any = {};

    if (filtros.semaforo && filtros.semaforo !== "todos") {
      where.semaforo = filtros.semaforo;
    }

    if (filtros.estadoOperacion && filtros.estadoOperacion !== "todos") {
      where.estadoOperacion = filtros.estadoOperacion;
    }

    if (filtros.desde || filtros.hasta) {
      where.creadoEn = {};
      if (filtros.desde) where.creadoEn.gte = filtros.desde;
      if (filtros.hasta) {
        const finDelDia = new Date(filtros.hasta);
        finDelDia.setHours(23, 59, 59, 999);
        where.creadoEn.lte = finDelDia;
      }
    }

    if (filtros.search && filtros.search.trim()) {
      const q = filtros.search.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { participantes: { some: { nombre: { contains: q, mode: "insensitive" } } } },
      ];
    }

    return where;
  }

  async listar(limite = 20, offset = 0, filtros?: FiltrosEstudio): Promise<EstudioResumen[]> {
    const where = this.construirWhere(filtros);
    const estudios = await prisma.estudioHipotecario.findMany({
      where,
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
        estadoOperacion: true,
        participantes: {
          select: {
            nombre: true,
            rol: true,
          },
        },
      },
    });

    return estudios.map((e) => {
      const titular = e.participantes.find((p) => p.rol === "titular_principal");
      const cotitular = e.participantes.find((p) => p.rol === "cotitular");
      return {
        id: e.id,
        creadoEn: e.creadoEn,
        semaforo: e.semaforo,
        cuotaMensual: e.cuotaMensual?.toNumber() ?? null,
        capitalPrestado: e.capitalPrestado?.toNumber() ?? null,
        comunidadAutonoma: e.comunidadAutonoma,
        plazoAnios: e.plazoAnios,
        tipoVivienda: e.tipoVivienda,
        titularNombre: titular?.nombre,
        cotitularNombre: cotitular?.nombre,
        estadoOperacion: e.estadoOperacion ?? "estudio_inicial",
      };
    });
  }

  async contar(filtros?: FiltrosEstudio): Promise<number> {
    const where = this.construirWhere(filtros);
    return prisma.estudioHipotecario.count({ where });
  }
}
