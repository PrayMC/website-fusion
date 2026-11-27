// The theme, shared by the script that sets it before the first paint (app/layout.tsx) and the theme switch
// (components/TopBar.tsx)

/** Where the theme picked with the switch is kept; without one the device's setting is followed. */
export const THEME_KEY = 'fusion-theme';

/**
 * The page background of each theme (--background in app/globals.css: change both together), for the browser's own
 * bars (meta theme-color). Written out: the script runs before the stylesheet may have loaded.
 */
export const THEME_COLORS = { light: '#fafafa', dark: '#0a0a0a' };
