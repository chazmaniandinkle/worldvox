// ─── Theme Token Interface ───
// Every visual property the UI uses is defined here.
// Community themes only need to implement this interface.

export interface UITheme {
  /** Unique key, e.g. 'earthen', 'stone'. Used in localStorage. */
  id: string;
  /** Human-readable display name */
  name: string;
  /** One-line description */
  description: string;

  // ─── Surfaces ───
  /** Primary panel/bar background */
  panelBg: string;
  /** Panel border */
  panelBorder: string;
  /** Panel shadow (box-shadow value) */
  panelShadow: string;
  /** Panel border-radius in px */
  panelRadius: number;
  /** Optional backdrop-filter (e.g. 'blur(10px)') */
  panelBackdrop: string;
  /** Inner panel highlight (inset box-shadow). Empty string to disable. */
  panelInset: string;

  // ─── Typography ───
  /** Font stack for UI text */
  fontFamily: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary/muted text color */
  textSecondary: string;
  /** Dim/hint text color */
  textDim: string;
  /** Heading color */
  textHeading: string;
  /** Section label letter-spacing in px */
  labelSpacing: number;

  // ─── Buttons ───
  /** Default button background */
  btnBg: string;
  /** Default button border */
  btnBorder: string;
  /** Button text color */
  btnText: string;
  /** Button hover background */
  btnHoverBg: string;
  /** Active/selected button background */
  btnActiveBg: string;
  /** Active/selected button border */
  btnActiveBorder: string;
  /** Active button text color */
  btnActiveText: string;
  /** Button border-radius in px */
  btnRadius: number;

  // ─── Block Palette ───
  /** Border around unselected block swatch */
  swatchBorder: string;
  /** Border around selected block swatch */
  swatchActiveBorder: string;
  /** Glow/shadow on selected swatch (box-shadow) */
  swatchActiveGlow: string;
  /** Swatch border-radius in px */
  swatchRadius: number;

  // ─── Inputs ───
  /** Text input / select background */
  inputBg: string;
  /** Text input / select border */
  inputBorder: string;
  /** Slider accent color */
  accentColor: string;

  // ─── Create / Primary action button ───
  primaryBtnBg: string;
  primaryBtnBorder: string;
  primaryBtnHoverBg: string;

  // ─── Dividers ───
  dividerColor: string;

  // ─── Inspect panel bars ───
  barTrackBg: string;

  // ─── World Picker overlay ───
  pickerOverlayBg: string;
  pickerCardBg: string;
  pickerCardBorder: string;
  pickerCardHoverBg: string;
  pickerCardHoverBorder: string;

  // ─── Scrollbar ───
  scrollbarThumb: string;

  // ─── Optional decorative background pattern (CSS value for background-image) ───
  panelBgPattern: string;
}

// ──────────────────────────────────────────────
//  BUILT-IN THEMES
// ──────────────────────────────────────────────

