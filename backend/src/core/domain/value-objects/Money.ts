import Decimal from "decimal.js";

/**
 * Value Object inmutable para representar importes monetarios.
 * Garantiza precisión decimal arbitraria (cero redondeos erróneos por coma flotante IEEE 754).
 */
export class Money {
  private readonly value: Decimal;

  private constructor(value: Decimal.Value) {
    // Configuración con redondeo financiero estándar bancario (ROUND_HALF_UP) a 2 decimales
    this.value = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  public static from(amount: number | string | Decimal): Money {
    return new Money(amount);
  }

  public static fromCents(cents: number): Money {
    return new Money(new Decimal(cents).dividedBy(100));
  }

  public static zero(): Money {
    return new Money(0);
  }

  public add(other: Money): Money {
    return new Money(this.value.plus(other.value));
  }

  public subtract(other: Money): Money {
    return new Money(this.value.minus(other.value));
  }

  public multiply(factor: number | string | Decimal): Money {
    return new Money(this.value.times(factor));
  }

  public divide(divisor: number | string | Decimal): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) {
      throw new Error("División por cero no permitida en operaciones monetarias");
    }
    return new Money(this.value.dividedBy(d));
  }

  public isGreaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  public isGreaterThanOrEqualTo(other: Money): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  public isLessThan(other: Money): boolean {
    return this.value.lessThan(other.value);
  }

  public isLessThanOrEqualTo(other: Money): boolean {
    return this.value.lessThanOrEqualTo(other.value);
  }

  public equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  public isZero(): boolean {
    return this.value.isZero();
  }

  public isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  public isNegative(): boolean {
    return this.value.isNegative();
  }

  public toNumber(): number {
    return this.value.toNumber();
  }

  public toCents(): number {
    return this.value.times(100).toDecimalPlaces(0).toNumber();
  }

  public toString(): string {
    return this.value.toFixed(2);
  }

  public formatEuro(): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toNumber());
  }
}
