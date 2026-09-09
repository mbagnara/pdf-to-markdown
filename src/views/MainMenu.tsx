interface MainMenuProps {
  onSelectConvert: () => void
  onSelectRead: () => void
}

export function MainMenu({ onSelectConvert, onSelectRead }: MainMenuProps) {
  return (
    <div className="main-menu">
      <button type="button" className="menu-card" onClick={onSelectConvert}>
        <span className="menu-card-title">Convert PDF to Markdown</span>
        <span className="menu-card-description">Turn a PDF into an editable Markdown file, locally in your browser.</span>
      </button>
      <button type="button" className="menu-card" onClick={onSelectRead}>
        <span className="menu-card-title">Read a Markdown file</span>
        <span className="menu-card-description">Open a .md file and preview it rendered, the way it looks on GitHub.</span>
      </button>
    </div>
  )
}
