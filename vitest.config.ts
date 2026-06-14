import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom gives DOMPurify a real DOM to sanitize against in unit tests.
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
