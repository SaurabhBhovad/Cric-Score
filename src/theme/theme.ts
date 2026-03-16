// =====================================================
// THEME — Dark mode cricket app theme
// =====================================================

export const COLORS = {
  // Backgrounds
  bg: '#050E1F',
  bgCard: '#0D1B2E',
  bgElevated: '#142338',
  bgModal: '#0A1628',

  // Accents
  green: '#00D26A',
  greenDark: '#00A855',
  greenGlow: 'rgba(0, 210, 106, 0.15)',

  gold: '#FFD700',
  goldDark: '#D4AF37',

  blue: '#2979FF',
  blueLight: '#64B5F6',

  // Wicket / danger
  red: '#FF4B4B',
  redLight: '#FF8080',

  // Extra types
  orange: '#FF9800',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8EA8C3',
  textMuted: '#4A6175',
  textOnGreen: '#000000',

  // Borders
  border: '#1A2D42',
  borderLight: '#243347',

  // Scoring buttons
  btnNormal: '#142338',
  btnBoundary: '#0D2B1A',
  btnSix: '#1A2B0D',
  btnWicket: '#2B0D0D',
  btnExtra: '#2B200D',
  btnUndo: '#1A1A2E',
};

export const GRADIENTS = {
  primary: ['#00D26A', '#00A855'] as string[],
  card: ['#0D1B2E', '#142338'] as string[],
  header: ['#050E1F', '#0D1B2E'] as string[],
  gold: ['#FFD700', '#D4AF37'] as string[],
  wicket: ['#FF4B4B', '#CC0000'] as string[],
  scoreboard: ['#0A1628', '#142338'] as string[],
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    xxxl: 36,
    score: 52,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};
