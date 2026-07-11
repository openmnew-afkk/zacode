import type { Movie, MovieDetail, CatalogResponse } from '../types';

const OMDB_KEY = '4a3b711b';
const OMDB_BASE = 'https://www.omdbapi.com';

interface OMDBItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

interface OMDBDetail extends OMDBItem {
  Plot: string;
  imdbRating: string;
  Genre: string;
  Director: string;
  Actors: string;
  Runtime: string;
  Country: string;
  totalSeasons?: string;
}

const posterUrl = (p: string | null | undefined, imdbId?: string): string => {
  if (!p || p === 'N/A') {
    if (imdbId?.startsWith('tt')) {
      return `https://img.omdbapi.com/?i=${imdbId}&h=1000&apikey=${OMDB_KEY}`;
    }
    return 'https://via.placeholder.com/300x450?text=No+Poster';
  }
  if (p.startsWith('http') || p.startsWith('//')) return p;
  if (imdbId?.startsWith('tt')) {
    return `https://img.omdbapi.com/?i=${imdbId}&h=1000&apikey=${OMDB_KEY}`;
  }
  return 'https://via.placeholder.com/300x450?text=No+Poster';
};

async function omdbRequest(params: Record<string, any>): Promise<any> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set('apikey', OMDB_KEY);
  
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }
  
  const res = await fetch(url.toString());
  const data = await res.json();
  
  if (data.Response === 'False') {
    throw new Error(data.Error || 'NOT_FOUND');
  }
  
  return data;
}

function toMovie(item: OMDBItem): Movie {
  const id = item.imdbID || '';
  const isSerial = item.Type === 'series';
  
  return {
    id,
    imdbID: id,
    title: item.Title || 'Без названия',
    original_title: item.Title || '',
    overview: '',
    poster_path: posterUrl(item.Poster, id),
    backdrop_path: posterUrl(item.Poster, id),
    release_date: item.Year || '',
    vote_average: 0,
    imdb_rating: 0,
    runtime: null,
    type: isSerial ? 'series' : 'movie',
    genre_ids: [],
    genres: [],
    is_serial: isSerial,
    directors: [],
    actors: [],
    countries: [],
    popularity: 0,
    adult: false,
  };
}

function toMovieDetail(item: OMDBDetail): MovieDetail {
  const m = toMovie(item as OMDBItem);
  const genres = item.Genre?.split(', ')?.filter(Boolean) || [];
  const actors = item.Actors?.split(', ')?.filter(Boolean) || [];
  const directors = item.Director?.split(', ')?.filter(Boolean) || [];
  const countries = item.Country?.split(', ')?.filter(Boolean) || [];
  const runtime = parseInt(item.Runtime) || null;
  const rating = parseFloat(item.imdbRating) || 0;
  
  return {
    ...m,
    plot: item.Plot || '',
    imdb_rating: rating,
    vote_average: rating,
    runtime,
    genres,
    actors,
    directors,
    countries,
    overview: item.Plot || '',
    seasons: item.totalSeasons ? parseInt(item.totalSeasons) : undefined,
  };
}

export async function searchMovies(
  query: string,
  page = 1,
  type?: 'movie' | 'series'
): Promise<CatalogResponse> {
  try {
    const params: Record<string, any> = { s: query, page, type: 'movie' };
    if (type === 'series') params.type = 'series';
    
    const data = await omdbRequest(params);
    
    if (!data.Search) {
      return {
        ok: true,
        page,
        results: [],
        total_pages: 0,
        total_results: 0,
      };
    }
    
    const items = data.Search.map(toMovie);
    
    // Enrich first 6 results with details
    const enriched = await Promise.all(
      items.slice(0, 6).map(async (m: Movie) => {
        try {
          const detail = await omdbRequest({ i: m.imdbID, plot: 'short' });
          return toMovieDetail(detail);
        } catch {
          return m;
        }
      })
    );
    
    return {
      ok: true,
      page,
      results: [...enriched, ...items.slice(6)],
      total_pages: Math.ceil((data.totalResults || 0) / 10),
      total_results: data.totalResults || items.length,
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      ok: false,
      page,
      results: [],
      total_pages: 0,
      total_results: 0,
    };
  }
}

export async function getMovieDetail(imdbId: string): Promise<MovieDetail | null> {
  try {
    const data = await omdbRequest({ i: imdbId, plot: 'full' });
    return toMovieDetail(data);
  } catch (error) {
    console.error('Detail error:', error);
    return null;
  }
}

export async function getTrendingMovies(): Promise<Movie[]> {
  const trendingQueries = [
    'Oppenheimer', 'Barbie', 'Killers of the Flower Moon',
    'Dune', 'Avatar', 'The Matrix',
    'Interstellar', 'Inception', 'The Dark Knight'
  ];
  
  const results: Movie[] = [];
  
  for (const query of trendingQueries) {
    try {
      const data = await omdbRequest({ s: query, type: 'movie' });
      if (data.Search && data.Search.length > 0) {
        results.push(toMovie(data.Search[0]));
      }
    } catch (error) {
      console.error(`Failed to fetch ${query}:`, error);
    }
  }
  
  return results.slice(0, 20);
}
