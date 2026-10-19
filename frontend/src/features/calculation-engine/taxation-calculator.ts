import { AutonomousCommunityTax, FinancialExpensesBreakdown, PropertyType } from "@/types/mortgage";

export const REGIONAL_TAX_RATES: AutonomousCommunityTax[] = [
  { code: "MD", name: "Comunidad de Madrid", itpGeneralRate: 6.0, itpReducedRate: 4.0, ajdRate: 0.75 },
  { code: "CT", name: "Cataluña", itpGeneralRate: 10.0, itpReducedRate: 5.0, ajdRate: 1.50 },
  { code: "AN", name: "Andalucía", itpGeneralRate: 7.0, itpReducedRate: 3.5, ajdRate: 1.20 },
  { code: "VC", name: "Comunidad Valenciana", itpGeneralRate: 10.0, itpReducedRate: 8.0, ajdRate: 1.50 },
  { code: "GA", name: "Galicia", itpGeneralRate: 8.0, itpReducedRate: 3.0, ajdRate: 1.50 },
  { code: "CL", name: "Castilla y León", itpGeneralRate: 8.0, itpReducedRate: 4.0, ajdRate: 1.50 },
  { code: "CM", name: "Castilla-La Mancha", itpGeneralRate: 9.0, itpReducedRate: 5.0, ajdRate: 1.50 },
  { code: "PV", name: "País Vasco", itpGeneralRate: 4.0, itpReducedRate: 2.5, ajdRate: 0.50 },
  { code: "CN", name: "Canarias (IGIC)", itpGeneralRate: 6.5, itpReducedRate: 5.0, ajdRate: 1.00 },
  { code: "IB", name: "Islas Baleares", itpGeneralRate: 8.0, itpReducedRate: 4.0, ajdRate: 1.50 },
  { code: "AR", name: "Aragón", itpGeneralRate: 8.0, itpReducedRate: 6.0, ajdRate: 1.50 },
  { code: "AS", name: "Asturias", itpGeneralRate: 8.0, itpReducedRate: 4.0, ajdRate: 1.20 },
  { code: "MU", name: "Región de Murcia", itpGeneralRate: 8.0, itpReducedRate: 3.0, ajdRate: 1.50 },
  { code: "EX", name: "Extremadura", itpGeneralRate: 8.0, itpReducedRate: 4.0, ajdRate: 1.50 },
  { code: "NC", name: "Navarra", itpGeneralRate: 6.0, itpReducedRate: 5.0, ajdRate: 0.50 },
  { code: "CB", name: "Cantabria", itpGeneralRate: 9.0, itpReducedRate: 4.0, ajdRate: 1.50 },
  { code: "RI", name: "La Rioja", itpGeneralRate: 7.0, itpReducedRate: 5.0, ajdRate: 1.00 },
];

/**
 * Calcula el desglose detallado de gastos de compraventa e hipoteca
 */
export function calculateExpensesBreakdown(
  price: number,
  savings: number,
  regionCode: string,
  propertyType: PropertyType
): FinancialExpensesBreakdown {
  const region = REGIONAL_TAX_RATES.find((r) => r.code === regionCode) || REGIONAL_TAX_RATES[0];

  let propertyTransferTax = 0;
  let stampDutyTax = 0;

  if (propertyType === "second_hand") {
    // Impuesto de Transmisiones Patrimoniales (ITP)
    propertyTransferTax = Number(((price * region.itpGeneralRate) / 100).toFixed(2));
  } else {
    // Obra nueva: IVA 10% + AJD (Actos Jurídicos Documentados)
    propertyTransferTax = Number((price * 0.10).toFixed(2));
    stampDutyTax = Number(((price * region.ajdRate) / 100).toFixed(2));
  }

  // Estimaciones arancelarias promedio del mercado español
  const notaryFee = Number((600 + price * 0.0015).toFixed(2));
  const registryFee = Number((400 + price * 0.001).toFixed(2));
  const managementFee = 350.0;
  const appraisalFee = 380.0;

  const totalExpenses = Number(
    (propertyTransferTax + stampDutyTax + notaryFee + registryFee + managementFee + appraisalFee).toFixed(2)
  );

  // Fondos totales que debe aportar el solicitante: Entrada (Precio - Préstamo) + Gastos totales
  // Donde préstamo = max(0, price - savings + totalExpenses)
  const totalCashRequired = Number((price * 0.20 + totalExpenses).toFixed(2));

  return {
    propertyTransferTax,
    stampDutyTax,
    notaryFee,
    registryFee,
    managementFee,
    appraisalFee,
    totalExpenses,
    totalCashRequired,
  };
}
