import React, { useEffect, useState } from 'react'
import { RedocStandalone } from 'redoc'
import yaml from 'js-yaml'

type ServiceType = 'auth' | 'chapter' | 'comment' | 'image' | 'manga' | 'melon'

const ApiDocsPage: React.FC = () => {
  const [spec, setSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeService, setActiveService] = useState<ServiceType>('auth')

  const services = {
    auth: {
      name: 'AuthService',
      file: '/auth-service-api.yaml',
      title: 'AniWay AuthService API',
      description: 'Документация API для сервиса аутентификации и управления пользователями'
    },
    chapter: {
      name: 'ChapterService',
      file: '/chapter-service-api.yaml',
      title: 'AniWay ChapterService API',
      description: 'Документация API для управления главами манги'
    },
    comment: {
      name: 'CommentService',
      file: '/comment-service-api.yaml',
      title: 'AniWay CommentService API',
      description: 'Документация API для управления комментариями и реакциями'
    },
    image: {
      name: 'ImageStorageService',
      file: '/image-storage-service-api.yaml',
      title: 'AniWay ImageStorageService API',
      description: 'Документация API для управления хранением и загрузкой изображений'
    },
    manga: {
      name: 'MangaService',
      file: '/manga-service-api.yaml',
      title: 'AniWay MangaService API',
      description: 'Документация API для управления каталогом манги'
    },
    melon: {
      name: 'MelonService',
      file: '/melon-service-api.yaml',
      title: 'AniWay MelonService API',
      description: 'Документация API для парсинга и обработки манги'
    }
  }

  useEffect(() => {
    const loadSpec = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(services[activeService].file)
        if (!response.ok) {
          throw new Error(`Failed to load API spec: ${response.status}`)
        }
        const yamlText = await response.text()

        // Parse YAML to JSON for ReDoc
        const jsonSpec = yaml.load(yamlText) as any
        setSpec(jsonSpec)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API documentation')
        setLoading(false)
      }
    }

    loadSpec()
  }, [activeService])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка документации API...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Ошибка загрузки документации</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка документации API...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Ошибка загрузки документации</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{services[activeService].title}</h1>
          <p className="text-gray-400">{services[activeService].description}</p>
        </div>

        {/* Service Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            {Object.entries(services).map(([key, service]) => (
              <button
                key={key}
                onClick={() => setActiveService(key as ServiceType)}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeService === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <RedocStandalone
            spec={spec}
            options={{
              nativeScrollbars: true,
              theme: {
                colors: {
                  primary: {
                    main: '#3b82f6'
                  }
                },
                typography: {
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
                },
                sidebar: {
                  backgroundColor: '#f8fafc',
                  textColor: '#334155'
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default ApiDocsPage
