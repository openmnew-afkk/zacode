export type Page = 'dashboard' | 'matches' | 'calculator' | 'bankroll' | 'plan';
export interface Team {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  form: ('W' | 'L' | 'D')[];
  stats: TeamStats;
}

export interface TeamStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  bttsRate: number; // Both teams to score rate
  over25Rate: number;
  xG: number; // Expected goals per match
  xGA: number; // Expected goals against per match
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  leagueLogo?: string;
  datetime: string;
  status: 'scheduled' | 'live' | 'finished';
  score?: { home: number; away: number };
  minute?: number;
  odds: Odds;
  analysis: MatchAnalysis;
  bookmakers: string[];
}

export interface Odds {
  '1': number;
  'X': number;
  '2': number;
  '1X': number;
  'X2': number;
  '12': number;
  'O25': number;
  'U25': number;
  'Yes': number; // BTTS Yes
  'No': number;  // BTTS No
  '1O25': number; // Home win & Over 2.5
  '2O25': number; // Away win & Over 2.5
}

export interface MatchAnalysis {
  confidence: number; // 0-100
  prediction: string;
  reasoning: string[];
  keyFactors: KeyFactor[];
  h2h: H2HRecord[];
  valueBets: ValueBet[];
  dangerLevel: 'low' | 'medium' | 'high';
  expectedGoals: { home: number; away: number };
  poissonDistribution: { home: number; away: number; draw: number };
}

export interface KeyFactor {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
  impact: number; // 1-10
}

export interface H2HRecord {
  date: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
}

export interface ValueBet {
  market: string;
  selection: string;
  odds: number;
  expectedValue: number; // percentage
  confidence: number;
}

export interface BetSelection {
  matchId: string;
  matchName: string;
  selection: string;
  odds: number;
  market: string;
  confidence: number;
}

export interface ExpressBet {
  selections: BetSelection[];
  totalOdds: number;
  stake: number;
  potentialWin: number;
  probability: number;
}

export interface SingleBet {
  selection: BetSelection;
  stake: number;
  potentialWin: number;
}

export interface BankrollState {
  current: number;
  start: number;
  target: number;
  history: BankrollHistoryEntry[];
  strategy: BettingStrategy;
}

export interface BankrollHistoryEntry {
  date: string;
  amount: number;
  change: number;
  type: 'win' | 'loss' | 'deposit' | 'withdraw';
  description: string;
}

export type BettingStrategy = 'flat' | 'martingale' | 'kelly' | 'fibonacci' | 'value';

export interface UserSettings {
  defaultStake: number;
  strategy: BettingStrategy;
  bankroll: number;
  targetBankroll: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  favoriteLeagues: string[];
  notifications: boolean;
}

export interface DailyPlan {
  date: string;
  matches: Match[];
  recommendations: BetSelection[];
  expectedProfit: number;
  riskScore: number;
  totalOdds: number;
}
