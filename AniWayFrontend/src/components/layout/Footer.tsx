import { Link } from 'react-router-dom'
import { Github, MessageSquare, Send, Mail } from 'lucide-react'

const primaryLinks = [
  { label: 'Каталог', to: '/catalog' },
  { label: 'Топы', to: '/tops' },
  { label: 'Форум', to: '/forum' },
  { label: 'Чат', to: '/chat' },
  { label: 'Поиск', to: '/search' },
]

const communityLinks = [
  { label: 'Почта', href: 'mailto:support@aniway.space', icon: Mail },
  { label: 'Discord', href: 'https://discord.gg/', icon: MessageSquare },
  { label: 'Telegram', href: 'https://t.me/', icon: Send },
  { label: 'GitHub', href: 'https://github.com/DarlingInSteam', icon: Github },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-manga-black text-white/70">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Link to="/" className="flex-shrink-0">
              <img src="/icon.png" alt="AniWay" className="h-10 w-10 rounded-xl border border-white/10" />
            </Link>
            <div className="space-y-2">
              <Link to="/" className="text-sm font-semibold text-white hover:text-white/90 transition">
                AniWay
              </Link>
              <p className="max-w-xs text-xs leading-relaxed text-white/50">
                Платформа для чтения, обсуждений и поиска новых тайтлов. Сделано с заботой о сообществе.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:justify-center">
            {primaryLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-3">
            <span className="text-xs text-white/50">Мы на связи</span>
            <div className="flex flex-wrap gap-3">
              {communityLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm transition hover:border-white/20 hover:text-white"
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
          <p>© {year} AniWay. Все права защищены.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/tops" className="hover:text-white">Обновления проекта</Link>
            <a href="mailto:support@aniway.space" className="hover:text-white">Связаться с нами</a>
            <Link to="/forum" className="hover:text-white">Правила сообщества</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
