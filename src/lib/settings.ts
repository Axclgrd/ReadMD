/**
 * Settings — user-customizable appearance tokens.
 *
 * Each setting maps 1:1 to a CSS variable declared in theme.css. The settings
 * panel (phase 5) writes these at runtime via applySettings(); main.tsx applies
 * them before the first React render to avoid a flash of default styles.
 */
import { load, type Store } from "@tauri-apps/plugin-store";

// ---------------------------------------------------------------------------
// Font-stack constants — single source of truth shared by DEFAULT_SETTINGS and
// SettingsPanel's <select> option values so the controlled select always
// highlights the right option when the value matches exactly.
// ---------------------------------------------------------------------------

/** Matches the font-body stack declared in theme.css :root */
export const FONT_BODY_SYSTEM =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif';

/** Matches the font-mono stack declared in theme.css :root */
export const FONT_MONO_SYSTEM =
  'ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace';

// ---------------------------------------------------------------------------
// Settings type
// ---------------------------------------------------------------------------

export interface Settings {
  /** CSS: --heading-1-color */
  headingColor: string;
  /** CSS: --heading-sub-color */
  subheadingColor: string;
  /** CSS: --text-color */
  textColor: string;
  /** CSS: --link-color */
  linkColor: string;
  /** CSS: --font-body */
  fontBody: string;
  /** CSS: --font-mono */
  fontMono: string;
  /** CSS: --font-size-base  (stored as "Npx", e.g. "16px") */
  fontSize: string;
  /** CSS: --reading-width   (stored as "Npx", e.g. "760px") */
  readingWidth: string;
}

// ---------------------------------------------------------------------------
// Defaults — must match the :root values in theme.css exactly.
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Settings = {
  headingColor: "#1a56db",
  subheadingColor: "#1e3a8a",
  textColor: "#1f2328",
  linkColor: "#0969da",
  fontBody: FONT_BODY_SYSTEM,
  fontMono: FONT_MONO_SYSTEM,
  fontSize: "16px",
  readingWidth: "760px",
};

// ---------------------------------------------------------------------------
// Mapping from Settings keys to CSS variable names.
// ---------------------------------------------------------------------------

const CSS_VARS: Record<keyof Settings, string> = {
  headingColor: "--heading-1-color",
  subheadingColor: "--heading-sub-color",
  textColor: "--text-color",
  linkColor: "--link-color",
  fontBody: "--font-body",
  fontMono: "--font-mono",
  fontSize: "--font-size-base",
  readingWidth: "--reading-width",
};

// ---------------------------------------------------------------------------
// Apply settings to the DOM (live preview — no persistence).
// ---------------------------------------------------------------------------

/**
 * Write every setting as a CSS custom property on :root.
 *
 * This is synchronous and side-effect-free with respect to React state so it
 * can be called both before the first render (in main.tsx) and inside event
 * handlers (in App.tsx) without any ordering constraints.
 */
export function applySettings(s: Settings): void {
  const root = document.documentElement;
  (Object.keys(CSS_VARS) as Array<keyof Settings>).forEach((key) => {
    root.style.setProperty(CSS_VARS[key], s[key]);
  });
}

// ---------------------------------------------------------------------------
// Persistence — @tauri-apps/plugin-store
//
// Cache the Store Promise at module scope so concurrent loadSettings() /
// saveSettings() calls share a single `load()` invocation with no re-entrancy
// window.
// ---------------------------------------------------------------------------

let storeP: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (storeP === null) {
    // No options: saveSettings() calls store.save() explicitly for durability.
    storeP = load("settings.json");
  }
  return storeP;
}

/**
 * Load persisted settings from disk.
 *
 * Missing keys fall back to DEFAULT_SETTINGS values, so a fresh install or a
 * partially migrated store is always safe.
 */
export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const result: Settings = { ...DEFAULT_SETTINGS };
  const keys = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;
  await Promise.all(
    keys.map(async (k) => {
      const v = await store.get<string>(k);
      if (typeof v === "string") result[k] = v;
    }),
  );
  return result;
}

/**
 * Persist the given settings to disk.
 *
 * autoSave is debounced by the plugin; an explicit save() call is added here
 * for durability (ensures the write lands even if the app quits quickly after).
 */
export async function saveSettings(s: Settings): Promise<void> {
  const store = await getStore();
  const keys = Object.keys(s) as Array<keyof Settings>;
  await Promise.all(keys.map((k) => store.set(k, s[k])));
  await store.save();
}
