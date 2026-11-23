// Geist for the PDFs, from public/fonts (the same font as the app; SIL Open Font
// License, see LICENSE-Geist.txt there). Registered once, when this file is first imported.
import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const folder = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Geist",
  fonts: [
    { src: path.join(folder, "Geist-Regular.ttf"), fontWeight: 400 },
    { src: path.join(folder, "Geist-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(folder, "Geist-Bold.ttf"), fontWeight: 700 },
  ],
});

// Names are never broken across lines with a hyphen.
Font.registerHyphenationCallback((word) => [word]);
