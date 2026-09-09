import { Match, Team, BankrollState, UserSettings } from './types';

const createTeam = (
  id: string,
  name: string,
  rating: number,
  form: ('W' | 'L' | 'D')[],
  stats: Partial<Team['stats']>
): Team => ({
  id,
  name,
  rating,
  form,
  stats: {
    played: 10,
    wins: 6,
    draws: 2,
    losses: 2,
    goalsFor: 18,
    goalsAgainst: 10,
    cleanSheets: 3,
    avgGoalsScored: 1.8,
    avgGoalsConceded: 1.0,
    bttsRate: 0.6,
    over25Rate: 0.5,
    xG: 1.75,
    xGA: 1.05,
    ...stats,
  },
});

const teams: Record<string, Team> = {
  real: createTeam('real', 'Реал Мадрид', 92, ['W', 'W', 'W', 'D', 'W'], { wins: 8, goalsFor: 24, xG: 2.4 }),
  barca: createTeam('barca', 'Барселона', 91, ['W', 'W', 'D', 'W', 'W'], { wins: 7, goalsFor: 22, xG: 2.2 }),
  city: createTeam('city', 'Ман Сити', 93, ['W', 'W', 'W', 'W', 'D'], { wins: 8, goalsFor: 26, xG: 2.6 }),
  liverpool: createTeam('liverpool', 'Ливерпуль', 90, ['W', 'D', 'W', 'W', 'W'], { wins: 7, goalsFor: 20, xG: 2.0 }),
  bayern: createTeam('bayern', 'Бавария', 89, ['W', 'W', 'W', 'L', 'W'], { wins: 7, goalsFor: 25, xG: 2.5 }),
  psg: createTeam('psg', 'ПСЖ', 88, ['W', 'W', 'D', 'W', 'L'], { wins: 6, goalsFor: 21, xG: 2.1 }),
  arsenal: createTeam('arsenal', 'Арсенал', 88, ['W', 'W', 'W', 'D', 'W'], { wins: 7, goalsFor: 19, xG: 1.9 }),
  inter: createTeam('inter', 'Интер', 87, ['W', 'D', 'W', 'W', 'W'], { wins: 6, goalsFor: 17, xG: 1.7 }),
  atletico: createTeam('atletico', 'Атлетико', 85, ['D', 'W', 'W', 'D', 'W'], { wins: 5, goalsFor: 14, xG: 1.4, over25Rate: 0.4 }),
  dortmund: createTeam('dortmund', 'Боруссия Д', 84, ['W', 'L', 'W', 'W', 'D'], { wins: 5, goalsFor: 16, xG: 1.6 }),
  napoli: createTeam('napoli', 'Наполи', 83, ['W', 'W', 'D', 'L', 'W'], { wins: 5, goalsFor: 15, xG: 1.5 }),
  juventus: createTeam('juventus', 'Ювентус', 82, ['D', 'W', 'D', 'W', 'D'], { wins: 4, goalsFor: 12, xG: 1.2, over25Rate: 0.35 }),
  chelsea: createTeam('chelsea', 'Челси', 83, ['W', 'W', 'L', 'W', 'W'], { wins: 5, goalsFor: 16, xG: 1.6 }),
  manutd: createTeam('manutd', 'Ман Юнайтед', 81, ['L', 'W', 'D', 'W', 'L'], { wins: 4, goalsFor: 13, xG: 1.3 }),
  tottenham: createTeam('tottenham', 'Тоттенхэм', 80, ['W', 'L', 'W', 'D', 'W'], { wins: 4, goalsFor: 14, xG: 1.4 }),
  leverkusen: createTeam('leverkusen', 'Байер 04', 86, ['W', 'W', 'W', 'W', 'D'], { wins: 7, goalsFor: 22, xG: 2.2 }),
};

