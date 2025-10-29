import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { MobileNavBar } from './MobileNavBar'
import { AnchorScrollHighlighter } from '../AnchorScrollHighlighter'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isReaderPage = location.pathname.startsWith('/reader/')
  const isGlobalChatPage = location.pathname.startsWith('/chat')
  const hideFooter = isReaderPage || isGlobalChatPage
  const containerPaddingClass = hideFooter ? 'pb-0' : 'pb-20 md:pb-0'

  return (
    <div className={`min-h-screen bg-manga-black ${containerPaddingClass}`}>
      {!isReaderPage && <Header />}
      <main className="w-full">
        <AnchorScrollHighlighter />
        {children}
      </main>
      {!hideFooter && <Footer />}
      {!isReaderPage && <MobileNavBar />}
    </div>
  )
}
