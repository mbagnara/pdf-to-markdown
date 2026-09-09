const MULTI_SPACE_REGEX = /[ \t\f\v]+/g
const HYPHEN_LINE_END_REGEX = /\p{L}-$/u
const TRAILING_SPACE_REGEX = /[ \t]+$/gm
const EXCESS_BLANK_LINES_REGEX = /\n{3,}/g

/** Collapses runs of horizontal whitespace into a single space and trims the ends. */
export function collapseWhitespace(text: string): string {
  return text.replace(MULTI_SPACE_REGEX, ' ').trim()
}

/** True when a line ends in a hyphen directly preceded by a letter, e.g. "exam-". */
export function endsWithHyphenatedWord(line: string): boolean {
  return HYPHEN_LINE_END_REGEX.test(line.trim())
}

/**
 * Joins wrapped source lines into a single flowing paragraph, repairing
 * words that were split by a hyphen at the end of a line.
 */
export function joinWrappedLines(lines: readonly string[]): string {
  let result = ''
  for (const rawLine of lines) {
    const line = collapseWhitespace(rawLine)
    if (line.length === 0) continue
    if (result.length === 0) {
      result = line
    } else if (endsWithHyphenatedWord(result)) {
      result = result.slice(0, -1) + line
    } else {
      result = `${result} ${line}`
    }
  }
  return result
}

/** Removes trailing spaces on each line and collapses 3+ blank lines into one. */
export function tidyMarkdown(text: string): string {
  return text.replace(TRAILING_SPACE_REGEX, '').replace(EXCESS_BLANK_LINES_REGEX, '\n\n').trim()
}
