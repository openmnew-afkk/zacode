import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchMovies } from '../api/omdb';
import type { Movie } from '../types';

interface SearchBarProps {
  onSearch: (movies: Movie[]) => void;
  loading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, loading = false }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const result = await searchMovies(query);
      onSearch(result.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="glass relative">
        <div className="flex items-center gap-2 px-4 py-3">
          <Search className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск фильмов, сериалов..."
            className="w-full bg-transparent outline-none text-white placeholder-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {isSearching && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </form>
  );
};
