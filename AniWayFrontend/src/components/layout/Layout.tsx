import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { MobileNavBar } from './MobileNavBar'
import { AnchorScrollHighlighter } from '../AnchorScrollHighlighter'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isReaderPage = location.pathname.startsWith('/reader/')

  return (
    <div className="min-h-screen bg-manga-black pb-20 md:pb-0">
      {!isReaderPage && <Header />}
      <main className="w-full">
        <AnchorScrollHighlighter />
        {children}
      </main>
      {!isReaderPage && <MobileNavBar />}
    </div>
  )
}
