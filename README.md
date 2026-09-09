# PDF ⇄ Markdown

A small client-only web app with two tools:

- **Convert PDF to Markdown** — turn a PDF into editable Markdown.
- **Read a Markdown file** — open a `.md` file and preview it rendered,
  the way it looks on GitHub.

Everything runs entirely in the browser. There is no backend, no database,
no authentication, and no external service involved: your files are never
uploaded anywhere.

## Stack

- React + TypeScript (strict) + Vite
- Plain CSS (no Tailwind, no component library)
- [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) to read and extract
  text from a PDF directly in the browser
- [marked](https://www.npmjs.com/package/marked) to parse Markdown, plus
  [DOMPurify](https://www.npmjs.com/package/dompurify) to sanitize the
  resulting HTML before it's ever displayed
- [github-markdown-css](https://www.npmjs.com/package/github-markdown-css) so
  the rendered preview matches GitHub's own styling (including dark mode)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

## Lint & tests

```bash
npm run lint
npm run test
```

## How it works

### Convert PDF to Markdown

1. You drop or pick a PDF (up to 50 MB).
2. The file is read and parsed locally with `pdfjs-dist` (`src/pdf/extractPdf.ts`),
   page by page — the raw bytes never leave your machine.
3. The extracted text, font sizes, styles and links are turned into Markdown
   by pure functions in `src/pdf/convertToMarkdown.ts`, using simple
   heuristics:
   - the most common font size is treated as body text; noticeably larger,
     short lines become headings (`#`–`####`)
   - bullet and numbered lines become Markdown lists
   - bold/italic/monospace runs are inferred from font name/family when
     possible
   - link annotations are matched to the text they cover and turned into
     `[text](url)`
   - each page is separated by an `<!-- Page N -->` comment
   - wrapped lines are rejoined into flowing paragraphs and hyphenated
     line-breaks are repaired
4. You get an editable Markdown preview you can copy or download as `.md`.

### Read a Markdown file

1. You drop or pick a `.md`/`.markdown`/`.mdx` file (up to 10 MB).
2. Its text is read locally (`src/markdown/readMarkdownFile.ts`) and parsed
   to HTML with `marked`, then sanitized with DOMPurify
   (`src/markdown/renderMarkdown.ts`) — raw `<script>` tags, event handler
   attributes, and dangerous link/image protocols (like `javascript:`) are
   stripped before anything reaches the DOM.
3. The result is displayed using GitHub's own Markdown stylesheet, so
   headings, bold text, lists, code blocks and blockquotes look the way they
   do on github.com.

## Privacy

Everything happens client-side: any PDF or Markdown file you open, and
everything derived from it, stays in your browser's memory for the current
tab. Nothing is written to `localStorage` or `IndexedDB`, and nothing is ever
sent to a server.

## Known limitations

- **No OCR.** If a PDF has no selectable text (e.g. a scanned page rendered
  as an image), the app shows: *"This PDF appears to be scanned and requires
  OCR, which is not supported yet."* Mixed documents (some pages with text,
  some without) still convert, with a warning listed per page that has no
  extractable text.
- **Password-protected PDFs are not supported** — there is no password
  prompt in this version.
- **Heading, list, bold/italic and link detection are heuristic.** They rely
  on font size, font name and annotation positions reported by the PDF, so
  results vary depending on how the source PDF was produced. Nothing is
  invented when the structure can't be inferred confidently.
- **Complex tables are not reconstructed.** Their text is preserved as
  readable lines, not as Markdown table syntax.
- **Reading order** follows the order pdf.js reports text in, which for
  multi-column or heavily designed layouts may not match the visual reading
  order.
- **The Markdown reader is read-only preview**, not an editor — use the
  Convert tool if you need an editable Markdown textarea.
