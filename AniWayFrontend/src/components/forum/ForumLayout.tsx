import React from 'react'

interface ForumLayoutProps { sidebar: React.ReactNode; children: React.ReactNode; }

export function ForumLayout({ sidebar, children }: ForumLayoutProps){
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-manga-black via-manga-black/95 to-manga-black px-4 pb-24 pt-6 md:pt-10">
      <div className="mx-auto w-full max-w-7xl grid gap-8 md:grid-cols-[270px_1fr]">
        <aside className="space-y-6">{sidebar}</aside>
        <main className="space-y-8">{children}</main>
      </div>
    </div>
  )
}
