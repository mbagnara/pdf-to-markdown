import {
  getDocument,
  GlobalWorkerOptions,
  InvalidPDFException,
  PasswordException,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import rawWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type {
  TextItem,
  TextMarkedContent,
  TextStyle as PdfTextStyle,
} from 'pdfjs-dist/types/src/display/api'
import { MAX_FILE_SIZE_MB } from './constants'
import {
  CorruptPdfError,
  EmptyPdfError,
  NotAPdfError,
  PasswordProtectedError,
  PdfTooLargeError,
  ScannedPdfError,
  type ExtractedDocument,
  type ExtractedLine,
  type ExtractedPage,
  type ExtractedRun,
  type RunStyle,
} from './types'
import {
  installUint8ArrayHexBase64Polyfill,
  UINT8ARRAY_HEX_BASE64_POLYFILL_SOURCE,
} from './uint8ArrayHexBase64Polyfill'

installUint8ArrayHexBase64Polyfill()

let patchedWorkerSrc: string | null = null

/**
 * pdf.js's worker runs in its own realm, so the main-thread polyfill above
 * doesn't reach it. This builds a small module that installs the same
 * polyfill and then statically imports the real worker by its absolute
 * URL, and serves that from a blob URL instead.
 *
 * It deliberately does not `fetch()` the worker script's text and inline
 * it into the blob: in dev mode, Vite's dev server rewrites served modules
 * to inject its HMR client import, which a blob module can't resolve
 * (blob: URLs aren't hierarchical). A static `import` of the absolute URL
 * lets the browser request and run the original file exactly as it would
 * if `workerSrc` pointed at it directly, while still running our polyfill
 * first, since ES modules evaluate a module's own top-level statements
 * only after its imports are linked.
 */
function getPatchedWorkerSrc(): string {
  if (patchedWorkerSrc) return patchedWorkerSrc
  const absoluteWorkerUrl = new URL(rawWorkerUrl, window.location.href).href
  const moduleSource = `${UINT8ARRAY_HEX_BASE64_POLYFILL_SOURCE}\nimport ${JSON.stringify(absoluteWorkerUrl)};\n`
  const blob = new Blob([moduleSource], { type: 'text/javascript' })
  patchedWorkerSrc = URL.createObjectURL(blob)
  return patchedWorkerSrc
}

export interface ExtractionProgress {
  pagesProcessed: number
  totalPages: number
}

/** Throws a descriptive error when the file cannot possibly be a usable PDF. */
export function validatePdfFile(file: File): void {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) throw new NotAPdfError()
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_FILE_SIZE_MB) throw new PdfTooLargeError(MAX_FILE_SIZE_MB)
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

interface LinkRect {
  x0: number
  y0: number
  x1: number
  y1: number
  url: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractLinkRects(annotations: readonly unknown[]): LinkRect[] {
  const rects: LinkRect[] = []
  for (const annotation of annotations) {
    if (!isRecord(annotation)) continue
    if (annotation['subtype'] !== 'Link') continue
    const url = annotation['url']
    const rect = annotation['rect']
    if (typeof url !== 'string' || url.length === 0) continue
    if (!Array.isArray(rect) || rect.length !== 4) continue
    const [x0, y0, x1, y1] = rect as unknown[]
    if (typeof x0 !== 'number' || typeof y0 !== 'number' || typeof x1 !== 'number' || typeof y1 !== 'number') {
      continue
    }
    rects.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), url })
  }
  return rects
}

function findLinkUrl(item: TextItem, linkRects: readonly LinkRect[]): string | null {
  const x0 = item.transform[4] ?? 0
  const y0 = item.transform[5] ?? 0
  const cx = x0 + item.width / 2
  const cy = y0 + item.height / 2
  for (const rect of linkRects) {
    if (cx >= rect.x0 && cx <= rect.x1 && cy >= rect.y0 && cy <= rect.y1) return rect.url
  }
  return null
}

function classifyItemStyle(item: TextItem, styles: Record<string, PdfTextStyle>): RunStyle {
  const style = styles[item.fontName]
  const haystack = `${item.fontName} ${style?.fontFamily ?? ''}`.toLowerCase()
  if (/mono|courier|consolas|menlo|typewriter/.test(haystack)) return 'code'
  const isBold = /bold|black|heavy|semibold/.test(haystack)
  const isItalic = /italic|oblique/.test(haystack)
  if (isBold && isItalic) return 'boldItalic'
  if (isBold) return 'bold'
  if (isItalic) return 'italic'
  return 'normal'
}

function groupTextItems(
  items: readonly TextItem[],
  styles: Record<string, PdfTextStyle>,
  linkRects: readonly LinkRect[],
): ExtractedLine[] {
  const lines: ExtractedLine[] = []
  let runs: ExtractedRun[] = []
  let fontSize = 0
  let y = 0
  let started = false

  const flush = () => {
    if (started && runs.length > 0) lines.push({ runs, fontSize, y })
    runs = []
    fontSize = 0
    started = false
  }

  for (const item of items) {
    if (!started) {
      y = item.transform[5] ?? 0
      started = true
    }
    if (item.str.length > 0) {
      const size = Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0) || 1
      fontSize = Math.max(fontSize, size)
      runs.push({ text: item.str, style: classifyItemStyle(item, styles), linkUrl: findLinkUrl(item, linkRects) })
    }
    if (item.hasEOL) flush()
  }
  flush()
  return lines
}

async function extractPage(pdfDoc: PDFDocumentProxy, pageNumber: number): Promise<ExtractedPage> {
  const page = await pdfDoc.getPage(pageNumber)
  try {
    const [textContent, annotations] = await Promise.all([
      page.getTextContent(),
      page.getAnnotations({ intent: 'display' }),
    ])
    const items = textContent.items.filter(isTextItem)
    const linkRects = extractLinkRects(annotations)
    const lines = groupTextItems(items, textContent.styles, linkRects)
    const hasText = lines.some((line) => line.runs.some((run) => run.text.trim().length > 0))
    return { pageNumber, lines, hasText }
  } finally {
    page.cleanup()
  }
}

/** Loads a PDF file and extracts its text, page by page, entirely in the browser. */
export async function extractPdfDocument(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<ExtractedDocument> {
  validatePdfFile(file)
  const arrayBuffer = await file.arrayBuffer()
  GlobalWorkerOptions.workerSrc = getPatchedWorkerSrc()

  const loadingTask = getDocument({ data: arrayBuffer })
  let pdfDoc: PDFDocumentProxy
  try {
    pdfDoc = await loadingTask.promise
  } catch (error) {
    if (error instanceof PasswordException) throw new PasswordProtectedError()
    console.error('Failed to load PDF:', error)
    if (error instanceof InvalidPDFException) throw new CorruptPdfError()
    throw new CorruptPdfError(error instanceof Error ? error.message : undefined)
  }

  try {
    const pageCount = pdfDoc.numPages
    if (pageCount === 0) throw new EmptyPdfError()

    const pages: ExtractedPage[] = []
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      pages.push(await extractPage(pdfDoc, pageNumber))
      onProgress?.({ pagesProcessed: pageNumber, totalPages: pageCount })
    }

    if (!pages.some((page) => page.hasText)) throw new ScannedPdfError()

    return {
      metadata: { fileName: file.name, fileSizeBytes: file.size, pageCount },
      pages,
    }
  } finally {
    await loadingTask.destroy()
  }
}
