import { describe, expect, it } from 'vitest'
import { renderMarkdownToSafeHtml } from './renderMarkdown'

describe('renderMarkdownToSafeHtml', () => {
  it('renders headings, bold text and lists as real HTML', () => {
    const html = renderMarkdownToSafeHtml('# Title\n\nSome **bold** text.\n\n- one\n- two')
    expect(html).toContain('<h1')
    expect(html).toContain('Title')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toMatch(/<ul>[\s\S]*<li>one<\/li>[\s\S]*<li>two<\/li>[\s\S]*<\/ul>/)
  })

  it('renders links with their href intact', () => {
    const html = renderMarkdownToSafeHtml('[docs](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('docs')
  })

  it('strips <script> tags embedded as raw HTML', () => {
    const html = renderMarkdownToSafeHtml('# Hi\n\n<script>alert("xss")</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(')
  })

  it('strips event handler attributes from raw HTML', () => {
    const html = renderMarkdownToSafeHtml('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
  })

  it('strips dangerous javascript: link protocols', () => {
    const html = renderMarkdownToSafeHtml('[click me](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })
})
