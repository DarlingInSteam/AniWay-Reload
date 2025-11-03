import { useState, useEffect } from 'react';
import { CommentResponseDTO, EnhancedCommentResponseDTO } from '@/types/comments';
import { apiClient } from '@/lib/api';

interface UseEnhancedCommentsOptions {
  maxComments?: number;
  cacheTimeout?: number;
}

// Кэш для предотвращения повторных запросов
const targetInfoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export function useEnhancedComments(
  comments: CommentResponseDTO[],
  options: UseEnhancedCommentsOptions = {}
) {
  const { maxComments = 5, cacheTimeout = CACHE_DURATION } = options;
  const [enhancedComments, setEnhancedComments] = useState<EnhancedCommentResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для получения данных из кэша или API
  const getCachedOrFetch = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const cached = targetInfoCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cacheTimeout) {
      return cached.data as T;
    }

    try {
      const data = await fetcher();
      targetInfoCache.set(key, { data, timestamp: now });
      return data;
    } catch (error) {
      console.error(`Ошибка загрузки данных для ключа ${key}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    const loadEnhancedComments = async () => {
      if (!comments || comments.length === 0) {
        setEnhancedComments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const commentsToProcess = comments.slice(0, maxComments);
        
        // Группируем запросы по типу для оптимизации
        const mangaIds = new Set<number>();
        const chapterIds = new Set<number>();
        const userIds = new Set<number>();

        commentsToProcess.forEach(comment => {
          switch (comment.type) {
            case 'MANGA':
              mangaIds.add(comment.targetId);
              break;
            case 'CHAPTER':
              chapterIds.add(comment.targetId);
              break;
            case 'PROFILE':
              userIds.add(comment.targetId);
              break;
          }
        });

        // Предзагружаем данные пакетами
        const [mangaTitles, chapterInfos, usernames] = await Promise.allSettled([
          // Загружаем названия манги
          Promise.all(Array.from(mangaIds).map(async id => {
            const key = `manga:${id}`;
            try {
              const title = await getCachedOrFetch(key, () => apiClient.getMangaTitle(id));
              return { id, title };
            } catch {
              return { id, title: null };
            }
          })),
          
          // Загружаем информацию о главах
          Promise.all(Array.from(chapterIds).map(async id => {
            const key = `chapter:${id}`;
            try {
              const info = await getCachedOrFetch(key, () => apiClient.getChapterTitle(id));
              return { id, info };
            } catch {
              return { id, info: null };
            }
          })),
          
          // Загружаем имена пользователей
          Promise.all(Array.from(userIds).map(async id => {
            const key = `user:${id}`;
            try {
              const username = await getCachedOrFetch(key, () => apiClient.getUsernameById(id));
              return { id, username };
            } catch {
              return { id, username: null };
            }
          }))
        ]);

        // Создаем карты для быстрого поиска
        const mangaTitleMap = new Map<number, string>();
        const chapterInfoMap = new Map<number, { title: string; mangaTitle: string }>();
        const usernameMap = new Map<number, string>();

        if (mangaTitles.status === 'fulfilled') {
          mangaTitles.value.forEach(({ id, title }) => {
            if (title) mangaTitleMap.set(id, title);
          });
        }

        if (chapterInfos.status === 'fulfilled') {
          chapterInfos.value.forEach(({ id, info }) => {
            if (info) chapterInfoMap.set(id, info);
          });
        }

        if (usernames.status === 'fulfilled') {
          usernames.value.forEach(({ id, username }) => {
            if (username) usernameMap.set(id, username);
          });
        }

        // Обрабатываем комментарии с полученными данными
        const enhanced = commentsToProcess.map((comment): EnhancedCommentResponseDTO => {
            let targetInfo = {
                text: `${getCommentTypeText(comment.type)} #${comment.targetId}`,
                icon: getCommentTypeIcon(comment.type),
                color: getCommentTypeColor(comment.type)
            };

          // Устанавливаем конкретную информацию на основе типа
          switch (comment.type) {
            case 'MANGA': {
              const title = mangaTitleMap.get(comment.targetId);
              if (title) {
                targetInfo = {
                  text: title,
                  icon: '📖',
                  color: 'text-purple-400'
                };
              }
              break;
            }
            case 'CHAPTER': {
              const info = chapterInfoMap.get(comment.targetId);
              if (info) {
                targetInfo = {
                  text: `${info.title} (${info.mangaTitle})`,
                  icon: '📄',
                  color: 'text-blue-400'
                };
              }
              break;
            }
            case 'PROFILE': {
              const username = usernameMap.get(comment.targetId);
              if (username) {
                targetInfo = {
                  text: `@${username}`,
                  icon: '👤',
                  color: 'text-green-400'
                };
              }
              break;
            }
          }

          // Информация о родительском комментарии
          let parentCommentInfo = undefined;
          if (comment.parentCommentId) {
            const parentComment = comments.find(c => c.id === comment.parentCommentId);
            if (parentComment) {
              parentCommentInfo = {
                username: parentComment.username,
                content: parentComment.content
              };
            } else {
              parentCommentInfo = {
                username: `Пользователь#${comment.parentCommentId}`,
                content: ''
              };
            }
          }

          return {
            ...comment,
            targetInfo,
            parentCommentInfo
          };
        });

        setEnhancedComments(enhanced);
      } catch (error) {
        console.error('Ошибка загрузки расширенной информации о комментариях:', error);
        setError('Ошибка загрузки дополнительной информации');
        
        // Fallback: используем базовую информацию
        const fallbackComments: EnhancedCommentResponseDTO[] = comments.slice(0, maxComments).map((comment: CommentResponseDTO) => ({
          ...comment,
            targetInfo: {
                text: `${getCommentTypeText(comment.type)} #${comment.targetId}`,
                icon: getCommentTypeIcon(comment.type),
                color: getCommentTypeColor(comment.type)
            }
        }));
        setEnhancedComments(fallbackComments);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedComments();
  }, [comments, maxComments, cacheTimeout]);

  return { enhancedComments, loading, error };
}

// Вспомогательные функции
function getCommentTypeText(type: "MANGA" | "CHAPTER" | "PROFILE" | "REVIEW" | "POST" | "MOMENT" | undefined): string | undefined {
  switch (type) {
    case 'MANGA': return 'Манга';
    case 'CHAPTER': return 'Глава';
    case 'PROFILE': return 'Профиль';
    case 'REVIEW': return 'Отзыв';
    case 'POST': return 'Пост';
    case 'MOMENT': return 'Момент';
    default: return type;
  }
}

function getCommentTypeIcon(type: "MANGA" | "CHAPTER" | "PROFILE" | "REVIEW" | "POST" | "MOMENT" | undefined): string {
  switch (type) {
    case 'MANGA': return '📖';
    case 'CHAPTER': return '📄';
    case 'PROFILE': return '👤';
    case 'REVIEW': return '⭐';
    case 'POST': return '📝';
    case 'MOMENT': return '📷';
    default: return '❓';
  }
}

function getCommentTypeColor(type: "MANGA" | "CHAPTER" | "PROFILE" | "REVIEW" | "POST" | "MOMENT" | undefined): string {
  switch (type) {
    case 'MANGA': return 'text-purple-400';
    case 'CHAPTER': return 'text-blue-400';
    case 'PROFILE': return 'text-green-400';
    case 'REVIEW': return 'text-yellow-400';
    case 'POST': return 'text-pink-400';
    case 'MOMENT': return 'text-cyan-400';
    default: return 'text-gray-400';
  }
}