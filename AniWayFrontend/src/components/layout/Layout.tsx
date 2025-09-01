import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isReaderPage = location.pathname.startsWith('/reader/')

  return (
    <div className="min-h-screen bg-manga-black">
      {!isReaderPage && <Header />}
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}
