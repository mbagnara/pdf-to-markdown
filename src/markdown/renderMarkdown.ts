import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Parses Markdown into HTML and sanitizes it before it's ever injected into
 * the DOM. The source may come from an arbitrary file the user opened, so
 * nothing here trusts it: DOMPurify strips scripts, event handlers and
 * dangerous URL schemes regardless of what marked produced.
 */
export function renderMarkdownToSafeHtml(markdownSource: string): string {
  const rawHtml = marked.parse(markdownSource, { gfm: true, async: false })
  return DOMPurify.sanitize(rawHtml)
}
