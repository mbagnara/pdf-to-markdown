import { ErrorMessage } from '../components/ErrorMessage'
import { FileDropzone } from '../components/FileDropzone'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { useMarkdownFile } from '../hooks/useMarkdownFile'
import { MAX_MARKDOWN_FILE_SIZE_MB } from '../markdown/types'

interface ReadMarkdownViewProps {
  onBack: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function ReadMarkdownView({ onBack }: ReadMarkdownViewProps) {
  const { state, openFile, reset } = useMarkdownFile()

  const dropzone = (
    <FileDropzone
      onFileSelected={openFile}
      accept=".md,.markdown,.mdx,text/markdown"
      title="Drag and drop a Markdown file here"
      subtitle="or click to choose a file"
      limitLabel={`Maximum size: ${String(MAX_MARKDOWN_FILE_SIZE_MB)} MB`}
      ariaLabel={`Drop a Markdown file here or press Enter to choose a file. Maximum size ${String(MAX_MARKDOWN_FILE_SIZE_MB)} megabytes.`}
    />
  )

  return (
    <div className="view">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to menu
      </button>
      <h1 className="view-title">Read a Markdown file</h1>

      {state.status === 'idle' && dropzone}

      {state.status === 'error' && (
        <div className="state-stack">
          <ErrorMessage message={state.errorMessage ?? 'Unknown error.'} />
          {dropzone}
        </div>
      )}

      {state.status === 'loading' && (
        <p role="status" aria-live="polite">
          Reading file…
        </p>
      )}

      {state.status === 'success' && (
        <div className="markdown-reader">
          <div className="markdown-reader-toolbar">
            <span className="markdown-reader-filename">
              {state.fileName}
              {state.fileSizeBytes !== null && ` · ${formatFileSize(state.fileSizeBytes)}`}
            </span>
            <button type="button" className="button-secondary" onClick={reset}>
              Read another file
            </button>
          </div>
          <MarkdownPreview html={state.html} />
        </div>
      )}
    </div>
  )
}
