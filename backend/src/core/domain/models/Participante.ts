import { Money } from "../value-objects/Money.js";

export type RolParticipante = "titular_principal" | "cotitular" | "avalista";
export type TipoContratoLaboral = "indefinido" | "funcionario" | "autonomo" | "temporal" | "pensionista" | "otro";

export interface ParticipanteProps {
  id: string;
  nombre: string;
  rol: RolParticipante;
  contrato: TipoContratoLaboral;
  ingresosNetosMensuales: Money;
  deudasMensualesVigentes: Money;
  edad?: number;
  hijosACargo?: number;
}

export class Participante {
  public readonly id: string;
  public readonly nombre: string;
  public readonly rol: RolParticipante;
  public readonly contrato: TipoContratoLaboral;
  public readonly ingresosNetosMensuales: Money;
  public readonly deudasMensualesVigentes: Money;
  public readonly edad?: number;
  public readonly hijosACargo?: number;

  constructor(props: ParticipanteProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.rol = props.rol;
    this.contrato = props.contrato;
    this.ingresosNetosMensuales = props.ingresosNetosMensuales;
    this.deudasMensualesVigentes = props.deudasMensualesVigentes;
    this.edad = props.edad;
    this.hijosACargo = props.hijosACargo ?? 0;
  }

  public static crear(props: ParticipanteProps): Participante {
    return new Participante(props);
  }
}
