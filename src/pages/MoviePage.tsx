import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import { getMovieDetail } from '../api/omdb';
import { getWatchOptions } from '../api/players';
import { MovieHeader } from '../components/MovieHeader';
import { Player } from '../components/Player';
import { useStore } from '../store';
import type { MovieDetail, WatchOption } from '../types';

export const MoviePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToHistory } = useStore();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [watchOptions, setWatchOptions] = useState<WatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  useEffect(() => {
    if (!id) return;

    const fetchMovie = async () => {
      try {
        setLoading(true);
        const detail = await getMovieDetail(id);
        if (detail) {
          setMovie(detail);
          addToHistory(detail);
          
          // Загружаем плеер
          setPlayerLoading(true);
          const options = detail.is_serial
            ? await getWatchOptions(id, 1, 1)
            : await getWatchOptions(id);
          setWatchOptions(options);
        }
      } catch (error) {
        console.error('Failed to fetch movie:', error);
      } finally {
        setLoading(false);
        setPlayerLoading(false);
      }
    };

    fetchMovie();
  }, [id, addToHistory]);

  const handleSeasonChange = async (season: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(1);
    setPlayerLoading(true);
    try {
      const options = await getWatchOptions(id!, season, 1);
      setWatchOptions(options);
    } catch (error) {
      console.error('Failed to load season:', error);
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleEpisodeChange = async (episode: number) => {
    setSelectedEpisode(episode);
    setPlayerLoading(true);
    try {
      const options = await getWatchOptions(id!, selectedSeason, episode);
      setWatchOptions(options);
    } catch (error) {
      console.error('Failed to load episode:', error);
    } finally {
      setPlayerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-gray-400">Фильм не найден</p>
        <button
          onClick={() => navigate('/')}
          className="glass px-6 py-2 rounded-lg hover:bg-white/20 transition-colors"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold truncate">{movie.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Movie Header */}
        <MovieHeader movie={movie} />

        {/* Player Section */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold">Смотреть</h2>
          <Player
            watchOptions={watchOptions}
            title={movie.title}
            loading={playerLoading}
          />
        </div>

        {/* Series Controls */}
        {movie.is_serial && movie.seasons && (
          <div className="mt-12 space-y-6">
            {/* Seasons */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Сезоны</h3>
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {Array.from({ length: movie.seasons }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handleSeasonChange(i + 1)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-colors ${
                      selectedSeason === i + 1
                        ? 'glass bg-primary-600/40'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    Сезон {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Episodes */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Сезон {selectedSeason}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Array.from({ length: 13 }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handleEpisodeChange(i + 1)}
                    className={`py-2 rounded-lg text-sm transition-colors ${
                      selectedEpisode === i + 1
                        ? 'glass bg-primary-600/40'
                        : 'glass hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
