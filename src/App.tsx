/**
 * ReadMD — root component.
 *
 * Phase 1 renders only a clean empty state. Markdown rendering, file opening,
 * the settings panel, theming and file watching are layered in by later phases.
 * The structure (app shell + main content area) is intentionally minimal so
 * those features slot in without a rewrite.
 */
function App() {
  return (
    <div className="app">
      <main className="content">
        <div className="empty-state">
          <h1 className="empty-state__title">ReadMD</h1>
          <p className="empty-state__subtitle">
            Lecteur Markdown léger — lecture seule
          </p>
          <p className="empty-state__hint">
            Ouvrez un fichier <code>.md</code> pour commencer.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
