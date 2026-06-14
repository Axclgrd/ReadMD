import { describe, it, expect } from "vitest";
import { firstMarkdownPath } from "./files";

describe("firstMarkdownPath", () => {
  it("returns the first .md path", () => {
    expect(firstMarkdownPath(["/home/user/notes.md", "/home/user/other.txt"])).toBe(
      "/home/user/notes.md",
    );
  });

  it("returns the first .markdown path", () => {
    expect(firstMarkdownPath(["/docs/guide.markdown"])).toBe("/docs/guide.markdown");
  });

  it("matches .MD in upper-case (case-insensitive)", () => {
    expect(firstMarkdownPath(["/docs/README.MD"])).toBe("/docs/README.MD");
  });

  it("matches .Markdown in mixed-case (case-insensitive)", () => {
    expect(firstMarkdownPath(["/docs/guide.Markdown"])).toBe("/docs/guide.Markdown");
  });

  it("returns undefined when no markdown file is present", () => {
    expect(firstMarkdownPath(["/home/user/image.png", "/tmp/data.json"])).toBeUndefined();
  });

  it("returns undefined for an empty array", () => {
    expect(firstMarkdownPath([])).toBeUndefined();
  });

  it("ignores a path whose name contains .md but extension is not .md", () => {
    // "notes.md.txt" ends with .txt, must NOT match
    expect(firstMarkdownPath(["/home/user/notes.md.txt"])).toBeUndefined();
  });

  it("picks the first markdown path when multiple are present", () => {
    expect(
      firstMarkdownPath([
        "/tmp/a.txt",
        "/tmp/first.md",
        "/tmp/second.markdown",
      ]),
    ).toBe("/tmp/first.md");
  });
});
