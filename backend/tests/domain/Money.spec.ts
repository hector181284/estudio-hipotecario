import { describe, it, expect } from "vitest";
import { Money } from "../../src/core/domain/value-objects/Money.js";

describe("Value Object: Money", () => {
  it("debe sumar importes con precisión decimal exacta", () => {
    const m1 = Money.from(100.15);
    const m2 = Money.from(200.25);
    const total = m1.add(m2);

    expect(total.toNumber()).toBe(300.40);
    expect(total.toString()).toBe("300.40");
  });

  it("no debe presentar errores de coma flotante estándar (0.1 + 0.2)", () => {
    const m1 = Money.from("0.10");
    const m2 = Money.from("0.20");
    const total = m1.add(m2);

    expect(total.toNumber()).toBe(0.30);
    expect(total.toString()).toBe("0.30");
  });

  it("debe convertir correctamente a y desde céntimos", () => {
    const money = Money.from(1542.75);
    expect(money.toCents()).toBe(154275);

    const fromCents = Money.fromCents(154275);
    expect(fromCents.equals(money)).toBe(true);
  });

  it("debe lanzar error al dividir por cero", () => {
    const money = Money.from(500);
    expect(() => money.divide(0)).toThrow("División por cero");
  });

  it("debe comparar importes correctamente", () => {
    const m1 = Money.from(1000);
    const m2 = Money.from(1500);

    expect(m1.isLessThan(m2)).toBe(true);
    expect(m2.isGreaterThan(m1)).toBe(true);
    expect(m1.equals(Money.from(1000))).toBe(true);
  });
});
