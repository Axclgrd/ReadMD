/**
 * Shared domain types for ReadMD.
 *
 * Kept in a separate file so the backend contract is visible in one place;
 * both hooks and components import from here rather than re-declaring inline.
 */

/** A successfully loaded Markdown document, as returned by `read_markdown`. */
export interface MarkdownFile {
  path: string;
  name: string;
  content: string;
}
