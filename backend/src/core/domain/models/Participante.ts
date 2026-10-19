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
}

export class Participante {
  public readonly id: string;
  public readonly nombre: string;
  public readonly rol: RolParticipante;
  public readonly contrato: TipoContratoLaboral;
  public readonly ingresosNetosMensuales: Money;
  public readonly deudasMensualesVigentes: Money;

  constructor(props: ParticipanteProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.rol = props.rol;
    this.contrato = props.contrato;
    this.ingresosNetosMensuales = props.ingresosNetosMensuales;
    this.deudasMensualesVigentes = props.deudasMensualesVigentes;
  }

  public static crear(props: ParticipanteProps): Participante {
    return new Participante(props);
  }
}
