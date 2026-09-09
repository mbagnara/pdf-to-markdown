# PDF to Markdown

A small client-only web app that converts a PDF file to Markdown entirely in
the browser. There is no backend, no database, no authentication, and no
external service involved: the PDF you select is never uploaded anywhere.

## Stack

- React + TypeScript (strict) + Vite
- Plain CSS (no Tailwind, no component library)
- [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) to read and extract
  text from the PDF directly in the browser

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

## Privacy

Everything happens client-side: the PDF, the extracted text, and the
generated Markdown all stay in your browser's memory for the current tab.
Nothing is written to `localStorage` or `IndexedDB`, and nothing is ever sent
to a server.

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
