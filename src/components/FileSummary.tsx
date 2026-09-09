interface FileSummaryProps {
  fileName: string
  fileSizeBytes: number
  pageCount: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function FileSummary({ fileName, fileSizeBytes, pageCount }: FileSummaryProps) {
  return (
    <dl className="file-summary">
      <div className="file-summary-item">
        <dt>File</dt>
        <dd>{fileName}</dd>
      </div>
      <div className="file-summary-item">
        <dt>Size</dt>
        <dd>{formatFileSize(fileSizeBytes)}</dd>
      </div>
      <div className="file-summary-item">
        <dt>Pages</dt>
        <dd>{pageCount}</dd>
      </div>
    </dl>
  )
}