const generateOdds = (homeAdvantage: number): Match['odds'] => {
  const baseHome = 3.0 - homeAdvantage * 0.8;
  const baseAway = 3.0 + homeAdvantage * 0.5;
  return {
    '1': +(baseHome + Math.random() * 0.5).toFixed(2),
    'X': +(3.2 + Math.random() * 0.3).toFixed(2),
    '2': +(baseAway + Math.random() * 0.6).toFixed(2),
    '1X': +(1.4 + Math.random() * 0.3).toFixed(2),
    'X2': +(1.5 + Math.random() * 0.3).toFixed(2),
    '12': +(1.2 + Math.random() * 0.2).toFixed(2),
    'O25': +(1.7 + Math.random() * 0.4).toFixed(2),
    'U25': +(1.9 + Math.random() * 0.4).toFixed(2),
    'Yes': +(1.6 + Math.random() * 0.3).toFixed(2),
    'No': +(2.0 + Math.random() * 0.3).toFixed(2),
    '1O25': +(2.5 + Math.random() * 0.5).toFixed(2),
    '2O25': +(3.0 + Math.random() * 0.7).toFixed(2),
  };
};

const generateAnalysis = (home: Team, away: Team): Match['analysis'] => {
  const homeStrength = home.stats.xG / (home.stats.xGA + 0.1);
  const awayStrength = away.stats.xG / (away.stats.xGA + 0.1);
  const totalStrength = homeStrength + awayStrength;
  const homeWinProb = (homeStrength / totalStrength) * 0.85 + 0.1;
  const drawProb = 0.22;
  const awayWinProb = Math.max(0.05, 1 - homeWinProb - drawProb);
  const confidence = Math.min(95, Math.max(55,
    60 + (home.form.filter(f => f === 'W').length * 5) - (home.form.filter(f => f === 'L').length * 8)
  ));
  const expectedGoals = {
    home: +((home.stats.xG + away.stats.xGA) / 2).toFixed(2),
    away: +((away.stats.xG + home.stats.xGA) / 2).toFixed(2),
  };
  const reasoning: string[] = [];
  const keyFactors: Match['analysis']['keyFactors'] = [];
  if (home.form.filter(f => f === 'W').length >= 3) {
    reasoning.push(`${home.name} в отличной форме`);
    keyFactors.push({ type: 'positive', text: 'Домашная команда в топ-форме', impact: 8 });
  }
  if (away.form.filter(f => f === 'L').length >= 2) {
    reasoning.push(`${away.name} испытывает проблемы`);
    keyFactors.push({ type: 'positive', text: 'Гости в слабой форме', impact: 7 });
  }
  if (home.stats.over25Rate > 0.6) {
    keyFactors.push({ type: 'positive', text: 'Вероятны голы', impact: 6 });
  }
  const valueBets: Match['analysis']['valueBets'] = [];
  if (homeWinProb > 0.5) {
    valueBets.push({
      market: '1X2', selection: `П1 (${home.name})`,
      odds: +(1 / homeWinProb + 0.15).toFixed(2),
      expectedValue: +((homeWinProb * (1 / homeWinProb + 0.15) - 1) * 100).toFixed(1),
      confidence: Math.round(homeWinProb * 100),
    });
  }
  if (expectedGoals.home + expectedGoals.away > 2.3) {
    valueBets.push({
      market: 'Тотал', selection: 'ТБ 2.5', odds: 1.75,
      expectedValue: +(((expectedGoals.home + expectedGoals.away) / 3.5) * 1.75 * 100 - 100).toFixed(1),
      confidence: 72,
    });
  }
  return {
    confidence,
    prediction: homeWinProb > 0.5 ? `П1 (${home.name})` : homeWinProb > 0.35 ? 'Ничья' : `П2 (${away.name})`,
    reasoning, keyFactors,
    h2h: [
      { date: '2024-03-15', homeTeam: home.name, awayTeam: away.name, score: '2:1' },
      { date: '2023-11-20', homeTeam: away.name, awayTeam: home.name, score: '1:1' },
      { date: '2023-08-10', homeTeam: home.name, awayTeam: away.name, score: '3:2' },
    ],
    valueBets,
    dangerLevel: confidence > 75 ? 'low' : confidence > 60 ? 'medium' : 'high',
    expectedGoals,
    poissonDistribution: {
      home: +Math.max(0, homeWinProb * 100).toFixed(1),
      away: +Math.max(0, awayWinProb * 100).toFixed(1),
      draw: +(drawProb * 100).toFixed(1),
    },
  };
};

