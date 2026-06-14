/**
 * ReadMD — root component.
 *
 * Phase 3 wires the four file-opening entry points (launch file, macOS
 * "open-file" event, drag-and-drop, and the "Ouvrir" file dialog) to the
 * Markdown rendering pipeline.  Later phases will add sidebar, settings, real
 * Mermaid rendering, and dark-mode theming.
 *
 * Phase 5 adds the settings panel with live-preview color, font, size, and
 * reading-width controls backed by on-disk persistence.
 *
 * Phase 6 adds:
 *   - Light / dark / system theme switching via applyTheme / watchSystemTheme.
 *   - External links opened in the system browser via plugin-opener.
 *   - Hot reload when the watched file changes on disk (watch_file + file-changed).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";

import Viewer from "./components/Viewer";
import Toolbar from "./components/Toolbar";
import EmptyState from "./components/EmptyState";
import SettingsPanel from "./components/SettingsPanel";
import { firstMarkdownPath } from "./lib/files";
import {
  DEFAULT_SETTINGS,
  applySettings,
  applyTheme,
  loadSettings,
  saveSettings,
  watchSystemTheme,
} from "./lib/settings";
import type { Settings } from "./lib/settings";
import type { MarkdownFile } from "./lib/types";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [doc, setDoc] = useState<MarkdownFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Phase 5 — settings state.
  // Initialised from DEFAULT_SETTINGS synchronously; a mount effect syncs the
  // React state with what was already applied to the DOM (via main.tsx) so the
  // panel shows the correct persisted values.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Phase 6 — refs for hot-reload and system-theme watcher.
  // currentPathRef mirrors the currently-open document path so the
  // file-changed event handler can compare without a stale closure.
  const currentPathRef = useRef<string | null>(null);
  // themeRef mirrors settings.theme so watchSystemTheme's getMode() callback
  // always reads the latest mode without the effect needing settings in its
  // dependency array.  Updated in updateSettings/resetSettings and the
  // settings-load effect — never read during render.
  const themeRef = useRef(DEFAULT_SETTINGS.theme);

  /**
   * Load a file by path via the Rust backend.
   *
   * On success the document state is updated; the error state is cleared;
   * and a file-system watch is started on the path for hot-reload (phase 6).
   * On failure the error is surfaced; the previous document is intentionally
   * kept so the reading area remains visible behind the error banner.
   *
   * Wrapped in useCallback so the effect dependency array ([openPath]) is
   * honest and stable — setDoc/setError are stable dispatch functions.
   */
  const openPath = useCallback(async (path: string) => {
    try {
      const file = await invoke<MarkdownFile>("read_markdown", { path });
      setDoc(file);
      setError(null);
      // Track the current path for the file-changed event handler.
      currentPathRef.current = path;
      // Start watching the file for changes (best-effort — never blocks the UI).
      void invoke("watch_file", { path }).catch(() => {
        // Watching is best-effort; a failure here must not surface to the user.
      });
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // Open the native file-picker dialog and load the selected file.
  const handleOpen = useCallback(async () => {
    const sel = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });
    if (typeof sel === "string") {
      await openPath(sel);
    }
  }, [openPath]);

  // ---------------------------------------------------------------------------
  // Mount effect — subscribe to runtime events and handle the launch file.
  //
  // StrictMode in dev runs effects twice (mount → unmount → remount).  We
  // guard against listener stacking and double-open by:
  //   1. Holding the subscription Promises synchronously so cleanup can
  //      await-then-unsubscribe even if the Promise hasn't resolved yet.
  //   2. Using a `cancelled` flag to drop the `get_launch_file` invoke result
  //      if the effect was torn down before it resolved.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    // 1. Subscribe to the "open-file" event FIRST (macOS "Open With").
    const openFileSub = listen<string>("open-file", (ev) => {
      if (!cancelled) {
        void openPath(ev.payload);
      }
    });

    // 2. Subscribe to drag-and-drop.
    const dragSub = getCurrentWebview().onDragDropEvent((ev) => {
      if (cancelled) return;

      switch (ev.payload.type) {
        case "enter":
          setDragging(true);
          break;
        case "over":
          // No paths on "over" — just ensure the overlay stays visible.
          setDragging(true);
          break;
        case "drop": {
          setDragging(false);
          const mdPath = firstMarkdownPath(ev.payload.paths);
          if (mdPath !== undefined) {
            void openPath(mdPath);
          } else {
            setError(
              "Aucun fichier Markdown valide (.md / .markdown) dans le dépôt.",
            );
          }
          break;
        }
        case "leave":
          setDragging(false);
          break;
      }
    });

    // 3. Check if the app was launched with a file argument.
    void (async () => {
      const launchPath = await invoke<string | null>("get_launch_file");
      if (!cancelled && launchPath !== null) {
        await openPath(launchPath);
      }
    })();

    // 4. Hot reload — re-read the document when the watched file changes on disk.
    //
    // The payload is the changed file's path.  We guard with currentPathRef so
    // a stale event for a previously-watched file doesn't reload the wrong doc.
    // (The Rust backend only watches one file at a time, so this is mostly
    // belt-and-suspenders against path-canonicalization differences.)
    const fileChangedSub = listen<string>("file-changed", (ev) => {
      if (!cancelled && currentPathRef.current === ev.payload) {
        void openPath(ev.payload);
      }
    });

    // Cleanup: cancel pending side-effects and remove all listeners.
    return () => {
      cancelled = true;
      openFileSub.then((un) => un());
      dragSub.then((un) => un());
      fileChangedSub.then((un) => un());
    };
  }, [openPath]); // openPath is useCallback-stable (deps [])

  // ---------------------------------------------------------------------------
  // Mount effect — sync React settings state with the persisted values.
  //
  // main.tsx already applied the persisted CSS variables before the first
  // render so there is no visual flash.  This effect loads the same values
  // into React state so the settings panel controls show the correct values.
  //
  // Kept in a separate effect to avoid entangling with the file-opening effect
  // above.  The `cancelled` flag guards against StrictMode double-invocation.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const persisted = await loadSettings();
        if (!cancelled) {
          setSettings(persisted);
          // Keep themeRef in sync so the system-theme watcher uses the loaded mode.
          themeRef.current = persisted.theme;
        }
      } catch {
        // On error, keep DEFAULT_SETTINGS already in state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // run once on mount

  // ---------------------------------------------------------------------------
  // Mount effect — watch the OS colour-scheme preference (phase 6).
  //
  // When the user has chosen "system" mode and the OS switches between light
  // and dark, applyTheme() is called automatically.  themeRef always reflects
  // the current settings.theme without this effect needing it as a dep.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = watchSystemTheme(() => themeRef.current);
    return unsubscribe;
  }, []); // mount-only — themeRef is a stable ref, not a reactive dep

  // ---------------------------------------------------------------------------
  // Settings handlers
  // ---------------------------------------------------------------------------

  /**
   * Apply, persist, and update state for a new settings object.
   * Triggers live preview immediately via CSS variable mutation on :root and
   * updates the colour-scheme attribute for theme changes (phase 6).
   */
  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    applySettings(next);
    applyTheme(next.theme);
    // Keep themeRef in sync so the system-theme watcher reads the latest mode.
    themeRef.current = next.theme;
    void saveSettings(next);
  }, []);

  /**
   * Reset all settings to factory defaults, persisting and previewing the
   * result so the UI is consistent with the on-disk state.
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    // Keep themeRef in sync with the reset mode.
    themeRef.current = DEFAULT_SETTINGS.theme;
    void saveSettings(DEFAULT_SETTINGS);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app">
      <Toolbar
        fileName={doc?.name}
        onOpen={() => void handleOpen()}
        onToggleSettings={() => setSettingsOpen((prev) => !prev)}
      />
      <main className="content">
        {error !== null && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {doc !== null ? (
          <div className="reading-container">
            <Viewer source={doc.content} />
          </div>
        ) : (
          <EmptyState onOpen={() => void handleOpen()} />
        )}
      </main>
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          Déposez un fichier .md
        </div>
      )}
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onReset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
