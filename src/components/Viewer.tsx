import { useCallback, useEffect, useMemo, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown } from "../lib/markdown";
import { renderMermaidIn } from "../lib/mermaid";
import "../styles/mermaid.css";

interface ViewerProps {
  source: string;
}

/**
 * Renders a Markdown string into an <article> suitable for reading.
 *
 * `dangerouslySetInnerHTML` is used exactly once here. The HTML is safe
 * because it has already passed through DOMPurify inside renderMarkdown().
 *
 * Phase 6: external links (http/https) are intercepted and opened in the
 * system browser via @tauri-apps/plugin-opener so the Tauri webview never
 * navigates away.  In-page anchor links (#…) retain their default behaviour.
 *
 * Phase 6 note: Mermaid diagrams keep their light-theme SVG after a theme
 * switch (re-theming existing SVGs is out of scope for this phase).
 * TODO: re-render mermaid diagrams on theme change in a future phase.
 */
export default function Viewer({ source }: ViewerProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);

  // Ref gives us direct DOM access to the rendered article for Mermaid post-processing.
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Capture ref.current once — narrows HTMLElement | null → HTMLElement and
    // avoids reading a ref that could change during the async render.
    const container = ref.current;
    if (container === null) return;

    let cancelled = false;

    // Fire-and-forget: individual diagram errors are handled inside
    // renderMermaidIn, so an unhandled rejection here means an unexpected
    // infrastructure failure — surface it to the console, not the UI.
    renderMermaidIn(container, () => cancelled).catch((err: unknown) => {
      console.error("[ReadMD] Mermaid render pass failed:", err);
    });

    return () => {
      // Signal any in-flight render to abandon its remaining blocks.
      cancelled = true;
    };
  }, [html]); // Re-run whenever the document changes (new source → new html).

  /**
   * Intercept clicks on rendered anchors (phase 6).
   *
   * We use `getAttribute("href")` — NOT the `.href` DOM property — because the
   * property resolves relative / fragment URLs against the app origin, turning
   * `#section` into `http://localhost:1420/#section` which would incorrectly
   * match the http-check.  The authored attribute value is unambiguous.
   *
   * DOMPurify already sanitised the HTML, so the href values are safe.
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (anchor === null) return;

    const href = anchor.getAttribute("href") ?? "";

    // Only intercept absolute http/https URLs; let #fragment links pass through.
    if (/^https?:\/\//i.test(href)) {
      e.preventDefault();
      void openUrl(href);
    }
  }, []);

  return (
    <article
      className="markdown-body"
      ref={ref}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
