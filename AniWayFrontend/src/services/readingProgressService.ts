import { apiClient } from '@/lib/api';
import { UserReadingProgress } from '@/types/profile';

export interface UpdateReadingProgressData {
  chapterNumber: number;
  pageNumber?: number;
  status?: 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_READ';
  isCompleted?: boolean;
}

class ReadingProgressService {
  /**
   * Обновить прогресс чтения для конкретной манги
   */
  async updateReadingProgress(mangaId: number, data: UpdateReadingProgressData): Promise<any> {
    try {
      return await apiClient.updateReadingProgress(mangaId, data);
    } catch (error) {
      console.error('Ошибка при обновлении прогресса чтения:', error);
      throw new Error('Не удалось обновить прогресс чтения');
    }
  }

  /**
   * Получить прогресс чтения для конкретной манги
   */
  async getReadingProgress(mangaId: number): Promise<any> {
    try {
      return await apiClient.getReadingProgress(mangaId);
    } catch (error) {
      console.error('Ошибка при получении прогресса чтения:', error);
      throw new Error('Не удалось получить прогресс чтения');
    }
  }

  /**
   * Отметить главу как прочитанную
   */
  async markChapterAsRead(mangaId: number, chapterNumber: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.markChapterAsRead(mangaId, chapterNumber);
    } catch (error) {
      console.error('Ошибка при отметке главы как прочитанной:', error);
      throw new Error('Не удалось отметить главу как прочитанную');
    }
  }

  /**
   * Отметить мангу как завершенную
   */
  async markMangaAsCompleted(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.markMangaAsCompleted(mangaId);
    } catch (error) {
      console.error('Ошибка при отметке манги как завершенной:', error);
      throw new Error('Не удалось отметить мангу как завершенную');
    }
  }

  /**
   * Получить весь прогресс чтения пользователя (используем исправленный API)
   */
  async getUserProgress(): Promise<UserReadingProgress[]> {
    try {
      const progress = await apiClient.getUserProgress();
      return progress
        .filter(p => !p.isCompleted && p.manga)
        .map(p => ({
          ...p,
          title: p.manga?.title || 'Неизвестная манга',
          coverImage: p.manga?.coverImageUrl || '/icon.png',
          currentChapter: p.chapterNumber || 1,
          totalChapters: p.manga?.totalChapters || 1,
          lastRead: new Date(p.updatedAt)
        }))
        .slice(0, 10); // Ограничиваем до 10 последних
    } catch (error) {
      console.error('Ошибка при получении прогресса пользователя:', error);
      throw new Error('Не удалось загрузить прогресс чтения');
    }
  }

  /**
   * Начать читать мангу
   */
  async startReading(mangaId: number, chapterNumber: number = 1): Promise<any> {
    try {
      return await this.updateReadingProgress(mangaId, {
        chapterNumber,
        pageNumber: 1,
        status: 'READING',
        isCompleted: false
      });
    } catch (error) {
      console.error('Ошибка при начале чтения:', error);
      throw new Error('Не удалось начать чтение');
    }
  }

  /**
   * Приостановить чтение манги
   */
  async pauseReading(mangaId: number): Promise<any> {
    try {
      const currentProgress = await this.getReadingProgress(mangaId);
      return await this.updateReadingProgress(mangaId, {
        ...currentProgress,
        status: 'ON_HOLD'
      });
    } catch (error) {
      console.error('Ошибка при приостановке чтения:', error);
      throw new Error('Не удалось приостановить чтение');
    }
  }

  /**
   * Возобновить чтение манги
   */
  async resumeReading(mangaId: number): Promise<any> {
    try {
      const currentProgress = await this.getReadingProgress(mangaId);
      return await this.updateReadingProgress(mangaId, {
        ...currentProgress,
        status: 'READING'
      });
    } catch (error) {
      console.error('Ошибка при возобновлении чтения:', error);
      throw new Error('Не удалось возобновить чтение');
    }
  }

  /**
   * Добавить мангу в планы к прочтению
   */
  async planToRead(mangaId: number): Promise<any> {
    try {
      return await this.updateReadingProgress(mangaId, {
        chapterNumber: 0,
        pageNumber: 0,
        status: 'PLAN_TO_READ',
        isCompleted: false
      });
    } catch (error) {
      console.error('Ошибка при добавлении в планы:', error);
      throw new Error('Не удалось добавить в планы к прочтению');
    }
  }

  /**
   * Бросить чтение манги
   */
  async dropReading(mangaId: number): Promise<any> {
    try {
      const currentProgress = await this.getReadingProgress(mangaId);
      return await this.updateReadingProgress(mangaId, {
        ...currentProgress,
        status: 'DROPPED'
      });
    } catch (error) {
      console.error('Ошибка при прекращении чтения:', error);
      throw new Error('Не удалось прекратить чтение');
    }
  }

  /**
   * Обновить текущую страницу
   */
  async updateCurrentPage(mangaId: number, chapterNumber: number, pageNumber: number): Promise<any> {
    try {
      return await this.updateReadingProgress(mangaId, {
        chapterNumber,
        pageNumber,
        status: 'READING'
      });
    } catch (error) {
      console.error('Ошибка при обновлении страницы:', error);
      throw new Error('Не удалось обновить текущую страницу');
    }
  }

  /**
   * Получить статистику чтения
   */
  async getReadingStats(): Promise<any> {
    try {
      return await apiClient.getUserReadingStats();
    } catch (error) {
      console.error('Ошибка при получении статистики чтения:', error);
      throw new Error('Не удалось получить статистику чтения');
    }
  }

  /**
   * Проверить, читает ли пользователь мангу
   */
  async isReading(mangaId: number): Promise<boolean> {
    try {
      const progress = await this.getReadingProgress(mangaId);
      return progress && progress.status === 'READING';
    } catch (error) {
      console.error('Ошибка при проверке статуса чтения:', error);
      return false;
    }
  }

  /**
   * Получить процент прочитанного
   */
  async getReadingPercentage(mangaId: number): Promise<number> {
    try {
      const progress = await this.getReadingProgress(mangaId);
      if (!progress || !progress.manga?.totalChapters) return 0;

      return Math.round((progress.chapterNumber / progress.manga.totalChapters) * 100);
    } catch (error) {
      console.error('Ошибка при расчете процента чтения:', error);
      return 0;
    }
  }
}

export const readingProgressService = new ReadingProgressService();
