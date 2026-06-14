/**
 * EmptyState — shown in the content area when no document is open.
 *
 * Reuses the `.empty-state*` classes already defined in global.css so no
 * additional styles are needed here.
 */

interface EmptyStateProps {
  /** Called when the user activates the "Ouvrir" action from this screen. */
  onOpen: () => void;
}

export default function EmptyState({ onOpen }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h1 className="empty-state__title">ReadMD</h1>
      <p className="empty-state__subtitle">
        Lecteur Markdown léger — lecture seule
      </p>
      <p className="empty-state__hint">
        Cliquez sur{" "}
        <button
          type="button"
          className="empty-state__inline-btn"
          onClick={onOpen}
        >
          Ouvrir
        </button>{" "}
        ou{" "}
        <strong>glissez un fichier <code>.md</code></strong> dans cette fenêtre.
      </p>
    </div>
  );
}
