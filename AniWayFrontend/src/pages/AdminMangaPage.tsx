import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MangaParser } from '@/components/admin/MangaParser'
import { MangaImporter } from '@/components/admin/MangaImporter'
import { MangaManager } from '@/components/admin/MangaManager'
import { Settings, Download, Upload, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function AdminMangaPage() {
  const [activeTab, setActiveTab] = useState('parser')
  const { isAdmin } = useAuth()

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Управление мангой
        </h1>
        <p className="text-muted-foreground">
          Парсинг, импорт и управление мангой в системе AniWay
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card">
          <TabsTrigger value="parser" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Парсер
          </TabsTrigger>
          <TabsTrigger value="importer" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Импорт
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Управление
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parser" className="mt-6">
          <MangaParser />
        </TabsContent>

        <TabsContent value="importer" className="mt-6">
          <MangaImporter />
        </TabsContent>

        <TabsContent value="manager" className="mt-6">
          <MangaManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
