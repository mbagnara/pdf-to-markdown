import { collapseWhitespace, joinWrappedLines, tidyMarkdown } from './normalizeText'
import type {
  ConversionWarning,
  ExtractedDocument,
  ExtractedLine,
  ExtractedRun,
  MarkdownConversionResult,
  RunStyle,
} from './types'

type HeadingLevel = 1 | 2 | 3 | 4

type LineKind =
  | { kind: 'heading'; level: HeadingLevel }
  | { kind: 'bullet' }
  | { kind: 'numbered'; marker: string }
  | { kind: 'code' }
  | { kind: 'paragraph' }

interface ClassifiedLine {
  line: ExtractedLine
  kind: LineKind
  displayRuns: ExtractedRun[]
}

interface HeadingBlock {
  type: 'heading'
  level: HeadingLevel
  runs: ExtractedRun[]
}
interface ParagraphBlock {
  type: 'paragraph'
  lineRuns: ExtractedRun[][]
}
interface ListBlock {
  type: 'list'
  ordered: boolean
  items: { marker: string; runs: ExtractedRun[] }[]
}
interface CodeBlock {
  type: 'code'
  textLines: string[]
}
type Block = HeadingBlock | ParagraphBlock | ListBlock | CodeBlock

const BULLET_REGEX = /^[•‣◦○●▪·–—*-]\s+(?=\S)/
const NUMBERED_REGEX = /^(\d{1,3}|[a-zA-Z])[.)]\s+(?=\S)/

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2
}

function runsToPlainText(runs: readonly ExtractedRun[]): string {
  return runs.map((run) => run.text).join('')
}

function trimRunsPrefix(runs: readonly ExtractedRun[], count: number): ExtractedRun[] {
  let remaining = count
  const result: ExtractedRun[] = []
  for (const run of runs) {
    if (remaining <= 0) {
      result.push(run)
    } else if (run.text.length <= remaining) {
      remaining -= run.text.length
    } else {
      result.push({ ...run, text: run.text.slice(remaining) })
      remaining = 0
    }
  }
  return result
}

function matchListMarker(fullText: string): { ordered: boolean; marker: string; matchedLength: number } | null {
  const numberedMatch = NUMBERED_REGEX.exec(fullText)
  if (numberedMatch) {
    const captured = numberedMatch[1] ?? ''
    return { ordered: true, marker: `${captured}.`, matchedLength: numberedMatch[0].length }
  }
  const bulletMatch = BULLET_REGEX.exec(fullText)
  if (bulletMatch) {
    return { ordered: false, marker: '-', matchedLength: bulletMatch[0].length }
  }
  return null
}

/** Picks the font size that covers the most extracted characters: the body text size. */
export function computeBodyFontSize(lines: readonly ExtractedLine[]): number {
  const weightByBucket = new Map<number, number>()
  for (const line of lines) {
    const text = runsToPlainText(line.runs)
    if (text.trim().length === 0) continue
    const bucket = roundToHalf(line.fontSize)
    weightByBucket.set(bucket, (weightByBucket.get(bucket) ?? 0) + text.length)
  }
  let bestBucket = 0
  let bestWeight = -1
  for (const [bucket, weight] of weightByBucket) {
    if (weight > bestWeight) {
      bestWeight = weight
      bestBucket = bucket
    }
  }
  return bestBucket
}

function computeHeadingLevels(
  lines: readonly ExtractedLine[],
  bodyFontSize: number,
): Map<number, HeadingLevel> {
  const sizes = new Set<number>()
  for (const line of lines) {
    if (runsToPlainText(line.runs).trim().length === 0) continue
    sizes.add(roundToHalf(line.fontSize))
  }
  const threshold = bodyFontSize > 0 ? bodyFontSize * 1.15 : 0
  const largerSizes = [...sizes]
    .filter((size) => size > threshold)
    .sort((a, b) => b - a)
    .slice(0, 4)
  const levels: HeadingLevel[] = [1, 2, 3, 4]
  const map = new Map<number, HeadingLevel>()
  largerSizes.forEach((size, index) => {
    const level = levels[index]
    if (level !== undefined) map.set(size, level)
  })
  return map
}

