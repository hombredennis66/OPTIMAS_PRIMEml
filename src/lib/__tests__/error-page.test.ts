import { describe, it, expect } from "vitest";
import { renderErrorPage } from "../error-page";

describe("renderErrorPage", () => {
  it("should return a valid HTML string", () => {
    const html = renderErrorPage();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("should contain an error message", () => {
    const html = renderErrorPage();
    expect(html).toContain("didn't load");
  });

  it("should contain a retry button and home link", () => {
    const html = renderErrorPage();
    expect(html).toContain("Try again");
    expect(html).toContain("Go home");
    expect(html).toContain('href="/"');
  });

  it("should set content-type appropriate meta tags", () => {
    const html = renderErrorPage();
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain("viewport");
  });
});
