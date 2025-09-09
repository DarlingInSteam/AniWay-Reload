import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { CatalogPage } from './pages/CatalogPage'
import { MangaPage } from './pages/MangaPage'
import { ReaderPage } from './pages/ReaderPage'
import { AdminMangaPage } from './pages/AdminMangaPage'
import { AuthPage } from './pages/AuthPage'
import { ProfilePage } from './pages/ProfilePage'
import { LibraryPage } from './pages/LibraryPage'
import ApiDocsPage from './pages/ApiDocsPage'
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext'
import { Toaster } from 'sonner'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/manga/:id" element={<MangaPage />} />
          <Route path="/reader/:chapterId" element={<ReaderPage />} />
          
          {/* Аутентификация */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          
          {/* Защищённые маршруты */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/bookmarks" element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          } />
          <Route path="/reading-history" element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          } />
          
          {/* API Документация */}
          <Route path="/api-docs" element={<ApiDocsPage />} />
          
          {/* Админские маршруты */}
          <Route path="/admin/manga" element={
            <ProtectedRoute requireAdmin>
              <AdminMangaPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminMangaPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requireAdmin>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Управление пользователями</h1>
                <p className="text-gray-600">Функция в разработке</p>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Маршруты переводчика */}
          <Route path="/translator" element={
            <ProtectedRoute requireTranslator>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Панель переводчика</h1>
                <p className="text-gray-600">Функция в разработке</p>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster position="top-right" theme="dark" />
      </Layout>
    </AuthProvider>
  )
}

export default App
