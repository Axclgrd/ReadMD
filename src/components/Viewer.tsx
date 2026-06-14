import { useMemo } from "react";
import { renderMarkdown } from "../lib/markdown";

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

  return (
    <article
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