export const THEME_EARTHEN: UITheme = {
  id: 'earthen',
  name: 'Earthen Craft',
  description: 'Wooden crafting-table panels with warm tones',

  panelBg: '#5a4030',
  panelBorder: '4px solid #3a2818',
  panelShadow: '6px 6px 0 #2a1a0e, inset 0 0 0 2px #7a5a3a',
  panelRadius: 0,
  panelBackdrop: 'none',
  panelInset: 'inset 0 0 0 2px #7a5a3a',
  panelBgPattern: 'none',

  fontFamily: "'Courier New', 'Courier', monospace",
  textPrimary: '#d8c8a0',
  textSecondary: '#b8a078',
  textDim: '#7a6a4a',
  textHeading: '#d8c8a0',
  labelSpacing: 3,

  btnBg: 'transparent',
  btnBorder: 'none',
  btnText: '#b8a078',
  btnHoverBg: '#6a4a2a',
  btnActiveBg: '#7a5a30',
  btnActiveBorder: 'none',
  btnActiveText: '#f0e8c8',
  btnRadius: 0,

  swatchBorder: '3px solid #3a2818',
  swatchActiveBorder: '3px solid #f0e8c8',
  swatchActiveGlow: '0 0 6px rgba(240,232,200,0.5), inset 1px 1px 0 rgba(255,255,255,0.3)',
  swatchRadius: 0,

  inputBg: '#4a3020',
  inputBorder: '2px solid #3a2818',
  accentColor: '#8a6a3a',

  primaryBtnBg: 'rgba(92,140,60,0.35)',
  primaryBtnBorder: '2px solid #5c8c3c',
  primaryBtnHoverBg: 'rgba(92,140,60,0.5)',

  dividerColor: '#3a2818',

  barTrackBg: 'rgba(0,0,0,0.25)',

  pickerOverlayBg: 'rgba(30,20,10,0.97)',
  pickerCardBg: '#4a3020',
  pickerCardBorder: '2px solid #3a2818',
  pickerCardHoverBg: '#5a4030',
  pickerCardHoverBorder: '2px solid #8a6a3a',

  scrollbarThumb: '#7a5a3a',
};

export const THEME_STONE: UITheme = {
  id: 'stone',
  name: 'Stone Tablet',
  description: 'Chiseled stone UI with beveled edges',

  panelBg: '#7d7b6c',
  panelBorder: '3px solid #6e6b5e',
  panelShadow: 'inset 2px 2px 0 #908e7e, inset -2px -2px 0 #5a5848, 4px 4px 0 rgba(0,0,0,0.3)',
  panelRadius: 0,
  panelBackdrop: 'none',
  panelInset: 'inset 2px 2px 0 #9e9b8c, inset -2px -2px 0 #5a5848',
  panelBgPattern: 'none',

  fontFamily: "'Courier New', 'Courier', monospace",
  textPrimary: '#2e2c24',
  textSecondary: '#4a4838',
  textDim: '#6a6858',
  textHeading: '#2e2c24',
  labelSpacing: 2,

  btnBg: 'transparent',
  btnBorder: 'none',
  btnText: '#4a4838',
  btnHoverBg: '#8a8878',
  btnActiveBg: '#a09e8a',
  btnActiveBorder: 'none',
  btnActiveText: '#2e2c24',
  btnRadius: 0,

  swatchBorder: '2px solid #5a5848',
  swatchActiveBorder: '2px solid #e8e0b8',
  swatchActiveGlow: 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.3), 0 0 0 2px #e8e0b8',
  swatchRadius: 0,

  inputBg: '#6e6b5e',
  inputBorder: '2px solid #5a5848',
  accentColor: '#a09e8a',

  primaryBtnBg: 'rgba(80,100,60,0.4)',
  primaryBtnBorder: '2px solid #6e6b5e',
  primaryBtnHoverBg: 'rgba(80,100,60,0.6)',

  dividerColor: '#5a5848',

  barTrackBg: 'rgba(0,0,0,0.15)',

  pickerOverlayBg: 'rgba(50,48,40,0.97)',
  pickerCardBg: '#6e6b5e',
  pickerCardBorder: '2px solid #5a5848',
  pickerCardHoverBg: '#8a8878',
  pickerCardHoverBorder: '2px solid #a09e8a',

  scrollbarThumb: '#908e7e',
};

