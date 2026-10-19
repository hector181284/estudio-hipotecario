import { AmortizationRow } from "@/types/mortgage";

/**
 * Motor de Amortización Francés
 * Fórmula de cuota constante:
 * Cuota = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
 * Donde:
 * P = Principal (Capital prestado)
 * i = Tipo de interés mensual (TIN / 12 / 100)
 * n = Número total de cuotas (plazo en años * 12)
 */
export function calculateFrenchMonthlyInstallment(
  principal: number,
  annualInterestRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  if (annualInterestRate <= 0) {
    const totalMonths = termYears * 12;
    return totalMonths > 0 ? Number((principal / totalMonths).toFixed(2)) : 0;
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = termYears * 12;

  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const installment = (principal * (monthlyRate * factor)) / (factor - 1);

  return Number(installment.toFixed(2));
}

/**
 * Genera el cuadro de amortización completo mes a mes
 */
export function generateFrenchAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  termYears: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  if (principal <= 0 || termYears <= 0) return schedule;

  const totalMonths = termYears * 12;
  const monthlyRate = annualInterestRate / 100 / 12;
  const installment = calculateFrenchMonthlyInstallment(principal, annualInterestRate, termYears);

  let currentBalance = principal;

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = Number((currentBalance * monthlyRate).toFixed(2));
    let principalPayment = Number((installment - interestPayment).toFixed(2));

    if (month === totalMonths || principalPayment > currentBalance) {
      principalPayment = currentBalance;
      currentBalance = 0;
    } else {
      currentBalance = Number((currentBalance - principalPayment).toFixed(2));
    }

    schedule.push({
      month,
      installment,
      principalPayment,
      interestPayment,
      remainingBalance: Math.max(0, currentBalance),
    });

    if (currentBalance <= 0) break;
  }

  return schedule;
}
