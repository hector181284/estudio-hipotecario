import { Money } from "../value-objects/Money.js";
import { Percentage } from "../value-objects/Percentage.js";
import { Inmueble } from "../models/Inmueble.js";
import { Participante } from "../models/Participante.js";
import { CalculadoraFiscalAutonomica, GastosCompraventaEHipoteca } from "./CalculadoraFiscalAutonomica.js";
import { CalculadoraAmortizacionFrancesa } from "./CalculadoraAmortizacionFrancesa.js";
import { CondicionFinanciera } from "../models/CondicionFinanciera.js";

export type SemaforoRiesgo = "favorable" | "condicionado" | "riesgo_elevado";

export interface PoliticaRiesgoBancario {
  maxLtvPrimeraVivienda: Percentage;  // 80%
  maxLtvSegundaVivienda: Percentage;  // 70%
  maxDtiOptimo: Percentage;           // 35%
  maxDtiAlerta: Percentage;           // 40%
  minIngresoSubsistenciaPorAdulto: Money; // 700 €
}

export const POLITICA_RIESGO_POR_DEFECTO: PoliticaRiesgoBancario = {
  maxLtvPrimeraVivienda: Percentage.from(80.0),
  maxLtvSegundaVivienda: Percentage.from(70.0),
  maxDtiOptimo: Percentage.from(35.0),
  maxDtiAlerta: Percentage.from(40.0),
  minIngresoSubsistenciaPorAdulto: Money.from(700.0),
};

export interface DictamenViabilidad {
  semaforo: SemaforoRiesgo;
  ratioLtv: Percentage;
  ratioDti: Percentage;
  cuotaMensual: Money;
  capitalPrestado: Money;
  ahorroAportado: Money;
  totalGastosCompraventa: Money;
  totalFondosPropiosRequeridos: Money;
  deficitAhorro: Money;
  ingresosNetosTotales: Money;
  rentaDisponibleTrasCuota: Money;
  alertas: string[];
  recomendaciones: string[];
}

