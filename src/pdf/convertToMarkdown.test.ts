import { describe, expect, it } from 'vitest'
import { convertDocumentToMarkdown, escapeMarkdownInline } from './convertToMarkdown'
import type { ExtractedDocument, ExtractedLine, ExtractedPage, RunStyle } from './types'

function makeLine(text: string, fontSize: number, y: number, style: RunStyle = 'normal'): ExtractedLine {
  return { runs: [{ text, style, linkUrl: null }], fontSize, y }
}

function makeDoc(pages: ExtractedPage[]): ExtractedDocument {
  return { metadata: { fileName: 'test.pdf', fileSizeBytes: 1024, pageCount: pages.length }, pages }
}

function singlePageDoc(lines: ExtractedLine[]): ExtractedDocument {
  return makeDoc([{ pageNumber: 1, lines, hasText: lines.length > 0 }])
}

describe('convertDocumentToMarkdown', () => {
  it('inserts a page comment for every page', () => {
    const doc = makeDoc([
      { pageNumber: 1, lines: [makeLine('Page one body text.', 12, 800)], hasText: true },
      { pageNumber: 2, lines: [makeLine('Page two body text.', 12, 800)], hasText: true },
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('<!-- Page 1 -->')
    expect(result.markdown).toContain('<!-- Page 2 -->')
  })

  it('promotes a short, oversized line to a heading', () => {
    const doc = singlePageDoc([
      makeLine('Document Title', 24, 800),
      makeLine('This is the first sentence of a fairly long paragraph used to establish the body size.', 12, 760),
      makeLine('This continuation line should merge into the very same paragraph as the previous one.', 12, 746),
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('# Document Title')
    expect(result.markdown).toContain('body size. This continuation line')
  })

  it('repairs a hyphenated word split across two wrapped lines', () => {
    const doc = singlePageDoc([
      makeLine('This paragraph demonstrates a hyphen-', 12, 800),
      makeLine('ated word that must be repaired.', 12, 786),
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('hyphenated word that must be repaired.')
  })

  it('starts a new paragraph after a large vertical gap', () => {
    const doc = singlePageDoc([
      makeLine('First paragraph line one.', 12, 800),
      makeLine('First paragraph line two.', 12, 786),
      makeLine('First paragraph line three.', 12, 772),
      makeLine('Second paragraph after a big gap.', 12, 730),
    ])
    const result = convertDocumentToMarkdown(doc)
    const paragraphs = result.markdown.split('\n\n').filter((section) => !section.startsWith('<!--'))
    expect(paragraphs).toContain('First paragraph line one. First paragraph line two. First paragraph line three.')
    expect(paragraphs).toContain('Second paragraph after a big gap.')
  })

  it('splits paragraphs correctly right after a heading, ignoring the heading-to-body gap', () => {
    const doc = singlePageDoc([
      makeLine('Document Title', 24, 720),
      makeLine('First paragraph line one.', 12, 680),
      makeLine('First paragraph line two.', 12, 664),
      makeLine('Second paragraph after a gap.', 12, 630),
    ])
    const result = convertDocumentToMarkdown(doc)
    const paragraphs = result.markdown.split('\n\n').filter((section) => !section.startsWith('<!--'))
    expect(paragraphs).toContain('First paragraph line one. First paragraph line two.')
    expect(paragraphs).toContain('Second paragraph after a gap.')
  })

  it('converts bulleted lines into a Markdown list', () => {
    const doc = singlePageDoc([
      makeLine('Shopping list', 20, 820),
      makeLine('- Milk', 12, 790),
      makeLine('- Bread', 12, 776),
      makeLine('- Eggs', 12, 762),
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('# Shopping list')
    expect(result.markdown).toContain('- Milk\n- Bread\n- Eggs')
  })

  it('converts numbered lines into an ordered Markdown list', () => {
    const doc = singlePageDoc([
      makeLine('Steps to follow before starting the long body paragraph below for size reference.', 12, 820),
      makeLine('1. First step', 12, 790),
      makeLine('2. Second step', 12, 776),
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('1. First step\n2. Second step')
  })

  it('wraps bold and italic runs and renders link syntax', () => {
    const doc = singlePageDoc([
      {
        runs: [
          { text: 'Some ', style: 'normal', linkUrl: null },
          { text: 'important', style: 'bold', linkUrl: null },
          { text: ' text with a ', style: 'normal', linkUrl: null },
          { text: 'link', style: 'normal', linkUrl: 'https://example.com' },
          { text: '.', style: 'normal', linkUrl: null },
        ],
        fontSize: 12,
        y: 800,
      },
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('**important**')
    expect(result.markdown).toContain('[link](https://example.com)')
  })

  it('groups consecutive monospace lines into a fenced code block', () => {
    const doc = singlePageDoc([
      makeLine('const answer = 42;', 12, 800, 'code'),
      makeLine('console.log(answer);', 12, 786, 'code'),
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.markdown).toContain('```\nconst answer = 42;\nconsole.log(answer);\n```')
  })

  it('reports a warning for a page with no extractable text, without inventing content', () => {
    const doc = makeDoc([
      { pageNumber: 1, lines: [makeLine('Regular text page.', 12, 800)], hasText: true },
      { pageNumber: 2, lines: [], hasText: false },
    ])
    const result = convertDocumentToMarkdown(doc)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.message).toContain('Page 2')
    expect(result.markdown).toContain('<!-- Page 2 -->')
  })
})

describe('escapeMarkdownInline', () => {
  it('escapes characters that could be misread as Markdown syntax', () => {
    expect(escapeMarkdownInline('a * b _ c ` d [ e ]')).toBe('a \\* b \\_ c \\` d \\[ e \\]')
  })
})
