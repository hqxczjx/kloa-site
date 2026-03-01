import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isAngelMode, setIsAngelMode] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const getTheme = (): { isDark: boolean; source: string } => {
      let saved;
      try {
        saved = localStorage.getItem('theme');
      } catch (e) {
        saved = null;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (saved === 'dark') {
        return { isDark: true, source: 'saved' };
      }
      if (saved === 'light') {
        return { isDark: false, source: 'saved' };
      }
      return { isDark: prefersDark, source: 'system' };
    };

    const applyTheme = () => {
      const { isDark } = getTheme();
      setIsAngelMode(!isDark);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply theme on mount
    applyTheme();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const { source } = getTheme();
      if (source === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !isAngelMode;
    setIsAngelMode(newMode);

    if (newMode) {
      // Angel Mode (Light)
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {
        // Silent fail - localStorage may not be available
      }
    } else {
      // Demon Mode (Dark)
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {
        // Silent fail - localStorage may not be available
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <button
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="relative w-16 h-8 rounded-full p-1 transition-all duration-300"
      style={{
        background: isAngelMode
          ? 'linear-gradient(135deg, oklch(0.78 0.10 15), oklch(0.72 0.12 15))'
          : 'linear-gradient(135deg, oklch(0.72 0.08 240), oklch(0.64 0.10 240))',
      }}
      aria-label={isAngelMode ? '切换到恶魔模式' : '切换到天使模式'}
    >
      <div
        className="absolute top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          left: isAngelMode ? '4px' : 'calc(100% - 28px)',
          background: isAngelMode ? '#fff' : '#0f0f12',
          boxShadow: isAngelMode
            ? '0 2px 8px oklch(0.72 0.12 15 / 0.3)'
            : '0 2px 8px oklch(0.64 0.10 240 / 0.4)',
        }}
      >
        {isAngelMode ? (
          <Sun className="w-4 h-4 text-pink-500" strokeWidth={2.5} />
        ) : (
          <Moon className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
        )}
      </div>

      {/* Halo effect for Angel Mode */}
      {isAngelMode && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
          style={{
            opacity: 0.3,
            background: 'radial-gradient(circle, oklch(0.72 0.12 15 / 0.4) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Horn glow effect for Demon Mode */}
      {!isAngelMode && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
          style={{
            opacity: 0.4,
            background: 'radial-gradient(circle, oklch(0.64 0.10 240 / 0.5) 0%, transparent 70%)',
          }}
        />
      )}
    </button>
  );
}
