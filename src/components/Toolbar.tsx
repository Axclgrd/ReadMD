/**
 * Toolbar — slim top bar present at all times.
 *
 * Left side: the app name "ReadMD" and, when a document is open, the file name.
 * Right side: the "Ouvrir" button that triggers the native file dialog.
 */

interface ToolbarProps {
  /** Name of the currently open file, or undefined when no file is loaded. */
  fileName?: string;
  /** Called when the user clicks the open-file button. */
  onOpen: () => void;
}

export default function Toolbar({ fileName, onOpen }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__app-name">ReadMD</span>
        {fileName !== undefined && (
          <span className="toolbar__file-name">{fileName}</span>
        )}
      </div>
      <button className="toolbar__open-btn" type="button" onClick={onOpen}>
        Ouvrir
      </button>
    </header>
  );
}
