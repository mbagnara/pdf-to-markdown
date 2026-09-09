interface ConversionProgressProps {
  pagesProcessed: number
  totalPages: number
}

export function ConversionProgress({ pagesProcessed, totalPages }: ConversionProgressProps) {
  const percent = totalPages > 0 ? Math.round((pagesProcessed / totalPages) * 100) : 0
  return (
    <div className="conversion-progress" role="status" aria-live="polite" aria-busy="true">
      <div className="conversion-progress-track">
        <div className="conversion-progress-fill" style={{ width: `${String(percent)}%` }} />
      </div>
      <p>
        {totalPages > 0
          ? `Processing page ${String(pagesProcessed)} of ${String(totalPages)}…`
          : 'Reading PDF…'}
      </p>
    </div>
  )
}
