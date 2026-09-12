// Интеграция с публичным ESPN API (без ключей, CORS: *)
// Источник: https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard

import type { Match, Team, TeamStats, Odds, MatchAnalysis, ValueBet } from './types';
import { mockMatches } from './mockData';

export interface LeagueDef {
  code: string;      // ESPN код лиги
  name: string;      // Отображаемое имя
}

export const ESPN_LEAGUES: LeagueDef[] = [
  { code: 'eng.1', name: 'АПЛ' },
  { code: 'esp.1', name: 'Ла Лига' },
  { code: 'ger.1', name: 'Бундеслига' },
  { code: 'ita.1', name: 'Серия А' },
  { code: 'fra.1', name: 'Лига 1' },
  { code: 'uefa.champions', name: 'Лига Чемпионов' },
  { code: 'uefa.europa', name: 'Лига Европы' },
  { code: 'rus.1', name: 'РПЛ' },
  { code: 'por.1', name: 'Примейра' },
  { code: 'ned.1', name: 'Эредивизи' },
  { code: 'tur.1', name: 'Суперлига' },
  { code: 'usa.1', name: 'MLS' },
];

// ---------- Конвертация коэффициентов ----------
export function americanToDecimal(ml: string | undefined): number | null {
  if (!ml) return null;
  const n = parseInt(ml.replace('+', ''), 10);
  if (isNaN(n)) return null;
  if (n > 0) return +(1 + n / 100).toFixed(2);
  return +(1 + 100 / Math.abs(n)).toFixed(2);
}

// ---------- Парсинг формы ESPN: "LWWWD" ----------
function parseForm(form: string | undefined): ('W' | 'L' | 'D')[] {
  if (!form) return ['D', 'D', 'D', 'D', 'D'];
  return form.split('').slice(0, 5).map(c =>
    c === 'W' ? 'W' : c === 'L' ? 'L' : 'D'
  ) as ('W' | 'L' | 'D')[];
}

// ---------- Парсинг рекорда: "7-2-1" (W-D-L) ----------
function parseRecord(summary: string | undefined): { wins: number; draws: number; losses: number } {
  if (!summary) return { wins: 5, draws: 2, losses: 3 };
  const parts = summary.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return { wins: 5, draws: 2, losses: 3 };
  return { wins: parts[0], draws: parts[1], losses: parts[2] };
}

// ---------- Оценка силы команды из рекорда + формы ----------
function buildTeam(name: string, logo: string | undefined, form: ('W' | 'L' | 'D')[], rec: { wins: number; draws: number; losses: number }): Team {
  const played = rec.wins + rec.draws + rec.losses || 10;
  const winRate = rec.wins / played;
  const drawRate = rec.draws / played;
  const lossRate = rec.losses / played;

  const formWins = form.filter(f => f === 'W').length;
  const formLosses = form.filter(f => f === 'L').length;
  const formBoost = (formWins - formLosses) * 0.08;

  const xG = Math.max(0.7, Math.min(3.0, 0.9 + winRate * 1.6 + formBoost));
  const xGA = Math.max(0.6, Math.min(2.8, 1.9 - winRate * 1.1 + lossRate * 0.4 - formBoost * 0.5));

  const goalsFor = Math.round((1.1 + winRate * 1.7) * played);
  const goalsAgainst = Math.round((1.8 - winRate * 0.8 + lossRate * 0.3) * played);

  const stats: TeamStats = {
    played,
    wins: rec.wins,
    draws: rec.draws,
    losses: rec.losses,
    goalsFor,
    goalsAgainst,
    cleanSheets: Math.round(played * Math.max(0.1, 0.45 - lossRate * 0.5)),
    avgGoalsScored: +(goalsFor / played).toFixed(2),
    avgGoalsConceded: +(goalsAgainst / played).toFixed(2),
    bttsRate: +Math.min(0.85, Math.max(0.3, 0.42 + lossRate * 0.35 + drawRate * 0.2)).toFixed(2),
    over25Rate: +Math.min(0.85, Math.max(0.25, 0.35 + (xG + xGA - 2.4) * 0.45)).toFixed(2),
    xG: +xG.toFixed(2),
    xGA: +xGA.toFixed(2),
  };

  const rating = Math.round(5.5 + winRate * 3.2 + formBoost * 2);

  return { id: name.toLowerCase().replace(/\s+/g, '-'), name, logo, rating, form, stats };
}

