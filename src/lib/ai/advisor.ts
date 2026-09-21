/**
 * AI Financial Advisor Engine (Pro Feature)
 * Monitors weekly category spending spikes (>50%) and monthly burn rate (>80%).
 */

export interface CategorySpikeAlert {
  type: 'category_spike';
  category: string;
  prevWeekSpent: number;
  currentWeekSpent: number;
  spikePercent: number;
  message: string;
}

export interface BurnRateAlert {
  type: 'burn_rate_warning';
  monthlyIncome: number;
  monthlyExpense: number;
  burnRate: number;
  message: string;
}

export type FinancialAdvisorAlert = CategorySpikeAlert | BurnRateAlert;

/**
 * Evaluates whether category spending for the current 7 days spiked by >50% compared to prior 7 days.
 */
export function checkCategorySpike(
  categoryName: string,
  currentWeekSpent: number,
  prevWeekSpent: number
): CategorySpikeAlert | null {
  if (prevWeekSpent <= 0) {
    return null;
  }

  const spikePercent = ((currentWeekSpent - prevWeekSpent) / prevWeekSpent) * 100;
  if (spikePercent > 50) {
    const roundedPercent = Math.round(spikePercent);
    return {
      type: 'category_spike',
      category: categoryName,
      prevWeekSpent,
      currentWeekSpent,
      spikePercent: roundedPercent,
      message: `⚠️ Pengeluaran kategori ${categoryName} melonjak ${roundedPercent}% minggu ini. Pertimbangkan untuk membatasi pengeluaran akhir pekan ini.`,
    };
  }

  return null;
}

/**
 * Evaluates whether monthly expenses exceed 80% of total monthly income.
 */
export function checkMonthlyBurnRate(
  monthlyExpense: number,
  monthlyIncome: number
): BurnRateAlert | null {
  if (monthlyIncome <= 0) return null;

  const burnRate = monthlyExpense / monthlyIncome;
  if (burnRate > 0.8) {
    const percent = Math.round(burnRate * 100);
    return {
      type: 'burn_rate_warning',
      monthlyIncome,
      monthlyExpense,
      burnRate,
      message: `⚠️ Burn rate keuanganmu mencapai ${percent}% dari total pemasukan bulan ini. Segera evaluasi pos pengeluaran sekunder.`,
    };
  }

  return null;
}
