import 'github-markdown-css/github-markdown.css'

interface MarkdownPreviewProps {
  html: string
}

/**
 * `html` is produced by `renderMarkdownToSafeHtml`, which sanitizes it with
 * DOMPurify before it ever reaches this component, so it's safe to inject
 * directly. The `markdown-body` class comes from GitHub's own stylesheet,
 * so headings, lists and emphasis render the way they do on github.com.
 */
export function MarkdownPreview({ html }: MarkdownPreviewProps) {
  return <div className="markdown-body markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
}
