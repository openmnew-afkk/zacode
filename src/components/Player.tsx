import React from 'react';
import { Play, AlertCircle } from 'lucide-react';
import type { WatchOption } from '../types';

interface PlayerProps {
  watchOptions: WatchOption[];
  title: string;
  loading?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  watchOptions,
  title,
  loading = false,
}) => {
  const [selectedOption, setSelectedOption] = React.useState<WatchOption | null>(
    watchOptions[0] || null
  );
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    setSelectedOption(watchOptions[0] || null);
  }, [watchOptions]);

  if (loading) {
    return (
      <div className="w-full bg-dark-800 rounded-xl aspect-video flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedOption) {
    return (
      <div className="w-full bg-dark-800 rounded-xl aspect-video flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-300">Плеер недоступен</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full bg-dark-800 rounded-xl aspect-video overflow-hidden">
        {selectedOption.type === 'iframe' ? (
          <iframe
            src={selectedOption.url}
            title={title}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onError={() => setError('Ошибка загрузки плеера')}
          />
        ) : (
          <video
            src={selectedOption.url}
            controls
            className="w-full h-full bg-black"
            onError={() => setError('Ошибка воспроизведения видео')}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      {watchOptions.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Выберите источник:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {watchOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setSelectedOption(option);
                  setError('');
                }}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                  selectedOption.id === option.id
                    ? 'glass bg-primary-600/40'
                    : 'glass hover:bg-white/10'
                }`}
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
