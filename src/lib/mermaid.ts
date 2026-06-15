/**
 * Lazy Mermaid diagram renderer — Phase 4.
 *
 * Finds every `<pre class="mermaid">` placeholder that has not yet been
 * processed and replaces it with a rendered SVG wrapper (or an error box on
 * parse/render failure). Mermaid itself is imported dynamically so documents
 * without diagrams pay zero bundle cost.
 */

import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// Module-scoped singletons
// ---------------------------------------------------------------------------

/**
 * Cached dynamic-import promise. Resolving it twice is safe because Vite
 * de-duplicates the module, but caching the promise guarantees we never
 * kick off a second network request even during the initial load race.
 */
let mermaidImportPromise: Promise<typeof import("mermaid").default> | null =
  null;

/** Set to true once `mermaid.initialize()` has been called. */
let mermaidInitialized = false;

/**
 * Monotonically increasing counter used to produce unique `id` attributes
 * for each `mermaid.render()` call. Mermaid creates a temporary DOM node
 * with the given id, so each call needs a distinct value.
 */
let renderCounter = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders all unprocessed `<pre class="mermaid">` elements found inside
 * `container`. Each block is rendered independently: a syntax error in one
 * diagram shows an error box without affecting the others.
 *
 * @param container   - The DOM subtree to search (typically the <article>).
 * @param isCancelled - Returns `true` when the caller no longer cares about
 *                      this render pass (e.g. the document changed or the
 *                      component unmounted). Checked before every block and
 *                      after every async operation.
 */
export async function renderMermaidIn(
  container: HTMLElement,
  isCancelled: () => boolean,
): Promise<void> {
  // Early-exit *before* importing Mermaid — this is the laziness guarantee.
  // Documents without mermaid fences never trigger the dynamic import.
  if (container.querySelector("pre.mermaid:not([data-processed])") === null) {
    return;
  }

  // Lazily import Mermaid at most once across the lifetime of the page.
  if (mermaidImportPromise === null) {
    mermaidImportPromise = import("mermaid").then((m) => m.default);
  }
  const mermaid = await mermaidImportPromise;

  if (isCancelled()) return;

  // Initialize Mermaid once. Phase 6 will revisit `theme` for dark-mode support.
  // TODO phase 6: pass theme token from user settings instead of hard-coding "default".
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
      // Use SVG <text> labels, not HTML <foreignObject> labels. Our SVG-profile
      // DOMPurify pass strips foreignObject, which would leave node shapes empty.
      // SVG text labels render correctly and stay safe to sanitize.
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    });
    mermaidInitialized = true;
  }

  // Collect placeholders into a static array so that `replaceWith()` calls
  // during iteration do not invalidate the NodeList.
  const placeholders = Array.from(
    container.querySelectorAll<HTMLElement>("pre.mermaid:not([data-processed])"),
  );

  for (const el of placeholders) {
    // Re-check cancellation before each block so a quick document switch
    // abandons mid-batch without rendering stale diagrams.
    if (isCancelled()) return;

    const source = el.textContent ?? "";
    const id = `readmd-mermaid-${++renderCounter}`;

    try {
      const { svg } = await mermaid.render(id, source);

      // Guard against the render completing after a document change.
      if (isCancelled()) return;

      // Defense-in-depth: sanitize the SVG output even though Mermaid's
      // `securityLevel: "strict"` already avoids foreignObject/htmlLabels.
      // SVG profile covers <style>, <marker>, <defs>, and filter primitives —
      // diagram visuals should survive intact. If arrows or styling disappear,
      // check that `svgFilters: true` is still present here.
      const safe = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });

      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-rendered";
      wrapper.innerHTML = safe;
      el.replaceWith(wrapper);
    } catch (err) {
      // A single bad diagram must not crash the rest of the render pass.
      if (isCancelled()) return;

      const box = document.createElement("div");
      box.className = "mermaid-error";
      // textContent, never innerHTML — error messages must not inject HTML.
      box.textContent =
        "Erreur de syntaxe Mermaid : " +
        (err instanceof Error ? err.message : String(err));
      el.replaceWith(box);
      // mermaid.render() can leave an orphan measurement node (id="d<id>") on
      // document.body when it throws; remove it so failures don't accrete DOM.
      document.getElementById("d" + id)?.remove();
    }
  }
}