// ---------- Пуассон ----------
function poisson(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

// ---------- Модельные кэфы (если букмекер не дал линию) ----------
function buildOdds(p1: number, pX: number, p2: number): Odds {
  const safe = (x: number) => Math.max(1.02, +(1 / x * 1.07).toFixed(2));
  return {
    '1': safe(p1),
    'X': safe(pX),
    '2': safe(p2),
    '1X': safe(Math.min(0.95, p1 + pX)),
    'X2': safe(Math.min(0.95, pX + p2)),
    '12': safe(Math.min(0.95, p1 + p2)),
    'O25': safe(Math.max(0.06, 0.55)),
    'U25': safe(0.55),
    'Yes': safe(0.45),
    'No': safe(0.5),
    '1O25': safe(Math.max(0.05, p1 * 0.5)),
    '2O25': safe(Math.max(0.05, p2 * 0.5)),
  };
}

// ---------- Анализ матча (Poisson + факторы + value) ----------
function analyzeMatch(home: Team, away: Team, odds: Odds): MatchAnalysis {
  const lh = home.stats.xG;          // атака хозяев
  const la2 = away.stats.xG;         // атака гостей
  let p1 = 0, pX = 0, p2 = 0, over25 = 0;

  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poisson(h, lh) * poisson(a, la2);
      if (h > a) p1 += p;
      else if (h === a) pX += p;
      else p2 += p;
      if (h + a > 2.5) over25 += p;
    }
  }
  const total = p1 + pX + p2 || 1;
  p1 /= total; pX /= total; p2 /= total;

  const expectedGoals = { home: +lh.toFixed(2), away: +la2.toFixed(2) };
  const valueBets: ValueBet[] = [];
  const pushValue = (market: string, selection: string, modelProb: number, bookOdds: number) => {
    const ev = modelProb * bookOdds - 1;
    if (ev > 0.04) {
      valueBets.push({
        market,
        selection,
        odds: bookOdds,
        expectedValue: +(ev * 100).toFixed(1),
        confidence: Math.round(Math.min(92, 50 + ev * 160)),
      });
    }
  };

  pushValue('Исход', `П1 (${home.name})`, p1, odds['1']);
  pushValue('Исход', 'Ничья', pX, odds['X']);
  pushValue('Исход', `П2 (${away.name})`, p2, odds['2']);
  pushValue('Тотал', 'Больше 2.5', over25, odds['O25']);
  pushValue('Тотал', 'Меньше 2.5', 1 - over25, odds['U25']);

  const confidence = Math.round(Math.min(92, 40 + Math.max(p1, pX, p2) * 80));
  const prediction =
    p1 > pX && p1 > p2 ? `П1 (${home.name})`
    : p2 > pX ? `П2 (${away.name})`
    : 'Ничья';

  const reasoning = [
    `Атака ${home.name}: xG ${home.stats.xG} против обороны ${away.name}`,
    `Форма ${home.name}: ${home.form.join('')} · Форма ${away.name}: ${away.form.join('')}`,
    `Средний тотал матча: ${(lh + la2).toFixed(2)} гола`,
  ];

  const keyFactors = [
    { type: 'positive' as const, text: `Атака хозяев xG ${home.stats.xG}`, impact: 7 },
    { type: 'positive' as const, text: `Атака гостей xG ${away.stats.xG}`, impact: 6 },
    { type: 'neutral' as const, text: `П1 ${(p1 * 100).toFixed(0)}% · Ничья ${(pX * 100).toFixed(0)}% · П2 ${(p2 * 100).toFixed(0)}%`, impact: 8 },
  ];

  return {
    confidence,
    prediction,
    reasoning,
    keyFactors,
    h2h: [],
    valueBets,
    dangerLevel: confidence >= 78 ? 'low' : confidence >= 62 ? 'medium' : 'high',
    expectedGoals,
    poissonDistribution: {
      home: +(p1 * 100).toFixed(1),
      away: +(p2 * 100).toFixed(1),
      draw: +(pX * 100).toFixed(1),
    },
  };
}