/**
 * Typical spacing between consecutive body-text lines, used to tell wrapped
 * lines within a paragraph apart from an actual paragraph break. Only gaps
 * between two directly adjacent paragraph-kind lines count, so a heading or
 * list line next to a paragraph never skews the baseline. The smallest
 * recurring gap is used rather than an average or median: single-line
 * leading is the floor of the distribution, while paragraph breaks are
 * strictly larger, so an outlier-sensitive average would blur the two.
 */
function computeTypicalParagraphGap(classified: readonly ClassifiedLine[]): number {
  let smallest = Number.POSITIVE_INFINITY
  for (let i = 1; i < classified.length; i += 1) {
    const previous = classified[i - 1]
    const current = classified[i]
    if (!previous || !current) continue
    if (previous.kind.kind !== 'paragraph' || current.kind.kind !== 'paragraph') continue
    const gap = Math.abs(previous.line.y - current.line.y)
    if (gap > 0 && gap < smallest) smallest = gap
  }
  return Number.isFinite(smallest) ? smallest : 0
}

function classifyLine(
  line: ExtractedLine,
  headingLevels: ReadonlyMap<number, HeadingLevel>,
): ClassifiedLine {
  const fullText = runsToPlainText(line.runs).trim()
  const bucket = roundToHalf(line.fontSize)
  const headingLevel = headingLevels.get(bucket)
  if (headingLevel !== undefined && fullText.length > 0 && fullText.length <= 200) {
    return { line, kind: { kind: 'heading', level: headingLevel }, displayRuns: line.runs }
  }
  const listMatch = matchListMarker(fullText)
  if (listMatch) {
    const displayRuns = trimRunsPrefix(line.runs, listMatch.matchedLength)
    if (listMatch.ordered) {
      return { line, kind: { kind: 'numbered', marker: listMatch.marker }, displayRuns }
    }
    return { line, kind: { kind: 'bullet' }, displayRuns }
  }
  const isCode = line.runs.length > 0 && line.runs.every((run) => run.style === 'code')
  if (isCode && fullText.length > 0) {
    return { line, kind: { kind: 'code' }, displayRuns: line.runs }
  }
  return { line, kind: { kind: 'paragraph' }, displayRuns: line.runs }
}

