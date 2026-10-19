import { describe, it, expect } from "vitest";
import { MotorScoringViabilidad } from "../../src/core/domain/services/MotorScoringViabilidad.js";
import { Inmueble } from "../../src/core/domain/models/Inmueble.js";
import { Participante } from "../../src/core/domain/models/Participante.js";
import { CondicionFinanciera } from "../../src/core/domain/models/CondicionFinanciera.js";
import { Money } from "../../src/core/domain/value-objects/Money.js";
import { Percentage } from "../../src/core/domain/value-objects/Percentage.js";
import { PlazoMeses } from "../../src/core/domain/value-objects/PlazoMeses.js";

describe("Servicio de Dominio: MotorScoringViabilidad", () => {
  it("debe calificar como FAVORABLE una operación solvente con LTV <= 80% y DTI <= 35%", () => {
    const inmueble = new Inmueble({
      precioCompraventa: Money.from(250000),
      tipo: "segunda_mano",
      finalidad: "primera_vivienda",
      comunidadAutonoma: "MD", // 6% ITP
    });

    const participante = Participante.crear({
      id: "P1",
      nombre: "Carlos Gómez",
      rol: "titular_principal",
      contrato: "indefinido",
      ingresosNetosMensuales: Money.from(3600),
      deudasMensualesVigentes: Money.zero(),
    });

    const condicion = new CondicionFinanciera({
      modalidad: "fijo",
      plazo: PlazoMeses.fromYears(25),
      tinNominalAnual: Percentage.from(2.85),
    });

    const ahorros = Money.from(70000);

    const dictamen = MotorScoringViabilidad.evaluar(inmueble, [participante], condicion, ahorros);

    expect(dictamen.semaforo).toBe("favorable");
    expect(dictamen.ratioLtv.isLessThanOrEqualTo(Percentage.from(80))).toBe(true);
    expect(dictamen.ratioDti.isLessThanOrEqualTo(Percentage.from(35))).toBe(true);
    expect(dictamen.alertas.length).toBe(0);
  });

  it("debe calificar como RIESGO_ELEVADO si el LTV supera el 80%", () => {
    const inmueble = new Inmueble({
      precioCompraventa: Money.from(300000),
      tipo: "segunda_mano",
      finalidad: "primera_vivienda",
      comunidadAutonoma: "MD",
    });

    const participante = Participante.crear({
      id: "P1",
      nombre: "Laura Díaz",
      rol: "titular_principal",
      contrato: "indefinido",
      ingresosNetosMensuales: Money.from(3800),
      deudasMensualesVigentes: Money.zero(),
    });

    const condicion = new CondicionFinanciera({
      modalidad: "fijo",
      plazo: PlazoMeses.fromYears(25),
      tinNominalAnual: Percentage.from(2.85),
    });

    // Aportando solo 20.000€ (insuficiente para entrada del 20% + gastos)
    const ahorros = Money.from(20000);

    const dictamen = MotorScoringViabilidad.evaluar(inmueble, [participante], condicion, ahorros);

    expect(dictamen.semaforo).toBe("riesgo_elevado");
    expect(dictamen.ratioLtv.isGreaterThan(Percentage.from(80))).toBe(true);
    expect(dictamen.alertas.some((a) => a.includes("supera el límite bancario"))).toBe(true);
  });

  it("debe calificar como RIESGO_ELEVADO si el ratio de endeudamiento DTI supera el 40%", () => {
    const inmueble = new Inmueble({
      precioCompraventa: Money.from(200000),
      tipo: "segunda_mano",
      finalidad: "primera_vivienda",
      comunidadAutonoma: "MD",
    });

    const participante = Participante.crear({
      id: "P1",
      nombre: "Marcos Sanz",
      rol: "titular_principal",
      contrato: "temporal",
      ingresosNetosMensuales: Money.from(1600), // Ingresos ajustados
      deudasMensualesVigentes: Money.from(400),  // Préstamo personal previo
    });

    const condicion = new CondicionFinanciera({
      modalidad: "fijo",
      plazo: PlazoMeses.fromYears(20),
      tinNominalAnual: Percentage.from(3.0),
    });

    const ahorros = Money.from(55000);

    const dictamen = MotorScoringViabilidad.evaluar(inmueble, [participante], condicion, ahorros);

    expect(dictamen.semaforo).toBe("riesgo_elevado");
    expect(dictamen.ratioDti.isGreaterThan(Percentage.from(40))).toBe(true);
  });
});
