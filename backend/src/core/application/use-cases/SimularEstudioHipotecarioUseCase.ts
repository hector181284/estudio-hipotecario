import { Money } from "../../domain/value-objects/Money.js";
import { Percentage } from "../../domain/value-objects/Percentage.js";
import { PlazoMeses } from "../../domain/value-objects/PlazoMeses.js";
import { Inmueble, TipoVivienda, FinalidadPrestamo } from "../../domain/models/Inmueble.js";
import { Participante, TipoContratoLaboral } from "../../domain/models/Participante.js";
import { CondicionFinanciera, ModalidadTipo } from "../../domain/models/CondicionFinanciera.js";
import { SolicitudHipotecaria } from "../../domain/models/SolicitudHipotecaria.js";
import { DictamenViabilidad } from "../../domain/services/MotorScoringViabilidad.js";
import { ResultadoAmortizacion } from "../../domain/services/CalculadoraAmortizacionFrancesa.js";
import type { IEstudioRepository } from "../../domain/ports/IEstudioRepository.js";

export interface SimularEstudioInputDto {
  solicitudId?: string;
  precioInmueble: number;
  valorTasacion?: number;
  tipoVivienda: TipoVivienda;
  finalidad: FinalidadPrestamo;
  comunidadAutonoma: string;
  ahorrosAportados: number;
  titularPrincipal: {
    nombre: string;
    contrato: TipoContratoLaboral;
    ingresosNetosMensuales: number;
    deudasMensualesVigentes: number;
  };
  cotitular?: {
    nombre: string;
    contrato: TipoContratoLaboral;
    ingresosNetosMensuales: number;
    deudasMensualesVigentes: number;
  };
  condicion: {
    modalidad: ModalidadTipo;
    plazoAnios: number;
    tinAnual: number;
  };
}

export interface SimularEstudioOutputDto {
  solicitudId: string;
  dictamen: {
    semaforo: string;
    cuotaMensual: number;
    cuotaMensualFormateada: string;
    capitalPrestado: number;
    capitalPrestadoFormateado: string;
    ratioLtv: number;
    ratioDti: number;
    totalGastosCompraventa: number;
    totalFondosPropiosRequeridos: number;
    deficitAhorro: number;
    ingresosNetosTotales: number;
    rentaDisponibleTrasCuota: number;
    alertas: string[];
    recomendaciones: string[];
  };
  amortizacion: {
    totalIntereses: number;
    totalCosteFinanciacion: number;
    primerasCuotas: {
      mes: number;
      cuota: number;
      capital: number;
      interes: number;
      pendiente: number;
    }[];
  };
}

export class SimularEstudioHipotecarioUseCase {
  constructor(private readonly repository?: IEstudioRepository) {}

  public async execute(dto: SimularEstudioInputDto): Promise<SimularEstudioOutputDto> {
    const solicitudId = dto.solicitudId ?? `SOL-${Date.now()}`;

    // Construcción de entidades de dominio
    const inmueble = new Inmueble({
      precioCompraventa: Money.from(dto.precioInmueble),
      valorTasacion: dto.valorTasacion ? Money.from(dto.valorTasacion) : undefined,
      tipo: dto.tipoVivienda,
      finalidad: dto.finalidad,
      comunidadAutonoma: dto.comunidadAutonoma,
    });

    const participantes: Participante[] = [
      Participante.crear({
        id: "TIT-1",
        nombre: dto.titularPrincipal.nombre,
        rol: "titular_principal",
        contrato: dto.titularPrincipal.contrato,
        ingresosNetosMensuales: Money.from(dto.titularPrincipal.ingresosNetosMensuales),
        deudasMensualesVigentes: Money.from(dto.titularPrincipal.deudasMensualesVigentes),
      }),
    ];

    if (dto.cotitular) {
      participantes.push(
        Participante.crear({
          id: "TIT-2",
          nombre: dto.cotitular.nombre,
          rol: "cotitular",
          contrato: dto.cotitular.contrato,
          ingresosNetosMensuales: Money.from(dto.cotitular.ingresosNetosMensuales),
          deudasMensualesVigentes: Money.from(dto.cotitular.deudasMensualesVigentes),
        })
      );
    }

    const condicion = new CondicionFinanciera({
      modalidad: dto.condicion.modalidad,
      plazo: PlazoMeses.fromYears(dto.condicion.plazoAnios),
      tinNominalAnual: Percentage.from(dto.condicion.tinAnual),
    });

    const solicitud = new SolicitudHipotecaria({
      id: solicitudId,
      inmueble,
      participantes,
      condicion,
      ahorrosDisponibles: Money.from(dto.ahorrosAportados),
    });

    const dictamen: DictamenViabilidad = solicitud.evaluarViabilidad();
    const amortizacion: ResultadoAmortizacion = solicitud.generarCuadroAmortizacion();

    const result: SimularEstudioOutputDto = {
      solicitudId,
      dictamen: {
        semaforo: dictamen.semaforo,
        cuotaMensual: dictamen.cuotaMensual.toNumber(),
        cuotaMensualFormateada: dictamen.cuotaMensual.formatEuro(),
        capitalPrestado: dictamen.capitalPrestado.toNumber(),
        capitalPrestadoFormateado: dictamen.capitalPrestado.formatEuro(),
        ratioLtv: dictamen.ratioLtv.toNumber(),
        ratioDti: dictamen.ratioDti.toNumber(),
        totalGastosCompraventa: dictamen.totalGastosCompraventa.toNumber(),
        totalFondosPropiosRequeridos: dictamen.totalFondosPropiosRequeridos.toNumber(),
        deficitAhorro: dictamen.deficitAhorro.toNumber(),
        ingresosNetosTotales: dictamen.ingresosNetosTotales.toNumber(),
        rentaDisponibleTrasCuota: dictamen.rentaDisponibleTrasCuota.toNumber(),
        alertas: dictamen.alertas,
        recomendaciones: dictamen.recomendaciones,
      },
      amortizacion: {
        totalIntereses: amortizacion.totalIntereses.toNumber(),
        totalCosteFinanciacion: amortizacion.costeTotalFinanciacion.toNumber(),
        primerasCuotas: amortizacion.lineas.slice(0, 12).map((l) => ({
          mes: l.numeroMes,
          cuota: l.cuotaTotal.toNumber(),
          capital: l.capitalAmortizado.toNumber(),
          interes: l.interesPagado.toNumber(),
          pendiente: l.capitalPendiente.toNumber(),
        })),
      },
    };

    if (this.repository) {
      await this.repository.guardar(dto, result);
    }

    return result;
  }
}
