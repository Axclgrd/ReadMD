/**
 * SettingsPanel — slide-over panel for appearance customisation (phase 5).
 *
 * Rendered as a fixed right-side drawer; shown/hidden via CSS transform driven
 * by the `open` prop.  Every control is fully controlled: changes are forwarded
 * to the parent (App) through `onChange` which applies them to the DOM
 * immediately for a live preview and persists them to disk.
 *
 * All labels are in French, matching the existing app UI conventions.
 */
import { FONT_BODY_SYSTEM, FONT_MONO_SYSTEM } from "../lib/settings";
import type { Settings } from "../lib/settings";

// ---------------------------------------------------------------------------
// Font option lists — value must match the constant used in DEFAULT_SETTINGS
// so the controlled <select> highlights the correct option.
// ---------------------------------------------------------------------------

interface FontOption {
  label: string;
  value: string;
}

const BODY_FONT_OPTIONS: FontOption[] = [
  { label: "Système (défaut)", value: FONT_BODY_SYSTEM },
  { label: "Sans-serif", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

const MONO_FONT_OPTIONS: FontOption[] = [
  { label: "Mono système (défaut)", value: FONT_MONO_SYSTEM },
  { label: "Courier", value: '"Courier New", Courier, monospace' },
  { label: "Menlo", value: "Menlo, Monaco, monospace" },
];

// ---------------------------------------------------------------------------
// Helper — parse "Npx" → number (fallback to supplied default).
// ---------------------------------------------------------------------------

function parsePx(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onChange: (next: Settings) => void;
  onReset: () => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onReset,
  onClose,
}: SettingsPanelProps) {
  // Convenience: produce a partial update merged with current settings.
  function patch(partial: Partial<Settings>): void {
    onChange({ ...settings, ...partial });
  }

  return (
    <aside
      className={`settings-panel${open ? " settings-panel--open" : ""}`}
      aria-label="Panneau de réglages"
      aria-hidden={!open}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="settings-panel__header">
        <h2 className="settings-panel__title">Réglages</h2>
        <button
          className="settings-panel__close-btn"
          type="button"
          onClick={onClose}
          aria-label="Fermer le panneau de réglages"
        >
          ×
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Controls                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="settings-panel__body">

        {/* -------- Section: Couleurs -------- */}
        <section className="settings-section">
          <h3 className="settings-section__title">Couleurs</h3>

          {/* H1 color */}
          <div className="settings-row">
            <label className="settings-row__label" htmlFor="sp-heading-color">
              Titre principal (H1)
            </label>
            <div className="settings-row__control settings-row__control--color">
              <input
                id="sp-heading-color"
                type="color"
                value={settings.headingColor}
                onChange={(e) => patch({ headingColor: e.target.value })}
              />
              <span className="settings-row__hex">{settings.headingColor}</span>
            </div>
          </div>

          {/* Subtitle (H2–H6) color */}
          <div className="settings-row">
            <label className="settings-row__label" htmlFor="sp-subheading-color">
              Sous-titres (H2–H6)
            </label>
            <div className="settings-row__control settings-row__control--color">
              <input
                id="sp-subheading-color"
                type="color"
                value={settings.subheadingColor}
                onChange={(e) => patch({ subheadingColor: e.target.value })}
              />
              <span className="settings-row__hex">{settings.subheadingColor}</span>
            </div>
          </div>

          {/* Text color */}
          <div className="settings-row">
            <label className="settings-row__label" htmlFor="sp-text-color">
              Texte courant
            </label>
            <div className="settings-row__control settings-row__control--color">
              <input
                id="sp-text-color"
                type="color"
                value={settings.textColor}
                onChange={(e) => patch({ textColor: e.target.value })}
              />
              <span className="settings-row__hex">{settings.textColor}</span>
            </div>
          </div>

          {/* Link color */}
          <div className="settings-row">
            <label className="settings-row__label" htmlFor="sp-link-color">
              Liens
            </label>
            <div className="settings-row__control settings-row__control--color">
              <input
                id="sp-link-color"
                type="color"
                value={settings.linkColor}
                onChange={(e) => patch({ linkColor: e.target.value })}
              />
              <span className="settings-row__hex">{settings.linkColor}</span>
            </div>
          </div>
        </section>

        {/* -------- Section: Polices -------- */}
        <section className="settings-section">
          <h3 className="settings-section__title">Polices</h3>

          {/* Body font */}
          <div className="settings-row settings-row--column">
            <label className="settings-row__label" htmlFor="sp-font-body">
              Police du texte
            </label>
            <select
              id="sp-font-body"
              className="settings-row__select"
              value={settings.fontBody}
              onChange={(e) => patch({ fontBody: e.target.value })}
            >
              {BODY_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mono font */}
          <div className="settings-row settings-row--column">
            <label className="settings-row__label" htmlFor="sp-font-mono">
              Police de code
            </label>
            <select
              id="sp-font-mono"
              className="settings-row__select"
              value={settings.fontMono}
              onChange={(e) => patch({ fontMono: e.target.value })}
            >
              {MONO_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* -------- Section: Taille et mise en page -------- */}
        <section className="settings-section">
          <h3 className="settings-section__title">Taille et mise en page</h3>

          {/* Font size */}
          <div className="settings-row settings-row--column">
            <div className="settings-row__label-row">
              <label className="settings-row__label" htmlFor="sp-font-size">
                Taille de police
              </label>
              <span className="settings-row__value">
                {parsePx(settings.fontSize, 16)} px
              </span>
            </div>
            <input
              id="sp-font-size"
              type="range"
              min={12}
              max={24}
              step={1}
              value={parsePx(settings.fontSize, 16)}
              onChange={(e) =>
                patch({ fontSize: `${e.target.value}px` })
              }
              className="settings-row__range"
            />
          </div>

          {/* Reading width */}
          <div className="settings-row settings-row--column">
            <div className="settings-row__label-row">
              <label className="settings-row__label" htmlFor="sp-reading-width">
                Largeur de lecture
              </label>
              <span className="settings-row__value">
                {parsePx(settings.readingWidth, 760)} px
              </span>
            </div>
            <input
              id="sp-reading-width"
              type="range"
              min={560}
              max={1100}
              step={10}
              value={parsePx(settings.readingWidth, 760)}
              onChange={(e) =>
                patch({ readingWidth: `${e.target.value}px` })
              }
              className="settings-row__range"
            />
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="settings-panel__footer">
        <button
          className="settings-panel__reset-btn"
          type="button"
          onClick={onReset}
        >
          Réinitialiser les défauts
        </button>
      </div>
    </aside>
  );
}
