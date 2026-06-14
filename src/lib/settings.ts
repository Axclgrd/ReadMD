/**
 * Settings — user-customizable appearance tokens.
 *
 * Each setting maps 1:1 to a CSS variable declared in theme.css. The settings
 * panel (phase 5) writes these at runtime via applySettings(); main.tsx applies
 * them before the first React render to avoid a flash of default styles.
 *
 * Phase 6 adds:
 *   - ThemeMode ("light" | "dark" | "system") with applyTheme/watchSystemTheme.
 *   - applySettings now removes a CSS var when its value equals the default so
 *     the [data-theme="dark"] palette can show through for untouched tokens.
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
// Theme mode
// ---------------------------------------------------------------------------

/** User-selected colour scheme preference. */
export type ThemeMode = "light" | "dark" | "system";

// ---------------------------------------------------------------------------
// Settings type
// ---------------------------------------------------------------------------

export interface Settings {
  /** Light / dark / system colour scheme preference (phase 6). */
  theme: ThemeMode;
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
  theme: "system",
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
//
// `theme` is intentionally absent — it drives the [data-theme] attribute via
// applyTheme(), not an inline CSS custom property.
// ---------------------------------------------------------------------------

const CSS_VARS: Partial<Record<keyof Settings, string>> = {
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
 * Write appearance settings as CSS custom properties on :root.
 *
 * When a value equals the DEFAULT_SETTINGS value the property is *removed* from
 * the inline style so the [data-theme="dark"] palette can govern it.  When the
 * user has customised a value it is written inline, which wins over both the
 * :root and [data-theme] rule blocks.
 *
 * `theme` is NOT handled here — use applyTheme() instead.
 *
 * This function is synchronous and side-effect-free with respect to React state
 * so it can be called both before the first render (in main.tsx) and inside
 * event handlers (in App.tsx).
 */
export function applySettings(s: Settings): void {
  const root = document.documentElement;
  (Object.keys(CSS_VARS) as Array<keyof Settings>).forEach((key) => {
    const varName = CSS_VARS[key];
    if (varName === undefined) return; // `theme` has no CSS var
    if (s[key] === DEFAULT_SETTINGS[key]) {
      // Remove the inline override — let :root / [data-theme] govern.
      root.style.removeProperty(varName);
    } else {
      root.style.setProperty(varName, s[key] as string);
    }
  });
}

// ---------------------------------------------------------------------------
// Theme — light / dark / system
// ---------------------------------------------------------------------------

/**
 * Resolve the effective colour scheme from the user's ThemeMode preference and
 * apply it as `data-theme` on <html>.
 *
 * "system" defers to the OS preference via prefers-color-scheme.  The resolved
 * value is always "light" or "dark" (never "system") so CSS selectors are simple.
 */
export function applyTheme(mode: ThemeMode): void {
  const resolved: "light" | "dark" =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * Subscribe to OS-level colour-scheme changes.
 *
 * When the current mode is "system" and the OS preference changes, applyTheme
 * is re-invoked so the UI updates without a page reload.
 *
 * Returns an unsubscribe function; call it in useEffect cleanup to avoid
 * stacking listeners across React StrictMode double-mounts.
 *
 * @param getMode - A getter that returns the *current* ThemeMode at call time
 *                  (a ref read, so no stale-closure problems).
 */
export function watchSystemTheme(getMode: () => ThemeMode): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = (): void => {
    if (getMode() === "system") {
      applyTheme("system");
    }
  };

  mq.addEventListener("change", handler);

  return () => {
    mq.removeEventListener("change", handler);
  };
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

/** Validate that a raw store value is a valid ThemeMode. */
function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

/**
 * Load persisted settings from disk.
 *
 * Missing keys fall back to DEFAULT_SETTINGS values, so a fresh install or a
 * partially migrated store is always safe.  `theme` is validated against the
 * ThemeMode union; an unrecognised value falls back to "system".
 */
export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const result: Settings = { ...DEFAULT_SETTINGS };
  const keys = Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>;
  await Promise.all(
    keys.map(async (k) => {
      const v = await store.get<string>(k);
      if (k === "theme") {
        if (isThemeMode(v)) result.theme = v;
      } else {
        if (typeof v === "string") (result as Record<keyof Settings, string>)[k] = v;
      }
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
