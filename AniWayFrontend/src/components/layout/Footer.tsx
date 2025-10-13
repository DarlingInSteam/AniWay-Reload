import { Link } from 'react-router-dom'
import { Github, MessageSquare, Sparkles, Send, Mail } from 'lucide-react'

const primaryLinks = [
  { label: 'Каталог', to: '/catalog' },
  { label: 'Топы', to: '/tops' },
  { label: 'Форум', to: '/forum' },
  { label: 'Чат', to: '/chat' },
  { label: 'Поиск', to: '/search' },
]

const communityLinks = [
  { label: 'Поддержка', href: 'mailto:support@aniway.space', icon: Mail },
  { label: 'Discord', href: 'https://discord.gg/', icon: MessageSquare },
  { label: 'Telegram', href: 'https://t.me/', icon: Send },
  { label: 'GitHub', href: 'https://github.com/DarlingInSteam', icon: Github },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-white/5 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(59,130,246,0.18),rgba(15,23,42,0.85))] text-white/80">
      <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.85),rgba(0,0,0,1))]" />

  <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-12 md:pt-16 pb-28 md:pb-20">
        <div className="grid gap-10 md:gap-12 md:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="space-y-5">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/icon.png" alt="AniWay" className="h-12 w-12 rounded-2xl border border-white/10" />
              <div>
                <p className="text-lg font-semibold text-white">AniWay</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Manga Universe</p>
              </div>
            </Link>
            <p className="max-w-lg text-sm leading-relaxed text-white/70">
              Мы собираем лучшие тайтлы, комьюнити и инструменты чтения в одном месте. Поддерживаем авторов, вдохновляем переводчиков и даём читателям то, за чем они приходят каждый вечер.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-full bg-primary/90 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.35)] transition hover:bg-primary"
              >
                <Sparkles className="h-4 w-4" />
                Открыть каталог
              </Link>
              <Link
                to="/forum"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
              >
                <MessageSquare className="h-4 w-4" />
                Комьюнити
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/60">Навигация</p>
            <ul className="flex flex-col gap-3 text-sm">
              {primaryLinks.map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-primary/70" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/60">Сообщество</p>
            <ul className="flex flex-col gap-3 text-sm">
              {communityLinks.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 text-white/70 transition hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition group-hover:border-white/30 group-hover:bg-white/10">
                      <link.icon className="h-3.5 w-3.5" />
                    </span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-xs text-white/50">
          <p className="tracking-wide uppercase">© {year} AniWay. Все права защищены.</p>
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
