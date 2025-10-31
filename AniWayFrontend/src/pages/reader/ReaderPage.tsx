import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatChapterTitle } from '@/lib/chapterUtils'
import { ChapterBlock } from './components/ChapterBlock'
import { ReaderTopBar } from './components/ReaderTopBar'
import { ReaderSettingsPanel } from './components/ReaderSettingsPanel'
import { ReaderFooterActions } from './components/ReaderFooterActions'
import { ReaderActionBar } from './components/ReaderActionBar'
import { KeyboardHint } from './components/KeyboardHint'
import { MobileHint } from './components/MobileHint'
import { ChapterListPanel } from './components/ChapterListPanel'
import { SideCommentsPanel } from './components/SideCommentsPanel'
import { GestureBurstLayer } from './components/GestureBurstLayer'
import { useReaderController } from './hooks/useReaderController'

export const ReaderPage = () => {
  const controller = useReaderController()

  const {
    isInitialLoading,
    showUI,
    setShowUI,
    isSettingsOpen,
    setIsSettingsOpen,
    imageWidth,
    setImageWidth,
    readingMode,
    setReadingMode,
    showChapterList,
    setShowChapterList,
    showSideComments,
    setShowSideComments,
    gestureBursts,
    finalTitle,
    titleContainerRef,
    currentChapterOrdinal,
    totalChapters,
    previousChapter,
    nextChapter,
  manga,
    chapterEntries,
    sortedChapters,
    activeChapter,
    activeImages,
    activeChapterId,
    activeChapterIndex,
    loadingForward,
    loadingBackward,
    handleNearBottom,
    handleNearTop,
    handleChapterCompleted,
    registerChapterNode,
    handleChapterContentResize,
    handleChapterVisibility,
    handleImageClick,
    handleTapOrClick,
    handleDoubleClickDesktop,
    handleTouchStartSwipe,
    handleTouchMoveSwipe,
    handleTouchEndSwipe,
    navigateToPreviousChapter,
    navigateToNextChapter,
    handleJumpToChapter,
    handleChapterLike,
    isActiveChapterLiked,
    isActiveChapterLiking,
    navigateBack
  } = controller

  if (isInitialLoading) {
    return (
      <div className="manga-reader flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!activeChapter || activeImages.length === 0) {
    return (
      <div className="manga-reader flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <BookOpen className="mx-auto h-16 w-16 mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Глава не найдена</h1>
          <Link to="/catalog" className="text-primary hover:text-primary/80 transition-colors">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="manga-reader min-h-screen bg-black relative">
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(0.3) translateY(0); opacity: 0; }
          10% { transform: scale(1) translateY(0); opacity: 1; }
          60% { transform: scale(1.05) translateY(-40px); opacity: 0.9; }
          100% { transform: scale(0.6) translateY(-80px); opacity: 0; }
        }
        .reader-fab { position: relative; padding: 0.85rem; border-radius: 1rem; background: linear-gradient(145deg, rgba(15,16,20,0.92), rgba(10,11,14,0.92)); border: 1px solid rgba(255,255,255,0.15); color: #fff; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); transition: background .25s, transform .15s, box-shadow .25s; }
        .reader-fab:hover { background: linear-gradient(145deg, rgba(32,34,40,0.95), rgba(18,19,24,0.95)); box-shadow: 0 4px 14px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12); }
        .reader-fab:active { transform: scale(0.94); }
        .reader-fab:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }
        @media (max-width: 640px) { .reader-fab { padding: 0.7rem; } }
      `}</style>

      <GestureBurstLayer bursts={gestureBursts} />

      <ReaderTopBar
        showUI={showUI}
        finalTitle={finalTitle || formatChapterTitle(activeChapter)}
        titleRef={titleContainerRef}
        currentChapterOrdinal={currentChapterOrdinal}
        totalChapters={totalChapters}
        hasPreviousChapter={!!previousChapter}
        hasNextChapter={!!nextChapter}
        onNavigatePrevious={navigateToPreviousChapter}
        onNavigateNext={navigateToNextChapter}
        onBack={navigateBack}
        onToggleMobileUI={() => setShowUI(prev => !prev)}
        onOpenChapterList={() => setShowChapterList(true)}
        manga={manga}
        activeChapter={activeChapter}
      />

      <ReaderSettingsPanel
        isOpen={isSettingsOpen}
        readingMode={readingMode}
        imageWidth={imageWidth}
        showUI={showUI}
        onClose={() => setIsSettingsOpen(false)}
        onToggleReadingMode={() => setReadingMode(mode => (mode === 'vertical' ? 'horizontal' : 'vertical'))}
        onCycleImageWidth={() => setImageWidth(width => (width === 'fit' ? 'full' : width === 'full' ? 'wide' : 'fit'))}
        onToggleUI={() => setShowUI(prev => !prev)}
      />

      <div className="pt-16">
        <div className={cn('flex flex-col gap-12', readingMode === 'horizontal' ? 'md:px-8' : '')}>
          {chapterEntries.map(entry => {
            const prevMeta = sortedChapters?.[entry.index - 1]
            return (
              <ChapterBlock
                key={entry.chapter?.id ?? entry.index}
                entry={entry}
                imageWidth={imageWidth}
                showUI={showUI}
                previousChapter={prevMeta}
                handleImageClick={handleImageClick}
                handleTapOrClick={handleTapOrClick}
                handleDoubleClickDesktop={handleDoubleClickDesktop}
                handleTouchStartSwipe={handleTouchStartSwipe}
                handleTouchMoveSwipe={handleTouchMoveSwipe}
                handleTouchEndSwipe={handleTouchEndSwipe}
                onNearBottom={() => handleNearBottom(entry.index)}
                onNearTop={() => handleNearTop(entry.index)}
                onCompleted={() => handleChapterCompleted(entry.index)}
                registerNode={registerChapterNode}
                onContentResize={handleChapterContentResize}
                isActive={entry.index === activeChapterIndex}
                onVisibilityChange={handleChapterVisibility}
              />
            )
          })}
          {loadingForward && (
            <div className="flex justify-center py-8 text-sm text-white/70">Загружаем следующую главу…</div>
          )}
          {loadingBackward && (
            <div className="flex justify-center py-8 text-sm text-white/70">Загружаем предыдущую главу…</div>
          )}
        </div>

        <ReaderFooterActions
          previousChapterAvailable={!!previousChapter}
          nextChapterAvailable={!!nextChapter}
          onNavigatePrevious={navigateToPreviousChapter}
          onNavigateNext={navigateToNextChapter}
          onOpenChapterList={() => setShowChapterList(true)}
          onOpenComments={() => setShowSideComments(true)}
          manga={manga}
        />
      </div>

      <KeyboardHint visible={showUI} />
      <MobileHint visible={showUI} />

      <ReaderActionBar
        visible={showUI}
        hasActiveChapter={!!activeChapter}
        onOpenChapterList={() => setShowChapterList(true)}
        onOpenComments={() => setShowSideComments(true)}
        onLike={handleChapterLike}
        onToggleSettings={() => setIsSettingsOpen(value => !value)}
        onBack={navigateBack}
        likeDisabled={isActiveChapterLiking || isActiveChapterLiked}
        likeActive={isActiveChapterLiked}
      />

      <ChapterListPanel
        isOpen={showChapterList}
        manga={manga}
        chapters={sortedChapters}
        activeChapterId={activeChapterId}
        onClose={() => setShowChapterList(false)}
        onSelectChapter={handleJumpToChapter}
      />

      <SideCommentsPanel
        isOpen={showSideComments}
        chapter={activeChapter}
        onClose={() => setShowSideComments(false)}
      />
    </div>
  )
}
