import { MortgageSimulationParams, ViabilityAssessment, ViabilityStatus } from "@/types/mortgage";
import { calculateFrenchMonthlyInstallment } from "./french-amortization";
import { calculateExpensesBreakdown } from "./taxation-calculator";

export interface RiskPolicyConfig {
  maxLtvPrimary: number;   // 80%
  maxLtvSecondary: number; // 70%
  maxDtiOptimal: number;   // 35%
  maxDtiAlert: number;     // 40%
  minDisposableIncomePerAdult: number; // 700 €
}

export const DEFAULT_RISK_POLICY: RiskPolicyConfig = {
  maxLtvPrimary: 80,
  maxLtvSecondary: 70,
  maxDtiOptimal: 35,
  maxDtiAlert: 40,
  minDisposableIncomePerAdult: 700,
};

export function evaluateMortgageViability(
  params: MortgageSimulationParams,
  policy: RiskPolicyConfig = DEFAULT_RISK_POLICY
): ViabilityAssessment {
  const expenses = calculateExpensesBreakdown(
    params.propertyPrice,
    params.savings,
    params.autonomousCommunity,
    params.propertyType
  );

  // Capital que necesita financiar: Precio + Gastos - Ahorros disponibles
  // O en el caso estándar: Préstamo = Precio - (Ahorros - Gastos)
  const netSavingsForDownPayment = Math.max(0, params.savings - expenses.totalExpenses);
  const loanPrincipal = Math.max(0, params.propertyPrice - netSavingsForDownPayment);

  // LTV (Loan-To-Value) = Préstamo / Precio de compraventa
  const ltvRatio = params.propertyPrice > 0 ? Number(((loanPrincipal / params.propertyPrice) * 100).toFixed(1)) : 0;

  // Límite LTV según finalidad
  const ltvThreshold = params.purpose === "primary_residence" ? policy.maxLtvPrimary : policy.maxLtvSecondary;

  // Cuota mensual calculada
  const monthlyInstallment = calculateFrenchMonthlyInstallment(
    loanPrincipal,
    params.interestRateAnnual,
    params.termYears
  );

  // Ingresos totales netos
  const netMonthlyIncomeTotal =
    params.primaryIncomeNetMonthly + (params.coBorrower ? params.coBorrowerIncomeNetMonthly : 0);

  // Carga mensual total = Cuota hipoteca + deudas vigentes
  const totalMonthlyCommitments = monthlyInstallment + params.existingMonthlyDebts;

  // DTI (Debt-To-Income) = Carga mensual total / Ingresos netos
  const dtiRatio =
    netMonthlyIncomeTotal > 0 ? Number(((totalMonthlyCommitments / netMonthlyIncomeTotal) * 100).toFixed(1)) : 100;

  // Renta disponible tras pago de deudas
  const remainingDisposableIncome = Number((netMonthlyIncomeTotal - totalMonthlyCommitments).toFixed(2));

  // Cuota máxima recomendada según umbral óptimo del 35%
  const maxRecommendedInstallment = Number(
    Math.max(0, (netMonthlyIncomeTotal * policy.maxDtiOptimal) / 100 - params.existingMonthlyDebts).toFixed(2)
  );

  // Déficit de fondos propios (ahorros necesarios mínimos: 20% entrada + 10-12% gastos)
  const minRequiredSavings = Number((params.propertyPrice * (1 - ltvThreshold / 100) + expenses.totalExpenses).toFixed(2));
  const shortfallSavings = Math.max(0, Number((minRequiredSavings - params.savings).toFixed(2)));

  const alerts: string[] = [];
  const recommendations: string[] = [];

  let status: ViabilityStatus = "favorable";

  // Evaluación de LTV
  if (ltvRatio > ltvThreshold) {
    status = "high_risk";
    alerts.push(
      `El porcentaje de financiación solicitado (${ltvRatio}%) supera el límite bancario estándar del ${ltvThreshold}%.`
    );
    recommendations.push(
      `Aportar ${shortfallSavings.toLocaleString("es-ES")} € adicionales de fondos propios o incorporar avales con garantía complementaria.`
    );
  }

  // Evaluación de DTI (Endeudamiento)
  if (dtiRatio > policy.maxDtiAlert) {
    status = "high_risk";
    alerts.push(
      `El ratio de endeudamiento (${dtiRatio}%) excede el límite crítico de riesgo (${policy.maxDtiAlert}%).`
    );
    recommendations.push(
      `Reducir el capital solicitado, ampliar el plazo a ${Math.min(30, params.termYears + 5)} años o amortizar deudas previas.`
    );
  } else if (dtiRatio > policy.maxDtiOptimal) {
    if (status !== "high_risk") status = "conditional";
    alerts.push(
      `El ratio de endeudamiento (${dtiRatio}%) está en zona de aviso (entre el ${policy.maxDtiOptimal}% y el ${policy.maxDtiAlert}%).`
    );
    recommendations.push("La operación es viable pero requerirá justificar estabilidad laboral continuada.");
  }

  // Evaluación de ahorro inicial para cubrir gastos
  if (params.savings < expenses.totalExpenses) {
    status = "high_risk";
    alerts.push(
      `Los ahorros aportados (${params.savings.toLocaleString("es-ES")} €) no alcanzan para cubrir la provisión de gastos e impuestos (${expenses.totalExpenses.toLocaleString("es-ES")} €).`
    );
  }

  // Umbral de subsistencia
  const requiredLiving = policy.minDisposableIncomePerAdult * (params.coBorrower ? 2 : 1);
  if (remainingDisposableIncome < requiredLiving) {
    if (status !== "high_risk") status = "conditional";
    alerts.push(
      `La renta disponible tras pagar la cuota (${remainingDisposableIncome.toLocaleString("es-ES")} €/mes) queda cerca del umbral mínimo de subsistencia.`
    );
  }

  return {
    status,
    ltvRatio,
    dtiRatio,
    monthlyInstallment,
    maxRecommendedInstallment,
    netMonthlyIncomeTotal,
    remainingDisposableIncome,
    shortfallSavings,
    alerts,
    recommendations,
  };
}
