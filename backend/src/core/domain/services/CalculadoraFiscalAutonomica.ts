import { Money } from "../value-objects/Money.js";
import { Percentage } from "../value-objects/Percentage.js";
import { TipoVivienda } from "../models/Inmueble.js";

export interface TablaFiscalComunidad {
  codigo: string;
  nombre: string;
  itpGeneral: Percentage;
  itpReducido?: Percentage;
  ajdObraNueva: Percentage;
}

export interface GastosCompraventaEHipoteca {
  impuestoTransmisiones: Money; // ITP (2ª mano) o IVA 10% (obra nueva)
  actosJuridicosDocumentados: Money; // AJD (en obra nueva)
  arancelNotaria: Money;
  arancelRegistro: Money;
  honorariosGestoria: Money;
  costeTasacionOficial: Money;
  totalGastosCompraventa: Money;
}

export class CalculadoraFiscalAutonomica {
  private static readonly TABLAS_FISCALES: Record<string, TablaFiscalComunidad> = {
    MD: { codigo: "MD", nombre: "Comunidad de Madrid", itpGeneral: Percentage.from(6.0), itpReducido: Percentage.from(4.0), ajdObraNueva: Percentage.from(0.75) },
    CT: { codigo: "CT", nombre: "Cataluña", itpGeneral: Percentage.from(10.0), itpReducido: Percentage.from(5.0), ajdObraNueva: Percentage.from(1.50) },
    AN: { codigo: "AN", nombre: "Andalucía", itpGeneral: Percentage.from(7.0), itpReducido: Percentage.from(3.5), ajdObraNueva: Percentage.from(1.20) },
    VC: { codigo: "VC", nombre: "Comunidad Valenciana", itpGeneral: Percentage.from(10.0), itpReducido: Percentage.from(8.0), ajdObraNueva: Percentage.from(1.50) },
    PV: { codigo: "PV", nombre: "País Vasco", itpGeneral: Percentage.from(4.0), itpReducido: Percentage.from(2.5), ajdObraNueva: Percentage.from(0.50) },
    GA: { codigo: "GA", nombre: "Galicia", itpGeneral: Percentage.from(8.0), itpReducido: Percentage.from(3.0), ajdObraNueva: Percentage.from(1.50) },
    CL: { codigo: "CL", nombre: "Castilla y León", itpGeneral: Percentage.from(8.0), itpReducido: Percentage.from(4.0), ajdObraNueva: Percentage.from(1.50) },
    CM: { codigo: "CM", nombre: "Castilla-La Mancha", itpGeneral: Percentage.from(9.0), itpReducido: Percentage.from(5.0), ajdObraNueva: Percentage.from(1.50) },
    IB: { codigo: "IB", nombre: "Islas Baleares", itpGeneral: Percentage.from(8.0), itpReducido: Percentage.from(4.0), ajdObraNueva: Percentage.from(1.50) },
    CN: { codigo: "CN", nombre: "Canarias (IGIC)", itpGeneral: Percentage.from(6.5), itpReducido: Percentage.from(5.0), ajdObraNueva: Percentage.from(1.00) },
  };

  public static obtenerFiscalidadComunidad(codigoCCAA: string): TablaFiscalComunidad {
    return this.TABLAS_FISCALES[codigoCCAA] ?? this.TABLAS_FISCALES["MD"];
  }

  public static calcularGastos(
    precioCompraventa: Money,
    tipoVivienda: TipoVivienda,
    codigoCCAA: string
  ): GastosCompraventaEHipoteca {
    const fiscalidad = this.obtenerFiscalidadComunidad(codigoCCAA);

    let impuestoTransmisiones = Money.zero();
    let actosJuridicosDocumentados = Money.zero();

    if (tipoVivienda === "segunda_mano") {
      // Impuesto de Transmisiones Patrimoniales (ITP)
      impuestoTransmisiones = fiscalidad.itpGeneral.applyTo(precioCompraventa);
    } else {
      // Vivienda nueva: IVA al 10% + Actos Jurídicos Documentados (AJD)
      impuestoTransmisiones = Percentage.from(10.0).applyTo(precioCompraventa);
      actosJuridicosDocumentados = fiscalidad.ajdObraNueva.applyTo(precioCompraventa);
    }

    // Estimación aranceles notariales (base RD 1426/1989) y registrales
    const arancelNotaria = Money.from(600).add(precioCompraventa.multiply(0.0015));
    const arancelRegistro = Money.from(400).add(precioCompraventa.multiply(0.001));
    const honorariosGestoria = Money.from(350);
    const costeTasacionOficial = Money.from(380);

    const totalGastosCompraventa = impuestoTransmisiones
      .add(actosJuridicosDocumentados)
      .add(arancelNotaria)
      .add(arancelRegistro)
      .add(honorariosGestoria)
      .add(costeTasacionOficial);

    return {
      impuestoTransmisiones,
      actosJuridicosDocumentados,
      arancelNotaria,
      arancelRegistro,
      honorariosGestoria,
      costeTasacionOficial,
      totalGastosCompraventa,
    };
  }
}
