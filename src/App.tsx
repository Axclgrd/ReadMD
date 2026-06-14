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
 */
import { useCallback, useEffect, useState } from "react";
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
  loadSettings,
  saveSettings,
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

  /**
   * Load a file by path via the Rust backend.
   *
   * On success the document state is updated; the error state is cleared.
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

    // Cleanup: cancel pending side-effects and remove all listeners.
    return () => {
      cancelled = true;
      openFileSub.then((un) => un());
      dragSub.then((un) => un());
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
  // Settings handlers
  // ---------------------------------------------------------------------------

  /**
   * Apply, persist, and update state for a new settings object.
   * Triggers live preview immediately via CSS variable mutation on :root.
   */
  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    applySettings(next);
    void saveSettings(next);
  }, []);

  /**
   * Reset all settings to factory defaults, persisting and previewing the
   * result so the UI is consistent with the on-disk state.
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
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
