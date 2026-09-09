import React, { useState, useEffect } from 'react';
import { fetchLiveMatches, type FetchResult } from '../sport/espnApi';
import {
  calculateExpressOdds, calculatePotentialWin, getRecommendedStake,
  calculateExpressProbability, formatCurrency,
} from '../sport/calculations';
import type { Match, BettingStrategy } from '../sport/types';
import { useTelegram } from '../hooks/useTelegram';
import './SportPage.css';

type Tab = 'matches' | 'express' | 'bankroll';
const BANKROLL_KEY = 'tc_sport_bankroll';

const STRATEGIES: Array<{ id: BettingStrategy; label: string; icon: string }> = [
  { id: 'flat', label: 'Флэт 2%', icon: '📐' },
  { id: 'kelly', label: 'Келли', icon: '🧮' },
  { id: 'value', label: 'Value', icon: '💎' },
];

const confidenceColor = (c: number) => c >= 80 ? '#4ade80' : c >= 65 ? '#f0c96a' : c >= 50 ? '#fb923c' : '#f87171';
const dangerIcon = (l: string) => l === 'low' ? '🟢' : l === 'medium' ? '🟡' : '🔴';

const SportPage: React.FC = () => {
  const { haptic } = useTelegram();
  const [tab, setTab] = useState<Tab>('matches');
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [picks, setPicks] = useState<Array<{ id: string; name: string; sel: string; odds: number }>>([]);
  const [stake, setStake] = useState(100);
  const [bankroll, setBankroll] = useState<number>(() => {
    try { return Number(localStorage.getItem(BANKROLL_KEY)) || 1000; } catch { return 1000; }
  });
  const [strategy, setStrategy] = useState<BettingStrategy>('flat');

  useEffect(() => {
    setLoading(true);
    fetchLiveMatches().then((r) => { setData(r); setLoading(false); });
  }, []);

  const saveBankroll = (v: number) => {
    setBankroll(v);
    try { localStorage.setItem(BANKROLL_KEY, String(v)); } catch {}
  };

  const togglePick = (m: Match, sel: string, odds: number) => {
    haptic('light');
    setPicks((prev) => {
      const exists = prev.find((p) => p.id === m.id);
      if (exists?.sel === sel) return prev.filter((p) => p.id !== m.id);
      const rest = prev.filter((p) => p.id !== m.id);
      return [...rest, { id: m.id, name: `${m.homeTeam.name} — ${m.awayTeam.name}`, sel, odds }];
    });
  };

  const topMatches = [...(data?.matches ?? [])].sort(
    (a, b) => b.analysis.confidence - a.analysis.confidence
  );
  /* Для расчётов приводим picks к формату расчётных функций */
  const asSelections = picks.map((p) => ({
    matchId: p.id, matchName: p.name, selection: p.sel,
    odds: p.odds, market: 'Исход', confidence: 70,
  }));
  const expressOdds = calculateExpressOdds(asSelections);
  const potentialWin = calculatePotentialWin(expressOdds, stake);
  const recommendedStake = picks.length > 0
    ? getRecommendedStake(bankroll, strategy, expressOdds, calculateExpressProbability(asSelections))
    : 0;

  return (
    <div className="sp page">
      <div className="sp-header">
        <div className="sp-header__brand">
          <span className="sp-header__logo">⚽</span>
          <div>
            <h1 className="sp-header__title">СпортАнализ</h1>
            <span className="sp-header__sub">
              {data?.liveCount ? `🔥 ${data.liveCount} в эфире` : 'Матчи и прогнозы'}
            </span>
          </div>
        </div>
      </div>

      <div className="sp-tabs">
        {([['matches', '⚽ Матчи'], ['express', '🚀 Экспресс'], ['bankroll', '💰 Банкролл']] as Array<[Tab, string]>).map(([t, label]) => (
          <button key={t} className={`sp-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); haptic('light'); }}>
            {label}
          </button>
        ))}
      </div>

      <div className="sp-content">
        {loading && (
          <div className="sp-empty">
            <div className="sp-spinner" />
            <p>Анализирую матчи…</p>
          </div>
        )}

        {!loading && tab === 'matches' && (
          <>
            {data && data.errors.length > 0 && (
              <div className="sp-notice">ℹ️ {data.errors[0]}</div>
            )}
            {topMatches.length === 0 && <div className="sp-empty"><p>Матчей сегодня нет</p></div>}
            {topMatches.map((m) => (
              <div key={m.id} className="sp-match" onClick={() => { setSelectedMatch(m); haptic('light'); }}>
                <div className="sp-match__head">
                  <span className="sp-match__league">{m.league}</span>
                  {m.status === 'live' && <span className="sp-match__live">🔴 LIVE {m.minute ?? ''}</span>}
                </div>
                <div className="sp-match__teams">
                  <span className="sp-match__team">
                    {m.homeTeam.logo && <img src={m.homeTeam.logo} alt="" />}
                    {m.homeTeam.name}
                  </span>
                  <span className="sp-match__score">
                    {m.score ? `${m.score.home} : ${m.score.away}` : 'VS'}
                  </span>
                  <span className="sp-match__team sp-match__team--right">
                    {m.awayTeam.name}
                    {m.awayTeam.logo && <img src={m.awayTeam.logo} alt="" />}
                  </span>
                </div>
                <div className="sp-match__foot">
                  <span className="sp-match__prediction">
                    {dangerIcon(m.analysis.dangerLevel)} {m.analysis.prediction}
                  </span>
                  <span className="sp-match__conf" style={{ color: confidenceColor(m.analysis.confidence) }}>
                    {m.analysis.confidence}%
                  </span>
                </div>
                {m.analysis.valueBets.length > 0 && (
                  <div className="sp-match__value">
                    💎 {m.analysis.valueBets[0].selection} @{m.analysis.valueBets[0].odds} · EV {m.analysis.valueBets[0].expectedValue}%
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {!loading && tab === 'express' && (
          <div className="sp-express">
            <p className="sp-hint">Тапни исход в матче (П1 · X · П2), чтобы добавить в экспресс</p>
            {topMatches.slice(0, 8).map((m) => (
              <div key={m.id} className="sp-odds-match">
                <p className="sp-odds-match__name">
                  {m.homeTeam.name} — {m.awayTeam.name}
                </p>
                <div className="sp-odds-row">
                  {([['1', m.odds['1'], 'П1'], ['X', m.odds['X'], 'X'], ['2', m.odds['2'], 'П2']] as Array<[string, number, string]>).map(([sel, odds, label]) => (
                    <button
                      key={sel}
                      className={`sp-odd ${picks.find((p) => p.id === m.id)?.sel === sel ? 'picked' : ''}`}
                      onClick={() => togglePick(m, sel, odds)}
                    >
                      <span className="sp-odd__label">{label}</span>
                      <span className="sp-odd__val">{odds}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {picks.length > 0 && (
              <div className="sp-express-card">
                <p className="sp-express-card__title">🚀 Мой экспресс ({picks.length})</p>
                {picks.map((p) => (
                  <div key={p.id} className="sp-express-pick">
                    <span>{p.sel} · {p.name}</span>
                    <span className="sp-express-pick__odds">@{p.odds}</span>
                  </div>
                ))}
                <div className="sp-express-total">
                  <span>Общий кэф</span>
                  <span className="sp-express-total__odds">{expressOdds.toFixed(2)}</span>
                </div>
                <div className="sp-stake-row">
                  <input
                    className="sp-stake-input"
                    type="number"
                    value={stake}
                    min={50}
                    onChange={(e) => setStake(Number(e.target.value) || 0)}
                  />
                  <span className="sp-stake-currency">₽</span>
                </div>
                {recommendedStake > 0 && (
                  <p className="sp-stake-hint">
                    По стратегии «{STRATEGIES.find((s) => s.id === strategy)?.label}»: рекомендуемая ставка {formatCurrency(recommendedStake)}
                  </p>
                )}
                <div className="sp-express-win">
                  <span>Возможный выигрыш</span>
                  <span className="sp-express-win__val">{formatCurrency(potentialWin)}</span>
                </div>
              </div>
            )}

            {picks.length > 0 && (
              <div className="sp-strategies">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    className={`sp-strategy ${strategy === s.id ? 'active' : ''}`}
                    onClick={() => { setStrategy(s.id); haptic('light'); }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'bankroll' && (
          <div className="sp-bankroll">
            <div className="sp-bankroll-card">
              <p className="sp-bankroll-card__title">💰 Мой банкролл</p>
              <p className="sp-bankroll-card__amount">{formatCurrency(bankroll)}</p>
              <div className="sp-bankroll-actions">
                <button className="sp-bankroll-btn" onClick={() => { saveBankroll(bankroll + 500); haptic('light'); }}>+500 ₽</button>
                <button className="sp-bankroll-btn" onClick={() => { saveBankroll(Math.max(0, bankroll - 500)); haptic('medium'); }}>−500 ₽</button>
                <button className="sp-bankroll-btn sp-bankroll-btn--reset" onClick={() => { saveBankroll(1000); haptic('medium'); }}>Сброс</button>
              </div>
            </div>
            <div className="sp-bankroll-card">
              <p className="sp-bankroll-card__title">📐 Стратегия ставок</p>
              <div className="sp-strategies sp-strategies--col">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    className={`sp-strategy ${strategy === s.id ? 'active' : ''}`}
                    onClick={() => { setStrategy(s.id); haptic('light'); }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              <p className="sp-hint">
                Флэт — фикс 2% банка. Келли — по вероятности. Value — только переоценённые кэфы.
              </p>
            </div>
            <p className="sp-warning">
              ⚠️ Прогнозы носят информационный характер. Ставьте только то, что готовы потерять.
            </p>
          </div>
        )}
      </div>

      {/* Детали матча */}
      {selectedMatch && (
        <div className="sp-detail-overlay" onClick={() => setSelectedMatch(null)}>
          <div className="sp-detail" onClick={(e) => e.stopPropagation()}>
            <p className="sp-detail__league">{selectedMatch.league}</p>
            <h3 className="sp-detail__title">
              {selectedMatch.homeTeam.name} — {selectedMatch.awayTeam.name}
            </h3>
            <p className="sp-detail__prediction">
              Прогноз: {selectedMatch.analysis.prediction} · Уверенность {selectedMatch.analysis.confidence}%
            </p>
            <div className="sp-detail__grid">
              <div className="sp-detail__cell">
                <span>П1</span>
                <b>{selectedMatch.analysis.poissonDistribution.home}%</b>
              </div>
              <div className="sp-detail__cell">
                <span>Ничья</span>
                <b>{selectedMatch.analysis.poissonDistribution.draw}%</b>
              </div>
              <div className="sp-detail__cell">
                <span>П2</span>
                <b>{selectedMatch.analysis.poissonDistribution.away}%</b>
              </div>
            </div>
            {selectedMatch.analysis.reasoning.map((r, i) => (
              <p key={i} className="sp-detail__reason">• {r}</p>
            ))}
            {selectedMatch.analysis.valueBets.length > 0 && (
              <>
                <p className="sp-detail__subtitle">💎 Value-ставки</p>
                {selectedMatch.analysis.valueBets.map((vb, i) => (
                  <div key={i} className="sp-detail__value">
                    <span>{vb.selection} ({vb.market})</span>
                    <span>@{vb.odds} · EV {vb.expectedValue}%</span>
                  </div>
                ))}
              </>
            )}
            <button className="sp-detail__close" onClick={() => setSelectedMatch(null)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SportPage;
