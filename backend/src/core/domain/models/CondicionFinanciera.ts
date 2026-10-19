import { Percentage } from "../value-objects/Percentage.js";
import { PlazoMeses } from "../value-objects/PlazoMeses.js";

export type ModalidadTipo = "fijo" | "variable" | "mixto";

export interface CondicionFinancieraProps {
  modalidad: ModalidadTipo;
  plazo: PlazoMeses;
  tinNominalAnual: Percentage;
  diferencialVariable?: Percentage;
  indiceReferenciaEuribor?: Percentage;
  aniosTramoFijoMixto?: number;
}

export class CondicionFinanciera {
  public readonly modalidad: ModalidadTipo;
  public readonly plazo: PlazoMeses;
  public readonly tinNominalAnual: Percentage;
  public readonly diferencialVariable?: Percentage;
  public readonly indiceReferenciaEuribor?: Percentage;
  public readonly aniosTramoFijoMixto?: number;

  constructor(props: CondicionFinancieraProps) {
    this.modalidad = props.modalidad;
    this.plazo = props.plazo;
    this.tinNominalAnual = props.tinNominalAnual;
    this.diferencialVariable = props.diferencialVariable;
    this.indiceReferenciaEuribor = props.indiceReferenciaEuribor;
    this.aniosTramoFijoMixto = props.aniosTramoFijoMixto;
  }

  /**
   * Tipo de Interés Nominal (TIN) aplicable actualmente
   */
  public tinEfectivo(): Percentage {
    if (this.modalidad === "fijo") {
      return this.tinNominalAnual;
    }
    if (this.modalidad === "variable") {
      const euribor = this.indiceReferenciaEuribor ?? Percentage.zero();
      const diferencial = this.diferencialVariable ?? Percentage.zero();
      return euribor.add(diferencial);
    }
    return this.tinNominalAnual;
  }
}
