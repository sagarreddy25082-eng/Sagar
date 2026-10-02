import React, { createContext, useContext, useEffect } from 'react';
import { ThemeConfig, ThemeId } from '../types/spreadsheet';

export const NAVY_BLUE_WHITE_THEME: ThemeConfig = {
  id: 'navy-blue-white',
  name: 'Navy Blue & Pure White',
  description: 'Executive deep midnight navy chrome with crisp pure white grid cells and vibrant royal sapphire accents',
  isDark: false,
  accentColor: '#2563eb', // Royal Sapphire Blue
  gradientHeader: 'linear-gradient(180deg, #091328 0%, #060d1d 100%)',
  gradientBadge: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  bgMain: '#080f22',
  bgToolbar: '#0c1836',
  bgHeader: '#080f22',
  bgGrid: '#ffffff',
  bgCellActive: 'rgba(37, 99, 235, 0.08)',
  borderGrid: '#cbd5e1',
  borderUi: '#1e3a8a',
  textPrimary: '#0f172a',
  textMuted: '#64748b',
  selectionBg: 'rgba(37, 99, 235, 0.16)',
  selectionBorder: '#2563eb',
  colHeaderColors: ['#2563eb', '#0284c7', '#0d9488', '#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626'],
};

export const BURGUNDY_METALLIC_GOLD_THEME: ThemeConfig = {
  id: 'black-gold-red',
  name: 'Burgundy & Metallic Gold',
  description: 'Deep velvet wine red canvas with rich 24K polished burnished gold rings and accents',
  isDark: true,
  accentColor: '#e3ba63',
  gradientHeader: 'linear-gradient(135deg, #fff3b0 0%, #e3ba63 35%, #b88628 70%, #fae58c 100%)',
  gradientBadge: 'linear-gradient(135deg, #fceeb0 0%, #d4af37 40%, #996e1b 80%, #d4af37 100%)',
  bgMain: '#140307',
  bgToolbar: '#1c050b',
  bgHeader: '#24070e',
  bgGrid: '#120206',
  bgCellActive: 'rgba(227, 186, 99, 0.18)',
  borderGrid: '#380c16',
  borderUi: '#632014',
  textPrimary: '#fef5e7',
  textMuted: '#cfb284',
  selectionBg: 'rgba(227, 186, 99, 0.22)',
  selectionBorder: '#e3ba63',
  colHeaderColors: ['#fceeb0', '#e3ba63', '#d4af37', '#f0cd78', '#fae58c', '#b88628'],
};

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'navy-blue-white': NAVY_BLUE_WHITE_THEME,
  'black-gold-red': BURGUNDY_METALLIC_GOLD_THEME,
};

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'navy-blue-white',
  theme: NAVY_BLUE_WHITE_THEME,
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  currentTheme?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
}> = ({ children, currentTheme = 'navy-blue-white' }) => {
  const activeTheme = THEMES[currentTheme] || NAVY_BLUE_WHITE_THEME;

  useEffect(() => {
    if (activeTheme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ themeId: activeTheme.id, theme: activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
