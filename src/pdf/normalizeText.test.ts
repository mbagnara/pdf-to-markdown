import { describe, expect, it } from 'vitest'
import { collapseWhitespace, endsWithHyphenatedWord, joinWrappedLines, tidyMarkdown } from './normalizeText'

describe('collapseWhitespace', () => {
  it('collapses runs of spaces and tabs into a single space', () => {
    expect(collapseWhitespace('hello    world\t\tagain')).toBe('hello world again')
  })

  it('trims leading and trailing whitespace', () => {
    expect(collapseWhitespace('   padded text   ')).toBe('padded text')
  })
})

describe('endsWithHyphenatedWord', () => {
  it('is true when a letter is directly followed by a trailing hyphen', () => {
    expect(endsWithHyphenatedWord('this is an exam-')).toBe(true)
  })

  it('is false for a normal sentence or a standalone dash', () => {
    expect(endsWithHyphenatedWord('this is a full sentence.')).toBe(false)
    expect(endsWithHyphenatedWord('a range like 10 -')).toBe(false)
  })
})

describe('joinWrappedLines', () => {
  it('joins lines with a single space', () => {
    expect(joinWrappedLines(['first line', 'second line'])).toBe('first line second line')
  })

  it('repairs a word split by a hyphen at the end of a line', () => {
    expect(joinWrappedLines(['this is an exam-', 'ple of hyphenation'])).toBe(
      'this is an example of hyphenation',
    )
  })

  it('skips blank lines', () => {
    expect(joinWrappedLines(['first', '   ', 'second'])).toBe('first second')
  })
})

describe('tidyMarkdown', () => {
  it('collapses three or more blank lines into a single blank line', () => {
    expect(tidyMarkdown('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('removes trailing spaces on each line', () => {
    expect(tidyMarkdown('a   \nb\t\n')).toBe('a\nb')
  })
})
