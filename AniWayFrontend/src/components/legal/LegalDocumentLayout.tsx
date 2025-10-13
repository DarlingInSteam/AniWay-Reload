import { ReactNode } from 'react'

interface LegalDocumentLayoutProps {
  title: string
  subtitle?: string
  updatedAt?: string
  children: ReactNode
}

export function LegalDocumentLayout({ title, subtitle, updatedAt, children }: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-160px)] bg-manga-black text-white/70">
      <div className="container mx-auto px-4 lg:px-8 py-10 md:py-14">
        <div className="max-w-4xl">
          <header className="mb-8 md:mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-3 text-base text-white/60">
                {subtitle}
              </p>
            )}
            {updatedAt && (
              <p className="mt-2 text-sm text-white/40">
                Последнее обновление: {updatedAt}
              </p>
            )}
          </header>
          <div className="space-y-8 text-sm md:text-base leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