export const THEME_PIXEL: UITheme = {
  id: 'pixel',
  name: 'Pixel Inventory',
  description: 'Retro RPG inventory slots with cyan accents',

  panelBg: '#0e0e1e',
  panelBorder: '2px solid #5a6a7a',
  panelShadow: 'none',
  panelRadius: 0,
  panelBackdrop: 'none',
  panelInset: '',
  panelBgPattern: 'none',

  fontFamily: "'Courier New', 'Courier', monospace",
  textPrimary: '#7aeaff',
  textSecondary: '#4a7a8a',
  textDim: '#2a4a5a',
  textHeading: '#7aeaff',
  labelSpacing: 2,

  btnBg: '#161628',
  btnBorder: '2px solid #2a3a5a',
  btnText: '#4a5a7a',
  btnHoverBg: '#1e2a4a',
  btnActiveBg: '#2a3a5e',
  btnActiveBorder: '2px solid #7aeaff',
  btnActiveText: '#7aeaff',
  btnRadius: 0,

  swatchBorder: '2px solid #2a3a5a',
  swatchActiveBorder: '2px solid #7aeaff',
  swatchActiveGlow: '0 0 8px rgba(122,234,255,0.3)',
  swatchRadius: 0,

  inputBg: '#161628',
  inputBorder: '2px solid #2a3a5a',
  accentColor: '#7aeaff',

  primaryBtnBg: 'rgba(122,234,255,0.15)',
  primaryBtnBorder: '2px solid #7aeaff',
  primaryBtnHoverBg: 'rgba(122,234,255,0.25)',

  dividerColor: '#2a3a5a',

  barTrackBg: 'rgba(122,234,255,0.08)',

  pickerOverlayBg: 'rgba(8,8,20,0.97)',
  pickerCardBg: '#161628',
  pickerCardBorder: '2px solid #2a3a5a',
  pickerCardHoverBg: '#1e2a4a',
  pickerCardHoverBorder: '2px solid #7aeaff',

  scrollbarThumb: '#2a3a5a',
};

export const THEME_NEON: UITheme = {
  id: 'neon',
  name: 'Neon Grid',
  description: 'Wireframe hologram overlay with terminal green',

  panelBg: 'rgba(0,0,0,0.6)',
  panelBorder: '1px solid rgba(0,255,136,0.3)',
  panelShadow: 'none',
  panelRadius: 0,
  panelBackdrop: 'none',
  panelInset: '',
  panelBgPattern: 'none',

  fontFamily: "'Courier New', 'Courier', monospace",
  textPrimary: '#00ff88',
  textSecondary: '#0a8a4a',
  textDim: '#064a2a',
  textHeading: '#00ff88',
  labelSpacing: 3,

  btnBg: 'transparent',
  btnBorder: '1px solid rgba(0,255,136,0.12)',
  btnText: '#0a6a3a',
  btnHoverBg: 'rgba(0,255,136,0.06)',
  btnActiveBg: 'rgba(0,255,136,0.1)',
  btnActiveBorder: '1px solid #00ff88',
  btnActiveText: '#00ff88',
  btnRadius: 0,

  swatchBorder: '1px solid rgba(0,255,136,0.1)',
  swatchActiveBorder: '1px solid currentColor',
  swatchActiveGlow: '0 0 10px rgba(0,255,136,0.2)',
  swatchRadius: 0,

  inputBg: 'rgba(0,255,136,0.04)',
  inputBorder: '1px solid rgba(0,255,136,0.2)',
  accentColor: '#00ff88',

  primaryBtnBg: 'rgba(0,255,136,0.1)',
  primaryBtnBorder: '1px solid rgba(0,255,136,0.4)',
  primaryBtnHoverBg: 'rgba(0,255,136,0.2)',

  dividerColor: 'rgba(0,255,136,0.15)',

  barTrackBg: 'rgba(0,255,136,0.06)',

  pickerOverlayBg: 'rgba(0,0,0,0.95)',
  pickerCardBg: 'rgba(0,255,136,0.03)',
  pickerCardBorder: '1px solid rgba(0,255,136,0.15)',
  pickerCardHoverBg: 'rgba(0,255,136,0.08)',
  pickerCardHoverBorder: '1px solid rgba(0,255,136,0.5)',

  scrollbarThumb: 'rgba(0,255,136,0.2)',
};

/** All built-in themes, in display order */
export const BUILTIN_THEMES: UITheme[] = [
  THEME_EARTHEN,
  THEME_STONE,
  THEME_PIXEL,
  THEME_NEON,
];
