/**
 * Value Object para representar el plazo de amortización en meses.
 * Aplica reglas de negocio: plazo mínimo 12 meses (1 año) y máximo 480 meses (40 años).
 */
export class PlazoMeses {
  private readonly totalMonths: number;

  private constructor(totalMonths: number) {
    if (!Number.isInteger(totalMonths) || totalMonths < 12 || totalMonths > 480) {
      throw new Error(`Plazo de hipoteca inválido (${totalMonths} meses). El plazo permitido debe oscilar entre 12 y 480 meses.`);
    }
    this.totalMonths = totalMonths;
  }

  public static fromMonths(months: number): PlazoMeses {
    return new PlazoMeses(months);
  }

  public static fromYears(years: number): PlazoMeses {
    return new PlazoMeses(years * 12);
  }

  public getMonths(): number {
    return this.totalMonths;
  }

  public getYears(): number {
    return this.totalMonths / 12;
  }

  public toString(): string {
    return `${this.getYears()} años (${this.totalMonths} meses)`;
  }
}
