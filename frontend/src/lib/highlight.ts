import { codeToHtml } from "shiki";

// Runs on the server only. We pre-render every snippet at page render time and
// pass plain HTML strings into client components, so shiki's grammars and
// themes never reach the browser bundle.
export async function highlight(code: string, lang = "typescript") {
  return codeToHtml(code, { lang, theme: "github-light" });
}
