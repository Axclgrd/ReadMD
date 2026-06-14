import { describe, it, expect } from "vitest";
import { isMermaidInfo, renderMarkdown } from "./markdown";

// ---------------------------------------------------------------------------
// isMermaidInfo
// ---------------------------------------------------------------------------

describe("isMermaidInfo", () => {
  it('returns true for "mermaid"', () => {
    expect(isMermaidInfo("mermaid")).toBe(true);
  });

  it('returns true for " Mermaid " (case + leading/trailing space)', () => {
    expect(isMermaidInfo(" Mermaid ")).toBe(true);
  });

  it('returns true for "mermaid foo" (extra tokens after first)', () => {
    expect(isMermaidInfo("mermaid foo")).toBe(true);
  });

  it('returns false for "mermaidjs" (prefix match only)', () => {
    expect(isMermaidInfo("mermaidjs")).toBe(false);
  });

  it('returns false for "js"', () => {
    expect(isMermaidInfo("js")).toBe(false);
  });

  it('returns false for ""', () => {
    expect(isMermaidInfo("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helper: parse the href attribute out of the first <a> in an HTML string
// ---------------------------------------------------------------------------
function firstAnchorHref(html: string): string | null {
  const m = html.match(/<a\s[^>]*href="([^"]*)"[^>]*>/i);
  return m ? (m[1] ?? null) : null;
}

// ---------------------------------------------------------------------------
// renderMarkdown — sanitization
// ---------------------------------------------------------------------------

describe("renderMarkdown — sanitization", () => {
  it("strips <script> tags", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("removes javascript: from anchor href", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    // If markdown-it renders an <a>, its href must not contain javascript:.
    // If markdown-it produces no link (renders as text), there is no href to worry about.
    const href = firstAnchorHref(html);
    if (href !== null) {
      expect(href).not.toContain("javascript:");
    }
  });

  it("strips onerror from img tags", () => {
    const html = renderMarkdown("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("onerror");
  });
});

// ---------------------------------------------------------------------------
// renderMarkdown — content fidelity
// ---------------------------------------------------------------------------

describe("renderMarkdown — content fidelity", () => {
  it("renders a heading, bold, and an external link with correct attrs", () => {
    const source = "# Title\n\n**bold** and [link](https://example.com)";
    const html = renderMarkdown(source);

    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");

    // Verify the anchor tag contains the right href.
    const href = firstAnchorHref(html);
    expect(href).toBe("https://example.com");

    // External links must get these attrs via the DOMPurify hook.
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("renders a mermaid fenced block as <pre class=\"mermaid\"> (not hljs)", () => {
    const source = "```mermaid\nflowchart TD\nA-->B\n```";
    const html = renderMarkdown(source);

    expect(html).toContain('<pre class="mermaid">');
    // Must not be treated as a regular hljs block.
    expect(html).not.toContain('class="hljs"');
  });

  it("renders GFM task lists with checkbox inputs", () => {
    const source = "- [x] done\n- [ ] todo";
    const html = renderMarkdown(source);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  it("renders a fenced JS block with language-js class", () => {
    const source = "```js\nconst x = 1;\n```";
    const html = renderMarkdown(source);

    expect(html).toContain("language-js");
  });
});
