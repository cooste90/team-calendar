// Adds DOM matchers such as toBeInTheDocument() to expect().
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy… and waitFor give up after 1 second by default. Under the full suite's load a
// save can take longer than that, which made the event form's "Replace it" test flaky.
configure({ asyncUtilTimeout: 3000 });

// Remove what each test rendered, so the next test starts with an empty page.
afterEach(() => {
  cleanup();
});
