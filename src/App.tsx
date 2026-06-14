/**
 * ReadMD — root component.
 *
 * Phase 2 wires the Markdown rendering pipeline to the demo file. Later phases
 * will replace `demoSource` with the content of a user-opened file (phase 3)
 * and add a sidebar, settings panel and real Mermaid rendering.
 */
import demoSource from "../markdown-de-test.md?raw";
import Viewer from "./components/Viewer";

function App() {
  return (
    <div className="app">
      <main className="content">
        <div className="reading-container">
          <Viewer source={demoSource} />
        </div>
      </main>
    </div>
  );
}

export default App;
