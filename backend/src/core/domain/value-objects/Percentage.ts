import Decimal from "decimal.js";
import { Money } from "./Money.js";

/**
 * Value Object para representar porcentajes (tipos de interés TIN/TAE, ratios LTV y DTI).
 * Almacena el valor numérico en escala de 0 a 100 con precisión arbitraria.
 */
export class Percentage {
  private readonly value: Decimal;

  private constructor(value: Decimal.Value) {
    this.value = new Decimal(value);
  }

  public static from(percentage: number | string | Decimal): Percentage {
    return new Percentage(percentage);
  }

  public static fromRatio(ratio: number | string | Decimal): Percentage {
    return new Percentage(new Decimal(ratio).times(100));
  }

  public static zero(): Percentage {
    return new Percentage(0);
  }

  public toRatio(): Decimal {
    return this.value.dividedBy(100);
  }

  public applyTo(money: Money): Money {
    return money.multiply(this.toRatio());
  }

  public add(other: Percentage): Percentage {
    return new Percentage(this.value.plus(other.value));
  }

  public subtract(other: Percentage): Percentage {
    return new Percentage(this.value.minus(other.value));
  }

  public isGreaterThan(other: Percentage): boolean {
    return this.value.greaterThan(other.value);
  }

  public isLessThan(other: Percentage): boolean {
    return this.value.lessThan(other.value);
  }

  public isGreaterThanOrEqualTo(other: Percentage): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  public isLessThanOrEqualTo(other: Percentage): boolean {
    return this.value.lessThanOrEqualTo(other.value);
  }

  public toNumber(): number {
    return this.value.toNumber();
  }

  public toString(decimalPlaces: number = 2): string {
    return `${this.value.toFixed(decimalPlaces)}%`;
  }
}
