import Decimal from "decimal.js";
import { Money } from "../value-objects/Money.js";
import { Percentage } from "../value-objects/Percentage.js";
import { PlazoMeses } from "../value-objects/PlazoMeses.js";

export interface LineaAmortizacion {
  numeroMes: number;
  cuotaTotal: Money;
  capitalAmortizado: Money;
  interesPagado: Money;
  capitalPendiente: Money;
}

export interface ResultadoAmortizacion {
  cuotaMensual: Money;
  totalIntereses: Money;
  costeTotalFinanciacion: Money;
  lineas: LineaAmortizacion[];
}

export class CalculadoraAmortizacionFrancesa {
  /**
   * Calcula la cuota mensual constante del Sistema Francés con precisión decimal estricta:
   * Cuota = Principal * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
   */
  public static calcularCuotaMensual(
    capitalPrestado: Money,
    tinAnual: Percentage,
    plazo: PlazoMeses
  ): Money {
    if (capitalPrestado.isZero()) {
      return Money.zero();
    }

    const n = plazo.getMonths();
    const i = new Decimal(tinAnual.toRatio()).dividedBy(12);

    if (i.isZero()) {
      return capitalPrestado.divide(n);
    }

    // factor = (1 + i)^n
    const factor = new Decimal(1).plus(i).pow(n);
    const numerador = new Decimal(capitalPrestado.toNumber()).times(i).times(factor);
    const denominador = factor.minus(1);

    const cuota = numerador.dividedBy(denominador);
    return Money.from(cuota);
  }

  /**
   * Genera el cuadro de amortización completo mensual, asegurando cuadre perfecto
   * de capital céntimo a céntimo en la última cuota.
   */
  public static generarCuadro(
    capitalPrestado: Money,
    tinAnual: Percentage,
    plazo: PlazoMeses
  ): ResultadoAmortizacion {
    const lineas: LineaAmortizacion[] = [];
    if (capitalPrestado.isZero()) {
      return {
        cuotaMensual: Money.zero(),
        totalIntereses: Money.zero(),
        costeTotalFinanciacion: Money.zero(),
        lineas: [],
      };
    }

    const totalMeses = plazo.getMonths();
    const cuotaMensual = this.calcularCuotaMensual(capitalPrestado, tinAnual, plazo);
    const tasaMensual = new Decimal(tinAnual.toRatio()).dividedBy(12);

    let saldoPendiente = capitalPrestado;
    let totalIntereses = Money.zero();

    for (let mes = 1; mes <= totalMeses; mes++) {
      // Intereses del período: Saldo * i
      const interesMesDecimal = new Decimal(saldoPendiente.toNumber()).times(tasaMensual);
      const interesMes = Money.from(interesMesDecimal);

      // Capital amortizado: Cuota - Intereses
      let capitalMes = cuotaMensual.subtract(interesMes);

      // Ajuste de cuadre en la última cuota o si el capital supera el saldo restante
      if (mes === totalMeses || capitalMes.isGreaterThan(saldoPendiente)) {
        capitalMes = saldoPendiente;
        saldoPendiente = Money.zero();
      } else {
        saldoPendiente = saldoPendiente.subtract(capitalMes);
      }

      const cuotaRealMes = capitalMes.add(interesMes);
      totalIntereses = totalIntereses.add(interesMes);

      lineas.push({
        numeroMes: mes,
        cuotaTotal: cuotaRealMes,
        capitalAmortizado: capitalMes,
        interesPagado: interesMes,
        capitalPendiente: saldoPendiente,
      });

      if (saldoPendiente.isZero()) break;
    }

    const costeTotalFinanciacion = capitalPrestado.add(totalIntereses);

    return {
      cuotaMensual,
      totalIntereses,
      costeTotalFinanciacion,
      lineas,
    };
  }
}
