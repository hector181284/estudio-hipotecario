import { describe, it, expect } from "vitest";
import { SimularEstudioHipotecarioUseCase, SimularEstudioInputDto } from "../../src/core/application/use-cases/SimularEstudioHipotecarioUseCase.js";

describe("Caso de Uso: SimularEstudioHipotecarioUseCase", () => {
  it("debe orquestar la simulación completa y retornar el DTO de salida esperado", async () => {
    const useCase = new SimularEstudioHipotecarioUseCase();

    const input: SimularEstudioInputDto = {
      precioInmueble: 240000,
      tipoVivienda: "segunda_mano",
      finalidad: "primera_vivienda",
      comunidadAutonoma: "MD",
      ahorrosAportados: 65000,
      titularPrincipal: {
        nombre: "Ana Ruiz",
        contrato: "indefinido",
        ingresosNetosMensuales: 3500,
        deudasMensualesVigentes: 0,
      },
      condicion: {
        modalidad: "fijo",
        plazoAnios: 25,
        tinAnual: 2.85,
      },
    };

    const output = await useCase.execute(input);

    expect(output.solicitudId).toBeDefined();
    expect(output.dictamen.semaforo).toBe("favorable");
    expect(output.dictamen.cuotaMensual).toBeGreaterThan(0);
    expect(output.dictamen.capitalPrestado).toBeGreaterThan(0);
    expect(output.amortizacion.primerasCuotas.length).toBe(12);
  });
});
