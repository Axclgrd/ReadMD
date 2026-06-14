import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/app-shell.css";
import "./styles/markdown.css";
import "./styles/settings.css";
import "highlight.js/styles/github.css";
import { applySettings, applyTheme, loadSettings } from "./lib/settings";

/**
 * Bootstrap the application.
 *
 * Persisted CSS-variable settings are applied to :root BEFORE the first React
 * render to avoid a flash of the theme.css defaults.  If the store cannot be
 * read for any reason (first launch, corrupted file, Tauri not yet ready) the
 * error is silently swallowed and the theme.css defaults remain in effect.
 */
async function bootstrap(): Promise<void> {
  try {
    const settings = await loadSettings();
    applySettings(settings);
    // Apply the colour scheme before the first render so there is no flash of
    // the default light theme when the user has chosen dark or system-dark.
    applyTheme(settings.theme);
  } catch {
    // Keep theme.css defaults — no action needed.
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
