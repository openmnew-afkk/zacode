/* ═══════════════════════════════════════════════════════════════════════════
 *  🎄 Сезонный движок ZENOVA PRO — живая атмосфера по времени года
 *
 *  Автоматически (по месяцу) или вручную переключает сезонную тему:
 *   • winter  — «Новогодняя Сказка» (ноя–фев): гирлянда, 3D-снегопад, золотое боке,
 *               морозное стекло, обратный отсчёт до Нового года и праздничное кино
 *   • spring  — «Сакура в Цвету» (мар–май): нежные лепестки сакуры и розовый рассвет
 *   • summer  — «Золотая Лазурь» (июн–авг): тёплый закат, солнечные блики и светлячки
 *   • autumn  — «Уютный Янтарь» (сен–окт): кленовые листья и бархатное золото
 * ═══════════════════════════════════════════════════════════════════════════ */

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn' | 'none';

export interface Season {
  id: SeasonId;
  label: string;
  icon: string;
  badge: string;
  /** Описание для карточки сезона */
  description: string;
  /** CSS-переменные акцентов сезона (переопределяют :root) */
  vars: Record<string, string>;
  /** Фоновое свечение страницы (radial-gradient) */
  pageGlow: string;
  /** Идентификатор подборки TMDB для сезонной вкладки */
  collectionQuery?: { type: 'keyword' | 'list'; value: string; label: string; icon: string };
}

export const SEASONS: Record<Exclude<SeasonId, 'none'>, Season> = {
  winter: {
    id: 'winter',
    label: 'Новогодняя',
    icon: '🎄',
    badge: 'ЗИМНЯЯ МАГИЯ',
    description: 'Праздничная гирлянда, пушистый 3D-снег, золотые огни боке и новогоднее кино',
    vars: {
      '--season-accent': '#7dd3fc',
      '--season-accent-2': '#fbbf24',
      '--season-accent-warm': '#f43f5e',
      '--season-glow': 'rgba(125, 211, 252, 0.34)',
      '--season-bg-tint': 'rgba(186, 230, 253, 0.06)',
    },
    pageGlow:
      'radial-gradient(ellipse 80% 36% at 50% -6%, rgba(56, 189, 248, 0.20) 0%, transparent 62%),' +
      'radial-gradient(ellipse 46% 26% at 12% 18%, rgba(251, 191, 36, 0.11) 0%, transparent 68%),' +
      'radial-gradient(ellipse 45% 24% at 88% 14%, rgba(244, 63, 94, 0.10) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'christmas', label: 'Новогоднее и Рождественское кино', icon: '🎄' },
  },
  spring: {
    id: 'spring',
    label: 'Сакура',
    icon: '🌸',
    badge: 'ВЕСЕННИЙ ЦВЕТ',
    description: 'Кружащиеся лепестки сакуры, нежно-розовый кварц и романтичные истории',
    vars: {
      '--season-accent': '#f9a8d4',
      '--season-accent-2': '#86efac',
      '--season-accent-warm': '#f472b6',
      '--season-glow': 'rgba(249, 168, 212, 0.32)',
      '--season-bg-tint': 'rgba(249, 168, 212, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(249, 168, 212, 0.18) 0%, transparent 60%),' +
      'radial-gradient(ellipse 42% 24% at 88% 20%, rgba(134, 239, 172, 0.09) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'romance', label: 'Весенние истории и романтика', icon: '🌸' },
  },
  summer: {
    id: 'summer',
    label: 'Лазурь',
    icon: '🌞',
    badge: 'ЛЕТНИЙ ВАЙБ',
    description: 'Ночные светлячки, океанский бриз и главные летние блокбастеры',
    vars: {
      '--season-accent': '#fbbf24',
      '--season-accent-2': '#38bdf8',
      '--season-accent-warm': '#fb923c',
      '--season-glow': 'rgba(251, 191, 36, 0.30)',
      '--season-bg-tint': 'rgba(251, 191, 36, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(56, 189, 248, 0.16) 0%, transparent 60%),' +
      'radial-gradient(ellipse 42% 24% at 85% 16%, rgba(251, 191, 36, 0.12) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'summer', label: 'Летние приключения', icon: '🌞' },
  },
  autumn: {
    id: 'autumn',
    label: 'Янтарь',
    icon: '🍁',
    badge: 'ОСЕННИЙ УЮТ',
    description: 'Золотой листопад, тёплый пряный янтарь и атмосферные вечера',
    vars: {
      '--season-accent': '#fdba74',
      '--season-accent-2': '#fca5a5',
      '--season-accent-warm': '#ea580c',
      '--season-glow': 'rgba(253, 186, 116, 0.30)',
      '--season-bg-tint': 'rgba(253, 186, 116, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 75% 34% at 50% -4%, rgba(253, 186, 116, 0.16) 0%, transparent 60%),' +
      'radial-gradient(ellipse 42% 24% at 10% 18%, rgba(252, 165, 165, 0.10) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'halloween', label: 'Мистика и осенний уют', icon: '🍁' },
  },
};

/** Автоопределение сезона по месяцу */
export function detectSeason(): Season {
  const month = new Date().getMonth() + 1; // 1..12
  if (month === 11 || month === 12 || month === 1 || month === 2) return SEASONS.winter;
  if (month >= 3 && month <= 5) return SEASONS.spring;
  if (month >= 6 && month <= 8) return SEASONS.summer;
  return SEASONS.autumn;
}

const SEASON_KEY = 'zenova_season';
const SEASON_AUTO = 'zenova_season_auto';

/** Сохранённый сезон пользователя (или авто) */
export function getStoredSeason(): { season: Season; auto: boolean } {
  try {
    const auto = localStorage.getItem(SEASON_AUTO) !== '0';
    if (!auto) {
      const id = localStorage.getItem(SEASON_KEY) as SeasonId | null;
      if (id === 'none') {
        return {
          season: { id: 'none', label: 'Классика', icon: '✦', badge: 'БАЗОВАЯ', description: 'Классическая обсидиановая тема без сезонных акцентов', vars: {}, pageGlow: '' },
          auto: false,
        };
      }
      if (id && SEASONS[id as Exclude<SeasonId, 'none'>]) {
        return { season: SEASONS[id as Exclude<SeasonId, 'none'>], auto: false };
      }
    }
  } catch {}
  return { season: detectSeason(), auto: true };
}

export function setStoredSeason(id: SeasonId | 'auto'): void {
  try {
    if (id === 'auto') {
      localStorage.setItem(SEASON_AUTO, '1');
      localStorage.removeItem(SEASON_KEY);
    } else if (id === 'none') {
      localStorage.setItem(SEASON_AUTO, '0');
      localStorage.setItem(SEASON_KEY, 'none');
    } else if (SEASONS[id]) {
      localStorage.setItem(SEASON_AUTO, '0');
      localStorage.setItem(SEASON_KEY, id);
    }
  } catch {}
  window.dispatchEvent(new CustomEvent('zenova-season-change'));
}

/** Применить сезонные CSS-переменные к <html> */
export function applySeason(season: Season): void {
  const root = document.documentElement;
  root.style.removeProperty('--season-accent');
  root.style.removeProperty('--season-accent-2');
  root.style.removeProperty('--season-accent-warm');
  root.style.removeProperty('--season-glow');
  root.style.removeProperty('--season-bg-tint');
  root.style.removeProperty('--season-glow-bg');
  root.setAttribute('data-season', season.id);
  if (season.id === 'none') return;
  for (const [k, v] of Object.entries(season.vars)) {
    root.style.setProperty(k, v);
  }
  root.style.setProperty('--season-glow-bg', season.pageGlow);
}
