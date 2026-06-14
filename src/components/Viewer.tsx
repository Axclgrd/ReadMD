import { useEffect, useMemo, useRef } from "react";
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

  return (
    <article
      className="markdown-body"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