function buildBlocks(lines: readonly ExtractedLine[], headingLevels: ReadonlyMap<number, HeadingLevel>): Block[] {
  const nonBlank = lines.filter((line) => runsToPlainText(line.runs).trim().length > 0)
  const classified = nonBlank.map((line) => classifyLine(line, headingLevels))
  const typicalGap = computeTypicalParagraphGap(classified)

  const blocks: Block[] = []
  let i = 0
  while (i < classified.length) {
    const current = classified[i]
    if (!current) break

    if (current.kind.kind === 'heading') {
      blocks.push({ type: 'heading', level: current.kind.level, runs: current.displayRuns })
      i += 1
      continue
    }

    if (current.kind.kind === 'code') {
      const textLines: string[] = []
      while (i < classified.length) {
        const item = classified[i]
        if (!item || item.kind.kind !== 'code') break
        textLines.push(runsToPlainText(item.displayRuns))
        i += 1
      }
      blocks.push({ type: 'code', textLines })
      continue
    }

    if (current.kind.kind === 'bullet' || current.kind.kind === 'numbered') {
      const ordered = current.kind.kind === 'numbered'
      const items: { marker: string; runs: ExtractedRun[] }[] = []
      while (i < classified.length) {
        const item = classified[i]
        if (!item) break
        if (ordered && item.kind.kind === 'numbered') {
          items.push({ marker: item.kind.marker, runs: item.displayRuns })
          i += 1
        } else if (!ordered && item.kind.kind === 'bullet') {
          items.push({ marker: '-', runs: item.displayRuns })
          i += 1
        } else {
          break
        }
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    // paragraph
    const lineRuns: ExtractedRun[][] = [current.displayRuns]
    let previousY = current.line.y
    const gapThreshold = typicalGap > 0 ? typicalGap * 1.6 : Math.max(current.line.fontSize * 1.6, 1)
    i += 1
    while (i < classified.length) {
      const item = classified[i]
      if (!item || item.kind.kind !== 'paragraph') break
      const gap = Math.abs(previousY - item.line.y)
      if (gap > gapThreshold) break
      lineRuns.push(item.displayRuns)
      previousY = item.line.y
      i += 1
    }
    blocks.push({ type: 'paragraph', lineRuns })
  }
  return blocks
}

const MARKDOWN_ESCAPE_REGEX = /([\\`*_[\]])/g

/** Escapes characters that would otherwise be misread as Markdown syntax. */
export function escapeMarkdownInline(text: string): string {
  return text.replace(MARKDOWN_ESCAPE_REGEX, '\\$1')
}

function wrapStyle(text: string, style: RunStyle): string {
  if (style === 'normal' || style === 'code') return text
  const leading = /^\s*/.exec(text)?.[0] ?? ''
  const trailing = /\s*$/.exec(text)?.[0] ?? ''
  const core = text.slice(leading.length, text.length - trailing.length)
  if (core.length === 0) return text
  if (style === 'bold') return `${leading}**${core}**${trailing}`
  if (style === 'italic') return `${leading}_${core}_${trailing}`
  return `${leading}**_${core}_**${trailing}`
}

function applyLink(text: string, url: string | null): string {
  return url === null ? text : `[${text}](${url})`
}

function mergeAdjacentRuns(runs: readonly ExtractedRun[]): ExtractedRun[] {
  const result: ExtractedRun[] = []
  for (const run of runs) {
    const last = result[result.length - 1]
    if (last && last.style === run.style && last.linkUrl === run.linkUrl) {
      last.text += run.text
    } else {
      result.push({ ...run })
    }
  }
  return result
}

function renderRunMarkdown(run: ExtractedRun): string {
  if (run.text.length === 0) return ''
  if (run.style === 'code') {
    if (run.text.includes('`')) return applyLink(escapeMarkdownInline(run.text), run.linkUrl)
    return applyLink(`\`${run.text}\``, run.linkUrl)
  }
  const styled = wrapStyle(escapeMarkdownInline(run.text), run.style)
  return applyLink(styled, run.linkUrl)
}

function renderRunsMarkdown(runs: readonly ExtractedRun[]): string {
  return mergeAdjacentRuns(runs).map(renderRunMarkdown).join('')
}

function renderBlockMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${renderRunsMarkdown(block.runs)}`
    case 'paragraph':
      return joinWrappedLines(block.lineRuns.map(renderRunsMarkdown))
    case 'list':
      return block.items.map((item) => `${item.marker} ${renderRunsMarkdown(item.runs)}`).join('\n')
    case 'code':
      return ['```', ...block.textLines.map(collapseWhitespace), '```'].join('\n')
  }
}

function renderBlockPlainText(block: Block): string {
  switch (block.type) {
    case 'heading':
      return runsToPlainText(block.runs)
    case 'paragraph':
      return joinWrappedLines(block.lineRuns.map(runsToPlainText))
    case 'list':
      return block.items
        .map((item) => `${item.marker} ${runsToPlainText(item.runs)}`)
        .join('\n')
    case 'code':
      return block.textLines.map(collapseWhitespace).join('\n')
  }
}

/** Converts an already-extracted PDF document into Markdown and plain text. */
export function convertDocumentToMarkdown(doc: ExtractedDocument): MarkdownConversionResult {
  const allLines = doc.pages.flatMap((page) => page.lines)
  const bodyFontSize = computeBodyFontSize(allLines)
  const headingLevels = computeHeadingLevels(allLines, bodyFontSize)

  const warnings: ConversionWarning[] = []
  const markdownSections: string[] = []
  const plainSections: string[] = []

  for (const page of doc.pages) {
    const pageComment = `<!-- Page ${String(page.pageNumber)} -->`
    if (!page.hasText) {
      warnings.push({
        code: 'scanned-page',
        message: `Page ${String(page.pageNumber)} appears to contain no extractable text (possibly scanned).`,
      })
      markdownSections.push(pageComment)
      continue
    }

    const blocks = buildBlocks(page.lines, headingLevels)
    const pageMarkdown = blocks.map(renderBlockMarkdown).filter((s) => s.length > 0).join('\n\n')
    const pagePlain = blocks.map(renderBlockPlainText).filter((s) => s.length > 0).join('\n\n')

    markdownSections.push(pageMarkdown.length > 0 ? `${pageComment}\n\n${pageMarkdown}` : pageComment)
    if (pagePlain.length > 0) plainSections.push(pagePlain)
  }

  return {
    markdown: tidyMarkdown(markdownSections.join('\n\n')),
    plainText: tidyMarkdown(plainSections.join('\n\n')),
    warnings,
  }
}
