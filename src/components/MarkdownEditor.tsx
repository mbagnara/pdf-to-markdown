interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <label className="markdown-editor">
      <span className="markdown-editor-label">Markdown (editable)</span>
      <textarea
        className="markdown-editor-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label="Editable Markdown output"
      />
    </label>
  )
}
