/**
 * Markdown rendering pipeline.
 *
 * Builds the MarkdownIt instance once (module-level singleton) and exposes
 * `renderMarkdown` for the rest of the app. DOMPurify is the last gate before
 * any HTML touches the DOM, so `html: true` in MarkdownIt is safe here.
 */

import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import taskLists from "markdown-it-task-lists";
// `lib/common` ships ~40 common languages instead of all ~190, keeping the
// bundle small. Unknown languages fall through to escaped plain text below.
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a fenced code block's info string identifies a Mermaid
 * diagram. Compares only the first whitespace-separated token, case-insensitively.
 *
 * Examples:
 *   "mermaid"      → true
 *   " Mermaid "    → true
 *   "mermaid foo"  → true
 *   "mermaidjs"    → false
 *   "js"           → false
 *   ""             → false
 */
export function isMermaidInfo(info: string): boolean {
  const first = info.trim().split(/\s+/)[0] ?? "";
  return first.toLowerCase() === "mermaid";
}

/**
 * GitHub-ish heading slugifier: lowercase, trim, strip non-word/non-space/
 * non-hyphen characters, then collapse runs of spaces to a single hyphen.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// MarkdownIt singleton
// ---------------------------------------------------------------------------

/**
 * Syntax highlighter called by MarkdownIt for fenced code blocks.
 * Returns a complete <pre> string so MarkdownIt wraps nothing extra.
 */
function highlight(str: string, lang: string): string {
  if (isMermaidInfo(lang)) {
    // Phase 4 will locate these <pre class="mermaid"> nodes and render them.
    // We escape the raw source so it is safe to display as text until then.
    return `<pre class="mermaid">${md.utils.escapeHtml(str)}</pre>`;
  }

  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(str, {
      language: lang,
      ignoreIllegals: true,
    }).value;
    return `<pre class="hljs"><code class="language-${md.utils.escapeHtml(
      lang,
    )}">${highlighted}</code></pre>`;
  }

  return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
}

const md = new MarkdownIt({
  html: true,       // raw HTML in .md is allowed; DOMPurify sanitizes afterwards
  linkify: true,
  typographer: true,
  highlight,
});

md.use(anchor, { slugify });
md.use(taskLists, { label: true });

// ---------------------------------------------------------------------------
// DOMPurify hook (registered once at module load)
// ---------------------------------------------------------------------------

// For any external link, set target and rel so phase 6 can intercept the click
// and open it in the system browser. We test the raw attribute, not node.href,
// because node.href resolves relative URLs against the page origin.
// removeHook first so Vite HMR re-running this module doesn't stack duplicates.
DOMPurify.removeHook("afterSanitizeAttributes");
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.nodeName !== "A") return;

  const href = node.getAttribute("href") ?? "";
  if (href.startsWith("http://") || href.startsWith("https://")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders a Markdown source string to sanitized HTML.
 *
 * The result is safe to inject into the DOM via dangerouslySetInnerHTML —
 * DOMPurify strips scripts, event handlers, and javascript: URLs; ADD_ATTR
 * allows the `target` attribute set by the hook above.
 */
export function renderMarkdown(source: string): string {
  const rawHtml = md.render(source);
  return DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target"] });
}
