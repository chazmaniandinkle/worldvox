# Creating Custom WorldVox Themes

WorldVox's UI is fully themeable through a token-based system. Every visual property — panel backgrounds, borders, shadows, text colors, button states, and more — is defined as a typed token in the `UITheme` interface.

## Quick start

1. Open WorldVox and go to **Settings** (⚙ button)
2. The **Theme** section shows all installed themes
3. Click **Export Theme JSON** to get the current theme as a starting point
4. Edit the JSON, then click **Import Theme JSON** to load it

Your custom themes are saved in `localStorage` and persist across sessions.

## Theme token reference

```typescript
interface UITheme {
  id: string;            // unique key, e.g. 'my-dark-oak'
  name: string;          // display name
  description: string;   // one-line summary

  // ─── Surfaces ───
  panelBg: string;       // panel/toolbar background color
  panelBorder: string;   // CSS border shorthand (e.g. '4px solid #3a2818')
  panelShadow: string;   // CSS box-shadow value
  panelRadius: number;   // border-radius in px (0 = sharp corners)
  panelBackdrop: string; // backdrop-filter value (e.g. 'blur(10px)' or 'none')
  panelInset: string;    // inner highlight as inset box-shadow ('' to disable)
  panelBgPattern: string; // CSS background-image for texture overlay

  // ─── Typography ───
  fontFamily: string;    // CSS font-family stack
  textPrimary: string;   // main text color
  textSecondary: string; // muted text
  textDim: string;       // hints, counters
  textHeading: string;   // section headings
  labelSpacing: number;  // letter-spacing on section labels (px)

  // ─── Buttons ───
  btnBg: string;
  btnBorder: string;
  btnText: string;
  btnHoverBg: string;
  btnActiveBg: string;
  btnActiveBorder: string;
  btnActiveText: string;
  btnRadius: number;

  // ─── Block Palette ───
  swatchBorder: string;
  swatchActiveBorder: string;
  swatchActiveGlow: string;  // box-shadow on selected swatch
  swatchRadius: number;

  // ─── Inputs ───
  inputBg: string;
  inputBorder: string;
  accentColor: string;       // slider / checkbox accent

  // ─── Primary action buttons ───
  primaryBtnBg: string;
  primaryBtnBorder: string;
  primaryBtnHoverBg: string;

  // ─── Misc ───
  dividerColor: string;
  barTrackBg: string;        // health/hunger bar track
  scrollbarThumb: string;

  // ─── World Picker overlay ───
  pickerOverlayBg: string;
  pickerCardBg: string;
  pickerCardBorder: string;
  pickerCardHoverBg: string;
  pickerCardHoverBorder: string;
}
```

## Design tips

**Sharp corners sell the voxel feel.** All four built-in themes use `panelRadius: 0` and `btnRadius: 0`. If you're going for a voxel aesthetic, avoid rounded corners.

**Beveled edges via box-shadow.** The Stone and Earthen themes create a 3D carved look purely through `panelShadow` with multiple inset values — no images needed.

**Monospace fonts reinforce the grid.** Every built-in theme uses `Courier New`. This isn't required, but monospace type pairs naturally with voxel geometry.

**Block swatch borders matter.** The swatch is just a colored square — its border and glow on selection are what make it feel interactive. Thick borders + a matching glow work well.

**Test with all panels open.** Open the creature creator, species list, inspect panel, and bottom bar simultaneously to check that your colors don't clash.

## Sharing themes

Export your theme JSON and share it as a file or paste. Others can import it through the settings panel. Theme JSON is a single flat object with no dependencies — fully portable.

## Programmatic API

```typescript
import { ThemeManager } from './ui/themes';

const tm = new ThemeManager();

// List all themes
tm.listThemes(); // [{ id, name, description, builtin }]

// Apply a theme
tm.apply('stone');

// Register a custom theme at runtime
tm.register({ id: 'my-theme', name: 'My Theme', ... });

// Import from JSON string
const id = tm.importTheme(jsonString);
if (id) tm.apply(id);

// Export current theme
const json = tm.exportTheme();

// Listen for changes
tm.onChange = (theme) => console.log('Switched to', theme.name);
```
