import { lazy, Suspense, useCallback, useState } from 'react'
import './App.css'
import { MainMenu } from './views/MainMenu'

const ConvertPdfView = lazy(() => import('./views/ConvertPdfView').then((m) => ({ default: m.ConvertPdfView })))
const ReadMarkdownView = lazy(() => import('./views/ReadMarkdownView').then((m) => ({ default: m.ReadMarkdownView })))

type View = 'menu' | 'convert' | 'read'

function App() {
  const [view, setView] = useState<View>('menu')

  const goToMenu = useCallback(() => {
    setView('menu')
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF ⇄ Markdown</h1>
        <p>Everything is processed locally in your browser. Your files are never uploaded anywhere.</p>
      </header>

      <main className="app-main">
        {view === 'menu' && (
          <MainMenu
            onSelectConvert={() => {
              setView('convert')
            }}
            onSelectRead={() => {
              setView('read')
            }}
          />
        )}
        {view === 'convert' && (
          <Suspense fallback={<p role="status">Loading…</p>}>
            <ConvertPdfView onBack={goToMenu} />
          </Suspense>
        )}
        {view === 'read' && (
          <Suspense fallback={<p role="status">Loading…</p>}>
            <ReadMarkdownView onBack={goToMenu} />
          </Suspense>
        )}
      </main>
    </div>
  )
}

export default App
