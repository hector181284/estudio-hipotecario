export type PropertyType = "segunda_mano" | "obra_nueva";
export type LoanPurpose = "primera_vivienda" | "segunda_residencia" | "inversion";
export type EmploymentType = "indefinido" | "funcionario" | "autonomo" | "temporal" | "pensionista";
export type RateType = "fijo" | "variable" | "mixto";
export type ViabilityStatus = "favorable" | "condicionado" | "riesgo_elevado";

export interface SimularEstudioInputDto {
  precioInmueble: number;
  valorTasacion?: number;
  tipoVivienda: PropertyType;
  finalidad: LoanPurpose;
  comunidadAutonoma: string;
  ahorrosAportados: number;
  titularPrincipal: {
    nombre: string;
    contrato: EmploymentType;
    ingresosNetosMensuales: number;
    deudasMensualesVigentes: number;
    edad?: number;
    hijosACargo?: number;
  };
  cotitular?: {
    nombre: string;
    contrato: EmploymentType;
    ingresosNetosMensuales: number;
    deudasMensualesVigentes: number;
    edad?: number;
    hijosACargo?: number;
  };
  condicion: {
    modalidad: RateType;
    plazoAnios: number;
    tinAnual: number;
  };
}

export interface SimularEstudioOutputDto {
  solicitudId: string;
  dictamen: {
    semaforo: ViabilityStatus;
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
