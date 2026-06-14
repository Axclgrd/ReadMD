/**
 * Toolbar — slim top bar present at all times.
 *
 * Left side: the app name "ReadMD" and, when a document is open, the file name.
 * Right side: the settings (gear) button and the "Ouvrir" file dialog button.
 */

interface ToolbarProps {
  /** Name of the currently open file, or undefined when no file is loaded. */
  fileName?: string;
  /** Called when the user clicks the open-file button. */
  onOpen: () => void;
  /** Called when the user clicks the settings gear button. */
  onToggleSettings: () => void;
}

export default function Toolbar({ fileName, onOpen, onToggleSettings }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__app-name">ReadMD</span>
        {fileName !== undefined && (
          <span className="toolbar__file-name">{fileName}</span>
        )}
      </div>
      <div className="toolbar__actions">
        <button
          className="toolbar__settings-btn"
          type="button"
          onClick={onToggleSettings}
          aria-label="Ouvrir les réglages"
          title="Réglages"
        >
          ⚙
        </button>
        <button className="toolbar__open-btn" type="button" onClick={onOpen}>
          Ouvrir
        </button>
      </div>
    </header>
  );
}
