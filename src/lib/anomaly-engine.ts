import { AgentMandate, TransactionActivity } from '@/types';

export interface AnomalyReport {
  velocitySpike: boolean;
  velocitySpikeFactor: number;
  newMerchantsDetected: string[];
  duplicateChargesDetected: Array<{
    merchant: string;
    amount: number;
    count: number;
  }>;
  mandateForecasts: Array<{
    mandateId: string;
    mandateName: string;
    burnRatePerDay: number;
    daysRemaining: number;
    forecastDepletionDate: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export function detectAnomalies(
  mandates: AgentMandate[],
  transactions: TransactionActivity[]
): AnomalyReport {
  // 1. Velocity Spike Calculation
  const totalSpent = transactions
    .filter((tx) => tx.status === 'approved')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const averageHistoricalDaily = 120; // baseline
  const currentDailyVelocity = totalSpent > 0 ? totalSpent / 3 : 150;
  const velocitySpikeFactor = Number((currentDailyVelocity / averageHistoricalDaily).toFixed(1));
  const velocitySpike = velocitySpikeFactor > 1.8;

  // 2. New Merchants
  const knownBaseline = new Set(['AWS', 'GitHub', 'OpenAI', 'Google Cloud', 'DigitalOcean']);
  const newMerchantsDetected: string[] = [];
  transactions.forEach((tx) => {
    if (!knownBaseline.has(tx.merchant) && !newMerchantsDetected.includes(tx.merchant)) {
      newMerchantsDetected.push(tx.merchant);
    }
  });

  // 3. Duplicate Charges
  const duplicatesMap = new Map<string, number>();
  transactions.forEach((tx) => {
    const key = `${tx.merchant}-${tx.amount}`;
    duplicatesMap.set(key, (duplicatesMap.get(key) || 0) + 1);
  });

  const duplicateChargesDetected: Array<{ merchant: string; amount: number; count: number }> = [];
  duplicatesMap.forEach((count, key) => {
    if (count > 1) {
      const [merchant, amountStr] = key.split('-');
      duplicateChargesDetected.push({
        merchant,
        amount: parseFloat(amountStr),
        count,
      });
    }
  });

  // 4. Cap Depletion Forecast
  const mandateForecasts = mandates.map((m) => {
    const remaining = Math.max(0, m.monthlyCap - m.spentAmount);
    const dailyRate = Math.max(15, m.spentAmount > 0 ? m.spentAmount / 12 : 25);
    const daysRemaining = Math.max(1, Math.round(remaining / dailyRate));

    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysRemaining);
    const dateStr = depletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (daysRemaining <= 5) riskLevel = 'HIGH';
    else if (daysRemaining <= 14) riskLevel = 'MEDIUM';

    return {
      mandateId: m.id,
      mandateName: m.name,
      burnRatePerDay: Math.round(dailyRate),
      daysRemaining,
      forecastDepletionDate: dateStr,
      riskLevel,
    };
  });

  return {
    velocitySpike,
    velocitySpikeFactor,
    newMerchantsDetected: newMerchantsDetected.slice(0, 3),
    duplicateChargesDetected,
    mandateForecasts,
  };
}
