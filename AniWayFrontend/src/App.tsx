import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'
import { MangaPage } from './pages/MangaPage'
import { ReaderPage } from './pages/ReaderPage'
import { AdminMangaPage } from './pages/AdminMangaPage'
import { Toaster } from 'sonner'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/manga/:id" element={<MangaPage />} />
        <Route path="/reader/:chapterId" element={<ReaderPage />} />
        <Route path="/admin/manga" element={<AdminMangaPage />} />
      </Routes>
      <Toaster position="top-right" theme="dark" />
    </Layout>
  )
}

export default App
