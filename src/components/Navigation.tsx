import React, { useState } from 'react';
import { Menu, X, Home, Heart, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/favorites', icon: Heart, label: 'Избранное' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass-lg border-t border-white/10 md:hidden">
        <div className="flex items-center justify-around">
          {links.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors ${
                isActive(path) ? 'text-primary-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="fixed left-0 top-0 h-screen w-64 glass-lg border-r border-white/10 hidden md:flex flex-col p-6 z-40">
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          🎬 TeleCinema
        </h1>

        <div className="flex-1 space-y-2">
          {links.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(path)
                  ? 'glass bg-primary-600/40 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="space-y-2 border-t border-white/10 pt-4">
          <a
            href="https://github.com/openmnew-afkk/zacode"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span>GitHub</span>
          </a>
        </div>
      </nav>

      {/* Desktop Layout Offset */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-64" />
    </>
  );
};