export class MotorScoringViabilidad {
  public static evaluar(
    inmueble: Inmueble,
    participantes: Participante[],
    condicion: CondicionFinanciera,
    ahorrosDisponibles: Money,
    politica: PoliticaRiesgoBancario = POLITICA_RIESGO_POR_DEFECTO
  ): DictamenViabilidad {
    const gastos = CalculadoraFiscalAutonomica.calcularGastos(
      inmueble.precioCompraventa,
      inmueble.tipo,
      inmueble.comunidadAutonoma
    );

    // Capital disponible para la entrada tras pagar la provisión de gastos
    let ahorroParaEntrada = Money.zero();
    let deficitAhorro = Money.zero();

    if (ahorrosDisponibles.isGreaterThanOrEqualTo(gastos.totalGastosCompraventa)) {
      ahorroParaEntrada = ahorrosDisponibles.subtract(gastos.totalGastosCompraventa);
    } else {
      deficitAhorro = gastos.totalGastosCompraventa.subtract(ahorrosDisponibles);
    }

    // Capital que se solicita prestar: Precio - Ahorro destinado a la entrada
    let capitalPrestado = inmueble.precioCompraventa.subtract(ahorroParaEntrada);
    if (capitalPrestado.isNegative()) capitalPrestado = Money.zero();

    // Cálculo del LTV sobre la base prudencial de garantía
    const valorGarantia = inmueble.valorGarantiaBase();
    const ltvRatio = valorGarantia.isPositive()
      ? Percentage.fromRatio(capitalPrestado.toNumber() / valorGarantia.toNumber())
      : Percentage.zero();

    const limiteLtv = inmueble.finalidad === "primera_vivienda"
      ? politica.maxLtvPrimeraVivienda
      : politica.maxLtvSegundaVivienda;

    // Cálculo de cuota mensual mediante amortización francesa
    const cuotaMensual = CalculadoraAmortizacionFrancesa.calcularCuotaMensual(
      capitalPrestado,
      condicion.tinEfectivo(),
      condicion.plazo
    );

    // Suma de solvencia y compromisos de todos los participantes
    let ingresosNetosTotales = Money.zero();
    let deudasVigentesTotales = Money.zero();

    for (const p of participantes) {
      ingresosNetosTotales = ingresosNetosTotales.add(p.ingresosNetosMensuales);
      deudasVigentesTotales = deudasVigentesTotales.add(p.deudasMensualesVigentes);
    }

    const cargaMensualTotal = cuotaMensual.add(deudasVigentesTotales);
    const dtiRatio = ingresosNetosTotales.isPositive()
      ? Percentage.fromRatio(cargaMensualTotal.toNumber() / ingresosNetosTotales.toNumber())
      : Percentage.from(100);

    const rentaDisponibleTrasCuota = ingresosNetosTotales.subtract(cargaMensualTotal);

    // Fondos propios totales requeridos: 20% entrada estándar + gastos
    const entradaMinimaRecomendada = inmueble.precioCompraventa.multiply(1 - limiteLtv.toNumber() / 100);
    const totalFondosPropiosRequeridos = entradaMinimaRecomendada.add(gastos.totalGastosCompraventa);

    if (totalFondosPropiosRequeridos.isGreaterThan(ahorrosDisponibles)) {
      deficitAhorro = totalFondosPropiosRequeridos.subtract(ahorrosDisponibles);
    }

    const alertas: string[] = [];
    const recomendaciones: string[] = [];
    let semaforo: SemaforoRiesgo = "favorable";

    // 1. Evaluación de LTV
    if (ltvRatio.isGreaterThan(limiteLtv)) {
      semaforo = "riesgo_elevado";
      alertas.push(
        `El porcentaje de financiación solicitado (${ltvRatio.toString(1)}) supera el límite bancario regulatorio (${limiteLtv.toString(1)}).`
      );
      recomendaciones.push(
        `Aportar ${deficitAhorro.formatEuro()} adicionales de ahorro o solicitar un aval con garantía hipotecaria complementaria.`
      );
    }

    // 2. Evaluación de DTI (Ratio de endeudamiento)
    if (dtiRatio.isGreaterThan(politica.maxDtiAlerta)) {
      semaforo = "riesgo_elevado";
      alertas.push(
        `El ratio de endeudamiento mensual (${dtiRatio.toString(1)}) excede el umbral prudencial de solvencia (${politica.maxDtiAlerta.toString(1)}).`
      );
      recomendaciones.push(
        `Amortizar deudas personales previas o ampliar el plazo de la hipoteca a ${Math.min(30, condicion.plazo.getYears() + 5)} años para abaratar la cuota mensual.`
      );
    } else if (dtiRatio.isGreaterThan(politica.maxDtiOptimo)) {
      if (semaforo !== "riesgo_elevado") semaforo = "condicionado";
      alertas.push(
        `El ratio de endeudamiento (${dtiRatio.toString(1)}) se encuentra en tramo de observación (entre ${politica.maxDtiOptimo.toString(1)} y ${politica.maxDtiAlerta.toString(1)}).`
      );
      recomendaciones.push(
        `La operación es viable condicionada a justificar alta estabilidad laboral y ausencia de morosidad en CIRBE.`
      );
    }

    // 3. Evaluación de provisión de fondos para gastos
    if (ahorrosDisponibles.isLessThan(gastos.totalGastosCompraventa)) {
      semaforo = "riesgo_elevado";
      alertas.push(
        `Los ahorros disponibles (${ahorrosDisponibles.formatEuro()}) no son suficientes para cubrir los gastos e impuestos iniciales de compraventa (${gastos.totalGastosCompraventa.formatEuro()}).`
      );
    }

    // 4. Umbral de subsistencia y cargas familiares
    let totalHijos = 0;
    for (const p of participantes) {
      totalHijos += p.hijosACargo ?? 0;
    }
    const gastoHijosEstimado = Money.from(200.0).multiply(totalHijos);
    const subsistenciaAdultos = politica.minIngresoSubsistenciaPorAdulto.multiply(participantes.length);
    const subsistenciaMinima = subsistenciaAdultos.add(gastoHijosEstimado);

    if (rentaDisponibleTrasCuota.isLessThan(subsistenciaMinima)) {
      if (semaforo !== "riesgo_elevado") semaforo = "condicionado";
      if (totalHijos > 0) {
        alertas.push(
          `La renta disponible (${rentaDisponibleTrasCuota.formatEuro()}) es ajustada para cubrir el umbral mínimo de subsistencia con ${totalHijos} hijo(s) a cargo (${subsistenciaMinima.formatEuro()} estimados).`
        );
      } else {
        alertas.push(
          `La renta remanente tras cuota (${rentaDisponibleTrasCuota.formatEuro()}) roza el umbral de subsistencia mínima de la unidad familiar.`
        );
      }
    }

    // 5. Evaluación de Edad al Vencimiento (Límite estándar bancario: 75 años)
    const plazoAnios = condicion.plazo.getYears();
    for (const p of participantes) {
      if (p.edad && p.edad > 0) {
        const edadVencimiento = p.edad + plazoAnios;
        if (edadVencimiento > 75) {
          const maxPlazoViable = Math.max(5, 75 - p.edad);
          if (edadVencimiento > 78) {
            semaforo = "riesgo_elevado";
          } else if (semaforo !== "riesgo_elevado") {
            semaforo = "condicionado";
          }
          alertas.push(
            `Edad de ${p.nombre} (${p.edad} años) al vencimiento (${edadVencimiento} años) supera el límite prudencial bancario de 75 años.`
          );
          recomendaciones.push(
            `Ajustar el plazo de amortización a un máximo de ${maxPlazoViable} años para no exceder los 75 años al finalizar la hipoteca.`
          );
        }
      }
    }

    // 6. Evaluación de Estabilidad Laboral
    const tieneTemporal = participantes.some((p) => p.contrato === "temporal");
    const tieneAutonomo = participantes.some((p) => p.contrato === "autonomo");
    const todosFuncionarios = participantes.length > 0 && participantes.every((p) => p.contrato === "funcionario");

    if (tieneTemporal) {
      if (semaforo === "favorable") semaforo = "condicionado";
      alertas.push(
        `Contrato temporal detectado: las entidades bancarias suelen exigir un avalista con contrato indefinido o no ponderar el 100% de estos ingresos.`
      );
      recomendaciones.push(
        `Aportar cotitular con contrato indefinido o aval solidario para mitigar el riesgo laboral.`
      );
    }

    if (tieneAutonomo) {
      recomendaciones.push(
        `Perfil de trabajador autónomo: preparar los 2 últimos ejercicios de IRPF (modelos 100) y declaraciones trimestrales de IVA/IRPF (modelos 130/303) para justificar solvencia continuada.`
      );
    }

    if (todosFuncionarios) {
      recomendaciones.push(
        `Perfil de empleado público / funcionario: excelente scoring de estabilidad laboral, lo que favorece tipos de interés competitivos y mayor flexibilidad en concesión.`
      );
    }

    return {
      semaforo,
      ratioLtv: ltvRatio,
      ratioDti: dtiRatio,
      cuotaMensual,
      capitalPrestado,
      ahorroAportado: ahorrosDisponibles,
      totalGastosCompraventa: gastos.totalGastosCompraventa,
      totalFondosPropiosRequeridos,
      deficitAhorro,
      ingresosNetosTotales,
      rentaDisponibleTrasCuota,
      alertas,
      recomendaciones,
    };
  }
}
