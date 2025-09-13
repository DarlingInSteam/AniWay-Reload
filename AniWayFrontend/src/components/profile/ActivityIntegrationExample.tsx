// Пример интеграции UserActivityFeed с новым activityStatsApi

import { useEffect, useState } from 'react';
import { activityStatsApi, ProcessedActivityDTO } from '@/services/activityStatsApi';

// Пример компонента для демонстрации интеграции
export function ActivityFeedExample() {
  const [activities, setActivities] = useState<ProcessedActivityDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = 1; // Пример ID пользователя

  const loadActivity = async () => {
    setLoading(true);
    try {
      // Получаем активность с помощью нового API
      const data = await activityStatsApi.getUserActivity(userId, 10);
      setActivities(data);
      console.log('Загруженная активность:', data);
      
      // Также можем получить только определенные типы активности
      const readingActivity = await activityStatsApi.getActivityByType(userId, 'CHAPTER_COMPLETED', 5);
      const reviewActivity = await activityStatsApi.getActivityByType(userId, 'REVIEW_CREATED', 5);
      console.log('Активность чтения:', readingActivity);
      console.log('Активность отзывов:', reviewActivity);
      
      // Получить комплексные данные профиля
      const profileData = await activityStatsApi.getProfileData(userId, 10);
      console.log('Данные профиля:', profileData);
      
    } catch (error) {
      console.error('Ошибка загрузки активности:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [userId]);

  return (
    <div>
      <h3>Пример интеграции с новым API активности</h3>
      {loading && <p>Загружаем...</p>}
      {activities.map(activity => (
        <div key={activity.id} style={{ margin: '10px', padding: '10px', border: '1px solid #ccc' }}>
          <strong>Тип:</strong> {activity.activityType}<br />
          <strong>Сообщение:</strong> {activity.displayMessage}<br />
          <strong>Время:</strong> {activity.displayTime}<br />
          {activity.mangaTitle && <><strong>Манга:</strong> {activity.mangaTitle}<br /></>}
          {activity.chapterNumber && <><strong>Глава:</strong> {activity.chapterNumber}<br /></>}
        </div>
      ))}
    </div>
  );
}

// Основные изменения в UserActivityFeed.tsx:

/*
1. Заменен импорт:
   - Вместо: import { extendedProfileService } from '@/services/extendedProfileService';
   - Используем: import { activityStatsApi, ProcessedActivityDTO, ActivityType } from '@/services/activityStatsApi';

2. Обновлен интерфейс ActivityItem для совместимости с новым API

3. Изменена логика загрузки данных:
   - Используем activityStatsApi.getUserActivity(userId, limit * 2)
   - Маппинг типов активности: CHAPTER_COMPLETED → 'read', REVIEW_CREATED → 'review', COMMENT_CREATED → 'comment'

4. Улучшено отображение времени:
   - Используем displayTime из API (относительное время: "2 ч. назад")
   - Fallback на форматированное время

5. Добавлена поддержка комментариев:
   - Новый тип 'comment' с иконкой MessageSquare
   - Обработка COMMENT_CREATED активности

6. Преимущества интеграции:
   - Корректная типизация с ActivityDTO из auth-service API
   - Обработка различных типов активности согласно спецификации
   - Автоматическое форматирование сообщений
   - Валидация данных
*/
