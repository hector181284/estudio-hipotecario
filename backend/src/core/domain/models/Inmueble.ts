import { Money } from "../value-objects/Money.js";

export type TipoVivienda = "segunda_mano" | "obra_nueva";
export type FinalidadPrestamo = "primera_vivienda" | "segunda_residencia" | "inversion";

export interface InmuebleProps {
  precioCompraventa: Money;
  valorTasacion?: Money;
  tipo: TipoVivienda;
  finalidad: FinalidadPrestamo;
  comunidadAutonoma: string;
}

export class Inmueble {
  public readonly precioCompraventa: Money;
  public readonly valorTasacion?: Money;
  public readonly tipo: TipoVivienda;
  public readonly finalidad: FinalidadPrestamo;
  public readonly comunidadAutonoma: string;

  constructor(props: InmuebleProps) {
    this.precioCompraventa = props.precioCompraventa;
    this.valorTasacion = props.valorTasacion;
    this.tipo = props.tipo;
    this.finalidad = props.finalidad;
    this.comunidadAutonoma = props.comunidadAutonoma;
  }

  /**
   * Valor base de referencia para el cálculo de garantías bancarias y LTV:
   * Por normativa y práctica prudencial bancaria estándar en España,
   * se toma el menor entre el precio de compraventa y la tasación oficial homologada.
   */
  public valorGarantiaBase(): Money {
    if (!this.valorTasacion || this.valorTasacion.isZero()) {
      return this.precioCompraventa;
    }
    return this.precioCompraventa.isLessThan(this.valorTasacion)
      ? this.precioCompraventa
      : this.valorTasacion;
  }
}