const now = new Date();
const today = now.toISOString().split('T')[0];
export const mockMatches: Match[] = [
  {
    id: '1',
    homeTeam: teams.real,
    awayTeam: teams.barca,
    league: 'Ла Лига',
    datetime: `${today}T21:00:00`,
    status: 'scheduled',
    odds: generateOdds(0.3),
    analysis: generateAnalysis(teams.real, teams.barca),
    bookmakers: ['Лига Ставок', 'Winline', '1xStavit', 'Бетбум'],
  },
  {
    id: '2',
    homeTeam: teams.city,
    awayTeam: teams.liverpool,
    league: 'АПЛ',
    datetime: `${today}T18:30:00`,
    status: 'scheduled',
    odds: generateOdds(0.2),
    analysis: generateAnalysis(teams.city, teams.liverpool),
    bookmakers: ['Лига Ставок', 'Winline', '1xStavit', 'Бетбум'],
  },
  {
    id: '3',
    homeTeam: teams.bayern,
    awayTeam: teams.dortmund,
    league: 'Бундеслига',
    datetime: `${today}T19:30:00`,
    status: 'scheduled',
    odds: generateOdds(0.4),
    analysis: generateAnalysis(teams.bayern, teams.dortmund),
    bookmakers: ['Лига Ставок', 'Winline', '1xStavit'],
  },
  {
    id: '4',
    homeTeam: teams.arsenal,
    awayTeam: teams.chelsea,
    league: 'АПЛ',
    datetime: `${today}T16:00:00`,
    status: 'scheduled',
    odds: generateOdds(0.35),
    analysis: generateAnalysis(teams.arsenal, teams.chelsea),
    bookmakers: ['Лига Ставок', 'Winline', 'Бетбум'],
  },
  {
    id: '5',
    homeTeam: teams.psg,
    awayTeam: teams.napoli,
    league: 'Лига 1',
    datetime: `${today}T22:00:00`,
    status: 'scheduled',
    odds: generateOdds(0.25),
    analysis: generateAnalysis(teams.psg, teams.napoli),
    bookmakers: ['Winline', '1xStavit', 'Бетбум'],
  },
  {
    id: '6',
    homeTeam: teams.inter,
    awayTeam: teams.juventus,
    league: 'Серия А',
    datetime: `${today}T20:45:00`,
    status: 'scheduled',
    odds: generateOdds(0.3),
    analysis: generateAnalysis(teams.inter, teams.juventus),
    bookmakers: ['Лига Ставок', 'Winline', '1xStavit'],
  },
  {
    id: '7',
    homeTeam: teams.leverkusen,
    awayTeam: teams.atletico,
    league: 'Бундеслига',
    datetime: `${today}T17:30:00`,
    status: 'scheduled',
    odds: generateOdds(0.4),
    analysis: generateAnalysis(teams.leverkusen, teams.atletico),
    bookmakers: ['Лига Ставок', 'Winline', 'Бетбум'],
  },
  {
    id: '8',
    homeTeam: teams.tottenham,
    awayTeam: teams.manutd,
    league: 'АПЛ',
    datetime: `${today}T21:30:00`,
    status: 'scheduled',
    odds: generateOdds(0.1),
    analysis: generateAnalysis(teams.tottenham, teams.manutd),
    bookmakers: ['Winline', '1xStavit', 'Бетбум'],
  },
];

export const defaultBankroll: BankrollState = {
  current: 100,
  start: 100,
  target: 2000,
  history: [
    { date: today, amount: 100, change: 0, type: 'deposit', description: 'Начальный банк' },
  ],
  strategy: 'value',
};

export const defaultSettings: UserSettings = {
  defaultStake: 10,
  strategy: 'value',
  bankroll: 100,
  targetBankroll: 2000,
  riskLevel: 'moderate',
  favoriteLeagues: ['АПЛ', 'Ла Лига', 'Бундеслига', 'Серия А'],
  notifications: true,
};

export const leagues = [
  { name: 'Все лиги', count: 8 },
  { name: 'АПЛ', count: 3 },
  { name: 'Ла Лига', count: 1 },
  { name: 'Бундеслига', count: 2 },
  { name: 'Серия А', count: 1 },
  { name: 'Лига 1', count: 1 },
];