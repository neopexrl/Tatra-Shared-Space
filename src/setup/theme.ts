export const palette = {
  background: '#F3EEE7',
  surface: '#FFF9F1',
  surfaceAlt: '#F6E1CB',
  ink: '#17252C',
  muted: '#5F676B',
  line: '#D7CBBB',
  brand: '#0F5968',
  brandSoft: '#D9EEF1',
  accent: '#B7642E',
  accentSoft: '#F7E1D0',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 56,
} as const;

export const radii = {
  sm: 14,
  md: 22,
  lg: 30,
} as const;

export const shadow = {
  soft: {
    shadowColor: '#17252C',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
} as const;
