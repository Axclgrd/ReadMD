/**
 * Pure file-system helpers — no Tauri imports, safe to test under jsdom.
 */

/**
 * Returns the first path in `paths` whose extension is `.md` or `.markdown`
 * (case-insensitive), or `undefined` if none qualify.
 *
 * The regex anchors at end-of-string so a name like "notes.md.txt" does NOT
 * match.
 */
export function firstMarkdownPath(paths: string[]): string | undefined {
  return paths.find((p) => /\.(md|markdown)$/i.test(p));
}
