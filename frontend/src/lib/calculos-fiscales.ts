import type { PropertyType } from "@/types/mortgage";

export interface TablaFiscalComunidad {
  codigo: string;
  nombre: string;
  itpGeneral: number; // Porcentaje, ej. 6.0 para 6%
  itpReducido?: number;
  ajdObraNueva: number;
}

export const TABLAS_FISCALES: Record<string, TablaFiscalComunidad> = {
  MD: { codigo: "MD", nombre: "Madrid", itpGeneral: 6.0, itpReducido: 4.0, ajdObraNueva: 0.75 },
  CT: { codigo: "CT", nombre: "Cataluña", itpGeneral: 10.0, itpReducido: 5.0, ajdObraNueva: 1.50 },
  AN: { codigo: "AN", nombre: "Andalucía", itpGeneral: 7.0, itpReducido: 3.5, ajdObraNueva: 1.20 },
  VC: { codigo: "VC", nombre: "C. Valenciana", itpGeneral: 10.0, itpReducido: 8.0, ajdObraNueva: 1.50 },
  PV: { codigo: "PV", nombre: "País Vasco", itpGeneral: 4.0, itpReducido: 2.5, ajdObraNueva: 0.50 },
  GA: { codigo: "GA", nombre: "Galicia", itpGeneral: 8.0, itpReducido: 3.0, ajdObraNueva: 1.50 },
  CL: { codigo: "CL", nombre: "Castilla y León", itpGeneral: 8.0, itpReducido: 4.0, ajdObraNueva: 1.50 },
  CM: { codigo: "CM", nombre: "Castilla-La Mancha", itpGeneral: 9.0, itpReducido: 5.0, ajdObraNueva: 1.50 },
  IB: { codigo: "IB", nombre: "Baleares", itpGeneral: 8.0, itpReducido: 4.0, ajdObraNueva: 1.50 },
  CN: { codigo: "CN", nombre: "Canarias", itpGeneral: 6.5, itpReducido: 5.0, ajdObraNueva: 1.00 },
};

/**
 * Calcula con precisión los gastos estimados de compraventa e hipoteca
 * idéntico al motor de backend CalculadoraFiscalAutonomica.
 */
export function calcularGastosCompraventa(
  precio: number,
  tipoVivienda: PropertyType,
  ccaa: string
): number {
  const fiscalidad = TABLAS_FISCALES[ccaa] ?? TABLAS_FISCALES["MD"];

  let impuesto = 0;
  if (tipoVivienda === "segunda_mano") {
    // ITP
    impuesto = precio * (fiscalidad.itpGeneral / 100);
  } else {
    // IVA 10% + AJD
    impuesto = precio * 0.10 + precio * (fiscalidad.ajdObraNueva / 100);
  }

  const arancelNotaria = 600 + precio * 0.0015;
  const arancelRegistro = 400 + precio * 0.0010;
  const honorariosGestoria = 350;
  const costeTasacionOficial = 380;

  return Math.round(
    impuesto + arancelNotaria + arancelRegistro + honorariosGestoria + costeTasacionOficial
  );
}

/**
 * Calcula el ahorro que debe aportar el solicitante para obtener un % concreto de financiación bancaria.
 * Si se dispone de los gastos reales del backend dictamen.totalGastosCompraventa, se usan preferentemente.
 */
export function calcularAhorrosParaFinanciacion(
  precio: number,
  tipoVivienda: PropertyType,
  ccaa: string,
  pctFinanciacion: number,
  gastosReales?: number
): {
  ahorrosAportados: number;
  capitalPrestado: number;
  entradaRequerida: number;
  gastosEstimados: number;
} {
  const gastos = gastosReales ?? calcularGastosCompraventa(precio, tipoVivienda, ccaa);
  const capitalPrestado = Math.round(precio * (pctFinanciacion / 100));
  const entradaRequerida = Math.max(0, precio - capitalPrestado);
  const ahorrosAportados = Math.round(entradaRequerida + gastos);

  return {
    ahorrosAportados,
    capitalPrestado,
    entradaRequerida,
    gastosEstimados: gastos,
  };
}
