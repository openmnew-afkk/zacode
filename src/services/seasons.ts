/* ═══════════════════════════════════════════════════════════════════════════
 *  🎄 Сезонный движок ZENOVA — настроение по времени года
 *
 *  Автоматически (по месяцу) или вручную переключает сезонную тему:
 *   • winter  — «Новогодняя» (дек–янв): снег, льдистые искры, вкладка
 *               «Новогоднее кино» с праздничными фильмами
 *   • spring  — «Сакура» (мар–апр): нежные розово-зелёные ноты
 *   • summer  — «Лазурь» (июн–июл): тёплый закат
 *   • autumn  — «Янтарь» (сен–окт): уютные медовые ноты
 *
 *  Сезон подмешивает акцентные цвета и фон к базовой теме (тёмной/светлой).
 * ═══════════════════════════════════════════════════════════════════════════ */

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn' | 'none';

export interface Season {
  id: SeasonId;
  label: string;
  icon: string;
  /** Описание для карточки сезона */
  description: string;
  /** CSS-переменные акцентов сезона (переопределяют :root) */
  vars: Record<string, string>;
  /** Фоновое свечение страницы (radial-gradient) */
  pageGlow: string;
  /** Идентификатор подборки TMDB для сезонной вкладки (нулевое = нет вкладки) */
  collectionQuery?: { type: 'keyword' | 'list'; value: string; label: string; icon: string };
}

export const SEASONS: Record<Exclude<SeasonId, 'none'>, Season> = {
  winter: {
    id: 'winter',
    label: 'Новогодняя',
    icon: '🎄',
    description: 'Снежная, мягкая и волшебная — с праздничным кино',
    vars: {
      '--season-accent': '#7dd3fc',
      '--season-accent-2': '#a5b4fc',
      '--season-glow': 'rgba(125, 211, 252, 0.30)',
      '--season-bg-tint': 'rgba(191, 219, 254, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 70% 32% at 50% -4%, rgba(125,211,252,0.16) 0%, transparent 60%),' +
      'radial-gradient(ellipse 40% 22% at 12% 22%, rgba(165,180,252,0.10) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'christmas', label: 'Новогоднее кино', icon: '🎄' },
  },
  spring: {
    id: 'spring',
    label: 'Сакура',
    icon: '🌸',
    description: 'Нежные розово-зелёные ноты весны и первые романсы',
    vars: {
      '--season-accent': '#f9a8d4',
      '--season-accent-2': '#86efac',
      '--season-glow': 'rgba(249, 168, 212, 0.30)',
      '--season-bg-tint': 'rgba(249, 168, 212, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 70% 32% at 50% -4%, rgba(249,168,212,0.15) 0%, transparent 60%),' +
      'radial-gradient(ellipse 40% 22% at 88% 20%, rgba(134,239,172,0.08) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'spring', label: 'Весенние истории', icon: '🌸' },
  },
  summer: {
    id: 'summer',
    label: 'Лазурь',
    icon: '🌞',
    description: 'Тёплый закат, приключения и летние блокбастеры',
    vars: {
      '--season-accent': '#fbbf24',
      '--season-accent-2': '#38bdf8',
      '--season-glow': 'rgba(251, 191, 36, 0.28)',
      '--season-bg-tint': 'rgba(251, 191, 36, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 70% 32% at 50% -4%, rgba(56,189,248,0.14) 0%, transparent 60%),' +
      'radial-gradient(ellipse 40% 22% at 85% 16%, rgba(251,191,36,0.10) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'summer', label: 'Летние приключения', icon: '🌞' },
  },
  autumn: {
    id: 'autumn',
    label: 'Янтарь',
    icon: '🍁',
    description: 'Уютные медовые ноты осени и тёплые истории',
    vars: {
      '--season-accent': '#fdba74',
      '--season-accent-2': '#fca5a5',
      '--season-glow': 'rgba(253, 186, 116, 0.28)',
      '--season-bg-tint': 'rgba(253, 186, 116, 0.05)',
    },
    pageGlow:
      'radial-gradient(ellipse 70% 32% at 50% -4%, rgba(253,186,116,0.14) 0%, transparent 60%),' +
      'radial-gradient(ellipse 40% 22% at 10% 18%, rgba(252,165,165,0.08) 0%, transparent 65%)',
    collectionQuery: { type: 'keyword', value: 'autumn', label: 'Осенний уют', icon: '🍁' },
  },
};

/** Автоопределение сезона по месяцу */
export function detectSeason(): Season {
  const month = new Date().getMonth() + 1; // 1..12
  if (month === 12 || month === 1) return SEASONS.winter;
  if (month >= 3 && month <= 4) return SEASONS.spring;
  if (month >= 6 && month <= 7) return SEASONS.summer;
  if (month >= 9 && month <= 10) return SEASONS.autumn;
  // Февраль, май, август — нейтральная тема
  return { id: 'none', label: 'Классика', icon: '✦', description: '', vars: {}, pageGlow: '' };
}

const SEASON_KEY = 'zenova_season';
const SEASON_AUTO = 'zenova_season_auto';

/** Сохранённый сезон пользователя (или авто) */
export function getStoredSeason(): { season: Season; auto: boolean } {
  try {
    const auto = localStorage.getItem(SEASON_AUTO) !== '0';
    if (!auto) {
      const id = localStorage.getItem(SEASON_KEY) as Exclude<SeasonId, 'none'> | null;
      if (id && SEASONS[id]) return { season: SEASONS[id], auto: false };
    }
  } catch {}
  return { season: detectSeason(), auto: true };
}

export function setStoredSeason(id: SeasonId): void {
  try {
    if (id === 'none' || !SEASONS[id as Exclude<SeasonId, 'none'>]) {
      localStorage.setItem(SEASON_AUTO, '1');
      localStorage.removeItem(SEASON_KEY);
    } else {
      localStorage.setItem(SEASON_AUTO, '0');
      localStorage.setItem(SEASON_KEY, id);
    }
  } catch {}
}

/** Применить сезонные CSS-переменные к <html> */
export function applySeason(season: Season): void {
  const root = document.documentElement;
  // Сброс прошлых
  root.style.removeProperty('--season-accent');
  root.style.removeProperty('--season-accent-2');
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
