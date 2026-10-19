import { describe, it, expect } from "vitest";
import { CalculadoraAmortizacionFrancesa } from "../../src/core/domain/services/CalculadoraAmortizacionFrancesa.js";
import { Money } from "../../src/core/domain/value-objects/Money.js";
import { Percentage } from "../../src/core/domain/value-objects/Percentage.js";
import { PlazoMeses } from "../../src/core/domain/value-objects/PlazoMeses.js";

describe("Servicio de Dominio: CalculadoraAmortizacionFrancesa", () => {
  it("debe calcular la cuota mensual correcta para un préstamo de 200.000€ al 3% a 25 años", () => {
    const capital = Money.from(200000);
    const tin = Percentage.from(3.0);
    const plazo = PlazoMeses.fromYears(25);

    const cuota = CalculadoraAmortizacionFrancesa.calcularCuotaMensual(capital, tin, plazo);

    // Cuota teórica estándar para 200.000€ al 3% a 300 meses: 948.42 €
    expect(cuota.toNumber()).toBeCloseTo(948.42, 1);
  });

  it("el cuadro completo debe cuadrar el 100% del capital amortizado céntimo a céntimo", () => {
    const capital = Money.from(150000);
    const tin = Percentage.from(2.85);
    const plazo = PlazoMeses.fromYears(20);

    const resultado = CalculadoraAmortizacionFrancesa.generarCuadro(capital, tin, plazo);

    expect(resultado.lineas.length).toBe(240); // 20 años * 12 meses

    // Suma de amortización de capital de todas las cuotas
    let sumaCapitalAmortizado = Money.zero();
    for (const linea of resultado.lineas) {
      sumaCapitalAmortizado = sumaCapitalAmortizado.add(linea.capitalAmortizado);
    }

    // Cuadre exacto con el principal
    expect(sumaCapitalAmortizado.equals(capital)).toBe(true);

    // Saldo pendiente en la última cuota debe ser 0.00 €
    const ultimaLinea = resultado.lineas[resultado.lineas.length - 1];
    expect(ultimaLinea.capitalPendiente.toNumber()).toBe(0.00);
  });
});
