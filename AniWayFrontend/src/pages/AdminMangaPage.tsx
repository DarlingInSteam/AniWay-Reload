import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MangaParser } from '@/components/admin/MangaParser'
import { MangaImporter } from '@/components/admin/MangaImporter'
import { MangaManager } from '@/components/admin/MangaManager'
import { MangaManagement } from '@/components/admin/MangaManagement'
import { Settings, Download, Upload, BookOpen, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminMangaPage() {
  const [activeTab, setActiveTab] = useState('parser')
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Redirect or show unauthorized message if not admin
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Settings className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Управление мангой
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Парсинг, импорт и управление мангой в системе AniWay
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-col gap-2 rounded-xl bg-card/90 p-2 sm:flex-row sm:flex-wrap">
          <TabsTrigger value="parser" className="flex flex-1 min-w-[140px] items-center justify-center gap-2 text-xs sm:text-sm">
            <Download className="h-4 w-4" />
            Парсер
          </TabsTrigger>
          <TabsTrigger value="importer" className="flex flex-1 min-w-[140px] items-center justify-center gap-2 text-xs sm:text-sm">
            <Upload className="h-4 w-4" />
            Импорт
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex flex-1 min-w-[140px] items-center justify-center gap-2 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4" />
            Управление
          </TabsTrigger>
          <TabsTrigger value="auto" className="flex flex-1 min-w-[140px] items-center justify-center gap-2 text-xs sm:text-sm">
            <RefreshCw className="h-4 w-4" />
            Автоматизация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parser" className="mt-6 sm:mt-8">
          <MangaParser />
        </TabsContent>

        <TabsContent value="importer" className="mt-6 sm:mt-8">
          <MangaImporter />
        </TabsContent>

        <TabsContent value="manager" className="mt-6 sm:mt-8">
          <MangaManager />
        </TabsContent>

        <TabsContent value="auto" className="mt-6 sm:mt-8">
          <MangaManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
