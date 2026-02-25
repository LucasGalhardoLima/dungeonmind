export const colors = {
  background: '#1A1A2E',
  accent: '#C9A84C',
  purple: '#4A2C6E',
  text: '#F0F0F0',
  muted: '#808080',
  danger: '#DC3232',
  success: '#32CD32',
  surface: '#252545',
  overlay: 'rgba(0, 0, 0, 0.6)',
  narration: '#C9A84C',
  oocText: '#808080',
} as const;

export const typography = {
  heading: 'GeistPixel',
  body: undefined, // system font (SF Pro / Roboto)
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  screen: 24,
  card: 16,
  button: 12,
  chip: 8,
} as const;

export const animation = {
  sceneFadeIn: 500,
  portraitRevealMin: 2000,
  diceSettlePause: 500,
  diceRollDuration: { min: 1500, max: 3000 },
} as const;

export const tokenBudget = {
  worldDefinition: 300,
  adventureTypeDefinition: 200,
  dmPersona: 800,
  dndRulesReference: 700,
  stateDocument: 4000,
  recentHistory: 5000,
  playerAction: 500,
  totalInput: 12500,
  maxOutput: 1500,
} as const;
