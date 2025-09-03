# Frontend Guide

Руководство по разработке фронтенда для проекта AniWay.

## Архитектура проекта

### Структура директорий

```
AniWayFrontend/
├── public/
│   └── icon.png
├── src/
│   ├── components/          # Переиспользуемые компоненты
│   │   ├── ui/             # Базовые UI компоненты
│   │   ├── manga/          # Компоненты связанные с мангой
│   │   ├── auth/           # Компоненты аутентификации
│   │   └── layout/         # Layout компоненты
│   ├── pages/              # Страницы приложения
│   │   ├── HomePage.tsx
│   │   ├── MangaPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ReaderPage.tsx
│   ├── hooks/              # Кастомные React hooks
│   │   ├── useAuth.ts
│   │   ├── useManga.ts
│   │   └── useApi.ts
│   ├── lib/                # Утилиты и сервисы
│   │   ├── api.ts          # API клиент
│   │   ├── auth.ts         # Логика аутентификации
│   │   └── utils.ts        # Вспомогательные функции
│   ├── types/              # TypeScript типы
│   │   ├── user.ts
│   │   ├── manga.ts
│   │   └── api.ts
│   ├── App.tsx             # Главный компонент
│   ├── main.tsx            # Точка входа
│   └── index.css           # Глобальные стили
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Технологический стек

### Основные технологии

- **React 18** - библиотека для создания пользовательских интерфейсов
- **TypeScript** - типизированный JavaScript
- **Vite** - инструмент сборки и dev server
- **React Router** - маршрутизация в приложении
- **Tailwind CSS** - utility-first CSS фреймворк

### Дополнительные библиотеки

- **Axios** - HTTP клиент для API запросов
- **React Hook Form** - управление формами
- **Zod** - валидация схем данных
- **Lucide React** - набор иконок

## Компоненты

### Принципы создания компонентов

1. **Один компонент - одна ответственность**
2. **Переиспользуемость** - компоненты должны быть гибкими
3. **Типизация** - все props должны быть типизированы
4. **Композиция** - предпочитать композицию наследованию

### Структура компонента

```tsx
// components/manga/MangaCard.tsx
import { Link } from 'react-router-dom'
import { MangaCardProps } from '../../types/manga'

interface MangaCardProps {
  manga: {
    id: number
    title: string
    coverUrl?: string
    rating?: number
    status: string
  }
  className?: string
}

export function MangaCard({ manga, className = '' }: MangaCardProps) {
  return (
    <Link 
      to={`/manga/${manga.id}`}
      className={`block bg-card rounded-lg overflow-hidden hover:scale-105 transition-transform ${className}`}
    >
      <div className="aspect-[3/4] bg-muted">
        {manga.coverUrl ? (
          <img 
            src={manga.coverUrl} 
            alt={manga.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Нет обложки
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {manga.title}
        </h3>
        
        {manga.rating && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>★ {manga.rating.toFixed(1)}</span>
          </div>
        )}
        
        <span className="text-xs text-primary">
          {manga.status}
        </span>
      </div>
    </Link>
  )
}
```

### Именование компонентов

- **PascalCase** для названий компонентов
- **Описательные имена** - `MangaCard`, `UserProfile`, `SearchBar`
- **Группировка по функционалу** - `manga/`, `auth/`, `ui/`

## Стилизация

### Tailwind CSS

Используется utility-first подход с Tailwind CSS:

```tsx
// Базовые классы
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// Responsive дизайн
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Темная тема
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// Состояния
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50">
```

### CSS Variables

Определены в `index.css` для консистентности:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
}
```

## Hooks

### Кастомные хуки

```tsx
// hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { authService } from '../lib/auth'
import { User } from '../types/user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    const user = await authService.login(username, password)
    setUser(user)
    return user
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  }
}
```

### Правила использования хуков

1. **Названия начинаются с use**
2. **Инкапсулируют бизнес-логику**
3. **Возвращают объект** с понятными названиями
4. **Обрабатывают ошибки** внутри хука

## API Integration

### API Client

```tsx
// lib/api.ts
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

class ApiClient {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  })

  constructor() {
    // Interceptor для добавления токена
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Interceptor для обработки ошибок
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url)
    return response.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data)
    return response.data
  }

  // Другие HTTP методы...
}

export const apiClient = new ApiClient()
```

### Типы данных

```tsx
// types/manga.ts
export interface Manga {
  id: number
  title: string
  description?: string
  coverImageUrl?: string
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
  rating?: number
  totalChapters?: number
  genres: string[]
  author?: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: number
  mangaId: number
  chapterNumber: number
  title?: string
  pages: Page[]
  publishedAt: string
}

export interface Page {
  id: number
  chapterId: number
  pageNumber: number
  imageUrl: string
}
```

## Формы

### React Hook Form + Zod

```tsx
// components/auth/LoginForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, 'Имя пользователя обязательно'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await authService.login(data.username, data.password)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Имя пользователя
        </label>
        <input
          {...register('username')}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.username && (
          <p className="text-red-500 text-sm mt-1">
            {errors.username.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground py-2 rounded-md disabled:opacity-50"
      >
        {isSubmitting ? 'Вход...' : 'Войти'}
      </button>
    </form>
  )
}
```

## Маршрутизация

### React Router Setup

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { MangaPage } from './pages/MangaPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/manga/:id" element={<MangaPage />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

## Обработка ошибок

### Error Boundaries

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Что-то пошло не так</h2>
          <p className="text-muted-foreground">
            Попробуйте обновить страницу
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Performance

### Оптимизация

1. **React.memo** для предотвращения ненужных рендеров
2. **useMemo/useCallback** для дорогих вычислений
3. **Lazy loading** для страниц и компонентов
4. **Виртуализация** для длинных списков

```tsx
// Lazy loading страниц
const MangaPage = lazy(() => import('./pages/MangaPage'))

// Мемоизация компонентов
export const MangaCard = memo(({ manga }: MangaCardProps) => {
  return (
    // компонент
  )
})

// Оптимизация вычислений
const filteredManga = useMemo(() => {
  return manga.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
}, [manga, searchTerm])
```

## Тестирование

### Структура тестов

```tsx
// __tests__/components/MangaCard.test.tsx
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MangaCard } from '../components/manga/MangaCard'

const mockManga = {
  id: 1,
  title: 'Test Manga',
  status: 'ONGOING',
  rating: 8.5
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('MangaCard', () => {
  it('renders manga title', () => {
    renderWithRouter(<MangaCard manga={mockManga} />)
    expect(screen.getByText('Test Manga')).toBeInTheDocument()
  })

  it('displays rating when provided', () => {
    renderWithRouter(<MangaCard manga={mockManga} />)
    expect(screen.getByText('★ 8.5')).toBeInTheDocument()
  })
})
```

## Полезные команды

```bash
# Разработка
npm run dev              # Запуск dev server
npm run build            # Сборка для продакшна
npm run preview          # Предварительный просмотр сборки

# Тестирование
npm run test             # Запуск тестов
npm run test:watch       # Тесты в watch режиме
npm run test:coverage    # Покрытие тестами

# Линтинг
npm run lint             # ESLint проверка
npm run lint:fix         # Автоисправление
npm run type-check       # TypeScript проверка
```

---

**Помните**: Следуйте принципам чистого кода и документируйте сложную логику в комментариях.