// ---------- Парсинг события ESPN ----------
function mapEvent(evt: any, leagueName: string): Match | null {
  const comps = evt?.competitions?.[0];
  const competitors = comps?.competitors;
  if (!competitors || competitors.length < 2) return null;

  const homeC = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
  const awayC = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];

  const home = buildTeam(
    homeC.team?.displayName ?? 'Хозяева',
    homeC.team?.logo,
    parseForm(homeC.form),
    parseRecord(homeC.records?.[0]?.summary)
  );
  const away = buildTeam(
    awayC.team?.displayName ?? 'Гости',
    awayC.team?.logo,
    parseForm(awayC.form),
    parseRecord(awayC.records?.[0]?.summary)
  );

  const status = evt.status?.type?.state === 'in' ? 'live'
    : evt.status?.type?.state === 'post' ? 'finished'
    : 'scheduled';

  // Коэффициенты: ESPN (американские) -> десятичные, иначе модельные
  const odds = buildOdds(0.4, 0.28, 0.32);
  const detail = americanToDecimal(comps?.odds?.[0]?.details);
  if (detail) odds['1'] = detail;

  const analysis = analyzeMatch(home, away, odds);

  const scoreH = homeC.score != null ? Number(homeC.score) : undefined;
  const scoreA = awayC.score != null ? Number(awayC.score) : undefined;

  return {
    id: String(evt.id ?? `${home.id}-${away.id}`),
    homeTeam: home,
    awayTeam: away,
    league: leagueName,
    datetime: evt.date ?? new Date().toISOString(),
    status,
    score: scoreH != null && scoreA != null ? { home: scoreH, away: scoreA } : undefined,
    minute: status === 'live' ? evt.status?.displayClock : undefined,
    odds,
    analysis,
    bookmakers: comps?.odds?.[0]?.provider?.name ? [comps.odds[0].provider.name] : ['Модель'],
  };
}

// ---------- Публичная функция: загрузка всех матчей ----------
export interface FetchResult {
  matches: Match[];
  errors: string[];
  liveCount: number;
}

export async function fetchLiveMatches(): Promise<FetchResult> {
  const errors: string[] = [];
  const matches: Match[] = [];

  try {
    const results = await Promise.allSettled(
      ESPN_LEAGUES.map(async (lg) => {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.code}/scoreboard`,
          { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) throw new Error(`${lg.name}: HTTP ${res.status}`);
        return { league: lg, data: await res.json() };
      })
    );

    for (const r of results) {
      if (r.status !== 'fulfilled') {
        errors.push(String(r.reason?.message ?? r.reason));
        continue;
      }
      const events = r.value.data?.events ?? [];
      for (const evt of events) {
        const m = mapEvent(evt, r.value.league.name);
        if (m) matches.push(m);
      }
    }
  } catch (e) {
    errors.push(String(e));
  }

  /* Если ESPN недоступен (сеть/блокировки) — демо-матчи, чтобы UI жил */
  if (matches.length === 0) {
    return {
      matches: mockMatches,
      errors: [...errors, 'ESPN недоступен — показаны демо-матчи'],
      liveCount: mockMatches.filter(m => m.status === 'live').length,
    };
  }

  const liveCount = matches.filter(m => m.status === 'live').length;
  return { matches, errors, liveCount };
}
