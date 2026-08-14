import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Spinner } from './components/ui'
import './index.css'

// ページ単位のコード分割 (初期ロードを軽くする)
const HomePage = lazy(() => import('./features/home/HomePage'))
const CreatePage = lazy(() => import('./features/create/CreatePage'))
const SessionPage = lazy(() => import('./features/session/SessionPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Spinner label="読み込み中..." />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/s/:sessionId" element={<SessionPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
