import { Inmueble } from "./Inmueble.js";
import { Participante } from "./Participante.js";
import { CondicionFinanciera } from "./CondicionFinanciera.js";
import { Money } from "../value-objects/Money.js";
import { MotorScoringViabilidad, DictamenViabilidad, PoliticaRiesgoBancario, POLITICA_RIESGO_POR_DEFECTO } from "../services/MotorScoringViabilidad.js";
import { CalculadoraAmortizacionFrancesa, ResultadoAmortizacion } from "../services/CalculadoraAmortizacionFrancesa.js";

export type EstadoSolicitud = "borrador" | "evaluado" | "aprobado_condicionado" | "rechazado";

export interface SolicitudHipotecariaProps {
  id: string;
  inmueble: Inmueble;
  participantes: Participante[];
  condicion: CondicionFinanciera;
  ahorrosDisponibles: Money;
  estado?: EstadoSolicitud;
}

/**
 * Agregado Raíz (Aggregate Root) del Dominio Hipotecario.
 * Centraliza la coherencia, la orquestación del scoring y la generación del cuadro de amortización.
 */
export class SolicitudHipotecaria {
  public readonly id: string;
  public readonly inmueble: Inmueble;
  public readonly participantes: Participante[];
  public readonly condicion: CondicionFinanciera;
  public readonly ahorrosDisponibles: Money;
  private estado: EstadoSolicitud;

  constructor(props: SolicitudHipotecariaProps) {
    if (!props.participantes || props.participantes.length === 0) {
      throw new Error("Una solicitud hipotecaria requiere al menos un titular participante.");
    }
    this.id = props.id;
    this.inmueble = props.inmueble;
    this.participantes = props.participantes;
    this.condicion = props.condicion;
    this.ahorrosDisponibles = props.ahorrosDisponibles;
    this.estado = props.estado ?? "borrador";
  }

  public getEstado(): EstadoSolicitud {
    return this.estado;
  }

  /**
   * Ejecuta el análisis de viabilidad crediticia formal aplicando las políticas bancarias
   */
  public evaluarViabilidad(politica: PoliticaRiesgoBancario = POLITICA_RIESGO_POR_DEFECTO): DictamenViabilidad {
    const dictamen = MotorScoringViabilidad.evaluar(
      this.inmueble,
      this.participantes,
      this.condicion,
      this.ahorrosDisponibles,
      politica
    );

    if (dictamen.semaforo === "favorable") {
      this.estado = "evaluado";
    } else if (dictamen.semaforo === "condicionado") {
      this.estado = "aprobado_condicionado";
    } else {
      this.estado = "rechazado";
    }

    return dictamen;
  }

  /**
   * Genera el cuadro de amortización francés completo para la solicitud
   */
  public generarCuadroAmortizacion(): ResultadoAmortizacion {
    const dictamen = this.evaluarViabilidad();
    return CalculadoraAmortizacionFrancesa.generarCuadro(
      dictamen.capitalPrestado,
      this.condicion.tinEfectivo(),
      this.condicion.plazo
    );
  }
}
