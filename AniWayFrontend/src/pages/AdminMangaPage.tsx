import { useCallback, useEffect, useRef, useState } from 'react'
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
  const tabsListRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const updateFadeIndicators = useCallback(() => {
    const list = tabsListRef.current
    if (!list) {
      return
    }

  const { scrollLeft, scrollWidth, clientWidth } = list
  const hasOverflow = scrollWidth > clientWidth + 1
  const nextShowLeft = hasOverflow && scrollLeft > 1
  const nextShowRight = hasOverflow && scrollLeft + clientWidth < scrollWidth - 1

    setShowLeftFade((prev) => (prev === nextShowLeft ? prev : nextShowLeft))
    setShowRightFade((prev) => (prev === nextShowRight ? prev : nextShowRight))
  }, [])

  const ensureActiveTabVisible = useCallback(() => {
    const list = tabsListRef.current
    const activeTrigger = tabRefs.current[activeTab]

    if (!list || !activeTrigger) {
      updateFadeIndicators()
      return
    }

    const { scrollLeft, clientWidth } = list
    const scrollRight = scrollLeft + clientWidth

    const computedStyles = window.getComputedStyle(list)
    const paddingLeft = parseFloat(computedStyles.paddingLeft) || 0
    const paddingRight = parseFloat(computedStyles.paddingRight) || 0

    const tabLeft = activeTrigger.offsetLeft
    const tabRight = tabLeft + activeTrigger.offsetWidth
    
    // Larger buffer to guarantee full visibility including right edge
    const buffer = 12
    const minVisible = scrollLeft + paddingLeft
    const maxVisible = scrollRight - paddingRight
    let nextScrollLeft = scrollLeft

    // If tab starts before visible area, scroll it into view with buffer
    if (tabLeft < minVisible + buffer) {
      nextScrollLeft = Math.max(0, tabLeft - paddingLeft - buffer)
    } 
    // If tab ends after visible area, scroll so it's fully visible with buffer
    else if (tabRight > maxVisible - buffer) {
      nextScrollLeft = tabRight - clientWidth + paddingRight + buffer
    }

    if (Math.abs(nextScrollLeft - scrollLeft) > 1) {
      list.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
      window.requestAnimationFrame(updateFadeIndicators)
    } else {
      updateFadeIndicators()
    }
  }, [activeTab, updateFadeIndicators])

  useEffect(() => {
    const list = tabsListRef.current
    if (!list) {
      return
    }

    const handleResize = () => window.requestAnimationFrame(ensureActiveTabVisible)

    ensureActiveTabVisible()
    list.addEventListener('scroll', updateFadeIndicators, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      list.removeEventListener('scroll', updateFadeIndicators)
      window.removeEventListener('resize', handleResize)
    }
  }, [ensureActiveTabVisible, updateFadeIndicators])

  useEffect(() => {
    ensureActiveTabVisible()
  }, [ensureActiveTabVisible])

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex w-full flex-col gap-6">
        <TabsList
          ref={tabsListRef}
          aria-label="Разделы управления мангой"
          className="relative flex w-full flex-nowrap items-stretch gap-1.5 overflow-x-auto rounded-xl border border-white/10 bg-background/60 py-1 pl-3 pr-3 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50 sm:flex-wrap sm:justify-start sm:overflow-visible sm:border-transparent sm:bg-transparent sm:p-0 sm:text-sm"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {showLeftFade && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-background/95 via-background/60 to-transparent sm:hidden z-10"
              aria-hidden="true"
            />
          )}
          {showRightFade && (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-background/95 via-background/60 to-transparent sm:hidden z-10"
              aria-hidden="true"
            />
          )}
          <TabsTrigger
            value="parser"
            ref={(node) => {
              tabRefs.current.parser = node
            }}
            className="flex min-w-[7.5rem] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-2 font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-primary/60 data-[state=active]:bg-primary/15 data-[state=active]:text-white data-[state=active]:shadow-sm sm:flex-1 sm:px-4 sm:py-2.5"
          >
            <Download className="h-4 w-4" />
            Парсер
          </TabsTrigger>
          <TabsTrigger
            value="importer"
            ref={(node) => {
              tabRefs.current.importer = node
            }}
            className="flex min-w-[7.5rem] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-2 font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-primary/60 data-[state=active]:bg-primary/15 data-[state=active]:text-white data-[state=active]:shadow-sm sm:flex-1 sm:px-4 sm:py-2.5"
          >
            <Upload className="h-4 w-4" />
            Импорт
          </TabsTrigger>
          <TabsTrigger
            value="manager"
            ref={(node) => {
              tabRefs.current.manager = node
            }}
            className="flex min-w-[7.5rem] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-2 font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-primary/60 data-[state=active]:bg-primary/15 data-[state=active]:text-white data-[state=active]:shadow-sm sm:flex-1 sm:px-4 sm:py-2.5"
          >
            <BookOpen className="h-4 w-4" />
            Управление
          </TabsTrigger>
          <TabsTrigger
            value="auto"
            ref={(node) => {
              tabRefs.current.auto = node
            }}
            className="flex min-w-[7.5rem] flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2.5 py-2 font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:border-primary/60 data-[state=active]:bg-primary/15 data-[state=active]:text-white data-[state=active]:shadow-sm sm:flex-1 sm:px-4 sm:py-2.5"
          >
            <RefreshCw className="h-4 w-4" />
            Автоматизация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parser" className="focus-visible:outline-none">
          <MangaParser />
        </TabsContent>

        <TabsContent value="importer" className="focus-visible:outline-none">
          <MangaImporter />
        </TabsContent>

        <TabsContent value="manager" className="focus-visible:outline-none">
          <MangaManager />
        </TabsContent>

        <TabsContent value="auto" className="focus-visible:outline-none">
          <MangaManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
