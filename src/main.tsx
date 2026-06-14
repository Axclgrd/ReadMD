import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/app-shell.css";
import "./styles/markdown.css";
import "./styles/settings.css";
import "highlight.js/styles/github.css";
import { applySettings, loadSettings } from "./lib/settings";

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
    applySettings(await loadSettings());
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
