import { BetSelection, ExpressBet, BankrollState, BettingStrategy } from './types';

export const calculateExpressOdds = (selections: BetSelection[]): number => {
  return selections.reduce((total, sel) => total * sel.odds, 1);
};

export const calculateExpressProbability = (selections: BetSelection[]): number => {
  const prob = selections.reduce((total, sel) => total * (sel.confidence / 100), 1);
  return prob * 100;
};

export const calculatePotentialWin = (odds: number, stake: number): number => {
  return Math.round(odds * stake);
};

export const calculateKellyStake = (
  bankroll: number,
  odds: number,
  probability: number
): number => {
  const p = probability / 100;
  const b = odds - 1;
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  return Math.max(0, Math.round(bankroll * kelly * 0.25)); // Quarter Kelly
};

export const calculateFlatStake = (bankroll: number, percentage: number = 2): number => {
  return Math.round(bankroll * (percentage / 100));
};

export const calculateMartingaleStake = (
  baseStake: number,
  consecutiveLosses: number
): number => {
  return baseStake * Math.pow(2, consecutiveLosses);
};

export const calculateFibonacciStake = (
  baseStake: number,
  position: number
): number => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  return baseStake * (fib[Math.min(position, fib.length - 1)]);
};

export const getRecommendedStake = (
  bankroll: number,
  strategy: BettingStrategy,
  odds: number,
  probability: number,
  context: { consecutiveLosses?: number; fibPosition?: number } = {}
): number => {
  switch (strategy) {
    case 'kelly':
      return calculateKellyStake(bankroll, odds, probability);
    case 'martingale':
      return calculateMartingaleStake(calculateFlatStake(bankroll), context.consecutiveLosses || 0);
    case 'fibonacci':
      return calculateFibonacciStake(calculateFlatStake(bankroll), context.fibPosition || 0);
    case 'value':
      return Math.round(calculateKellyStake(bankroll, odds, probability) * 0.5);
    case 'flat':
    default:
      return calculateFlatStake(bankroll);
  }
};

export const calculateExpectedValue = (odds: number, probability: number): number => {
  return +((probability / 100) * odds - 1).toFixed(3);
};

export const calculateROI = (profit: number, totalStaked: number): number => {
  if (totalStaked === 0) return 0;
  return +((profit / totalStaked) * 100).toFixed(1);
};

export const calculateProgressToTarget = (current: number, start: number, target: number): number => {
  if (target <= start) return 100;
  return +(((current - start) / (target - start)) * 100).toFixed(1);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercent = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const formatDateTime = (datetime: string): { date: string; time: string } => {
  const d = new Date(datetime);
  return {
    date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  };
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'text-emerald-400';
  if (confidence >= 65) return 'text-primary-400';
  if (confidence >= 50) return 'text-amber-400';
  return 'text-red-400';
};

export const getConfidenceBg = (confidence: number): string => {
  if (confidence >= 80) return 'bg-emerald-500/20 border-emerald-500/40';
  if (confidence >= 65) return 'bg-primary-500/20 border-primary-500/40';
  if (confidence >= 50) return 'bg-amber-500/20 border-amber-500/40';
  return 'bg-red-500/20 border-red-500/40';
};

export const getDangerColor = (level: string): string => {
  switch (level) {
    case 'low': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'high': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

export const generateDailyPlan = (
  matches: { id: string; homeTeam: { name: string }; awayTeam: { name: string }; analysis: { confidence: number; valueBets: { odds: number; confidence: number; selection: string; market: string }[] } }[],
  bankroll: number,
  strategy: BettingStrategy
) => {
  const sorted = [...matches].sort((a, b) => b.analysis.confidence - a.analysis.confidence);
  const topMatches = sorted.slice(0, 5);

  const recommendations = topMatches.flatMap(match =>
    match.analysis.valueBets.slice(0, 1).map(vb => ({
      matchId: match.id,
      matchName: `${match.homeTeam.name} — ${match.awayTeam.name}`,
      selection: vb.selection,
      odds: vb.odds,
      market: vb.market,
      confidence: vb.confidence,
    }))
  );

  const totalOdds = recommendations.reduce((acc, r) => acc * r.odds, 1);
  const avgConfidence = recommendations.reduce((acc, r) => acc + r.confidence, 0) / recommendations.length;
  const probability = recommendations.reduce((acc, r) => acc * (r.confidence / 100), 1);
  const stake = getRecommendedStake(bankroll, strategy, totalOdds, avgConfidence);
  const potentialWin = Math.round(stake * totalOdds);
  const expectedProfit = potentialWin * probability - stake;

  return {
    matches: topMatches,
    recommendations,
    totalOdds: +totalOdds.toFixed(2),
    probability: +(probability * 100).toFixed(1),
    stake,
    potentialWin,
    expectedProfit: +expectedProfit.toFixed(0),
    riskScore: Math.round(100 - avgConfidence),
  };
};
